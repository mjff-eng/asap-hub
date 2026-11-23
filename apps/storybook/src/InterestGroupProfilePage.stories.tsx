import { InterestGroupProfilePage } from '@asap-hub/react-components';
import { StaticRouter } from 'react-router';
import { network } from '@asap-hub/routing';

import { array, boolean, select, text } from './knobs';
import { LayoutDecorator } from './layout';

export default {
  title: 'Templates / Interest Group Profile / Page',
  component: InterestGroupProfilePage,
  decorators: [LayoutDecorator],
};

export const Normal = () => {
  const route = network({})
    .interestGroups({})
    .interestGroup({ interestGroupId: '42' });
  const activeTab = select(
    'Active Tab',
    {
      About: 'about',
      Upcoming: 'upcoming',
      Past: 'past',
    },
    'about',
  );
  const routes = {
    about: route.about({}).$,
    upcoming: route.upcoming({}).$,
    past: route.past({}).$,
  };
  return (
    <StaticRouter key={activeTab} location={routes[activeTab as 'about']}>
      <InterestGroupProfilePage
        id="42"
        name="My Group"
        active={boolean('Group Active', true)}
        numberOfTeams={5}
        groupTeamsHref="#"
        lastModifiedDate="2021-01-01"
        searchQuery={
          activeTab === 'upcoming' || activeTab === 'past'
            ? text('Search Query', '')
            : undefined
        }
        pastEventsCount={2}
        upcomingEventsCount={3}
        tools={{
          googleCalendar:
            'https://calendar.google.com/calendar/r?cid=calendar-id-1',
        }}
        contactEmails={array('Emails', [
          'contact@example.com',
          'another@example.com',
        ])}
      />
    </StaticRouter>
  );
};
