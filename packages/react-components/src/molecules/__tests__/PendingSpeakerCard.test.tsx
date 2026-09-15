import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PendingSpeakerCard from '../PendingSpeakerCard';

const defaultProps = {
  displayName: 'Jane Doe',
  userId: 'user-1',
  teams: [
    { teamId: 'team-1', teamName: 'Team Alpha' },
    { teamId: 'team-2', teamName: 'Team Beta' },
  ],
  onPickTeam: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('Should render the warning message and team pills', () => {
  render(<PendingSpeakerCard {...defaultProps} />);

  expect(
    screen.getByText('Pick a team to finish adding them.'),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /Team Alpha/ }),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Team Beta/ })).toBeInTheDocument();
});

it('Should call onPickTeam when a team pill is clicked', async () => {
  render(<PendingSpeakerCard {...defaultProps} />);

  await userEvent.click(screen.getByRole('button', { name: /Team Alpha/ }));

  expect(defaultProps.onPickTeam).toHaveBeenCalledWith(
    'team-1',
    expect.anything(),
    expect.anything(),
  );
});

it('Should call onDismiss when the remove button is clicked', async () => {
  render(<PendingSpeakerCard {...defaultProps} />);

  await userEvent.click(
    screen.getByRole('button', { name: 'Remove Jane Doe' }),
  );

  expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
});

it('Should disable the remove button and team pills when enabled is false', () => {
  render(<PendingSpeakerCard {...defaultProps} enabled={false} />);

  expect(
    screen.getByRole('button', { name: 'Remove Jane Doe' }),
  ).toBeDisabled();
});

it('Should render a link to the user profile', () => {
  render(<PendingSpeakerCard {...defaultProps} />);

  const userLink = screen.getByRole('link', { name: 'Jane Doe' });
  expect(userLink).toHaveAttribute('href', expect.stringContaining('user-1'));
  expect(userLink).toHaveAttribute('target', '_blank');
});
