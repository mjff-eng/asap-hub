import nock from 'nock';
import { teamLeadershipResponse } from '@asap-hub/fixtures';
import {
  AnalyticsTeamLeadershipResponse,
  OSChampionOpensearchResponse,
  SortOSChampion,
} from '@asap-hub/model';
import {
  AnalyticsSearchOptionsWithSort,
  getAnalyticsLeadership,
  getAnalyticsOSChampion,
  getTeamLeadershipMetrics,
} from '../api';

import { OpensearchClient } from '../../utils/opensearch';
import { AnalyticsSearchOptionsWithFiltering } from '../../utils/analytics-options';

jest.mock('../../../config');

afterEach(() => {
  nock.cleanAll();
});

const defaultOptions: AnalyticsSearchOptionsWithSort = {
  pageSize: null,
  currentPage: null,
  tags: [],
  metric: 'working-group',
};

describe('getAnalyticsLeadership', () => {
  let opensearchClient: OpensearchClient<AnalyticsTeamLeadershipResponse>;
  const defaultResponse = {
    items: [teamLeadershipResponse],
    total: 1,
  };

  beforeEach(() => {
    opensearchClient = new OpensearchClient<AnalyticsTeamLeadershipResponse>(
      'wg-leadership',
      'token',
    );
    jest.spyOn(opensearchClient, 'search').mockResolvedValue(defaultResponse);
  });

  it('should call search without sort when sort is not provided', async () => {
    await getAnalyticsLeadership(opensearchClient, defaultOptions);

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTags: [],
        sort: undefined,
      }),
    );
  });

  it('should handle team_asc sort', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      sort: 'team_asc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            'displayName.keyword': {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('should handle team_desc sort', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      sort: 'team_desc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            'displayName.keyword': {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('should handle wg_current_leadership_asc sort', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      sort: 'wg_current_leadership_asc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            workingGroupLeadershipRoleCount: {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('should handle wg_previous_leadership_desc sort', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      sort: 'wg_previous_leadership_desc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            workingGroupPreviousLeadershipRoleCount: {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('should handle wg_current_membership_asc sort', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      sort: 'wg_current_membership_asc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            workingGroupMemberCount: {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('should handle wg_previous_membership_desc sort', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      sort: 'wg_previous_membership_desc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            workingGroupPreviousMemberCount: {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('should handle ig_current_leadership_asc sort', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      metric: 'interest-group',
      sort: 'ig_current_leadership_asc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            interestGroupLeadershipRoleCount: {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('should handle ig_previous_leadership_desc sort', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      metric: 'interest-group',
      sort: 'ig_previous_leadership_desc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            interestGroupPreviousLeadershipRoleCount: {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('should handle ig_current_membership_asc sort', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      metric: 'interest-group',
      sort: 'ig_current_membership_asc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            interestGroupMemberCount: {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('should handle ig_previous_membership_desc sort', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      metric: 'interest-group',
      sort: 'ig_previous_membership_desc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            interestGroupPreviousMemberCount: {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('should pass currentPage and pageSize when provided', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      currentPage: 2,
      pageSize: 25,
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 2,
        pageSize: 25,
      }),
    );
  });

  it('should pass tags when provided', async () => {
    await getAnalyticsLeadership(opensearchClient, {
      ...defaultOptions,
      tags: ['Alessi', 'Barker'],
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTags: ['Alessi', 'Barker'],
      }),
    );
  });

  it('should return successfully fetched team leadership from opensearch', async () => {
    const result = await getAnalyticsLeadership(
      opensearchClient,
      defaultOptions,
    );

    expect(result).toEqual(
      expect.objectContaining({
        items: [teamLeadershipResponse],
        total: 1,
      }),
    );
  });
});

describe('getAnalyticsOSChampion', () => {
  const defaultOSChampionOptions: AnalyticsSearchOptionsWithFiltering<SortOSChampion> =
    {
      ...defaultOptions,
      sort: 'team_asc',
      timeRange: 'all',
    };
  const defaultOSChampionData = {
    objectID: 'object-id-1',
    teamId: 'team-id-1',
    teamName: 'Alessi',
    isTeamInactive: false,
    teamAwardsCount: 0,
    timeRange: 'all',
    users: [],
  } as OSChampionOpensearchResponse;
  const defaultResponse = {
    items: [defaultOSChampionData],
    total: 1,
  };

  let opensearchClient: jest.Mocked<
    OpensearchClient<OSChampionOpensearchResponse>
  >;

  beforeEach(() => {
    opensearchClient = {
      search: jest.fn(),
    } as unknown as jest.Mocked<OpensearchClient<OSChampionOpensearchResponse>>;
  });

  it('should not default to any search tags, specific page or limit hits per page', async () => {
    opensearchClient.search.mockResolvedValue(defaultResponse);

    await getAnalyticsOSChampion(opensearchClient, defaultOSChampionOptions);

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTags: [],
        currentPage: undefined,
        pageSize: undefined,
      }),
    );
  });

  it('should pass the options if provided to search', async () => {
    opensearchClient.search.mockResolvedValue(defaultResponse);

    await getAnalyticsOSChampion(opensearchClient, {
      pageSize: 10,
      currentPage: 0,
      tags: ['Alessi'],
      timeRange: 'all',
      sort: 'team_asc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTags: ['Alessi'],
        currentPage: 0,
        pageSize: 10,
        timeRange: 'all',
        sort: [{ 'teamName.keyword': { order: 'asc' } }],
      }),
    );
  });

  it('should pass sort clause to opensearch when sort is team_desc', async () => {
    opensearchClient.search.mockResolvedValue(defaultResponse);

    await getAnalyticsOSChampion(opensearchClient, {
      ...defaultOSChampionOptions,
      sort: 'team_desc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ 'teamName.keyword': { order: 'desc' } }],
      }),
    );
  });

  it('should pass sort clause to opensearch when sort is os_champion_awards_desc', async () => {
    opensearchClient.search.mockResolvedValue(defaultResponse);

    await getAnalyticsOSChampion(opensearchClient, {
      ...defaultOSChampionOptions,
      sort: 'os_champion_awards_desc',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ teamAwardsCount: { order: 'desc' } }],
      }),
    );
  });

  it.each`
    range                        | timeRange
    ${'Last 30 days'}            | ${'30d'}
    ${'Last 90 days'}            | ${'90d'}
    ${'This year (Jan-Today)'}   | ${'current-year'}
    ${'Last 12 months'}          | ${'last-year'}
    ${'Since Hub Launch (2020)'} | ${'all'}
  `('returns os champion data for $range', async ({ timeRange }) => {
    opensearchClient.search.mockResolvedValue(defaultResponse);

    await getAnalyticsOSChampion(opensearchClient, {
      ...defaultOSChampionOptions,
      timeRange,
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange,
      }),
    );
  });

  it('should return successfully fetched os champion data', async () => {
    opensearchClient.search.mockResolvedValue(defaultResponse);
    const analyticsOSChampion = await getAnalyticsOSChampion(opensearchClient, {
      pageSize: 10,
      currentPage: 0,
      tags: ['Alessi'],
      timeRange: 'all',
      sort: 'team_asc',
    });
    expect(analyticsOSChampion).toEqual(
      expect.objectContaining({
        items: [defaultOSChampionData],
        total: 1,
      }),
    );
  });
});

