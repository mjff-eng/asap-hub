import { createUserResponse } from '@asap-hub/fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AboutMembersCard from '../AboutMembersCard';

const createMembers = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...createUserResponse({}, index),
    id: `user-${index}`,
    displayName: `Member ${index}`,
    jobTitle: `Job ${index}`,
  }));

const renderCard = (count: number) =>
  render(
    <AboutMembersCard
      title="Meet the CNS Quest Team"
      description="CNS Quest description"
      members={createMembers(count)}
    />,
  );

it('renders the title and description', () => {
  renderCard(1);

  expect(
    screen.getByRole('heading', { name: 'Meet the CNS Quest Team' }),
  ).toBeVisible();
  expect(screen.getByText('CNS Quest description')).toBeVisible();
});

it('renders each member with a profile link and job title', () => {
  renderCard(1);

  expect(screen.getByRole('link', { name: 'Member 0' })).toHaveAttribute(
    'href',
    expect.stringContaining('user-0'),
  );
  expect(screen.getByText('Job 0')).toBeVisible();
});

it('shows up to 10 members without a toggle', () => {
  renderCard(10);

  expect(screen.getAllByRole('listitem')).toHaveLength(10);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('shows 10 members and expands to show the rest', async () => {
  renderCard(14);

  expect(screen.getAllByRole('listitem')).toHaveLength(10);
  expect(
    screen.queryByRole('link', { name: 'Member 10' }),
  ).not.toBeInTheDocument();

  await userEvent.click(
    screen.getByRole('button', { name: 'View 4 More', expanded: false }),
  );

  expect(screen.getAllByRole('listitem')).toHaveLength(14);
  expect(screen.getByRole('link', { name: 'Member 13' })).toBeVisible();

  await userEvent.click(
    screen.getByRole('button', { name: 'View Less', expanded: true }),
  );

  expect(screen.getAllByRole('listitem')).toHaveLength(10);
});
