import { useCallback, useEffect, useRef, useState } from 'react';
import { extensionForMimeType, pickAudioMimeType } from './mediaCapabilities';

export type RecordedVoice = {
  blob: Blob;
  mimeType: string;
  extension: string;
  durationMs: number;
};

export type VoiceRecorderStatus = 'idle' | 'counting' | 'recording';

export type VoiceRecorderOptions = {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createRecorder?: (
    stream: MediaStream,
    options: { mimeType: string },
  ) => MediaRecorder;
  isTypeSupported?: (mimeType: string) => boolean;
  now?: () => number;
  // the same grace the screen recorder gives: time to scrub to the section
  // and take a breath before the microphone goes live
  countdownMs?: number;
};

export type VoiceRecorder = {
  status: VoiceRecorderStatus;
  error?: string;
  elapsedMs: number;
  countdownMsLeft: number;
  start: () => Promise<void>;
  startNow: () => void;
  cancel: () => void;
  stop: () => Promise<RecordedVoice | undefined>;
};

const systemNow = () => Date.now();

// A voice over is recorded over a demo that already exists, so this is the
// microphone on its own: no screen picker, no second stream to keep in step.
export const useVoiceRecorder = ({
  getUserMedia,
  createRecorder,
  isTypeSupported,
  now = systemNow,
  countdownMs = 0,
}: VoiceRecorderOptions = {}): VoiceRecorder => {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const [error, setError] = useState<string>();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [countdownMsLeft, setCountdownMsLeft] = useState(0);

  const recorderRef = useRef<MediaRecorder>();
  const streamRef = useRef<MediaStream>();
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const beginRef = useRef<() => void>();
  // a second click while the permission prompt is still up must not open a
  // second microphone; the first one's tracks would never be given back
  const startingRef = useRef(false);

  const stopTicking = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = undefined;
    }
  }, []);

  const stopCounting = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = undefined;
    }
    setCountdownMsLeft(0);
  }, []);

  useEffect(
    () => () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const start = useCallback(async () => {
    if (startingRef.current || streamRef.current) {
      return;
    }
    startingRef.current = true;
    setError(undefined);
    const user =
      getUserMedia ??
      navigator.mediaDevices?.getUserMedia.bind(navigator.mediaDevices);
    const factory =
      createRecorder ??
      ((stream: MediaStream, options: { mimeType: string }) =>
        new MediaRecorder(stream, options));
    const supported =
      isTypeSupported ??
      ((mimeType: string) => MediaRecorder.isTypeSupported(mimeType));

    const mimeType = pickAudioMimeType(supported);
    if (!user || !mimeType) {
      startingRef.current = false;
      setError('This browser cannot record audio.');
      return;
    }

    try {
      // the permission prompt comes before the count, so the grace is all
      // grace rather than being eaten by the browser dialog
      const stream = await user({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      startingRef.current = false;

      const begin = () => {
        beginRef.current = undefined;
        const recorder = factory(stream, { mimeType });
        chunksRef.current = [];
        recorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        });

        recorderRef.current = recorder;
        startedAtRef.current = now();
        setElapsedMs(0);
        recorder.start(5000);
        setStatus('recording');
        stopTicking();
        tickRef.current = setInterval(
          () => setElapsedMs(now() - startedAtRef.current),
          500,
        );
      };

      if (countdownMs > 0) {
        // the wall clock decides when the count ends, because background
        // intervals are throttled
        setStatus('counting');
        setCountdownMsLeft(countdownMs);
        beginRef.current = begin;
        const deadline = now() + countdownMs;
        countdownRef.current = setInterval(() => {
          const left = deadline - now();
          if (left > 0) {
            setCountdownMsLeft(left);
            return;
          }
          stopCounting();
          begin();
        }, 200);
      } else {
        begin();
      }
    } catch (cause) {
      startingRef.current = false;
      setError(
        cause instanceof Error && cause.name === 'NotAllowedError'
          ? 'Microphone access was declined.'
          : 'Could not start recording.',
      );
      setStatus('idle');
    }
  }, [
    countdownMs,
    createRecorder,
    getUserMedia,
    isTypeSupported,
    now,
    stopCounting,
    stopTicking,
  ]);

  const stop = useCallback(async (): Promise<RecordedVoice | undefined> => {
    const recorder = recorderRef.current;
    if (!recorder) {
      return undefined;
    }
    stopTicking();
    try {
      await new Promise<void>((resolve) => {
        // the microphone going away stops the recorder for us, and calling
        // stop() on an inactive one throws
        if (recorder.state === 'inactive') {
          resolve();
          return;
        }
        recorder.addEventListener('stop', () => resolve(), { once: true });
        recorder.stop();
      });
    } finally {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = undefined;
      streamRef.current = undefined;
      setStatus('idle');
    }

    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (chunks.length === 0) {
      return undefined;
    }

    return {
      blob: new Blob(chunks, { type: recorder.mimeType }),
      mimeType: recorder.mimeType,
      extension: extensionForMimeType(recorder.mimeType),
      durationMs: now() - startedAtRef.current,
    };
  }, [now, stopTicking]);

  // the count is a promise to record, not a recording: skipping it starts the
  // take at once, and backing out hands the microphone straight back
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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
    setStatus('idle');
  }, [stopCounting]);

  return {
    status,
    error,
    elapsedMs,
    countdownMsLeft,
    start,
    startNow,
    cancel,
    stop,
  };
};
