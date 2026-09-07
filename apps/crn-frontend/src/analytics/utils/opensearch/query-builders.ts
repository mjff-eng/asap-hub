import type {
  MustClause,
  OpensearchSearchOptions,
  SearchQuery,
  ShouldClause,
} from './types';

type SortConfigOrder = 'asc' | 'desc';

type SortConfigNested = {
  path: string;
};

type OpensearchScriptSort = {
  _script: {
    type: 'string';
    script: {
      source: string;
      lang: 'painless';
    };
    order: SortConfigOrder;
    nested?: SortConfigNested;
  };
};

export const buildNormalizedStringSort = (options: {
  keyword: `${string}.keyword`;
  order: SortConfigOrder;
  nested?: SortConfigNested;
}): OpensearchScriptSort => ({
  _script: {
    type: 'string',
    script: {
      source: `doc['${options.keyword}'].value.toLowerCase()`,
      lang: 'painless',
    },
    order: options.order,
    ...(options.nested ? { nested: options.nested } : {}),
  },
});

export const teamWithUsersRecordSearchQueryBuilder = (
  options: OpensearchSearchOptions,
): SearchQuery => {
  const shouldClauses = options.searchTags.flatMap((term) => {
    const clauses: ShouldClause[] = [
      {
        term: {
          'teamName.keyword': term,
        },
      },
    ];

    if (options.searchScope === 'extended') {
      clauses.push({
        nested: {
          path: 'users',
          query: {
            term: {
              'users.name.keyword': term,
            },
          },
        },
      });
    }
    return clauses;
  });

  const mustClauses: MustClause[] = [];

  mustClauses.push({
    term: {
      timeRange: options.timeRange,
    },
  });

  if (options.documentCategory) {
    mustClauses.push({
      term: { documentCategory: options.documentCategory },
    });
  }

  return {
    from: options.currentPage * options.pageSize,
    size: options.pageSize,
    query: {
      bool: {
        ...(shouldClauses.length > 0
          ? { should: shouldClauses, minimum_should_match: 1 }
          : {}),
        must: mustClauses,
      },
    },
    sort: options.sort
      ? (options.sort as SearchQuery['sort'])
      : [
          {
            'teamName.keyword': {
              order: 'asc',
            },
          },
        ],
  };
};

export const userWithTeamsRecordSearchQueryBuilder = (
  options: OpensearchSearchOptions,
): SearchQuery => {
  const shouldClauses = options.searchTags.flatMap((term) => {
    const clauses: ShouldClause[] = [
      {
        term: {
          'name.keyword': term,
        },
      },
    ];

    if (options.searchScope === 'extended') {
      clauses.push({
        nested: {
          path: 'teams',
          query: {
            term: {
              'teams.team.keyword': term,
            },
          },
        },
      });
    }
    return clauses;
  });

  const mustClauses: MustClause[] = [];

  mustClauses.push({
    term: {
      timeRange: options.timeRange,
    },
  });

  if (options.documentCategory) {
    mustClauses.push({
      term: { documentCategory: options.documentCategory },
    });
  }

  return {
    from: options.currentPage * options.pageSize,
    size: options.pageSize,
    query: {
      bool: {
        ...(shouldClauses.length > 0
          ? { should: shouldClauses, minimum_should_match: 1 }
          : {}),
        must: mustClauses,
      },
    },
    ...(options.sort ? { sort: options.sort as SearchQuery['sort'] } : {}),
  };
};

export const teamRecordSearchQueryBuilder = (
  options: OpensearchSearchOptions,
): SearchQuery => {
  if (options.searchScope === 'extended') {
    throw new Error(
      `The search scope 'extended' is not available for this index`,
    );
  }
  const shouldClauses = options.searchTags.flatMap((term) => {
    const clauses: ShouldClause[] = [
      {
        term: {
          'name.keyword': term,
        },
      },
    ];

    return clauses;
  });

  const mustClauses: MustClause[] = [];

  mustClauses.push({
    term: {
      timeRange: options.timeRange,
    },
  });

  if (options.outputType) {
    mustClauses.push({
      term: { outputType: options.outputType },
    });
  }
  if (options.teamId) {
    mustClauses.push({
      term: { id: options.teamId },
    });
  }

  return {
    from: options.currentPage * options.pageSize,
    size: options.pageSize,
    query: {
      bool: {
        ...(shouldClauses.length > 0
          ? { should: shouldClauses, minimum_should_match: 1 }
          : {}),
        must: mustClauses,
      },
    },
    ...(options.sort ? { sort: options.sort as SearchQuery['sort'] } : {}),
  };
};

export const taglessSearchQueryBuilder = (
  options: OpensearchSearchOptions,
): SearchQuery => {
  if (options.searchScope === 'extended') {
    throw new Error(
      `The search scope 'extended' is not available for this index`,
    );
  }

  return {
    from: options.currentPage * options.pageSize,
    size: options.pageSize,
    query: {
      bool: {
        must: [
          ...(options.timeRange
            ? [{ term: { timeRange: options.timeRange } }]
            : []),
          ...(options.documentCategory
            ? [{ term: { documentCategory: options.documentCategory } }]
            : []),
          ...(options.outputType
            ? [{ term: { outputType: options.outputType } }]
            : []),
        ],
      },
    },
  };
};

export const leadershipRecordSearchQueryBuilder = (
  options: OpensearchSearchOptions,
): SearchQuery => {
  const shouldClauses = options.searchTags.flatMap((term) => {
    const pattern = `*${term.toLowerCase()}*`;
    return [
      {
        wildcard: {
          'displayName.keyword': {
            value: pattern,
            case_insensitive: true,
          },
        },
      },
    ];
  });

  const mustClauses: MustClause[] = [];
  if (options.teamId) {
    mustClauses.push({
      term: { id: options.teamId },
    });
  }

  return {
    from: options.currentPage * options.pageSize,
    size: options.pageSize,
    query: {
      bool: {
        ...(shouldClauses.length > 0
          ? { should: shouldClauses, minimum_should_match: 1 }
          : {}),
        must: mustClauses,
      },
    },
    sort: options.sort
      ? (options.sort as SearchQuery['sort'])
      : [
          {
            'displayName.keyword': {
              order: 'asc',
            },
          },
        ],
  };
};
