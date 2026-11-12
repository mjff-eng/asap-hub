import {
  chapterSectionIndexes,
  resolveChapters,
  sectionSpans,
  videoChapters,
} from '../chapters';
import { createEmptyTimeline } from '../document';
import { Timeline } from '../schema';

const source = (id: string, durationMs: number) =>
  ({
    kind: 'source' as const,
    id,
    assetId: `asset-${id}`,
    inMs: 0,
    outMs: durationMs,
    volume: 1,
  }) as const;

const title = (id: string, text: string, durationMs = 3000) =>
  ({
    kind: 'title' as const,
    id,
    durationMs,
    preset: 'centered' as const,
    text,
  }) as const;

const timeline = (overrides: Partial<Timeline> = {}): Timeline => ({
  ...createEmptyTimeline(),
  ...overrides,
});

describe('resolveChapters', () => {
  it('has none for an empty timeline', () => {
    expect(resolveChapters(timeline())).toEqual([]);
  });

  it('makes a chapter of every title card, at its place in the program', () => {
    expect(
      resolveChapters(
        timeline({
          clips: [
            source('a', 4000),
            title('t1', 'Attendance'),
            source('b', 5000),
            title('t2', 'Speakers'),
          ],
        }),
      ),
    ).toEqual([
      { id: 't1', kind: 'title', startMs: 4000, title: 'Attendance' },
      { id: 't2', kind: 'title', startMs: 12000, title: 'Speakers' },
    ]);
  });

  it('resolves a marker against the clip it is anchored to', () => {
    expect(
      resolveChapters(
        timeline({
          clips: [source('a', 4000), source('b', 5000)],
          chapters: [
            { id: 'c1', clipId: 'b', offsetMs: 1500, title: 'The new page' },
          ],
        }),
      ),
    ).toEqual([
      { id: 'c1', kind: 'marker', startMs: 5500, title: 'The new page' },
    ]);
  });

  it('sorts markers and title cards together', () => {
    const resolved = resolveChapters(
      timeline({
        clips: [source('a', 6000), title('t1', 'Speakers')],
        chapters: [{ id: 'c1', clipId: 'a', offsetMs: 2000, title: 'Intro' }],
      }),
    );

    expect(resolved.map(({ title: name }) => name)).toEqual([
      'Intro',
      'Speakers',
    ]);
  });

  it('ignores a marker whose clip has gone', () => {
    expect(
      resolveChapters(
        timeline({
          clips: [source('a', 4000)],
          chapters: [{ id: 'c1', clipId: 'ghost', offsetMs: 0, title: 'Gone' }],
        }),
      ),
    ).toEqual([]);
  });

  it('keeps an untitled marker when the editor asks for it', () => {
    const resolved = resolveChapters(
      timeline({
        clips: [source('a', 4000)],
        chapters: [{ id: 'c1', clipId: 'a', offsetMs: 0, title: '' }],
      }),
      { forEditing: true },
    );

    expect(resolved).toEqual([
      { id: 'c1', kind: 'marker', startMs: 0, title: '' },
    ]);
  });

  it('ignores an untitled marker or title card', () => {
    expect(
      resolveChapters(
        timeline({
          clips: [source('a', 4000), title('t1', '   ')],
          chapters: [{ id: 'c1', clipId: 'a', offsetMs: 0, title: '  ' }],
        }),
      ),
    ).toEqual([]);
  });

  // nothing between here and DynamoDB trims the name the container writes
  it('trims the marker name the render carries', () => {
    const padded = timeline({
      clips: [source('a', 4000)],
      chapters: [{ id: 'c1', clipId: 'a', offsetMs: 0, title: '  Intro  ' }],
    });

    expect(resolveChapters(padded)).toEqual([
      { id: 'c1', kind: 'marker', startMs: 0, title: 'Intro' },
    ]);
    expect(videoChapters(padded)).toEqual([{ startMs: 0, title: 'Intro' }]);
  });

  it('leaves the stored marker name alone for the editor', () => {
    expect(
      resolveChapters(
        timeline({
          clips: [source('a', 4000)],
          chapters: [{ id: 'c1', clipId: 'a', offsetMs: 0, title: 'Intro ' }],
        }),
        { forEditing: true },
      ),
    ).toEqual([{ id: 'c1', kind: 'marker', startMs: 0, title: 'Intro ' }]);
  });

  it('never emits two chapters on the same frame', () => {
    expect(
      resolveChapters(
        timeline({
          clips: [source('a', 4000), title('t1', 'Attendance')],
          chapters: [
            { id: 'c1', clipId: 't1', offsetMs: 0, title: 'Also attendance' },
          ],
        }),
      ),
    ).toHaveLength(1);
  });
});

