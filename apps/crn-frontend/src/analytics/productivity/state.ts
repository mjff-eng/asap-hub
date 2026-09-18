import {
  normalizeListOptions,
  withEmptyListFallback,
} from '@asap-hub/frontend-utils';
import {
  ListTeamProductivityResponse,
  ListUserProductivityResponse,
  SortTeamProductivity,
  SortUserProductivity,
  TeamProductivityOpensearchDocument,
  TeamProductivityPerformance,
  TeamProductivityResponse,
  UserProductivityPerformance,
  UserProductivityResponse,
} from '@asap-hub/model';
import { useSuspenseQuery } from '@tanstack/react-query';
import { AnalyticsSearchOptionsWithFiltering } from '../utils/analytics-options';
import { useAnalyticsOpensearch } from '../../hooks/opensearch';
import { makePerformanceQuery } from '../utils/state';
import {
  getTeamHubResearchOutputs,
  getTeamProductivity,
  getTeamProductivityPerformance,
  getUserProductivity,
  getUserProductivityPerformance,
  TeamHubResearchOutputs,
} from './api';
import { TeamMetricsOptions } from '../utils/team-metrics';

export const userProductivityQueryKeys = {
  all: ['analytics-user-productivity'] as const,
  lists: () => [...userProductivityQueryKeys.all, 'list'] as const,
  list: (options: AnalyticsSearchOptionsWithFiltering<SortUserProductivity>) =>
    [
      ...userProductivityQueryKeys.lists(),
      normalizeListOptions(options),
    ] as const,
};

export const teamProductivityQueryKeys = {
  all: ['analytics-team-productivity'] as const,
  lists: () => [...teamProductivityQueryKeys.all, 'list'] as const,
  list: (options: AnalyticsSearchOptionsWithFiltering<SortTeamProductivity>) =>
    [
      ...teamProductivityQueryKeys.lists(),
      normalizeListOptions(options),
    ] as const,
};

export const useAnalyticsUserProductivity = (
  options: AnalyticsSearchOptionsWithFiltering<SortUserProductivity>,
): ListUserProductivityResponse => {
  const opensearchClient =
    useAnalyticsOpensearch<UserProductivityResponse>(
      'user-productivity',
    ).client;

  return useSuspenseQuery({
    queryKey: userProductivityQueryKeys.list(options),
    queryFn: (): Promise<ListUserProductivityResponse> =>
      withEmptyListFallback(
        () => getUserProductivity(opensearchClient, options),
        { total: 0, items: [] },
      ),
  }).data;
};

const userProductivityPerformanceQuery =
  makePerformanceQuery<UserProductivityPerformance>(
    'user-productivity-performance',
  );

export const useUserProductivityPerformance =
  userProductivityPerformanceQuery.useSuspenseHook(
    getUserProductivityPerformance,
    'user-productivity-performance',
  );

export const useUserProductivityPerformanceValue =
  userProductivityPerformanceQuery.useValueHook;

const teamProductivityPerformanceQuery =
  makePerformanceQuery<TeamProductivityPerformance>(
    'team-productivity-performance',
  );

export const useTeamProductivityPerformance =
  teamProductivityPerformanceQuery.useSuspenseHook(
    getTeamProductivityPerformance,
    'team-productivity-performance',
  );

export const useTeamProductivityPerformanceValue =
  teamProductivityPerformanceQuery.useValueHook;

export const useAnalyticsTeamProductivity = (
  options: AnalyticsSearchOptionsWithFiltering<SortTeamProductivity>,
): ListTeamProductivityResponse => {
  const opensearchClient =
    useAnalyticsOpensearch<TeamProductivityResponse>(
      'team-productivity',
    ).client;

  return useSuspenseQuery({
    queryKey: teamProductivityQueryKeys.list(options),
    queryFn: (): Promise<ListTeamProductivityResponse> =>
      withEmptyListFallback(
        () => getTeamProductivity(opensearchClient, options),
        { total: 0, items: [] },
      ),
  }).data;
};

export const teamHubResearchOutputsQueryKeys = {
  all: ['analytics-team-hub-research-outputs'] as const,
  detail: (teamId: string) =>
    [...teamHubResearchOutputsQueryKeys.all, teamId] as const,
};

export const useTeamHubResearchOutputs = (
  options: TeamMetricsOptions,
): TeamHubResearchOutputs => {
  const opensearchClient =
    useAnalyticsOpensearch<TeamProductivityOpensearchDocument>(
      'team-productivity',
    ).client;

  return useSuspenseQuery({
    queryKey: teamHubResearchOutputsQueryKeys.detail(options.teamId),
    queryFn: (): Promise<TeamHubResearchOutputs> =>
      getTeamHubResearchOutputs(opensearchClient, options),
  }).data;
};
