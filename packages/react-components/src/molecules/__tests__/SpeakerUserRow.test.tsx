import { fireEvent, render, screen } from '@testing-library/react';

import SpeakerUserRow from '../SpeakerUserRow';

const defaultProps = {
  displayName: 'Jane Doe',
};

it('renders a preliminary findings toggle on a past event and none on an upcoming one', () => {
  const { rerender } = render(
    <SpeakerUserRow {...defaultProps} showShared onToggleShared={jest.fn()} />,
  );
  expect(
    screen.getByRole('checkbox', {
      name: 'Jane Doe preliminary findings shared',
    }),
  ).toBeVisible();

  rerender(
    <SpeakerUserRow
      {...defaultProps}
      showShared={false}
      onToggleShared={jest.fn()}
    />,
  );
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

it('renders a standalone findings icon when there is no toggle callback', () => {
  const { rerender } = render(
    <SpeakerUserRow {...defaultProps} showShared preliminaryFindingsShared />,
  );
  expect(screen.getByLabelText('Shared preliminary findings')).toBeVisible();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

  rerender(<SpeakerUserRow {...defaultProps} showShared />);
  expect(screen.getByLabelText('No preliminary findings')).toBeVisible();
});

it('renders no findings affordance at all when showShared is false', () => {
  render(
    <SpeakerUserRow
      {...defaultProps}
      preliminaryFindingsShared
      showShared={false}
    />,
  );
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText('Shared preliminary findings'),
  ).not.toBeInTheDocument();
});

it('calls onToggleShared with the new value', () => {
  const onToggleShared = jest.fn();
  const { rerender } = render(
    <SpeakerUserRow
      {...defaultProps}
      showShared
      onToggleShared={onToggleShared}
    />,
  );
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: 'Jane Doe preliminary findings shared',
    }),
  );
  expect(onToggleShared).toHaveBeenLastCalledWith(true);

  rerender(
    <SpeakerUserRow
      {...defaultProps}
      showShared
      preliminaryFindingsShared
      onToggleShared={onToggleShared}
    />,
  );
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: 'Jane Doe preliminary findings shared',
    }),
  );
  expect(onToggleShared).toHaveBeenLastCalledWith(false);
});

it('calls onRemove when the delete button is clicked', () => {
  const onRemove = jest.fn();
  render(<SpeakerUserRow {...defaultProps} onRemove={onRemove} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Jane Doe' }));
  expect(onRemove).toHaveBeenCalled();
});
