import { OpensearchMetricConfig } from '@asap-hub/server-common';
import { Metrics } from './types';

export const PAGE_SIZE = 45;
// Leadership query has deeply nested collections, requiring smaller page size
// to stay within Contentful's query complexity limit
export const LEADERSHIP_PAGE_SIZE = 10;
export const MAX_CONCURRENT_COMBINATIONS = 5;
export const MAX_CONCURRENT_PAGES = 10;
export const PREPRINT_COMPLIANCE_SHEET_NAME = 'Preprint Compliance';
export const PUBLICATION_COMPLIANCE_ALL_TIME_SHEET_NAME =
  'Publication Compliance_All Time';
export const PUBLICATION_COMPLIANCE_LAST_12_MONTHS_SHEET_NAME =
  'Publication Compliance_Last 12 months';
export const BATCH_SIZE = 50;
export const SHEET_RANGE = 'A:Z';

export const PREPRINT_COMPLIANCE_HEADER_MAPPINGS = {
  '# preprints': 'numberOfPreprints',
  '# publications': 'numberOfPublications',
  '% preprint posted prior to journal submission': 'postedPriorPercentage',
  Ranking: 'ranking',
} as const;

export const PUBLICATION_COMPLIANCE_HEADER_MAPPINGS = {
  'OVERALL COMPLIANCE - Overall Compliance': 'overallCompliance',
  'OVERALL COMPLIANCE - Ranking': 'ranking',
  'RESEARCH OUTPUT COMPLIANCE - Datasets %': 'datasetsPercentage',
  'RESEARCH OUTPUT COMPLIANCE - Datasets Ranking': 'datasetsRanking',
  'RESEARCH OUTPUT COMPLIANCE - Protocols %': 'protocolsPercentage',
  'RESEARCH OUTPUT COMPLIANCE - Protocols Ranking': 'protocolsRanking',
  'RESEARCH OUTPUT COMPLIANCE - Code %': 'codePercentage',
  'RESEARCH OUTPUT COMPLIANCE - Code Ranking': 'codeRanking',
  'RESEARCH OUTPUT COMPLIANCE - Lab Materials %': 'labMaterialsPercentage',
  'RESEARCH OUTPUT COMPLIANCE - Lab Materials Ranking': 'labMaterialsRanking',
  'OVERALL COMPLIANCE - # publications': 'numberOfPublications',
  'OVERALL COMPLIANCE - # outputs': 'numberOfOutputs',
  'RESEARCH OUTPUT COMPLIANCE - # datasets': 'numberOfDatasets',
  'RESEARCH OUTPUT COMPLIANCE - # protocols': 'numberOfProtocols',
  'RESEARCH OUTPUT COMPLIANCE - # code': 'numberOfCode',
  'RESEARCH OUTPUT COMPLIANCE - # lab materials': 'numberOfLabMaterials',
} as const;

/** Reusable text field with ngram analyzer and keyword subfield. Optional normalizer and/or raw subfield. */
const textWithNgramKeyword = (options?: {
  normalizer?: string;
  raw?: boolean;
}) =>
  ({
    type: 'text',
    analyzer: 'ngram_analyzer',
    search_analyzer: 'ngram_search_analyzer',
    fields: {
      keyword: {
        type: 'keyword',
        ...(options?.normalizer && { normalizer: options.normalizer }),
      },
      ...(options?.raw && { raw: { type: 'keyword' } as const }),
    },
  }) as const;

export const validMetrics = [
  'os-champion',
  'preliminary-data-sharing',
  'attendance',
  'preprint-compliance',
  'publication-compliance',
  'user-productivity',
  'team-productivity',
  'user-collaboration',
  'team-collaboration',
  'ig-leadership',
  'wg-leadership',
  'presenter-representation',
  'project-milestones',
  'project-aims',
] as const;

