import {
  normalizeListOptions,
  nullOnUndefined,
  withEmptyListFallback,
} from '@asap-hub/frontend-utils';
import {
  ListTeamCollaborationResponse,
  ListUserCollaborationResponse,
  SortSharingPrelimFindings,
  SortTeamCollaboration,
  SortUserCollaboration,
  TeamCollaborationPerformance,
  UserCollaborationPerformance,
  ListPreliminaryDataSharingResponse,
  PreliminaryDataSharingDataObject,
  ListSharingPrelimFindingsResponse,
  SharingPrelimFindingsResponse,
  LimitedTimeRangeOption,
  UserCollaborationResponse,
  TeamCollaborationResponse,
  TeamCollaborationOpensearchDocument,
} from '@asap-hub/model';
import { useSuspenseQuery } from '@tanstack/react-query';
import { AnalyticsSearchOptionsWithFiltering } from '../utils/analytics-options';
import { useAnalyticsOpensearch } from '../../hooks/opensearch';
import { makePerformanceQuery } from '../utils/state';
import {
  getUserCollaboration,
  getTeamCollaboration,
  getTeamCollaborationPerformance,
  getUserCollaborationPerformance,
  getPreliminaryDataSharing,
  getTeamCoProduction,
  PreliminaryDataSharingSearchOptions,
  TeamCoProduction,
  TeamCoProductionOptions,
} from './api';

export const userCollaborationQueryKeys = {
  all: ['analytics-user-collaboration'] as const,
  lists: () => [...userCollaborationQueryKeys.all, 'list'] as const,
  list: (options: AnalyticsSearchOptionsWithFiltering<SortUserCollaboration>) =>
    [
      ...userCollaborationQueryKeys.lists(),
      normalizeListOptions(options),
    ] as const,
};

export const teamCollaborationQueryKeys = {
  all: ['analytics-team-collaboration'] as const,
  lists: () => [...teamCollaborationQueryKeys.all, 'list'] as const,
  list: (options: AnalyticsSearchOptionsWithFiltering<SortTeamCollaboration>) =>
    [
      ...teamCollaborationQueryKeys.lists(),
      normalizeListOptions(options),
    ] as const,
};

export const teamCoProductionQueryKeys = {
  all: ['analytics-team-co-production'] as const,
  detail: (teamId: string) =>
    [...teamCoProductionQueryKeys.all, teamId] as const,
};

export const prelimDataSharingQueryKeys = {
  all: ['analytics-preliminary-data-sharing'] as const,
  lists: () => [...prelimDataSharingQueryKeys.all, 'list'] as const,
  list: (options: PreliminaryDataSharingSearchOptions) =>
    [
      ...prelimDataSharingQueryKeys.lists(),
      normalizeListOptions(options),
    ] as const,
};

export const useAnalyticsUserCollaboration = (
  options: AnalyticsSearchOptionsWithFiltering<SortUserCollaboration>,
): ListUserCollaborationResponse => {
  const opensearchClient =
    useAnalyticsOpensearch<UserCollaborationResponse>(
      'user-collaboration',
    ).client;

  return useSuspenseQuery({
    queryKey: userCollaborationQueryKeys.list(options),
    queryFn: (): Promise<ListUserCollaborationResponse> =>
      withEmptyListFallback(
        () => getUserCollaboration(opensearchClient, options),
        { total: 0, items: [] },
      ),
  }).data;
};

export const useAnalyticsTeamCollaboration = (
  options: AnalyticsSearchOptionsWithFiltering<SortTeamCollaboration>,
): ListTeamCollaborationResponse => {
  const opensearchClient =
    useAnalyticsOpensearch<TeamCollaborationResponse>(
      'team-collaboration',
    ).client;

  return useSuspenseQuery({
    queryKey: teamCollaborationQueryKeys.list(options),
    queryFn: (): Promise<ListTeamCollaborationResponse> =>
      withEmptyListFallback(
        () => getTeamCollaboration(opensearchClient, options),
        { total: 0, items: [] },
      ),
  }).data;
};

export const useTeamCoProduction = (
  options: TeamCoProductionOptions,
): TeamCoProduction => {
  const opensearchClient =
    useAnalyticsOpensearch<TeamCollaborationOpensearchDocument>(
      'team-collaboration',
    ).client;

  return useSuspenseQuery({
    queryKey: teamCoProductionQueryKeys.detail(options.teamId),
    queryFn: (): Promise<TeamCoProduction> =>
      getTeamCoProduction(opensearchClient, options),
  }).data;
};

const teamCollaborationPerformanceQuery =
  makePerformanceQuery<TeamCollaborationPerformance>(
    'team-collaboration-performance',
  );

export const useTeamCollaborationPerformance =
  teamCollaborationPerformanceQuery.useSuspenseHook(
    getTeamCollaborationPerformance,
    'team-collaboration-performance',
  );

export const useTeamCollaborationPerformanceValue =
  teamCollaborationPerformanceQuery.useValueHook;

const userCollaborationPerformanceQuery =
  makePerformanceQuery<UserCollaborationPerformance>(
    'user-collaboration-performance',
  );

export const useUserCollaborationPerformance =
  userCollaborationPerformanceQuery.useSuspenseHook(
    getUserCollaborationPerformance,
    'user-collaboration-performance',
  );

export const useUserCollaborationPerformanceValue =
  userCollaborationPerformanceQuery.useValueHook;

export const useAnalyticsSharingPrelimFindings = (
  options: Omit<
    AnalyticsSearchOptionsWithFiltering<SortSharingPrelimFindings>,
    'timeRange'
  > & {
    timeRange: LimitedTimeRangeOption;
  },
): ListSharingPrelimFindingsResponse => {
  const opensearchClient =
    useAnalyticsOpensearch<PreliminaryDataSharingDataObject>(
      'preliminary-data-sharing',
    ).client;

  // Cache identity depends on exactly these option fields.
  const stateOptions: PreliminaryDataSharingSearchOptions = {
    currentPage: options.currentPage,
    pageSize: options.pageSize,
    tags: options.tags,
    timeRange: options.timeRange,
    sort: options.sort,
  };

  const { data } = useSuspenseQuery({
    queryKey: prelimDataSharingQueryKeys.list(stateOptions),
    queryFn: () =>
      withEmptyListFallback(
        () =>
          nullOnUndefined(() =>
            getPreliminaryDataSharing(opensearchClient, stateOptions),
          ),
        { total: 0, items: [] },
      ),
  });
  const preliminaryDataSharing = data as ListPreliminaryDataSharingResponse;

  const transformedItems: SharingPrelimFindingsResponse[] =
    preliminaryDataSharing.items.map((item) => ({
      teamId: item.teamId,
      teamName: item.teamName,
      isTeamInactive: item.isTeamInactive,
      teamPercentShared: item.percentShared,
      limitedData: item.limitedData,
      timeRange: item.timeRange,
    }));

  return {
    items: transformedItems,
    total: preliminaryDataSharing.total,
  };
};
