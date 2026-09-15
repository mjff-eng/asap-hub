import {
  normalizeListOptions,
  nullOnUndefined,
  withEmptyListFallback,
} from '@asap-hub/frontend-utils';
import {
  EngagementPerformance,
  EngagementResponse,
  ListEngagementResponse,
  ListMeetingRepAttendanceResponse,
  MeetingRepAttendanceDataObject,
  MeetingRepAttendanceResponse,
  SortEngagement,
} from '@asap-hub/model';
import { useSuspenseQuery } from '@tanstack/react-query';

import { AnalyticsSearchOptionsWithFiltering } from '../utils/analytics-options';
import { useAnalyticsOpensearch } from '../../hooks';
import { makePerformanceQuery } from '../utils/state';
import {
  getEngagement,
  getEngagementPerformance,
  getMeetingRepAttendance,
  getTeamEngagementMetrics,
  MeetingRepAttendanceOptions,
  TeamEngagementMetrics,
} from './api';
import { TeamMetricsOptions } from '../utils/team-metrics';

export const engagementQueryKeys = {
  all: ['analytics-engagement'] as const,
  lists: () => [...engagementQueryKeys.all, 'list'] as const,
  list: (options: AnalyticsSearchOptionsWithFiltering<SortEngagement>) =>
    [...engagementQueryKeys.lists(), normalizeListOptions(options)] as const,
};

export const meetingRepAttendanceQueryKeys = {
  all: ['analytics-meeting-rep-attendance'] as const,
  lists: () => [...meetingRepAttendanceQueryKeys.all, 'list'] as const,
  list: (options: MeetingRepAttendanceOptions) =>
    [
      ...meetingRepAttendanceQueryKeys.lists(),
      normalizeListOptions(options),
    ] as const,
};

export const useAnalyticsEngagement = (
  options: AnalyticsSearchOptionsWithFiltering<SortEngagement>,
): ListEngagementResponse => {
  const opensearchClient = useAnalyticsOpensearch<EngagementResponse>(
    'presenter-representation',
  ).client;

  return useSuspenseQuery({
    queryKey: engagementQueryKeys.list(options),
    queryFn: (): Promise<ListEngagementResponse> =>
      withEmptyListFallback(() => getEngagement(opensearchClient, options), {
        total: 0,
        items: [],
      }),
  }).data;
};

const engagementPerformanceQuery = makePerformanceQuery<EngagementPerformance>(
  'presenter-representation-performance',
);

export const useEngagementPerformance =
  engagementPerformanceQuery.useSuspenseHook(
    getEngagementPerformance,
    'presenter-representation-performance',
  );

export const useEngagementPerformanceValue =
  engagementPerformanceQuery.useValueHook;

export const useAnalyticsMeetingRepAttendance = (
  options: MeetingRepAttendanceOptions,
): ListMeetingRepAttendanceResponse => {
  const opensearchClient =
    useAnalyticsOpensearch<MeetingRepAttendanceDataObject>('attendance').client;

  // Cache identity depends on exactly these option fields.
  const stateOptions: MeetingRepAttendanceOptions = {
    currentPage: options.currentPage,
    pageSize: options.pageSize,
    tags: options.tags,
    timeRange: options.timeRange,
    sort: options.sort,
  };

  const { data } = useSuspenseQuery({
    queryKey: meetingRepAttendanceQueryKeys.list(stateOptions),
    queryFn: () =>
      withEmptyListFallback(
        () =>
          nullOnUndefined(() =>
            getMeetingRepAttendance(opensearchClient, stateOptions),
          ),
        { total: 0, items: [] },
      ),
  });
  return data as ListMeetingRepAttendanceResponse;
};

export const teamEngagementMetricsQueryKeys = {
  all: ['analytics-team-engagement-metrics'] as const,
  detail: (teamId: string) =>
    [...teamEngagementMetricsQueryKeys.all, teamId] as const,
};

export const useTeamEngagementMetrics = (
  options: TeamMetricsOptions,
): TeamEngagementMetrics => {
  const presenterClient = useAnalyticsOpensearch<EngagementResponse>(
    'presenter-representation',
  ).client;
  const attendanceClient =
    useAnalyticsOpensearch<MeetingRepAttendanceResponse>('attendance').client;

  return useSuspenseQuery({
    queryKey: teamEngagementMetricsQueryKeys.detail(options.teamId),
    queryFn: (): Promise<TeamEngagementMetrics> =>
      getTeamEngagementMetrics(presenterClient, attendanceClient, options),
  }).data;
};
