import { GraphQLError } from 'graphql';
import {
  getContentfulGraphqlClientMockServer,
  Environment,
} from '@asap-hub/contentful';

import {
  getContentfulGraphql,
  getContentfulGraphqlTeamMembers,
  getContentfulGraphqlTeamMemberLabs,
  getContentfulTeamsGraphqlResponse,
  getTeamDataObject,
  getTeamListItemDataObject,
  getContentfulGraphqlTeamById,
  getContentfulGraphqlTeam,
  getContentfulGraphqlPublicTeam,
  getContentfulGraphqlPublicTeamById,
  getPublicTeamListItemDataObject,
  getContentfulGraphqlTeamProjectById,
} from '../../fixtures/teams.fixtures';
import { getContentfulGraphqlClientMock } from '../../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../../mocks/contentful-rest-client.mock';
import { TeamContentfulDataProvider } from '../../../src/data-providers/contentful/team.data-provider';
import {
  getContentfulGraphqlTeamAwardMetrics,
  getListTeamAwardMetricsDataObject,
} from '../../fixtures/teams.fixtures';
import { getEntry } from '../../fixtures/contentful.fixtures';
import { TeamRole } from '@asap-hub/model';
import { DateTime } from 'luxon';

describe('Teams data provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const teamDataProvider = new TeamContentfulDataProvider(
    contentfulGraphqlClientMock,
    contentfulRestClientMock,
  );

  const contentfulGraphqlClientMockServer =
    getContentfulGraphqlClientMockServer(getContentfulGraphql());

  const teamDataProviderMock = new TeamContentfulDataProvider(
    contentfulGraphqlClientMockServer,
    contentfulRestClientMock,
  );

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Create method', () => {
    test('should throw an error', async () => {
      await expect(teamDataProvider.create()).rejects.toThrow(
        'Method not implemented.',
      );
    });
  });

  describe('Fetch method', () => {
    test('Should fetch the list of teams from Contentful GraphQl', async () => {
      const result = await teamDataProviderMock.fetch({});

      expect(result.items[0]).toMatchObject(getTeamListItemDataObject());
    });

    test('Should return an empty result when no teams exist', async () => {
      const contentfulGraphQLResponse = getContentfulTeamsGraphqlResponse();
      contentfulGraphQLResponse.teamsCollection!.total = 0;
      contentfulGraphQLResponse.teamsCollection!.items = [];

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetch({});

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    test('Should throw an error with a specific error message when the graphql client throws one', async () => {
      contentfulGraphqlClientMock.request.mockRejectedValueOnce(
        new GraphQLError('some error message'),
      );

      await expect(teamDataProvider.fetch({})).rejects.toThrow(
        'some error message',
      );
    });

    test('Should return an empty result when the query is returned as null', async () => {
      const contentfulGraphQLResponse = getContentfulTeamsGraphqlResponse();
      contentfulGraphQLResponse.teamsCollection = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetch({});

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    test('Should use default query params when request does not have any', async () => {
      const contentfulGraphQLResponse = getContentfulTeamsGraphqlResponse();

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetch({});

      expect(result).toEqual({
        total: 1,
        items: [getTeamListItemDataObject()],
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          limit: 8,
          order: ['displayName_ASC'],
          skip: 0,
          where: {},
        }),
      );
    });

    describe('Active Filter', () => {
      test('Should return active teams only when active filter is true', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          filter: ['Active'],
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: { inactiveSince_exists: false },
          }),
        );
      });

      test('Should return inactive teams only when active filter is false', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          filter: ['Inactive'],
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: { inactiveSince_exists: true },
          }),
        );
      });

      test('Should return all teams when both Active and Inactive filters are present', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          filter: ['Active', 'Inactive'],
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: {},
          }),
        );
      });

      test('Should return all teams when both Inactive and Active filters are present (order independence)', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          filter: ['Inactive', 'Active'],
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: {},
          }),
        );
      });

      test('Should return all teams when filter is an empty array', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          filter: [],
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: {},
          }),
        );
      });

      test('Should handle duplicate filter values correctly', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          filter: ['Active', 'Active', 'Inactive', 'Inactive'],
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: {},
          }),
        );
      });

      test('Should return all teams when filter contains invalid values', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          filter: ['Invalid', 'Unknown'] as unknown as 'Active'[],
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: {},
          }),
        );
      });
    });

    describe('Team Type Filter', () => {
      test('Should filter by Discovery Team when teamType is specified', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          teamType: 'Discovery Team',
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: { teamType: 'Discovery Team' },
          }),
        );
      });

      test('Should filter by Resource Team when teamType is specified', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          teamType: 'Resource Team',
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: { teamType: 'Resource Team' },
          }),
        );
      });

      test('Should not filter by teamType when teamType is undefined', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: {},
          }),
        );
      });

      test('Should combine teamType with Active filter', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          teamType: 'Discovery Team',
          filter: ['Active'],
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: {
              teamType: 'Discovery Team',
              inactiveSince_exists: false,
            },
          }),
        );
      });

      test('Should combine teamType with Inactive filter and search', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const search = 'test query';
        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          teamType: 'Resource Team',
          filter: ['Inactive'],
          search,
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: {
              OR: [
                { displayName_contains: 'test' },
                { displayName_contains: 'query' },
              ],
              inactiveSince_exists: true,
              teamType: 'Resource Team',
            },
          }),
        );
      });
    });

    describe('Text Filter', () => {
      test('Should query data properly when passing search param and active filter is not set', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const search = 'Tony Stark';
        const result = await teamDataProvider.fetch({
          search,
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 0,
            where: {
              OR: [
                { displayName_contains: 'Tony' },
                { displayName_contains: 'Stark' },
              ],
            },
          }),
        );
      });

      test('Should query data properly when passing search param and active filter is set', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const search = 'Tony Stark';
        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          search,
          filter: ['Inactive'],
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: {
              OR: [
                { displayName_contains: 'Tony' },
                { displayName_contains: 'Stark' },
              ],
              inactiveSince_exists: true,
            },
          }),
        );
      });
    });

    describe('Team Ids Filter', () => {
      const teamIds = ['team-id-0'];
      test('Should query data properly when passing team id param and other filters are not set', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const result = await teamDataProvider.fetch({
          teamIds,
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 0,
            where: { sys: { id_in: teamIds } },
          }),
        );
      });

      test('Should query data properly when passing team id param and other filters are set', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulTeamsGraphqlResponse(),
        );

        const search = 'Tony Stark';
        const result = await teamDataProvider.fetch({
          take: 8,
          skip: 5,
          search,
          filter: ['Inactive'],
          teamIds,
        });

        expect(result).toEqual({
          total: 1,
          items: [getTeamListItemDataObject()],
        });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['displayName_ASC'],
            skip: 5,
            where: {
              OR: [
                { displayName_contains: 'Tony' },
                { displayName_contains: 'Stark' },
              ],
              inactiveSince_exists: true,
              sys: { id_in: teamIds },
            },
          }),
        );
      });
    });
    describe('team members', () => {
      test('should ignore falsy items in the team membership list', async () => {
        const team = {
          ...getContentfulGraphqlTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 3,
              items: [
                null,
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [null],
                    },
                  },
                },
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          alumniSinceDate: null,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetch({});

        expect(result).toEqual({
          items: [expect.objectContaining({ memberCount: 1 })],
          total: 1,
        });
      });

      test('should filter non onboarded users', async () => {
        const team = {
          ...getContentfulGraphqlTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 3,
              items: [
                {
                  role: 'Collaborating PI',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: { id: 'onboarded-user-1' },
                          alumniSinceDate: null,
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
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          onboarded: false,
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: { id: 'onboarded-user-2' },
                          alumniSinceDate: null,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetch({});

        expect(result).toEqual({
          items: [expect.objectContaining({ memberCount: 2 })],
          total: 1,
        });
      });

      test('should not count past members (alumni or inactive) towards memberCount', async () => {
        const team = {
          ...getContentfulGraphqlTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 3,
              items: [
                {
                  role: 'Collaborating PI',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: { id: 'active-user' },
                          alumniSinceDate: null,
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
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: { id: 'alumni-user' },
                          alumniSinceDate: '2020-09-23T20:45:22.000Z',
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Project Manager',
                  inactiveSinceDate: '2021-01-01T00:00:00.000Z',
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: { id: 'inactive-user' },
                          alumniSinceDate: null,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetch({});

        expect(result).toEqual({
          items: [expect.objectContaining({ memberCount: 1 })],
          total: 1,
        });
      });

      test('should count a user with multiple memberships only once', async () => {
        const team = {
          ...getContentfulGraphqlTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 2,
              items: [
                {
                  role: 'Lead PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: { id: 'duplicate-user' },
                          alumniSinceDate: null,
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: { id: 'duplicate-user' },
                          alumniSinceDate: null,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetch({});

        expect(result).toEqual({
          items: [expect.objectContaining({ memberCount: 1 })],
          total: 1,
        });
      });
    });

    describe('labs', () => {
      test('should add a lab count for PI members whose labs they PI', async () => {
        const team = {
          ...getContentfulGraphqlTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Lead PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          labsCollection: {
                            items: [
                              {
                                sys: { id: 'lab-1' },
                                labPi: { sys: { id: 'user-id-1' } },
                              },
                              {
                                sys: { id: 'lab-2' },
                                labPi: { sys: { id: 'user-id-1' } },
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
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetch({});

        expect(result).toEqual({
          items: [expect.objectContaining({ labCount: 2 })],
          total: 1,
        });
      });
      test('should ignore null labs', async () => {
        const team = {
          ...getContentfulGraphqlTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Co-PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          labsCollection: {
                            items: [
                              null,
                              {
                                sys: { id: 'lab-2' },
                                labPi: { sys: { id: 'user-id-1' } },
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
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetch({});

        expect(result).toEqual({
          items: [expect.objectContaining({ labCount: 1 })],
          total: 1,
        });
      });
      test('should include only unique labs in the lab count', async () => {
        const team = {
          ...getContentfulGraphqlTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 2,
              items: [
                {
                  role: 'Lead PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          labsCollection: {
                            items: [
                              {
                                sys: { id: 'lab-1' },
                                labPi: { sys: { id: 'user-id-1' } },
                              },
                              {
                                sys: { id: 'lab-2' },
                                labPi: { sys: { id: 'user-id-1' } },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Collaborating PI',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          sys: { id: 'user-id-2' },
                          onboarded: true,
                          labsCollection: {
                            items: [
                              {
                                sys: { id: 'lab-1' },
                                labPi: { sys: { id: 'user-id-2' } },
                              },
                              {
                                sys: { id: 'lab-3' },
                                labPi: { sys: { id: 'user-id-2' } },
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
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });
        const result = await teamDataProvider.fetch({});

        expect(result).toEqual({
          items: [expect.objectContaining({ labCount: 3 })],
          total: 1,
        });
      });
      test('should not count labs from non-PI members', async () => {
        const team = {
          ...getContentfulGraphqlTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          labsCollection: {
                            items: [
                              {
                                sys: { id: 'lab-1' },
                                labPi: { sys: { id: 'user-id-1' } },
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
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetch({});

        expect(result).toEqual({
          items: [expect.objectContaining({ labCount: 0 })],
          total: 1,
        });
      });
      test('should not count labs where PI member is not the lab PI', async () => {
        const team = {
          ...getContentfulGraphqlTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Lead PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          labsCollection: {
                            items: [
                              {
                                sys: { id: 'lab-1' },
                                labPi: { sys: { id: 'other-user' } },
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
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetch({});

        expect(result).toEqual({
          items: [expect.objectContaining({ labCount: 0 })],
          total: 1,
        });
      });
    });
  });

  describe('FetchPublicTeams method', () => {
    test('Should fetch the list of teams from Contentful GraphQl', async () => {
      const contentfulGraphQLResponse = {
        teamsCollection: {
          total: 1,
          items: [getContentfulGraphqlPublicTeam()],
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetchPublicTeams({});

      expect(result).toEqual({
        total: 1,
        items: [getPublicTeamListItemDataObject()],
      });
    });

    test('Should return an empty result when no teams exist', async () => {
      const contentfulGraphQLResponse = getContentfulTeamsGraphqlResponse();
      contentfulGraphQLResponse.teamsCollection!.total = 0;
      contentfulGraphQLResponse.teamsCollection!.items = [];

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetchPublicTeams({});

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    test('Should return an empty result when the query is returned as null', async () => {
      const contentfulGraphQLResponse = getContentfulTeamsGraphqlResponse();
      contentfulGraphQLResponse.teamsCollection = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetchPublicTeams({});

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    test('Should throw an error with a specific error message when the graphql client throws one', async () => {
      contentfulGraphqlClientMock.request.mockRejectedValueOnce(
        new GraphQLError('some error message'),
      );

      await expect(teamDataProvider.fetchPublicTeams({})).rejects.toThrow(
        'some error message',
      );
    });

    test('Should use default query params when request does not have any', async () => {
      const contentfulGraphQLResponse = {
        teamsCollection: {
          total: 1,
          items: [getContentfulGraphqlPublicTeam()],
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetchPublicTeams({});

      expect(result).toEqual({
        total: 1,
        items: [getPublicTeamListItemDataObject()],
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          limit: 8,
          order: ['displayName_ASC'],
          skip: 0,
        }),
      );
    });

    describe('team members', () => {
      test('should ignore falsy items in the team membership list', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 3,
              items: [
                null,
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [null],
                    },
                  },
                },
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          alumniSinceDate: null,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetchPublicTeams({});

        expect(result).toEqual({
          items: [expect.objectContaining({ noOfTeamMembers: 1 })],
          total: 1,
        });
      });

      test('should filter out non onboarded users', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeam(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Key Personnel',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          alumniSinceDate: null,
                          onboarded: false,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetchPublicTeams({});

        expect(result).toEqual({
          items: [expect.objectContaining({ noOfTeamMembers: 0 })],
          total: 1,
        });
      });

      test('should return all members as inactive if team is inactive', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeam(),
          inactiveSince: '2020-09-23T20:45:22.000Z',
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Key Personnel',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: {
                            id: 'user-id-1',
                          },
                          alumniSinceDate: null,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamsCollection: {
            total: 1,
            items: [team],
          },
        });

        const result = await teamDataProvider.fetchPublicTeams({});

        expect(result).toEqual({
          items: [
            expect.objectContaining({
              noOfTeamMembers: 0,
              inactiveTeamMembers: ['user-id-1'],
            }),
          ],
          total: 1,
        });
      });
    });
  });

  describe('FetchPublicTeamById method', () => {
    test('Should fetch the team from Contentful GraphQl', async () => {
      const teamId = 'team-id-0';
      const contentfulGraphQLResponse = {
        teams: getContentfulGraphqlPublicTeamById(),
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetchPublicTeamById(teamId);

      expect(result).toMatchObject({
        id: 'team-id-0',
        displayName: 'Team A',
        teamStatus: 'Active',
        projectTitle: 'Test Project Title',
        projectSummary: 'Test project summary',
        researchTheme: 'PD Functional Genomics',
        tags: [
          { id: 'tag-1', name: 'Animal resources 1' },
          { id: 'tag-2', name: 'Animal resources 2' },
        ],
        labCount: 0,
        labs: [],
      });
      expect(result?.members).toHaveLength(3);
      expect(result?.members[0]?.role).toBe('Lead PI (Core Leadership)');
    });

    test('Should return null when the team is not found', async () => {
      const teamId = 'not-found';

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        teams: null,
      });

      const result = await teamDataProvider.fetchPublicTeamById(teamId);

      expect(result).toBeNull();
    });

    test('Should throw an error with a specific error message when the graphql client throws one', async () => {
      const id = 'some-id';
      contentfulGraphqlClientMock.request.mockRejectedValueOnce(
        new GraphQLError('some error message'),
      );

      await expect(teamDataProvider.fetchPublicTeamById(id)).rejects.toThrow(
        'some error message',
      );
    });

    test('Should handle team with no project data', async () => {
      const team = {
        ...getContentfulGraphqlPublicTeamById(),
        linkedFrom: {
          ...getContentfulGraphqlPublicTeamById().linkedFrom,
          projectMembershipCollection: {
            items: [],
          },
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        teams: team,
      });

      const result = await teamDataProvider.fetchPublicTeamById('team-id');

      expect(result).toMatchObject({
        projectTitle: '',
        projectSummary: undefined,
        tags: [],
      });
    });

    test('Should handle inactive team', async () => {
      const team = {
        ...getContentfulGraphqlPublicTeamById(),
        inactiveSince: '2020-09-23T20:45:22.000Z',
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        teams: team,
      });

      const result = await teamDataProvider.fetchPublicTeamById('team-id');

      expect(result?.teamStatus).toBe('Inactive');
      expect(result?.inactiveSince).toBe('2020-09-23T20:45:22.000Z');
    });

    describe('team members', () => {
      test('should ignore falsy items in the team membership list', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeamById(),
          linkedFrom: {
            ...getContentfulGraphqlPublicTeamById().linkedFrom,
            teamMembershipCollection: {
              items: [
                null,
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      items: [null],
                    },
                  },
                },
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
                          nickname: null,
                          lastName: 'Hardy',
                          alumniSinceDate: null,
                          avatar: null,
                          onboarded: true,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.members).toHaveLength(1);
        expect(result?.members[0]?.firstName).toBe('Tom');
        expect(result?.members[0]?.lastName).toBe('Hardy');
      });

      test('should filter non onboarded users', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeamById(),
          linkedFrom: {
            ...getContentfulGraphqlPublicTeamById().linkedFrom,
            teamMembershipCollection: {
              items: [
                {
                  role: 'Key Personnel',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      items: [
                        {
                          sys: {
                            id: 'user-id-1',
                          },
                          firstName: 'Tom',
                          nickname: null,
                          lastName: 'Hardy',
                          alumniSinceDate: null,
                          avatar: null,
                          onboarded: false,
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
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
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.members).toHaveLength(1);
        expect(result?.members[0]?.id).toBe('user-id-2');
      });

      test('should filter members without role', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeamById(),
          linkedFrom: {
            ...getContentfulGraphqlPublicTeamById().linkedFrom,
            teamMembershipCollection: {
              items: [
                {
                  role: null,
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      items: [
                        {
                          sys: {
                            id: 'user-id-1',
                          },
                          firstName: 'Tom',
                          nickname: null,
                          lastName: 'Hardy',
                          alumniSinceDate: null,
                          avatar: null,
                          onboarded: true,
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
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
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.members).toHaveLength(1);
        expect(result?.members[0]?.id).toBe('user-id-2');
      });

      test('should extract all member fields correctly', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeamById(),
          linkedFrom: {
            ...getContentfulGraphqlPublicTeamById().linkedFrom,
            teamMembershipCollection: {
              items: [
                {
                  role: 'Lead PI (Core Leadership)',
                  inactiveSinceDate: '2020-09-23T20:45:22.000Z',
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
                          alumniSinceDate: '2021-01-01T00:00:00.000Z',
                          avatar: {
                            url: 'https://example.com/avatar.jpg',
                          },
                          onboarded: true,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.members[0]).toMatchObject({
          id: 'user-id-1',
          firstName: 'Tom',
          lastName: 'Hardy',
          email: '',
          role: 'Lead PI (Core Leadership)',
          inactiveSinceDate: '2020-09-23T20:45:22.000Z',
          alumniSinceDate: '2021-01-01T00:00:00.000Z',
          avatarUrl: 'https://example.com/avatar.jpg',
          displayName: 'Tom (Tim) Hardy',
          labs: [],
        });
      });

      test('should handle members with null/undefined fields', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeamById(),
          linkedFrom: {
            ...getContentfulGraphqlPublicTeamById().linkedFrom,
            teamMembershipCollection: {
              items: [
                {
                  role: 'Key Personnel',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      items: [
                        {
                          sys: {
                            id: 'user-id-1',
                          },
                          firstName: null,
                          nickname: null,
                          lastName: null,
                          alumniSinceDate: null,
                          avatar: null,
                          onboarded: true,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.members[0]).toMatchObject({
          id: 'user-id-1',
          firstName: '',
          lastName: '',
          email: '',
          role: 'Key Personnel',
          inactiveSinceDate: undefined,
          alumniSinceDate: null,
          avatarUrl: undefined,
          displayName: ' ',
          labs: [],
        });
      });

      test('should sort team members by role priority', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeamById(),
          linkedFrom: {
            ...getContentfulGraphqlPublicTeamById().linkedFrom,
            teamMembershipCollection: {
              items: [
                {
                  role: 'Key Personnel',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      items: [
                        {
                          sys: {
                            id: 'user-id-1',
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
                  role: 'Lead PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      items: [
                        {
                          sys: {
                            id: 'user-id-2',
                          },
                          firstName: 'Tom',
                          nickname: null,
                          lastName: 'Hardy',
                          alumniSinceDate: null,
                          avatar: null,
                          onboarded: true,
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Project Manager',
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
                          alumniSinceDate: null,
                          avatar: null,
                          onboarded: true,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.members).toEqual([
          expect.objectContaining({
            role: 'Lead PI (Core Leadership)',
            id: 'user-id-2',
          }),
          expect.objectContaining({ role: 'Project Manager', id: 'user-id-3' }),
          expect.objectContaining({ role: 'Key Personnel', id: 'user-id-1' }),
        ]);
      });
    });

    describe('project data', () => {
      test('should extract project title and summary', async () => {
        const team = getContentfulGraphqlPublicTeamById();

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.projectTitle).toBe('Test Project Title');
        expect(result?.projectSummary).toBe('Test project summary');
      });

      test('should parse research tags', async () => {
        const team = getContentfulGraphqlPublicTeamById();

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.tags).toEqual([
          { id: 'tag-1', name: 'Animal resources 1' },
          { id: 'tag-2', name: 'Animal resources 2' },
        ]);
      });

      test('should handle missing project data', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeamById(),
          linkedFrom: {
            ...getContentfulGraphqlPublicTeamById().linkedFrom,
            projectMembershipCollection: {
              items: [],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.projectTitle).toBe('');
        expect(result?.projectSummary).toBeUndefined();
        expect(result?.tags).toEqual([]);
      });
    });

    describe('team fields', () => {
      test('should extract all team fields correctly', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeamById(),
          sys: {
            id: 'team-id-123',
            publishedAt: '2021-01-01T00:00:00.000Z',
          },
          displayName: 'Test Team Name',
          inactiveSince: null,
          researchTheme: {
            name: 'Test Research Theme',
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result).toMatchObject({
          id: 'team-id-123',
          displayName: 'Test Team Name',
          inactiveSince: undefined,
          teamStatus: 'Active',
          researchTheme: 'Test Research Theme',
          teamType: 'Discovery Team',
          lastModifiedDate: '2021-01-01T00:00:00.000Z',
          labCount: 0,
          labs: [],
        });
      });

      test('should handle inactive team', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeamById(),
          inactiveSince: '2020-09-23T20:45:22.000Z',
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.inactiveSince).toBe('2020-09-23T20:45:22.000Z');
        expect(result?.teamStatus).toBe('Inactive');
      });

      test('should handle missing research theme', async () => {
        const team = {
          ...getContentfulGraphqlPublicTeamById(),
          researchTheme: null,
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teams: team,
        });

        const result = await teamDataProvider.fetchPublicTeamById('team-id');

        expect(result?.researchTheme).toBeUndefined();
      });
    });
  });

  describe('Fetch-by-id method', () => {
    const mockFetchByIdGraphqlResponses = (
      teamResponse: any,
      projectResponse: any = getContentfulGraphqlTeamProjectById(),
    ) => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        teams: teamResponse,
      });

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        teams: projectResponse,
      });
    };

    test('Should fetch the team from Contentful GraphQl', async () => {
      const teamId = 'team-id-0';

      const expectedResult = getTeamDataObject();

      const teamById = true;
      const contentfulGraphqlClientMockServer =
        getContentfulGraphqlClientMockServer({
          ...getContentfulGraphql(teamById, teamId),
        });

      const teamByIdDataProviderMock = new TeamContentfulDataProvider(
        contentfulGraphqlClientMockServer,
        contentfulRestClientMock,
      );

      const result = await teamByIdDataProviderMock.fetchById(teamId);

      expect(result).toMatchObject(expectedResult);
    });

    test('Should return null when the team is not found', async () => {
      const teamId = 'not-found';

      const contentfulGraphQLResponse = getContentfulTeamsGraphqlResponse();
      contentfulGraphQLResponse.teamsCollection = null;

      contentfulGraphqlClientMock.request.mockResolvedValue(
        contentfulGraphQLResponse,
      );

      expect(await teamDataProvider.fetchById(teamId)).toBeNull();
    });

    test('Should throw an error with a specific error message when the graphql client throws one', async () => {
      const id = 'some-id';
      contentfulGraphqlClientMock.request.mockRejectedValueOnce(
        new GraphQLError('some error message'),
      );

      await expect(teamDataProvider.fetchById(id)).rejects.toThrow(
        'some error message',
      );
    });

    describe('team members', () => {
      test('should ignore falsy items in the team membership list', async () => {
        const id = 'some-id';
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 3,
              items: [
                null,
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [null],
                    },
                  },
                },
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [getContentfulGraphqlTeamMembers()],
                    },
                  },
                },
              ],
            },
          },
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById(id);

        expect(result?.members).toHaveLength(1);
        expect(result?.members[0]?.firstName).toEqual('Tom');
        expect(result?.members[0]?.lastName).toEqual('Hardy');
      });

      test('should filter non onboarded users', async () => {
        const id = 'some-id';
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 3,
              items: [
                {
                  role: 'Collaborating PI',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [getContentfulGraphqlTeamMembers()],
                    },
                  },
                },
                {
                  role: 'Key Personnel',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          onboarded: false,
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [getContentfulGraphqlTeamMembers()],
                    },
                  },
                },
              ],
            },
          },
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById(id);

        expect(result?.members).toHaveLength(2);
        expect(result?.members[0]?.role).toEqual('Project Manager');
        expect(result?.members[1]?.role).toEqual('Collaborating PI');
      });

      test('should sort team members by role priority', async () => {
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Key Personnel',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: {
                            id: '1',
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Lead PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: {
                            id: '2',
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          sys: {
                            id: '3',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById('1');
        expect(result?.members).toEqual([
          expect.objectContaining({
            role: 'Lead PI (Core Leadership)',
            id: '2',
          }),
          expect.objectContaining({ role: 'Project Manager', id: '3' }),
          expect.objectContaining({ role: 'Key Personnel', id: '1' }),
        ]);
      });

      test('should sort team members with the same role priority by last name', async () => {
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Key Personnel',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          lastName: 'Baker',
                          sys: {
                            id: '1',
                          },
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
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          lastName: 'Cooper',
                          sys: {
                            id: '2',
                          },
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
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          lastName: 'Anderson',
                          sys: {
                            id: '3',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById('1');
        expect(result?.members).toEqual([
          expect.objectContaining({ lastName: 'Anderson' }),
          expect.objectContaining({ lastName: 'Baker' }),
          expect.objectContaining({ lastName: 'Cooper' }),
        ]);
      });
    });

    describe('labs', () => {
      test('should add a lab count to the team response', async () => {
        const id = 'some-id';
        const team = getContentfulGraphqlTeamById();

        mockFetchByIdGraphqlResponses(team);

        const result = await teamDataProvider.fetchById(id);

        expect(result?.labCount).toEqual(2);
        expect(result?.labs).toEqual([
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
        ]);
      });
      test('should ignore null labs', async () => {
        const id = 'some-id';
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Lead PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          labsCollection: {
                            total: 2,
                            items: [
                              null,
                              ...getContentfulGraphqlTeamMemberLabs()!.items,
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
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById(id);

        expect(result?.labCount).toEqual(2);
      });
      test('should include only unique labs in the lab count', async () => {
        const id = 'some-id';
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 2,
              items: [
                {
                  role: 'Lead PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          labsCollection: getContentfulGraphqlTeamMemberLabs(),
                        },
                      ],
                    },
                  },
                },
                {
                  role: 'Co-PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          sys: {
                            id: 'user-id-2',
                          },
                          email: 'T@rdy.io',
                          firstName: 'Tim',
                          lastName: 'Hardy',
                          avatar: null,
                          alumniSinceDate: null,
                          onboarded: true,
                          labsCollection: {
                            items: [
                              {
                                sys: { id: 'cd7be4902' },
                                name: 'Brighton',
                                labPi: { sys: { id: 'user-id-2' } },
                              },
                              {
                                sys: { id: 'cd7be4903' },
                                name: 'Liverpool',
                                labPi: { sys: { id: 'user-id-2' } },
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
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById(id);

        expect(result?.labCount).toEqual(2);
      });
      test('should not include labs from non-PI members', async () => {
        const id = 'some-id';
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
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
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById(id);

        expect(result?.labCount).toEqual(0);
        expect(result?.labs).toEqual([]);
      });
      test('should not include labs where PI member is not the lab PI', async () => {
        const id = 'some-id';
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                {
                  role: 'Lead PI (Core Leadership)',
                  inactiveSinceDate: null,
                  linkedFrom: {
                    usersCollection: {
                      total: 1,
                      items: [
                        {
                          ...getContentfulGraphqlTeamMembers(),
                          labsCollection: {
                            items: [
                              {
                                sys: { id: 'cd7be4902' },
                                name: 'Brighton',
                                labPi: { sys: { id: 'other-user' } },
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
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById(id);

        expect(result?.labCount).toEqual(0);
        expect(result?.labs).toEqual([]);
      });
    });

    describe('point of contact', () => {
      type GetTeamMembershipProps = {
        userId?: string;
        role?: TeamRole;
        inactiveSinceDate?: string | null;
        alumniSinceDate?: string | null;
      };

      const getTeamMembership = ({
        userId = 'user-id-1',
        role = 'Collaborating PI',
        inactiveSinceDate = null,
        alumniSinceDate = null,
      }: GetTeamMembershipProps) => {
        return {
          role,
          inactiveSinceDate,
          linkedFrom: {
            usersCollection: {
              total: 1,
              items: [
                {
                  sys: {
                    id: userId,
                  },
                  email: 'T@rdy.io',
                  firstName: 'Tim',
                  lastName: 'Hardy',
                  avatar: null,
                  alumniSinceDate,
                  labsCollection: getContentfulGraphqlTeamMemberLabs(),
                  onboarded: true,
                },
              ],
            },
          },
        };
      };

      test('should return point of contact as undefined when there is a PM but it is inactive', async () => {
        const id = 'some-id';
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 2,
              items: [
                getTeamMembership({ userId: 'non-pm-user' }),
                getTeamMembership({
                  userId: 'pm-user',
                  inactiveSinceDate: '2022-02-28T17:00:00.000Z',
                  role: 'Project Manager',
                }),
              ],
            },
          },
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById(id);

        expect(result!.pointOfContact).toBeUndefined();
      });

      test('should return point of contact as undefined when there is a PM but it is an alumni', async () => {
        const id = 'some-id';
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 2,
              items: [
                getTeamMembership({ userId: 'non-pm-user' }),
                getTeamMembership({
                  userId: 'pm-user',
                  alumniSinceDate: '2022-02-28T17:00:00.000Z',
                  role: 'Project Manager',
                }),
              ],
            },
          },
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById(id);

        expect(result!.pointOfContact).toBeUndefined();
      });

      test('should return point of contact from project contactEmail when available', async () => {
        const id = 'some-id';
        const projectContactEmail = 'project-contact@example.com';
        const teams = {
          ...getContentfulGraphqlTeamById(),
          linkedFrom: {
            teamMembershipCollection: {
              total: 1,
              items: [
                getTeamMembership({
                  userId: 'active-pm-user',
                  role: 'Project Manager',
                }),
              ],
            },
          },
        };

        const projectWithContactEmail = getContentfulGraphqlTeamProjectById();
        if (
          projectWithContactEmail.linkedFrom?.projectMembershipCollection
            ?.items[0]?.linkedFrom?.projectsCollection?.items[0]
        ) {
          projectWithContactEmail.linkedFrom.projectMembershipCollection.items[0].linkedFrom.projectsCollection.items[0].contactEmail =
            projectContactEmail;
        }

        mockFetchByIdGraphqlResponses(teams, projectWithContactEmail);

        const result = await teamDataProvider.fetchById(id);

        expect(result!.pointOfContact).toEqual(projectContactEmail);
      });
    });

    describe('supplementGrant', () => {
      const startDate = '2024-09-01T00:00:00.000-03:00';
      const endDate = '2024-09-16T00:00:00.000-03:00';
      beforeAll(() => {
        jest.useFakeTimers();
      });

      afterAll(() => {
        jest.useRealTimers();
      });

      beforeEach(async () => {
        const afterStartDate = DateTime.fromISO(startDate)
          .plus({ minutes: 1 })
          .toJSDate();
        jest.setSystemTime(afterStartDate);
      });

      test('should return supplementGrant when it exists and it has started', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlTeamById();
        const contentfulGraphQLTeamProjectResponse =
          getContentfulGraphqlTeamProjectById();

        contentfulGraphQLTeamProjectResponse.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!.projectsCollection!.items[0]!.supplementGrant =
          {
            title: 'Grant Title',
            description: 'Grant Description',
            startDate,
            endDate,
          };

        mockFetchByIdGraphqlResponses(
          contentfulGraphQLResponse,
          contentfulGraphQLTeamProjectResponse,
        );

        const result = await teamDataProvider.fetchById(id);

        expect(result!.supplementGrant).toEqual({
          description: 'Grant Description',
          proposalURL: undefined,
          title: 'Grant Title',
          startDate,
          endDate,
        });
      });

      test('should not return supplementGrant when it exists but it has not started', async () => {
        const beforeStartDate = DateTime.fromISO(startDate)
          .minus({ minutes: 1 })
          .toJSDate();
        jest.setSystemTime(beforeStartDate);

        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlTeamById();
        const contentfulGraphQLTeamProjectResponse =
          getContentfulGraphqlTeamProjectById();
        contentfulGraphQLTeamProjectResponse.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!.projectsCollection!.items[0]!.supplementGrant =
          {
            title: 'Grant Title',
            description: 'Grant Description',
            startDate,
            endDate,
          };

        mockFetchByIdGraphqlResponses(
          contentfulGraphQLResponse,
          contentfulGraphQLTeamProjectResponse,
        );

        const result = await teamDataProvider.fetchById(id);

        expect(result!.supplementGrant).toEqual(undefined);
      });

      test('should return supplementGrant proposal when it exists', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlTeamById();
        const contentfulGraphQLTeamProjectResponse =
          getContentfulGraphqlTeamProjectById();

        contentfulGraphQLTeamProjectResponse.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!.projectsCollection!.items[0]!.supplementGrant =
          {
            title: 'Grant Title',
            description: 'Grant Description',
            proposal: {
              sys: {
                id: 'proposal-id',
              },
            },
            startDate,
            endDate,
          };

        mockFetchByIdGraphqlResponses(
          contentfulGraphQLResponse,
          contentfulGraphQLTeamProjectResponse,
        );

        const result = await teamDataProvider.fetchById(id);

        expect(result!.supplementGrant).toEqual({
          description: 'Grant Description',
          proposalURL: 'proposal-id',
          title: 'Grant Title',
          startDate,
          endDate,
        });
      });

      test('should return supplementGrant as undefined when title is not set', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlTeamById();
        const contentfulGraphQLTeamProjectResponse =
          getContentfulGraphqlTeamProjectById();

        contentfulGraphQLTeamProjectResponse.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!.projectsCollection!.items[0]!.supplementGrant =
          {
            title: null,
            description: null,
          };

        mockFetchByIdGraphqlResponses(
          contentfulGraphQLResponse,
          contentfulGraphQLTeamProjectResponse,
        );

        const result = await teamDataProvider.fetchById(id);

        expect(result!.supplementGrant).toBeUndefined();
      });
    });

    describe('proposalURL', () => {
      test('should return proposalURL in team response when there is one', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlTeamById();

        const contentfulGraphQLTeamProjectResponse =
          getContentfulGraphqlTeamProjectById();
        contentfulGraphQLTeamProjectResponse.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!.projectsCollection!.items[0]!.proposal =
          {
            sys: {
              id: 'research-output-id',
            },
          };

        mockFetchByIdGraphqlResponses(
          contentfulGraphQLResponse,
          contentfulGraphQLTeamProjectResponse,
        );

        const result = await teamDataProvider.fetchById(id);

        expect(result!.proposalURL).toEqual('research-output-id');
      });

      test('should return proposalURL as undefined when there is not one', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlTeamById();

        const contentfulGraphQLTeamProjectResponse =
          getContentfulGraphqlTeamProjectById();
        contentfulGraphQLTeamProjectResponse.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!.projectsCollection!.items[0]!.proposal =
          null;

        mockFetchByIdGraphqlResponses(
          contentfulGraphQLResponse,
          contentfulGraphQLTeamProjectResponse,
        );

        const result = await teamDataProvider.fetchById(id);

        expect(result!.proposalURL).toBeUndefined();
      });
    });

    describe('projectStatus', () => {
      test('should return projectStatus in team response when linked project has status', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlTeamById();

        const contentfulGraphQLTeamProjectResponse =
          getContentfulGraphqlTeamProjectById();
        contentfulGraphQLTeamProjectResponse.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!.projectsCollection!.items[0]!.status =
          'Active';

        mockFetchByIdGraphqlResponses(
          contentfulGraphQLResponse,
          contentfulGraphQLTeamProjectResponse,
        );

        const result = await teamDataProvider.fetchById(id);

        expect(result!.projectStatus).toEqual('Active');
      });

      test('should return projectStatus as Completed when linked project status is Completed', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlTeamById();

        const contentfulGraphQLTeamProjectResponse =
          getContentfulGraphqlTeamProjectById();
        contentfulGraphQLTeamProjectResponse.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!.projectsCollection!.items[0]!.status =
          'Completed';

        mockFetchByIdGraphqlResponses(
          contentfulGraphQLResponse,
          contentfulGraphQLTeamProjectResponse,
        );

        const result = await teamDataProvider.fetchById(id);

        expect(result!.projectStatus).toEqual('Completed');
      });

      test('should return projectStatus as Closed when linked project status is Closed', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlTeamById();

        const contentfulGraphQLTeamProjectResponse =
          getContentfulGraphqlTeamProjectById();
        contentfulGraphQLTeamProjectResponse.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!.projectsCollection!.items[0]!.status =
          'Closed';

        mockFetchByIdGraphqlResponses(
          contentfulGraphQLResponse,
          contentfulGraphQLTeamProjectResponse,
        );

        const result = await teamDataProvider.fetchById(id);

        expect(result!.projectStatus).toEqual('Closed');
      });

      test('should return projectStatus as undefined when linked project status is not set', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlTeamById();

        const contentfulGraphQLTeamProjectResponse =
          getContentfulGraphqlTeamProjectById();
        contentfulGraphQLTeamProjectResponse.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!.projectsCollection!.items[0]!.status =
          null;

        mockFetchByIdGraphqlResponses(
          contentfulGraphQLResponse,
          contentfulGraphQLTeamProjectResponse,
        );

        const result = await teamDataProvider.fetchById(id);

        expect(result!.projectStatus).toBeUndefined();
      });
    });

    describe('Tools', () => {
      const tools = [
        {
          url: 'testUrl',
          name: 'slack',
          description: 'this is a test',
        },
      ];

      test('Should return team tools by default', async () => {
        const id = 'some-id';
        const teams = {
          ...getContentfulGraphqlTeamById(),
          toolsCollection: {
            total: 1,
            items: tools,
          },
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById(id);

        expect(result!.tools).toEqual(tools);
      });

      test('should only return team tools with name and url defined', async () => {
        const id = 'some-id';
        const brokenUrlTools = [
          ...tools,
          {
            url: null,
            name: 'testTool',
            description: 'tool description',
          },
        ];

        const teams = {
          ...getContentfulGraphqlTeamById(),
          toolsCollection: {
            total: 2,
            items: brokenUrlTools,
          },
        };

        mockFetchByIdGraphqlResponses(teams);

        const result = await teamDataProvider.fetchById(id);

        expect(result!.tools).toEqual(tools);
      });
    });
  });

  describe('fetchTeamIdByProjectId', () => {
    const projectId = 'project-id-1';

    test('Should return the linked team id if the projectMember is a Team', async () => {
      const contentfulGraphQLResponse = {
        projects: {
          membersCollection: {
            items: [
              {
                projectMember: {
                  __typename: 'Teams',
                  sys: { id: 'team-id-1' },
                },
              },
            ],
          },
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetchTeamIdByProjectId(projectId);

      expect(result).toBe('team-id-1');
    });

    test('Should return null when there are no members linked to the project', async () => {
      const contentfulGraphQLResponse = {
        projects: {
          membersCollection: {
            items: [],
          },
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetchTeamIdByProjectId(projectId);

      expect(result).toBeNull();
    });

    test('Should return null when projectMember exists but is NOT a Team (e.g. User)', async () => {
      const contentfulGraphQLResponse = {
        projects: {
          membersCollection: {
            items: [
              {
                projectMember: {
                  __typename: 'Users',
                  sys: { id: 'user-123' },
                },
              },
            ],
          },
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetchTeamIdByProjectId(projectId);

      expect(result).toBeNull();
    });

    test('Should return null when the entire query returns null', async () => {
      const contentfulGraphQLResponse = {
        projects: null,
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await teamDataProvider.fetchTeamIdByProjectId(projectId);

      expect(result).toBeNull();
    });

    test('Should throw a GraphQL error when the client rejects', async () => {
      contentfulGraphqlClientMock.request.mockRejectedValueOnce(
        new GraphQLError('some error message'),
      );

      await expect(
        teamDataProvider.fetchTeamIdByProjectId(projectId),
      ).rejects.toThrow('some error message');
    });
  });

  describe('Update method', () => {
    test("Should update the team when there isn't tools previously", async () => {
      const teamId = 'team-id-1';
      const tool = {
        name: 'Youtube Channel',
        description: 'Youtube channel with team videos',
        url: 'http://www.youtube.com/abcde',
      };

      const toolMock = getEntry({});
      environmentMock.createEntry.mockResolvedValueOnce(toolMock);
      toolMock.publish = jest.fn().mockResolvedValueOnce(toolMock);

      const teamMock = getEntry({});
      environmentMock.getEntry.mockResolvedValueOnce(teamMock);
      const teamMockUpdated = getEntry({});
      teamMock.patch = jest.fn().mockResolvedValueOnce(teamMockUpdated);

      await teamDataProviderMock.update(teamId, { tools: [tool] });

      expect(environmentMock.getEntry).toHaveBeenCalledWith(teamId);
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'externalTools',
        {
          fields: {
            description: { 'en-US': tool.description },
            name: { 'en-US': tool.name },
            url: { 'en-US': tool.url },
          },
        },
      );
      expect(teamMock.patch).toHaveBeenCalledWith([
        {
          op: 'add',
          path: '/fields/tools',
          value: {
            'en-US': [
              {
                sys: {
                  id: 'entry-id',
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        },
      ]);

      expect(teamMockUpdated.publish).toHaveBeenCalled();
    });

    test('Should update the team when the field tools is populated previously', async () => {
      const teamId = 'team-id-1';
      const tool = {
        name: 'Youtube Channel',
        description: 'Youtube channel with team videos',
        url: 'http://www.youtube.com/abcde',
      };

      const teamMock = getEntry({
        tools: {
          'en-US': [
            {
              sys: {
                id: 'old-tool-1',
                linkType: 'Entry',
                type: 'Link',
              },
            },
            {
              sys: {
                id: 'old-tool-2',
                linkType: 'Entry',
                type: 'Link',
              },
            },
          ],
        },
      });
      environmentMock.getEntry.mockResolvedValueOnce(teamMock);

      const oldTool1Mock = getEntry({});
      oldTool1Mock.unpublish = jest.fn().mockResolvedValueOnce(oldTool1Mock);
      oldTool1Mock.delete = jest.fn().mockResolvedValueOnce(undefined);
      environmentMock.getEntry.mockResolvedValueOnce(oldTool1Mock);

      const oldTool2Mock = getEntry({});
      oldTool2Mock.unpublish = jest.fn().mockResolvedValueOnce(oldTool2Mock);
      oldTool2Mock.delete = jest.fn().mockResolvedValueOnce(undefined);
      environmentMock.getEntry.mockResolvedValueOnce(oldTool2Mock);

      const toolMock = getEntry({});
      toolMock.sys.id = 'new-tool';
      environmentMock.createEntry.mockResolvedValueOnce(toolMock);
      toolMock.publish = jest.fn().mockResolvedValueOnce(toolMock);

      const teamMockUpdated = getEntry({});
      teamMock.patch = jest.fn().mockResolvedValueOnce(teamMockUpdated);

      await teamDataProviderMock.update(teamId, { tools: [tool] });

      expect(environmentMock.getEntry).toHaveBeenCalledWith(teamId);
      expect(environmentMock.getEntry).toHaveBeenCalledWith('old-tool-1');
      expect(environmentMock.getEntry).toHaveBeenCalledWith('old-tool-2');
      expect(oldTool1Mock.unpublish).toHaveBeenCalled();
      expect(oldTool1Mock.delete).toHaveBeenCalled();
      expect(oldTool2Mock.unpublish).toHaveBeenCalled();
      expect(oldTool2Mock.delete).toHaveBeenCalled();

      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'externalTools',
        {
          fields: {
            description: { 'en-US': tool.description },
            name: { 'en-US': tool.name },
            url: { 'en-US': tool.url },
          },
        },
      );
      expect(teamMock.patch).toHaveBeenCalledWith([
        {
          op: 'replace',
          path: '/fields/tools',
          value: {
            'en-US': [
              {
                sys: {
                  id: 'new-tool',
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        },
      ]);

      expect(teamMockUpdated.publish).toHaveBeenCalled();
    });

    test('Should clean tool payload by removing a property with empty string', async () => {
      const teamId = 'team-id-1';
      const tool = {
        url: 'https://example.com',
        name: 'good link',
        description: ' ',
      };

      const teamMock = getEntry({});
      environmentMock.getEntry.mockResolvedValueOnce(teamMock);

      const toolMock = getEntry({});
      environmentMock.createEntry.mockResolvedValueOnce(toolMock);
      toolMock.publish = jest.fn().mockResolvedValueOnce(toolMock);

      const teamMockUpdated = getEntry({});
      teamMock.patch = jest.fn().mockResolvedValueOnce(teamMockUpdated);

      await teamDataProviderMock.update(teamId, { tools: [tool] });

      expect(environmentMock.getEntry).toHaveBeenCalledWith(teamId);
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'externalTools',
        {
          fields: {
            name: { 'en-US': tool.name },
            url: { 'en-US': tool.url },
          },
        },
      );
      expect(teamMock.patch).toHaveBeenCalledWith([
        {
          op: 'add',
          path: '/fields/tools',
          value: {
            'en-US': [
              {
                sys: {
                  id: 'entry-id',
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        },
      ]);
      expect(teamMockUpdated.publish).toHaveBeenCalled();
    });

    test('Should update an existing tool when id is provided', async () => {
      const teamId = 'team-id-1';
      const tool = {
        id: 'existing-tool-id',
        name: 'Updated Name',
        description: 'Updated Description',
        url: 'https://updated.com',
      };

      const teamMock = getEntry({});
      environmentMock.getEntry.mockResolvedValueOnce(teamMock);

      const toolEntryMock = getEntry({});
      toolEntryMock.sys.id = tool.id;
      toolEntryMock.update = jest.fn().mockResolvedValueOnce(toolEntryMock);
      toolEntryMock.publish = jest.fn().mockResolvedValueOnce(toolEntryMock);
      environmentMock.getEntry.mockResolvedValueOnce(toolEntryMock);

      const teamMockUpdated = getEntry({});
      teamMock.patch = jest.fn().mockResolvedValueOnce(teamMockUpdated);

      await teamDataProviderMock.update(teamId, { tools: [tool] });

      expect(environmentMock.getEntry).toHaveBeenCalledWith(teamId);
      expect(environmentMock.getEntry).toHaveBeenCalledWith(tool.id);
      expect(toolEntryMock.update).toHaveBeenCalled();
      expect(toolEntryMock.publish).toHaveBeenCalled();
      expect(environmentMock.createEntry).not.toHaveBeenCalled();

      expect(teamMock.patch).toHaveBeenCalledWith([
        {
          op: 'add',
          path: '/fields/tools',
          value: {
            'en-US': [
              {
                sys: {
                  id: tool.id,
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        },
      ]);
    });
  });

  describe('FetchAwardMetricsByTeamId', () => {
    test('Should query by team id and flag the award types the team received', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulGraphqlTeamAwardMetrics(),
      );

      const result =
        await teamDataProvider.fetchAwardMetricsByTeamId('team-id-1');

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        { teamId: 'team-id-1' },
      );
      expect(result).toEqual(getListTeamAwardMetricsDataObject());
    });

    test('Should return every award type as not received when the team has no awards', async () => {
      const graphqlResponse = getContentfulGraphqlTeamAwardMetrics();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        ...graphqlResponse,
        teamMembershipCollection: { items: [] },
      });

      const result =
        await teamDataProvider.fetchAwardMetricsByTeamId('team-id-1');

      expect(result.items.map(({ received }) => received)).toEqual([
        false,
        false,
      ]);
    });

    test('Should return an empty list when there are no award types', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        awardTypeCollection: { items: [] },
        teamMembershipCollection: { items: [] },
      });

      const result =
        await teamDataProvider.fetchAwardMetricsByTeamId('team-id-1');

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should ignore awards without an award type and null items', async () => {
      const graphqlResponse = getContentfulGraphqlTeamAwardMetrics();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        ...graphqlResponse,
        teamMembershipCollection: {
          items: [
            null,
            { awardsCollection: { items: [null, { awardType: null }] } },
          ],
        },
      });

      const result =
        await teamDataProvider.fetchAwardMetricsByTeamId('team-id-1');

      expect(result.items.every(({ received }) => received === false)).toBe(
        true,
      );
    });
  });
});
