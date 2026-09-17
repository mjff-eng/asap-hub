import { formatMs, parseMs } from '../timecode';

describe('formatMs', () => {
  it('reads as minutes, seconds and hundredths', () => {
    expect(formatMs(0)).toBe('0:00.00');
    expect(formatMs(1500)).toBe('0:01.50');
    expect(formatMs(65_120)).toBe('1:05.12');
    expect(formatMs(600_000)).toBe('10:00.00');
  });

  it('never shows a negative time', () => {
    expect(formatMs(-500)).toBe('0:00.00');
  });
});

describe('parseMs', () => {
  it('round trips what formatMs writes', () => {
    [0, 400, 1500, 65_120, 600_000].forEach((ms) =>
      expect(parseMs(formatMs(ms))).toBe(ms),
    );
  });

  it('accepts a time without hundredths', () => {
    expect(parseMs('1:05')).toBe(65_000);
  });

  it('accepts a bare number of seconds', () => {
    expect(parseMs('12')).toBe(12_000);
  });

  it('pads a single digit fraction the way it reads', () => {
    expect(parseMs('0:00.4')).toBe(400);
  });

  it('ignores the space around it', () => {
    expect(parseMs('  2:03.25 ')).toBe(123_250);
  });

  it('refuses something that is not a time', () => {
    ['', 'soon', '1:60', '::', '1:2:3:4'].forEach((value) =>
      expect(parseMs(value)).toBeUndefined(),
    );
  });
});

describe('rounding up to the next hundredth', () => {
  // 1999ms used to print 0:01.100, which reads back as 1100ms: the clip jumped
  // most of a second backwards from merely being displayed
  it('carries into the seconds instead of printing three digits', () => {
    expect(formatMs(1999)).toBe('0:02.00');
    expect(formatMs(59_999)).toBe('1:00.00');
    expect(formatMs(995)).toBe('0:01.00');
  });

  it('never widens the hundredths past two digits', () => {
    for (let ms = 0; ms < 5000; ms += 1) {
      expect(formatMs(ms)).toMatch(/^\d+:[0-5]\d\.\d{2}$/);
    }
  });

  it('reads back what it printed', () => {
    for (let ms = 0; ms < 5000; ms += 1) {
      expect(parseMs(formatMs(ms))).toBe(Math.round(ms / 10) * 10);
    }
  });
});

// the comment above the pattern promises a bare number of seconds, and "90"
// used to be refused because bare seconds were capped at 59
it('reads a bare number of seconds past a minute', () => {
  expect(parseMs('90')).toBe(90000);
  expect(parseMs('90.25')).toBe(90250);
  expect(parseMs('1:30')).toBe(90000);
});
