import { AwardsResponse, SortAwards } from '@asap-hub/model';
import { OpensearchClient } from '../../utils/opensearch';
import { AwardsSearchOptions, getAnalyticsAwards, getAwardTypes } from '../api';

jest.mock('../../../config');

const defaultOptions: AwardsSearchOptions = {
  awardType: 'open-science-champion',
  currentPage: null,
  pageSize: null,
  tags: [],
  timeRange: 'all',
  sort: 'team_asc',
};

describe('getAnalyticsAwards', () => {
  let opensearchClient: OpensearchClient<AwardsResponse>;

  beforeEach(() => {
    opensearchClient = new OpensearchClient<AwardsResponse>('awards', 'token');
    jest
      .spyOn(opensearchClient, 'search')
      .mockResolvedValue({ items: [], total: 0 });
  });

  it('searches the selected award type', async () => {
    await getAnalyticsAwards(opensearchClient, {
      ...defaultOptions,
      currentPage: 2,
      pageSize: 20,
      tags: ['Team One'],
      timeRange: '30d',
    });

    expect(opensearchClient.search).toHaveBeenCalledWith({
      awardType: 'open-science-champion',
      searchTags: ['Team One'],
      currentPage: 2,
      pageSize: 20,
      timeRange: '30d',
      searchScope: 'extended',
      sort: [{ 'teamName.keyword': { order: 'asc' } }],
    });
  });

  it('converts null pagination to undefined', async () => {
    await getAnalyticsAwards(opensearchClient, defaultOptions);

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: undefined,
        pageSize: undefined,
      }),
    );
  });

  it.each<[SortAwards, unknown]>([
    ['team_asc', [{ 'teamName.keyword': { order: 'asc' } }]],
    ['team_desc', [{ 'teamName.keyword': { order: 'desc' } }]],
    ['awards_asc', [{ teamAwardsCount: { order: 'asc' } }]],
    ['awards_desc', [{ teamAwardsCount: { order: 'desc' } }]],
  ])('maps the %s sort', async (sort, expected) => {
    await getAnalyticsAwards(opensearchClient, { ...defaultOptions, sort });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ sort: expected }),
    );
  });

  it('does not send a sort when none is provided', async () => {
    await getAnalyticsAwards(opensearchClient, {
      ...defaultOptions,
      sort: undefined as unknown as SortAwards,
    });

    expect(opensearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ sort: undefined }),
    );
  });
});

describe('getAwardTypes', () => {
  let opensearchClient: OpensearchClient<AwardsResponse>;

  beforeEach(() => {
    opensearchClient = new OpensearchClient<AwardsResponse>('awards', 'token');
  });

  it('aggregates the award types of the index', async () => {
    const requestSpy = jest
      .spyOn(opensearchClient, 'request')
      .mockResolvedValue({ aggregations: { awardTypes: { buckets: [] } } });

    await getAwardTypes(opensearchClient);

    expect(requestSpy).toHaveBeenCalledWith({
      size: 0,
      aggs: {
        awardTypes: {
          terms: { field: 'awardType', size: 100 },
          aggs: {
            names: { terms: { field: 'awardTypeName', size: 1 } },
          },
        },
      },
    });
  });

  it('returns the award types sorted by name', async () => {
    jest.spyOn(opensearchClient, 'request').mockResolvedValue({
      aggregations: {
        awardTypes: {
          buckets: [
            {
              key: 'open-science-champion',
              doc_count: 4,
              names: {
                buckets: [{ key: 'Open Science Champion', doc_count: 4 }],
              },
            },
            {
              key: 'network-spotlight',
              doc_count: 2,
              names: {
                buckets: [{ key: 'Network Spotlight', doc_count: 2 }],
              },
            },
          ],
        },
      },
    });

    expect(await getAwardTypes(opensearchClient)).toEqual([
      { value: 'network-spotlight', label: 'Network Spotlight' },
      { value: 'open-science-champion', label: 'Open Science Champion' },
    ]);
  });

  it('falls back to the slug when the award type has no name', async () => {
    jest.spyOn(opensearchClient, 'request').mockResolvedValue({
      aggregations: {
        awardTypes: {
          buckets: [
            { key: 'award-slug', doc_count: 1, names: { buckets: [] } },
          ],
        },
      },
    });

    expect(await getAwardTypes(opensearchClient)).toEqual([
      { value: 'award-slug', label: 'award-slug' },
    ]);
  });

  it('returns an empty list when there are no aggregations', async () => {
    jest.spyOn(opensearchClient, 'request').mockResolvedValue({});

    expect(await getAwardTypes(opensearchClient)).toEqual([]);
  });
});
