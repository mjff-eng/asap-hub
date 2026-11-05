import { render, screen } from '@testing-library/react';

import UserProfileMemberships from '../UserProfileMemberships';

const props = {
  projects: [],
  teams: [],
  workingGroups: [],
};

it('renders the membership cards in order with the interest groups card slot', () => {
  render(
    <UserProfileMemberships
      {...props}
      interestGroupsCard={<section aria-label="Interest Groups">IG</section>}
    />,
  );
  expect(
    screen
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-label')),
  ).toEqual([
    'Projects',
    'Teams and Roles',
    'Interest Groups',
    'Working Groups',
  ]);
});

it('opens the former and past tabs for an alumni user', () => {
  render(
    <UserProfileMemberships
      {...props}
      alumniSinceDate="2024-01-01T00:00:00.000Z"
      teams={[{ id: 't1', displayName: 'Alpha', role: 'Trainee' }]}
      workingGroups={[
        { id: 'wg1', name: 'Data', role: 'Member', active: true },
      ]}
    />,
  );
  expect(screen.getByText('Former (1)')).toBeInTheDocument();
  expect(screen.getByText('Past (1)')).toBeInTheDocument();
  expect(screen.getAllByText('Alpha')).toHaveLength(2);
  expect(screen.getAllByText('Data')).toHaveLength(2);
});
