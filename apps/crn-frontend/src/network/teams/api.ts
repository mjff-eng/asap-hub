import { AlgoliaClient, buildAlgoliaFilters } from '@asap-hub/algolia';
import {
  BackendError,
  createSentryHeaders,
  GetListOptions,
} from '@asap-hub/frontend-utils';
import {
  CompletedStatusOption,
  RequestedAPCCoverageOption,
  DiscussionCreateRequest,
  DiscussionRequest,
  DiscussionResponse,
  ListLabDataProviderResponse,
  ListPartialManuscriptResponse,
  ListTeamAwardMetricsResponse,
  ListTeamResponse,
  ManuscriptFileResponse,
  ManuscriptFileType,
  ManuscriptPutRequest,
  ManuscriptResponse,
  ManuscriptStatus,
  ManuscriptWorkspaceTab,
  ManuscriptWorkspaceUrlResponse,
  ResearchOutputPostRequest,
  ResearchOutputResponse,
  TeamResponse,
  ListManuscriptVersionResponse,
  ManuscriptVersionResponse,
  TeamType,
  TeamStatus,
} from '@asap-hub/model';
import { isResearchOutputWorkingGroupRequest } from '@asap-hub/validation';
import { getPresignedUrl } from '../../shared-api/files';
import { API_BASE_URL } from '../../config';
import createListApiUrl from '../../CreateListApiUrl';

export const getTeam = async (
  id: string,
  authorization: string,
): Promise<TeamResponse | undefined> => {
  const resp = await fetch(`${API_BASE_URL}/teams/${id}`, {
    headers: {
      authorization,
      ...createSentryHeaders(),
    },
  });
  if (!resp.ok) {
    if (resp.status === 404) {
      return undefined;
    }
    throw new Error(
      `Failed to fetch team with id ${id}. Expected status 2xx or 404. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
    );
  }
  return resp.json();
};

export type GetTeamsListOptions = Omit<GetListOptions, 'filters'> & {
  teamType: TeamType | 'all';
  status?: TeamStatus[];
  researchTheme?: string[];
  resourceType?: string[];
};

const apiEndpointMapper: Record<TeamType | 'all', string> = {
  'Resource Team': 'resource-teams',
  'Discovery Team': 'discovery-teams',
  all: 'teams',
};

export const getTeams = async (
  options: GetTeamsListOptions,
  authorization: string,
): Promise<ListTeamResponse> => {
  const listOptions: GetListOptions = {
    searchQuery: options.searchQuery,
    currentPage: options.currentPage,
    pageSize: options.pageSize,
    filters: new Set<string>([
      ...(options.status ?? []),
      ...(options.researchTheme ?? []),
      ...(options.resourceType ?? []),
    ]),
  };

  const resp = await fetch(
    createListApiUrl(
      apiEndpointMapper[options.teamType ?? 'all'],
      listOptions,
    ).toString(),
    {
      headers: {
        authorization,
        ...createSentryHeaders(),
      },
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch team list. Expected status 2xx. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
    );
  }
  return resp.json();
};

const getTeamTypeAlgoliaFilter = (teamType: TeamType | 'all') =>
  teamType === 'all'
    ? 'teamType:"Discovery Team" OR teamType:"Resource Team"'
    : `teamType:"${teamType}"`;

export const getAlgoliaTeams = async (
  algoliaClient: AlgoliaClient<'crn'>,
  {
    searchQuery,
    teamType,
    status,
    researchTheme,
    resourceType,
    currentPage,
    pageSize,
  }: GetTeamsListOptions,
): Promise<ListTeamResponse> => {
  const teamTypeFilter = getTeamTypeAlgoliaFilter(teamType);

  const facetParts = [
    buildAlgoliaFilters('teamStatus', status),
    buildAlgoliaFilters('researchTheme', researchTheme),
    buildAlgoliaFilters('resourceType', resourceType),
  ].filter(Boolean) as string[];

  const algoliaFilters =
    facetParts.length === 0
      ? teamTypeFilter
      : [`(${teamTypeFilter})`, ...facetParts.map((part) => `(${part})`)].join(
          ' AND ',
        );

  const result = await algoliaClient.search(['team'], searchQuery, {
    filters: algoliaFilters,
    page: currentPage ?? undefined,
    hitsPerPage: pageSize ?? undefined,
  });

  return {
    items: result.hits,
    total: result.nbHits ?? 0,
    algoliaIndexName: result.index,
    algoliaQueryId: result.queryID,
  };
};

export const createResearchOutput = async (
  researchOutput: ResearchOutputPostRequest,
  authorization: string,
): Promise<ResearchOutputResponse> => {
  const resp = await fetch(`${API_BASE_URL}/research-outputs`, {
    method: 'POST',
    headers: {
      authorization,
      'content-type': 'application/json',
      ...createSentryHeaders(),
    },
    body: JSON.stringify(researchOutput),
  });
  const response = await resp.json();
  if (!resp.ok) {
    throw new BackendError(
      `Failed to create research output for ${
        isResearchOutputWorkingGroupRequest(researchOutput)
          ? 'Working Group'
          : 'Team'
      }. Expected status 201. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
      response,
      resp.status,
    );
  }
  return response;
};

