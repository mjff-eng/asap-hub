import { SubscribeToCalendarsPage } from '@asap-hub/react-components';
import { getEventListOptions } from '@asap-hub/frontend-utils';
import { network } from '@asap-hub/routing';

import { useCalendars } from './state';
import { usePrefetchEvents } from '../state';

interface CalendarsProps {
  currentTime: Date;
}
const Calendars: React.FC<CalendarsProps> = ({ currentTime }) => {
  const { items } = useCalendars();

  usePrefetchEvents(getEventListOptions(currentTime, { past: true }));
  usePrefetchEvents(getEventListOptions(currentTime, { past: false }));

  const interestGroupCalendars = items.flatMap((calendar) => {
    const interestGroup = calendar.interestGroups.find(({ active }) => active);
    return interestGroup
      ? [
          {
            ...calendar,
            href: network({})
              .interestGroups({})
              .interestGroup({ interestGroupId: interestGroup.id })
              .upcoming({}).$,
          },
        ]
      : [];
  });
  const workingGroupCalendars = items.flatMap((calendar) => {
    const workingGroup = calendar.workingGroups.find(
      ({ complete }) => !complete,
    );
    return workingGroup
      ? [
          {
            ...calendar,
            href: network({})
              .workingGroups({})
              .workingGroup({ workingGroupId: workingGroup.id })
              .upcoming({}).$,
          },
        ]
      : [];
  });

  return (
    <SubscribeToCalendarsPage
      hubCalendar={items.find(({ crnCalendar }) => crnCalendar)}
      interestGroupCalendars={interestGroupCalendars}
      workingGroupCalendars={workingGroupCalendars}
      seminarSeriesCalendars={items.filter(
        ({ seminarSeries }) => seminarSeries,
      )}
    />
  );
};

export default Calendars;
