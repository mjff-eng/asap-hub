import { createSentryHeaders } from '@asap-hub/frontend-utils';
import { OpensearchHit, OpensearchHitsResponse } from '@asap-hub/model';
import { API_BASE_URL } from '../../../config';
import {
  teamWithUsersRecordSearchQueryBuilder,
  userWithTeamsRecordSearchQueryBuilder,
  teamRecordSearchQueryBuilder,
  taglessSearchQueryBuilder,
  leadershipRecordSearchQueryBuilder,
} from './query-builders';
import { teamWithUsersRecordsTagQueryBuilder } from './tag-query-builders/team-with-users-records';
import { userWithTeamsRecordsTagQueryBuilder } from './tag-query-builders/user-with-teams-records';
import { teamRecordTagQueryBuilder } from './tag-query-builders/team-record';
import { leadershipRecordTagQueryBuilder } from './tag-query-builders/leadership';
import type {
  OpensearchIndex,
  OpensearchSearchOptions,
  OpensearchSort,
  SearchQuery,
  SearchResult,
  SearchScope,
  TagQueryBuilder,
  TagSuggestionsResponse,
} from './types';

export const unsupportedTagQueryBuilder: TagQueryBuilder = (
  _searchQuery: string,
  _searchScope: SearchScope,
): ReturnType<TagQueryBuilder> => {
  throw new Error(`This Opensearch index doesn't support tag suggestions`);
};

const DEFAULT_PAGE_NUMBER = 0;
const DEFAULT_PAGE_SIZE = 10;

const queryBuilderByIndex: Record<
  OpensearchIndex,
  (options: OpensearchSearchOptions) => SearchQuery
> = {
  attendance: teamWithUsersRecordSearchQueryBuilder,
  'os-champion': teamWithUsersRecordSearchQueryBuilder,
  awards: teamWithUsersRecordSearchQueryBuilder,
  'preliminary-data-sharing': teamWithUsersRecordSearchQueryBuilder,
  'preprint-compliance': teamWithUsersRecordSearchQueryBuilder,
  'publication-compliance': teamWithUsersRecordSearchQueryBuilder,
  'user-productivity': userWithTeamsRecordSearchQueryBuilder,
  'user-productivity-performance': taglessSearchQueryBuilder,
  'team-productivity': teamRecordSearchQueryBuilder,
  'team-productivity-performance': taglessSearchQueryBuilder,
  'user-collaboration': userWithTeamsRecordSearchQueryBuilder,
  'user-collaboration-performance': taglessSearchQueryBuilder,
  'team-collaboration': teamRecordSearchQueryBuilder,
  'team-collaboration-performance': taglessSearchQueryBuilder,
  'wg-leadership': leadershipRecordSearchQueryBuilder,
  'ig-leadership': leadershipRecordSearchQueryBuilder,
  'presenter-representation': teamRecordSearchQueryBuilder,
  'presenter-representation-performance': taglessSearchQueryBuilder,
};

const tagQueryBuilderByIndex: Record<OpensearchIndex, TagQueryBuilder> = {
  attendance: teamWithUsersRecordsTagQueryBuilder,
  'os-champion': teamWithUsersRecordsTagQueryBuilder,
  awards: teamWithUsersRecordsTagQueryBuilder,
  'preliminary-data-sharing': teamWithUsersRecordsTagQueryBuilder,
  'preprint-compliance': teamWithUsersRecordsTagQueryBuilder,
  'publication-compliance': teamWithUsersRecordsTagQueryBuilder,
  'user-productivity': userWithTeamsRecordsTagQueryBuilder,
  'user-productivity-performance': unsupportedTagQueryBuilder,
  'team-productivity': teamRecordTagQueryBuilder,
  'team-productivity-performance': unsupportedTagQueryBuilder,
  'user-collaboration': userWithTeamsRecordsTagQueryBuilder,
  'user-collaboration-performance': unsupportedTagQueryBuilder,
  'team-collaboration': teamRecordTagQueryBuilder,
  'team-collaboration-performance': unsupportedTagQueryBuilder,
  'wg-leadership': leadershipRecordTagQueryBuilder,
  'ig-leadership': leadershipRecordTagQueryBuilder,
  'presenter-representation': teamRecordTagQueryBuilder,
  'presenter-representation-performance': unsupportedTagQueryBuilder,
};

export class OpensearchClient<T> {
  private index: OpensearchIndex;
  private getAuthorization: () => Promise<string>;

  // The token is resolved per request so long-lived clients never send an
  // expired token; a plain string is still accepted for convenience.
  constructor(
    index: OpensearchIndex,
    authorization: string | (() => Promise<string>),
  ) {
    this.index = index;
    this.getAuthorization =
      typeof authorization === 'string'
        ? () => Promise.resolve(authorization)
        : authorization;
  }

  async request<S>(query: object): Promise<S> {
    const url = `${API_BASE_URL}/opensearch/search/${this.index}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: await this.getAuthorization(),
        'content-type': 'application/json',
        ...createSentryHeaders(),
      },
      body: JSON.stringify(query),
    });

    if (!resp.ok) {
      throw new Error(
        `Failed to search ${
          this.index
        } index. Expected status 2xx. Received status ${`${resp.status} ${resp.statusText}`.trim()}.`,
      );
    }

    return resp.json();
  }

  async search({
    searchTags,
    currentPage,
    pageSize,
    timeRange,
    searchScope,
    documentCategory,
    sort,
    outputType,
    teamId,
    awardType,
  }: Omit<OpensearchSearchOptions, 'currentPage' | 'pageSize'> & {
    currentPage?: number;
    pageSize?: number;
  }): Promise<SearchResult<T>> {
    const searchQuery = queryBuilderByIndex[this.index]({
      pageSize: pageSize ?? DEFAULT_PAGE_SIZE,
      currentPage: currentPage ?? DEFAULT_PAGE_NUMBER,
      searchScope,
      documentCategory,
      timeRange,
      searchTags,
      sort: sort as OpensearchSort[],
      outputType,
      teamId,
      awardType,
    });
    const response = await this.request<OpensearchHitsResponse<T>>(searchQuery);

    const items = (response.hits?.hits || []).map((hit: OpensearchHit<T>) => ({
      // eslint-disable-next-line no-underscore-dangle
      ...hit._source,
      // eslint-disable-next-line no-underscore-dangle
      objectID: hit._id,
    }));

    return {
      items,
      total: response.hits?.total?.value || 0,
    };
  }

  async getTagSuggestions(
    queryText: string,
    searchScope: SearchScope = 'extended',
  ): Promise<string[]> {
    const { query, responseTransformer } = tagQueryBuilderByIndex[this.index](
      queryText,
      searchScope,
    );
    const response = await this.request<TagSuggestionsResponse>(query);
    return responseTransformer(response);
  }
}
