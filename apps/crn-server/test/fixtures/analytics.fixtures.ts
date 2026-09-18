import {
  FetchAnalyticsTeamLeadershipQuery,
  FetchAttendanceQuery,
  FetchEngagementQuery,
  FetchOsChampionQuery,
  FetchPreliminaryDataSharingQuery,
  FetchTeamCollaborationQuery,
  FetchTeamProductivityQuery,
  FetchUserProductivityQuery,
  FetchUserResearchOutputsQuery,
  FetchUserTotalResearchOutputsQuery,
} from '@asap-hub/contentful';
import {
  AnalyticsTeamLeadershipDataObject,
  AnalyticsTeamLeadershipResponse,
  EngagementResponse,
  EventStatus,
  ListAnalyticsTeamLeadershipDataObject,
  ListAnalyticsTeamLeadershipResponse,
  ListEngagementResponse,
  ListMeetingRepAttendanceResponse,
  ListOSChampionResponse,
  ListPreliminaryDataSharingResponse,
  ListTeamCollaborationResponse,
  ListTeamProductivityDataObject,
  ListTeamProductivityResponse,
  ListUserCollaborationResponse,
  ListUserProductivityDataObject,
  ListUserProductivityResponse,
  MeetingRepAttendanceResponse,
  OSChampionResponse,
  PreliminaryDataSharingResponse,
  TeamCollaborationDataObject,
  TeamCollaborationResponse,
  TeamProductivityDataObject,
  TeamProductivityResponse,
  TeamRole,
  UserCollaborationDataObject,
  UserCollaborationResponse,
  UserProductivityDataObject,
  UserProductivityResponse,
} from '@asap-hub/model';

import type { EventSpeakersCollectionItem } from '../../src/utils/analytics/engagement';
import { getTeamDataObject } from './teams.fixtures';

export const getAnalyticsTeamLeadershipDataObject =
  (): AnalyticsTeamLeadershipDataObject => {
    const { id, displayName } = getTeamDataObject();
    return {
      id,
      displayName,
      workingGroupLeadershipRoleCount: 1,
      workingGroupPreviousLeadershipRoleCount: 2,
      workingGroupMemberCount: 3,
      workingGroupPreviousMemberCount: 4,
      interestGroupLeadershipRoleCount: 5,
      interestGroupPreviousLeadershipRoleCount: 6,
      interestGroupMemberCount: 7,
      interestGroupPreviousMemberCount: 8,
    };
  };

export const getListAnalyticsTeamLeadershipDataObject =
  (): ListAnalyticsTeamLeadershipDataObject => ({
    total: 1,
    items: [getAnalyticsTeamLeadershipDataObject()],
  });

export const getAnalyticsTeamLeadershipResponse =
  (): AnalyticsTeamLeadershipResponse => getAnalyticsTeamLeadershipDataObject();

export const getListAnalyticsTeamLeadershipResponse =
  (): ListAnalyticsTeamLeadershipResponse => ({
    total: 1,
    items: [getAnalyticsTeamLeadershipResponse()],
  });

