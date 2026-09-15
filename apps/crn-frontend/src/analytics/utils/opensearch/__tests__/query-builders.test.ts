import {
  buildNormalizedStringSort,
  teamWithUsersRecordSearchQueryBuilder,
  userWithTeamsRecordSearchQueryBuilder,
  teamRecordSearchQueryBuilder,
  taglessSearchQueryBuilder,
  leadershipRecordSearchQueryBuilder,
} from '../query-builders';

describe('buildNormalizedStringSort', () => {
  it('builds script sort with ascending order', () => {
    const result = buildNormalizedStringSort({
      keyword: 'teamName.keyword',
      order: 'asc',
    });

    expect(result).toEqual({
      _script: {
        type: 'string',
        script: {
          source: "doc['teamName.keyword'].value.toLowerCase()",
          lang: 'painless',
        },
        order: 'asc',
      },
    });
  });

  it('builds script sort with descending order', () => {
    const result = buildNormalizedStringSort({
      keyword: 'name.keyword',
      order: 'desc',
    });

    expect(result).toEqual({
      _script: {
        type: 'string',
        script: {
          source: "doc['name.keyword'].value.toLowerCase()",
          lang: 'painless',
        },
        order: 'desc',
      },
    });
  });

  it('builds script sort with nested path', () => {
    const result = buildNormalizedStringSort({
      keyword: 'teams.team.keyword',
      order: 'asc',
      nested: { path: 'teams' },
    });

    expect(result).toEqual({
      _script: {
        type: 'string',
        script: {
          source: "doc['teams.team.keyword'].value.toLowerCase()",
          lang: 'painless',
        },
        order: 'asc',
        nested: { path: 'teams' },
      },
    });
  });

  it('builds script sort without nested path when not provided', () => {
    const result = buildNormalizedStringSort({
      keyword: 'title.keyword',
      order: 'asc',
    });

    expect(result).not.toHaveProperty('_script.nested');
  });

  it('handles deeply nested field paths', () => {
    const result = buildNormalizedStringSort({
      keyword: 'user.profile.displayName.keyword',
      order: 'asc',
      nested: { path: 'user.profile' },
    });

    expect(result).toEqual({
      _script: {
        type: 'string',
        script: {
          source: "doc['user.profile.displayName.keyword'].value.toLowerCase()",
          lang: 'painless',
        },
        order: 'asc',
        nested: { path: 'user.profile' },
      },
    });
  });
});

describe('teamWithUsersRecordSearchQueryBuilder', () => {
  it('builds query with empty searchTags array', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'extended',
    });

    expect(result.query.bool).not.toHaveProperty('should');
    expect(result.query.bool).not.toHaveProperty('minimum_should_match');
    expect(result.query.bool.must).toEqual([{ term: { timeRange: '30d' } }]);
  });

  it('builds query with single tag and scope="teams"', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: ['Team Alpha'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'teamName.keyword': 'Team Alpha' } },
    ]);
    expect(
      'minimum_should_match' in result.query.bool &&
        result.query.bool.minimum_should_match,
    ).toBe(1);
  });

  it('builds query with single tag and scope="both"', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: ['Team Alpha'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'extended',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'teamName.keyword': 'Team Alpha' } },
      {
        nested: {
          path: 'users',
          query: { term: { 'users.name.keyword': 'Team Alpha' } },
        },
      },
    ]);
    expect(
      'minimum_should_match' in result.query.bool &&
        result.query.bool.minimum_should_match,
    ).toBe(1);
  });

  it('builds query with multiple tags and scope="teams"', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: ['Team Alpha', 'Team Beta'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'teamName.keyword': 'Team Alpha' } },
      { term: { 'teamName.keyword': 'Team Beta' } },
    ]);
    expect(
      'should' in result.query.bool && result.query.bool.should,
    ).toHaveLength(2);
  });

  it('builds query with multiple tags and scope="both"', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: ['Team Alpha', 'Team Beta'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'extended',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'teamName.keyword': 'Team Alpha' } },
      {
        nested: {
          path: 'users',
          query: { term: { 'users.name.keyword': 'Team Alpha' } },
        },
      },
      { term: { 'teamName.keyword': 'Team Beta' } },
      {
        nested: {
          path: 'users',
          query: { term: { 'users.name.keyword': 'Team Beta' } },
        },
      },
    ]);
    expect(
      'should' in result.query.bool && result.query.bool.should,
    ).toHaveLength(4);
  });

  it('includes documentCategory in must clauses when provided', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
      documentCategory: 'article',
    });

    expect(result.query.bool.must).toEqual([
      { term: { timeRange: '30d' } },
      { term: { documentCategory: 'article' } },
    ]);
  });

  it('excludes documentCategory from must clauses when undefined', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.query.bool.must).toEqual([{ term: { timeRange: '30d' } }]);
  });

  it('uses provided custom sort', () => {
    const customSort = [{ ratio: { order: 'desc' as const } }];
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
      sort: customSort,
    });

    expect(result.sort).toEqual(customSort);
  });

  it('uses default sort when sort is undefined', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.sort).toEqual([{ 'teamName.keyword': { order: 'asc' } }]);
  });

  it('calculates pagination correctly for page 0 size 10', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.from).toBe(0);
    expect(result.size).toBe(10);
  });

  it('calculates pagination correctly for page 2 size 20', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 2,
      pageSize: 20,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.from).toBe(40);
    expect(result.size).toBe(20);
  });

  it('includes different timeRange values in must clause', () => {
    const result = teamWithUsersRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '90d',
      searchScope: 'flat',
    });

    expect(result.query.bool.must).toContainEqual({
      term: { timeRange: '90d' },
    });
  });
});

