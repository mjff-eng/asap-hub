/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AwardsDataObject,
  AwardTypeDataObject,
  timeRanges,
  TimeRangeOption,
} from '@asap-hub/model';
import { indexOpensearchData } from '@asap-hub/server-common';
import { PAGE_SIZE } from '../constants';
import {
  exportAnalyticsData,
  exportMetricToOpensearch,
} from '../sync-opensearch-analytics';

jest.mock('../../../src/config', () => ({
  awsRegion: 'us-east-1',
  environment: 'test',
  opensearchPassword: 'test-password',
  opensearchUsername: 'test-username',
}));

jest.mock('@asap-hub/server-common', () => ({
  indexOpensearchData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/dependencies/analytics.dependencies', () => ({
  getAnalyticsDataProvider: jest.fn().mockReturnValue({}),
}));

jest.mock('../preprint-compliance', () => ({
  exportPreprintComplianceData: jest.fn().mockResolvedValue([]),
}));

jest.mock('../publication-compliance', () => ({
  exportPublicationComplianceData: jest.fn().mockResolvedValue([]),
}));

const mockFetchAwardTypes = jest.fn();
const mockFetchAwards = jest.fn();

jest.mock('../../../src/controllers/analytics.controller', () =>
  jest.fn().mockImplementation(() => ({
    fetchAwardTypes: mockFetchAwardTypes,
    fetchAwards: mockFetchAwards,
  })),
);

const mockIndexOpensearchData = indexOpensearchData as jest.MockedFunction<
  typeof indexOpensearchData
>;

const awardTypes: AwardTypeDataObject[] = [
  {
    id: 'award-type-network-spotlight',
    name: 'Network Spotlight',
    slug: 'network-spotlight',
  },
  {
    id: 'award-type-os-champion',
    name: 'Open Science Champion',
    slug: 'open-science-champion',
  },
];

const makeTeam = (
  index: number,
  awardType: AwardTypeDataObject,
  timeRange: TimeRangeOption,
): AwardsDataObject => ({
  id: `team-${index}_${awardType.slug}_${timeRange}`,
  teamId: `team-${index}`,
  teamName: `Team ${index}`,
  isTeamInactive: false,
  teamAwardsCount: index % 2,
  timeRange,
  awardType: awardType.slug,
  awardTypeName: awardType.name,
  users:
    index % 2 === 1
      ? [{ id: `user-${index}`, name: `User ${index}`, awardsCount: 1 }]
      : [],
});

const mockAwardsPages = (teamCount: number) => {
  mockFetchAwards.mockImplementation(async ({ skip, take, filter }: any) => ({
    total: teamCount,
    items: Array.from(
      { length: Math.max(0, Math.min(take, teamCount - skip)) },
      (_, i) => makeTeam(skip + i, filter.awardType, filter.timeRange),
    ),
  }));
};

describe('Awards sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    mockFetchAwardTypes.mockResolvedValue(awardTypes);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('exportAnalyticsData', () => {
    it('should generate one document per award type, time range and team', async () => {
      const teamCount = 3;
      mockAwardsPages(teamCount);

      const documents = await exportAnalyticsData('awards');

      expect(mockFetchAwardTypes).toHaveBeenCalledTimes(1);
      expect(documents).toHaveLength(
        awardTypes.length * timeRanges.length * teamCount,
      );

      const ids = documents.map((doc) => doc.id);
      expect(new Set(ids).size).toBe(documents.length);
      expect(ids).toEqual(
        expect.arrayContaining([
          'team-0_network-spotlight_30d',
          'team-2_open-science-champion_all',
        ]),
      );
    });

    it('should pass the documents through unchanged', async () => {
      mockAwardsPages(1);

      const documents = await exportAnalyticsData('awards');

      const networkSpotlightDoc = documents.find(
        (doc) =>
          doc.awardType === 'network-spotlight' && doc.timeRange === '90d',
      );
      expect(networkSpotlightDoc).toEqual(makeTeam(0, awardTypes[0]!, '90d'));
    });

    it('should query every award type and time range combination with the award type', async () => {
      mockAwardsPages(1);

      await exportAnalyticsData('awards');

      expect(mockFetchAwards).toHaveBeenCalledTimes(
        awardTypes.length * timeRanges.length,
      );
      for (const awardType of awardTypes) {
        for (const timeRange of timeRanges) {
          expect(mockFetchAwards).toHaveBeenCalledWith({
            take: PAGE_SIZE,
            skip: 0,
            filter: { timeRange, awardType },
          });
        }
      }
    });

    it('should fetch a second page when total exceeds the page size', async () => {
      const teamCount = PAGE_SIZE + 5;
      mockAwardsPages(teamCount);

      const documents = await exportAnalyticsData('awards');

      expect(documents).toHaveLength(
        awardTypes.length * timeRanges.length * teamCount,
      );
      expect(mockFetchAwards).toHaveBeenCalledTimes(
        awardTypes.length * timeRanges.length * 2,
      );
      expect(mockFetchAwards).toHaveBeenCalledWith({
        take: PAGE_SIZE,
        skip: PAGE_SIZE,
        filter: { timeRange: 'all', awardType: awardTypes[1] },
      });
    });

    it('should return no documents when there are no award types', async () => {
      mockFetchAwardTypes.mockResolvedValue([]);
      mockAwardsPages(3);

      const documents = await exportAnalyticsData('awards');

      expect(documents).toEqual([]);
      expect(mockFetchAwards).not.toHaveBeenCalled();
    });

    it('should stop paginating when a page comes back empty', async () => {
      mockFetchAwards.mockResolvedValue({ total: 10, items: [] });

      const documents = await exportAnalyticsData('awards');

      expect(documents).toEqual([]);
      expect(mockFetchAwards).toHaveBeenCalledTimes(
        awardTypes.length * timeRanges.length,
      );
    });
  });

  describe('exportMetricToOpensearch', () => {
    it('should index into the awards alias using the document id as the opensearch id', async () => {
      mockAwardsPages(2);

      await exportMetricToOpensearch('awards');

      expect(mockIndexOpensearchData).toHaveBeenCalledWith(
        expect.objectContaining({
          indexAlias: 'awards',
          useDocumentIdAsOpensearchId: true,
          getData: expect.any(Function),
        }),
      );

      const options = mockIndexOpensearchData.mock.calls[0]![0] as any;
      const data = await options.getData();

      expect(data.documents).toHaveLength(
        awardTypes.length * timeRanges.length * 2,
      );
      expect(data.mapping.properties).toMatchObject({
        id: { type: 'keyword' },
        awardType: { type: 'keyword' },
        awardTypeName: { type: 'keyword' },
        timeRange: { type: 'keyword' },
        users: { type: 'nested' },
      });
    });
  });
});
