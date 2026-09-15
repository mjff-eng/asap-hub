import {
  ContentfulWebhookPayload,
  ContentfulWebhookPublishPayload,
  ContentfulWebhookUnpublishPayload,
  FetchTeamsQuery as ContentfulFetchTeamsQuery,
  FetchTeamByIdQuery,
  FetchPublicTeamsQuery,
  FetchPublicTeamByIdQuery,
  FetchTeamProjectByIdQuery,
  FetchTeamAwardMetricsQuery,
} from '@asap-hub/contentful';
import {
  ListPublicTeamResponse,
  ListTeamAwardMetricsDataObject,
  ListTeamAwardMetricsResponse,
  ListTeamResponse,
  PublicTeamListItemDataObject,
  PublicTeamResponse,
  TeamDataObject,
  TeamEvent,
  TeamMembershipEvent,
  TeamListItemDataObject,
  TeamListItemResponse,
  TeamResponse,
  WebhookDetail,
} from '@asap-hub/model';
import { EventBridgeEvent } from 'aws-lambda';
import type { TeamProjectItem } from '../../src/data-providers/contentful/team.data-provider';
import { TeamPayload } from '../../src/handlers/event-bus';
import { createEventBridgeEventMock } from '../helpers/events';
import { getContentfulGraphqlManuscriptVersions } from './manuscript.fixtures';

export const getContentfulGraphql = (teamById = false, teamId?: string) => ({
  Teams: () =>
    teamById
      ? { ...getContentfulGraphqlTeamById(teamId), linkedFrom: () => {} }
      : getContentfulGraphqlTeam(),
  TeamMembershipCollection: () => getContentfulGraphqlTeamMemberships(),
  Users: () => getContentfulGraphqlTeamMembers(),
  UsersTeamsCollection: () => getUsersTeamsCollection(),
  UsersLabsCollection: () => getContentfulGraphqlTeamMemberLabs(),
  ManuscriptsVersionsCollection: () => getContentfulGraphqlManuscriptVersions(),
  ManuscriptVersionsTeamsCollection: () =>
    getContentfulGraphqlManuscriptVersions(teamId).items[0]?.teamsCollection,
  ManuscriptVersionsLabsCollection: () =>
    getContentfulGraphqlManuscriptVersions(teamId).items[0]?.labsCollection,
  ManuscriptVersionsFirstAuthorsCollection: () =>
    getContentfulGraphqlManuscriptVersions(teamId).items[0]
      ?.firstAuthorsCollection,
  ManuscriptVersionsCorrespondingAuthorCollection: () =>
    getContentfulGraphqlManuscriptVersions(teamId).items[0]
      ?.correspondingAuthorCollection,
  ManuscriptVersionsAdditionalAuthorsCollection: () =>
    getContentfulGraphqlManuscriptVersions(teamId).items[0]
      ?.additionalAuthorsCollection,
  Projects: () => getContentfulGraphqlProjectsCollection().items[0],
  ResearchTags: () =>
    getContentfulGraphqlProjectsCollection().items[0]?.researchTagsCollection
      ?.items[0],
});

export const getUsersTeamsCollection = () => ({
  items: [{ team: { sys: { id: 'team-id-0' }, displayName: 'Team A' } }],
});
export const getContentfulGraphqlTeamById = (
  teamId?: string,
): NonNullable<NonNullable<FetchTeamByIdQuery['teams']>> => ({
  sys: {
    id: teamId || 'team-id-0',
    publishedAt: '2020-11-26T11:56:04.000Z',
  },
  displayName: 'Team A',
  inactiveSince: null,
  teamType: 'Discovery Team',
  researchTheme: {
    name: 'PD Functional Genomics',
  },
  toolsCollection: {
    items: [],
  },
  linkedFrom: {
    teamMembershipCollection: {
      items: [
        {
          ...getContentfulGraphqlTeamMemberships().items[0],
          linkedFrom: {
            usersCollection: {
              items: [
                {
                  ...getContentfulGraphqlTeamMembers(),
                  labsCollection: getContentfulGraphqlTeamMemberLabs(),
                },
              ],
            },
          },
        },
      ],
    },
  },
});

export const getContentfulGraphqlTeamProjectById = (): NonNullable<
  NonNullable<FetchTeamProjectByIdQuery['teams']>
