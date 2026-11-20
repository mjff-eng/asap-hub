import { AsapAreaMember, AsapAreaResponse } from '@asap-hub/model';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MeetAsapTeam from '../MeetAsapTeam';

const member = (
  id: string,
  firstName: string,
  lastName: string,
): AsapAreaMember => ({
  id,
  firstName,
  lastName,
  displayName: `${firstName} ${lastName}`,
});

const sarah = member('sarah', 'Sarah', 'Jones');
const tom = member('tom', 'Tom', 'Sargent');
const alice = member('alice', 'Alice', 'Smith');

const area = (
  id: string,
  name: string,
  members: AsapAreaMember[],
  overrides: Partial<AsapAreaResponse> = {},
): AsapAreaResponse => ({
  id,
  name,
  objective: `${name} objective`,
  primaryEmail: `${id}@example.com`,
  members,
  ...overrides,
});

const areas = [
  area('events', 'Events', [sarah, alice], {
    secondaryEmail: 'cosa@example.com',
  }),
  area('leads', 'Programmatic Leads', [sarah, tom]),
  area('research', 'Research Operations', [alice]),
];

const sidebar = () => within(screen.getByRole('navigation', { name: 'Areas' }));
const search = (query: string) =>
  userEvent.type(screen.getByRole('searchbox'), query);

