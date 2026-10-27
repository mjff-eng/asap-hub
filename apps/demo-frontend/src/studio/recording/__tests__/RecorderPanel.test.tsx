import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecorderPanel from '../RecorderPanel';
import { releaseCapture } from '../captureLock';

afterEach(() => releaseCapture());

const panel = (props: Partial<Parameters<typeof RecorderPanel>[0]> = {}) =>
  render(
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
      {...props}
    />,
  );

describe('the delay before a recording', () => {
  it('is the creator to pick before starting', async () => {
    const onCountdownChange = jest.fn();
    panel({ onCountdownChange });

    await userEvent.selectOptions(
      screen.getByLabelText('Delay before recording'),
      '5000',
    );

    expect(onCountdownChange).toHaveBeenCalledWith(5000);
  });
});

describe('while the count is running', () => {
  it('shows the seconds left', () => {
    panel({ status: 'counting', countdownMsLeft: 2400 });

    expect(screen.getByRole('timer')).toHaveTextContent('3');
  });

  it('counts along in the tab title, which is what a creator on the other tab can see', () => {
    document.title = 'ASAP Demos';
    const { unmount } = panel({ status: 'counting', countdownMsLeft: 1600 });

    expect(document.title).toContain('2');

    unmount();
    expect(document.title).toBe('ASAP Demos');
  });

  it('starts at once when asked', async () => {
    const onStartNow = jest.fn();
    panel({ status: 'counting', countdownMsLeft: 2000, onStartNow });

    await userEvent.click(screen.getByRole('button', { name: 'Start now' }));

    expect(onStartNow).toHaveBeenCalled();
  });

  it('backs out without recording when cancelled', async () => {
    const onCancel = jest.fn();
    panel({ status: 'counting', countdownMsLeft: 2000, onCancel });

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });
});

describe('before a recording', () => {
  it('lets the creator leave the microphone out', async () => {
    const onMicrophoneChange = jest.fn();
    panel({ onMicrophoneChange });

    await userEvent.click(screen.getByRole('checkbox', { name: 'Microphone' }));

    expect(onMicrophoneChange).toHaveBeenCalledWith(false);
  });
});

describe('while a take is paused', () => {
  it('says so and offers to carry on', async () => {
    const onResume = jest.fn();
    panel({ status: 'paused', elapsedMs: 65_000, onResume });

    expect(screen.getByText('Paused')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Pause' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));

    expect(onResume).toHaveBeenCalled();
  });
});

describe('a problem with the recording', () => {
  it('is raised as an alert', () => {
    panel({ error: 'Could not start the recording.' });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not start the recording.',
    );
  });

  it('mentions a missing microphone without raising the alarm', () => {
    panel({
      status: 'recording',
      error: 'The microphone was not available, recording without it.',
    });

    expect(
      screen.getByText(
        'The microphone was not available, recording without it.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
