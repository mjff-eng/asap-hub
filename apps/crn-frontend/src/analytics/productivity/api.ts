import {
  TeamProductivityPerformance,
  SortTeamProductivity,
  SortUserProductivity,
  UserProductivityPerformance,
  DocumentCategoryOption,
  OutputTypeOption,
  outputTypes,
  TimeRangeOption,
  UserProductivityResponse,
  TeamProductivityOpensearchDocument,
  TeamProductivityResponse,
} from '@asap-hub/model';
import {
  AnalyticsPerformanceOptions,
  AnalyticsSearchOptions,
  AnalyticsSearchOptionsWithFiltering,
} from '../utils/analytics-options';
import {
  buildNormalizedStringSort,
  OpensearchClient,
} from '../utils/opensearch';
import { OpensearchSortMap } from '../utils/opensearch/types';
import { TeamMetricsOptions } from '../utils/team-metrics';

const userProductivyOpensearchSort: OpensearchSortMap<SortUserProductivity> = {
  user_asc: [
    buildNormalizedStringSort({
      keyword: 'name.keyword',
      order: 'asc',
    }),
  ],
  user_desc: [
    buildNormalizedStringSort({
      keyword: 'name.keyword',
      order: 'desc',
    }),
  ],
  team_asc: [
    buildNormalizedStringSort({
      keyword: 'teams.team.keyword',
      order: 'asc',
      nested: { path: 'teams' },
    }),
  ],
  team_desc: [
    buildNormalizedStringSort({
      keyword: 'teams.team.keyword',
      order: 'desc',
      nested: { path: 'teams' },
    }),
  ],
  asap_output_asc: [
    {
      asapOutput: {
        order: 'asc',
      },
    },
  ],
  asap_output_desc: [
    {
      asapOutput: {
        order: 'desc',
      },
    },
  ],
  asap_public_output_asc: [
    {
      asapPublicOutput: {
        order: 'asc',
      },
    },
  ],
  asap_public_output_desc: [
    {
      asapPublicOutput: {
        order: 'desc',
      },
    },
  ],
  ratio_asc: [
    {
      ratio: { order: 'asc' },
    },
  ],
  ratio_desc: [
    {
      ratio: { order: 'desc' },
    },
  ],
  role_asc: [
    {
      'teams.role': {
        nested: { path: 'teams' },
        order: 'asc',
        missing: '_last',
      },
    },
  ],
  role_desc: [
    {
      'teams.role': {
        nested: { path: 'teams' },
        order: 'desc',
        missing: '_last',
      },
    },
  ],
};

const teamProductivityOpensearchSort: OpensearchSortMap<SortTeamProductivity> =
  {
    team_asc: [{ 'name.keyword': { order: 'asc' } }],
    team_desc: [{ 'name.keyword': { order: 'desc' } }],
    article_asc: [{ Article: { order: 'asc' } }],
    article_desc: [{ Article: { order: 'desc' } }],
    bioinformatics_asc: [{ Bioinformatics: { order: 'asc' } }],
    bioinformatics_desc: [{ Bioinformatics: { order: 'desc' } }],
    dataset_asc: [{ Dataset: { order: 'asc' } }],
    dataset_desc: [{ Dataset: { order: 'desc' } }],
    lab_material_asc: [{ 'Lab Material': { order: 'asc' } }],
    lab_material_desc: [{ 'Lab Material': { order: 'desc' } }],
    protocol_asc: [{ Protocol: { order: 'asc' } }],
    protocol_desc: [{ Protocol: { order: 'desc' } }],
  };

export const getUserProductivity = (
  client: OpensearchClient<UserProductivityResponse>,
  options: AnalyticsSearchOptionsWithFiltering<SortUserProductivity>,
) => {
  const { tags, currentPage, pageSize, timeRange, documentCategory, sort } =
    options;
  return client.search({
    searchTags: tags,
    currentPage: currentPage ?? undefined,
    pageSize: pageSize ?? undefined,
    timeRange,
    searchScope: 'extended',
    documentCategory,
    sort: userProductivyOpensearchSort[sort],
  });
};

export type ProductivityListOptions = Pick<
  AnalyticsSearchOptions,
  'currentPage' | 'pageSize' | 'tags'
> & {
  timeRange: TimeRangeOption;
  documentCategory?: DocumentCategoryOption;
  outputType?: OutputTypeOption;
  sort: SortUserProductivity | SortTeamProductivity;
};

export const getTeamProductivity = (
  client: OpensearchClient<TeamProductivityResponse>,
  options: AnalyticsSearchOptionsWithFiltering<SortTeamProductivity>,
) => {
  const { tags, currentPage, pageSize, timeRange, outputType, sort } = options;
  return client.search({
    searchTags: tags,
    currentPage: currentPage ?? undefined,
    pageSize: pageSize ?? undefined,
    timeRange,
    searchScope: 'flat',
    sort: teamProductivityOpensearchSort[sort],
    outputType,
  });
};

export type TeamHubResearchOutputs = {
  all?: TeamProductivityOpensearchDocument;
  public?: TeamProductivityOpensearchDocument;
};

const HUB_RESEARCH_OUTPUTS_TIME_RANGE: TimeRangeOption = 'all';

export const getTeamHubResearchOutputs = async (
  client: OpensearchClient<TeamProductivityOpensearchDocument>,
  { teamId }: TeamMetricsOptions,
): Promise<TeamHubResearchOutputs> => {
  const { items } = await client.search({
    searchTags: [],
    searchScope: 'flat',
    sort: [],
    currentPage: 0,
    pageSize: outputTypes.length,
    timeRange: HUB_RESEARCH_OUTPUTS_TIME_RANGE,
    teamId,
  });

  return {
    all: items.find(({ outputType }) => outputType === 'all'),
    public: items.find(({ outputType }) => outputType === 'public'),
  };
};

export const getUserProductivityPerformance = async (
  client: OpensearchClient<UserProductivityPerformance>,
  options: AnalyticsPerformanceOptions,
) => {
  const results = await client.search({
    searchTags: [],
    timeRange: options.timeRange,
    searchScope: 'flat',
    sort: [],
    documentCategory: options.documentCategory,
  });
  return results.items[0] as UserProductivityPerformance | undefined;
};

export const getTeamProductivityPerformance = async (
  client: OpensearchClient<TeamProductivityPerformance>,
  options: AnalyticsPerformanceOptions,
) => {
  const results = await client.search({
    searchTags: [],
    timeRange: options.timeRange,
    searchScope: 'flat',
    sort: [],
    outputType: options.outputType,
  });
  return results.items[0] as TeamProductivityPerformance | undefined;
};
