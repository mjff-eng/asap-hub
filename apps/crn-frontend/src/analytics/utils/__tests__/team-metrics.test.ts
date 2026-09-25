import { teamMetricsSearchOptions } from '../team-metrics';

describe('teamMetricsSearchOptions', () => {
  it('targets the all-time record of a single team', () => {
    expect(teamMetricsSearchOptions('team-id-1')).toEqual({
      searchTags: [],
      searchScope: 'flat',
      sort: [],
      currentPage: 0,
      pageSize: 1,
      timeRange: 'all',
      teamId: 'team-id-1',
    });
  });
});
