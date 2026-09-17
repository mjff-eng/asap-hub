import { render, screen } from '@testing-library/react';
import ReminderItem, { getTimeElapsed } from '../ReminderItem';

it('renders reminder item with default icon', () => {
  render(<ReminderItem description="description" />);
  expect(screen.getByText('description')).toBeVisible();
  expect(screen.getByTitle('Info')).toBeInTheDocument();
});

it('renders an item with a link', () => {
  const { rerender } = render(
    <ReminderItem entity="Event" description="description" />,
  );
  expect(screen.getByText('description').closest('a')).toBeNull();
  expect(screen.getByTitle('Event')).toBeInTheDocument();

  rerender(
    <ReminderItem
      entity="Event"
      description="description"
      href="http://example.com"
    />,
  );
  expect(screen.getByText('description').closest('a')).toHaveAttribute(
    'href',
    'http://example.com',
  );
  expect(screen.getByTitle('Event')).toBeInTheDocument();
});

it('renders a markdown text correctly', () => {
  const { getByText } = render(
    <ReminderItem
      entity="Event"
      description="**description**"
      href="http://example.com"
    />,
  );

  expect(getByText('description').closest('strong')?.textContent).toContain(
    'description',
  );
});

it('renders the subtext correctly', () => {
  const { getByText } = render(
    <ReminderItem
      entity="Event"
      description="**description**"
      subtext="subtext"
      href="http://example.com"
    />,
  );

  expect(getByText('subtext')).toBeInTheDocument();
});

it('renders the milestone icon and the time elapsed when a date is given', () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  render(
    <ReminderItem
      entity="Milestone"
      description="description"
      date={twoHoursAgo}
    />,
  );

  expect(screen.getByTitle('Milestone')).toBeInTheDocument();
  expect(screen.getByText('2h')).toBeVisible();
});

describe('getTimeElapsed', () => {
  const MINUTES_IN_MILLISECONDS = 60 * 1000;
  const HOURS_IN_MILLISECONDS = 3600 * 1000;
  const DAYS_IN_MILLISECONDS = 86400 * 1000;

  it('returns the correct time elapsed in minutes', () => {
    const now = new Date();
    const tenMinutesAgo = new Date(
      now.getTime() - 10 * MINUTES_IN_MILLISECONDS,
    ).toISOString();
    expect(getTimeElapsed(tenMinutesAgo)).toBe('10m');
  });

  it('returns the correct time elapsed in hours', () => {
    const now = new Date();
    const threeHoursAgo = new Date(
      now.getTime() - 3 * HOURS_IN_MILLISECONDS,
    ).toISOString();
    expect(getTimeElapsed(threeHoursAgo)).toBe('3h');
  });

  it('returns the correct time elapsed in days', () => {
    const now = new Date();
    const fiveDaysAgo = new Date(
      now.getTime() - 5 * DAYS_IN_MILLISECONDS,
    ).toISOString();
    expect(getTimeElapsed(fiveDaysAgo)).toBe('5d');
  });

  it('returns 0m for times less than a minute ago', () => {
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(getTimeElapsed(thirtySecondsAgo)).toBe('0m');
  });
});