export const createPreprintResearchOutput = async (
  manuscriptId: string,
  authorization: string,
): Promise<ResearchOutputResponse> => {
  const resp = await fetch(`${API_BASE_URL}/research-outputs/preprint`, {
    method: 'POST',
    headers: {
      authorization,
      'content-type': 'application/json',
      ...createSentryHeaders(),
    },
    body: JSON.stringify({ manuscriptId }),
  });
  const response = await resp.json();
  if (!resp.ok) {
    throw new BackendError(
      `Failed to create preprint research output for manuscript ${manuscriptId}. Expected status 201. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
      response,
      resp.status,
    );
  }
  return response;
};

export const updateTeamResearchOutput = async (
  researchOutputId: string,
  researchOutput: ResearchOutputPostRequest,
  authorization: string,
): Promise<ResearchOutputResponse> => {
  const resp = await fetch(
    `${API_BASE_URL}/research-outputs/${researchOutputId}`,
    {
      method: 'PUT',
      headers: {
        authorization,
        'content-type': 'application/json',
        ...createSentryHeaders(),
      },
      body: JSON.stringify(researchOutput),
    },
  );
  const response = await resp.json();
  if (!resp.ok) {
    throw new BackendError(
      `Failed to update research output for teams ${
        researchOutput.teams
      } Expected status 200. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
      response,
      resp.status,
    );
  }
  return response;
};

export const getLabs = async (
  options: GetListOptions,
  authorization: string,
): Promise<ListLabDataProviderResponse> => {
  const resp = await fetch(createListApiUrl('labs', options).toString(), {
    method: 'GET',
    headers: {
      authorization,
      'content-type': 'application/json',
      ...createSentryHeaders(),
    },
  });
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch labs. Expected status 2xx. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
    );
  }
  return resp.json();
};

