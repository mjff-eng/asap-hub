import { GetListOptions } from '@asap-hub/frontend-utils';
import {
  DocumentCategoryOption,
  LimitedTimeRangeOption,
  ListPreliminaryDataSharingResponse,
  OutputTypeOption,
  PreliminaryDataSharingDataObject,
  SortSharingPrelimFindings,
  SortTeamCollaboration,
  SortUserCollaboration,
  TeamCollaborationOpensearchDocument,
  TeamCollaborationPerformance,
  TeamCollaborationResponse,
  TimeRangeOption,
  UserCollaborationPerformance,
  UserCollaborationResponse,
} from '@asap-hub/model';
import {
  AnalyticsPerformanceOptions,
  AnalyticsSearchOptionsWithFiltering,
} from '../utils/analytics-options';
import {
  buildNormalizedStringSort,
  OpensearchClient,
} from '../utils/opensearch';
import { OpensearchSortMap } from '../utils/opensearch/types';

export type CollaborationListOptions = Pick<
  GetListOptions,
  'currentPage' | 'pageSize'
> & {
  timeRange: TimeRangeOption;
  documentCategory?: DocumentCategoryOption;
  outputType?: OutputTypeOption;
};

const userCollaborationOpensearchSort: OpensearchSortMap<SortUserCollaboration> =
  {
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
    outputs_coauthored_within_asc: [
      {
        totalUniqueOutputsCoAuthoredWithinTeam: {
          order: 'asc',
        },
      },
    ],
    outputs_coauthored_within_desc: [
      {
        totalUniqueOutputsCoAuthoredWithinTeam: {
          order: 'desc',
        },
      },
    ],
    outputs_coauthored_across_asc: [
      {
        totalUniqueOutputsCoAuthoredAcrossTeams: {
          order: 'asc',
        },
      },
    ],
    outputs_coauthored_across_desc: [
      {
        totalUniqueOutputsCoAuthoredAcrossTeams: {
          order: 'desc',
        },
      },
    ],
  };

const teamCollaborationOpensearchSort: OpensearchSortMap<SortTeamCollaboration> =
  {
    team_asc: [
      buildNormalizedStringSort({
        keyword: 'name.keyword',
        order: 'asc',
      }),
    ],
    team_desc: [
      buildNormalizedStringSort({
        keyword: 'name.keyword',
        order: 'desc',
      }),
    ],
    article_asc: [
      {
        'outputsCoProducedWithin.Article': {
          order: 'asc',
        },
      },
    ],
    article_desc: [
      {
        'outputsCoProducedWithin.Article': {
          order: 'desc',
        },
      },
    ],
    bioinformatics_asc: [
      {
        'outputsCoProducedWithin.Bioinformatics': {
          order: 'asc',
        },
      },
    ],
    bioinformatics_desc: [
      {
        'outputsCoProducedWithin.Bioinformatics': {
          order: 'desc',
        },
      },
    ],
    dataset_asc: [
      {
        'outputsCoProducedWithin.Dataset': {
          order: 'asc',
        },
      },
    ],
    dataset_desc: [
      {
        'outputsCoProducedWithin.Dataset': {
          order: 'desc',
        },
      },
    ],
    lab_material_asc: [
      {
        'outputsCoProducedWithin.Lab Material': {
          order: 'asc',
        },
      },
    ],
    lab_material_desc: [
      {
        'outputsCoProducedWithin.Lab Material': {
          order: 'desc',
        },
      },
    ],
    protocol_asc: [
      {
        'outputsCoProducedWithin.Protocol': {
          order: 'asc',
        },
      },
    ],
    protocol_desc: [
      {
        'outputsCoProducedWithin.Protocol': {
          order: 'desc',
        },
      },
    ],
    article_across_asc: [
      {
        'outputsCoProducedAcross.byDocumentType.Article': {
          order: 'asc',
        },
      },
    ],
    article_across_desc: [
      {
        'outputsCoProducedAcross.byDocumentType.Article': {
          order: 'desc',
        },
      },
    ],
    bioinformatics_across_asc: [
      {
        'outputsCoProducedAcross.byDocumentType.Bioinformatics': {
          order: 'asc',
        },
      },
    ],
    bioinformatics_across_desc: [
      {
        'outputsCoProducedAcross.byDocumentType.Bioinformatics': {
          order: 'desc',
        },
      },
    ],
    dataset_across_asc: [
      {
        'outputsCoProducedAcross.byDocumentType.Dataset': {
          order: 'asc',
        },
      },
    ],
    dataset_across_desc: [
      {
        'outputsCoProducedAcross.byDocumentType.Dataset': {
          order: 'desc',
        },
      },
    ],
    lab_material_across_asc: [
      {
        'outputsCoProducedAcross.byDocumentType.Lab Material': {
          order: 'asc',
        },
      },
    ],
    lab_material_across_desc: [
      {
        'outputsCoProducedAcross.byDocumentType.Lab Material': {
          order: 'desc',
        },
      },
    ],
    protocol_across_asc: [
      {
        'outputsCoProducedAcross.byDocumentType.Protocol': {
          order: 'asc',
        },
      },
    ],
    protocol_across_desc: [
      {
        'outputsCoProducedAcross.byDocumentType.Protocol': {
          order: 'desc',
        },
      },
    ],
  };