describe('userWithTeamsRecordSearchQueryBuilder', () => {
  it('builds query with empty searchTags array', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'extended',
    });

    expect(result.query.bool).not.toHaveProperty('should');
    expect(result.query.bool).not.toHaveProperty('minimum_should_match');
    expect(result.query.bool.must).toEqual([{ term: { timeRange: '30d' } }]);
  });

  it('builds query with single tag and scope="teams"', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: ['John Doe'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'name.keyword': 'John Doe' } },
    ]);
    expect(
      'minimum_should_match' in result.query.bool &&
        result.query.bool.minimum_should_match,
    ).toBe(1);
  });

  it('builds query with single tag and scope="both"', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: ['John Doe'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'extended',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'name.keyword': 'John Doe' } },
      {
        nested: {
          path: 'teams',
          query: { term: { 'teams.team.keyword': 'John Doe' } },
        },
      },
    ]);
    expect(
      'minimum_should_match' in result.query.bool &&
        result.query.bool.minimum_should_match,
    ).toBe(1);
  });

  it('builds query with multiple tags and scope="teams"', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: ['John Doe', 'Jane Smith'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'name.keyword': 'John Doe' } },
      { term: { 'name.keyword': 'Jane Smith' } },
    ]);
    expect(
      'should' in result.query.bool && result.query.bool.should,
    ).toHaveLength(2);
  });

  it('builds query with multiple tags and scope="both"', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: ['John Doe', 'Jane Smith'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'extended',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'name.keyword': 'John Doe' } },
      {
        nested: {
          path: 'teams',
          query: { term: { 'teams.team.keyword': 'John Doe' } },
        },
      },
      { term: { 'name.keyword': 'Jane Smith' } },
      {
        nested: {
          path: 'teams',
          query: { term: { 'teams.team.keyword': 'Jane Smith' } },
        },
      },
    ]);
    expect(
      'should' in result.query.bool && result.query.bool.should,
    ).toHaveLength(4);
  });

  it('includes documentCategory in must clauses when provided', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
      documentCategory: 'protocol',
    });

    expect(result.query.bool.must).toEqual([
      { term: { timeRange: '30d' } },
      { term: { documentCategory: 'protocol' } },
    ]);
  });

  it('excludes documentCategory from must clauses when undefined', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.query.bool.must).toEqual([{ term: { timeRange: '30d' } }]);
  });

  it('includes sort property when custom sort is provided', () => {
    const customSort = [{ asapOutput: { order: 'asc' as const } }];
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
      sort: customSort,
    });

    expect(result.sort).toEqual(customSort);
  });

  it('does not include sort property when sort is undefined', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result).not.toHaveProperty('sort');
  });

  it('calculates pagination correctly for page 0 size 10', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.from).toBe(0);
    expect(result.size).toBe(10);
  });

  it('calculates pagination correctly for page 1 size 15', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 1,
      pageSize: 15,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.from).toBe(15);
    expect(result.size).toBe(15);
  });

  it('includes different timeRange values in must clause', () => {
    const result = userWithTeamsRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'last-year',
      searchScope: 'flat',
    });

    expect(result.query.bool.must).toContainEqual({
      term: { timeRange: 'last-year' },
    });
  });
});

