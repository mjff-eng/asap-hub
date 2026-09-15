import {
  engagementPerformance,
  listEngagementResponse,
} from '@asap-hub/fixtures';
import {
  EngagementResponse,
  MeetingRepAttendanceResponse,
  TimeRangeOption,
} from '@asap-hub/model';

import {
  EngagementListOptions,
  getEngagement,
  getEngagementPerformance,
  getMeetingRepAttendance,
  getTeamEngagementMetrics,
  MeetingRepAttendanceOptions,
} from '../api';
import { OpensearchClient } from '../../utils/opensearch';

const defaultOptions: EngagementListOptions = {
  pageSize: 10,
  currentPage: 0,
  tags: [],
  timeRange: 'all',
  sort: 'team_asc',
};

describe('getEngagement', () => {
  let opensearchClient: OpensearchClient<EngagementResponse>;
  let searchSpy: jest.SpyInstance;

  beforeEach(() => {
    opensearchClient = new OpensearchClient(
      'presenter-representation',
      'Bearer test-token',
    );
    searchSpy = jest
      .spyOn(opensearchClient, 'search')
      .mockResolvedValue({ ...listEngagementResponse });
  });

  afterEach(() => {
    searchSpy.mockRestore();
  });

  it('calls opensearch client with correct parameters', async () => {
    await getEngagement(opensearchClient, defaultOptions);

    expect(searchSpy).toHaveBeenCalledWith({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
      sort: expect.any(Array),
    });
  });

  it('passes tags to opensearch client', async () => {
    const tags = ['Team Alpha', 'User Beta'];
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      tags,
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTags: tags,
      }),
    );
  });

  it('passes pagination parameters to opensearch client', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      currentPage: 2,
      pageSize: 20,
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 2,
        pageSize: 20,
      }),
    );
  });

  it('passes time range to opensearch client', async () => {
    const timeRange = '90d';
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      timeRange,
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange,
      }),
    );
  });

  it('applies team_asc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'team_asc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ 'name.keyword': { order: 'asc' } }],
      }),
    );
  });

  it('applies team_desc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'team_desc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ 'name.keyword': { order: 'desc' } }],
      }),
    );
  });

  it('applies members_asc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'members_asc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            memberCount: {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('applies members_desc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'members_desc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            memberCount: {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('applies events_asc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'events_asc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            eventCount: { order: 'asc' },
          },
        ],
      }),
    );
  });

  it('applies events_desc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'events_desc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            eventCount: { order: 'desc' },
          },
        ],
      }),
    );
  });

  it('applies total_speakers_asc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'total_speakers_asc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            totalSpeakerCount: {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('applies total_speakers_desc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'total_speakers_desc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            totalSpeakerCount: {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('applies unique_speakers_all_roles_asc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'unique_speakers_all_roles_asc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            uniqueAllRolesCount: {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('applies unique_speakers_all_roles_desc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'unique_speakers_all_roles_desc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            uniqueAllRolesCount: {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('applies unique_speakers_all_roles_percentage_asc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'unique_speakers_all_roles_percentage_asc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            uniqueAllRolesCountPercentage: {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('applies unique_speakers_all_roles_percentage_desc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'unique_speakers_all_roles_percentage_desc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            uniqueAllRolesCountPercentage: {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('applies unique_speakers_key_personnel_asc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'unique_speakers_key_personnel_asc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            uniqueKeyPersonnelCount: {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('applies unique_speakers_key_personnel_desc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'unique_speakers_key_personnel_desc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            uniqueKeyPersonnelCount: {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('applies unique_speakers_key_personnel_percentage_asc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'unique_speakers_key_personnel_percentage_asc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            uniqueKeyPersonnelCountPercentage: {
              order: 'asc',
            },
          },
        ],
      }),
    );
  });

  it('applies unique_speakers_key_personnel_percentage_desc sort correctly', async () => {
    await getEngagement(opensearchClient, {
      ...defaultOptions,
      sort: 'unique_speakers_key_personnel_percentage_desc',
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          {
            uniqueKeyPersonnelCountPercentage: {
              order: 'desc',
            },
          },
        ],
      }),
    );
  });

  it('returns the result from opensearch client', async () => {
    searchSpy.mockResolvedValue(listEngagementResponse);

    const result = await getEngagement(opensearchClient, defaultOptions);

    expect(result).toEqual(listEngagementResponse);
  });
});

describe('getEngagementPerformance', () => {
  let opensearchClient: OpensearchClient<typeof engagementPerformance>;
  let searchSpy: jest.SpyInstance;

  beforeEach(() => {
    opensearchClient = new OpensearchClient(
      'presenter-representation-performance',
      'Bearer test-token',
    );
    searchSpy = jest.spyOn(opensearchClient, 'search').mockResolvedValue({
      items: [engagementPerformance],
      total: 1,
    });
  });

  afterEach(() => {
    searchSpy.mockRestore();
  });

  it('calls opensearch client with correct parameters', async () => {
    await getEngagementPerformance(opensearchClient, {
      timeRange: '30d',
    });

    expect(searchSpy).toHaveBeenCalledWith({
      searchTags: [],
      timeRange: '30d',
      searchScope: 'flat',
      sort: [],
    });
  });

  it.each`
    range                        | timeRange
    ${'Last 30 days'}            | ${'30d'}
    ${'Last 90 days'}            | ${'90d'}
    ${'This year (Jan-Today)'}   | ${'current-year'}
    ${'Last 12 months'}          | ${'last-year'}
    ${'Since Hub Launch (2020)'} | ${'all'}
  `(
    'returns engagement performance for $range',
    async ({ timeRange }: { timeRange: TimeRangeOption }) => {
      await getEngagementPerformance(opensearchClient, {
        timeRange,
      });

      expect(searchSpy).toHaveBeenCalledWith({
        searchTags: [],
        timeRange,
        searchScope: 'flat',
        sort: [],
      });
    },
  );

  it('returns undefined when opensearch returns empty items', async () => {
    searchSpy.mockResolvedValue({
      items: [],
      total: 0,
    });

    const result = await getEngagementPerformance(opensearchClient, {
      timeRange: '30d',
    });

    expect(result).toBeUndefined();
  });
});

describe('getMeetingRepAttendance', () => {
  const defaultAttendanceOptions: MeetingRepAttendanceOptions = {
    pageSize: null,
    currentPage: null,
    tags: [],
    sort: 'team_asc',
    timeRange: 'all',
  };
  const defaultAttendanceData = {
    teamId: 'team-id-1',
    teamName: 'Alessi',
    isTeamInactive: false,
    attendancePercentage: 34,
    limitedData: false,
    timeRange: 'all',
  } as MeetingRepAttendanceResponse;
  const defaultResponse = {
    items: [defaultAttendanceData],
    total: 1,
  };

  let mockOpensearchClient: jest.Mocked<
    OpensearchClient<MeetingRepAttendanceResponse>
  >;

  beforeEach(() => {
    mockOpensearchClient = {
      search: jest.fn(),
    } as unknown as jest.Mocked<OpensearchClient<MeetingRepAttendanceResponse>>;
  });

  it('should not default to any search tags, specific page or limit hits per page', async () => {
    mockOpensearchClient.search.mockResolvedValue(defaultResponse);

    await getMeetingRepAttendance(
      mockOpensearchClient,
      defaultAttendanceOptions,
    );

    expect(mockOpensearchClient.search).toHaveBeenCalledWith({
      searchTags: [],
      currentPage: undefined,
      pageSize: undefined,
      timeRange: 'all',
      searchScope: 'flat',
      sort: [{ 'teamName.keyword': { order: 'asc' } }],
    });
  });

  it('should pass the options if provided to search', async () => {
    mockOpensearchClient.search.mockResolvedValue(defaultResponse);

    await getMeetingRepAttendance(mockOpensearchClient, {
      pageSize: 10,
      currentPage: 0,
      tags: ['Alessi'],
      timeRange: 'all',
      sort: 'team_asc',
    });

    expect(mockOpensearchClient.search).toHaveBeenCalledWith({
      searchTags: ['Alessi'],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
      sort: [{ 'teamName.keyword': { order: 'asc' } }],
    });
  });

  it('passes sort clauses to search for each sort option', async () => {
    mockOpensearchClient.search.mockResolvedValue(defaultResponse);

    await getMeetingRepAttendance(mockOpensearchClient, {
      ...defaultAttendanceOptions,
      sort: 'team_desc',
    });
    expect(mockOpensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ 'teamName.keyword': { order: 'desc' } }],
      }),
    );

    mockOpensearchClient.search.mockClear();
    await getMeetingRepAttendance(mockOpensearchClient, {
      ...defaultAttendanceOptions,
      sort: 'attendance_percentage_asc',
    });
    expect(mockOpensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          { limitedData: { order: 'desc' } },
          { attendancePercentage: { order: 'asc', missing: '_last' } },
        ],
      }),
    );

    mockOpensearchClient.search.mockClear();
    await getMeetingRepAttendance(mockOpensearchClient, {
      ...defaultAttendanceOptions,
      sort: 'attendance_percentage_desc',
    });
    expect(mockOpensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          { attendancePercentage: { order: 'desc', missing: '_last' } },
          { limitedData: { order: 'asc' } },
        ],
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
  `('returns attendance data for $range', async ({ timeRange }) => {
    mockOpensearchClient.search.mockResolvedValue(defaultResponse);

    await getMeetingRepAttendance(mockOpensearchClient, {
      ...defaultAttendanceOptions,
      timeRange,
    });

    expect(mockOpensearchClient.search).toHaveBeenCalledWith({
      searchTags: [],
      currentPage: undefined,
      pageSize: undefined,
      timeRange,
      searchScope: 'flat',
      sort: [{ 'teamName.keyword': { order: 'asc' } }],
    });
  });

  it('should return successfully fetched attendance data', async () => {
    mockOpensearchClient.search.mockResolvedValue(defaultResponse);
    const analyticsAttendance = await getMeetingRepAttendance(
      mockOpensearchClient,
      {
        pageSize: 10,
        currentPage: 0,
        tags: ['Alessi'],
        timeRange: 'all',
        sort: 'team_asc',
      },
    );
    expect(analyticsAttendance).toEqual(
      expect.objectContaining({
        items: [defaultAttendanceData],
        total: 1,
      }),
    );
  });
});

describe('getTeamEngagementMetrics', () => {
  let presenterClient: OpensearchClient<EngagementResponse>;
  let attendanceClient: OpensearchClient<MeetingRepAttendanceResponse>;
  let presenterSearch: jest.SpyInstance;
  let attendanceSearch: jest.SpyInstance;

  const emptyResponse = { items: [], total: 0 };
  const presenterResponse = (overrides: Partial<EngagementResponse>) => ({
    items: [{ ...listEngagementResponse.items[0]!, ...overrides }],
    total: 1,
  });
  const attendanceResponse = (
    overrides: Partial<MeetingRepAttendanceResponse>,
  ) => ({
    items: [
      {
        teamId: 'team-id-1',
        teamName: 'Team 1',
        isTeamInactive: false,
        attendancePercentage: 75,
        limitedData: false,
        timeRange: 'all' as const,
        ...overrides,
      },
    ],
    total: 1,
  });

  beforeEach(() => {
    presenterClient = new OpensearchClient('presenter-representation', 'token');
    attendanceClient = new OpensearchClient('attendance', 'token');
    presenterSearch = jest
      .spyOn(presenterClient, 'search')
      .mockResolvedValue(emptyResponse);
    attendanceSearch = jest
      .spyOn(attendanceClient, 'search')
      .mockResolvedValue(emptyResponse);
  });

  it('searches both indices for the all-time record of the team', async () => {
    await getTeamEngagementMetrics(presenterClient, attendanceClient, {
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
    expect(presenterSearch).toHaveBeenCalledWith(expectedOptions);
    expect(attendanceSearch).toHaveBeenCalledWith(expectedOptions);
  });

  it('reports limited data when the team is not indexed', async () => {
    const result = await getTeamEngagementMetrics(
      presenterClient,
      attendanceClient,
      { teamId: 'team-id-1' },
    );

    expect(result).toEqual({
      speakerDiversity: null,
      traineePresentations: null,
      meetingRepAttendance: { percentage: null, limitedData: true },
    });
  });

  it('maps the speaker percentages and the attendance record', async () => {
    presenterSearch.mockResolvedValue(
      presenterResponse({
        uniqueAllRolesCountPercentage: 67,
        uniqueKeyPersonnelCountPercentage: 33,
      }),
    );
    attendanceSearch.mockResolvedValue(
      attendanceResponse({ attendancePercentage: 75, limitedData: false }),
    );

    const result = await getTeamEngagementMetrics(
      presenterClient,
      attendanceClient,
      { teamId: 'team-id-1' },
    );

    expect(result).toEqual({
      speakerDiversity: 67,
      traineePresentations: 33,
      meetingRepAttendance: { percentage: 75, limitedData: false },
    });
  });

  it('keeps the limited data flag of the attendance record', async () => {
    attendanceSearch.mockResolvedValue(
      attendanceResponse({ attendancePercentage: null, limitedData: true }),
    );

    const result = await getTeamEngagementMetrics(
      presenterClient,
      attendanceClient,
      { teamId: 'team-id-1' },
    );

    expect(result.meetingRepAttendance).toEqual({
      percentage: null,
      limitedData: true,
    });
  });
});
