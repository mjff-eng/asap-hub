import { getEventListOptions } from '@asap-hub/frontend-utils';
import { DashboardEventsCard, eventMapper } from '@asap-hub/react-components';
import { events as eventsRoute } from '@asap-hub/routing';
import { FC } from 'react';

import { useEvents } from '../../events/state';

type EventsSectionProps = {
  date: Date;
};

const EventsSection: FC<EventsSectionProps> = ({ date }) => {
  const { items: upcomingItems } = useEvents(
    getEventListOptions(date, {
      past: false,
      pageSize: 3,
    }),
  );
  const { items: pastItems } = useEvents(
    getEventListOptions(date, {
      past: true,
      pageSize: 3,
      currentPage: 0,
      constraint: { notStatus: 'Cancelled' },
    }),
  );

  return (
    <DashboardEventsCard
      title="Events"
      description="Explore upcoming and previous events and learn about what was discussed."
      upcomingEvents={upcomingItems.map(eventMapper)}
      pastEvents={pastItems.map(eventMapper)}
      upcomingViewAllHref={eventsRoute({}).upcoming({}).$}
      pastViewAllHref={eventsRoute({}).past({}).$}
    />
  );
};

export default EventsSection;
