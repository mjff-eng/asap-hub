import { workingGroupIcon } from '@asap-hub/gp2-components';
import {
  CalendarHubUpdates,
  CalendarList,
  EventSupport,
  mail,
} from '@asap-hub/react-components';
import { gp2 } from '@asap-hub/routing';

import { useCalendars } from './state';

const Calendars: React.FC<Record<string, never>> = () => {
  const { items } = useCalendars();

  const workingGroupCalendars = items.flatMap((calendar) => {
    const [workingGroup] = calendar.workingGroups;
    return workingGroup
      ? [
          {
            ...calendar,
            href: gp2
              .workingGroups({})
              .workingGroup({ workingGroupId: workingGroup.id })
              .upcoming({}).$,
          },
        ]
      : [];
  });

  return (
    <>
      <CalendarHubUpdates
        calendar={items.find(({ gp2Calendar }) => gp2Calendar)}
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
    </>
  );
};

export default Calendars;
