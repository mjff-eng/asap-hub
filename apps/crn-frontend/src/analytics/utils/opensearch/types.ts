import { DocumentCategoryOption, OutputTypeOption } from '@asap-hub/model';

export interface SearchResult<T> {
  items: T[];
  total: number;
}

export type AggregationBucket = {
  key: string;
  doc_count: number;
};

/**
 * Generic response type for tag suggestions.
 */
export type TagSuggestionsResponse = {
  /**
   * Each tag query builder defines its own specific response types locally
   * and uses type guards to narrow this loose type.
   */
  aggregations: Record<string, unknown>;
};

/**
 * Controls whether search queries match only the primary record or also include
 * nested/related entities.
 *
 * - `flat`: Only match the primary entity field (team name for team based
 *   indices, user name for user based indices)
 * - `extended`: Also search related entities (e.g., searching "Hawk" in a team
 *   index will find teams that have a member named "Hawk")
 *
 * Used by query builders to conditionally add nested search clauses.
 */
export type SearchScope = 'flat' | 'extended';

export type OpensearchSearchOptions = {
  currentPage: number;
  pageSize: number;
  timeRange: string;
  searchTags: string[];
  searchScope: SearchScope;
  documentCategory?: DocumentCategoryOption;
  sort?: OpensearchSort[];
  outputType?: OutputTypeOption;
  teamId?: string;
};

type SortConfigOrder = 'asc' | 'desc';

export type NestedConfig = {
  path: string;
};

export type TermsField = {
  field: string;
  size: number;
};

type OpensearchPropertySort = {
  [id: string]: {
    order: SortConfigOrder;
    mode?: 'avg' | 'sum' | 'median' | 'min' | 'max';
    nested?: NestedConfig;
    missing?: '_first' | '_last' | number | string;
  };
};

type OpensearchScriptSort = {
  _script: {
    type: 'string';
    script: {
      source: string;
      lang: 'painless';
    };
    order: SortConfigOrder;
    nested?: NestedConfig;
  };
};

export type OpensearchSort = OpensearchScriptSort | OpensearchPropertySort;
export type OpensearchSortMap<T extends `${string}_asc` | `${string}_desc`> =
  Record<T, OpensearchSort[]>;

export type OpensearchIndex =
  | 'publication-compliance'
  | 'preprint-compliance'
  | 'os-champion'
  | 'attendance'
  | 'preliminary-data-sharing'
  | 'user-productivity'
  | 'user-productivity-performance'
  | 'team-productivity'
  | 'team-productivity-performance'
  | 'user-collaboration'
  | 'user-collaboration-performance'
  | 'team-collaboration'
  | 'team-collaboration-performance'
  | 'wg-leadership'
  | 'ig-leadership'
  | 'presenter-representation'
  | 'presenter-representation-performance';

export type ShouldClause =
  | {
      wildcard: Record<string, { value: string; case_insensitive: boolean }>;
    }
  | {
      term: Record<string, string>;
    }
  | {
      nested: NestedConfig & {
        query:
          | {
              term: Record<string, string>;
              match?: never;
              wildcard?: never;
            }
          | {
              term?: never;
              match: Record<string, string>;
              wildcard?: never;
            }
          | {
              term?: never;
              match?: never;
              wildcard: Record<
                string,
                { value: string; case_insensitive: boolean }
              >;
            };
      };
    }
  | { match: Record<string, string> };

type TermKey =
  | 'timeRange'
  | 'documentCategory'
  | 'outputType'
  | 'id'
  | 'teamId';

type ExclusiveRecord<K extends string, V> = {
  [P in K]: { [_ in P]: V } & { [O in Exclude<K, P>]?: never };
}[K];

export type MustClause = {
  // Allow only one key in the term object.
  // Example:
  // {term: {timeRange: 'something'}} -> is valid
  // {term: {timeRange: 'something', documentCategory: 'something-else'}} -> not valid
  term: ExclusiveRecord<TermKey, string>;
};

export type SearchQuery = {
  query: {
    bool:
      | {
          must: MustClause[];
        }
      | {
          should: ShouldClause[];
          minimum_should_match?: number;
          must?: { term: Record<string, unknown> }[];
        };
  };
  sort?: Record<string, { order: 'asc' | 'desc' }>[];
  from: number;
  size: number;
};

export type AggregationQuery = {
  size: 0;
  /**
   * Generic aggregation query type.
   * Each tag query builder defines its own specific aggregation types locally,
   * keeping this shared type intentionally loose.
   */
  aggs: Record<string, unknown>;
  query?: SearchQuery['query'];
};

export type TagQueryBuilder = (
  searchQuery: string,
  searchScope: SearchScope,
) => {
  query: AggregationQuery;
  responseTransformer: (queryResponse: TagSuggestionsResponse) => string[];
};
