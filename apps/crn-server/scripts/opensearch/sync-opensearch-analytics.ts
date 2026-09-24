import { mapLimit } from 'async';
import {
  ListResponse,
  timeRanges,
  documentCategories,
  outputTypes,
  TeamCollaborationDataObject,
  UserCollaborationDataObject,
} from '@asap-hub/model';
import { indexOpensearchData } from '@asap-hub/server-common';

import {
  awsRegion,
  environment,
  opensearchPassword,
  opensearchUsername,
} from '../../src/config';
import AnalyticsController from '../../src/controllers/analytics.controller';
import { getAnalyticsDataProvider } from '../../src/dependencies/analytics.dependencies';
import {
  MAX_CONCURRENT_COMBINATIONS,
  MAX_CONCURRENT_PAGES,
  metricConfig,
  PAGE_SIZE,
  validMetrics,
} from './constants';
import { exportLeadershipData } from './leadership';
import { exportPreprintComplianceData } from './preprint-compliance';
import { exportPublicationComplianceData } from './publication-compliance';
import { exportMilestonesData } from './milestones';
import { exportAimsData } from './aims';
import type { MetricObject, Metrics } from './types';

export const exportAnalyticsData = async <T extends Metrics>(
  metric: T,
): Promise<MetricObject<T>[]> => {
  if (metric === 'preprint-compliance') {
    return exportPreprintComplianceData() as Promise<MetricObject<T>[]>;
  }

  if (metric === 'publication-compliance') {
    return exportPublicationComplianceData() as Promise<MetricObject<T>[]>;
  }

  if (metric === 'ig-leadership') {
    return exportLeadershipData('ig-leadership') as Promise<MetricObject<T>[]>;
  }

  if (metric === 'wg-leadership') {
    return exportLeadershipData('wg-leadership') as Promise<MetricObject<T>[]>;
  }

  if (metric === 'project-milestones') {
    return exportMilestonesData() as Promise<MetricObject<T>[]>;
  }

  if (metric === 'project-aims') {
    return exportAimsData() as Promise<MetricObject<T>[]>;
  }

  const analyticsController = new AnalyticsController(
    getAnalyticsDataProvider(),
  );

  let recordCount = 0;
  let total = 0;
  let records: ListResponse<MetricObject<T>> | null = null;
  let page = 1;
  const documents: MetricObject<T>[] = [];

  const fetchRecords = async () => {
    const options = {
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    };

    switch (metric) {
      case 'os-champion':
        const osChampionRecords = await Promise.all(
          timeRanges.map(
            (timeRange) =>
              analyticsController.fetchOSChampion({
                ...options,
                filter: { timeRange },
              }) as Promise<ListResponse<MetricObject<T>>>,
          ),
        );
        return {
          total: osChampionRecords.reduce(
            (sum, records) => sum + records.total,
            0,
          ),
          items: osChampionRecords.flatMap((records) => records.items),
        } as ListResponse<MetricObject<T>>;
      case 'preliminary-data-sharing':
        const preliminaryDataSharingTimeRanges = ['all', 'last-year'] as const;
        const preliminaryDataSharingRecords = await Promise.all(
          preliminaryDataSharingTimeRanges.map(
            (timeRange) =>
              analyticsController.fetchPreliminaryDataSharing({
                ...options,
                filter: { timeRange },
              }) as Promise<ListResponse<MetricObject<T>>>,
          ),
        );

        return {
          total: preliminaryDataSharingRecords.reduce(
            (sum, records) => sum + records.total,
            0,
          ),
          items: preliminaryDataSharingRecords.flatMap(
            (records) => records.items,
          ),
        } as ListResponse<MetricObject<T>>;
      case 'attendance':
        const attendanceTimeRanges = ['all', 'last-year'] as const;
        const attendanceRecords = await Promise.all(
          attendanceTimeRanges.map(
            (timeRange) =>
              analyticsController.fetchAttendance({
                ...options,
                filter: { timeRange },
              }) as Promise<ListResponse<MetricObject<T>>>,
          ),
        );

        return {
          total: attendanceRecords.reduce(
            (sum, records) => sum + records.total,
            0,
          ),
          items: attendanceRecords.flatMap((records) => records.items),
        } as ListResponse<MetricObject<T>>;

      case 'user-productivity':
        // Fetch all pages for each timeRange/documentCategory combination
        const allUserProductivityItems: MetricObject<T>[] = [];

        /* eslint-disable no-await-in-loop */
        for (const timeRange of timeRanges) {
          for (const documentCategory of documentCategories) {
            let userPage = 1;
            let userTotal = 0;
            let userRecordCount = 0;

            do {
              const userProductivityResponse =
                (await analyticsController.fetchUserProductivity({
                  take: PAGE_SIZE,
                  skip: (userPage - 1) * PAGE_SIZE,
                  filter: { timeRange, documentCategory },
                })) as ListResponse<MetricObject<T>>;

              if (userProductivityResponse) {
                userTotal = userProductivityResponse.total;
                userPage++;
                userRecordCount += userProductivityResponse.items.length;

                // Enrich items with metadata
                const enrichedItems = userProductivityResponse.items.map(
                  (item) => ({
                    ...item,
                    timeRange,
                    documentCategory,
                  }),
                );

                allUserProductivityItems.push(...enrichedItems);
              }
            } while (userTotal > userRecordCount);
          }
        }
        /* eslint-enable no-await-in-loop */

        return {
          total: allUserProductivityItems.length,
          items: allUserProductivityItems,
        } as ListResponse<MetricObject<T>>;

      case 'team-productivity':
        // Helper to fetch all pages for a single timeRange/outputType combination
        const fetchAllPagesForTeamCombination = async (
          timeRange: (typeof timeRanges)[number],
          outputType: (typeof outputTypes)[number],
        ): Promise<MetricObject<T>[]> => {
          const items: MetricObject<T>[] = [];
          let page = 1;
          let total = 0;
          let recordCount = 0;

          do {
            const response = (await analyticsController.fetchTeamProductivity({
              take: PAGE_SIZE,
              skip: (page - 1) * PAGE_SIZE,
              filter: { timeRange, outputType },
            })) as ListResponse<MetricObject<T>>;

            if (response) {
              total = response.total;
              page++;
              recordCount += response.items.length;

              const enrichedItems = response.items.map((item) => ({
                ...item,
                timeRange,
                outputType,
              }));

              items.push(...enrichedItems);
            }
          } while (total > recordCount);

          return items;
        };

        // Create all timeRange<->outputType combinations
        const teamCombinations = timeRanges.flatMap((timeRange) =>
          outputTypes.map((outputType) => ({ timeRange, outputType })),
        );

        // Process combinations with controlled concurrency
        const teamResultArrays = await mapLimit(
          teamCombinations,
          MAX_CONCURRENT_COMBINATIONS,
          async (combination: (typeof teamCombinations)[number]) =>
            fetchAllPagesForTeamCombination(
              combination.timeRange,
              combination.outputType,
            ),
        );

        const items = teamResultArrays.flat();

        return {
          total: items.length,
          items,
        } as ListResponse<MetricObject<T>>;

      case 'user-collaboration': {
        // Helper to fetch all pages for a single timeRange/documentCategory combination
        const fetchAllPagesForUserCollaborationCombination = async (
          timeRange: (typeof timeRanges)[number],
          documentCategory: (typeof documentCategories)[number],
        ): Promise<MetricObject<T>[]> => {
          const items: MetricObject<T>[] = [];

          console.log(
            `Fetching user-collaboration data for ${timeRange}/${documentCategory}...`,
          );

          // First request → get total pages
          const firstPage = (await analyticsController.fetchUserCollaboration({
            take: PAGE_SIZE,
            skip: 0,
            filter: { timeRange, documentCategory },
          })) as ListResponse<MetricObject<T>>;

          if (!firstPage) {
            console.log(`No data found for ${timeRange}/${documentCategory}`);
            return items;
          }

          const total = firstPage.total;
          const pages = Math.ceil(total / PAGE_SIZE);

          console.log(
            `Found ${total} items (${pages} pages) for ${timeRange}/${documentCategory}`,
          );

          // Build page indexes [0, 1, 2, ...]
          const pageIndexes = [...Array(pages).keys()];

          // Fetch all pages with concurrency control
          const responses = await mapLimit(
            pageIndexes,
            MAX_CONCURRENT_PAGES,
            async (pageIndex: number) => {
              // Use cached first page
              if (pageIndex === 0) return firstPage;

              console.log(
                `Fetching page ${
                  pageIndex + 1
                }/${pages} for ${timeRange}/${documentCategory}...`,
              );

              return (await analyticsController.fetchUserCollaboration({
                take: PAGE_SIZE,
                skip: pageIndex * PAGE_SIZE,
                filter: { timeRange, documentCategory },
              })) as ListResponse<MetricObject<T>>;
            },
          );

          // Process and enrich items
          for (const res of responses) {
            if (!res) continue;

            const enriched = res.items.map((item) => ({
              ...item,
              isAlumni: !!(item as UserCollaborationDataObject).alumniSince,
              timeRange,
              documentCategory,
            }));

            items.push(...enriched);
          }

          return items;
        };

        // Build all (timeRange, documentCategory) combos
        const combos = timeRanges.flatMap((timeRange) =>
          documentCategories.map((documentCategory) => ({
            timeRange,
            documentCategory,
          })),
        );

        console.log(
          `Processing ${combos.length} combinations (${timeRanges.length} timeRanges × ${documentCategories.length} documentCategories)`,
        );

        // Process combinations with controlled concurrency
        const userCollaborationResultArrays = await mapLimit(
          combos,
          MAX_CONCURRENT_COMBINATIONS,
          async (combination: (typeof combos)[number]) =>
            fetchAllPagesForUserCollaborationCombination(
              combination.timeRange,
              combination.documentCategory,
            ),
        );

        console.log(
          `Completed fetching all combinations. Total items: ${userCollaborationResultArrays.reduce(
            (sum, arr) => sum + arr.length,
            0,
          )}`,
        );

        const items = userCollaborationResultArrays.flat();

        return {
          total: items.length,
          items,
        } as ListResponse<MetricObject<T>>;
      }

      case 'team-collaboration': {
        // Helper to fetch all pages for a single timeRange/outputType combination
        const fetchAllPagesForTeamCollaborationCombination = async (
          timeRange: (typeof timeRanges)[number],
          outputType: (typeof outputTypes)[number],
        ): Promise<MetricObject<T>[]> => {
          const items: MetricObject<T>[] = [];

          console.log(
            `Fetching team-collaboration data for ${timeRange}/${outputType}...`,
          );

          // First request => get total pages
          const firstPage = (await analyticsController.fetchTeamCollaboration({
            take: PAGE_SIZE,
            skip: 0,
            filter: { timeRange, outputType },
          })) as ListResponse<MetricObject<T>>;

          if (!firstPage) {
            console.log(`No data found for ${timeRange}/${outputType}`);
            return items;
          }

          const total = firstPage.total;
          const pages = Math.ceil(total / PAGE_SIZE);

          console.log(
            `Found ${total} items (${pages} pages) for ${timeRange}/${outputType}`,
          );

          // Build page indexes [0, 1, 2, ...]
          const pageIndexes = [...Array(pages).keys()];

          // Fetch all pages with concurrency control
          const responses = await mapLimit(
            pageIndexes,
            MAX_CONCURRENT_PAGES,
            async (pageIndex: number) => {
              // Use cached first page
              if (pageIndex === 0) return firstPage;

              console.log(
                `Fetching page ${
                  pageIndex + 1
                }/${pages} for ${timeRange}/${outputType}...`,
              );

              return (await analyticsController.fetchTeamCollaboration({
                take: PAGE_SIZE,
                skip: pageIndex * PAGE_SIZE,
                filter: { timeRange, outputType },
              })) as ListResponse<MetricObject<T>>;
            },
          );

          // Process and enrich items
          for (const res of responses) {
            if (!res) continue;

            const enriched = res.items.map((item) => {
              const teamCollabItem = item as TeamCollaborationDataObject;
              const within = teamCollabItem.outputsCoProducedWithin || {};
              const across =
                teamCollabItem.outputsCoProducedAcross?.byDocumentType || {};
              const total = teamCollabItem.totalOutputs || {};
              const collaboratingTeams =
                teamCollabItem.outputsCoProducedAcross?.byTeam || [];

              return {
                ...teamCollabItem,
                isInactive: !!teamCollabItem.inactiveSince,
                // Flatten outputsCoProducedWithin
                Article: Number(within.Article) || 0,
                Bioinformatics: Number(within.Bioinformatics) || 0,
                Dataset: Number(within.Dataset) || 0,
                'Lab Material': Number(within['Lab Material']) || 0,
                Protocol: Number(within.Protocol) || 0,
                // Flatten outputsCoProducedAcross.byDocumentType
                ArticleAcross: Number(across.Article) || 0,
                BioinformaticsAcross: Number(across.Bioinformatics) || 0,
                DatasetAcross: Number(across.Dataset) || 0,
                'Lab Material Across': Number(across['Lab Material']) || 0,
                ProtocolAcross: Number(across.Protocol) || 0,
                // Flatten totalOutputs
                ArticleTotal: Number(total.Article) || 0,
                BioinformaticsTotal: Number(total.Bioinformatics) || 0,
                DatasetTotal: Number(total.Dataset) || 0,
                'Lab Material Total': Number(total['Lab Material']) || 0,
                ProtocolTotal: Number(total.Protocol) || 0,
                // Include collaborating teams array
                collaboratingTeams: collaboratingTeams
                  .filter((team) => team != null)
                  .map((team) => ({
                    id: team.id || '',
                    name: team.name || '',
                    isInactive: !!team.isInactive,
                    Article: Number(team.Article) || 0,
                    Bioinformatics: Number(team.Bioinformatics) || 0,
                    Dataset: Number(team.Dataset) || 0,
                    'Lab Material': Number(team['Lab Material']) || 0,
                    Protocol: Number(team.Protocol) || 0,
                  })),
                timeRange,
                outputType,
              };
            });

            items.push(...(enriched as unknown as MetricObject<T>[]));
          }

          return items;
        };

        // Build all (timeRange, outputType) combos
        const teamCollabCombos = timeRanges.flatMap((timeRange) =>
          outputTypes.map((outputType) => ({
            timeRange,
            outputType,
          })),
        );

        console.log(
          `Processing ${teamCollabCombos.length} combinations (${timeRanges.length} timeRanges × ${outputTypes.length} outputTypes)`,
        );

        // Process combinations with controlled concurrency
        const teamCollaborationResultArrays = await mapLimit(
          teamCollabCombos,
          MAX_CONCURRENT_COMBINATIONS,
          async (combination: (typeof teamCollabCombos)[number]) =>
            fetchAllPagesForTeamCollaborationCombination(
              combination.timeRange,
              combination.outputType,
            ),
        );

        console.log(
          `Completed fetching all combinations. Total items: ${teamCollaborationResultArrays.reduce(
            (sum, arr) => sum + arr.length,
            0,
          )}`,
        );

        const items = teamCollaborationResultArrays.flat();

        return {
          total: items.length,
          items,
        } as ListResponse<MetricObject<T>>;
      }

      case 'presenter-representation': {
        const fetchAllPagesForTimeRange = async (
          timeRange: (typeof timeRanges)[number],
        ): Promise<MetricObject<'presenter-representation'>[]> => {
          const items: MetricObject<'presenter-representation'>[] = [];
          let page = 1;
          let total = 0;
          let recordCount = 0;

          do {
            const response = (await analyticsController.fetchEngagement({
              take: PAGE_SIZE,
              skip: (page - 1) * PAGE_SIZE,
              filter: { timeRange },
            })) as ListResponse<MetricObject<'presenter-representation'>>;

            if (response) {
              total = response.total;
              page++;
              recordCount += response.items.length;

              const enrichedItems = response.items.map((item) => ({
                ...item,
                isInactive: !!item.inactiveSince,
                timeRange,
              }));

              items.push(...enrichedItems);
            }
          } while (total > recordCount);

          return items;
        };

        const teamResultArrays = await mapLimit(
          [...timeRanges],
          MAX_CONCURRENT_COMBINATIONS,
          async (range: (typeof timeRanges)[number]) =>
            fetchAllPagesForTimeRange(range),
        );

        const items = teamResultArrays.flat();

        return {
          total: items.length,
          items,
        } as ListResponse<MetricObject<T>>;
      }

      default:
        throw new Error(`Metric ${metric} not supported`);
    }
  };

  do {
    records = await fetchRecords();

    if (records) {
      total = records.total;

      page++;
      recordCount += records.items.length;
      documents.push(...records.items);
    }
  } while (total > recordCount);

  console.log(
    `Finished exporting ${recordCount} records for metric: ${metric}`,
  );
  return documents;
};