export const updateManuscript = async (
  manuscriptId: string,
  manuscript: ManuscriptPutRequest,
  authorization: string,
): Promise<ManuscriptResponse> => {
  const resp = await fetch(`${API_BASE_URL}/manuscripts/${manuscriptId}`, {
    method: 'PUT',
    headers: {
      authorization,
      'content-type': 'application/json',
      ...createSentryHeaders(),
    },
    body: JSON.stringify(manuscript),
  });
  const response = await resp.json();
  if (!resp.ok) {
    throw new BackendError(
      `Failed to update manuscript with id ${manuscriptId}. Expected status 200. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
      response,
      resp.status,
    );
  }
  return response;
};

export type ManuscriptsOptions = Omit<GetListOptions, 'filters'> & {
  requestedAPCCoverage: RequestedAPCCoverageOption;
  completedStatus: CompletedStatusOption;
  selectedStatuses: ManuscriptStatus[];
};

export const getManuscripts = async (
  algoliaClient: AlgoliaClient<'crn'>,
  {
    searchQuery,
    currentPage,
    pageSize,
    requestedAPCCoverage,
    completedStatus,
    selectedStatuses,
  }: ManuscriptsOptions,
): Promise<ListPartialManuscriptResponse> => {
  const getApcCoverageFilter = (
    apcCoverage: RequestedAPCCoverageOption,
  ): string => {
    // Treat undefined or 'all' the same: no filter
    if (!apcCoverage || apcCoverage === 'all') {
      return '';
    }

    switch (apcCoverage) {
      case 'apcNotRequested':
        // apcRequested: false
        return `apcRequested:false`;

      case 'apcRequested':
        // apcRequested: true (regardless of paid/notPaid/declined)
        return `apcRequested:true`;

      case 'paid':
        return `apcRequested:true AND apcCoverageRequestStatus:"paid"`;

      case 'notPaid':
        return `apcRequested:true AND apcCoverageRequestStatus:"notPaid"`;

      case 'declined':
        return `apcRequested:true AND apcCoverageRequestStatus:"declined"`;

      default:
        return '';
    }
  };

  const apcCoverageFilter = getApcCoverageFilter(requestedAPCCoverage);
  const completedStatusFilter =
    completedStatus === 'hide'
      ? `(NOT status:Compliant AND NOT status:"Closed (other)")`
      : '';

  const selectedStatusesList = selectedStatuses.map(
    (status) => `status:"${status}"`,
  );
  const selectedStatusesFilter = selectedStatusesList.length
    ? `(${selectedStatusesList.join(' OR ')})`
    : '';

  const filters = [
    apcCoverageFilter,
    completedStatusFilter,
    selectedStatusesFilter,
  ]
    .filter(Boolean)
    .join(' AND ');

  const result = await algoliaClient.search(
    ['manuscript'],
    searchQuery,
    {
      filters,
      page: currentPage ?? undefined,
      hitsPerPage: pageSize ?? undefined,
    },
    true,
  );

  return {
    items: result.hits,
    total: result.nbHits ?? 0,
    algoliaIndexName: result.index,
    algoliaQueryId: result.queryID,
  };
};

export const getManuscript = async (
  id: string,
  authorization: string,
): Promise<ManuscriptResponse | undefined> => {
  const resp = await fetch(`${API_BASE_URL}/manuscripts/${id}`, {
    headers: {
      authorization,
      ...createSentryHeaders(),
    },
  });
  if (!resp.ok) {
    if (resp.status === 404) {
      return undefined;
    }
    throw new Error(
      `Failed to fetch manuscript with id ${id}. Expected status 2xx or 404. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
    );
  }
  return resp.json();
};

