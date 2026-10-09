import { Settings } from 'luxon';
import {
  getReferenceDates,
  convertDate,
  inLast24Hours,
  filterUndefined,
  getUserName,
  capitalizeFirstLetter,
  inLast7Days,
} from '../../src/utils/reminder';

describe('getReferenceDates', () => {
  beforeEach(() => {
    Settings.now = () => new Date(2024, 0, 20, 10, 0, 0, 0).valueOf();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns last24HoursISO, lastMidnightISO, now and todayMidnightISO for Europe/London', () => {
    const zone = 'Europe/London';
    const result = getReferenceDates(zone);
    expect(result.last24HoursISO.toISO()).toEqual('2024-01-19T10:00:00.000Z');
    expect(result.lastMidnightISO.toISO()).toEqual('2024-01-20T00:00:00.000Z');
    expect(result.now.toISO()).toEqual('2024-01-20T10:00:00.000Z');
    expect(result.todayMidnightISO.toISO()).toEqual('2024-01-21T00:00:00.000Z');
  });

  test('returns last24HoursISO, lastMidnightISO, now and todayMidnightISO for America/Sao_Paulo', () => {
    const zone = 'America/Sao_Paulo';
    const result = getReferenceDates(zone);
    expect(result.last24HoursISO.toISO()).toEqual('2024-01-19T10:00:00.000Z');
    expect(result.lastMidnightISO.toISO()).toEqual('2024-01-20T03:00:00.000Z');
    expect(result.now.toISO()).toEqual('2024-01-20T10:00:00.000Z');
    expect(result.todayMidnightISO.toISO()).toEqual('2024-01-21T03:00:00.000Z');
  });
});

describe('convertDate', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  test.each`
    zone                   | expected
    ${'Australia/Sydney'}  | ${'2024-01-14T04:00:00.000Z'}
    ${'Europe/London'}     | ${'2024-01-14T15:00:00.000Z'}
    ${'America/Sao_Paulo'} | ${'2024-01-14T18:00:00.000Z'}
  `(
    'converts 2024-01-14T15:00:00.000 to $expected when zone is $zone',
    ({ zone, expected }) => {
      const result = convertDate('2024-01-14T15:00:00.000', zone);
      expect(result.toISO()).toEqual(expected);
    },
  );
});

describe('inLast24Hours', () => {
  beforeEach(() => {
    Settings.now = () => new Date(2024, 0, 20, 10, 0, 0, 0).valueOf();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test.each`
    date                         | timezone               | expected
    ${'2024-01-19T06:00:00.000'} | ${'America/Sao_Paulo'} | ${false}
    ${'2024-01-19T09:00:00.000'} | ${'America/Sao_Paulo'} | ${true}
    ${'2024-01-20T06:00:00.000'} | ${'America/Sao_Paulo'} | ${true}
    ${'2024-01-20T09:00:00.000'} | ${'America/Sao_Paulo'} | ${false}
    ${'2024-01-20T11:00:00.000'} | ${'America/Sao_Paulo'} | ${false}
    ${'2024-01-19T06:00:00.000'} | ${'Europe/London'}     | ${false}
    ${'2024-01-19T09:00:00.000'} | ${'Europe/London'}     | ${false}
    ${'2024-01-20T06:00:00.000'} | ${'Europe/London'}     | ${true}
    ${'2024-01-20T09:00:00.000'} | ${'Europe/London'}     | ${true}
    ${'2024-01-20T11:00:00.000'} | ${'Europe/London'}     | ${false}
  `(
    'returns $expected when timezone is $timezone and date is $date',
    ({ date, timezone, expected }) => {
      expect(inLast24Hours(date, timezone)).toEqual(expected);
    },
  );
});

describe('inLast7Days', () => {
  beforeEach(() => {
    Settings.now = () => new Date(2024, 0, 20, 10, 0, 0, 0).valueOf();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test.each`
    date                         | timezone               | expected
    ${'2024-01-13T06:00:00.000'} | ${'America/Sao_Paulo'} | ${false}
    ${'2024-01-13T11:00:00.000'} | ${'America/Sao_Paulo'} | ${true}
    ${'2024-01-20T09:00:00.000'} | ${'America/Sao_Paulo'} | ${false}
    ${'2024-01-13T06:00:00.000'} | ${'Europe/London'}     | ${false}
    ${'2024-01-13T11:00:00.000'} | ${'Europe/London'}     | ${true}
    ${'2024-01-20T09:00:00.000'} | ${'Europe/London'}     | ${true}
  `(
    'returns $expected when timezone is $timezone and date is $date',
    ({ date, timezone, expected }) => {
      expect(inLast7Days(date, timezone)).toEqual(expected);
    },
  );
});

describe('filterUndefined', () => {
  it('should handle an empty input array', () => {
    expect(filterUndefined([])).toEqual([]);
  });

  it('should remove undefined values from the array', () => {
    expect(
      filterUndefined(['apple', undefined, 'banana', undefined, 'orange']),
    ).toEqual(['apple', 'banana', 'orange']);
  });
});

describe('getUserName', () => {
  it('should return null when researchOutput is null', () => {
    expect(getUserName(null)).toEqual(null);
  });

  it('should return null when createdBy is null', () => {
    const researchOutput = {
      createdBy: null,
    };
    expect(getUserName(researchOutput)).toEqual(null);
  });

  it('should return null when firstName is null', () => {
    const researchOutput = {
      createdBy: {
        firstName: null,
        lastName: 'Doe',
      },
    };
    expect(getUserName(researchOutput)).toEqual(null);
  });

  it('should return null when lastName is null', () => {
    const researchOutput = {
      createdBy: {
        firstName: 'John',
        lastName: null,
      },
    };

    expect(getUserName(researchOutput)).toEqual(null);
  });

  it('should return the full name when createdBy has both firstName and lastName', () => {
    const researchOutput = {
      createdBy: {
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    expect(getUserName(researchOutput)).toEqual('John Doe');
  });
});

describe('capitalizeFirstLetter', () => {
  it('should capitalize the first letter', () => {
    expect(capitalizeFirstLetter('working group')).toEqual('Working group');
  });
});
