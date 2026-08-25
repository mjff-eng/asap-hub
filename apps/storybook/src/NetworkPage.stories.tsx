import { StaticRouter } from 'react-router';
import { NetworkPage, Paragraph } from '@asap-hub/react-components';
import { network } from '@asap-hub/routing';

import { text, select, boolean } from './knobs';
import { LayoutDecorator } from './layout';

export default {
  title: 'Templates / Network / Page',
  decorators: [LayoutDecorator],
};

export const Normal = () => {
  const activeTab = select(
    'Active Tab',
    {
      Members: 'users',
      'Resource Teams': 'resource-teams',
      'Discovery Teams': 'discovery-teams',
      'Interest Groups': 'interest-groups',
      'Working Groups': 'working-groups',
    },
    'users',
  );
  const showDescription = boolean('Show Page Description', false);
  const routes = {
    users: network({}).users({}).$,
    'discovery-teams': network({}).discoveryTeams({}).$,
    'resource-teams': network({}).resourceTeams({}).$,
    'interest-groups': network({}).interestGroups({}).$,
    'working-groups': network({}).workingGroups({}).$,
  };
  return (
    <StaticRouter key={activeTab} location={routes[activeTab]}>
      <NetworkPage
        page={activeTab}
        searchQuery={text('Search Query', '')}
        pageDescription={
          showDescription ? (
            <Paragraph accent="neutral900">
              This is a custom page description that provides additional context
              about the current network section.
            </Paragraph>
          ) : undefined
        }
      >
        Page Content
      </NetworkPage>
    </StaticRouter>
  );
};

export const WithPageDescription = () => {
  const activeTab = select(
    'Active Tab',
    {
      Members: 'users',
      'Resource Teams': 'resource-teams',
      'Discovery Teams': 'discovery-teams',
      'Interest Groups': 'interest-groups',
      'Working Groups': 'working-groups',
    },
    'discovery-teams',
  );
  const routes = {
    users: network({}).users({}).$,
    'discovery-teams': network({}).discoveryTeams({}).$,
    'resource-teams': network({}).resourceTeams({}).$,
    'interest-groups': network({}).interestGroups({}).$,
    'working-groups': network({}).workingGroups({}).$,
  };
  return (
    <StaticRouter key={activeTab} location={routes[activeTab]}>
      <NetworkPage
        page={activeTab}
        searchQuery={text('Search Query', '')}
        pageDescription={
          <Paragraph accent="neutral900">
            {activeTab === 'discovery-teams' &&
              `Discovery Teams conduct collaborative research to advance our understanding of Parkinson's disease.`}
            {activeTab === 'resource-teams' &&
              'Resource Teams provide specialized expertise and support to the ASAP network.'}
            {activeTab === 'users' &&
              'Connect with researchers, clinicians, and collaborators across the ASAP network.'}
            {activeTab === 'interest-groups' &&
              'Join interest groups to discuss specific topics and share knowledge with peers.'}
            {activeTab === 'working-groups' &&
              'Working groups focus on specific initiatives and deliverables within ASAP.'}
          </Paragraph>
        }
      >
        Page Content
      </NetworkPage>
    </StaticRouter>
  );
};
