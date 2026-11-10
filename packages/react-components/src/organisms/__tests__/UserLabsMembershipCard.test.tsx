import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserLabsMembershipCard, {
  LabMembership,
} from '../UserLabsMembershipCard';

const userId = 'u42';

const labs: LabMembership[] = [
  {
    id: 'l1',
    name: 'Mars Lab',
    labPrincipalInvestigatorId: userId,
    team: { id: 't1', displayName: 'Alpha' },
  },
  { id: 'l2', name: 'Ferguson Lab', labPrincipalInvestigatorId: 'u7' },
  {
    id: 'l3',
    name: 'Chen Lab',
    team: { id: 't3', displayName: 'Gamma' },
    inactiveSinceDate: '2023-02-15T12:00:00.000Z',
  },
];

const table = () => screen.getByTestId('labs-membership-table');

it('renders the empty states', async () => {
  render(
    <UserLabsMembershipCard labs={[]} userId={userId} userAlumni={false} />,
  );
  expect(screen.getByRole('heading', { name: 'Labs' })).toBeVisible();
  expect(screen.getByText('No current labs.')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Former (0)' }));
  expect(screen.getByText('No former labs.')).toBeVisible();
});

it('lists current labs, marking the one the user leads', () => {
  render(
    <UserLabsMembershipCard labs={labs} userId={userId} userAlumni={false} />,
  );

  expect(screen.getByText('Current (2)')).toBeInTheDocument();
  expect(screen.getByText('Former (1)')).toBeInTheDocument();

  const rows = within(table()).getAllByRole('row').slice(1);
  expect(rows[0]).toHaveTextContent('Mars Lab');
  expect(rows[0]).toHaveTextContent('Lead PI of this lab');
  expect(within(rows[0]!).getByRole('link', { name: 'Alpha' })).toHaveAttribute(
    'href',
    expect.stringContaining('t1'),
  );
  expect(rows[1]).toHaveTextContent('Ferguson Lab');
  expect(rows[1]).not.toHaveTextContent('Lead PI of this lab');
  expect(within(rows[1]!).queryByRole('link')).not.toBeInTheDocument();
  expect(within(table()).queryByText('Date left')).not.toBeInTheDocument();
});

it('lists former labs with the date left', async () => {
  render(
    <UserLabsMembershipCard labs={labs} userId={userId} userAlumni={false} />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Former (1)' }));

  expect(within(table()).getByText('Date left')).toBeInTheDocument();
  expect(within(table()).getByText('Chen Lab')).toBeInTheDocument();
  expect(within(table()).getByText('Wed, 15 Feb 2023')).toBeInTheDocument();
});

it('puts every lab under former for an alumni user', () => {
  render(<UserLabsMembershipCard labs={labs} userId={userId} userAlumni />);
  expect(screen.getByText('Current (0)')).toBeInTheDocument();
  expect(screen.getByText('Former (3)')).toBeInTheDocument();
  expect(within(table()).getByText('Mars Lab')).toBeInTheDocument();
});
