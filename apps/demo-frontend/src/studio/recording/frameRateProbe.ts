// What resolution to capture at can only be answered by the machine doing the
// capturing. A 3840x2160 source makes a 2x zoom an exact crop rather than an
// upscale, measured bit identical against 28.1dB PSNR for the fitted-then-
// magnified path, so the pixels are worth asking for. But the capture pipeline
// is throughput limited, and on a software-encode Linux box asking for 4K
// delivered 26% of the frames: 7.9fps of a 30fps take. There is no property to
// read that says which machine this is, and `track.getSettings()` is no help at
// all: asked for 4K on a 1080p surface it reported 3840x2160 while the file it
// wrote was 1920x1024. Only frames the pipeline actually delivered count, so
// the studio counts them.

export type FrameSource = (
  stream: MediaStream,
  onFrame: () => void,
) => () => void;

export type CaptureProbe = {
  // The verdict, taken from whatever has arrived by the time it is asked, with
  // the probe torn down either way. Nothing back means the resolution already
  // needs no change; a promise means the track has to be walked back down and
  // the recorder must not start until it resolves.
  settle: () => Promise<void> | undefined;
  detach: () => void;
};

type ProbeInput = {
  stream: MediaStream;
  frameSource: FrameSource;
  now: () => number;
  stepDown: () => Promise<void>;
};

// A frame delivered in the first half second says nothing: 1440p and 4K both
// start near 30fps on a box that can sustain neither, and only collapse once
// the encoder's queue fills. So the warm up is thrown away and the verdict
// comes off the last stretch of samples rather than the whole run, which an
// early window would flatter.
const warmUpMs = 500;
const verdictWindowMs = 1000;

// 24 of a 30fps target. A box that keeps up delivers 30; the software-encode
// Linux box measured 7.9fps at 4K and 16.5 at 1440p, so this discriminates with
// room on both sides instead of sitting on the edge of either.
const sustainedFps = 24;

// Warm up plus one window of samples. A count shorter than this cannot be
// measured in, and an unmeasured high resolution is never the safe choice.
export const probeMinCountdownMs = warmUpMs + verdictWindowMs;

export const probeDeliveredFrames = ({
  stream,
  frameSource,
  now,
  stepDown,
}: ProbeInput): CaptureProbe => {
  const startedAt = now();
  const deliveredAt: number[] = [];
  let release: (() => void) | undefined = frameSource(stream, () =>
    deliveredAt.push(now()),
  );
  let asked = false;
  let verdict: Promise<void> | undefined;

  const detach = () => {
    release?.();
    release = undefined;
  };

  return {
    detach,
    settle: () => {
      if (asked) {
        return verdict;
      }
      asked = true;
      detach();

      const until = now();
      const from = Math.max(startedAt + warmUpMs, until - verdictWindowMs);
      const spanMs = until - from;
      const delivered = deliveredAt.filter((at) => at >= from).length;
      // Too short a window to judge, and no samples at all, are both failures
      // rather than passes: a studio tab throttled into the background and a
      // box that cannot feed the pipeline look exactly alike from here, and
      // stepping down is the safe reading of either.
      const sustained =
        spanMs >= verdictWindowMs &&
        delivered >= (sustainedFps * spanMs) / 1000;

      verdict = sustained ? undefined : stepDown();
      return verdict;
    },
  };
};

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

// Whether this browser can be trusted with a high request at all. Two things
// are needed, and either one missing leaves the studio asking for exactly what
// it has always asked for: something that counts the frames really delivered,
// and a way to walk the track back down when it cannot keep up. A high request
// there is no road back from is not one worth making.
export const videoFrameSource = (): FrameSource | undefined => {
  if (
    typeof document === 'undefined' ||
    typeof HTMLVideoElement === 'undefined' ||
    !('requestVideoFrameCallback' in HTMLVideoElement.prototype) ||
    typeof MediaStreamTrack === 'undefined' ||
    typeof MediaStreamTrack.prototype?.applyConstraints !== 'function'
  ) {
    return undefined;
  }

  return (stream, onFrame) => {
    // off the DOM and muted, so it composites nothing and needs no gesture to
    // play; the frames it presents are the same ones the recorder is being fed
    const video = document.createElement('video') as FrameCallbackVideo;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    let live = true;
    let handle: number | undefined;
    const step = () => {
      if (!live) {
        return;
      }
      onFrame();
      handle = video.requestVideoFrameCallback(step);
    };
    handle = video.requestVideoFrameCallback(step);
    // a play the browser refuses is not worth reporting: the probe then counts
    // nothing, and counting nothing already means stepping down
    void video.play?.().catch(() => undefined);

    return () => {
      live = false;
      if (handle !== undefined) {
        video.cancelVideoFrameCallback?.(handle);
      }
      video.pause?.();
      // clearing the sink releases the element without touching the tracks,
      // which the recorder is still writing from
      video.srcObject = null;
    };
  };
};
