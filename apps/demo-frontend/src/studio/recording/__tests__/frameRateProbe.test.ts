import {
  FrameSource,
  probeDeliveredFrames,
  videoFrameSource,
} from '../frameRateProbe';

const stream = {} as MediaStream;

describe('probeDeliveredFrames', () => {
  const probe = () => {
    let clock = 1000;
    const listeners: (() => void)[] = [];
    const release = jest.fn();
    const frameSource: FrameSource = (_stream, onFrame) => {
      listeners.push(onFrame);
      return release;
    };
    const stepDown = jest.fn(() => Promise.resolve());
    const probed = probeDeliveredFrames({
      stream,
      frameSource,
      now: () => clock,
      stepDown,
    });
    return {
      probed,
      release,
      stepDown,
      advance: (ms: number) => {
        clock += ms;
      },
    };
  };

  it('gives the same verdict however many times it is asked', () => {
    const { probed, stepDown, release, advance } = probe();
    advance(2000);

    const first = probed.settle();
    const second = probed.settle();

    expect(first).toBeInstanceOf(Promise);
    expect(second).toBe(first);
    expect(stepDown).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });
});

type FrameCallback = () => void;

describe('videoFrameSource', () => {
  const realTrack = (globalThis as { MediaStreamTrack?: unknown })
    .MediaStreamTrack;
  let pending: FrameCallback[];
  let requested: number;
  let cancelled: number[];

  const withFrameCallbacks = () => {
    Object.defineProperty(
      HTMLVideoElement.prototype,
      'requestVideoFrameCallback',
      {
        configurable: true,
        writable: true,
        value: (callback: FrameCallback) => {
          pending.push(callback);
          requested += 1;
          return requested;
        },
      },
    );
    Object.defineProperty(
      HTMLVideoElement.prototype,
      'cancelVideoFrameCallback',
      {
        configurable: true,
        writable: true,
        value: (handle: number) => {
          cancelled.push(handle);
        },
      },
    );
  };

  const withTrack = (track: unknown) => {
    (globalThis as { MediaStreamTrack?: unknown }).MediaStreamTrack = track;
  };

  beforeEach(() => {
    pending = [];
    requested = 0;
    cancelled = [];
  });

  afterEach(() => {
    delete (
      HTMLVideoElement.prototype as { requestVideoFrameCallback?: unknown }
    ).requestVideoFrameCallback;
    delete (
      HTMLVideoElement.prototype as { cancelVideoFrameCallback?: unknown }
    ).cancelVideoFrameCallback;
    withTrack(realTrack);
    jest.restoreAllMocks();
  });

  it('offers nothing where frames cannot be counted', () => {
    withTrack({ prototype: {} });

    expect(videoFrameSource()).toBeUndefined();
  });

  it('offers nothing where the track cannot be walked back down', () => {
    withFrameCallbacks();
    withTrack(undefined);

    expect(videoFrameSource()).toBeUndefined();
  });

  it('offers nothing where a track cannot take new constraints', () => {
    withFrameCallbacks();
    withTrack({ prototype: {} });

    expect(videoFrameSource()).toBeUndefined();
  });

  describe('where both are available', () => {
    const started = () => {
      withFrameCallbacks();
      withTrack({
        prototype: { applyConstraints: () => Promise.resolve() },
      });
      const play = jest
        .spyOn(HTMLMediaElement.prototype, 'play')
        .mockRejectedValue(new Error('NotAllowedError'));
      const pause = jest
        .spyOn(HTMLMediaElement.prototype, 'pause')
        .mockImplementation(() => undefined);
      const created = jest.spyOn(document, 'createElement');
      const source = videoFrameSource();
      const onFrame = jest.fn();
      const release = source?.(stream, onFrame);
      const video = created.mock.results[0]?.value as HTMLVideoElement;
      const present = () => pending.shift()?.();
      return { source, onFrame, release, video, play, pause, present };
    };

    it('counts every frame the stream presents', async () => {
      const { source, onFrame, present, video, play } = started();

      present();
      present();
      present();

      expect(source).toBeInstanceOf(Function);
      expect(onFrame).toHaveBeenCalledTimes(3);
      expect(video.muted).toBe(true);
      expect(video.playsInline).toBe(true);
      expect(video.srcObject).toBe(stream);
      expect(play).toHaveBeenCalled();
      await expect(play.mock.results[0]?.value).rejects.toThrow();
    });

    it('stops counting and lets go of the stream when released', () => {
      const { onFrame, release, present, video, pause } = started();
      present();

      release?.();
      present();

      expect(onFrame).toHaveBeenCalledTimes(1);
      expect(cancelled).toEqual([2]);
      expect(pause).toHaveBeenCalled();
      expect(video.srcObject).toBeNull();
    });
  });
});
