import { getEventFilters, getEventStartMonthFilter } from '../src/filters';

describe('Filters', () => {
  test('before date is set', () => {
    expect(getEventFilters({ before: '2021-12-28' })).toEqual(
      'endDateTimestamp < 1640649600',
    );
  });
  test('after date is set', () => {
    expect(getEventFilters({ after: '2021-12-28' })).toEqual(
      'endDateTimestamp > 1640649600',
    );
  });
  test('before and after date is set', () => {
    expect(
      getEventFilters({ before: '2007-07-06', after: '2021-12-28' }),
    ).toEqual('endDateTimestamp < 1183680000 OR endDateTimestamp > 1640649600');
  });
  test('dates constained by user', () => {
    expect(
      getEventFilters(
        { before: '2007-07-06', after: '2021-12-28' },
        { userId: '1103' },
      ),
    ).toEqual(
      '(endDateTimestamp < 1183680000 OR endDateTimestamp > 1640649600) AND (speakers.user.id: "1103")',
    );
  });
  test('only userId is passed', () => {
    expect(getEventFilters({}, { userId: '1103' })).toEqual(
      'speakers.user.id: "1103"',
    );
  });

  test('dates constrained by team', () => {
    expect(
      getEventFilters(
        { before: '2007-07-06', after: '2021-12-28' },
        { teamId: '1103' },
      ),
    ).toEqual(
      '(endDateTimestamp < 1183680000 OR endDateTimestamp > 1640649600) AND (speakers.team.id: "1103")',
    );
  });
  test('only teamId is passed', () => {
    expect(getEventFilters({}, { teamId: '1103' })).toEqual(
      'speakers.team.id: "1103"',
    );
  });
  test('only status is passed', () => {
    expect(getEventFilters({}, { notStatus: 'Cancelled' })).toEqual(
      'NOT status:Cancelled',
    );
  });
  test('throws when both userId and teamId are passed', () => {
    expect(() =>
      getEventFilters({}, { userId: '1103', teamId: '1103' }),
    ).toThrowError(/userId and teamId not supported/i);
  });

  describe.each`
    groupName           | entity             | field
    ${`interest group`} | ${`interestGroup`} | ${`interestGroupId`}
    ${`working group`}  | ${`workingGroup`}  | ${`workingGroupId`}
    ${`project`}        | ${`project`}       | ${`projectId`}
  `('$groupName', ({ groupName, entity, field }) => {
    test(`dates constrained by ${groupName}`, () => {
      expect(
        getEventFilters(
          { before: '2007-07-06', after: '2021-12-28' },
          { [field]: '1234' },
        ),
      ).toEqual(
        `(endDateTimestamp < 1183680000 OR endDateTimestamp > 1640649600) AND (${entity}.id: "1234")`,
      );
    });
    test(`only ${field} is passed`, () => {
      expect(getEventFilters({}, { [field]: '1234' })).toEqual(
        `${entity}.id: "1234"`,
      );
    });
    test(`${field} and userId is passed`, () => {
      expect(getEventFilters({}, { userId: '4321', [field]: '1234' })).toEqual(
        `speakers.user.id: "4321" AND ${entity}.id: "1234"`,
      );
    });
    test(`dates constrained by user and ${entity}`, () => {
      expect(
        getEventFilters(
          { before: '2007-07-06', after: '2021-12-28' },
          { userId: '1103', [field]: '4321' },
        ),
      ).toEqual(
        `(endDateTimestamp < 1183680000 OR endDateTimestamp > 1640649600) AND (speakers.user.id: "1103" AND ${entity}.id: "4321")`,
      );
    });
  });
});

describe('getEventStartMonthFilter', () => {
  test('returns undefined when nothing is selected', () => {
    expect(getEventStartMonthFilter([])).toBeUndefined();
  });

  test('matches the selected months', () => {
    expect(getEventStartMonthFilter(['2026-04', '2025-12'])).toEqual(
      'startMonth:"2026-04" OR startMonth:"2025-12"',
    );
  });

  test('matches every month of a selected year', () => {
    const filter = getEventStartMonthFilter(['2026']);

    expect(filter?.split(' OR ')).toHaveLength(12);
    expect(filter).toMatch(
      /^startMonth:"2026-01" OR .* OR startMonth:"2026-12"$/,
    );
  });
});
