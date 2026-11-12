import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EventCalendarCard from '../EventCalendarCard';

const owner = {
  name: 'My Interest Group',
  href: '/network/interest-groups/ig-1',
  icon: <span>Owner Icon</span>,
};

it('renders the title and description', () => {
  render(<EventCalendarCard calendarId="cal-1" owner={owner} />);
  expect(
    screen.getByRole('heading', { name: 'Subscribe to this group’s calendar' }),
  ).toBeVisible();
  expect(
    screen.getByText(/This event comes from the calendar of the group below/),
  ).toBeVisible();
});

it('links the owner name to the owner page and shows its icon', () => {
  render(<EventCalendarCard calendarId="cal-1" owner={owner} />);
  expect(
    screen.getByRole('link', { name: 'My Interest Group' }),
  ).toHaveAttribute('href', '/network/interest-groups/ig-1');
  expect(screen.getByText('Owner Icon')).toBeVisible();
});

it('shows the owner name as text when there is no href', () => {
  render(
    <EventCalendarCard
      calendarId="cal-1"
      owner={{ ...owner, href: undefined }}
    />,
  );
  expect(screen.getByText('My Interest Group')).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'My Interest Group' }),
  ).not.toBeInTheDocument();
});

it('subscribes to the given calendar', async () => {
  render(<EventCalendarCard calendarId="cal-1" owner={owner} />);
  await userEvent.click(screen.getByRole('button', { name: /subscribe/i }));
  expect(
    screen.getByRole('link', { name: /Add to Google Calendar/i }),
  ).toHaveAttribute('href', expect.stringContaining('cid=cal-1'));
});
