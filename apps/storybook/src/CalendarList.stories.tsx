import { CalendarList, InterestGroupsIcon } from '@asap-hub/react-components';

import { text } from './knobs';
import { googleLegacyCalendarColor } from './colors';

export default {
  title: 'Organisms / Calendar List',
};

export const Normal = () => (
  <CalendarList
    title={text('Title', 'Subscribe to Interest Groups on Calendar')}
    description={text(
      'Description',
      'By hitting the subscribe button below, you will be able to add the calendar to your personal calendar.',
    )}
    calendars={[
      {
        color: googleLegacyCalendarColor('Calendar 1 Color'),
        id: '123',
        name: text('Calendar 1 Name', 'ASAP Calendar'),
      },
      {
        color: googleLegacyCalendarColor('Calendar 2 Color'),
        id: '234',
        name: text('Calendar 2 Name', 'Sci 1 - GWAS Functional', '2'),
      },
      {
        color: googleLegacyCalendarColor('Calendar 3 Color'),
        id: '456',
        name: text('Calendar 3 Name', 'Sci 2 - Aging and Progression', '3'),
      },
    ]}
  />
);

export const WithIcon = () => (
  <CalendarList
    title={text('Title', 'Interest Groups')}
    description={text(
      'Description',
      'Below you can find a list of all the Interest Groups that will present in the future. Hitting subscribe will allow you to add them to your own personal calendar.',
    )}
    icon={<InterestGroupsIcon />}
    hideCalendarColour
    hideSupportText
    calendars={[
      { color: '#B1365F', id: '123', name: 'LRRK2 Central Webinar' },
      { color: '#5C1158', id: '234', name: 'Mito911 Webinar Series' },
    ]}
  />
);

export const WithoutColour = () => (
  <CalendarList
    title={text('Title', 'Seminar Series')}
    description={text(
      'Description',
      'Below you can find a list of all the Seminar Series that will present in the future. These are public, so anyone can attend. Hitting subscribe will allow you to add them to your own personal calendar.',
    )}
    hideCalendarColour
    hideSupportText
    calendars={[
      {
        color: '#B1365F',
        id: '123',
        name: 'Seminar Series: Genetics and Ancestry',
      },
      {
        color: '#5C1158',
        id: '234',
        name: 'Seminar Series: Data Sharing in Practice',
      },
    ]}
  />
);
