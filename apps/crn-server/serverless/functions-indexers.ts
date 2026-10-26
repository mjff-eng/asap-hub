import { WebhookDetailType } from '@asap-hub/model';
import { AWS } from '@serverless/typescript';
import {
  algoliaIndex,
  contentfulEventBridge,
  envAlias,
  opensearchMasterPassword,
  opensearchMasterUser,
  sentryDsnHandlers,
} from './shared';

const algoliaIndexEnvironment = {
  ALGOLIA_API_KEY: `\${ssm:crn-algolia-index-api-key-${envAlias}}`,
  ALGOLIA_INDEX: `${algoliaIndex}`,
  SENTRY_DSN: sentryDsnHandlers,
};

// `name` is only passed when the generated name would exceed Lambda's
// 64-character limit on the production stage.
const algoliaIndexer = (
  handler: string,
  detailTypes: WebhookDetailType[],
  name?: string,
) => ({
  handler,
  events: contentfulEventBridge(detailTypes),
  environment: algoliaIndexEnvironment,
  ...(name ? { name: `\${self:service}-\${self:provider.stage}-${name}` } : {}),
});

const opensearchIndexerEnvironment = {
  SENTRY_DSN: sentryDsnHandlers,
  OPENSEARCH_USERNAME: opensearchMasterUser,
  OPENSEARCH_PASSWORD: opensearchMasterPassword,
};

