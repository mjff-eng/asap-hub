import {
  AnalyticsTeamLeadershipResponse,
  ListAnalyticsTeamLeadershipResponse,
  ListOSChampionOpensearchResponse,
  OSChampionOpensearchResponse,
  SortLeadershipAndMembership,
  SortOSChampion,
} from '@asap-hub/model';
import { MetricOption } from '@asap-hub/react-components';
import { AnalyticsSearchOptionsWithFiltering } from '../utils/analytics-options';
import { OpensearchClient } from '../utils/opensearch/client';
import { OpensearchSort, OpensearchSortMap } from '../utils/opensearch/types';

export type AnalyticsSearchOptions = {
  metric?: MetricOption;
  currentPage: number | null;
  pageSize: number | null;
  tags: string[];
};

export type AnalyticsSearchOptionsWithSort = AnalyticsSearchOptions & {
  sort?: SortLeadershipAndMembership;
};

export const getAnalyticsLeadership = async (
  client: OpensearchClient<AnalyticsTeamLeadershipResponse>,
  { tags, currentPage, pageSize, sort }: AnalyticsSearchOptionsWithSort,
): Promise<ListAnalyticsTeamLeadershipResponse | undefined> => {
  let opensearchSort: OpensearchSort[] | undefined;
  if (sort) {
    const fieldMap: Record<string, string> = {
      team: 'displayName.keyword',
      wg_current_leadership: 'workingGroupLeadershipRoleCount',
      wg_previous_leadership: 'workingGroupPreviousLeadershipRoleCount',
      wg_current_membership: 'workingGroupMemberCount',
      wg_previous_membership: 'workingGroupPreviousMemberCount',
      ig_current_leadership: 'interestGroupLeadershipRoleCount',
      ig_previous_leadership: 'interestGroupPreviousLeadershipRoleCount',
      ig_current_membership: 'interestGroupMemberCount',
      ig_previous_membership: 'interestGroupPreviousMemberCount',
    };
    const direction = sort.endsWith('_asc') ? 'asc' : 'desc';
    const baseSort = sort.replace(/_(asc|desc)$/, '');
    const field = fieldMap[baseSort];
    if (field) {
      opensearchSort = [
        {
          [field]: {
            order: direction,
          },
        },
      ];
    }
  }

  return client.search({
    searchTags: tags,
    currentPage: currentPage ?? undefined,
    pageSize: pageSize ?? undefined,
    timeRange: 'all',
    searchScope: 'flat',
    sort: opensearchSort,
  });
};

const osChampionOpensearchSort: OpensearchSortMap<SortOSChampion> = {
  team_asc: [{ 'teamName.keyword': { order: 'asc' } }],
  team_desc: [{ 'teamName.keyword': { order: 'desc' } }],
  os_champion_awards_asc: [{ teamAwardsCount: { order: 'asc' } }],
  os_champion_awards_desc: [{ teamAwardsCount: { order: 'desc' } }],
};

export const getAnalyticsOSChampion = async (
  opensearchClient: OpensearchClient<OSChampionOpensearchResponse>,
  {
    tags,
    currentPage,
    pageSize,
    timeRange,
    sort,
  }: AnalyticsSearchOptionsWithFiltering<SortOSChampion>,
): Promise<ListOSChampionOpensearchResponse | undefined> =>
  opensearchClient.search({
    searchTags: tags,
    currentPage: currentPage ?? undefined,
    pageSize: pageSize ?? undefined,
    timeRange,
    searchScope: 'extended',
    sort: sort ? osChampionOpensearchSort[sort] : undefined,
  });

export type TeamLeadershipMetricsOptions = {
  teamId: string;
};

export type TeamLeadershipMetrics = {
  workingGroupLead: boolean;
  interestGroupLead: boolean;
};

const hasLeadership = (currentCount = 0, previousCount = 0): boolean =>
  currentCount + previousCount > 0;

export const getTeamLeadershipMetrics = async (
  workingGroupClient: OpensearchClient<AnalyticsTeamLeadershipResponse>,
  interestGroupClient: OpensearchClient<AnalyticsTeamLeadershipResponse>,
  { teamId }: TeamLeadershipMetricsOptions,
): Promise<TeamLeadershipMetrics> => {
  const searchOptions = {
    searchTags: [],
    searchScope: 'flat' as const,
    sort: [],
    currentPage: 0,
    pageSize: 1,
    timeRange: 'all' as const,
    teamId,
  };
  const [workingGroup, interestGroup] = await Promise.all([
    workingGroupClient.search(searchOptions),
    interestGroupClient.search(searchOptions),
  ]);
  const workingGroupItem = workingGroup.items[0];
  const interestGroupItem = interestGroup.items[0];

  return {
    workingGroupLead: hasLeadership(
      workingGroupItem?.workingGroupLeadershipRoleCount,
      workingGroupItem?.workingGroupPreviousLeadershipRoleCount,
    ),
    interestGroupLead: hasLeadership(
      interestGroupItem?.interestGroupLeadershipRoleCount,
      interestGroupItem?.interestGroupPreviousLeadershipRoleCount,
    ),
  };
};
