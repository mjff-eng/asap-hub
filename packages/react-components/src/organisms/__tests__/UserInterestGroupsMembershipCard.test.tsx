import { createInterestGroupResponse } from '@asap-hub/fixtures';
import { InterestGroupResponse } from '@asap-hub/model';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserInterestGroupsMembershipCard from '../UserInterestGroupsMembershipCard';

const userId = 'u42';

const group = (
  index: number,
  overrides: Partial<InterestGroupResponse> = {},
): InterestGroupResponse => ({
  ...createInterestGroupResponse({}, index),
  name: `Group ${index}`,
  ...overrides,
});

const leader = (
  role: InterestGroupResponse['leaders'][number]['role'],
  inactiveSinceDate?: string,
) => {
  const [base] = createInterestGroupResponse().leaders;
  return {
    ...base!,
    user: { ...base!.user, id: userId },
    role,
    inactiveSinceDate,
  };
};

const interestGroups = [
  group(0, { leaders: [leader('Chair')] }),
  group(1),
  group(2, { active: false }),
  group(3, { leaders: [leader('Project Manager', '2023-02-15')] }),
];

const table = () => screen.getByTestId('interest-groups-membership-table');

it('renders the empty states', async () => {
  render(
    <UserInterestGroupsMembershipCard
      interestGroups={[]}
      userId={userId}
      userAlumni={false}
    />,
  );
  expect(
    screen.getByRole('heading', { name: 'Interest Groups' }),
  ).toBeVisible();
  expect(screen.getByText('No active memberships.')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Past (0)' }));
  expect(screen.getByText('No past memberships.')).toBeVisible();
});

it('lists active memberships with the role the user has in each group', () => {
  render(
    <UserInterestGroupsMembershipCard
      interestGroups={interestGroups}
      userId={userId}
      userAlumni={false}
    />,
  );
  expect(screen.getByText('Active (2)')).toBeInTheDocument();
  expect(screen.getByText('Past (2)')).toBeInTheDocument();

  const rows = within(table()).getAllByRole('row').slice(1);
  expect(rows[0]).toHaveTextContent('Group 0');
  expect(rows[0]).toHaveTextContent('Chair');
  expect(rows[1]).toHaveTextContent('Group 1');
  expect(rows[1]).toHaveTextContent('Member');
  expect(
    within(table()).getByRole('link', { name: 'Group 0' }),
  ).toHaveAttribute('href', expect.stringContaining('g-0'));
});

it('lists inactive groups and groups the user left under past', async () => {
  render(
    <UserInterestGroupsMembershipCard
      interestGroups={interestGroups}
      userId={userId}
      userAlumni={false}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Past (2)' }));
  expect(within(table()).getByText('Group 2')).toBeInTheDocument();
  expect(within(table()).getByText('Group 3')).toBeInTheDocument();
});

it('puts every group under past for an alumni user', () => {
  render(
    <UserInterestGroupsMembershipCard
      interestGroups={interestGroups}
      userId={userId}
      userAlumni
    />,
  );
  expect(screen.getByText('Active (0)')).toBeInTheDocument();
  expect(screen.getByText('Past (4)')).toBeInTheDocument();
  expect(within(table()).getByText('Group 0')).toBeInTheDocument();
});