describe('teamRecordSearchQueryBuilder', () => {
  it('builds query with empty searchTags array', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.query.bool).not.toHaveProperty('should');
    expect(result.query.bool).not.toHaveProperty('minimum_should_match');
    expect(result.query.bool.must).toEqual([{ term: { timeRange: '30d' } }]);
  });

  it('builds query with single search tag', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: ['Team Alpha'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'name.keyword': 'Team Alpha' } },
    ]);
    expect(
      'minimum_should_match' in result.query.bool &&
        result.query.bool.minimum_should_match,
    ).toBe(1);
  });

  it('builds query with multiple search tags', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: ['Team Alpha', 'Team Beta'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'name.keyword': 'Team Alpha' } },
      { term: { 'name.keyword': 'Team Beta' } },
    ]);
    expect(
      'should' in result.query.bool && result.query.bool.should,
    ).toHaveLength(2);
  });

  it('includes outputType in must clauses when provided', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
      outputType: 'public',
    });

    expect(result.query.bool.must).toEqual([
      { term: { timeRange: '30d' } },
      { term: { outputType: 'public' } },
    ]);
  });

  it('excludes outputType from must clauses when undefined', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.query.bool.must).toEqual([{ term: { timeRange: '30d' } }]);
  });

  it('includes teamId in must clauses when provided', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
      teamId: 'team-id-1',
    });

    expect(result.query.bool.must).toEqual([
      { term: { timeRange: 'all' } },
      { term: { id: 'team-id-1' } },
    ]);
    expect(result.query.bool).not.toHaveProperty('should');
  });

  it('combines teamId and outputType in must clauses', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
      outputType: 'public',
      teamId: 'team-id-1',
    });

    expect(result.query.bool.must).toEqual([
      { term: { timeRange: 'all' } },
      { term: { outputType: 'public' } },
      { term: { id: 'team-id-1' } },
    ]);
  });

  it('excludes teamId from must clauses when undefined', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
    });

    expect(result.query.bool.must).toEqual([{ term: { timeRange: 'all' } }]);
  });

  it('includes sort property when custom sort is provided', () => {
    const customSort = [{ Article: { order: 'asc' as const } }];
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
      sort: customSort,
    });

    expect(result.sort).toEqual(customSort);
  });

  it('does not include sort property when sort is undefined', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result).not.toHaveProperty('sort');
  });

  it('calculates pagination correctly for page 0 size 10', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.from).toBe(0);
    expect(result.size).toBe(10);
  });

  it('calculates pagination correctly for page 2 size 15', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 2,
      pageSize: 15,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.from).toBe(30);
    expect(result.size).toBe(15);
  });

  it('includes different timeRange values in must clause', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '90d',
      searchScope: 'flat',
    });

    expect(result.query.bool.must).toContainEqual({
      term: { timeRange: '90d' },
    });
  });

  it('does not support nested queries (only flat searchScope)', () => {
    const result = teamRecordSearchQueryBuilder({
      searchTags: ['Team Alpha'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      { term: { 'name.keyword': 'Team Alpha' } },
    ]);
    expect(
      'should' in result.query.bool && result.query.bool.should,
    ).toHaveLength(1);
  });

  it('throws error when searchScope is "extended"', () => {
    expect(() =>
      teamRecordSearchQueryBuilder({
        searchTags: ['Team Alpha'],
        currentPage: 0,
        pageSize: 10,
        timeRange: '30d',
        searchScope: 'extended',
      }),
    ).toThrow("The search scope 'extended' is not available for this index");
  });
});

