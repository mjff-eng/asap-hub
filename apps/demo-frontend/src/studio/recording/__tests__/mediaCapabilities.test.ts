import {
  extensionForMimeType,
  microphoneRecordingSupport,
  pickAudioMimeType,
  pickVideoMimeType,
  screenRecordingSupport,
} from '../mediaCapabilities';

const supports =
  (...supported: string[]) =>
  (mimeType: string) =>
    supported.includes(mimeType);

describe('pickVideoMimeType', () => {
  it('prefers mp4, which the render can use without transcoding', () => {
    expect(
      pickVideoMimeType(
        supports(
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/webm;codecs=vp9,opus',
        ),
      ),
    ).toBe('video/mp4;codecs=avc1.42E01E,mp4a.40.2');
  });

  it('falls back through matroska to webm', () => {
    expect(pickVideoMimeType(supports('video/webm;codecs=vp8,opus'))).toBe(
      'video/webm;codecs=vp8,opus',
    );
  });

  it('is undefined when nothing is supported', () => {
    expect(pickVideoMimeType(() => false)).toBeUndefined();
  });
});

describe('pickAudioMimeType', () => {
  it('prefers mp4 audio', () => {
    expect(
      pickAudioMimeType(
        supports('audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus'),
      ),
    ).toBe('audio/mp4;codecs=mp4a.40.2');
  });
});

describe('extensionForMimeType', () => {
  it.each([
    ['video/mp4;codecs=avc1', 'mp4'],
    ['audio/mp4;codecs=mp4a.40.2', 'mp4'],
    ['video/x-matroska;codecs=avc1,opus', 'mkv'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['audio/webm;codecs=opus', 'webm'],
  ])('maps %s to %s', (mimeType, expected) => {
    expect(extensionForMimeType(mimeType)).toBe(expected);
  });
});

describe('screenRecordingSupport', () => {
  const recorder = { isTypeSupported: supports('video/webm;codecs=vp9,opus') };

  it('reports the chosen format when everything is present', () => {
    expect(
      screenRecordingSupport(
        { getDisplayMedia: jest.fn() } as unknown as MediaDevices,
        recorder,
      ),
    ).toEqual({ supported: true, mimeType: 'video/webm;codecs=vp9,opus' });
  });

  it('explains a browser that cannot capture a screen', () => {
    expect(screenRecordingSupport({}, recorder)).toMatchObject({
      supported: false,
    });
  });

  it('explains a browser with no MediaRecorder', () => {
    expect(
      screenRecordingSupport(
        { getDisplayMedia: jest.fn() } as unknown as MediaDevices,
        undefined,
      ),
    ).toMatchObject({ supported: false });
  });

  it('explains a browser that supports no format we can record', () => {
    expect(
      screenRecordingSupport(
        { getDisplayMedia: jest.fn() } as unknown as MediaDevices,
        { isTypeSupported: () => false },
      ),
    ).toMatchObject({ supported: false });
  });
});

describe('microphoneRecordingSupport', () => {
  const supportsAudio = (mimeType: string) =>
    mimeType === 'audio/webm;codecs=opus';

  it('accepts a browser that can reach a microphone and record it', () => {
    expect(
      microphoneRecordingSupport(
        { getUserMedia: jest.fn() },
        { isTypeSupported: supportsAudio },
      ),
    ).toEqual({ supported: true, mimeType: 'audio/webm;codecs=opus' });
  });

  // the voice over button used to stay enabled and do nothing at all here
  it('says so when there is no microphone to reach', () => {
    const support = microphoneRecordingSupport(
      {},
      { isTypeSupported: supportsAudio },
    );

    expect(support.supported).toBe(false);
  });

  it('says so when no audio format can be recorded', () => {
    const support = microphoneRecordingSupport(
      { getUserMedia: jest.fn() },
      { isTypeSupported: () => false },
    );

    expect(support.supported).toBe(false);
  });
});
