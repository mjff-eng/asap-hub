import { SubscribeToCalendarsPage } from '@asap-hub/gp2-components';
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
    <SubscribeToCalendarsPage
      hubCalendar={items.find(({ gp2Calendar }) => gp2Calendar)}
      workingGroupCalendars={workingGroupCalendars}
    />
  );
};

export default Calendars;