describe('taglessSearchQueryBuilder', () => {
  it('includes both timeRange and documentCategory when both provided', () => {
    const result = taglessSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
      documentCategory: 'article',
    });

    expect(result.query.bool.must).toEqual([
      { term: { timeRange: '30d' } },
      { term: { documentCategory: 'article' } },
    ]);
  });

  it('includes only timeRange when documentCategory is undefined', () => {
    const result = taglessSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '90d',
      searchScope: 'flat',
    });

    expect(result.query.bool.must).toEqual([{ term: { timeRange: '90d' } }]);
  });

  it('calculates pagination correctly', () => {
    const result = taglessSearchQueryBuilder({
      searchTags: [],
      currentPage: 3,
      pageSize: 25,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.from).toBe(75);
    expect(result.size).toBe(25);
  });

  it('ignores searchTags parameter', () => {
    const result = taglessSearchQueryBuilder({
      searchTags: ['Team Alpha', 'User Beta'],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
    });

    expect(result.query.bool).not.toHaveProperty('should');
    expect(JSON.stringify(result)).not.toContain('Team Alpha');
    expect(JSON.stringify(result)).not.toContain('User Beta');
  });

  it('does not include sort in response', () => {
    const result = taglessSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
      sort: [{ ratio: { order: 'desc' as const } }],
    });

    expect(result).not.toHaveProperty('sort');
  });

  it('throws error when searchScope is "extended"', () => {
    expect(() =>
      taglessSearchQueryBuilder({
        searchTags: [],
        currentPage: 0,
        pageSize: 10,
        timeRange: '30d',
        searchScope: 'extended',
      }),
    ).toThrow("The search scope 'extended' is not available for this index");
  });

  it('includes outputType in must clauses when provided', () => {
    const result = taglessSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
      outputType: 'public',
    });

    expect(result.query.bool.must).toEqual([
      { term: { timeRange: '30d' } },
      { term: { outputType: 'public' } },
    ]);
  });

  it('includes timeRange, documentCategory, and outputType when all provided', () => {
    const result = taglessSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'flat',
      documentCategory: 'article',
      outputType: 'public',
    });

    expect(result.query.bool.must).toEqual([
      { term: { timeRange: '30d' } },
      { term: { documentCategory: 'article' } },
      { term: { outputType: 'public' } },
    ]);
  });

  // Coverage: tests the empty array spread when timeRange is undefined
  it('excludes timeRange from must clauses when undefined', () => {
    const result = taglessSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: undefined as unknown as string,
      searchScope: 'flat',
      documentCategory: 'article',
    });

    expect(result.query.bool.must).toEqual([
      { term: { documentCategory: 'article' } },
    ]);
  });
});

describe('leadershipRecordSearchQueryBuilder', () => {
  it('builds query with empty searchTags array', () => {
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
    });

    expect(result.query.bool).not.toHaveProperty('should');
    expect(result.query.bool).not.toHaveProperty('minimum_should_match');
    expect(result.query.bool.must).toEqual([]);
  });

  it('includes teamId in must clauses when provided', () => {
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
      teamId: 'team-id-1',
    });

    expect(result.query.bool.must).toEqual([{ term: { id: 'team-id-1' } }]);
    expect(result.query.bool).not.toHaveProperty('should');
  });

  it('excludes teamId from must clauses when undefined', () => {
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
      teamId: undefined,
    });

    expect(result.query.bool.must).toEqual([]);
  });

  it('builds query with single search tag using wildcard', () => {
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: ['Team Alpha'],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      {
        wildcard: {
          'displayName.keyword': {
            value: '*team alpha*',
            case_insensitive: true,
          },
        },
      },
    ]);
    expect(
      'minimum_should_match' in result.query.bool &&
        result.query.bool.minimum_should_match,
    ).toBe(1);
  });

  it('converts search tags to lowercase in wildcard pattern', () => {
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: ['UPPERCASE Team'],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      {
        wildcard: {
          'displayName.keyword': {
            value: '*uppercase team*',
            case_insensitive: true,
          },
        },
      },
    ]);
  });

  it('builds query with multiple search tags', () => {
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: ['Team Alpha', 'Team Beta'],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
    });

    expect('should' in result.query.bool && result.query.bool.should).toEqual([
      {
        wildcard: {
          'displayName.keyword': {
            value: '*team alpha*',
            case_insensitive: true,
          },
        },
      },
      {
        wildcard: {
          'displayName.keyword': {
            value: '*team beta*',
            case_insensitive: true,
          },
        },
      },
    ]);
    expect(
      'should' in result.query.bool && result.query.bool.should,
    ).toHaveLength(2);
  });

  it('uses provided custom sort', () => {
    const customSort = [
      { workingGroupLeadershipRoleCount: { order: 'desc' as const } },
    ];
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
      sort: customSort,
    });

    expect(result.sort).toEqual(customSort);
  });

  it('uses default sort when sort is undefined', () => {
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
    });

    expect(result.sort).toEqual([{ 'displayName.keyword': { order: 'asc' } }]);
  });

  it('calculates pagination correctly for page 0 size 10', () => {
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
    });

    expect(result.from).toBe(0);
    expect(result.size).toBe(10);
  });

  it('calculates pagination correctly for page 3 size 20', () => {
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: [],
      currentPage: 3,
      pageSize: 20,
      timeRange: 'all',
      searchScope: 'flat',
    });

    expect(result.from).toBe(60);
    expect(result.size).toBe(20);
  });

  it('has empty must clauses array', () => {
    const result = leadershipRecordSearchQueryBuilder({
      searchTags: ['Team Alpha'],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'flat',
    });

    expect(result.query.bool.must).toEqual([]);
  });
});
