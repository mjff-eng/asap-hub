import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { createEventResponse } from '@asap-hub/fixtures';
import { addHours, subHours } from 'date-fns';

import DashboardEventCard from '../DashboardEventCard';

const props: ComponentProps<typeof DashboardEventCard> = {
  ...createEventResponse(),
  eventOwner: <div>ASAP Team</div>,
  variant: 'upcoming',
};

const liveWindow = {
  startDate: subHours(new Date(), 0).toISOString(),
  endDate: addHours(new Date(), 1).toISOString(),
};

it('shows the live dot and a Join event now button for a live event with a meeting link', () => {
  render(
    <DashboardEventCard
      {...props}
      {...liveWindow}
      meetingLink="https://example.com/meeting"
      hideMeetingLink={false}
    />,
  );
  expect(screen.getByTitle('Live')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /join event now/i })).toHaveAttribute(
    'href',
    'https://example.com/meeting',
  );
});

it('shows the live dot and an In person pill, but no button, for a live event without a meeting link', () => {
  render(
    <DashboardEventCard {...props} {...liveWindow} meetingLink={undefined} />,
  );
  expect(screen.getByTitle('Live')).toBeInTheDocument();
  expect(screen.getByText('In person')).toBeVisible();
  expect(
    screen.queryByRole('link', { name: /join event now/i }),
  ).not.toBeInTheDocument();
});

it('shows neither the live dot nor the button for an event that has not started', () => {
  render(
    <DashboardEventCard
      {...props}
      startDate={addHours(new Date(), 2).toISOString()}
      endDate={addHours(new Date(), 3).toISOString()}
      meetingLink="https://example.com/meeting"
    />,
  );
  expect(screen.queryByTitle('Live')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: /join event now/i }),
  ).not.toBeInTheDocument();
});

it('shows the In person pill for a past event without a meeting link', () => {
  render(
    <DashboardEventCard
      {...props}
      variant="past"
      startDate={subHours(new Date(), 3).toISOString()}
      endDate={subHours(new Date(), 2).toISOString()}
      meetingLink={undefined}
    />,
  );
  expect(screen.getByText('In person')).toBeVisible();
  expect(screen.queryByTitle('Live')).not.toBeInTheDocument();
});

it('shows the materials list for past events only', () => {
  const { rerender } = render(<DashboardEventCard {...props} variant="past" />);
  expect(screen.getByText('Recording')).toBeVisible();
  expect(screen.getByText('Presentation')).toBeVisible();
  expect(screen.getByText('Notes')).toBeVisible();

  rerender(<DashboardEventCard {...props} variant="upcoming" />);
  expect(screen.queryByText('Recording')).not.toBeInTheDocument();
});

it('shows a strikethrough title and no live dot for a cancelled event within its time window', () => {
  render(
    <DashboardEventCard
      {...props}
      {...liveWindow}
      status="Cancelled"
      meetingLink="https://example.com/meeting"
    />,
  );
  expect(screen.queryByTitle('Live')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: /join event now/i }),
  ).not.toBeInTheDocument();
});
