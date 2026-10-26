import { css } from '@emotion/react';
import { BasicCalendarResponse } from '@asap-hub/model';

import { InterestGroupsIcon, WorkingGroupsIcon } from '../icons';
import { CalendarHubUpdates, CalendarList, EventSupport } from '../organisms';
import { rem } from '../pixels';

const containerStyles = css({
  display: 'grid',
  gridRowGap: rem(32),
});

type CalendarWithLink = BasicCalendarResponse & { href?: string };

type SubscribeToCalendarsPageProps = {
  hubCalendar?: BasicCalendarResponse;
  interestGroupCalendars: ReadonlyArray<CalendarWithLink>;
  workingGroupCalendars: ReadonlyArray<CalendarWithLink>;
  seminarSeriesCalendars: ReadonlyArray<BasicCalendarResponse>;
};

const SubscribeToCalendarsPage: React.FC<SubscribeToCalendarsPageProps> = ({
  hubCalendar,
  interestGroupCalendars,
  workingGroupCalendars,
  seminarSeriesCalendars,
}) => (
  <div css={containerStyles}>
    <CalendarHubUpdates calendar={hubCalendar} />
    <CalendarList
      title="Interest Groups"
      emptyMessage="No Interest Groups are scheduled to present yet. Once one is, you can subscribe to it here."
      description="Below you can find a list of all the Interest Groups that will present in the future. Hitting subscribe will allow you to add them to your own personal calendar."
      calendars={interestGroupCalendars}
      icon={<InterestGroupsIcon />}
      hideCalendarColour
      hideSupportText
    />
    <CalendarList
      title="Working Groups"
      emptyMessage="No Working Groups are scheduled to present yet. Once one is, you can subscribe to it here."
      description="Below you can find a list of all the Working Groups that will present in the future. Hitting subscribe will allow you to add them to your own personal calendar."
      calendars={workingGroupCalendars}
      icon={<WorkingGroupsIcon />}
      hideCalendarColour
      hideSupportText
    />
    <CalendarList
      title="Seminar Series"
      emptyMessage="No Seminar Series are scheduled yet. Once one is, you can subscribe to it here."
      description="Below you can find a list of all the Seminar Series that will present in the future. These are public, so anyone can attend. Hitting subscribe will allow you to add them to your own personal calendar."
      calendars={seminarSeriesCalendars}
      hideCalendarColour
      hideSupportText
    />
    <EventSupport />
  </div>
);

export default SubscribeToCalendarsPage;