export const getUserCollaboration = (
  client: OpensearchClient<UserCollaborationResponse>,
  options: AnalyticsSearchOptionsWithFiltering<SortUserCollaboration>,
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
    sort: userCollaborationOpensearchSort[sort],
  });
};

export const getTeamCollaboration = (
  client: OpensearchClient<TeamCollaborationResponse>,
  options: AnalyticsSearchOptionsWithFiltering<SortTeamCollaboration>,
) => {
  const {
    tags,
    currentPage,
    pageSize,
    timeRange,
    documentCategory,
    outputType,
    sort,
  } = options;
  return client.search({
    searchTags: tags,
    currentPage: currentPage ?? undefined,
    pageSize: pageSize ?? undefined,
    timeRange,
    searchScope: 'flat',
    documentCategory,
    outputType,
    sort: teamCollaborationOpensearchSort[sort],
  });
};

export type TeamCoProductionOptions = {
  teamId: string;
};

export type TeamCoProduction = {
  coProducedArticles?: number;
  totalArticles?: number;
};

const TEAM_CO_PRODUCTION_TIME_RANGE: TimeRangeOption = 'all';
const TEAM_CO_PRODUCTION_OUTPUT_TYPE: OutputTypeOption = 'all';

export const getTeamCoProduction = async (
  client: OpensearchClient<TeamCollaborationOpensearchDocument>,
  { teamId }: TeamCoProductionOptions,
): Promise<TeamCoProduction> => {
  const { items } = await client.search({
    searchTags: [],
    searchScope: 'flat',
    sort: [],
    currentPage: 0,
    pageSize: 1,
    timeRange: TEAM_CO_PRODUCTION_TIME_RANGE,
    outputType: TEAM_CO_PRODUCTION_OUTPUT_TYPE,
    teamId,
  });

  const document = items[0];

  return {
    coProducedArticles: document?.Article,
    totalArticles: document?.ArticleTotal,
  };
};

export const getTeamCollaborationPerformance = async (
  client: OpensearchClient<TeamCollaborationPerformance>,
  options: AnalyticsPerformanceOptions,
) => {
  const results = await client.search({
    searchTags: [],
    timeRange: options.timeRange,
    searchScope: 'flat',
    sort: [],
    documentCategory: options.documentCategory,
    outputType: options.outputType,
  });
  return results.items[0] as TeamCollaborationPerformance | undefined;
};

export const getUserCollaborationPerformance = async (
  client: OpensearchClient<UserCollaborationPerformance>,
  options: AnalyticsPerformanceOptions,
) => {
  const results = await client.search({
    searchTags: [],
    timeRange: options.timeRange,
    searchScope: 'flat',
    sort: [],
    documentCategory: options.documentCategory,
  });
  return results.items[0] as UserCollaborationPerformance | undefined;
};

export type PreliminaryDataSharingSearchOptions = {
  currentPage: number | null;
  pageSize: number | null;
  tags: string[];
  timeRange: LimitedTimeRangeOption;
  sort?: SortSharingPrelimFindings;
};

const preliminaryDataSharingOpensearchSort: OpensearchSortMap<SortSharingPrelimFindings> =
  {
    team_asc: [
      buildNormalizedStringSort({
        keyword: 'teamName.keyword',
        order: 'asc',
      }),
    ],
    team_desc: [
      buildNormalizedStringSort({
        keyword: 'teamName.keyword',
        order: 'desc',
      }),
    ],
    percent_shared_asc: [
      {
        limitedData: {
          order: 'desc',
        },
      },
      {
        percentShared: {
          order: 'asc',
          missing: '_last',
        },
      },
    ],
    percent_shared_desc: [
      {
        percentShared: {
          order: 'desc',
          missing: '_last',
        },
      },
      {
        limitedData: {
          order: 'asc',
        },
      },
    ],
  };

export const getPreliminaryDataSharing = async (
  opensearchClient: OpensearchClient<PreliminaryDataSharingDataObject>,
  {
    tags,
    currentPage,
    pageSize,
    timeRange,
    sort,
  }: PreliminaryDataSharingSearchOptions,
): Promise<ListPreliminaryDataSharingResponse | undefined> => {
  const response = await opensearchClient.search({
    searchTags: tags,
    currentPage: currentPage ?? undefined,
    pageSize: pageSize ?? undefined,
    timeRange,
    searchScope: 'flat',
    sort: sort ? preliminaryDataSharingOpensearchSort[sort] : undefined,
  });

  return {
    items: response.items || [],
    total: response.total || 0,
  };
};