describe('getTeamLeadershipMetrics', () => {
  let workingGroupClient: OpensearchClient<AnalyticsTeamLeadershipResponse>;
  let interestGroupClient: OpensearchClient<AnalyticsTeamLeadershipResponse>;
  let workingGroupSearch: jest.SpyInstance;
  let interestGroupSearch: jest.SpyInstance;

  const emptyResponse = { items: [], total: 0 };
  const withCounts = (overrides: Partial<AnalyticsTeamLeadershipResponse>) => ({
    items: [
      {
        ...teamLeadershipResponse,
        workingGroupLeadershipRoleCount: 0,
        workingGroupPreviousLeadershipRoleCount: 0,
        interestGroupLeadershipRoleCount: 0,
        interestGroupPreviousLeadershipRoleCount: 0,
        ...overrides,
      },
    ],
    total: 1,
  });

  beforeEach(() => {
    workingGroupClient = new OpensearchClient('wg-leadership', 'token');
    interestGroupClient = new OpensearchClient('ig-leadership', 'token');
    workingGroupSearch = jest
      .spyOn(workingGroupClient, 'search')
      .mockResolvedValue(emptyResponse);
    interestGroupSearch = jest
      .spyOn(interestGroupClient, 'search')
      .mockResolvedValue(emptyResponse);
  });

  it('searches both leadership indices filtered by the team id', async () => {
    await getTeamLeadershipMetrics(workingGroupClient, interestGroupClient, {
      teamId: 'team-id-1',
    });

    const expectedOptions = {
      searchTags: [],
      searchScope: 'flat',
      sort: [],
      currentPage: 0,
      pageSize: 1,
      timeRange: 'all',
      teamId: 'team-id-1',
    };
    expect(workingGroupSearch).toHaveBeenCalledWith(expectedOptions);
    expect(interestGroupSearch).toHaveBeenCalledWith(expectedOptions);
  });

  it('returns false for both metrics when the team is not indexed', async () => {
    const result = await getTeamLeadershipMetrics(
      workingGroupClient,
      interestGroupClient,
      { teamId: 'team-id-1' },
    );

    expect(result).toEqual({
      workingGroupLead: false,
      interestGroupLead: false,
    });
  });

  it('flags current leadership', async () => {
    workingGroupSearch.mockResolvedValue(
      withCounts({ workingGroupLeadershipRoleCount: 1 }),
    );
    interestGroupSearch.mockResolvedValue(
      withCounts({ interestGroupLeadershipRoleCount: 2 }),
    );

    const result = await getTeamLeadershipMetrics(
      workingGroupClient,
      interestGroupClient,
      { teamId: 'team-id-1' },
    );

    expect(result).toEqual({ workingGroupLead: true, interestGroupLead: true });
  });

  it('flags previous leadership', async () => {
    workingGroupSearch.mockResolvedValue(
      withCounts({ workingGroupPreviousLeadershipRoleCount: 1 }),
    );
    interestGroupSearch.mockResolvedValue(withCounts({}));

    const result = await getTeamLeadershipMetrics(
      workingGroupClient,
      interestGroupClient,
      { teamId: 'team-id-1' },
    );

    expect(result).toEqual({
      workingGroupLead: true,
      interestGroupLead: false,
    });
  });

  it('ignores membership counts', async () => {
    workingGroupSearch.mockResolvedValue(
      withCounts({ workingGroupMemberCount: 3 }),
    );
    interestGroupSearch.mockResolvedValue(
      withCounts({ interestGroupPreviousMemberCount: 3 }),
    );

    const result = await getTeamLeadershipMetrics(
      workingGroupClient,
      interestGroupClient,
      { teamId: 'team-id-1' },
    );

    expect(result).toEqual({
      workingGroupLead: false,
      interestGroupLead: false,
    });
  });
});
