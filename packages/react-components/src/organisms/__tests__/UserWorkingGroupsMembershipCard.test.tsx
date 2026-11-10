import { WorkingGroupMembership } from '@asap-hub/model';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserWorkingGroupsMembershipCard from '../UserWorkingGroupsMembershipCard';

const workingGroups: WorkingGroupMembership[] = [
  { id: 'wg1', name: 'Data Sharing', role: 'Chair', active: true },
  { id: 'wg2', name: 'Open Science', role: 'Member', active: true },
  { id: 'wg3', name: 'Legacy Protocols', role: 'Lead', active: false },
];

const table = () => screen.getByTestId('working-groups-membership-table');

it('renders the empty states', async () => {
  render(
    <UserWorkingGroupsMembershipCard workingGroups={[]} userAlumni={false} />,
  );
  expect(screen.getByRole('heading', { name: 'Working Groups' })).toBeVisible();
  expect(screen.getByText('No active memberships.')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Past (0)' }));
  expect(screen.getByText('No past memberships.')).toBeVisible();
});

it('lists active memberships with their roles', () => {
  render(
    <UserWorkingGroupsMembershipCard
      workingGroups={workingGroups}
      userAlumni={false}
    />,
  );
  expect(screen.getByText('Active (2)')).toBeInTheDocument();
  expect(screen.getByText('Past (1)')).toBeInTheDocument();

  const rows = within(table()).getAllByRole('row').slice(1);
  expect(rows[0]).toHaveTextContent('Data Sharing');
  expect(rows[0]).toHaveTextContent('Chair');
  expect(rows[1]).toHaveTextContent('Open Science');
  expect(rows[1]).toHaveTextContent('Member');
  expect(
    within(table()).getByRole('link', { name: 'Data Sharing' }),
  ).toHaveAttribute('href', expect.stringContaining('wg1'));
});

it('lists inactive groups under past', async () => {
  render(
    <UserWorkingGroupsMembershipCard
      workingGroups={workingGroups}
      userAlumni={false}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Past (1)' }));
  expect(within(table()).getByText('Legacy Protocols')).toBeInTheDocument();
  expect(within(table()).getByText('Lead')).toBeInTheDocument();
});

it('puts every group under past for an alumni user', () => {
  render(
    <UserWorkingGroupsMembershipCard
      workingGroups={workingGroups}
      userAlumni
    />,
  );
  expect(screen.getByText('Active (0)')).toBeInTheDocument();
  expect(screen.getByText('Past (3)')).toBeInTheDocument();
  expect(within(table()).getByText('Data Sharing')).toBeInTheDocument();
});