it('opens the first area by default', () => {
  render(<MeetAsapTeam areas={areas} />);

  expect(screen.getByRole('heading', { name: 'Events' })).toBeVisible();
  expect(screen.getByText('Events objective')).toBeVisible();
  expect(screen.getByText('2 Members')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Sarah Jones' })).toHaveAttribute(
    'href',
    expect.stringContaining('sarah'),
  );
  expect(sidebar().getByRole('button', { name: 'Events (2)' })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

it('opens another area from the sidebar', async () => {
  render(<MeetAsapTeam areas={areas} />);

  await userEvent.click(
    sidebar().getByRole('button', { name: 'Research Operations (1)' }),
  );

  expect(
    screen.getByRole('heading', { name: 'Research Operations' }),
  ).toBeVisible();
  expect(screen.getByText('1 Member')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Alice Smith' })).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'Sarah Jones' }),
  ).not.toBeInTheDocument();
});

it('opens another area from the mobile select', async () => {
  render(<MeetAsapTeam areas={areas} />);

  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Areas' }),
    'leads',
  );

  expect(
    screen.getByRole('heading', { name: 'Programmatic Leads' }),
  ).toBeVisible();
});

it('renders the primary and secondary emails and copies them', async () => {
  Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
  render(<MeetAsapTeam areas={areas} />);

  expect(
    screen.getByRole('link', { name: /events @example\.com/ }),
  ).toHaveAttribute('href', 'mailto:events@example.com');
  expect(
    screen.getByRole('link', { name: /cosa @example\.com/ }),
  ).toHaveAttribute('href', 'mailto:cosa@example.com');

  const [, secondaryCopy] = screen.getAllByRole('button', { name: 'Copy' });
  await userEvent.click(secondaryCopy!);
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
    'cosa@example.com',
  );
});

it('renders a single email when there is no secondary email', async () => {
  render(<MeetAsapTeam areas={areas} />);

  await userEvent.click(
    sidebar().getByRole('button', { name: 'Programmatic Leads (2)' }),
  );

  expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(1);
});

it('lists each matching person once with all their areas', async () => {
  render(<MeetAsapTeam areas={areas} />);

  await search('sar');

  expect(screen.getByText('2 people match')).toBeVisible();
  expect(screen.getAllByRole('link', { name: 'Sarah Jones' })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Tom Sargent' })).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'Alice Smith' }),
  ).not.toBeInTheDocument();

  const sarahItem = screen
    .getByRole('link', { name: 'Sarah Jones' })
    .closest('li')!;
  expect(
    within(sarahItem)
      .getAllByRole('button')
      .map((button) => button.textContent),
  ).toEqual(['Events', 'Programmatic Leads']);
});

it('shows match counts per area and disables areas without matches', async () => {
  render(<MeetAsapTeam areas={areas} />);

  await search('sar');

  expect(
    sidebar().getByRole('button', { name: 'All matching areas (2)' }),
  ).toHaveAttribute('aria-current', 'true');
  expect(sidebar().getByRole('button', { name: 'Events (1)' })).toBeEnabled();
  expect(
    sidebar().getByRole('button', { name: 'Programmatic Leads (2)' }),
  ).toBeEnabled();
  expect(
    sidebar().getByRole('button', { name: 'Research Operations' }),
  ).toBeDisabled();
});

it('filters the results to an area clicked during search and keeps the search', async () => {
  render(<MeetAsapTeam areas={areas} />);

  await search('sar');
  await userEvent.click(sidebar().getByRole('button', { name: 'Events (1)' }));

  expect(screen.getByRole('searchbox')).toHaveValue('sar');
  expect(screen.getByText('1 person matches')).toBeVisible();
  expect(screen.getByText(/in Events/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Sarah Jones' })).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'Tom Sargent' }),
  ).not.toBeInTheDocument();

  await userEvent.click(
    sidebar().getByRole('button', { name: 'All matching areas (2)' }),
  );

  expect(screen.getByText('2 people match')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Tom Sargent' })).toBeVisible();
});

it('filters the results to an area pill clicked on a result', async () => {
  render(<MeetAsapTeam areas={areas} />);

  await search('sar');
  const tomItem = screen
    .getByRole('link', { name: 'Tom Sargent' })
    .closest('li')!;
  await userEvent.click(
    within(tomItem).getByRole('button', { name: 'Programmatic Leads' }),
  );

  expect(screen.getByRole('searchbox')).toHaveValue('sar');
  expect(screen.getByText(/in Programmatic Leads/)).toBeVisible();
});

it('filters the results from the mobile select during search', async () => {
  render(<MeetAsapTeam areas={areas} />);

  await search('sar');
  const select = screen.getByRole('combobox', { name: 'Areas' });
  expect(select).toHaveValue('all-matching-areas');

  await userEvent.selectOptions(select, 'events');
  expect(screen.getByText(/in Events/)).toBeVisible();

  await userEvent.selectOptions(select, 'all-matching-areas');
  expect(screen.getByText('2 people match')).toBeVisible();
});

it('opens the last clicked area when the search is cleared', async () => {
  render(<MeetAsapTeam areas={areas} />);

  await search('sar');
  await userEvent.click(
    sidebar().getByRole('button', { name: 'Programmatic Leads (2)' }),
  );
  await userEvent.clear(screen.getByRole('searchbox'));

  expect(
    screen.getByRole('heading', { name: 'Programmatic Leads' }),
  ).toBeVisible();
});

it('shows an empty state when nobody matches', async () => {
  render(<MeetAsapTeam areas={areas} />);

  await search('zzz');

  expect(screen.getByText('No results found.')).toBeVisible();
  expect(screen.queryAllByRole('link')).toHaveLength(0);
});

it('shows ten members and toggles the rest', async () => {
  const manyMembers = Array.from({ length: 12 }, (_, i) =>
    member(`user-${i}`, 'Person', `${i}`),
  );
  render(<MeetAsapTeam areas={[area('big', 'Big Area', manyMembers)]} />);

  expect(screen.getAllByRole('link', { name: /Person/ })).toHaveLength(10);

  await userEvent.click(screen.getByRole('button', { name: 'View 2 more' }));
  expect(screen.getAllByRole('link', { name: /Person/ })).toHaveLength(12);

  await userEvent.click(screen.getByRole('button', { name: 'View 2 less' }));
  expect(screen.getAllByRole('link', { name: /Person/ })).toHaveLength(10);
});

it('does not show the toggle with ten members or fewer', () => {
  render(<MeetAsapTeam areas={areas} />);

  expect(
    screen.queryByRole('button', { name: /View \d+ more/ }),
  ).not.toBeInTheDocument();
});