export const metricConfig: Record<Metrics, OpensearchMetricConfig> = {
  'os-champion': {
    indexAlias: 'os-champion',
    mapping: {
      properties: {
        teamId: { type: 'text' },
        teamName: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        isTeamInactive: { type: 'boolean' },
        teamAwardsCount: { type: 'integer' },
        users: {
          type: 'nested',
          properties: {
            id: { type: 'text' },
            name: textWithNgramKeyword({ raw: true }),
            awardsCount: { type: 'integer' },
          },
        },
        timeRange: { type: 'keyword' },
      },
    },
  },
  'preliminary-data-sharing': {
    indexAlias: 'preliminary-data-sharing',
    mapping: {
      properties: {
        teamId: { type: 'text' },
        teamName: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        isTeamInactive: { type: 'boolean' },
        percentShared: { type: 'integer' },
        limitedData: { type: 'boolean' },
        timeRange: { type: 'keyword' },
      },
    },
  },
  attendance: {
    indexAlias: 'attendance',
    mapping: {
      properties: {
        teamId: { type: 'text' },
        teamName: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        isTeamInactive: { type: 'boolean' },
        attendancePercentage: { type: 'integer' },
        limitedData: { type: 'boolean' },
        timeRange: { type: 'keyword' },
      },
    },
  },
  'preprint-compliance': {
    indexAlias: 'preprint-compliance',
    mapping: {
      properties: {
        teamId: { type: 'text' },
        teamName: textWithNgramKeyword({ raw: true }),
        isTeamInactive: { type: 'boolean' },
        numberOfPreprints: { type: 'integer' },
        numberOfPublications: { type: 'integer' },
        postedPriorPercentage: { type: 'float' },
        ranking: { type: 'text' },
        timeRange: { type: 'keyword' },
      },
    },
  },
  'publication-compliance': {
    indexAlias: 'publication-compliance',
    mapping: {
      properties: {
        teamId: { type: 'text' },
        teamName: textWithNgramKeyword({ raw: true }),
        isTeamInactive: { type: 'boolean' },
        overallCompliance: { type: 'float' },
        ranking: { type: 'text' },
        datasetsPercentage: { type: 'float' },
        datasetsRanking: { type: 'text' },
        protocolsPercentage: { type: 'float' },
        protocolsRanking: { type: 'text' },
        codePercentage: { type: 'float' },
        codeRanking: { type: 'text' },
        labMaterialsPercentage: { type: 'float' },
        labMaterialsRanking: { type: 'text' },
        numberOfPublications: { type: 'integer' },
        numberOfOutputs: { type: 'integer' },
        numberOfDatasets: { type: 'integer' },
        numberOfProtocols: { type: 'integer' },
        numberOfCode: { type: 'integer' },
        numberOfLabMaterials: { type: 'integer' },
        timeRange: { type: 'keyword' },
      },
    },
  },
  'user-productivity': {
    indexAlias: 'user-productivity',
    mapping: {
      properties: {
        id: { type: 'text' },
        name: textWithNgramKeyword(),
        isAlumni: { type: 'boolean' },
        teams: {
          type: 'nested',
          properties: {
            id: { type: 'text' },
            team: textWithNgramKeyword({
              normalizer: 'lowercase_normalizer',
              raw: true,
            }),
            role: { type: 'keyword' },
            isTeamInactive: { type: 'boolean' },
            isUserInactiveOnTeam: { type: 'boolean' },
          },
        },
        asapOutput: { type: 'integer' },
        asapPublicOutput: { type: 'integer' },
        ratio: { type: 'float' },
        timeRange: { type: 'keyword' },
        documentCategory: { type: 'keyword' },
      },
    },
  },
  'team-productivity': {
    indexAlias: 'team-productivity',
    mapping: {
      properties: {
        id: { type: 'keyword' },
        name: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        isInactive: { type: 'boolean' },
        Article: { type: 'integer' },
        Bioinformatics: { type: 'integer' },
        Dataset: { type: 'integer' },
        'Lab Material': { type: 'integer' },
        Protocol: { type: 'integer' },
        timeRange: { type: 'keyword' },
        outputType: { type: 'keyword' },
      },
    },
  },
  'user-collaboration': {
    indexAlias: 'user-collaboration',
    mapping: {
      properties: {
        id: { type: 'text' },
        name: textWithNgramKeyword(),
        isAlumni: { type: 'boolean' },
        alumniSince: { type: 'keyword' },
        teams: {
          type: 'nested',
          properties: {
            id: { type: 'text' },
            team: textWithNgramKeyword({
              normalizer: 'lowercase_normalizer',
              raw: true,
            }),
            role: { type: 'keyword' },
            teamInactiveSince: { type: 'keyword' },
            teamMembershipInactiveSince: { type: 'keyword' },
            outputsCoAuthoredWithinTeam: { type: 'integer' },
            outputsCoAuthoredAcrossTeams: { type: 'integer' },
          },
        },
        totalUniqueOutputsCoAuthoredWithinTeam: { type: 'integer' },
        totalUniqueOutputsCoAuthoredAcrossTeams: { type: 'integer' },
        timeRange: { type: 'keyword' },
        documentCategory: { type: 'keyword' },
      },
    },
  },
  'team-collaboration': {
    indexAlias: 'team-collaboration',
    mapping: {
      properties: {
        id: { type: 'text' },
        name: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        isInactive: { type: 'boolean' },
        inactiveSince: { type: 'keyword' },
        Article: { type: 'integer' },
        Bioinformatics: { type: 'integer' },
        Dataset: { type: 'integer' },
        'Lab Material': { type: 'integer' },
        Protocol: { type: 'integer' },
        ArticleAcross: { type: 'integer' },
        BioinformaticsAcross: { type: 'integer' },
        DatasetAcross: { type: 'integer' },
        'Lab Material Across': { type: 'integer' },
        ProtocolAcross: { type: 'integer' },
        collaboratingTeams: {
          type: 'nested',
          properties: {
            id: { type: 'text' },
            name: textWithNgramKeyword({
              normalizer: 'lowercase_normalizer',
            }),
            isInactive: { type: 'boolean' },
            Article: { type: 'integer' },
            Bioinformatics: { type: 'integer' },
            Dataset: { type: 'integer' },
            'Lab Material': { type: 'integer' },
            Protocol: { type: 'integer' },
          },
        },
        timeRange: { type: 'keyword' },
        outputType: { type: 'keyword' },
      },
    },
  },
  'ig-leadership': {
    indexAlias: 'ig-leadership',
    mapping: {
      properties: {
        id: { type: 'keyword' },
        displayName: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        isInactive: { type: 'boolean' },
        inactiveSince: { type: 'keyword' },
        interestGroupLeadershipRoleCount: { type: 'integer' },
        interestGroupPreviousLeadershipRoleCount: { type: 'integer' },
        interestGroupMemberCount: { type: 'integer' },
        interestGroupPreviousMemberCount: { type: 'integer' },
      },
    },
  },
  'wg-leadership': {
    indexAlias: 'wg-leadership',
    mapping: {
      properties: {
        id: { type: 'keyword' },
        displayName: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        isInactive: { type: 'boolean' },
        inactiveSince: { type: 'keyword' },
        workingGroupLeadershipRoleCount: { type: 'integer' },
        workingGroupPreviousLeadershipRoleCount: { type: 'integer' },
        workingGroupMemberCount: { type: 'integer' },
        workingGroupPreviousMemberCount: { type: 'integer' },
      },
    },
  },
  'presenter-representation': {
    indexAlias: 'presenter-representation',
    mapping: {
      properties: {
        id: { type: 'text' },
        name: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        // TODO: Remove redundancy between `isInactive` and `inactiveSince`.
        // Once Algolia is dropped, keep only one field across all OpenSearch team metrics.
        isInactive: { type: 'boolean' },
        inactiveSince: { type: 'keyword' },
        memberCount: { type: 'integer' },
        eventCount: { type: 'integer' },
        totalSpeakerCount: { type: 'integer' },
        uniqueAllRolesCount: { type: 'integer' },
        uniqueAllRolesCountPercentage: { type: 'integer' },
        uniqueKeyPersonnelCount: { type: 'integer' },
        uniqueKeyPersonnelCountPercentage: { type: 'integer' },
        timeRange: { type: 'keyword' },
      },
    },
  },
  'project-milestones': {
    indexAlias: 'project-milestones',
    mapping: {
      properties: {
        id: { type: 'keyword' },
        description: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        aimNumbers: { type: 'keyword' },
        status: { type: 'keyword' },
        articleCount: { type: 'integer' },
        articlesDOI: { type: 'text' },
        projectId: { type: 'keyword' },
        grantType: { type: 'keyword' },
        createdDate: { type: 'date' },
        lastDate: { type: 'date' },
      },
    },
  },
  'project-aims': {
    indexAlias: 'project-aims',
    mapping: {
      properties: {
        id: { type: 'keyword' },
        description: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        grantType: { type: 'keyword' },
        projectId: { type: 'keyword' },
        teamName: textWithNgramKeyword({
          normalizer: 'lowercase_normalizer',
          raw: true,
        }),
        status: { type: 'keyword' },
        articleCount: { type: 'integer' },
        articlesDOI: { type: 'text' },
        aimOrder: { type: 'integer' },
        createdDate: { type: 'date' },
        lastDate: { type: 'date' },
      },
    },
  },
} as const;
