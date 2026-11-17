import { BasicCalendarResponse } from '@asap-hub/model';
import {
  CalendarHubUpdates,
  CalendarList,
  EventSupport,
  mail,
  pixels,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';

import { workingGroupIcon } from '../icons';

const { rem } = pixels;

const containerStyles = css({
  display: 'grid',
  gridRowGap: rem(32),
});

type SubscribeToCalendarsPageProps = {
  hubCalendar?: BasicCalendarResponse;
  workingGroupCalendars: ReadonlyArray<
    BasicCalendarResponse & { href?: string }
  >;
};

const SubscribeToCalendarsPage: React.FC<SubscribeToCalendarsPageProps> = ({
  hubCalendar,
  workingGroupCalendars,
}) => (
  <div css={containerStyles}>
    <CalendarHubUpdates
      calendar={hubCalendar}
      title="GP2 Hub Updates"
      description="Subscribe to the official GP2 calendar for community-wide sessions run by the GP2 team."
    />
    <CalendarList
      title="Working Groups"
      emptyMessage="No Working Groups are scheduled to present yet. Once one is, you can subscribe to it here."
      description="Below you can find a list of all the Working Groups that will present in the future. Hitting subscribe will allow you to add them to your own personal calendar."
      calendars={workingGroupCalendars}
      icon={workingGroupIcon}
      hideCalendarColour
      hideSupportText
    />
    <EventSupport email={mail.INVITE_SUPPORT_EMAIL} />
  </div>
);

export default SubscribeToCalendarsPage;
