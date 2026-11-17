import {
  CaptureSurface,
  captureSurfaces,
  RecordedPause,
} from '@asap-hub/demo-timeline';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CaptureProbe,
  FrameSource,
  probeDeliveredFrames,
  probeMinCountdownMs,
  videoFrameSource,
} from './frameRateProbe';
import {
  extensionForMimeType,
  pickAudioMimeType,
  pickVideoMimeType,
} from './mediaCapabilities';

export type RecordedTake = {
  blob: Blob;
  mimeType: string;
  extension: string;
  durationMs: number;
  startedAtEpochMs: number;
  // the wall clock spans the take stood paused for, which the file holds none
  // of: a capture applied later has to skip them the same way the footage does
  pauses?: RecordedPause[];
  // browser, window or monitor: what the picker was pointed at
  surface?: CaptureSurface;
  microphone?: { blob: Blob; mimeType: string; extension: string };
};

export type RecorderStatus =
  | 'idle'
  | 'counting'
  | 'recording'
  | 'paused'
  | 'finishing';

// What the creator actually handed over in the picker, which is what the frame
// shows and so which of a capture's coordinates land on it. `displaySurface` is
// not in the DOM lib's settings type, and a browser that does not report it
// leaves the studio with nothing to guess from.
type DisplayTrackSettings = MediaTrackSettings & { displaySurface?: string };

const isCaptureSurface = (value: unknown): value is CaptureSurface =>
  typeof value === 'string' &&
  (captureSurfaces as readonly string[]).includes(value);

export const sharedSurface = (
  stream: MediaStream,
): CaptureSurface | undefined => {
  const settings = stream.getVideoTracks()[0]?.getSettings?.() as
    | DisplayTrackSettings
    | undefined;
  return isCaptureSurface(settings?.displaySurface)
    ? settings?.displaySurface
    : undefined;
};

type RecorderFactory = (
  stream: MediaStream,
  options: { mimeType: string },
) => MediaRecorder;

export type ScreenRecorderOptions = {
  withMicrophone: boolean;
  // how long the screen is shared before the recorder actually starts, so the
  // creator has time to get to the tab they are demoing; the take begins when
  // the count ends, which is the instant its startedAtEpochMs records
  countdownMs?: number;
  // the browser's own Stop sharing button ends a take without anyone calling
  // stop(), and the recording still has to be saved
  onEnded?: (take: RecordedTake) => void;
  getDisplayMedia?: (
    constraints: DisplayMediaStreamOptions,
  ) => Promise<MediaStream>;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createRecorder?: RecorderFactory;
  isTypeSupported?: (mimeType: string) => boolean;
  now?: () => number;
  // how the studio counts the frames the capture really delivers, which is what
  // decides the resolution it records at; absent, it records at the canvas size
  frameSource?: FrameSource;
};

export type ScreenRecorder = {
  status: RecorderStatus;
  error?: string;
  elapsedMs: number;
  countdownMsLeft: number;
  // what the last take was a recording of; it outlives the take, because the
  // cursor capture is applied after the recording has already been saved
  displaySurface?: CaptureSurface;
  start: () => Promise<void>;
  // both are only meaningful while the count is running: one lets the take
  // begin at once, the other hands the screen back without recording anything
  startNow: () => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<RecordedTake | undefined>;
};

// `cursor` is not in the DOM lib's constraint type, but it is what decides
// whether the pointer is drawn into the captured frames at all. Left out, a tab
// capture and a Wayland screen capture both hand back a recording with no
// pointer in it, which is not a demo of anything.
type DisplayVideoConstraints = MediaTrackConstraints & {
  cursor?: 'always' | 'motion' | 'never';
};

const canvasSize = { width: 1920, height: 1080 };

// The zoom crops out of the source, so footage at twice the canvas makes a 2x
// zoom an exact crop instead of a magnified fit. Anything the machine cannot
// sustain is walked back to the canvas size before a single frame is written.
const highResolutionScale = 2;

const canvasSizeConstraints: MediaTrackConstraints = {
  width: { ideal: canvasSize.width },
  height: { ideal: canvasSize.height },
};

const displayConstraints = (
  highResolution: boolean,
): DisplayMediaStreamOptions => ({
  video: {
    frameRate: { ideal: 30, max: 60 },
    ...(highResolution
      ? {
          width: { ideal: canvasSize.width * highResolutionScale },
          height: { ideal: canvasSize.height * highResolutionScale },
        }
      : canvasSizeConstraints),
    cursor: 'always',
  } as DisplayVideoConstraints,
  audio: false,
});

