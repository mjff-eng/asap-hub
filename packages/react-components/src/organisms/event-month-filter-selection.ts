export type EventMonthFilterSelection = ReadonlySet<string>;

export const yearKey = (year: number): string => `${year}`;

export const monthKey = (year: number, month: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}`;

const isMonthOfYear = (key: string, year: number) =>
  key.startsWith(`${yearKey(year)}-`);

export const hasSelectionInYear = (
  selection: EventMonthFilterSelection,
  year: number,
): boolean =>
  [...selection].some(
    (key) => key === yearKey(year) || isMonthOfYear(key, year),
  );

export const toggleMonth = (
  selection: EventMonthFilterSelection,
  year: number,
  month: number,
): EventMonthFilterSelection => {
  const key = monthKey(year, month);
  const next = new Set(selection);
  next.delete(yearKey(year));
  if (selection.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
};

export const toggleYear = (
  selection: EventMonthFilterSelection,
  year: number,
): EventMonthFilterSelection => {
  const key = yearKey(year);
  const next = new Set(
    [...selection].filter((item) => !isMonthOfYear(item, year)),
  );
  if (selection.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
};
