import { css } from '@emotion/react';
import { ReactNode } from 'react';

import { Card, Headline3, Link, Paragraph } from '../atoms';
import { CalendarLink } from '../molecules';
import { mobileScreen, rem } from '../pixels';

const containerStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

const descriptionStyles = css({
  marginTop: rem(16),
  marginBottom: rem(24),
});

const rowStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(16),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
});

const ownerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(12),
  minWidth: 0,
});

const iconStyles = css({
  display: 'inline-flex',
  flexShrink: 0,
  width: rem(20),
  height: rem(20),
  '& svg': {
    width: '100%',
    height: '100%',
  },
});

export type CalendarOwner = {
  readonly name: string;
  readonly href?: string;
  readonly icon: ReactNode;
};

type EventCalendarCardProps = {
  readonly calendarId: string;
  readonly owner: CalendarOwner;
};

const EventCalendarCard: React.FC<EventCalendarCardProps> = ({
  calendarId,
  owner: { name, href, icon },
}) => (
  <Card padding={false}>
    <div css={containerStyles}>
      <Headline3 styleAsHeading={5} noMargin>
        Subscribe to this group’s calendar
      </Headline3>
      <div css={descriptionStyles}>
        <Paragraph accent="tertiary" noMargin>
          This event comes from the calendar of the group below. Subscribe to
          add all its events to your own calendar app, where new events and
          changes will appear automatically.
        </Paragraph>
      </div>
      <div css={rowStyles}>
        <div css={ownerStyles}>
          <span css={iconStyles}>{icon}</span>
          {href ? (
            <Link href={href}>{name}</Link>
          ) : (
            <Paragraph accent="primary" noMargin>
              {name}
            </Paragraph>
          )}
        </div>
        <CalendarLink id={calendarId} noMargin />
      </div>
    </div>
  </Card>
);

export default EventCalendarCard;
