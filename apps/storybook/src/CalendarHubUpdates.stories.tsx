import { CalendarHubUpdates } from '@asap-hub/react-components';

import { text } from './knobs';

export default {
  title: 'Organisms / Calendar Hub Updates',
  component: CalendarHubUpdates,
};

export const Normal = () => (
  <CalendarHubUpdates
    calendar={{
      color: '#B1365F',
      id: 'hub@asap.science',
      name: text('Calendar Name', 'ASAP Hub'),
    }}
  />
);
