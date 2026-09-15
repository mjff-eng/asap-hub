import { OpensearchSearchOptions } from './opensearch';

export type TeamMetricsOptions = {
  teamId: string;
};

export const teamMetricsSearchOptions = (
  teamId: string,
): OpensearchSearchOptions => ({
  searchTags: [],
  searchScope: 'flat',
  sort: [],
  currentPage: 0,
  pageSize: 1,
  timeRange: 'all',
  teamId,
});
