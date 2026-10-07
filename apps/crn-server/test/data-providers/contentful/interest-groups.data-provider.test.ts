import {
  getContentfulGraphqlClientMockServer,
  InterestGroupLeaders,
  FETCH_INTEREST_GROUPS,
  FETCH_INTEREST_GROUPS_BY_USER_ID,
  FETCH_INTEREST_GROUPS_BY_TEAM_ID,
  FETCH_INTEREST_GROUP_CALENDAR,
  FETCH_INTEREST_GROUP_ID_BY_INTEREST_GROUP_TEAM_ID,
  FETCH_INTEREST_GROUP_IDS_BY_TEAM_ID,
} from '@asap-hub/contentful';
import {
  getContentfulGraphql,
  getInterestGroupDataObject,
  getContentfulGraphqlInterestGroup,
} from '../../fixtures/interest-groups.fixtures';

import { InterestGroupDataProvider } from '../../../src/data-providers/types';
import { InterestGroupContentfulDataProvider } from '../../../src/data-providers/contentful/interest-group.data-provider';
import { getContentfulGraphqlClientMock } from '../../mocks/contentful-graphql-client.mock';

describe('Interest group data provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
  const contentfulGraphqlClientMockServer =
    getContentfulGraphqlClientMockServer(getContentfulGraphql());

  const dataProvider: InterestGroupDataProvider =
    new InterestGroupContentfulDataProvider(contentfulGraphqlClientMock);
  const dataProviderWithMockServer: InterestGroupDataProvider =
    new InterestGroupContentfulDataProvider(contentfulGraphqlClientMockServer);

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch-by-ID', () => {
    test('it should return the interest group', async () => {
      const result = await dataProviderWithMockServer.fetchById('123');

      const expectation = getInterestGroupDataObject();

      expect(result).toEqual(expectation);
    });

    test("Should return null when the group doesn't exist", async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroups: null,
      });

      expect(await dataProvider.fetchById('123')).toBeNull();
    });

    test('Should return the group when the leader user is null (ie entity marked as a draft) and skip the leader', async () => {
      const response = getContentfulGraphqlInterestGroup();

      response.leadersCollection!.items[0] = {
        user: null,
        inactiveSinceDate: null,
        role: 'Chair',
      } as InterestGroupLeaders;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroups: response,
      });

      const result = await dataProvider.fetchById('123');

      const expectation = getInterestGroupDataObject().leaders[1];

      expect(result!.leaders).toEqual([expectation]);
    });

    test('Should return the group when the calendars is null', async () => {
      const response = getContentfulGraphqlInterestGroup();
      response.calendar = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroups: response,
      });

      const result = await dataProvider.fetchById('123');

      expect(result!.calendars).toEqual([]);
    });
  });

  describe('Fetch', () => {
    test('should fetch a list of interest groups', async () => {
      const result = await dataProviderWithMockServer.fetch({});

      const expectation = getInterestGroupDataObject();

      expect(result).toMatchObject({
        total: 1,
        items: [expectation],
      });
    });

    test('Should return an empty result when the client returns an empty list', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsCollection: { total: 0, items: [] },
      });

      const result = await dataProvider.fetch({});
      expect(result).toEqual({ items: [], total: 0 });
    });

    test('Should return an empty result when the client returns a response with interestGroupsCollection property set to null', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsCollection: null,
      });

      const result = await dataProvider.fetch({});
      expect(result).toEqual({ items: [], total: 0 });
    });

    test('Should return an empty result when the client returns a response with items property set to null', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsCollection: { total: 0, items: null },
      });

      const result = await dataProvider.fetch({});
      expect(result).toEqual({ items: [], total: 0 });
    });

    describe('query options', () => {
      beforeEach(() => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          interestGroupsCollection: {
            total: 0,
            items: [],
          },
        });
      });

      test('Should apply pagination parameters', async () => {
        await dataProvider.fetch({
          take: 13,
          skip: 3,
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_INTEREST_GROUPS,
          expect.objectContaining({
            limit: 13,
            skip: 3,
          }),
        );
      });

      test('Should pass default pagination parameters', async () => {
        await dataProvider.fetch({});

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_INTEREST_GROUPS,
          expect.objectContaining({
            limit: 20,
            skip: 0,
          }),
        );
      });

      test('should query with single term search filters', async () => {
        await dataProvider.fetch({ search: 'test' });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_INTEREST_GROUPS,
          expect.objectContaining({
            where: {
              AND: [
                {
                  OR: [
                    { name_contains: 'test' },
                    { description_contains: 'test' },
                    { researchTags: { name_contains: 'test' } },
                  ],
                },
              ],
            },
          }),
        );
      });

      test('should query with multiple term search filters', async () => {
        await dataProvider.fetch({ search: 'test search' });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_INTEREST_GROUPS,
          expect.objectContaining({
            where: {
              AND: [
                {
                  OR: [
                    { name_contains: 'test' },
                    { description_contains: 'test' },
                    { researchTags: { name_contains: 'test' } },
                  ],
                },
                {
                  OR: [
                    { name_contains: 'search' },
                    { description_contains: 'search' },
                    { researchTags: { name_contains: 'search' } },
                  ],
                },
              ],
            },
          }),
        );
      });

      test.each`
        active
        ${true} | ${false}
      `(
        'Should filter by active field when its value is $active',
        async ({ active }) => {
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            interestGroupsCollection: { total: 0, items: [] },
          });

          await dataProvider.fetch({ filter: { active } });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            FETCH_INTEREST_GROUPS,
            expect.objectContaining({
              where: {
                AND: [{ active }],
              },
            }),
          );
        },
      );

      test('can apply an active filter as well as a text search', async () => {
        await dataProvider.fetch({ filter: { active: false }, search: 'test' });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_INTEREST_GROUPS,
          expect.objectContaining({
            where: {
              AND: [
                {
                  OR: [
                    { name_contains: 'test' },
                    { description_contains: 'test' },
                    { researchTags: { name_contains: 'test' } },
                  ],
                },
                { active: false },
              ],
            },
          }),
        );
      });

      test('can filter by team id', async () => {
        await dataProvider.fetch({ filter: { teamId: 'abc' } });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_INTEREST_GROUPS_BY_TEAM_ID,
          expect.objectContaining({ id: 'abc' }),
        );
      });

      test('can filter by user id', async () => {
        await dataProvider.fetch({ filter: { userId: '1234567' } });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_INTEREST_GROUPS_BY_USER_ID,
          expect.objectContaining({ id: '1234567' }),
        );

        const contentfulGraphqlClientMockServer =
          getContentfulGraphqlClientMockServer({
            InterestGroupLeadersCollection: () => ({
              total: 2,
              items: [
                {
                  linkedFrom: {
                    interestGroupsCollection: {
                      total: 1,
                      items: [...Array(1)],
                    },
                  },
                },
                {
                  linkedFrom: {
                    interestGroupsCollection: {
                      total: 1,
                      items: [...Array(1)],
                    },
                  },
                },
              ],
            }),
          });

        const dataProviderWithMockServer: InterestGroupDataProvider =
          new InterestGroupContentfulDataProvider(
            contentfulGraphqlClientMockServer,
          );

        const result = await dataProviderWithMockServer.fetch({
          filter: { userId: '1234567' },
        });

        expect(result.total).toEqual(2);
        expect(result.items).toHaveLength(2);
      });
    });
  });

  describe('fetchByTeamId', () => {
    const teamId = 'team-id-1';

    test('should return parsed interest groups when all data is present', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeamsCollection: {
          items: [
            {
              linkedFrom: {
                interestGroupsCollection: {
                  items: [getContentfulGraphqlInterestGroup()],
                },
              },
            },
          ],
        },
      });
      const result = await dataProvider.fetch({ filter: { teamId } });
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({ id: 'group-id-1' });
    });

    test('should filter out items with missing linkedFrom', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeamsCollection: {
          items: [{ linkedFrom: null }, undefined, {}],
        },
      });
      const result = await dataProvider.fetch({ filter: { teamId } });
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    test('should filter out items with missing interestGroupsCollection', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeamsCollection: {
          items: [{ linkedFrom: { interestGroupsCollection: null } }],
        },
      });
      const result = await dataProvider.fetch({ filter: { teamId } });
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    test('should filter out items with missing items[0] in interestGroupsCollection', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeamsCollection: {
          items: [
            { linkedFrom: { interestGroupsCollection: { items: [] } } },
            { linkedFrom: { interestGroupsCollection: { items: [null] } } },
          ],
        },
      });
      const result = await dataProvider.fetch({ filter: { teamId } });
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    test('should handle interestGroupsTeamsCollection as null', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeamsCollection: null,
      });
      let result = await dataProvider.fetch({ filter: { teamId } });
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('fetchCalendarId', () => {
    test('returns the id of the interest group calendar', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroups: { calendar: { sys: { id: 'calendar-1' } } },
      });

      const result = await dataProvider.fetchCalendarId('group-id-1');

      expect(result).toBe('calendar-1');
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        FETCH_INTEREST_GROUP_CALENDAR,
        { id: 'group-id-1' },
      );
    });

    test('returns null when the interest group has no calendar', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroups: { calendar: null },
      });

      expect(await dataProvider.fetchCalendarId('group-id-1')).toBeNull();
    });

    test('returns null when the interest group is not found', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroups: null,
      });

      expect(await dataProvider.fetchCalendarId('group-id-1')).toBeNull();
    });
  });

  describe('fetchIdByInterestGroupTeamId', () => {
    test('returns the id of the interest group the interest group team belongs to', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeams: {
          linkedFrom: {
            interestGroupsCollection: {
              items: [{ sys: { id: 'group-id-1' } }],
            },
          },
        },
      });

      const result =
        await dataProvider.fetchIdByInterestGroupTeamId('ig-team-1');

      expect(result).toBe('group-id-1');
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        FETCH_INTEREST_GROUP_ID_BY_INTEREST_GROUP_TEAM_ID,
        { id: 'ig-team-1' },
      );
    });

    test('returns null when the interest group team is not linked to an interest group', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeams: {
          linkedFrom: { interestGroupsCollection: { items: [] } },
        },
      });

      expect(
        await dataProvider.fetchIdByInterestGroupTeamId('ig-team-1'),
      ).toBeNull();
    });

    test('returns null when the interest group team is not found', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeams: null,
      });

      expect(
        await dataProvider.fetchIdByInterestGroupTeamId('ig-team-1'),
      ).toBeNull();
    });
  });

  describe('fetchIdsByTeamId', () => {
    const getInterestGroupTeamItem = (interestGroupId: string | null) => ({
      linkedFrom: {
        interestGroupsCollection: {
          items: interestGroupId ? [{ sys: { id: interestGroupId } }] : [],
        },
      },
    });

    test('returns the ids of the interest groups the team belongs to', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeamsCollection: {
          items: [
            getInterestGroupTeamItem('group-id-1'),
            getInterestGroupTeamItem('group-id-2'),
          ],
        },
      });

      const result = await dataProvider.fetchIdsByTeamId('team-1');

      expect(result).toEqual(['group-id-1', 'group-id-2']);
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        FETCH_INTEREST_GROUP_IDS_BY_TEAM_ID,
        { id: 'team-1' },
      );
    });

    test('returns each interest group once', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeamsCollection: {
          items: [
            getInterestGroupTeamItem('group-id-1'),
            getInterestGroupTeamItem('group-id-1'),
          ],
        },
      });

      expect(await dataProvider.fetchIdsByTeamId('team-1')).toEqual([
        'group-id-1',
      ]);
    });

    test('skips interest group teams that are not linked to an interest group', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeamsCollection: {
          items: [
            getInterestGroupTeamItem(null),
            { linkedFrom: null },
            null,
            getInterestGroupTeamItem('group-id-1'),
          ],
        },
      });

      expect(await dataProvider.fetchIdsByTeamId('team-1')).toEqual([
        'group-id-1',
      ]);
    });

    test('returns an empty list when the team has no interest group teams', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        interestGroupsTeamsCollection: null,
      });

      expect(await dataProvider.fetchIdsByTeamId('team-1')).toEqual([]);
    });
  });
});
