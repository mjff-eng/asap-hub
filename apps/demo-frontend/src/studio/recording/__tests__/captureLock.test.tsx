import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FC } from 'react';
import RecorderPanel from '../RecorderPanel';
import VoiceOverPanel from '../VoiceOverPanel';
import { releaseCapture } from '../captureLock';
import { RecorderStatus } from '../useScreenRecorder';
import { useVoiceRecorder } from '../useVoiceRecorder';

afterEach(() => releaseCapture());

const Both: FC<{ readonly screen: RecorderStatus }> = ({ screen: status }) => (
  <>
    <RecorderPanel
      status={status}
      elapsedMs={1000}
      countdownMsLeft={0}
      countdownMs={3000}
      withMicrophone
      readOnly={false}
      onCountdownChange={jest.fn()}
      onMicrophoneChange={jest.fn()}
      onStart={jest.fn()}
      onStartNow={jest.fn()}
      onCancel={jest.fn()}
      onPause={jest.fn()}
      onResume={jest.fn()}
      onStop={jest.fn()}
    />
    <VoiceOverPanel
      status="idle"
      elapsedMs={0}
      countdownMs={0}
      countdownMsLeft={0}
      onCountdownChange={jest.fn()}
      saving={false}
      readOnly={false}
      onStart={jest.fn()}
      onStartNow={jest.fn()}
      onCancel={jest.fn()}
      onStop={jest.fn()}
    />
  </>
);

describe('while a screen recording is running', () => {
  // both of these want the microphone and both put something on the timeline,
  // and every one of them stayed clickable mid take
  it('a voice over cannot be started on top of it', () => {
    render(<Both screen="recording" />);

    expect(
      screen.getByRole('button', { name: 'Record a voice over' }),
    ).toBeDisabled();
  });

  it('says which recording is in the way', () => {
    render(<Both screen="recording" />);

    expect(
      screen.getByRole('button', { name: 'Record a voice over' }),
    ).toHaveAttribute('title', 'A screen recording is already running');
  });
});

describe('with nothing recording', () => {
  it('a voice over can be started', () => {
    render(<Both screen="idle" />);

    expect(
      screen.getByRole('button', { name: 'Record a voice over' }),
    ).toBeEnabled();
  });

  it('the lock is given up when the take finishes', () => {
    const view = render(<Both screen="recording" />);
    view.rerender(<Both screen="idle" />);

    expect(
      screen.getByRole('button', { name: 'Record a voice over' }),
    ).toBeEnabled();
  });
});

const voiceStream = () => {
  const track = { stop: jest.fn() };
  return { getTracks: () => [track] } as unknown as MediaStream;
};

const voiceRecorder = () => {
  const listeners: Record<string, (() => void)[]> = {};
  const recorder = {
    state: 'inactive',
    mimeType: 'audio/webm;codecs=opus',
    addEventListener(type: string, listener: () => void) {
      listeners[type] = [...(listeners[type] ?? []), listener];
    },
    start() {
      recorder.state = 'recording';
    },
    stop() {
      if (recorder.state === 'inactive') {
        throw new DOMException('Already stopped', 'InvalidStateError');
      }
      recorder.endItself();
    },
    endItself() {
      recorder.state = 'inactive';
      listeners.stop?.forEach((listener) => listener());
    },
  };
  return recorder as unknown as MediaRecorder & { endItself: () => void };
};

const Live: FC<{ readonly recorder: MediaRecorder }> = ({ recorder }) => {
  const voice = useVoiceRecorder({
    getUserMedia: () => Promise.resolve(voiceStream()),
    createRecorder: () => recorder,
    isTypeSupported: () => true,
  });
  return (
    <>
      <RecorderPanel
        status="idle"
        elapsedMs={0}
        countdownMsLeft={0}
        countdownMs={3000}
        withMicrophone
        readOnly={false}
        onCountdownChange={jest.fn()}
        onMicrophoneChange={jest.fn()}
        onStart={jest.fn()}
        onStartNow={jest.fn()}
        onCancel={jest.fn()}
        onPause={jest.fn()}
        onResume={jest.fn()}
        onStop={jest.fn()}
      />
      <VoiceOverPanel
        status={voice.status}
        elapsedMs={voice.elapsedMs}
        countdownMs={0}
        countdownMsLeft={voice.countdownMsLeft}
        onCountdownChange={jest.fn()}
        saving={false}
        readOnly={false}
        onStart={() => {
          voice.start().catch(() => undefined);
        }}
        onStartNow={voice.startNow}
        onCancel={voice.cancel}
        onStop={() => {
          voice.stop().catch(() => undefined);
        }}
      />
    </>
  );
};

describe('when the microphone ends a voice over on its own', () => {
  it('the screen recorder is not left locked out', async () => {
    const recorder = voiceRecorder();
    render(<Live recorder={recorder} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Record a voice over' }),
    );
    await screen.findByRole('button', { name: 'Stop the voice over' });
    expect(
      screen.getByRole('button', { name: 'Record screen' }),
    ).toBeDisabled();

    recorder.endItself();
    await userEvent.click(
      screen.getByRole('button', { name: 'Stop the voice over' }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Record screen' }),
      ).toBeEnabled(),
    );
  });
});