export const exportMetricToOpensearch = async <T extends Metrics>(
  metric: T,
) => {
  console.log(`Starting export for metric: ${metric}`);

  const config = metricConfig[metric];
  if (!config) {
    throw new Error(`Configuration not found for metric: ${metric}`);
  }

  const documents = await exportAnalyticsData(metric);

  await indexOpensearchData({
    awsRegion,
    stage: environment,
    opensearchUsername,
    opensearchPassword,
    indexAlias: config.indexAlias,
    getData: async () => ({
      documents,
      mapping: config.mapping,
    }),
    useDocumentIdAsOpensearchId:
      metric === 'project-aims' || metric === 'project-milestones',
  });

  console.log(
    `Successfully indexed ${documents.length} documents for metric: ${metric}`,
  );
};

const run = async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(
      'Usage: yarn workspace @asap-hub/crn-server sync:opensearch <metric1> [metric2] [metric3] ...',
    );
    process.exit(1);
  }

  if (args.includes('all')) {
    console.log('Exporting all metrics');
    await Promise.all(
      validMetrics.map((metric) => exportMetricToOpensearch(metric)),
    );
    process.exit(0);
  } else {
    const metrics = args as Metrics[];

    const invalidMetrics = metrics.filter(
      (metric) => !validMetrics.includes(metric),
    );
    if (invalidMetrics.length > 0) {
      console.error(`Invalid metrics: ${invalidMetrics.join(', ')}`);
      process.exit(1);
    }

    console.log(`Exporting metrics: ${metrics.join(', ')}`);

    for (const metric of metrics) {
      try {
        await exportMetricToOpensearch(metric);
      } catch (error) {
        console.error(`Error exporting metric ${metric}:`, error);
        process.exit(1);
      }
    }
  }

  console.log('All metrics exported successfully!');
};

// Only run when executed directly, not when imported for testing
if (require.main === module) {
  run();
}
