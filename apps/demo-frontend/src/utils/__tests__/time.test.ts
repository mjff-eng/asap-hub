import {
  formatDuration,
  formatDurationWords,
  formatRecordedAt,
  parseTimecode,
} from '../time';

describe('formatDurationWords', () => {
  it.each`
    milliseconds | expected
    ${0}         | ${'0 sec'}
    ${9000}      | ${'9 sec'}
    ${253000}    | ${'4 min 13 sec'}
    ${120000}    | ${'2 min'}
    ${3600000}   | ${'1 hr'}
    ${3725000}   | ${'1 hr 2 min 5 sec'}
  `('formats $milliseconds as $expected', ({ milliseconds, expected }) => {
    expect(formatDurationWords(milliseconds)).toEqual(expected);
  });

  it('clamps negative durations to zero', () => {
    expect(formatDurationWords(-5000)).toEqual('0 sec');
  });
});

describe('formatDuration', () => {
  it.each`
    milliseconds | expected
    ${0}         | ${'0:00'}
    ${9000}      | ${'0:09'}
    ${561000}    | ${'9:21'}
    ${3600000}   | ${'1:00:00'}
    ${3725000}   | ${'1:02:05'}
  `('formats $milliseconds as $expected', ({ milliseconds, expected }) => {
    expect(formatDuration(milliseconds)).toEqual(expected);
  });

  it('clamps negative durations to zero', () => {
    expect(formatDuration(-1000)).toEqual('0:00');
  });
});

describe('parseTimecode', () => {
  it.each`
    value         | expected
    ${'0:00'}     | ${0}
    ${'00:09'}    | ${9000}
    ${'9:21'}     | ${561000}
    ${'1:00:00'}  | ${3600000}
    ${'1:02:05'}  | ${3725000}
    ${'  2:30  '} | ${150000}
    ${'12:34:56'} | ${45296000}
  `('parses $value as $expected', ({ value, expected }) => {
    expect(parseTimecode(value)).toEqual(expected);
  });

  it.each([
    '',
    'abc',
    '90',
    '1:2:3:4',
    '1:60',
    '1:75',
    '12:99:00',
    '-1:00',
    '1.5',
  ])('rejects %s', (value) => {
    expect(parseTimecode(value)).toBeUndefined();
  });

  it('round-trips through formatDuration', () => {
    [0, 9000, 561000, 3600000, 3725000].forEach((milliseconds) => {
      expect(parseTimecode(formatDuration(milliseconds))).toEqual(milliseconds);
    });
  });
});

describe('formatRecordedAt', () => {
  it('formats an ISO date', () => {
    expect(formatRecordedAt('2026-08-18T10:30:00.000Z')).toEqual('18 Aug 2026');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatRecordedAt('not a date')).toEqual('');
  });
});
