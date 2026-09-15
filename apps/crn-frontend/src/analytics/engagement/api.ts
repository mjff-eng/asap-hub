import {
  EngagementPerformance,
  ListMeetingRepAttendanceResponse,
  MeetingRepAttendanceResponse,
  SortMeetingRepAttendance,
  TimeRangeOption,
  LimitedTimeRangeOption,
  SortEngagement,
  EngagementResponse,
  ListEngagementResponse,
} from '@asap-hub/model';
import { TeamEngagementMetricsProps } from '@asap-hub/react-components';
import {
  AnalyticsPerformanceOptions,
  AnalyticsSearchOptions,
  AnalyticsSearchOptionsWithFiltering,
} from '../utils/analytics-options';
import { OpensearchClient } from '../utils/opensearch';
import { OpensearchSortMap } from '../utils/opensearch/types';
import { teamMetricsSearchOptions } from '../utils/team-metrics';

export type EngagementListOptions = AnalyticsSearchOptions & {
  timeRange: TimeRangeOption;
  sort: SortEngagement;
};

export type MeetingRepAttendanceOptions = Omit<
  AnalyticsSearchOptionsWithFiltering<SortMeetingRepAttendance>,
  'timeRange'
> & {
  timeRange: LimitedTimeRangeOption;
};

const presenterRepresentationOpensearchSort: OpensearchSortMap<SortEngagement> =
  {
    team_asc: [{ 'name.keyword': { order: 'asc' } }],
    team_desc: [{ 'name.keyword': { order: 'desc' } }],
    members_asc: [{ memberCount: { order: 'asc' } }],
    members_desc: [{ memberCount: { order: 'desc' } }],
    events_asc: [{ eventCount: { order: 'asc' } }],
    events_desc: [{ eventCount: { order: 'desc' } }],
    total_speakers_asc: [{ totalSpeakerCount: { order: 'asc' } }],
    total_speakers_desc: [{ totalSpeakerCount: { order: 'desc' } }],
    unique_speakers_all_roles_asc: [{ uniqueAllRolesCount: { order: 'asc' } }],
    unique_speakers_all_roles_desc: [
      { uniqueAllRolesCount: { order: 'desc' } },
    ],
    unique_speakers_all_roles_percentage_asc: [
      { uniqueAllRolesCountPercentage: { order: 'asc' } },
    ],
    unique_speakers_all_roles_percentage_desc: [
      { uniqueAllRolesCountPercentage: { order: 'desc' } },
    ],
    unique_speakers_key_personnel_asc: [
      { uniqueKeyPersonnelCount: { order: 'asc' } },
    ],
    unique_speakers_key_personnel_desc: [
      { uniqueKeyPersonnelCount: { order: 'desc' } },
    ],
    unique_speakers_key_personnel_percentage_asc: [
      { uniqueKeyPersonnelCountPercentage: { order: 'asc' } },
    ],
    unique_speakers_key_personnel_percentage_desc: [
      { uniqueKeyPersonnelCountPercentage: { order: 'desc' } },
    ],
  };

export const getEngagement = async (
  client: OpensearchClient<EngagementResponse>,
  options: EngagementListOptions,
): Promise<ListEngagementResponse> => {
  const { tags, currentPage, pageSize, timeRange, sort } = options;
  return client.search({
    searchTags: tags,
    currentPage: currentPage ?? undefined,
    pageSize: pageSize ?? undefined,
    timeRange,
    searchScope: 'flat',
    sort: presenterRepresentationOpensearchSort[sort],
  });
};

export const getEngagementPerformance = async (
  client: OpensearchClient<EngagementPerformance>,
  options: AnalyticsPerformanceOptions,
) => {
  const results = await client.search({
    searchTags: [],
    timeRange: options.timeRange,
    searchScope: 'flat',
    sort: [],
  });
  return results.items[0] as EngagementPerformance | undefined;
};

const meetingRepAttendanceOpensearchSort: OpensearchSortMap<SortMeetingRepAttendance> =
  {
    team_asc: [{ 'teamName.keyword': { order: 'asc' } }],
    team_desc: [{ 'teamName.keyword': { order: 'desc' } }],
    attendance_percentage_asc: [
      { limitedData: { order: 'desc' } },
      { attendancePercentage: { order: 'asc', missing: '_last' } },
    ],
    attendance_percentage_desc: [
      { attendancePercentage: { order: 'desc', missing: '_last' } },
      { limitedData: { order: 'asc' } },
    ],
  };

export const getMeetingRepAttendance = async (
  opensearchClient: OpensearchClient<MeetingRepAttendanceResponse>,
  { tags, currentPage, pageSize, timeRange, sort }: MeetingRepAttendanceOptions,
): Promise<ListMeetingRepAttendanceResponse | undefined> =>
  opensearchClient.search({
    searchTags: tags,
    currentPage: currentPage ?? undefined,
    pageSize: pageSize ?? undefined,
    timeRange,
    searchScope: 'flat',
    sort: sort ? meetingRepAttendanceOpensearchSort[sort] : undefined,
  });

export type TeamEngagementMetricsOptions = {
  teamId: string;
};

export type TeamEngagementMetrics = TeamEngagementMetricsProps;

export const getTeamEngagementMetrics = async (
  presenterClient: OpensearchClient<EngagementResponse>,
  attendanceClient: OpensearchClient<MeetingRepAttendanceResponse>,
  { teamId }: TeamEngagementMetricsOptions,
): Promise<TeamEngagementMetrics> => {
  const searchOptions = teamMetricsSearchOptions(teamId);
  const [presenters, attendance] = await Promise.all([
    presenterClient.search(searchOptions),
    attendanceClient.search(searchOptions),
  ]);
  const presenterItem = presenters.items[0];
  const attendanceItem = attendance.items[0];

  return {
    speakerDiversity: presenterItem?.uniqueAllRolesCountPercentage ?? null,
    traineePresentations:
      presenterItem?.uniqueKeyPersonnelCountPercentage ?? null,
    meetingRepAttendance: {
      percentage: attendanceItem?.attendancePercentage ?? null,
      limitedData: attendanceItem?.limitedData ?? true,
    },
  };
};
