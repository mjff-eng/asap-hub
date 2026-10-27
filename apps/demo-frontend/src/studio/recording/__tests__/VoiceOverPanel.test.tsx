import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoiceOverPanel from '../VoiceOverPanel';
import { releaseCapture } from '../captureLock';

afterEach(() => releaseCapture());

const panel = (props: Partial<Parameters<typeof VoiceOverPanel>[0]> = {}) =>
  render(
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
      {...props}
    />,
  );

it('lets the creator pick a delay before the voice over', async () => {
  const onCountdownChange = jest.fn();
  panel({ onCountdownChange });

  await userEvent.selectOptions(
    screen.getByLabelText('Delay before the voice over'),
    '3000',
  );

  expect(onCountdownChange).toHaveBeenCalledWith(3000);
});
