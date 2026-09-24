import { css } from '@emotion/react';
import { EventResponse } from '@asap-hub/model';
import { events as eventsRoute } from '@asap-hub/routing';

import { Card, Link, MaterialAvailability } from '../atoms';
import { neutral900, colour } from '../colors';
import { rem, tabletScreen } from '../pixels';
import { formatDateToTimezone } from '../date';

const container = css({
  display: 'grid',
  color: neutral900.rgb,
});

const gridTitleStyles = css({
  display: 'none',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'inherit',
    borderBottom: 0,
    marginBottom: 0,
    paddingBottom: rem(15),
  },
});

const rowTitleStyles = css({
  paddingTop: rem(33),
  paddingBottom: rem(15),
  ':first-of-type': { paddingTop: 0 },
  [`@media (min-width: ${tabletScreen.min}px)`]: { display: 'none' },
});

const rowStyles = css({
  display: 'grid',
  borderBottom: `1px solid ${colour.border.tertiary}`,
  paddingBottom: rem(21),
  marginBottom: rem(21),
  ':last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: 0,
  },
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '3fr 2fr 2fr',
    columnGap: rem(15),
  },
});

const titleStyles = css({
  fontWeight: 'bold',
  color: colour.foreground.primary,
});

type PastEventsDashboardCardProps = {
  events: Pick<
    EventResponse,
    'id' | 'title' | 'startDate' | 'notes' | 'presentation' | 'videoRecording'
  >[];
};
const PastEventsDashboardCard: React.FC<PastEventsDashboardCardProps> = ({
  events,
}) => (
  <Card>
    <div css={container}>
      <div css={[rowStyles, gridTitleStyles]}>
        <span css={titleStyles}>Event</span>
        <span css={titleStyles}>Meeting Materials</span>
        <span css={titleStyles}>Event Date</span>
      </div>
      {events.map(
        ({ id, title, startDate, notes, presentation, videoRecording }) => (
          <div key={id} css={[rowStyles]}>
            <span css={[titleStyles, rowTitleStyles]}>Event</span>
            <Link ellipsed href={eventsRoute({}).event({ eventId: id }).$}>
              {title}
            </Link>
            <span css={[titleStyles, rowTitleStyles]}>Meeting Materials</span>
            <div>
              <MaterialAvailability
                meetingMaterial={notes}
                meetingMaterialType="notes"
              />
              <MaterialAvailability
                meetingMaterial={presentation}
                meetingMaterialType="presentation"
              />
              <MaterialAvailability
                meetingMaterial={videoRecording}
                meetingMaterialType="videoRecording"
              />
            </div>
            <span css={[titleStyles, rowTitleStyles]}>Date</span>
            <span>
              {formatDateToTimezone(startDate, 'E, d MMM y').toUpperCase()}
            </span>
          </div>
        ),
      )}
    </div>
  </Card>
);

export default PastEventsDashboardCard;
