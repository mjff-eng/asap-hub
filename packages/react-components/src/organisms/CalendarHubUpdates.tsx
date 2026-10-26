import { css } from '@emotion/react';
import { BasicCalendarResponse } from '@asap-hub/model';
import { FC } from 'react';

import { Card, Headline3, Paragraph } from '../atoms';
import { CalendarLink } from '../molecules';
import { mobileScreen, rem } from '../pixels';

const cardStyles = css({
  borderWidth: 0,
});

const containerStyles = css({
  display: 'grid',
  gridRowGap: rem(16),
  padding: rem(24),
});

const rowStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(24),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
});

const description =
  'Subscribe to the official CRN calendar for community-wide sessions run by the ASAP team.';

interface CalendarHubUpdatesProps {
  calendar?: BasicCalendarResponse;
}
const CalendarHubUpdates: FC<CalendarHubUpdatesProps> = ({ calendar }) => {
  if (!calendar) {
    return null;
  }

  return (
    <Card padding={false} accent="highlight" overrideStyles={cardStyles}>
      <div css={containerStyles}>
        <Headline3 noMargin>CRN Hub Updates</Headline3>
        <div css={rowStyles}>
          <Paragraph accent="secondary" noMargin>
            {description}
          </Paragraph>
          <CalendarLink id={calendar.id} primary noMargin />
        </div>
      </div>
    </Card>
  );
};

export default CalendarHubUpdates;
