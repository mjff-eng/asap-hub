import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { colour } from '../../colors';
import { rem } from '../../pixels';
import InlineToast from '../InlineToast';

const defaultProps = {
  message: 'Added Jane Doe to Team Alpha',
  onUndo: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('Should render the message and a success icon', () => {
  render(<InlineToast {...defaultProps} />);

  expect(screen.getByText('Added Jane Doe to Team Alpha')).toBeVisible();
  expect(screen.getByTitle('Success')).toBeInTheDocument();
  expect(screen.queryByTitle('Error')).not.toBeInTheDocument();
});

it('Should render an error icon for the error accent', () => {
  render(
    <InlineToast
      {...defaultProps}
      accent="error"
      message="This speaker is not a member on any CRN team or individual project."
      onUndo={undefined}
    />,
  );

  expect(screen.getByTitle('Error')).toBeInTheDocument();
  expect(screen.queryByTitle('Success')).not.toBeInTheDocument();
});

it('Should render the neutral accent with an info icon and neutral styles', () => {
  render(
    <InlineToast
      {...defaultProps}
      accent="neutral"
      message="Jane Doe is already added to Team Alpha"
      onUndo={undefined}
    />,
  );

  expect(screen.getByTitle('Info circle')).toBeInTheDocument();
  const toast = screen.getByRole('status');
  expect(toast).toHaveStyleRule('background-color', colour.background.neutral);
  expect(toast).toHaveStyleRule('color', colour.foreground.neutral);
  expect(toast).toHaveStyleRule('border-radius', rem(4));
  const message = screen.getByText('Jane Doe is already added to Team Alpha');
  expect(message).toHaveStyleRule('font-size', rem(16));
  expect(message).toHaveStyleRule('font-weight', '500');
  expect(
    screen.getByRole('button', { name: 'Dismiss message' }),
  ).toHaveStyleRule('stroke', colour.foreground.neutral, {
    target: 'svg path',
  });
});

it('Should omit Undo when there is nothing to undo', () => {
  render(<InlineToast {...defaultProps} onUndo={undefined} />);

  expect(
    screen.queryByRole('button', { name: 'Undo' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Dismiss message' })).toBeVisible();
});

it('Should call onUndo when Undo is clicked', async () => {
  render(<InlineToast {...defaultProps} />);

  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

  expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);
});

it('Should call onDismiss when the dismiss button is clicked', async () => {
  render(<InlineToast {...defaultProps} />);

  await userEvent.click(
    screen.getByRole('button', { name: 'Dismiss message' }),
  );

  expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
});

it('Should disable Undo and dismiss when not enabled', () => {
  render(<InlineToast {...defaultProps} enabled={false} />);

  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Dismiss message' }),
  ).toBeDisabled();
});

it('Should not dismiss itself after any amount of time', () => {
  jest.useFakeTimers();
  try {
    render(<InlineToast {...defaultProps} />);

    act(() => {
      jest.advanceTimersByTime(600000);
    });

    expect(screen.getByText('Added Jane Doe to Team Alpha')).toBeVisible();
    expect(defaultProps.onDismiss).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});
