import {
  collidesWith,
  endMsOf,
  insertAt,
  snapFirstToZero,
  sortRows,
  toChapters,
  toRows,
  toSavableChapters,
} from '../chapters';

const rowsOf = (...starts: number[]) =>
  toRows(starts.map((startMs) => ({ startMs, title: `at ${startMs}` })));

describe('insertAt', () => {
  it('snaps a lone chapter to the start of the video', () => {
    const { rows } = insertAt([], 120000);
    expect(toChapters(rows)).toEqual([{ startMs: 0, title: '' }]);
  });

  it('inserts a later chapter in sorted position', () => {
    const { rows } = insertAt(rowsOf(0, 300000), 120000);
    expect(rows.map(({ startMs }) => startMs)).toEqual([0, 120000, 300000]);
  });

  it('returns the key of the row it created so it can be focused', () => {
    const existing = rowsOf(0);
    const { rows, key } = insertAt(existing, 90000);
    expect(rows.find((row) => row.key === key)?.startMs).toEqual(90000);
  });

  it('refuses a start a chapter already has and keeps that chapter', () => {
    const existing = rowsOf(0, 120000);
    const { rows, key, taken } = insertAt(existing, 120000);
    expect(taken).toBe(true);
    expect(rows).toEqual(existing);
    expect(rows.find((row) => row.key === key)?.title).toEqual('at 120000');
  });

  it('refuses the start the rounded playhead lands on', () => {
    const { rows, taken } = insertAt(rowsOf(0, 120000), 119999.7);
    expect(taken).toBe(true);
    expect(toChapters(rows)).toEqual([
      { startMs: 0, title: 'at 0' },
      { startMs: 120000, title: 'at 120000' },
    ]);
  });

  it('rounds and clamps the playhead position', () => {
    const { rows } = insertAt(rowsOf(0), 90000.6);
    expect(rows[1]?.startMs).toEqual(90001);
    expect(insertAt(rowsOf(0), -50).rows[0]?.startMs).toEqual(0);
  });
});

describe('snapFirstToZero', () => {
  it('moves the earliest chapter back to zero', () => {
    expect(snapFirstToZero(rowsOf(30000, 90000)).map((r) => r.startMs)).toEqual(
      [0, 90000],
    );
  });

  it('leaves an already anchored list alone', () => {
    expect(snapFirstToZero(rowsOf(0, 90000)).map((r) => r.startMs)).toEqual([
      0, 90000,
    ]);
  });

  it('handles an empty list', () => {
    expect(snapFirstToZero([])).toEqual([]);
  });
});

describe('sortRows', () => {
  it('orders by start time without mutating the input', () => {
    const rows = rowsOf(90000, 0, 30000);
    expect(sortRows(rows).map((r) => r.startMs)).toEqual([0, 30000, 90000]);
    expect(rows.map((r) => r.startMs)).toEqual([90000, 0, 30000]);
  });
});

describe('toSavableChapters', () => {
  it('drops a chapter that has not been named yet', () => {
    const { rows } = insertAt(rowsOf(0), 90000);
    expect(toChapters(rows)).toHaveLength(2);
    expect(toSavableChapters(rows)).toEqual([{ startMs: 0, title: 'at 0' }]);
  });

  it('drops a title that is only whitespace', () => {
    const rows = toRows([{ startMs: 0, title: '   ' }]);
    expect(toSavableChapters(rows)).toEqual([]);
  });

  it('keeps every named chapter', () => {
    expect(toSavableChapters(rowsOf(0, 90000))).toEqual([
      { startMs: 0, title: 'at 0' },
      { startMs: 90000, title: 'at 90000' },
    ]);
  });

  // the rows only reorder once the timecode being typed loses focus
  it('sends them in ascending order however the rows sit', () => {
    expect(toSavableChapters(rowsOf(90000, 0, 30000))).toEqual([
      { startMs: 0, title: 'at 0' },
      { startMs: 30000, title: 'at 30000' },
      { startMs: 90000, title: 'at 90000' },
    ]);
  });

  // a list saved before the fields refused collisions can still hold one, and
  // the API takes one chapter per start
  it('keeps the first of two chapters on the same start', () => {
    const rows = toRows([
      { startMs: 0, title: 'Intro' },
      { startMs: 90000, title: 'Middle' },
      { startMs: 90000, title: 'Twin' },
    ]);
    expect(toSavableChapters(rows)).toEqual([
      { startMs: 0, title: 'Intro' },
      { startMs: 90000, title: 'Middle' },
    ]);
  });
});

describe('collidesWith', () => {
  it('finds a start another row already has', () => {
    const rows = rowsOf(0, 90000);
    expect(collidesWith(rows, rows[0]!.key, 90000)).toBe(true);
  });

  it('lets a row keep its own start', () => {
    const rows = rowsOf(0, 90000);
    expect(collidesWith(rows, rows[1]!.key, 90000)).toBe(false);
  });
});

describe('endMsOf', () => {
  it('uses the next chapter start as the end', () => {
    expect(endMsOf(rowsOf(0, 90000), 0, 600000)).toEqual(90000);
  });

  it('uses the video duration for the last chapter', () => {
    expect(endMsOf(rowsOf(0, 90000), 1, 600000)).toEqual(600000);
  });
});
