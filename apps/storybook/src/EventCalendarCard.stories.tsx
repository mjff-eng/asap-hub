import {
  EventCalendarCard,
  InterestGroupsIcon,
} from '@asap-hub/react-components';

import { text } from './knobs';

export default {
  title: 'Organisms / Events / Event Calendar Card',
};

export const Normal = () => (
  <EventCalendarCard
    calendarId="calendar-id"
    owner={{
      name: text('Owner name', 'Interest Group Name'),
      href: '#',
      icon: <InterestGroupsIcon />,
    }}
  />
);

export const WithoutLink = () => (
  <EventCalendarCard
    calendarId="calendar-id"
    owner={{
      name: text('Owner name', 'Calendar Name'),
      icon: <InterestGroupsIcon />,
    }}
  />
);