export const getAnalyticsTeamLeadershipQuery =
  (): FetchAnalyticsTeamLeadershipQuery => ({
    teamsCollection: {
      total: 1,
      items: [
        {
          sys: {
            id: 'team-id-0',
          },
          displayName: 'Team A',
          linkedFrom: {
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
                          active: true,
                        },
                      ],
                    },
                  },
                },
              ],
            },
            teamMembershipCollection: {
              items: [
                {
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      items: [
                        {
                          alumniSinceDate: null,
                          linkedFrom: {
                            interestGroupLeadersCollection: {
                              items: [
                                {
                                  role: 'Chair',
                                  linkedFrom: {
                                    interestGroupsCollection: {
                                      items: [
                                        {
                                          sys: {
                                            id: 'interest-group-1',
                                          },
                                          active: true,
                                        },
                                      ],
                                    },
                                  },
                                },
                              ],
                            },
                            workingGroupMembersCollection: {
                              items: [
                                {
                                  linkedFrom: {
                                    workingGroupsCollection: {
                                      items: [
                                        {
                                          sys: {
                                            id: 'working-group-1',
                                          },
                                        },
                                      ],
                                    },
                                  },
                                },
                              ],
                            },
                            workingGroupLeadersCollection: {
                              items: [
                                {
                                  role: 'Chair',
                                  linkedFrom: {
                                    workingGroupsCollection: {
                                      items: [
                                        {
                                          sys: {
                                            id: 'working-group-1',
                                          },
                                        },
                                      ],
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  });

export const getUserProductivityDataObject =
  (): UserProductivityDataObject => ({
    id: 'user-1',
    name: 'Jane (Jenny) Doe',
    isAlumni: false,
    teams: [
      {
        id: '1',
        isTeamInactive: false,
        isUserInactiveOnTeam: false,
        role: 'Co-PI (Core Leadership)',
        team: 'Team Alessi',
      },
      {
        id: '2',
        isTeamInactive: false,
        isUserInactiveOnTeam: false,
        role: 'Collaborating PI',
        team: 'Team De Camilli',
      },
    ],
    asapOutput: 4,
    asapPublicOutput: 2,
    ratio: 0.5,
  });

export const getResearchOutputUserProductivity = (): NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        FetchUserProductivityQuery['usersCollection']
      >['items'][number]
    >['linkedFrom']
  >['researchOutputsCollection']
>['items'] => [
  {
    addedDate: '2023-09-08T03:00:00.000Z',
    asapFunded: 'Yes',
    sharingStatus: 'Network Only',
    authorsCollection: {
      items: [
        {
          __typename: 'Users',
          sys: {
            id: 'user-1',
          },
        },
      ],
    },
  },
  {
    addedDate: '2023-09-07T03:00:00.000Z',
    asapFunded: 'Yes',
    sharingStatus: 'Network Only',
    authorsCollection: {
      items: [
        {
          __typename: 'Users',
          sys: {
            id: 'user-2',
          },
        },
        {
          __typename: 'Users',
          sys: {
            id: 'user-3',
          },
        },
      ],
    },
  },
  {
    addedDate: '2023-09-06T03:00:00.000Z',
    asapFunded: 'Yes',
    sharingStatus: 'Network Only',
    authorsCollection: {
      items: [
        {
          __typename: 'Users',
          sys: {
            id: 'user-1',
          },
        },
      ],
    },
  },
  {
    addedDate: '2023-09-05T03:00:00.000Z',
    asapFunded: 'Yes',
    sharingStatus: 'Public',
    authorsCollection: {
      items: [
        {
          __typename: 'Users',
          sys: {
            id: 'user-1',
          },
        },
      ],
    },
  },
  {
    addedDate: '2023-07-05T03:00:00.000Z',
    asapFunded: 'Yes',
    sharingStatus: 'Public',
    authorsCollection: {
      items: [
        {
          __typename: 'Users',
          sys: {
            id: 'user-1',
          },
        },
      ],
    },
  },
];

export const getTeamProductivityDataObject =
  (): TeamProductivityDataObject => ({
    id: 'team-id-0',
    name: 'Team A',
    isInactive: false,
    Article: 1,
    Bioinformatics: 1,
    Dataset: 0,
    'Lab Material': 0,
    Protocol: 1,
  });

export const getResearchOutputTeamProductivity = (): NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        FetchTeamProductivityQuery['teamsCollection']
      >['items'][number]
    >['linkedFrom']
  >['researchOutputsCollection']
>['items'] => [
  {
    addedDate: '2023-09-05T03:00:00.000Z',
    asapFunded: 'Yes',
    documentType: 'Article',
  },
  {
    addedDate: '2023-09-03T03:00:00.000Z',
    asapFunded: 'Yes',
    documentType: 'Bioinformatics',
  },
  {
    addedDate: '2023-09-01T03:00:00.000Z',
    asapFunded: 'Yes',
    documentType: 'Grant Document',
  },
  {
    addedDate: null,
    asapFunded: 'Yes',
    documentType: 'Protocol',
  },
];

export const getUserProductivityQuery = (): FetchUserProductivityQuery => ({
  usersCollection: {
    total: 1,
    items: [
      {
        sys: {
          id: 'user-1',
        },
        firstName: 'Jane',
        lastName: 'Doe',
        nickname: 'Jenny',
        onboarded: true,
        role: 'Grantee',
        alumniSinceDate: null,
        linkedFrom: {
          researchOutputsCollection: {
            items: getResearchOutputUserProductivity(),
          },
        },
        teamsCollection: {
          items: [
            {
              role: 'Co-PI (Core Leadership)',
              inactiveSinceDate: null,
              team: {
                sys: { id: '1' },
                displayName: 'Team Alessi',
                inactiveSince: null,
              },
            },
            {
              role: 'Collaborating PI',
              inactiveSinceDate: null,
              team: {
                sys: { id: '2' },
                displayName: 'Team De Camilli',
                inactiveSince: null,
              },
            },
          ],
        },
      },
    ],
  },
});

export const getTeamProductivityQuery = (): FetchTeamProductivityQuery => ({
  teamsCollection: {
    total: 1,
    items: [
      {
        sys: {
          id: 'team-id-0',
        },
        displayName: 'Team A',
        inactiveSince: null,
        linkedFrom: {
          researchOutputsCollection: {
            items: getResearchOutputTeamProductivity(),
          },
        },
      },
    ],
  },
});

export const getListUserProductivityDataObject =
  (): ListUserProductivityDataObject => ({
    total: 1,
    items: [getUserProductivityDataObject()],
  });

export const getListTeamProductivityDataObject =
  (): ListTeamProductivityDataObject => ({
    total: 1,
    items: [getTeamProductivityDataObject()],
  });

export const getUserProductivityResponse = (): UserProductivityResponse =>
  getUserProductivityDataObject();

export const getListUserProductivityResponse =
  (): ListUserProductivityResponse => getListUserProductivityDataObject();

export const getTeamProductivityResponse = (): TeamProductivityResponse =>
  getTeamProductivityDataObject();

export const getListTeamProductivityResponse =
  (): ListTeamProductivityResponse => getListTeamProductivityDataObject();

type GetUserTotalResearchOutputsItemProps = {
  userId?: string;
  researchOutputs?: number;
  labIds?: string[];
  teams?: {
    id: string;
    name: string;
    role: TeamRole;
    teamInactiveSince: string | null;
    teamMembershipInactiveSince: string | null;
  }[];
};

export const getUserTotalResearchOutputsItem = ({
  userId = 'user-1',
  researchOutputs = 1,
  labIds = ['lab-1'],
  teams = [
    {
      role: 'Key Personnel',
      id: 'team-1',
      name: 'Team 1',
      teamInactiveSince: null,
      teamMembershipInactiveSince: null,
    },
  ],
}: GetUserTotalResearchOutputsItemProps): NonNullable<
  NonNullable<FetchUserTotalResearchOutputsQuery['usersCollection']>['items']
>[number] => ({
  sys: {
    id: userId,
  },
  firstName: 'John',
  lastName: 'Doe',
  nickname: 'Johnny',
  alumniSinceDate: null,
  labsCollection: {
    items: labIds.map((labId) => ({
      sys: {
        id: labId,
      },
    })),
  },
  teamsCollection: {
    items: teams.map(
      ({ id, name, role, teamInactiveSince, teamMembershipInactiveSince }) => ({
        role,
        inactiveSinceDate: teamMembershipInactiveSince,
        team: {
          sys: {
            id,
          },
          displayName: name,
          inactiveSince: teamInactiveSince,
        },
      }),
    ),
  },
  linkedFrom: {
    researchOutputsCollection: {
      total: researchOutputs,
    },
  },
});

export const getUserTotalResearchOutputs = (
  length: number = 2,
): FetchUserTotalResearchOutputsQuery => ({
  usersCollection: {
    total: length,
    items: Array.from({ length }).map(() =>
      getUserTotalResearchOutputsItem({}),
    ),
  },
});

export const getUserResearchOutputsQuery =
  (): FetchUserResearchOutputsQuery => ({
    usersCollection: {
      total: 1,
      items: [
        {
          sys: {
            id: 'user-1',
          },
          linkedFrom: {
            researchOutputsCollection: {
              items: [
                {
                  sys: {
                    id: 'research-output-1',
                  },
                  addedDate: '2024-07-02T08:12:02.234Z',
                  documentType: 'Bioinformatics',
                  authorsCollection: {
                    items: [
                      {
                        __typename: 'Users',
                        sys: {
                          id: 'monica',
                        },
                      },
                      {
                        __typename: 'ExternalAuthors',
                      },
                      {
                        __typename: 'Users',
                        sys: {
                          id: 'phoebe',
                        },
                      },
                    ],
                  },
                },
                {
                  sys: {
                    id: 'research-output-2',
                  },
                  addedDate: '2024-07-02T08:19:11.314Z',
                  documentType: 'Bioinformatics',
                  authorsCollection: {
                    items: [
                      {
                        __typename: 'Users',
                        sys: {
                          id: 'monica',
                        },
                      },
                      {
                        __typename: 'ExternalAuthors',
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
  });

export const getResearchOutputTeamCollaboration = (): NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        FetchTeamCollaborationQuery['teamsCollection']
      >['items'][number]
    >['linkedFrom']
  >['researchOutputsCollection']
>['items'] => [
  {
    addedDate: '2023-09-05T03:00:00.000Z',
    asapFunded: 'Yes',
    documentType: 'Article',
    labsCollection: {
      total: 3,
    },
    teamsCollection: {
      items: [
        {
          sys: {
            id: 'team-id-0',
          },
          displayName: 'Team A',
          inactiveSince: null,
        },
        {
          sys: {
            id: 'team-id-1',
          },
          displayName: 'Team B',
          inactiveSince: null,
        },
      ],
    },
  },
];

export const getTeamCollaborationQuery = (): FetchTeamCollaborationQuery => ({
  teamsCollection: {
    total: 1,
    items: [
      {
        sys: {
          id: 'team-1',
        },
        displayName: 'Team A',
        inactiveSince: null,
        linkedFrom: {
          researchOutputsCollection: {
            items: [
              {
                addedDate: '2023-09-01T03:00:00.000Z',
                asapFunded: 'Yes',
                createdDate: '',
                documentType: '',
                labsCollection: {
                  total: 3,
                },
                teamsCollection: {
                  items: [
                    {
                      sys: {
                        id: 'team-1',
                      },
                      displayName: 'Team A',
                      inactiveSince: null,
                    },
                    {
                      sys: {
                        id: 'team-2',
                      },
                      displayName: 'Team B',
                      inactiveSince: null,
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
});

export const getUserCollaborationDataObject =
  (): UserCollaborationDataObject => ({
    id: 'user-1',
    alumniSince: undefined,
    name: 'User User',
    teams: [],
    totalUniqueOutputsCoAuthoredAcrossTeams: 0,
    totalUniqueOutputsCoAuthoredWithinTeam: 0,
  });

export const getTeamCollaborationDataObject =
  (): TeamCollaborationDataObject => ({
    id: 'team-id-0',
    inactiveSince: undefined,
    name: 'Team A',
    outputsCoProducedWithin: {
      Article: 1,
      Bioinformatics: 0,
      Dataset: 0,
      'Lab Material': 0,
      Protocol: 0,
    },
    totalOutputs: {
      Article: 1,
      Bioinformatics: 0,
      Dataset: 0,
      'Lab Material': 0,
      Protocol: 0,
    },
    outputsCoProducedAcross: {
      byDocumentType: {
        Article: 1,
        Bioinformatics: 0,
        Dataset: 0,
        'Lab Material': 0,
        Protocol: 0,
      },
      byTeam: [
        {
          id: 'team-id-1',
          name: 'Team B',
          isInactive: false,
          Article: 1,
          Bioinformatics: 0,
          Dataset: 0,
          'Lab Material': 0,
          Protocol: 0,
        },
      ],
    },
  });

export const getUserCollaborationResponse = (): UserCollaborationResponse =>
  getUserCollaborationDataObject();

export const getTeamCollaborationResponse = (): TeamCollaborationResponse =>
  getTeamCollaborationDataObject();

export const getListUserCollaborationResponse =
  (): ListUserCollaborationResponse => ({
    total: 1,
    items: [getUserCollaborationResponse()],
  });

export const getListTeamCollaborationResponse =
  (): ListTeamCollaborationResponse => ({
    total: 1,
    items: [getTeamCollaborationResponse()],
  });

type EngagementUser = NonNullable<
  NonNullable<EventSpeakersCollectionItem>
>['user'];

type MakeUserProps = {
  userId?: string;
  teams?: { id: string; role: TeamRole }[];
  onboarded?: boolean;
};
export const makeUser = ({
  userId = 'user-id-1',
  teams = [{ id: 'team-id-1', role: 'Project Manager' }],
  onboarded = true,
}: MakeUserProps): EngagementUser => ({
  __typename: 'Users',
  onboarded,
  sys: { id: userId },
  teamsCollection: {
    items: teams.map((team) => ({
      role: team.role,
      team: { sys: { id: team.id } },
    })),
  },
});

type MakeTeamMembershipProps = {
  role?: TeamRole;
  onboarded?: boolean;
};
export const makeTeamMembership = ({
  role = 'Key Personnel',
  onboarded = true,
}: MakeTeamMembershipProps) => ({
  role,
  linkedFrom: {
    usersCollection: {
      items: [
        {
          onboarded,
        },
      ],
    },
  },
});

type EngagementEvent = NonNullable<
  NonNullable<NonNullable<EventSpeakersCollectionItem>>['linkedFrom']
>['eventsCollection'];

type MakeEventProps = {
  eventId?: string;
  endDate?: string;
  status?: EventStatus;
};
export const makeEvent = ({
  eventId = 'event-1',
  endDate = '2024-07-11T13:00:00.000Z',
  status = 'Confirmed',
}: MakeEventProps): EngagementEvent => ({
  items: [{ sys: { id: eventId }, endDate, status }],
});

export const getEngagementQuery = (): FetchEngagementQuery => ({
  teamsCollection: {
    total: 1,
    items: [
      {
        sys: {
          id: 'team-id-0',
        },
        displayName: 'Team A',
        inactiveSince: null,
        linkedFrom: {
          teamMembershipCollection: {
            items: [
              makeTeamMembership({ role: 'Key Personnel' }),
              makeTeamMembership({ role: 'Project Manager' }),
              makeTeamMembership({ role: 'Collaborating PI' }),
              makeTeamMembership({ role: 'Co-PI (Core Leadership)' }),
              makeTeamMembership({ role: 'Key Personnel', onboarded: false }),
            ],
          },
          eventSpeakersCollection: getEventSpeakers(),
        },
      },
    ],
  },
});

export const getEventSpeakers = () => ({
  items: [
    {
      user: makeUser({
        userId: 'user-1',
        teams: [
          { id: 'team-id-0', role: 'Project Manager' },
          { id: 'team-id-2', role: 'Key Personnel' },
        ],
      }),
      linkedFrom: {
        eventsCollection: makeEvent({
          eventId: 'event-1',
          endDate: '2024-06-11T13:00:00.000Z',
        }),
      },
    },
    {
      user: makeUser({
        userId: 'user-2',
        teams: [{ id: 'team-id-0', role: 'Key Personnel' }],
      }),
      linkedFrom: {
        eventsCollection: makeEvent({
          eventId: 'event-1',
          endDate: '2024-06-11T13:00:00.000Z',
        }),
      },
    },
    {
      user: makeUser({
        userId: 'user-1',
        teams: [
          { id: 'team-id-0', role: 'Project Manager' },
          { id: 'team-id-2', role: 'Key Personnel' },
        ],
      }),
      linkedFrom: {
        eventsCollection: makeEvent({
          eventId: 'event-2',
          endDate: '2024-05-28T00:00:00.000Z',
        }),
      },
    },
  ],
});

export const getEngagementResponse: () => EngagementResponse = () => ({
  id: 'team-id-0',
  inactiveSince: null,
  memberCount: 4,
  name: 'Team A',
  eventCount: 2,
  totalSpeakerCount: 3,
  uniqueAllRolesCount: 2,
  uniqueAllRolesCountPercentage: 50,
  uniqueKeyPersonnelCount: 1,
  uniqueKeyPersonnelCountPercentage: 25,
});

export const getListEngagementResponse = (): ListEngagementResponse => ({
  total: 1,
  items: [getEngagementResponse()],
});

export const getOsChampionQuery = (): FetchOsChampionQuery => ({
  teamsCollection: {
    total: 1,
    items: [
      {
        sys: {
          id: 'team-id-0',
        },
        displayName: 'Team A',
        inactiveSince: null,
        linkedFrom: {
          teamMembershipCollection: {
            items: [
              {
                awardsCollection: {
                  total: 0,
                },
                linkedFrom: {
                  usersCollection: {
                    items: [
                      {
                        sys: {
                          id: 'user-without-awards',
                        },
                        firstName: 'No Awards',
                        middleName: null,
                        nickname: null,
                        lastName: 'User',
                      },
                    ],
                  },
                },
              },
              {
                linkedFrom: {
                  usersCollection: {
                    items: [
                      {
                        sys: {
                          id: 'user-with-2-awards',
                        },
                        firstName: 'Two-Awarded',
                        middleName: null,
                        nickname: null,
                        lastName: 'User',
                      },
                    ],
                  },
                },
                awardsCollection: {
                  total: 2,
                },
              },
              {
                linkedFrom: {
                  usersCollection: {
                    items: [
                      {
                        sys: {
                          id: 'user-with-1-award',
                        },
                        firstName: 'One-Awarded',
                        middleName: null,
                        nickname: null,
                        lastName: 'User',
                      },
                    ],
                  },
                },
                awardsCollection: {
                  total: 1,
                },
              },
            ],
          },
        },
      },
    ],
  },
});

export const getOSChampionResponse: () => OSChampionResponse = () => ({
  teamId: 'team-id-0',
  teamName: 'Team A',
  isTeamInactive: false,
  teamAwardsCount: 3,
  timeRange: 'all',
  users: [
    {
      id: 'user-with-2-awards',
      name: 'Two-Awarded User',
      awardsCount: 2,
    },
    {
      id: 'user-with-1-award',
      name: 'One-Awarded User',
      awardsCount: 1,
    },
  ],
});

export const getListOSChampionResponse = (): ListOSChampionResponse => ({
  total: 1,
  items: [getOSChampionResponse()],
});

export const getPreliminaryDataSharingQuery =
  (): FetchPreliminaryDataSharingQuery => ({
    teamsCollection: {
      total: 1,
      items: [
        {
          sys: {
            id: 'team-id-0',
          },
          displayName: 'Team A',
          inactiveSince: null,
          linkedFrom: {
            preliminaryDataSharingCollection: {
              total: 3,
              items: [
                {
                  linkedFrom: {
                    eventsCollection: {
                      items: [
                        {
                          startDate: '2024-01-15',
                        },
                      ],
                    },
                  },
                  preliminaryDataShared: true,
                },
                {
                  linkedFrom: {
                    eventsCollection: {
                      items: [
                        {
                          startDate: '2024-02-20',
                        },
                      ],
                    },
                  },
                  preliminaryDataShared: true,
                },
                {
                  linkedFrom: {
                    eventsCollection: {
                      items: [
                        {
                          startDate: '2023-06-10',
                        },
                      ],
                    },
                  },
                  preliminaryDataShared: false,
                },
              ],
            },
          },
        },
      ],
    },
  });

export const getPreliminaryDataSharingResponse: () => PreliminaryDataSharingResponse =
  () => ({
    teamId: 'team-id-0',
    teamName: 'Team A',
    isTeamInactive: false,
    percentShared: 67,
    limitedData: false,
    timeRange: 'all',
  });

export const getListPreliminaryDataSharingResponse =
  (): ListPreliminaryDataSharingResponse => ({
    total: 1,
    items: [getPreliminaryDataSharingResponse()],
  });

export const getAttendanceQuery = (): FetchAttendanceQuery => ({
  teamsCollection: {
    total: 1,
    items: [
      {
        sys: {
          id: 'team-id-0',
        },
        displayName: 'Team A',
        inactiveSince: null,
        linkedFrom: {
          attendanceCollection: {
            total: 3,
            items: [
              {
                linkedFrom: {
                  eventsCollection: {
                    items: [
                      {
                        startDate: '2024-01-15',
                      },
                    ],
                  },
                },
                attended: true,
              },
              {
                linkedFrom: {
                  eventsCollection: {
                    items: [
                      {
                        startDate: '2024-02-20',
                      },
                    ],
                  },
                },
                attended: true,
              },
              {
                linkedFrom: {
                  eventsCollection: {
                    items: [
                      {
                        startDate: '2023-06-10',
                      },
                    ],
                  },
                },
                attended: false,
              },
            ],
          },
        },
      },
    ],
  },
});

export const getAttendanceResponse: () => MeetingRepAttendanceResponse =
  () => ({
    teamId: 'team-id-0',
    teamName: 'Team A',
    isTeamInactive: false,
    attendancePercentage: 67,
    limitedData: false,
    timeRange: 'all',
  });

export const getListAttendanceResponse =
  (): ListMeetingRepAttendanceResponse => ({
    total: 1,
    items: [getAttendanceResponse()],
  });
