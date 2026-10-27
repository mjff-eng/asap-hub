import {
  normalizeListOptions,
  nullOnUndefined,
  withEmptyListFallback,
} from '@asap-hub/frontend-utils';
import { AwardsResponse, ListAwardsResponse } from '@asap-hub/model';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useAnalyticsOpensearch } from '../../hooks';
import {
  AwardsSearchOptions,
  AwardTypeOption,
  getAnalyticsAwards,
  getAwardTypes,
} from './api';

type AwardsStateOptionKeyData = Pick<
  AwardsSearchOptions,
  'awardType' | 'currentPage' | 'pageSize' | 'sort' | 'tags' | 'timeRange'
>;

export const awardsQueryKeys = {
  all: ['analytics-awards'] as const,
  types: () => [...awardsQueryKeys.all, 'types'] as const,
  lists: () => [...awardsQueryKeys.all, 'list'] as const,
  list: (options: AwardsStateOptionKeyData) =>
    [...awardsQueryKeys.lists(), normalizeListOptions(options)] as const,
};

export const useAnalyticsAwardTypes = (): AwardTypeOption[] => {
  const opensearchClient =
    useAnalyticsOpensearch<AwardsResponse>('awards').client;

  return useSuspenseQuery({
    queryKey: awardsQueryKeys.types(),
    queryFn: () => getAwardTypes(opensearchClient),
  }).data;
};

export const useAnalyticsAwards = (
  options: AwardsSearchOptions,
): ListAwardsResponse => {
  const opensearchClient =
    useAnalyticsOpensearch<AwardsResponse>('awards').client;

  const { awardType, currentPage, pageSize, sort, tags, timeRange } = options;
  return useSuspenseQuery({
    queryKey: awardsQueryKeys.list({
      awardType,
      currentPage,
      pageSize,
      sort,
      tags,
      timeRange,
    }),
    queryFn: () =>
      withEmptyListFallback(
        () =>
          nullOnUndefined(() => getAnalyticsAwards(opensearchClient, options)),
        { total: 0, items: [] },
      ),
  }).data as ListAwardsResponse;
};
