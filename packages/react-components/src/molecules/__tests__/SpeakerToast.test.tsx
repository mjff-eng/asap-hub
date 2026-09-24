import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SpeakerToast from '../SpeakerToast';

const defaultProps = {
  message: 'Added Jane Doe to Team Alpha',
  onUndo: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('Should render the message and a success icon', () => {
  render(<SpeakerToast {...defaultProps} />);

  expect(screen.getByText('Added Jane Doe to Team Alpha')).toBeVisible();
  expect(screen.getByTitle('Success')).toBeInTheDocument();
  expect(screen.queryByTitle('Error')).not.toBeInTheDocument();
});

it('Should render an error icon for the error accent', () => {
  render(
    <SpeakerToast
      {...defaultProps}
      accent="error"
      message="This speaker is not a member on any CRN team or individual project."
      onUndo={undefined}
    />,
  );

  expect(screen.getByTitle('Error')).toBeInTheDocument();
  expect(screen.queryByTitle('Success')).not.toBeInTheDocument();
});

it('Should omit Undo when there is nothing to undo', () => {
  render(<SpeakerToast {...defaultProps} onUndo={undefined} />);

  expect(
    screen.queryByRole('button', { name: 'Undo' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Dismiss message' })).toBeVisible();
});

it('Should call onUndo when Undo is clicked', async () => {
  render(<SpeakerToast {...defaultProps} />);

  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

  expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);
});

it('Should call onDismiss when the dismiss button is clicked', async () => {
  render(<SpeakerToast {...defaultProps} />);

  await userEvent.click(
    screen.getByRole('button', { name: 'Dismiss message' }),
  );

  expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
});

it('Should disable Undo and dismiss when not enabled', () => {
  render(<SpeakerToast {...defaultProps} enabled={false} />);

  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Dismiss message' }),
  ).toBeDisabled();
});

it('Should not dismiss itself after any amount of time', () => {
  jest.useFakeTimers();
  try {
    render(<SpeakerToast {...defaultProps} />);

    act(() => {
      jest.advanceTimersByTime(600000);
    });

    expect(screen.getByText('Added Jane Doe to Team Alpha')).toBeVisible();
    expect(defaultProps.onDismiss).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});
