import { ComponentProps } from 'react';
import { addDays, addHours, subHours } from 'date-fns';
import { createEventResponse } from '@asap-hub/fixtures';
import { DashboardEventsCard } from '@asap-hub/react-components';

export default {
  title: 'Organisms / Dashboard / Events',
};

type EventItem = ComponentProps<
  typeof DashboardEventsCard
>['upcomingEvents'][number];

const baseEvent = createEventResponse();

const toEventItem = (
  overrides: Partial<EventItem> = {},
  ownerLabel = 'Working Group Name',
): EventItem => ({
  ...baseEvent,
  eventOwner: <div>{ownerLabel}</div>,
  ...overrides,
});

const liveVirtualEvent = toEventItem({
  id: 'live-virtual',
  title: 'Live virtual event',
  startDate: new Date().toISOString(),
  endDate: addHours(new Date(), 1).toISOString(),
  meetingLink: 'https://example.com/meeting',
});

const liveInPersonEvent = toEventItem({
  id: 'live-in-person',
  title: 'Live in-person event',
  startDate: new Date().toISOString(),
  endDate: addHours(new Date(), 1).toISOString(),
  meetingLink: undefined,
});

const futureVirtualEvent = toEventItem({
  id: 'future-virtual',
  title: 'Future virtual event',
  startDate: addDays(new Date(), 1).toISOString(),
  endDate: addHours(addDays(new Date(), 1), 1).toISOString(),
  meetingLink: 'https://example.com/meeting',
});

const pastInPersonEvent = toEventItem({
  id: 'past-in-person',
  title: 'Past in-person event',
  startDate: subHours(new Date(), 3).toISOString(),
  endDate: subHours(new Date(), 2).toISOString(),
  meetingLink: undefined,
  notes: 'Meeting notes',
  videoRecording: 'Video recording',
  presentation: 'Presentation',
});

const pastEventWithMaterials = toEventItem(
  {
    id: 'past-with-materials',
    title: 'Past event with materials',
    startDate: subHours(new Date(), 3).toISOString(),
    endDate: subHours(new Date(), 2).toISOString(),
    notes: 'Meeting notes',
    videoRecording: 'Video recording',
    presentation: 'Presentation',
  },
  'Interest Group Name',
);

const pastEventWithoutMaterials = toEventItem(
  {
    id: 'past-without-materials',
    title: 'Past event without materials',
    startDate: subHours(new Date(), 3).toISOString(),
    endDate: subHours(new Date(), 2).toISOString(),
    notes: null,
    videoRecording: null,
    presentation: null,
  },
  'Interest Group Name',
);

export const Default = () => (
  <DashboardEventsCard
    title="Events"
    description="Explore upcoming and previous events and learn about what was discussed."
    upcomingEvents={[liveVirtualEvent, liveInPersonEvent, futureVirtualEvent]}
    pastEvents={[
      pastInPersonEvent,
      pastEventWithMaterials,
      pastEventWithoutMaterials,
    ]}
    upcomingViewAllHref="/events/upcoming"
    pastViewAllHref="/events/past"
  />
);

export const EmptyUpcoming = () => (
  <DashboardEventsCard
    title="Events"
    description="Explore upcoming and previous events and learn about what was discussed."
    upcomingEvents={[]}
    pastEvents={[pastEventWithMaterials]}
    upcomingViewAllHref="/events/upcoming"
    pastViewAllHref="/events/past"
  />
);

export const EmptyPast = () => (
  <DashboardEventsCard
    title="Events"
    description="Explore upcoming and previous events and learn about what was discussed."
    upcomingEvents={[liveVirtualEvent]}
    pastEvents={[]}
    upcomingViewAllHref="/events/upcoming"
    pastViewAllHref="/events/past"
  />
);
