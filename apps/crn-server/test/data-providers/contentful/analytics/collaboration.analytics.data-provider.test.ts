import {
  FETCH_TEAM_COLLABORATION,
  FETCH_USER_RESEARCH_OUTPUTS,
  FETCH_USER_TOTAL_RESEARCH_OUTPUTS,
  getContentfulGraphqlClientMockServer,
} from '@asap-hub/contentful';

import { AnalyticsContentfulDataProvider } from '../../../../src/data-providers/contentful/analytics.data-provider';
import {
  getResearchOutputTeamCollaboration,
  getTeamCollaborationDataObject,
  getTeamCollaborationQuery,
  getUserResearchOutputsQuery,
  getUserTotalResearchOutputs,
} from '../../../fixtures/analytics.fixtures';
import { getContentfulGraphqlTeam } from '../../../fixtures/teams.fixtures';
import { getContentfulGraphqlClientMock } from '../../../mocks/contentful-graphql-client.mock';

const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
const analyticsDataProvider = new AnalyticsContentfulDataProvider(
  contentfulGraphqlClientMock,
);

describe('user collaboration', () => {
  beforeAll(() => {
    jest.useFakeTimers();

    jest.setSystemTime(new Date('2023-09-10T03:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Pagination', () => {
    test('Should fetch all users', async () => {
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce(getUserTotalResearchOutputs(2700))
        .mockResolvedValueOnce(getUserTotalResearchOutputs(2700))
        .mockResolvedValueOnce(getUserTotalResearchOutputs(2700))
        .mockResolvedValue(getUserResearchOutputsQuery());

      await analyticsDataProvider.fetchUserCollaboration({});

      expect(
        contentfulGraphqlClientMock.request.mock.calls.slice(0, 3),
      ).toEqual([
        [
          FETCH_USER_TOTAL_RESEARCH_OUTPUTS,
          expect.objectContaining({
            skip: 0,
          }),
        ],
        [
          FETCH_USER_TOTAL_RESEARCH_OUTPUTS,
          expect.objectContaining({
            skip: 1000,
          }),
        ],
        [
          FETCH_USER_TOTAL_RESEARCH_OUTPUTS,
          expect.objectContaining({
            skip: 2000,
          }),
        ],
      ]);
    });

    test('Should apply pagination parameters and split query accordingly', async () => {
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce(getUserTotalResearchOutputs())
        .mockResolvedValue(getUserResearchOutputsQuery());

      await analyticsDataProvider.fetchUserCollaboration({
        take: 7,
        skip: 11,
      });

      expect(contentfulGraphqlClientMock.request.mock.calls).toEqual([
        [
          FETCH_USER_TOTAL_RESEARCH_OUTPUTS,
          expect.objectContaining({
            skip: 0,
          }),
        ],
        [
          FETCH_USER_RESEARCH_OUTPUTS,
          expect.objectContaining({
            limit: 3,
            skip: 11,
          }),
        ],
        [
          FETCH_USER_RESEARCH_OUTPUTS,
          expect.objectContaining({
            limit: 3,
            skip: 14,
          }),
        ],
        [
          FETCH_USER_RESEARCH_OUTPUTS,
          expect.objectContaining({
            limit: 3,
            skip: 17,
          }),
        ],
      ]);
    });

    test('Should pass default pagination parameters and split query', async () => {
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce(getUserTotalResearchOutputs())
        .mockResolvedValue(getUserResearchOutputsQuery());

      await analyticsDataProvider.fetchUserCollaboration({});

      expect(contentfulGraphqlClientMock.request.mock.calls).toEqual([
        [
          FETCH_USER_TOTAL_RESEARCH_OUTPUTS,
          expect.objectContaining({
            skip: 0,
          }),
        ],
        [
          FETCH_USER_RESEARCH_OUTPUTS,
          expect.objectContaining({
            limit: 3,
            skip: 0,
          }),
        ],
        [
          FETCH_USER_RESEARCH_OUTPUTS,
          expect.objectContaining({
            limit: 3,
            skip: 3,
          }),
        ],
        [
          FETCH_USER_RESEARCH_OUTPUTS,
          expect.objectContaining({
            limit: 3,
            skip: 6,
          }),
        ],
        [
          FETCH_USER_RESEARCH_OUTPUTS,
          expect.objectContaining({
            limit: 3,
            skip: 9,
          }),
        ],
      ]);
    });
  });
});

describe('team collaboration', () => {
  beforeAll(() => {
    jest.useFakeTimers();

    jest.setSystemTime(new Date('2023-09-10T03:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  const graphqlTeam = getContentfulGraphqlTeam();
  const contentfulGraphqlClientMockServer =
    getContentfulGraphqlClientMockServer({
      Teams: () => ({
        ...graphqlTeam,
        linkedFrom: {
          ...graphqlTeam.linkedFrom,
          projectMembershipCollection: null,
        },
      }),
      ResearchOutputs: () => getResearchOutputTeamCollaboration()[0],
    });

  const analyticsDataProviderMockGraphql = new AnalyticsContentfulDataProvider(
    contentfulGraphqlClientMockServer,
  );

  describe('Pagination', () => {
    test('Should apply pagination parameters and split query accordingly', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValue(
        getTeamCollaborationQuery(),
      );

      await analyticsDataProvider.fetchTeamCollaboration({
        take: 13,
        skip: 3,
      });

      expect(contentfulGraphqlClientMock.request.mock.calls).toEqual([
        [
          FETCH_TEAM_COLLABORATION,
          expect.objectContaining({
            limit: 5,
            skip: 3,
          }),
        ],
        [
          FETCH_TEAM_COLLABORATION,
          expect.objectContaining({
            limit: 5,
            skip: 8,
          }),
        ],
        [
          FETCH_TEAM_COLLABORATION,
          expect.objectContaining({
            limit: 5,
            skip: 13,
          }),
        ],
      ]);
    });

    test('Should pass default pagination parameters and split query', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValue(
        getTeamCollaborationQuery(),
      );

      await analyticsDataProvider.fetchTeamCollaboration({});

      expect(contentfulGraphqlClientMock.request.mock.calls).toEqual([
        [
          FETCH_TEAM_COLLABORATION,
          expect.objectContaining({
            limit: 5,
            skip: 0,
          }),
        ],
        [
          FETCH_TEAM_COLLABORATION,
          expect.objectContaining({
            limit: 5,
            skip: 5,
          }),
        ],
      ]);
    });
  });

  test('Should fetch the list of team collaborations from Contentful GraphQl', async () => {
    const result =
      await analyticsDataProviderMockGraphql.fetchTeamCollaboration({
        take: 1,
      });

    expect(result).toMatchObject({
      total: 1,
      items: [getTeamCollaborationDataObject()],
    });
  });

  test('Should return an empty result when the client returns an empty list', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce({
      teamsCollection: {
        items: [],
        total: 0,
      },
    });

    const result = await analyticsDataProvider.fetchTeamCollaboration({});

    expect(result).toEqual({
      total: 0,
      items: [],
    });
  });

  test('Should return an empty result when the client returns teamsCollection as null', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce({
      teamsCollection: null,
    });

    const result = await analyticsDataProvider.fetchTeamCollaboration({});

    expect(result).toEqual({
      total: 0,
      items: [],
    });
  });

  test('Should return the count of outputs as zero when the client returns researchOutputCollection as null', async () => {
    const graphqlResponse = getTeamCollaborationQuery();
    graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.researchOutputsCollection =
      null;
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

    const result = await analyticsDataProvider.fetchTeamCollaboration({
      take: 1,
    });

    expect(result).toEqual({
      total: 1,
      items: [
        expect.objectContaining({
          outputsCoProducedWithin: {
            Article: 0,
            Bioinformatics: 0,
            Dataset: 0,
            'Lab Material': 0,
            Protocol: 0,
          },
          outputsCoProducedAcross: {
            byDocumentType: {
              Article: 0,
              Bioinformatics: 0,
              Dataset: 0,
              'Lab Material': 0,
              Protocol: 0,
            },
            byTeam: [],
          },
        }),
      ],
    });
  });

  test('Should only count research outputs with the "Public" sharing status when the "public" output type filter is applied', async () => {
    const graphqlResponse = getTeamCollaborationQuery();
    graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.researchOutputsCollection!.items =
      [
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          asapFunded: 'Yes',
          documentType: 'Article',
          sharingStatus: 'Network Only',
          labsCollection: {
            total: 3,
          },
        },
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          asapFunded: 'Yes',
          documentType: 'Article',
          sharingStatus: 'Public',
          labsCollection: {
            total: 3,
          },
        },
        {
          addedDate: '2023-09-03T03:00:00.000Z',
          asapFunded: 'Yes',
          documentType: 'Bioinformatics',
          sharingStatus: 'Public',
          labsCollection: {
            total: 3,
          },
        },
        {
          addedDate: '2023-09-03T03:00:00.000Z',
          asapFunded: 'Yes',
          documentType: 'Bioinformatics',
          sharingStatus: 'Network Only',
          labsCollection: {
            total: 3,
          },
        },
      ];
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

    const result = await analyticsDataProvider.fetchTeamCollaboration({
      take: 1,
      filter: {
        outputType: 'public',
      },
    });

    expect(result).toEqual({
      total: 1,
      items: [
        expect.objectContaining({
          outputsCoProducedWithin: {
            Article: 1,
            Bioinformatics: 1,
            Dataset: 0,
            'Lab Material': 0,
            Protocol: 0,
          },
        }),
      ],
    });
  });

  test('Should count every qualifying output in totalOutputs, not only the co-produced ones', async () => {
    const graphqlResponse = getTeamCollaborationQuery();
    graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.researchOutputsCollection!.items =
      [
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          documentType: 'Article',
          asapFunded: 'Yes',
          labsCollection: {
            total: 3,
          },
        },
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          documentType: 'Article',
          asapFunded: 'Yes',
          labsCollection: {
            total: 1,
          },
        },
      ];
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

    const result = await analyticsDataProvider.fetchTeamCollaboration({
      take: 1,
    });

    // Both articles count toward the total; only the multi-lab one is
    // co-produced, so a ratio taken from this one document reads 1 of 2.
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        outputsCoProducedWithin: expect.objectContaining({ Article: 1 }),
        totalOutputs: expect.objectContaining({ Article: 2 }),
      }),
    );
  });

  test('Should only count asap funded research outputs', async () => {
    const graphqlResponse = getTeamCollaborationQuery();
    graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.researchOutputsCollection!.items =
      [
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          documentType: 'Article',
          asapFunded: 'Not Sure',
          labsCollection: {
            total: 3,
          },
        },
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          documentType: 'Article',
          asapFunded: 'Yes',
          labsCollection: {
            total: 3,
          },
        },
        {
          addedDate: '2023-09-03T03:00:00.000Z',
          documentType: 'Bioinformatics',
          asapFunded: 'No',
          labsCollection: {
            total: 3,
          },
        },
        {
          addedDate: '2023-09-03T03:00:00.000Z',
          documentType: 'Bioinformatics',
          asapFunded: 'Yes',
          labsCollection: {
            total: 3,
          },
        },
      ];
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

    const result = await analyticsDataProvider.fetchTeamCollaboration({
      take: 1,
    });

    expect(result).toEqual({
      total: 1,
      items: [
        expect.objectContaining({
          outputsCoProducedWithin: {
            Article: 1,
            Bioinformatics: 1,
            Dataset: 0,
            'Lab Material': 0,
            Protocol: 0,
          },
        }),
      ],
    });
  });

  test('Should count research outputs with all sharing statuses when the "all" output type filter is applied', async () => {
    const graphqlResponse = getTeamCollaborationQuery();
    graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.researchOutputsCollection!.items =
      [
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          asapFunded: 'Yes',
          documentType: 'Article',
          sharingStatus: 'Network Only',
          labsCollection: {
            total: 3,
          },
        },
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          asapFunded: 'Yes',
          documentType: 'Article',
          sharingStatus: 'Public',
          labsCollection: {
            total: 3,
          },
        },
        {
          addedDate: '2023-09-03T03:00:00.000Z',
          asapFunded: 'Yes',
          documentType: 'Bioinformatics',
          sharingStatus: 'Public',
          labsCollection: {
            total: 3,
          },
        },
        {
          addedDate: '2023-09-03T03:00:00.000Z',
          asapFunded: 'Yes',
          documentType: 'Bioinformatics',
          sharingStatus: 'Network Only',
          labsCollection: {
            total: 3,
          },
        },
      ];
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

    const result = await analyticsDataProvider.fetchTeamCollaboration({
      take: 1,
      filter: {
        outputType: 'all',
      },
    });

    expect(result).toEqual({
      total: 1,
      items: [
        expect.objectContaining({
          outputsCoProducedWithin: {
            Article: 2,
            Bioinformatics: 2,
            Dataset: 0,
            'Lab Material': 0,
            Protocol: 0,
          },
        }),
      ],
    });
  });

  describe('within team', () => {
    test('Should return a count of 2 if client has two outputs of the same document type with multiple labs', async () => {
      const graphqlResponse = getTeamCollaborationQuery();
      const researchOutputs = [
        {
          addedDate: '2023-09-01T03:00:00.000Z',
          asapFunded: 'Yes',
          createdDate: '',
          documentType: 'Article',
          labsCollection: {
            total: 3,
          },
          teamsCollection: {
            items: [],
          },
        },
        {
          addedDate: '2023-08-30T03:00:00.000Z',
          asapFunded: 'Yes',
          createdDate: '',
          documentType: 'Article',
          labsCollection: {
            total: 3,
          },
          teamsCollection: {
            items: [],
          },
        },
        {
          addedDate: '2023-09-01T03:00:00.000Z',
          asapFunded: 'Yes',
          createdDate: '',
          documentType: 'Protocol',
          labsCollection: {
            total: 1,
          },
          teamsCollection: {
            items: [],
          },
        },
        {
          addedDate: '2023-07-01T03:00:00.000Z',
          asapFunded: 'Yes',
          createdDate: '',
          documentType: 'Article',
          labsCollection: {
            total: 3,
          },
          teamsCollection: {
            items: [],
          },
        },
      ];

      graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.researchOutputsCollection =
        {
          items: researchOutputs,
        };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        graphqlResponse,
      );

      const result = await analyticsDataProvider.fetchTeamCollaboration({
        take: 1,
      });

      expect(result).toEqual({
        total: 1,
        items: [
          expect.objectContaining({
            outputsCoProducedWithin: {
              Article: 3,
              Bioinformatics: 0,
              Dataset: 0,
              'Lab Material': 0,
              Protocol: 0,
            },
          }),
        ],
      });
    });
  });

  describe('across teams', () => {
    test('Should return a count of 2 if client has two outputs of the same document type with multiple teams', async () => {
      const graphqlResponse = getTeamCollaborationQuery();
      const researchOutputs = [
        {
          addedDate: '2023-09-01T03:00:00.000Z',
          asapFunded: 'Yes',
          createdDate: '',
          documentType: 'Article',
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
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          asapFunded: 'Yes',
          createdDate: '',
          documentType: 'Article',
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
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          asapFunded: 'Yes',
          createdDate: '',
          documentType: 'Article',
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
            ],
          },
        },
      ];
      graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.researchOutputsCollection =
        {
          items: researchOutputs,
        };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        graphqlResponse,
      );

      const result = await analyticsDataProvider.fetchTeamCollaboration({
        take: 1,
      });

      expect(result).toEqual({
        total: 1,
        items: [
          expect.objectContaining({
            outputsCoProducedAcross: {
              byDocumentType: {
                Article: 2,
                Bioinformatics: 0,
                Dataset: 0,
                'Lab Material': 0,
                Protocol: 0,
              },
              byTeam: [
                {
                  id: 'team-2',
                  name: 'Team B',
                  isInactive: false,
                  Article: 2,
                  Bioinformatics: 0,
                  Dataset: 0,
                  'Lab Material': 0,
                  Protocol: 0,
                },
              ],
            },
          }),
        ],
      });
    });

    test('Should group outputs by team in sorted order (team name asc)', async () => {
      const graphqlResponse = getTeamCollaborationQuery();
      const researchOutputs = [
        {
          addedDate: '2023-09-01T03:00:00.000Z',
          asapFunded: 'Yes',
          createdDate: '',
          documentType: 'Article',
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
                displayName: 'Team C',
                inactiveSince: null,
              },
              {
                sys: {
                  id: 'team-3',
                },
                displayName: 'Team B',
                inactiveSince: null,
              },
            ],
          },
        },
        {
          addedDate: '2023-09-05T03:00:00.000Z',
          asapFunded: 'Yes',
          createdDate: '',
          documentType: 'Article',
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
                displayName: 'Team C',
                inactiveSince: null,
              },
            ],
          },
        },
      ];
      graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.researchOutputsCollection =
        {
          items: researchOutputs,
        };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        graphqlResponse,
      );

      const result = await analyticsDataProvider.fetchTeamCollaboration({
        take: 1,
      });

      expect(result).toEqual({
        total: 1,
        items: [
          expect.objectContaining({
            outputsCoProducedAcross: {
              byDocumentType: {
                Article: 2,
                Bioinformatics: 0,
                Dataset: 0,
                'Lab Material': 0,
                Protocol: 0,
              },
              byTeam: [
                {
                  id: 'team-3',
                  name: 'Team B',
                  isInactive: false,
                  Article: 1,
                  Bioinformatics: 0,
                  Dataset: 0,
                  'Lab Material': 0,
                  Protocol: 0,
                },
                {
                  id: 'team-2',
                  name: 'Team C',
                  isInactive: false,
                  Article: 2,
                  Bioinformatics: 0,
                  Dataset: 0,
                  'Lab Material': 0,
                  Protocol: 0,
                },
              ],
            },
          }),
        ],
      });
    });
  });
});
