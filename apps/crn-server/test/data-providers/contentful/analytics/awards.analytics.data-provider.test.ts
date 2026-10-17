import { FETCH_AWARDS, FETCH_AWARD_TYPES } from '@asap-hub/contentful';
import { AnalyticsContentfulDataProvider } from '../../../../src/data-providers/contentful/analytics.data-provider';
import {
  getAwardsQuery,
  getAwardsResponse,
  getAwardTypeDataObjects,
  getAwardTypesQuery,
} from '../../../fixtures/analytics.fixtures';
import { getContentfulGraphqlClientMock } from '../../../mocks/contentful-graphql-client.mock';

const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
const analyticsDataProvider = new AnalyticsContentfulDataProvider(
  contentfulGraphqlClientMock,
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchAwardTypes', () => {
  test('Should return an empty list when the client returns no award types', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce({
      awardTypeCollection: { items: [] },
    });

    const result = await analyticsDataProvider.fetchAwardTypes();

    expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
      FETCH_AWARD_TYPES,
    );
    expect(result).toEqual([]);
  });

  test('Should return an empty list when the collection is missing', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce({
      awardTypeCollection: null,
    });

    const result = await analyticsDataProvider.fetchAwardTypes();

    expect(result).toEqual([]);
  });

  test('Should map award types with a kebab-case slug', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(
      getAwardTypesQuery(),
    );

    const result = await analyticsDataProvider.fetchAwardTypes();

    expect(result).toEqual(getAwardTypeDataObjects());
  });

  test('Should strip punctuation and surrounding dashes from the slug', async () => {
    const graphqlResponse = getAwardTypesQuery();
    graphqlResponse.awardTypeCollection!.items[0]!.name =
      '  Best (Team) Award! 2024  ';
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

    const result = await analyticsDataProvider.fetchAwardTypes();

    expect(result[0]!.slug).toEqual('best-team-award-2024');
  });

  test('Should fall back to the sys id as slug when the name is empty', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce({
      awardTypeCollection: {
        items: [
          {
            sys: { id: 'award-type-no-name' },
            name: null,
          },
        ],
      },
    });

    const result = await analyticsDataProvider.fetchAwardTypes();

    expect(result).toEqual([
      {
        id: 'award-type-no-name',
        name: '',
        slug: 'award-type-no-name',
      },
    ]);
  });
});

describe('fetchAwards', () => {
  const osChampionAwardType = getAwardTypeDataObjects()[1]!;

  test('Should return an empty result when the client returns an empty list', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce({
      teamsCollection: {
        items: [],
        total: 0,
      },
    });

    const result = await analyticsDataProvider.fetchAwards({
      filter: { awardType: osChampionAwardType },
    });

    expect(result).toEqual({
      total: 0,
      items: [],
    });
  });

  test('Should pass the award type id, pagination and dateFilter to the query', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(getAwardsQuery());

    await analyticsDataProvider.fetchAwards({
      take: 45,
      skip: 90,
      filter: { timeRange: '90d', awardType: osChampionAwardType },
    });

    expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
      FETCH_AWARDS,
      {
        limit: 45,
        skip: 90,
        dateFilter: expect.any(String),
        awardTypeId: 'award-type-os-champion',
      },
    );
  });

  test('Should pass an undefined dateFilter when the time range is all', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(getAwardsQuery());

    await analyticsDataProvider.fetchAwards({
      filter: { timeRange: 'all', awardType: osChampionAwardType },
    });

    expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
      FETCH_AWARDS,
      {
        limit: 10,
        skip: 0,
        dateFilter: null,
        awardTypeId: 'award-type-os-champion',
      },
    );
  });

  test('Should return zero team awards and no users when the team membership collection is empty', async () => {
    const graphqlResponse = getAwardsQuery();
    graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.teamMembershipCollection!.items =
      [];
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

    const result = await analyticsDataProvider.fetchAwards({
      filter: { awardType: osChampionAwardType },
    });

    expect(result).toEqual({
      total: 1,
      items: [
        {
          id: 'team-id-0_open-science-champion_all',
          teamId: 'team-id-0',
          teamName: 'Team A',
          isTeamInactive: false,
          teamAwardsCount: 0,
          timeRange: 'all',
          awardType: 'open-science-champion',
          awardTypeName: 'Open Science Champion',
          users: [],
        },
      ],
    });
  });

  test('Should return the team awards, user awards, award type and time range from a valid response', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(getAwardsQuery());

    const result = await analyticsDataProvider.fetchAwards({
      filter: { timeRange: '90d', awardType: osChampionAwardType },
    });

    expect(result).toEqual({
      total: 1,
      items: [
        {
          ...getAwardsResponse(),
          id: 'team-id-0_open-science-champion_90d',
          timeRange: '90d',
        },
      ],
    });
  });

  test('Should build the id from team id, award type slug and time range', async () => {
    contentfulGraphqlClientMock.request.mockResolvedValueOnce(getAwardsQuery());

    const result = await analyticsDataProvider.fetchAwards({
      filter: {
        timeRange: '30d',
        awardType: {
          id: 'award-type-network-spotlight',
          name: 'Network Spotlight',
          slug: 'network-spotlight',
        },
      },
    });

    expect(result.items[0]).toMatchObject({
      id: 'team-id-0_network-spotlight_30d',
      awardType: 'network-spotlight',
      awardTypeName: 'Network Spotlight',
      timeRange: '30d',
    });
  });
});