export const indexerFunctions: AWS['functions'] = {
  algoliaIndexResearchOutput: algoliaIndexer(
    './src/handlers/research-output/algolia-index-research-output-handler.handler',
    ['ResearchOutputsPublished', 'ResearchOutputsUnpublished'],
  ),
  algoliaIndexUser: algoliaIndexer(
    './src/handlers/user/algolia-index-user-handler.handler',
    [
      'UsersPublished',
      'UsersUnpublished',
      'TeamMembershipPublished',
      'TeamMembershipUnpublished',
    ],
  ),
  algoliaIndexExternalAuthor: algoliaIndexer(
    './src/handlers/external-author/algolia-index-external-author-handler.handler',
    ['ExternalAuthorsPublished', 'ExternalAuthorsUnpublished'],
  ),
  algoliaIndexEvents: algoliaIndexer(
    './src/handlers/event/algolia-index-event-handler.handler',
    ['EventsPublished', 'EventsUnpublished'],
  ),
  algoliaIndexUserEvents: algoliaIndexer(
    './src/handlers/event/algolia-index-user-events-handler.handler',
    ['UsersPublished', 'UsersUnpublished'],
  ),
  algoliaIndexExternalUserEvents: algoliaIndexer(
    './src/handlers/event/algolia-index-external-author-events-handler.handler',
    ['ExternalAuthorsPublished', 'ExternalAuthorsUnpublished'],
  ),
  algoliaIndexTeamEvents: algoliaIndexer(
    './src/handlers/event/algolia-index-team-events-handler.handler',
    ['TeamsPublished', 'TeamsUnpublished'],
  ),
  algoliaIndexGroupEvents: algoliaIndexer(
    './src/handlers/event/algolia-index-group-events-handler.handler',
    ['InterestGroupsPublished', 'InterestGroupsUnpublished'],
  ),
  algoliaIndexLabUsers: algoliaIndexer(
    './src/handlers/lab/algolia-index-lab-users-handler.handler',
    ['LabsPublished', 'LabsUnpublished'],
  ),
  algoliaIndexTeams: algoliaIndexer(
    './src/handlers/teams/algolia-index-team-handler.handler',
    ['TeamsPublished', 'TeamsUnpublished'],
  ),
  algoliaIndexTeamResearchOutputs: algoliaIndexer(
    './src/handlers/teams/algolia-index-team-research-outputs-handler.handler',
    ['TeamsPublished', 'TeamsUnpublished'],
  ),
  algoliaIndexTeamUsers: algoliaIndexer(
    './src/handlers/teams/algolia-index-team-users-handler.handler',
    ['TeamsPublished', 'TeamsUnpublished'],
  ),
  algoliaIndexProjectTeam: algoliaIndexer(
    './src/handlers/project/algolia-index-project-team-handler.handler',
    ['ProjectsPublished', 'ProjectsUnpublished'],
  ),
  algoliaIndexNews: algoliaIndexer(
    './src/handlers/news/algolia-index-news-handler.handler',
    ['NewsPublished', 'NewsUnpublished'],
  ),
  algoliaIndexProjects: algoliaIndexer(
    './src/handlers/project/algolia-index-project-handler.handler',
    ['ProjectsPublished', 'ProjectsUnpublished'],
  ),
  algoliaIndexTeamProjects: algoliaIndexer(
    './src/handlers/project/algolia-index-team-projects-handler.handler',
    ['TeamsPublished', 'TeamsUnpublished'],
  ),
  algoliaIndexUserProjects: algoliaIndexer(
    './src/handlers/project/algolia-index-user-projects-handler.handler',
    ['UsersPublished', 'UsersUnpublished'],
  ),
  algoliaIndexProjectMembership: algoliaIndexer(
    './src/handlers/project/algolia-index-project-membership-handler.handler',
    ['ProjectMembershipPublished', 'ProjectMembershipUnpublished'],
  ),
  algoliaIndexTutorials: algoliaIndexer(
    './src/handlers/tutorials/algolia-index-tutorials-handler.handler',
    ['TutorialsPublished', 'TutorialsUnpublished'],
  ),
  algoliaIndexWorkingGroups: algoliaIndexer(
    './src/handlers/working-group/algolia-index-working-group-handler.handler',
    ['WorkingGroupsPublished', 'WorkingGroupsUnpublished'],
  ),
  algoliaIndexInterestGroups: algoliaIndexer(
    './src/handlers/interest-group/algolia-index-interest-group-handler.handler',
    ['InterestGroupsPublished', 'InterestGroupsUnpublished'],
  ),
  algoliaIndexInterestGroupTeams: algoliaIndexer(
    './src/handlers/interest-group/algolia-index-interest-group-teams-handler.handler',
    ['InterestGroupsTeamsPublished', 'TeamsPublished', 'TeamsUnpublished'],
  ),
  algoliaIndexManuscripts: algoliaIndexer(
    './src/handlers/manuscript/algolia-index-manuscript-handler.handler',
    ['ManuscriptsPublished', 'ManuscriptsUnpublished'],
  ),
  algoliaIndexManuscriptVersions: algoliaIndexer(
    './src/handlers/manuscript-version/algolia-index-manuscript-versions-handler.handler',
    ['ManuscriptVersionsPublished', 'ManuscriptVersionsUnpublished'],
  ),
  algoliaIndexManuscriptVersionsManuscripts: algoliaIndexer(
    './src/handlers/manuscript/algolia-index-manuscript-versions-manuscripts-handler.handler',
    ['ManuscriptsPublished', 'ManuscriptsUnpublished'],
    'algoliaIndexManuscriptVersionsMs',
  ),
  opensearchIndexAims: {
    handler: './src/handlers/aim/opensearch-index-aim-handler.handler',
    timeout: 120,
    memorySize: 512,
    events: contentfulEventBridge([
      'AimsPublished',
      'AimsUnpublished',
      'ProjectsPublished',
      'ProjectsUnpublished',
      'SupplementGrantPublished',
      'SupplementGrantUnpublished',
    ]),
    environment: opensearchIndexerEnvironment,
  },
  opensearchIndexMilestones: {
    handler:
      './src/handlers/milestone/opensearch-index-milestone-handler.handler',
    timeout: 120,
    memorySize: 512,
    events: contentfulEventBridge([
      'MilestonesPublished',
      'MilestonesUnpublished',
    ]),
    environment: opensearchIndexerEnvironment,
  },
};
