import { AlgoliaClient, getEventFilters } from '@asap-hub/algolia';
import {
  BackendError,
  createSentryHeaders,
  GetEventListOptions,
} from '@asap-hub/frontend-utils';
import {
  EventResponse,
  EventUpdateDetailsRequest,
  ListEventResponse,
  TeamListItemResponse,
} from '@asap-hub/model';
import { API_BASE_URL } from '../config';
import { getAlgoliaTeams } from '../network/teams/api';

// Shared with the state hook so the cache key and the request cannot drift.
export const teamsForMatchingOptions = {
  searchQuery: '',
  teamType: 'all',
  currentPage: 0,
  pageSize: 1000,
} as const;

export const getEvents = async (
  algoliaClient: AlgoliaClient<'crn'>,
  {
    searchQuery,
    currentPage,
    pageSize,
    before,
    after,
    constraint,
  }: GetEventListOptions,
): Promise<ListEventResponse> => {
  const filters = getEventFilters({ before, after }, constraint);

  const result = await algoliaClient.search(
    ['event'],
    searchQuery,
    {
      filters,
      page: currentPage ?? undefined,
      hitsPerPage: pageSize ?? undefined,
    },
    !!before,
  );

  return {
    items: result.hits,
    total: result.nbHits ?? 0,
    algoliaIndexName: result.index,
    algoliaQueryId: result.queryID,
  };
};

export const getEvent = async (
  id: string,
  authorization: string,
): Promise<EventResponse | undefined> => {
  const resp = await fetch(`${API_BASE_URL}/events/${id}`, {
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
      `Failed to fetch event with id ${id}. Expected status 2xx or 404. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
    );
  }
  return resp.json();
};

export const patchEvent = async (
  id: string,
  data: EventUpdateDetailsRequest,
  authorization: string,
): Promise<EventResponse> => {
  const resp = await fetch(`${API_BASE_URL}/events/${id}`, {
    method: 'PATCH',
    headers: {
      authorization,
      'content-type': 'application/json',
      ...createSentryHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    throw new BackendError(
      `Failed to update event ${id}. Expected status 2xx. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
      await resp.json().catch(() => undefined),
      resp.status,
    );
  }
  return resp.json();
};

// Fetch the whole team corpus once per upload; matchTeamNames resolves in memory.
export const getTeamsForMatching = async (
  algoliaClient: AlgoliaClient<'crn'>,
): Promise<TeamListItemResponse[]> => {
  const items: TeamListItemResponse[] = [];
  let total = Infinity;

  for (let currentPage = 0; items.length < total; currentPage += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { items: pageItems, total: pageTotal } = await getAlgoliaTeams(
      algoliaClient,
      { ...teamsForMatchingOptions, currentPage },
    );
    // An empty page guarantees termination even if total is off.
    if (pageItems.length === 0) {
      break;
    }
    items.push(...pageItems);
    total = pageTotal;
  }

  return items;
};

export const getAttendanceSearchHits = async (
  algoliaClient: AlgoliaClient<'crn'>,
  searchQuery: string,
) =>
  (
    await algoliaClient.search(['interest-group', 'team'], searchQuery, {
      // Interest group records also index their teams' names; without this, a
      // team name would match every group the team belongs to.
      restrictSearchableAttributes: ['name', 'displayName'],
    })
  ).hits;