describe('two markers on the same frame', () => {
  const doubled = (): Timeline =>
    timeline({
      clips: [source('a', 8000)],
      chapters: [
        { id: 'm1', clipId: 'a', offsetMs: 2000, title: 'First' },
        { id: 'm2', clipId: 'a', offsetMs: 2000, title: 'Second' },
      ],
    });

  // the player would get an empty segment, so the render keeps only one
  it('collapses to one for the render', () => {
    expect(resolveChapters(doubled())).toHaveLength(1);
  });

  // ...but hiding the spare in the editor left no way to delete it, which read
  // as "the chapter I added never saved"
  it('shows both to the editor so the spare can be removed', () => {
    expect(
      resolveChapters(doubled(), { forEditing: true }).map(
        (chapter) => chapter.title,
      ),
    ).toEqual(['First', 'Second']);
  });
});

describe('sectionSpans', () => {
  it('cuts one span per chapter, meeting at the starts', () => {
    expect(
      sectionSpans(
        [{ startMs: 0 }, { startMs: 20950 }, { startMs: 40000 }],
        53700,
      ),
    ).toEqual([
      { startMs: 0, endMs: 20950 },
      { startMs: 20950, endMs: 40000 },
      { startMs: 40000, endMs: 53700 },
    ]);
  });

  // the earlier of the two has nothing between it and the next start
  it('cuts nothing for a chapter sharing its start with the next', () => {
    expect(
      sectionSpans(
        [{ startMs: 0 }, { startMs: 20950 }, { startMs: 20950 }],
        53700,
      ),
    ).toEqual([
      { startMs: 0, endMs: 20950 },
      { startMs: 20950, endMs: 53700 },
    ]);
  });

  it('cuts nothing for a chapter starting at or past the end', () => {
    expect(sectionSpans([{ startMs: 0 }, { startMs: 60000 }], 53700)).toEqual([
      { startMs: 0, endMs: 53700 },
    ]);
    expect(sectionSpans([{ startMs: 0 }, { startMs: 53700 }], 53700)).toEqual([
      { startMs: 0, endMs: 53700 },
    ]);
  });
});

describe('chapterSectionIndexes', () => {
  it('numbers each chapter the file its own span was cut into', () => {
    expect(
      chapterSectionIndexes(
        [{ startMs: 0 }, { startMs: 20950 }, { startMs: 40000 }],
        53700,
        3,
      ),
    ).toEqual([0, 1, 2]);
  });

  // the cut skipped the duplicate, so the chapter after it is file 1, not file 2
  it('shifts the files down past a chapter that was never cut', () => {
    expect(
      chapterSectionIndexes(
        [{ startMs: 0 }, { startMs: 20950 }, { startMs: 20950 }],
        53700,
        2,
      ),
    ).toEqual([0, undefined, 1]);

    expect(
      chapterSectionIndexes(
        [{ startMs: 0 }, { startMs: 60000 }, { startMs: 70000 }],
        53700,
        1,
      ),
    ).toEqual([0, undefined, undefined]);
  });

  // a render that gave up partway through published a prefix of the spans
  it('gives no file to a span the render never uploaded', () => {
    expect(
      chapterSectionIndexes([{ startMs: 0 }, { startMs: 20950 }], 53700, 1),
    ).toEqual([0, undefined]);
    expect(
      chapterSectionIndexes([{ startMs: 0 }, { startMs: 20950 }], 53700, 0),
    ).toEqual([undefined, undefined]);
  });
});
