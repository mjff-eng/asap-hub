// Ordered by how little work the ingest has to do afterwards: an mp4 recording
// is already the render's input format, matroska needs only a remux, and the
// webm variants need a transcode.
export const videoMimePreference = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/x-matroska;codecs=avc1,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
] as const;

export const audioMimePreference = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/webm;codecs=opus',
  'audio/webm',
] as const;

export type IsTypeSupported = (mimeType: string) => boolean;

const firstSupported = (
  candidates: readonly string[],
  isTypeSupported: IsTypeSupported,
): string | undefined => candidates.find((mime) => isTypeSupported(mime));

export const pickVideoMimeType = (
  isTypeSupported: IsTypeSupported,
): string | undefined => firstSupported(videoMimePreference, isTypeSupported);

export const pickAudioMimeType = (
  isTypeSupported: IsTypeSupported,
): string | undefined => firstSupported(audioMimePreference, isTypeSupported);

// the container decides the file extension, and the extension decides the S3
// key, so the two have to agree
export const extensionForMimeType = (mimeType: string): string => {
  if (mimeType.startsWith('video/mp4') || mimeType.startsWith('audio/mp4')) {
    return 'mp4';
  }
  if (mimeType.startsWith('video/x-matroska')) {
    return 'mkv';
  }
  return 'webm';
};

export type RecordingSupport =
  | { supported: true; mimeType: string }
  | { supported: false; reason: string };

export const screenRecordingSupport = (
  mediaDevices: Partial<MediaDevices> | undefined,
  recorder: { isTypeSupported?: IsTypeSupported } | undefined,
): RecordingSupport => {
  if (!mediaDevices?.getDisplayMedia) {
    return {
      supported: false,
      reason:
        'This browser cannot capture a screen. Chrome, Edge and Firefox can.',
    };
  }
  if (!recorder?.isTypeSupported) {
    return {
      supported: false,
      reason: 'This browser has no MediaRecorder, so it cannot record.',
    };
  }
  const mimeType = pickVideoMimeType(recorder.isTypeSupported);
  return mimeType
    ? { supported: true, mimeType }
    : {
        supported: false,
        reason: 'This browser supports no video format the studio can record.',
      };
};

export const microphoneRecordingSupport = (
  mediaDevices: Partial<MediaDevices> | undefined,
  recorder: { isTypeSupported?: IsTypeSupported } | undefined,
): RecordingSupport => {
  if (!mediaDevices?.getUserMedia) {
    return {
      supported: false,
      reason: 'This browser cannot reach a microphone.',
    };
  }
  if (!recorder?.isTypeSupported) {
    return {
      supported: false,
      reason: 'This browser has no MediaRecorder, so it cannot record.',
    };
  }
  const mimeType = pickAudioMimeType(recorder.isTypeSupported);
  return mimeType
    ? { supported: true, mimeType }
    : {
        supported: false,
        reason: 'This browser supports no audio format the studio can record.',
      };
};
