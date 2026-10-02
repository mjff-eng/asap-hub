import {
  hasSelectionInYear,
  monthKey,
  toggleMonth,
  toggleYear,
  yearKey,
} from '../event-month-filter-selection';

describe('keys', () => {
  it('formats a year key', () => {
    expect(yearKey(2026)).toBe('2026');
  });

  it('formats a month key with a 1-based, zero-padded month', () => {
    expect(monthKey(2026, 0)).toBe('2026-01');
    expect(monthKey(2026, 11)).toBe('2026-12');
  });
});

describe('hasSelectionInYear', () => {
  it('is true when a month of the year is selected', () => {
    expect(hasSelectionInYear(new Set(['2026-04']), 2026)).toBe(true);
  });

  it('is true when the whole year is selected', () => {
    expect(hasSelectionInYear(new Set(['2026']), 2026)).toBe(true);
  });

  it('is false when only other years are selected', () => {
    expect(hasSelectionInYear(new Set(['2025', '2025-01']), 2026)).toBe(false);
  });
});

describe('toggleMonth', () => {
  it('adds a month that is not selected', () => {
    expect(toggleMonth(new Set(['2026-01']), 2026, 3)).toEqual(
      new Set(['2026-01', '2026-04']),
    );
  });

  it('removes a month that is selected', () => {
    expect(toggleMonth(new Set(['2026-01', '2026-04']), 2026, 0)).toEqual(
      new Set(['2026-04']),
    );
  });

  it('clears the whole-year selection of the same year only', () => {
    expect(toggleMonth(new Set(['2026', '2025']), 2026, 0)).toEqual(
      new Set(['2025', '2026-01']),
    );
  });

  it('does not mutate the given selection', () => {
    const selection = new Set(['2026-01']);
    toggleMonth(selection, 2026, 3);
    expect(selection).toEqual(new Set(['2026-01']));
  });
});

describe('toggleYear', () => {
  it('selects the year and clears its months only', () => {
    expect(
      toggleYear(new Set(['2026-01', '2026-04', '2025-03']), 2026),
    ).toEqual(new Set(['2025-03', '2026']));
  });

  it('deselects a selected year', () => {
    expect(toggleYear(new Set(['2026', '2025']), 2026)).toEqual(
      new Set(['2025']),
    );
  });
});
