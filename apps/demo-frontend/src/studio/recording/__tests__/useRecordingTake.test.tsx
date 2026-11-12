import { act, renderHook, waitFor } from '@testing-library/react';
import { ProjectAsset } from '../../../api/types';
import { AssetUpload, UploadInput } from '../../editor/useAssetUpload';
import { useRecordingTake } from '../useRecordingTake';

type Listener = (event: { data: Blob }) => void;

class FakeMediaRecorder {
  static made: FakeMediaRecorder[] = [];

  static isTypeSupported = (mimeType: string) =>
    mimeType === 'video/webm;codecs=vp9,opus' ||
    mimeType === 'audio/webm;codecs=opus';

  state = 'inactive';

  listeners: Record<string, Listener[]> = {};

  constructor(
    readonly stream: MediaStream,
    readonly options: { mimeType: string },
  ) {
    FakeMediaRecorder.made.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners[type] = [...(this.listeners[type] ?? []), listener];
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.listeners.stop?.forEach((listener) => listener({ data: new Blob() }));
  }

  emit(size: number) {
    this.listeners.dataavailable?.forEach((listener) =>
      listener({ data: new Blob(['x'.repeat(size)]) }),
    );
  }
}

const fakeStream = () => {
  const ended: (() => void)[] = [];
  const track = {
    stop: jest.fn(),
    getSettings: () => ({ displaySurface: 'browser' }),
    addEventListener: (type: string, listener: () => void) => {
      if (type === 'ended') ended.push(listener);
    },
  };
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
    end: () => ended.forEach((listener) => listener()),
  } as unknown as MediaStream & { end: () => void };
};

const asset = (assetId: string, kind: 'video' | 'audio'): ProjectAsset => ({
  assetId,
  kind,
  state: 'uploading',
  mimeType: kind === 'video' ? 'video/webm' : 'audio/webm',
  label: assetId,
  createdAt: '2026-10-12T00:00:00.000Z',
  updatedAt: '2026-10-12T00:00:00.000Z',
});

const realRecorder = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
const realDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

let screenStream: ReturnType<typeof fakeStream>;
let microphoneStream: ReturnType<typeof fakeStream>;

beforeEach(() => {
  FakeMediaRecorder.made = [];
  screenStream = fakeStream();
  microphoneStream = fakeStream();
  (globalThis as { MediaRecorder?: unknown }).MediaRecorder = FakeMediaRecorder;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getDisplayMedia: jest.fn().mockResolvedValue(screenStream),
      getUserMedia: jest.fn().mockResolvedValue(microphoneStream),
    },
  });
});

afterEach(() => {
  (globalThis as { MediaRecorder?: unknown }).MediaRecorder = realRecorder;
  if (realDevices) {
    Object.defineProperty(navigator, 'mediaDevices', realDevices);
  } else {
    delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  }
});

const setup = (
  uploadBlob: AssetUpload['uploadBlob'] = jest.fn(
    async ({ kind }: UploadInput) =>
      kind === 'video' ? asset('video-1', 'video') : asset('voice-1', 'audio'),
  ),
) => {
  const upload: AssetUpload = {
    busy: false,
    importFile: jest.fn(),
    uploadBlob,
  };
  const onTake = jest.fn();
  const view = renderHook(() => useRecordingTake(upload, onTake));
  return { view, onTake, uploadBlob };
};

const recordWithoutDelay = async (
  view: ReturnType<typeof setup>['view'],
  withMicrophone = true,
) => {
  act(() => {
    view.result.current.setCountdownMs(0);
    view.result.current.setWithMicrophone(withMicrophone);
  });
  await act(async () => {
    await view.result.current.start();
  });
  act(() => {
    FakeMediaRecorder.made.forEach((recorder) => recorder.emit(16));
  });
};

it('uploads and hands over a take the browser ended', async () => {
  const { view, onTake, uploadBlob } = setup();
  await recordWithoutDelay(view);
  expect(view.result.current.status).toBe('recording');

  await act(async () => {
    screenStream.end();
  });

  await waitFor(() => expect(onTake).toHaveBeenCalledTimes(1));
  expect(uploadBlob).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'video',
      label: expect.stringMatching(/^Screen /),
      extension: 'webm',
      mimeType: 'video/webm;codecs=vp9,opus',
    }),
  );
  expect(uploadBlob).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'audio',
      label: expect.stringMatching(/^Voice over /),
      mimeType: 'audio/webm;codecs=opus',
    }),
  );
  expect(onTake).toHaveBeenCalledWith(
    expect.objectContaining({
      video: expect.objectContaining({ assetId: 'video-1' }),
      narration: expect.objectContaining({ assetId: 'voice-1' }),
      surface: 'browser',
    }),
  );
  await waitFor(() => expect(view.result.current.status).toBe('idle'));
});

it('uploads only the picture when the microphone was left out', async () => {
  const { view, onTake, uploadBlob } = setup();
  await recordWithoutDelay(view, false);

  await act(async () => {
    await view.result.current.stop();
  });

  expect(uploadBlob).toHaveBeenCalledTimes(1);
  expect(uploadBlob).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'video' }),
  );
  expect(onTake).toHaveBeenCalledWith(
    expect.objectContaining({
      video: expect.objectContaining({ assetId: 'video-1' }),
      narration: undefined,
    }),
  );
});

it('puts nothing on the timeline when the picture did not upload', async () => {
  const uploadBlob = jest.fn().mockResolvedValue(undefined);
  const { view, onTake } = setup(uploadBlob);
  await recordWithoutDelay(view);

  await act(async () => {
    await view.result.current.stop();
  });

  expect(uploadBlob).toHaveBeenCalledTimes(1);
  expect(onTake).not.toHaveBeenCalled();
  expect(view.result.current.status).toBe('idle');
});