// evaluated once, so the hook's callbacks keep their identity between renders
const browserFrameSource = videoFrameSource();

type Session = {
  recorder: MediaRecorder;
  chunks: Blob[];
  stream: MediaStream;
  mimeType: string;
  finish: () => Promise<void>;
};

const session = (
  recorder: MediaRecorder,
  stream: MediaStream,
  mimeType: string,
): Session => {
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  return {
    recorder,
    chunks,
    stream,
    mimeType,
    // ending the share from the browser's own bar stops the recorder for us, and
    // calling stop() on an inactive one throws
    finish: () =>
      new Promise<void>((resolve) => {
        if (recorder.state === 'inactive') {
          resolve();
          return;
        }
        recorder.addEventListener('stop', () => resolve(), { once: true });
        recorder.stop();
      }),
  };
};

const stopTracks = (stream?: MediaStream) =>
  stream?.getTracks().forEach((track) => track.stop());

// a stable default so the hook's callbacks keep their identity between renders
const systemNow = () => Date.now();

// Everything here is driven by MediaRecorder callbacks rather than a frame
// loop, because the studio tab sits in the background for the whole recording
// while the creator is on the tab being demoed, and background tabs are
// throttled.
export const useScreenRecorder = ({
  withMicrophone,
  countdownMs = 0,
  onEnded,
  getDisplayMedia,
  getUserMedia,
  createRecorder,
  isTypeSupported,
  now = systemNow,
  frameSource = browserFrameSource,
}: ScreenRecorderOptions): ScreenRecorder => {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string>();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [countdownMsLeft, setCountdownMsLeft] = useState(0);
  const [displaySurface, setDisplaySurface] = useState<CaptureSurface>();
  // read while the track is still live: a stopped track reports nothing
  const surfaceRef = useRef<CaptureSurface>();

  const screenRef = useRef<Session>();
  const micRef = useRef<Session>();
  const probeRef = useRef<CaptureProbe>();
  const stopRef = useRef<() => Promise<RecordedTake | undefined>>();
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const startedAtRef = useRef(0);
  // A pause stops the recorder, so the file it writes holds none of it. Counting
  // the wall clock alone reported a take longer than the footage and put a clip
  // on the timeline with the paused span frozen into it.
  const pausedMsRef = useRef(0);
  const pausedAtRef = useRef<number>();
  const pausesRef = useRef<RecordedPause[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const beginRef = useRef<() => void>();
  const cancelRef = useRef<() => void>();
  const startingRef = useRef(false);
  const finishingRef = useRef(false);

  // only the count's own machinery: the take stays armed until it has actually
  // begun, because settling the resolution can outlast the count by a few
  // milliseconds and cancelling inside that gap still has to hand the screen back
  const stopCounting = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = undefined;
    }
    setCountdownMsLeft(0);
  }, []);

  const recordedMs = useCallback(
    (): number =>
      now() -
      startedAtRef.current -
      pausedMsRef.current -
      (pausedAtRef.current === undefined ? 0 : now() - pausedAtRef.current),
    [now],
  );

  // one span of wall clock the recorder wrote no frames for, which is what a
  // capture applied later has to take out of its own times
  const closePause = useCallback(() => {
    const pausedAt = pausedAtRef.current;
    if (pausedAt === undefined) {
      return;
    }
    const endedAt = now();
    pausedMsRef.current += endedAt - pausedAt;
    pausedAtRef.current = undefined;
    pausesRef.current = [
      ...pausesRef.current,
      { startMs: Math.round(pausedAt), endMs: Math.round(endedAt) },
    ];
  }, [now]);

  const stopTicking = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = undefined;
    }
  }, []);

  const startTicking = useCallback(() => {
    stopTicking();
    tickRef.current = setInterval(() => setElapsedMs(recordedMs()), 500);
  }, [recordedMs, stopTicking]);

  // leaving the editor mid take must not leave the browser sharing the screen
  useEffect(
    () => () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      probeRef.current?.detach();
      stopTracks(screenRef.current?.stream);
      stopTracks(micRef.current?.stream);
    },
    [],
  );

  const start = useCallback(async () => {
    setError(undefined);

    const display =
      getDisplayMedia ??
      navigator.mediaDevices?.getDisplayMedia.bind(navigator.mediaDevices);
    const user =
      getUserMedia ??
      navigator.mediaDevices?.getUserMedia.bind(navigator.mediaDevices);
    const factory: RecorderFactory =
      createRecorder ??
      ((stream, options) => new MediaRecorder(stream, options));
    const supported =
      isTypeSupported ??
      ((mimeType: string) => MediaRecorder.isTypeSupported(mimeType));

    const videoMimeType = pickVideoMimeType(supported);
    if (!display || !videoMimeType) {
      setError('This browser cannot record a screen.');
      return;
    }

    if (screenRef.current || startingRef.current) {
      return;
    }
    // a second click while the picker is still up must not open two shares
    startingRef.current = true;
    // a fresh attempt: the previous take's clock must not leak into a stop
    // that lands before this one begins
    startedAtRef.current = 0;

    // Asking high is only ever done where the answer can be checked and undone:
    // something has to count the frames the machine really delivers, and the
    // count has to be long enough to hold a measurement. Either missing, this is
    // the request the studio has always made.
    const measurable =
      frameSource !== undefined && countdownMs >= probeMinCountdownMs;

    let stream: MediaStream;
    try {
      stream = await display(displayConstraints(measurable));
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === 'NotAllowedError'
          ? 'Screen sharing was declined.'
          : 'Could not start the recording.',
      );
      setStatus('idle');
      startingRef.current = false;
      return;
    }

    try {
      // read before anything else touches the track, and never disturbed after:
      // the picker's surface is not something applyConstraints can change
      surfaceRef.current = sharedSurface(stream);
      setDisplaySurface(surfaceRef.current);
      const recorder = factory(stream, { mimeType: videoMimeType });
      const screen = session(recorder, stream, videoMimeType);
      screenRef.current = screen;

      // The measurement runs alongside the count, on the live stream, before any
      // of it is being written down. Its own video element only reads the frames
      // the recorder is already being fed, so the reading it takes is if anything
      // a shade pessimistic, which is the safe direction to be wrong in.
      probeRef.current = measurable
        ? probeDeliveredFrames({
            stream,
            frameSource,
            now,
            // a step down the track refuses leaves the take at whatever was
            // delivered: worth a slow file, not worth abandoning the recording
            stepDown: () =>
              Promise.resolve(
                stream
                  .getVideoTracks()[0]
                  ?.applyConstraints?.(canvasSizeConstraints),
              ).catch(() => undefined),
          })
        : undefined;

      // the picker's own Stop sharing button ends the take as well, and it has
      // to finish the recording rather than only relabel it
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          // ended mid count means nothing was recorded: cleaning up quietly
          // left the creator thinking a take was running
          if (beginRef.current) {
            cancelRef.current?.();
            setError('The screen share ended before recording began.');
            return;
          }
          setStatus('finishing');
          void stopRef.current?.().then((take) => {
            if (take && take.blob.size > 0) {
              onEndedRef.current?.(take);
            }
          });
        });
      });

      // a microphone the creator refuses is not a reason to abandon the take,
      // but it used to leave the screen shared with no way left to stop it
      if (withMicrophone && user) {
        const micMimeType = pickAudioMimeType(supported);
        if (micMimeType) {
          try {
            const micStream = await user({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
            const micRecorder = factory(micStream, { mimeType: micMimeType });
            micRef.current = session(micRecorder, micStream, micMimeType);
          } catch {
            setError('The microphone was not available, recording without it.');
          }
        }
      }

      const begin = () => {
        beginRef.current = undefined;
        probeRef.current = undefined;
        try {
          startedAtRef.current = now();
          pausedMsRef.current = 0;
          pausedAtRef.current = undefined;
          pausesRef.current = [];
          setElapsedMs(0);
          micRef.current?.recorder.start(5000);
          recorder.start(5000);
          setStatus('recording');
          startTicking();
        } catch {
          stopTracks(stream);
          stopTracks(micRef.current?.stream);
          screenRef.current = undefined;
          micRef.current = undefined;
          setError('Could not start the recording.');
          setStatus('idle');
        }
      };

      // the count reaching zero and the creator skipping it can land either side
      // of a step down, and starting one recorder twice throws
      let beginning = false;

      // The one boundary the resolution may cross: ffmpeg reads a single size
      // for the whole file, so a track still being reconstrained must not have
      // recorder.start() called over the top of it. Whatever the measurement has
      // by now is the answer, and asking for it tears the probe down, so a take
      // that begins early simply gets the safe resolution rather than waiting.
      const settleThenBegin = () => {
        if (beginning) {
          return;
        }
        beginning = true;
        const stepDown = probeRef.current?.settle();
        if (!stepDown) {
          begin();
          return;
        }
        void stepDown.then(() => {
          // cancelled, stopped, or the share ended while the track was still
          // being walked back down
          if (screenRef.current === screen) {
            begin();
          }
        });
      };

      startingRef.current = false;
      if (countdownMs > 0) {
        // the wall clock, not the interval, decides when the count ends: the
        // studio tab sits in the background while the creator gets to the tab
        // they are demoing, and background intervals are throttled
        setStatus('counting');
        setCountdownMsLeft(countdownMs);
        beginRef.current = settleThenBegin;
        const deadline = now() + countdownMs;
        countdownRef.current = setInterval(() => {
          const left = deadline - now();
          if (left > 0) {
            setCountdownMsLeft(left);
            return;
          }
          stopCounting();
          settleThenBegin();
        }, 200);
      } else {
        settleThenBegin();
      }
    } catch {
      startingRef.current = false;
      probeRef.current?.detach();
      probeRef.current = undefined;
      stopTracks(stream);
      stopTracks(micRef.current?.stream);
      screenRef.current = undefined;
      micRef.current = undefined;
      setError('Could not start the recording.');
      setStatus('idle');
    }
  }, [
    countdownMs,
    createRecorder,
    frameSource,
    getDisplayMedia,
    getUserMedia,
    isTypeSupported,
    now,
    startTicking,
    stopCounting,
    withMicrophone,
  ]);

  // the count is a promise to record, not a recording: skipping it starts the
  // take at once, and backing out of it hands the screen straight back
  const startNow = useCallback(() => {
    const begin = beginRef.current;
    if (!begin) {
      return;
    }
    stopCounting();
    begin();
  }, [stopCounting]);

  const cancel = useCallback(() => {
    if (!beginRef.current) {
      return;
    }
    beginRef.current = undefined;
    stopCounting();
    probeRef.current?.detach();
    probeRef.current = undefined;
    stopTracks(screenRef.current?.stream);
    stopTracks(micRef.current?.stream);
    screenRef.current = undefined;
    micRef.current = undefined;
    startedAtRef.current = 0;
    setStatus('idle');
  }, [stopCounting]);

  cancelRef.current = cancel;

  const pause = useCallback(() => {
    screenRef.current?.recorder.pause();
    micRef.current?.recorder.pause();
    pausedAtRef.current = now();
    stopTicking();
    setStatus('paused');
  }, [now, stopTicking]);

  const resume = useCallback(() => {
    screenRef.current?.recorder.resume();
    micRef.current?.recorder.resume();
    closePause();
    startTicking();
    setStatus('recording');
  }, [closePause, startTicking]);

  const stop = useCallback(async (): Promise<RecordedTake | undefined> => {
    const screen = screenRef.current;
    if (!screen || finishingRef.current) {
      return undefined;
    }
    // two stops can race, the creator's click against the browser's own Stop
    // sharing, and both resolving would put the same take on the timeline twice
    finishingRef.current = true;
    // a take the count never started holds nothing worth handing back
    const began = startedAtRef.current > 0;
    beginRef.current = undefined;
    stopCounting();
    probeRef.current?.detach();
    probeRef.current = undefined;
    setStatus('finishing');
    stopTicking();
    // stopping while paused still ends that span, so the events captured
    // through it are recognised as belonging to no footage
    closePause();
    // read before the awaits: how long the finishing itself takes is not part
    // of the take
    const durationMs = began ? Math.max(0, recordedMs()) : 0;

    await screen.finish();
    const mic = micRef.current;
    if (mic) {
      await mic.finish();
    }

    stopTracks(screen.stream);
    stopTracks(mic?.stream);
    screenRef.current = undefined;
    micRef.current = undefined;
    finishingRef.current = false;
    setStatus('idle');

    if (!began) {
      return undefined;
    }

    return {
      blob: new Blob(screen.chunks, { type: screen.mimeType }),
      mimeType: screen.mimeType,
      extension: extensionForMimeType(screen.mimeType),
      durationMs,
      startedAtEpochMs: startedAtRef.current,
      ...(pausesRef.current.length ? { pauses: pausesRef.current } : {}),
      ...(surfaceRef.current ? { surface: surfaceRef.current } : {}),
      ...(mic && mic.chunks.length > 0
        ? {
            microphone: {
              blob: new Blob(mic.chunks, { type: mic.mimeType }),
              mimeType: mic.mimeType,
              extension: extensionForMimeType(mic.mimeType),
            },
          }
        : {}),
    };
  }, [closePause, recordedMs, stopCounting, stopTicking]);

  stopRef.current = stop;

  return {
    status,
    error,
    elapsedMs,
    countdownMsLeft,
    displaySurface,
    start,
    startNow,
    cancel,
    pause,
    resume,
    stop,
  };
};
