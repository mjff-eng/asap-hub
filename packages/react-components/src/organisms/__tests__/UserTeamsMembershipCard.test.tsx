import { UserTeam } from '@asap-hub/model';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserTeamsMembershipCard from '../UserTeamsMembershipCard';

const teams: UserTeam[] = [
  { id: 't1', displayName: 'Alpha', role: 'Project Manager' },
  { id: 't1', displayName: 'Alpha', role: 'Lead PI (Core Leadership)' },
  { id: 't2', displayName: 'Beta', role: 'Key Personnel' },
  {
    id: 't3',
    displayName: 'Gamma',
    role: 'Collaborating PI',
    inactiveSinceDate: '2023-02-15T12:00:00.000Z',
  },
  {
    id: 't4',
    displayName: 'Delta',
    role: 'Trainee',
    teamInactiveSince: '2022-11-01T12:00:00.000Z',
  },
];

const table = () => screen.getByTestId('teams-membership-table');

it('renders the empty states', async () => {
  render(<UserTeamsMembershipCard teams={[]} userAlumni={false} />);
  expect(
    screen.getByRole('heading', { name: 'Teams and Roles' }),
  ).toBeVisible();
  expect(screen.getByText('No current teams.')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Former (0)' }));
  expect(screen.getByText('No former teams.')).toBeVisible();
});

it('lists current teams with every role, without a date left column', () => {
  render(<UserTeamsMembershipCard teams={teams} userAlumni={false} />);

  expect(screen.getByText('Current (2)')).toBeInTheDocument();
  expect(screen.getByText('Former (2)')).toBeInTheDocument();
  expect(within(table()).queryByText('Date left')).not.toBeInTheDocument();

  const rows = within(table()).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent('Alpha');
  expect(rows[0]).toHaveTextContent('Lead PI (Core Leadership)');
  expect(rows[0]).toHaveTextContent('Project Manager');
  expect(rows[1]).toHaveTextContent('Beta');
  expect(within(table()).getByRole('link', { name: 'Alpha' })).toHaveAttribute(
    'href',
    expect.stringContaining('t1'),
  );
});

it('lists former teams with the date left and an inactive badge', async () => {
  render(<UserTeamsMembershipCard teams={teams} userAlumni={false} />);
  await userEvent.click(screen.getByRole('button', { name: 'Former (2)' }));

  expect(within(table()).getByText('Date left')).toBeInTheDocument();
  expect(within(table()).getByText('Gamma')).toBeInTheDocument();
  expect(within(table()).getByText('Wed, 15 Feb 2023')).toBeInTheDocument();
  expect(within(table()).getByText('Delta')).toBeInTheDocument();
  expect(within(table()).getByText('Tue, 01 Nov 2022')).toBeInTheDocument();
  expect(within(table()).getByTitle('Inactive Team')).toBeInTheDocument();
});

it('puts every team under former for an alumni user', () => {
  render(<UserTeamsMembershipCard teams={teams} userAlumni />);
  expect(screen.getByText('Current (0)')).toBeInTheDocument();
  expect(screen.getByText('Former (4)')).toBeInTheDocument();
  expect(within(table()).getByText('Alpha')).toBeInTheDocument();
  expect(within(table()).getByText('Beta')).toBeInTheDocument();
});
