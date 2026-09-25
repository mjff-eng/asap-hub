import { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createEventResponse } from '@asap-hub/fixtures';

import DashboardEventsCard from '../DashboardEventsCard';

const event = (id: string, title: string) => ({
  ...createEventResponse(),
  id,
  title,
  eventOwner: <div>ASAP Team</div>,
});

const props: ComponentProps<typeof DashboardEventsCard> = {
  title: 'Events',
  description: 'Explore upcoming and previous events.',
  upcomingEvents: [event('upcoming-1', 'Upcoming Event')],
  pastEvents: [event('past-1', 'Past Event')],
  upcomingViewAllHref: '/events/upcoming',
  pastViewAllHref: '/events/past',
};

it('renders the title and description', () => {
  render(<DashboardEventsCard {...props} />);
  expect(screen.getByRole('heading', { name: 'Events' })).toBeVisible();
  expect(
    screen.getByText('Explore upcoming and previous events.'),
  ).toBeVisible();
});

it('shows the upcoming events by default, and switches to past events on tab click', () => {
  render(<DashboardEventsCard {...props} />);
  expect(screen.getByText('Upcoming Event')).toBeVisible();
  expect(screen.queryByText('Past Event')).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('Past'));

  expect(screen.getByText('Past Event')).toBeVisible();
  expect(screen.queryByText('Upcoming Event')).not.toBeInTheDocument();
});

it('changes the View All link to follow the active tab', () => {
  render(<DashboardEventsCard {...props} />);
  expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute(
    'href',
    '/events/upcoming',
  );

  fireEvent.click(screen.getByText('Past'));

  expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute(
    'href',
    '/events/past',
  );
});

it('shows the View All link when the active tab has a viewAllHref', () => {
  render(<DashboardEventsCard {...props} />);
  expect(screen.getByRole('link', { name: /view all/i })).toBeVisible();
});

it('hides the View All link when the active tab has no viewAllHref', () => {
  render(<DashboardEventsCard {...props} upcomingViewAllHref={undefined} />);
  expect(
    screen.queryByRole('link', { name: /view all/i }),
  ).not.toBeInTheDocument();
});

it('shows a link to switch to the Past tab when there are no upcoming events', () => {
  render(<DashboardEventsCard {...props} upcomingEvents={[]} />);
  expect(screen.getByText(/no upcoming events/i)).toBeVisible();

  fireEvent.click(screen.getByText('past events'));

  expect(screen.getByText('Past Event')).toBeVisible();
});

it('shows a message with no link when there are no past events', () => {
  render(<DashboardEventsCard {...props} pastEvents={[]} />);
  fireEvent.click(screen.getByText('Past'));

  expect(screen.getByText('No past events.')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: /past events/i }),
  ).not.toBeInTheDocument();
});
