import { css } from '@emotion/react';
import React, { ComponentProps, Fragment } from 'react';
import { Card } from '../atoms';
import { neutral900 } from '../colors';
import { rem } from '../pixels';
import EventCard from './EventCard';
import { calendarIcon } from '../icons';

type DashboardUpcomingEventsProps = {
  upcomingEvents?: ComponentProps<typeof EventCard>[];
};

const upcomingEventsWrapper = css({
  display: 'flex',
  flexFlow: 'column',
  gap: rem(24),
});

const noUpcomingEvents = css({
  display: 'flex',
  flexFlow: 'row',
  color: neutral900.rgb,
  gap: rem(15),
});

const DashboardUpcomingEvents: React.FC<DashboardUpcomingEventsProps> = ({
  upcomingEvents,
}) => (
  <>
    {upcomingEvents && upcomingEvents.length ? (
      <div css={upcomingEventsWrapper}>
        {upcomingEvents.map(({ eventSpeakers, eventTeams, ...event }) => (
          <Fragment key={event.id}>
            <EventCard {...event} displayToast={false} />
          </Fragment>
        ))}
      </div>
    ) : (
      <Card>
        <div css={noUpcomingEvents}>
          {calendarIcon}
          <span>There are no upcoming events.</span>
        </div>
      </Card>
    )}
  </>
);
export default DashboardUpcomingEvents;
