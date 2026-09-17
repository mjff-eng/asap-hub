import { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { createEventResponse } from '@asap-hub/fixtures';

import EventInfo from '../EventInfo';

jest.mock('../../localization');

const eventOwner = <div>ASAP Team</div>;
const props: ComponentProps<typeof EventInfo> = {
  ...createEventResponse(),
  tags: [],
  eventOwner,
};

it('renders an event', () => {
  render(<EventInfo {...props} title="My Event" />);
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
    'My Event',
  );
});

it('truncates long event titles', () => {
  render(<EventInfo {...props} title={'blablablha'.repeat(100)} />);

  expect(screen.getByRole('heading', { level: 3 }).textContent).toMatch(/…$/i);
});

it('does not truncate long event titles when limit is null', () => {
  render(
    <EventInfo {...props} titleLimit={null} title={'blablablha'.repeat(100)} />,
  );

  expect(screen.getByRole('heading', { level: 3 }).textContent).not.toMatch(
    /…$/i,
  );
});

it('renders the date block for the start date', () => {
  render(
    <EventInfo
      {...props}
      startDate="2021-05-28T10:00:00Z"
      thumbnail={undefined}
    />,
  );

  expect(screen.getByText('MAY')).toBeVisible();
  expect(screen.getByText('28')).toBeVisible();
});

it('renders the thumbnail in place of the date block when provided', () => {
  render(
    <EventInfo
      {...props}
      startDate="2021-05-28T10:00:00Z"
      thumbnail="https://example.com/thumbnail.png"
    />,
  );

  expect(screen.getByAltText(/thumbnail/i)).toHaveAttribute(
    'src',
    'https://example.com/thumbnail.png',
  );
  expect(screen.queryByText('MAY')).not.toBeInTheDocument();
});

it('strikes through the title of a cancelled event', () => {
  const { rerender } = render(
    <EventInfo {...props} title="My Event" status="Confirmed" />,
  );
  expect(screen.getByText('My Event')).not.toHaveStyle(
    'text-decoration: line-through',
  );

  rerender(<EventInfo {...props} title="My Event" status="Cancelled" />);
  expect(screen.getByText('My Event')).toHaveStyle(
    'text-decoration: line-through',
  );
});

it('shows the event time', () => {
  render(
    <EventInfo
      {...props}
      startDate="2021-01-01T08:00:00Z"
      startDateTimeZone="Europe/Tallinn"
    />,
  );
  expect(screen.getByText(/8:00/)).toBeVisible();
});

it('only links to events that are not cancelled', () => {
  const { rerender } = render(
    <EventInfo {...props} title="My Event" status="Tentative" />,
  );
  expect(screen.getByText(/My Event/).closest('a')).toHaveAttribute('href');

  rerender(<EventInfo {...props} title="My Event" status="Cancelled" />);
  expect(screen.getByText(/My Event/).closest('a')).toBeNull();
});

it('does not link the title when titleAsLink is false', () => {
  render(
    <EventInfo
      {...props}
      title="My Event"
      status="Tentative"
      titleAsLink={false}
    />,
  );
  expect(screen.getByText(/My Event/).closest('a')).toBeNull();
});

it('displays the tags', () => {
  render(<EventInfo {...props} tags={['one tag']} />);

  expect(screen.getByText(/one tag/i)).toBeInTheDocument();
});

it('renders all tags with the overflow element hidden by css beyond the limit', () => {
  render(
    <EventInfo
      {...props}
      tags={['Tag 1', 'Tag 2', 'Tag 3', 'Tag 4', 'Tag 5']}
    />,
  );

  ['Tag 1', 'Tag 2', 'Tag 3', 'Tag 4', 'Tag 5'].forEach((tag) => {
    expect(screen.getByText(tag)).toBeInTheDocument();
  });
});