> => ({
  linkedFrom: {
    projectMembershipCollection: {
      items: [
        {
          linkedFrom: {
            projectsCollection: {
              items: [
                {
                  sys: {
                    id: 'project-id-1',
                  },
                  title:
                    'The genome-microbiome axis in the cause of Parkinson disease: Mechanistic insights and therapeutic implications from experimental models and a genetically stratified patient population.',
                  projectId: '',
                  grantId: '',
                  originalGrant: '',
                  status: 'Active',
                  contactEmail: undefined,
                  proposal: {
                    sys: {
                      id: '4cfb1b7b-bafe-4fca-b2ab-197e84d98996',
                    },
                  },
                  supplementGrant: {},
                  resourceType: {
                    name: 'Isogenic iPSC Lines',
                  },
                  researchTagsCollection: {
                    items: [
                      { sys: { id: 'tag-1' }, name: 'Animal resources 1' },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
});

export const getContentfulGraphqlTeam = (): NonNullable<
  NonNullable<ContentfulFetchTeamsQuery['teamsCollection']>['items'][number]
> => ({
  sys: {
    id: 'team-id-0',
  },
  displayName: 'Team A',
  inactiveSince: null,
  teamType: 'Discovery Team',
  researchTheme: {
    name: 'PD Functional Genomics',
  },
  linkedFrom: {
    teamMembershipCollection: {
      items: [
        {
          ...getContentfulGraphqlTeamMemberships().items[0],
          linkedFrom: {
            usersCollection: {
              items: [
                {
                  ...getContentfulGraphqlTeamMembers(),
                  labsCollection: getContentfulGraphqlTeamMemberLabs(),
                },
              ],
            },
          },
        },
      ],
    },
    projectMembershipCollection: {
      items: [
        {
          linkedFrom: {
            projectsCollection: getContentfulGraphqlProjectsCollection(),
          },
        },
      ],
    },
  },
});

export const getContentfulGraphqlPublicTeam = (): NonNullable<
  NonNullable<FetchPublicTeamsQuery['teamsCollection']>['items'][number]
> => ({
  sys: {
    id: 'team-id-0',
  },
  displayName: 'Team A',
  inactiveSince: null,
  researchTheme: {
    name: 'PD Functional Genomics',
  },
  linkedFrom: {
    teamMembershipCollection: {
      items: [
        {
          role: 'Key Personnel',
          linkedFrom: {
            usersCollection: {
              items: [
                {
                  sys: {
                    id: 'active-member-1',
                  },
                  firstName: 'John',
                  lastName: 'Doe',
                  onboarded: true,
                  alumniSinceDate: null,
                  nickname: null,
                },
              ],
            },
          },
        },
        {
          ...getContentfulGraphqlTeamMemberships().items[0],
          linkedFrom: {
            usersCollection: {
              items: [
                {
                  ...getContentfulGraphqlTeamMembers(),
                  alumniSinceDate: null,
                },
              ],
            },
          },
        },
        {
          role: 'Trainee',
          inactiveSinceDate: '2020-09-23T20:45:22.000Z',
          linkedFrom: {
            usersCollection: {
              items: [
                {
                  sys: {
                    id: 'inactive-member-1',
                  },
                  firstName: 'Jane',
                  lastName: 'Doe',
                  onboarded: true,
                  alumniSinceDate: null,
                },
              ],
            },
          },
        },
      ],
    },
    interestGroupsTeamsCollection: {
      items: [
        {
          linkedFrom: {
            interestGroupsCollection: {
              items: [
                {
                  sys: {
                    id: 'interest-group-1',
                  },
                  name: 'Interest Group 1',
                  active: true,
                },
              ],
            },
          },
        },
      ],
    },
  },
});

export const getContentfulGraphqlPublicTeamById = (): NonNullable<
  FetchPublicTeamByIdQuery['teams']
> => ({
  sys: {
    id: 'team-id-0',
    publishedAt: '2020-11-26T11:56:04.000Z',
  },
  displayName: 'Team A',
  inactiveSince: null,
  researchTheme: {
    name: 'PD Functional Genomics',
  },
  linkedFrom: {
    teamMembershipCollection: {
      items: [
        {
          role: 'Lead PI (Core Leadership)',
          inactiveSinceDate: null,
          linkedFrom: {
            usersCollection: {
              items: [
                {
                  sys: {
                    id: 'user-id-1',
                  },
                  firstName: 'Tom',
                  nickname: 'Tim',
                  lastName: 'Hardy',
                  alumniSinceDate: null,
                  avatar: {
                    url: 'https://example.com/avatar.jpg',
                  },
                  onboarded: true,
                },
              ],
            },
          },
        },
        {
          role: 'Project Manager',
          inactiveSinceDate: '2020-09-23T20:45:22.000Z',
          linkedFrom: {
            usersCollection: {
              items: [
                {
                  sys: {
                    id: 'user-id-2',
                  },
                  firstName: 'John',
                  nickname: null,
                  lastName: 'Doe',
                  alumniSinceDate: null,
                  avatar: null,
                  onboarded: true,
                },
              ],
            },
          },
        },
        {
          role: 'Key Personnel',
          inactiveSinceDate: null,
          linkedFrom: {
            usersCollection: {
              items: [
                {
                  sys: {
                    id: 'user-id-3',
                  },
                  firstName: 'Jane',
                  nickname: null,
                  lastName: 'Smith',
                  alumniSinceDate: '2021-01-01T00:00:00.000Z',
                  avatar: null,
                  onboarded: true,
                },
              ],
            },
          },
        },
      ],
    },
    projectMembershipCollection: {
      items: [
        {
          linkedFrom: {
            projectsCollection: {
              items: [
                {
                  title: 'Test Project Title',
                  originalGrant: 'Test project summary',
                  researchTagsCollection: {
                    items: [
                      {
                        sys: {
                          id: 'tag-1',
                        },
                        name: 'Animal resources 1',
                      },
                      {
                        sys: {
                          id: 'tag-2',
                        },
                        name: 'Animal resources 2',
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
});

export const getContentfulGraphqlTeamMemberships = () => ({
  total: 1,
  items: [
    {
      role: 'Lead PI (Core Leadership)',
      inactiveSinceDate: null,
    },
  ],
});

export const getContentfulGraphqlTeamMembers = () => ({
  sys: {
    id: 'user-id-1',
  },
  email: 'H@rdy.io',
  firstName: 'Tom',
  nickname: 'Tim',
  lastName: 'Hardy',
  avatar: null,
  alumniSinceDate: null,
  onboarded: true,
});

export const getContentfulGraphqlTeamMemberLabs = () => ({
  items: [
    {
      sys: { id: 'cd7be4902' },
      name: 'Brighton',
      labPi: { sys: { id: 'user-id-1' } },
    },
    {
      sys: { id: 'cd7be4903' },
      name: 'Liverpool',
      labPi: { sys: { id: 'user-id-1' } },
    },
  ],
});

export const getContentfulTeamsGraphqlResponse =
  (): ContentfulFetchTeamsQuery => ({
    teamsCollection: {
      total: 1,
      items: [getContentfulGraphqlTeam()],
    },
  });

export const getContentfulGraphqlProjectMembershipsCollection = (): {
  total: number;
  items: Array<TeamProjectItem>;
} => ({
  total: 1,
  items: [
    {
      sys: {
        id: 'project-id-1',
      },
      title:
        'The genome-microbiome axis in the cause of Parkinson disease: Mechanistic insights and therapeutic implications from experimental models and a genetically stratified patient population.',
      projectId: 'WH1',
      grantId: '000282',
      originalGrant: '',
      proposal: {
        sys: {
          id: '4cfb1b7b-bafe-4fca-b2ab-197e84d98996',
        },
      },
      supplementGrant: {
        title: 'Supplement Grant',
        description: 'Supplement Grant description',
        startDate: '',
        endDate: '',
        proposal: {
          sys: {
            id: '4cfb1b7b-bafe-4fca-b2ab-2347f84d98996',
          },
        },
      },
    },
  ],
});
export const getContentfulGraphqlProjectsCollection = (): {
  total: number;
  items: Array<TeamProjectItem>;
} => ({
  total: 1,
  items: [
    {
      sys: {
        id: 'project-id-1',
      },
      title:
        'The genome-microbiome axis in the cause of Parkinson disease: Mechanistic insights and therapeutic implications from experimental models and a genetically stratified patient population.',
      projectId: 'WH1',
      grantId: '000282',
      originalGrant: '',
      status: 'Active',
      proposal: {
        sys: {
          id: '4cfb1b7b-bafe-4fca-b2ab-197e84d98996',
        },
      },
      supplementGrant: {
        title: 'Supplement Grant',
        description: 'Supplement Grant description',
        startDate: '',
        endDate: '',
        proposal: {
          sys: {
            id: '4cfb1b7b-bafe-4fca-b2ab-2347f84d98996',
          },
        },
      },
      resourceType: {
        name: 'Isogenic iPSC Lines',
      },
      researchTagsCollection: {
        items: [{ sys: { id: 'tag-1' }, name: 'Animal resources 1' }],
      },
    },
  ],
});

export const getListTeamResponse = (): ListTeamResponse => ({
  total: 1,
  items: [getTeamListItemResponse()],
});

export const getTeamDataObject = (): TeamDataObject => ({
  id: 'team-id-0',
  displayName: 'Team A',
  teamType: 'Discovery Team',
  teamStatus: 'Active',
  statusRank: 1,
  lastModifiedDate: '2020-11-26T11:56:04.000Z',
  labCount: 2,
  tags: [
    {
      id: 'tag-1',
      name: 'Animal resources 1',
    },
  ],
  members: [
    {
      id: 'user-id-1',
      alumniSinceDate: undefined,
      email: 'H@rdy.io',
      firstName: 'Tom',
      lastName: 'Hardy',
      displayName: 'Tom (Tim) Hardy',
      role: 'Lead PI (Core Leadership)',
      avatarUrl: undefined,
      labs: [
        { id: 'cd7be4902', name: 'Brighton' },
        { id: 'cd7be4903', name: 'Liverpool' },
      ],
    },
  ],
  projectTitle:
    'The genome-microbiome axis in the cause of Parkinson disease: Mechanistic insights and therapeutic implications from experimental models and a genetically stratified patient population.',
  projectStatus: 'Active',
  proposalURL: '4cfb1b7b-bafe-4fca-b2ab-197e84d98996',
  tools: [],
  researchTheme: 'PD Functional Genomics',
  resourceType: 'Isogenic iPSC Lines',
  labs: [
    {
      id: 'cd7be4902',
      name: 'Brighton',
      labPrincipalInvestigatorId: 'user-id-1',
    },
    {
      id: 'cd7be4903',
      name: 'Liverpool',
      labPrincipalInvestigatorId: 'user-id-1',
    },
  ],
});

export const getPublicTeamListItemDataObject =
  (): PublicTeamListItemDataObject => ({
    id: 'team-id-0',
    name: 'Team A',
    researchTheme: 'PD Functional Genomics',
    activeTeamMembers: ['active-member-1', 'user-id-1'],
    inactiveTeamMembers: ['inactive-member-1'],
    noOfTeamMembers: 2,
    activeInterestGroups: ['Interest Group 1'],
    teamLeaders: [
      {
        id: 'user-id-1',
        displayName: 'Tom (Tim) Hardy',
        avatarUrl: undefined,
      },
    ],
  });

export const getListPublicTeamResponse = (): ListPublicTeamResponse => ({
  total: 1,
  items: [getPublicTeamListItemDataObject()],
});

export const getTeamListItemDataObject = (): TeamListItemDataObject => ({
  id: 'team-id-0',
  displayName: 'Team A',
  teamType: 'Discovery Team',
  teamStatus: 'Active',
  statusRank: 1,
  labCount: 2,
  tags: [{ id: 'tag-1', name: 'Animal resources 1' }],
  memberCount: 1,
  projectTitle:
    'The genome-microbiome axis in the cause of Parkinson disease: Mechanistic insights and therapeutic implications from experimental models and a genetically stratified patient population.',
  linkedProjectId: 'project-id-1',
  researchTheme: 'PD Functional Genomics',
  resourceType: 'Isogenic iPSC Lines',
});

export const getTeamResponse = (): TeamResponse => getTeamDataObject();
export const getPublicTeamResponse = (): PublicTeamResponse => ({
  id: 'team-id-0',
  name: 'Team A',
  title:
    'The genome-microbiome axis in the cause of Parkinson disease: Mechanistic insights and therapeutic implications from experimental models and a genetically stratified patient population.',
  status: 'Active',
  tags: ['Animal resources 1'],
  researchTheme: 'PD Functional Genomics',
  members: [
    {
      id: 'user-id-1',
      status: 'Inactive',
      firstName: 'Tom',
      lastName: 'Hardy',
      displayName: 'Tom (Tim) Hardy',
      role: 'Lead PI (Core Leadership)',
    },
    {
      id: 'user-id-2',
      status: 'Active',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      role: 'Lead PI (Core Leadership)',
    },
  ],
});
export const getTeamListItemResponse = (): TeamListItemResponse =>
  getTeamListItemDataObject();

export type TeamEventGenerator = (
  id: string,
) => EventBridgeEvent<TeamEvent, TeamPayload>;

export const getTeamUnpublishedEvent: TeamEventGenerator = (id: string) =>
  getTeamEvent(id, 'TeamsUnpublished');

export const getTeamPublishedEvent: TeamEventGenerator = (id: string) =>
  getTeamEvent(id, 'TeamsPublished');

export const getTeamContentfulWebhookDetail = (
  id: string,
): WebhookDetail<ContentfulWebhookPayload<'teams'>> => ({
  resourceId: id,
  metadata: {
    tags: [],
  },
  sys: {
    type: 'Entry',
    id: 'fc496d00-053f-44fd-9bac-68dd9d959848',
    space: {
      sys: {
        type: 'Link',
        linkType: 'Space',
        id: '5v6w5j61tndm',
      },
    },
    environment: {
      sys: {
        id: 'crn-3046',
        type: 'Link',
        linkType: 'Environment',
      },
    },
    contentType: {
      sys: {
        type: 'Link',
        linkType: 'ContentType',
        id: 'teams',
      },
    },
    createdBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '2SHvngTJ24kxZGAPDJ8J1y',
      },
    },
    updatedBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '2SHvngTJ24kxZGAPDJ8J1y',
      },
    },
    revision: 14,
    createdAt: '2023-05-17T13:39:03.250Z',
    updatedAt: '2023-05-18T16:17:36.425Z',
  },
  fields: {},
});

export const getTeamEvent = (
  id: string,
  eventType: TeamEvent,
): EventBridgeEvent<
  TeamEvent,
  WebhookDetail<ContentfulWebhookPayload<'teams'>>
> =>
  createEventBridgeEventMock(getTeamContentfulWebhookDetail(id), eventType, id);

export const getTeamPublishContentfulWebhookPayload =
  (): ContentfulWebhookPublishPayload<'teams'> => ({
    metadata: {
      tags: [],
    },
    sys: {
      type: 'Entry',
      id: '2i3zL0KG5pjxnNQpDOqf01',
      space: {
        sys: {
          type: 'Link',
          linkType: 'Space',
          id: '5v6w5j61tndm',
        },
      },
      environment: {
        sys: {
          id: 'crn-2802',
          type: 'Link',
          linkType: 'Environment',
        },
      },
      contentType: {
        sys: {
          type: 'Link',
          linkType: 'ContentType',
          id: 'teams',
        },
      },
      createdBy: {
        sys: {
          type: 'Link',
          linkType: 'User',
          id: '1W39zODWXRZZPH4On1MQoS',
        },
      },
      updatedBy: {
        sys: {
          type: 'Link',
          linkType: 'User',
          id: '1W39zODWXRZZPH4On1MQoS',
        },
      },
      revision: 1,
      createdAt: '2023-03-22T15:40:48.930Z',
      updatedAt: '2023-03-22T15:40:48.930Z',
    },
    fields: {
      displayName: {
        'en-US': 'team 1',
      },
      applicationNumber: {
        'en-US': 'ASAP',
      },
      projectTitle: {
        'en-US': 'Test title',
      },
    },
  });

export const getTeamUnpublishContentfulWebhookPayload =
  (): ContentfulWebhookUnpublishPayload<'teams'> => ({
    sys: {
      type: 'DeletedEntry',
      id: '4fTQlBcDyPBvUIwpjm96JU',
      space: {
        sys: {
          type: 'Link',
          linkType: 'Space',
          id: '5v6w5j61tndm',
        },
      },
      environment: {
        sys: {
          id: 'crn-2802',
          type: 'Link',
          linkType: 'Environment',
        },
      },
      contentType: {
        sys: {
          type: 'Link',
          linkType: 'ContentType',
          id: 'teams',
        },
      },
      revision: 2,
      createdAt: '2023-03-23T08:54:29.958Z',
      updatedAt: '2023-03-23T08:54:29.958Z',
      deletedAt: '2023-03-23T08:54:29.958Z',
    },
  });

// TeamMembership Event Fixtures
export type TeamMembershipEventGenerator = (
  membershipId: string,
  teamId: string,
) => EventBridgeEvent<TeamMembershipEvent, any>;

export const getTeamMembershipContentfulWebhookDetail = (
  membershipId: string,
  teamId: string,
): WebhookDetail<ContentfulWebhookPayload<'teamMembership'>> => ({
  resourceId: membershipId,
  metadata: {
    tags: [],
  },
  sys: {
    type: 'Entry',
    id: membershipId,
    space: {
      sys: {
        type: 'Link',
        linkType: 'Space',
        id: '5v6w5j61tndm',
      },
    },
    environment: {
      sys: {
        id: 'crn-3046',
        type: 'Link',
        linkType: 'Environment',
      },
    },
    contentType: {
      sys: {
        type: 'Link',
        linkType: 'ContentType',
        id: 'teamMembership',
      },
    },
    createdBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '2SHvngTJ24kxZGAPDJ8J1y',
      },
    },
    updatedBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '2SHvngTJ24kxZGAPDJ8J1y',
      },
    },
    revision: 1,
    createdAt: '2023-05-17T13:39:03.250Z',
    updatedAt: '2023-05-18T16:17:36.425Z',
  },
  fields: {
    team: {
      'en-US': {
        sys: {
          type: 'Link',
          linkType: 'Entry',
          id: teamId,
        },
      },
    },
    role: {
      'en-US': 'Data Manager',
    },
  },
});

export const getTeamMembershipEvent = (
  membershipId: string,
  teamId: string,
  eventType: TeamMembershipEvent,
): EventBridgeEvent<
  TeamMembershipEvent,
  WebhookDetail<ContentfulWebhookPayload<'teamMembership'>>
> =>
  createEventBridgeEventMock(
    getTeamMembershipContentfulWebhookDetail(membershipId, teamId),
    eventType,
    membershipId,
  );

export const getTeamMembershipPublishedEvent: TeamMembershipEventGenerator = (
  membershipId: string,
  teamId: string,
) => getTeamMembershipEvent(membershipId, teamId, 'TeamMembershipPublished');

export const getTeamMembershipUnpublishedEvent: TeamMembershipEventGenerator = (
  membershipId: string,
  teamId: string,
) => getTeamMembershipEvent(membershipId, teamId, 'TeamMembershipUnpublished');

export const getContentfulGraphqlTeamAwardMetrics =
  (): FetchTeamAwardMetricsQuery => ({
    awardTypeCollection: {
      items: [
        {
          sys: { id: 'award-type-1' },
          name: 'Open Science Champion Award',
          asapPhilosophy: 'ASAP is built upon strong open science principles.',
          metricDefinition:
            'The Open Science Champion Metric provides recognition to teams that have received an Open Science Champion award since the start of the grant.',
        },
        {
          sys: { id: 'award-type-2' },
          name: 'Network Spotlight',
          asapPhilosophy: 'ASAP believes in ensuring that credit is given.',
          metricDefinition:
            'The Network Spotlight Metric provides recognition to teams that have received a Network Spotlight award.',
        },
      ],
    },
    teamMembershipCollection: {
      items: [
        {
          awardsCollection: {
            items: [{ awardType: { sys: { id: 'award-type-1' } } }],
          },
        },
        {
          awardsCollection: {
            items: [],
          },
        },
      ],
    },
  });

export const getListTeamAwardMetricsDataObject =
  (): ListTeamAwardMetricsDataObject => ({
    total: 2,
    items: [
      {
        id: 'award-type-1',
        name: 'Open Science Champion Award',
        asapPhilosophy: 'ASAP is built upon strong open science principles.',
        metricDefinition:
          'The Open Science Champion Metric provides recognition to teams that have received an Open Science Champion award since the start of the grant.',
        received: true,
      },
      {
        id: 'award-type-2',
        name: 'Network Spotlight',
        asapPhilosophy: 'ASAP believes in ensuring that credit is given.',
        metricDefinition:
          'The Network Spotlight Metric provides recognition to teams that have received a Network Spotlight award.',
        received: false,
      },
    ],
  });

export const getListTeamAwardMetricsResponse =
  (): ListTeamAwardMetricsResponse => getListTeamAwardMetricsDataObject();
