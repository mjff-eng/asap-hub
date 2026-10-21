import {
  AwardsResponse,
  ListAwardsResponse,
  SortAwards,
} from '@asap-hub/model';
import { AnalyticsSearchOptionsWithFiltering } from '../utils/analytics-options';
import { OpensearchClient } from '../utils/opensearch/client';
import {
  AggregationBucket,
  OpensearchSortMap,
} from '../utils/opensearch/types';

export type AwardTypeOption = {
  value: string;
  label: string;
};

export type AwardsSearchOptions =
  AnalyticsSearchOptionsWithFiltering<SortAwards> & {
    awardType: string;
  };

const awardsOpensearchSort: OpensearchSortMap<SortAwards> = {
  team_asc: [{ 'teamName.keyword': { order: 'asc' } }],
  team_desc: [{ 'teamName.keyword': { order: 'desc' } }],
  awards_asc: [{ teamAwardsCount: { order: 'asc' } }],
  awards_desc: [{ teamAwardsCount: { order: 'desc' } }],
};

export const getAnalyticsAwards = async (
  opensearchClient: OpensearchClient<AwardsResponse>,
  {
    awardType,
    tags,
    currentPage,
    pageSize,
    timeRange,
    sort,
  }: AwardsSearchOptions,
): Promise<ListAwardsResponse | undefined> =>
  opensearchClient.search({
    awardType,
    searchTags: tags,
    currentPage: currentPage ?? undefined,
    pageSize: pageSize ?? undefined,
    timeRange,
    searchScope: 'extended',
    sort: sort ? awardsOpensearchSort[sort] : undefined,
  });

const AWARD_TYPES_AGGREGATION = 'awardTypes' as const;
const AWARD_TYPES_MAX = 100;

type AwardTypesAggregationResponse = {
  aggregations?: {
    [AWARD_TYPES_AGGREGATION]?: {
      buckets: (AggregationBucket & {
        names: { buckets: AggregationBucket[] };
      })[];
    };
  };
};

export const getAwardTypes = async (
  opensearchClient: OpensearchClient<AwardsResponse>,
): Promise<AwardTypeOption[]> => {
  const response =
    await opensearchClient.request<AwardTypesAggregationResponse>({
      size: 0,
      aggs: {
        [AWARD_TYPES_AGGREGATION]: {
          terms: { field: 'awardType', size: AWARD_TYPES_MAX },
          aggs: {
            names: { terms: { field: 'awardTypeName', size: 1 } },
          },
        },
      },
    });

  return (response.aggregations?.[AWARD_TYPES_AGGREGATION]?.buckets ?? [])
    .map(({ key, names }) => ({
      value: key,
      label: names.buckets[0]?.key ?? key,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};