export const getManuscriptWorkspaceUrl = async (
  id: string,
  authorization: string,
  tab?: ManuscriptWorkspaceTab,
): Promise<ManuscriptWorkspaceUrlResponse | undefined> => {
  const params = new URLSearchParams();
  if (tab) {
    params.set('tab', tab);
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const resp = await fetch(
    `${API_BASE_URL}/manuscripts/${id}/workspace-url${query}`,
    {
      headers: {
        authorization,
        ...createSentryHeaders(),
      },
    },
  );

  if (!resp.ok) {
    if (resp.status === 404 || resp.status === 403) {
      return undefined;
    }
    throw new Error(
      `Failed to resolve manuscript workspace url for id ${id}. Expected status 2xx, 403 or 404. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
    );
  }

  return resp.json();
};

export type ManuscriptVersionOptions = Omit<GetListOptions, 'filters'> & {
  teamId?: string;
  projectId?: string;
};

export const getManuscriptVersionByManuscriptId = async (
  algoliaClient: AlgoliaClient<'crn'>,
  manuscriptId: string,
): Promise<ManuscriptVersionResponse | undefined> => {
  const result = algoliaClient.search(['manuscript-version'], manuscriptId, {
    page: 0,
    hitsPerPage: 1,
    restrictSearchableAttributes: ['id'],
  });
  return (await result).hits[0];
};

export const getManuscriptVersions = async (
  algoliaClient: AlgoliaClient<'crn'>,
  {
    searchQuery,
    currentPage,
    pageSize,
    teamId,
    projectId,
  }: ManuscriptVersionOptions,
): Promise<ListManuscriptVersionResponse> => {
  const result = await algoliaClient.search(
    ['manuscript-version'],
    searchQuery,
    {
      page: currentPage ?? undefined,
      hitsPerPage: pageSize ?? undefined,
      restrictSearchableAttributes: ['title', 'manuscriptId'],
      ...(projectId
        ? { filters: `project.id:"${projectId}"` }
        : teamId && {
            filters: `(teamId:"${teamId}" OR teams.id:"${teamId}")`,
          }),
    },
  );

  return {
    items: result.hits,
    total: result.nbHits ?? 0,
    algoliaIndexName: result.index,
    algoliaQueryId: result.queryID,
  };
};

export const uploadManuscriptFile = async (
  file: File,
  fileType: ManuscriptFileType,
  authorization: string,
  handleError: (errorMessage: string) => void,
): Promise<ManuscriptFileResponse | undefined> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);

  const resp = await fetch(`${API_BASE_URL}/manuscripts/file-upload`, {
    method: 'POST',
    headers: {
      authorization,
      ...createSentryHeaders(),
    },
    body: formData,
  });

  if (!resp.ok) {
    if (resp.status === 400 && handleError) {
      handleError((await resp.json()).message);
      return undefined;
    }
    throw new Error(
      `Failed to upload ${fileType.toLowerCase()}. Expected status 2xx. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
    );
  }

  return resp.json();
};

export const updateDiscussion = async (
  discussionId: string,
  discussion: DiscussionRequest,
  authorization: string,
): Promise<DiscussionResponse> => {
  const resp = await fetch(`${API_BASE_URL}/discussions/${discussionId}`, {
    method: 'PATCH',
    headers: {
      authorization,
      'content-type': 'application/json',
      ...createSentryHeaders(),
    },
    body: JSON.stringify(discussion),
  });
  const response = await resp.json();
  if (!resp.ok) {
    throw new BackendError(
      `Failed to update discussion with id ${discussionId}. Expected status 200. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
      response,
      resp.status,
    );
  }
  return response;
};

export const markDiscussionAsRead = async (
  discussionId: string,
  authorization: string,
): Promise<DiscussionResponse> => {
  const resp = await fetch(`${API_BASE_URL}/discussions/${discussionId}/read`, {
    method: 'PATCH',
    headers: {
      authorization,
      'content-type': 'application/json',
      ...createSentryHeaders(),
    },
  });
  const response = await resp.json();
  if (!resp.ok) {
    throw new BackendError(
      `Failed to mark discussion with id ${discussionId} as read. Expected status 200. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
      response,
      resp.status,
    );
  }
  return response;
};

export const getDiscussion = async (
  id: string,
  authorization: string,
): Promise<DiscussionResponse | undefined> => {
  const resp = await fetch(`${API_BASE_URL}/discussions/${id}`, {
    headers: {
      authorization,
      ...createSentryHeaders(),
    },
  });
  if (!resp.ok) {
    if (resp.status === 404) {
      return undefined;
    }
    throw new Error(
      `Failed to fetch discussion with id ${id}. Expected status 2xx or 404. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
    );
  }
  return resp.json();
};

export const createDiscussion = async (
  input: DiscussionCreateRequest,
  authorization: string,
): Promise<DiscussionResponse> => {
  const resp = await fetch(`${API_BASE_URL}/discussions`, {
    method: 'POST',
    headers: {
      authorization,
      'content-type': 'application/json',
      ...createSentryHeaders(),
    },
    body: JSON.stringify(input),
  });
  const response = await resp.json();
  if (!resp.ok) {
    throw new BackendError(
      `Failed to create discussion. Expected status 201. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
      response,
      resp.status,
    );
  }
  return response;
};

export const downloadFullComplianceDataset = async (
  authorization: string,
): Promise<string> => {
  const { presignedUrl: downloadUrl } = await getPresignedUrl(
    'ComplianceFullDataset.csv',
    authorization,
    undefined,
    'download',
  );

  return downloadUrl;
};

export const getTeamAwardMetrics = async (
  teamId: string,
  authorization: string,
): Promise<ListTeamAwardMetricsResponse> => {
  const resp = await fetch(`${API_BASE_URL}/teams/${teamId}/award-metrics`, {
    headers: {
      authorization,
      ...createSentryHeaders(),
    },
  });
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch award metrics for team with id ${teamId}. Expected status 2xx. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
    );
  }
  return resp.json();
};
