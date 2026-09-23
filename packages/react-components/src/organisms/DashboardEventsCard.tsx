import { ComponentProps, useState } from 'react';
import { css } from '@emotion/react';

import { TabbedCard } from '../molecules';
import { Button, Link } from '../atoms';
import { calendarIcon } from '../icons';
import { lead, steel } from '../colors';
import { rem } from '../pixels';
import DashboardEventCard from './DashboardEventCard';

const viewAllStyles = css({
  marginTop: rem(24),
  textAlign: 'right',
});

const emptyStateStyles = css({
  display: 'flex',
  flexDirection: 'row',
  color: lead.rgb,
  gap: rem(15),
});

const eventListStyles = css({
  paddingTop: rem(32),
});

const eventRowStyles = css({
  paddingBottom: rem(24),
  marginBottom: rem(24),
  borderBottom: `1px solid ${steel.rgb}`,
  ':last-child': {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottom: 'none',
  },
});

type DashboardEventCardItem = Omit<
  ComponentProps<typeof DashboardEventCard>,
  'variant'
>;

type DashboardEventsCardProps = {
  title: string;
  description: string;
  upcomingEvents: DashboardEventCardItem[];
  pastEvents: DashboardEventCardItem[];
  upcomingViewAllHref: string;
  pastViewAllHref: string;
};

const DashboardEventsCard: React.FC<DashboardEventsCardProps> = ({
  title,
  description,
  upcomingEvents,
  pastEvents,
  upcomingViewAllHref,
  pastViewAllHref,
}) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const variant = activeTabIndex === 0 ? 'upcoming' : 'past';
  const activeEvents = activeTabIndex === 0 ? upcomingEvents : pastEvents;
  const viewAllHref =
    activeTabIndex === 0 ? upcomingViewAllHref : pastViewAllHref;

  return (
    <div>
      <TabbedCard
        title={title}
        description={description}
        activeTabIndex={activeTabIndex}
        onTabChange={setActiveTabIndex}
        tabs={[
          {
            tabTitle: 'Upcoming',
            items: upcomingEvents,
            empty: (
              <div css={emptyStateStyles}>
                {calendarIcon}
                <span>
                  No upcoming events. Check{' '}
                  <Button linkStyle onClick={() => setActiveTabIndex(1)}>
                    past events
                  </Button>{' '}
                  for what&apos;s already happened.
                </span>
              </div>
            ),
          },
          {
            tabTitle: 'Past',
            items: pastEvents,
            empty: (
              <div css={emptyStateStyles}>
                {calendarIcon}
                <span>No past events.</span>
              </div>
            ),
          },
        ]}
      >
        {({ data }) => (
          <div css={eventListStyles}>
            {data.map((event) => (
              <div css={eventRowStyles} key={event.id}>
                <DashboardEventCard {...event} variant={variant} />
              </div>
            ))}
          </div>
        )}
      </TabbedCard>
      {activeEvents.length > 0 && (
        <p css={viewAllStyles}>
          <Link href={viewAllHref}>View All →</Link>
        </p>
      )}
    </div>
  );
};

export default DashboardEventsCard;
