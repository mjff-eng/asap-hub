import type {
  AggregationBucket,
  NestedConfig,
  SearchScope,
  ShouldClause,
  TagQueryBuilder,
  TagSuggestionsResponse,
  TermsField,
} from '../types';

// Unique aggregation keys for team-with-users index
// (used by attendance, awards, os-champion, preliminary-data-sharing, preprint-compliance, publication-compliance)
const TEAM_WITH_USERS_INDEX_TEAMS = 'teamWithUsersIndex_teams' as const;
const TEAM_WITH_USERS_INDEX_NESTED_USERS =
  'teamWithUsersIndex_nestedUsers' as const;
const TEAM_WITH_USERS_INDEX_FILTERED_TEAMS =
  'teamWithUsersIndex_filteredTeams' as const;
const TEAM_WITH_USERS_INDEX_FILTERED_USERS =
  'teamWithUsersIndex_filteredUsers' as const;

// Empty query types (when no search string is provided)
type TeamWithUsersIndexEmptyQueryAggregation = {
  [TEAM_WITH_USERS_INDEX_TEAMS]: {
    terms: TermsField;
  };
  [TEAM_WITH_USERS_INDEX_NESTED_USERS]?: {
    nested: NestedConfig;
    aggs: {
      names: { terms: TermsField };
    };
  };
};

export type TeamWithUsersIndexEmptyQueryResponse = {
  aggregations: {
    [TEAM_WITH_USERS_INDEX_TEAMS]: {
      buckets: AggregationBucket[];
    };
    [TEAM_WITH_USERS_INDEX_NESTED_USERS]?: {
      names: {
        buckets: AggregationBucket[];
      };
    };
  };
};

// Search query types (when a search string is provided)
type TeamWithUsersIndexSearchQueryAggregation = {
  [TEAM_WITH_USERS_INDEX_FILTERED_TEAMS]: {
    filter: { match: Record<string, string> };
    aggs: {
      teams: { terms: TermsField };
    };
  };
  [TEAM_WITH_USERS_INDEX_FILTERED_USERS]?: {
    nested: NestedConfig;
    aggs: {
      filtered_names: {
        filter: { match: Record<string, string> };
        aggs: {
          names: { terms: TermsField };
        };
      };
    };
  };
};

export type TeamWithUsersIndexSearchQueryResponse = {
  aggregations: {
    [TEAM_WITH_USERS_INDEX_FILTERED_TEAMS]: {
      teams: {
        buckets: AggregationBucket[];
      };
    };
    [TEAM_WITH_USERS_INDEX_FILTERED_USERS]?: {
      filtered_names: {
        names: {
          buckets: AggregationBucket[];
        };
      };
    };
  };
};

// Type guards
function isTeamWithUsersIndexEmptyQueryResponse(
  response: TagSuggestionsResponse,
): response is TeamWithUsersIndexEmptyQueryResponse {
  return TEAM_WITH_USERS_INDEX_TEAMS in response.aggregations;
}

function isTeamWithUsersIndexSearchQueryResponse(
  response: TagSuggestionsResponse,
): response is TeamWithUsersIndexSearchQueryResponse {
  return TEAM_WITH_USERS_INDEX_FILTERED_TEAMS in response.aggregations;
}

export const teamWithUsersRecordsTagQueryBuilder: TagQueryBuilder = (
  searchQuery: string,
  searchScope: SearchScope,
): ReturnType<TagQueryBuilder> => {
  if (!searchQuery) {
    const aggs: TeamWithUsersIndexEmptyQueryAggregation = {
      [TEAM_WITH_USERS_INDEX_TEAMS]: {
        terms: {
          field: 'teamName.raw',
          size: 5,
        },
      },
    };

    if (searchScope === 'extended') {
      aggs[TEAM_WITH_USERS_INDEX_NESTED_USERS] = {
        nested: {
          path: 'users',
        },
        aggs: {
          names: {
            terms: {
              field: 'users.name.raw',
              size: 5,
            },
          },
        },
      };
    }

    return {
      query: {
        size: 0,
        aggs,
      },
      responseTransformer: (response: TagSuggestionsResponse) => {
        if (isTeamWithUsersIndexEmptyQueryResponse(response)) {
          const teams = response.aggregations[
            TEAM_WITH_USERS_INDEX_TEAMS
          ].buckets.map((b) => b.key);
          const users =
            response.aggregations[
              TEAM_WITH_USERS_INDEX_NESTED_USERS
            ]?.names.buckets.map((b) => b.key) ?? [];
          return [...teams, ...users];
        }
        return [];
      },
    };
  }

  const shouldClauses: ShouldClause[] = [
    {
      match: {
        teamName: searchQuery,
      },
    },
  ];

  const aggs: TeamWithUsersIndexSearchQueryAggregation = {
    [TEAM_WITH_USERS_INDEX_FILTERED_TEAMS]: {
      filter: {
        match: {
          teamName: searchQuery,
        },
      },
      aggs: {
        teams: {
          terms: {
            field: 'teamName.raw',
            size: 10,
          },
        },
      },
    },
  };

  if (searchScope === 'extended') {
    shouldClauses.push({
      nested: {
        path: 'users',
        query: {
          match: {
            'users.name': searchQuery,
          },
        },
      },
    });

    aggs[TEAM_WITH_USERS_INDEX_FILTERED_USERS] = {
      nested: {
        path: 'users',
      },
      aggs: {
        filtered_names: {
          filter: {
            match: {
              'users.name': searchQuery,
            },
          },
          aggs: {
            names: {
              terms: {
                field: 'users.name.raw',
                size: 10,
              },
            },
          },
        },
      },
    };
  }

  return {
    query: {
      size: 0,
      query: {
        bool: {
          should: shouldClauses,
        },
      },
      aggs,
    },
    responseTransformer: (response: TagSuggestionsResponse) => {
      if (isTeamWithUsersIndexSearchQueryResponse(response)) {
        const teams = response.aggregations[
          TEAM_WITH_USERS_INDEX_FILTERED_TEAMS
        ].teams.buckets.map((b) => b.key);
        const users =
          response.aggregations[
            TEAM_WITH_USERS_INDEX_FILTERED_USERS
          ]?.filtered_names.names.buckets.map((b) => b.key) ?? [];
        // Returning teams first because it's the current behavior with Algolia.
        return [...teams, ...users];
      }
      return [];
    },
  };
};
