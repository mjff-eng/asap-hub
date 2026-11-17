import type { Chapter } from '../api/types';

export type ChapterRow = Chapter & { key: string };

// why a row's field cannot be taken, keyed by the row: the message is the state,
// so a field that refuses a value has to say which reason it refused it for
export type InvalidFields = Record<string, string | undefined>;

let nextKey = 0;

export const makeRow = (chapter: Chapter): ChapterRow => {
  nextKey += 1;
  return { ...chapter, key: `chapter-${nextKey}` };
};

export const toRows = (chapters: Chapter[]): ChapterRow[] =>
  chapters.map(makeRow);

export const toChapters = (rows: ChapterRow[]): Chapter[] =>
  rows.map(({ startMs, title }) => ({ startMs, title }));

export const sortRows = (rows: ChapterRow[]): ChapterRow[] =>
  [...rows].sort((a, b) => a.startMs - b.startMs);

// a freshly marked chapter has no title yet, and the API rejects a blank one,
// so it stays local until the user names it. The API also takes the list in
// ascending order with one chapter per start: rows can sit out of order while a
// timecode is being typed, and a list saved before the fields refused a
// collision can still arrive holding one.
export const toSavableChapters = (rows: ChapterRow[]): Chapter[] =>
  toChapters(sortRows(rows))
    .filter((chapter) => chapter.title.trim() !== '')
    .filter(
      (chapter, index, kept) => chapter.startMs !== kept[index - 1]?.startMs,
    );

// two chapters on the same millisecond leave one of them nothing to play, so a
// field refuses the value rather than quietly taking the other chapter's row
export const collidesWith = (
  rows: ChapterRow[],
  key: string,
  startMs: number,
): boolean => rows.some((row) => row.key !== key && row.startMs === startMs);

// The first chapter always covers the start of the video, otherwise playback
// before it would sit outside every chapter.
export const snapFirstToZero = (rows: ChapterRow[]): ChapterRow[] => {
  const sorted = sortRows(rows);
  const [first, ...rest] = sorted;
  if (!first || first.startMs === 0) return sorted;
  return [{ ...first, startMs: 0 }, ...rest];
};

// a start already taken is refused rather than deduped, like the timecode
// field: dropping the chapter sitting there would take its title with it. `key`
// is then the row that already holds the start, so the caller can point at it.
export const insertAt = (
  rows: ChapterRow[],
  startMs: number,
  title = '',
): { rows: ChapterRow[]; key: string; taken: boolean } => {
  const rounded = Math.max(0, Math.round(startMs));
  const existing = rows.find((row) => row.startMs === rounded);
  if (existing) return { rows, key: existing.key, taken: true };
  const row = makeRow({ startMs: rounded, title });
  return {
    rows: snapFirstToZero([...rows, row]),
    key: row.key,
    taken: false,
  };
};

export const endMsOf = (
  rows: ChapterRow[],
  index: number,
  durationMs: number,
): number => rows[index + 1]?.startMs ?? durationMs;
