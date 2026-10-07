import {
  ClipPlacement,
  clipDurationMs,
  insertClipAt,
  layoutClips,
  moveClip,
  placementAt,
  removeClip,
  sourceTimeAt,
  splitAt,
  timelineDurationMs,
  transitionOverlapMs,
  trimClip,
} from '../clips';
import { Clip, SourceClip, TitleClip } from '../schema';

const placementAtIndex = (
  placements: ClipPlacement[],
  index: number,
): ClipPlacement => {
  const placement = placements[index];
  if (!placement) {
    throw new Error(`expected a placement at index ${index}`);
  }
  return placement;
};

const source = (overrides: Partial<SourceClip> = {}): SourceClip => ({
  kind: 'source',
  id: 'clip-1',
  assetId: 'asset-1',
  inMs: 0,
  outMs: 10000,
  volume: 1,
  ...overrides,
});

const title = (overrides: Partial<TitleClip> = {}): TitleClip => ({
  kind: 'title',
  id: 'title-1',
  durationMs: 3000,
  preset: 'centered',
  text: 'Attendance',
  ...overrides,
});

describe('clipDurationMs', () => {
  it('measures a source clip by its trim', () => {
    expect(clipDurationMs(source({ inMs: 2000, outMs: 5000 }))).toBe(3000);
  });

  it('measures a title clip by its duration', () => {
    expect(clipDurationMs(title({ durationMs: 4000 }))).toBe(4000);
  });

  it('never reports a negative duration', () => {
    expect(clipDurationMs(source({ inMs: 5000, outMs: 1000 }))).toBe(0);
  });
});

describe('transitionOverlapMs', () => {
  const previous = source({ id: 'a', outMs: 10000 });

  it('is zero for the first clip', () => {
    expect(
      transitionOverlapMs(
        source({ transitionIn: { type: 'crossfade', durationMs: 500 } }),
        undefined,
      ),
    ).toBe(0);
  });

  it('is zero for a cut', () => {
    expect(
      transitionOverlapMs(
        source({ transitionIn: { type: 'cut', durationMs: 500 } }),
        previous,
      ),
    ).toBe(0);
  });

  it('uses the requested duration when both clips are long enough', () => {
    expect(
      transitionOverlapMs(
        source({ transitionIn: { type: 'crossfade', durationMs: 500 } }),
        previous,
      ),
    ).toBe(500);
  });

  it('never eats more than half of the shortest neighbour', () => {
    expect(
      transitionOverlapMs(
        source({
          outMs: 600,
          transitionIn: { type: 'crossfade', durationMs: 2000 },
        }),
        previous,
      ),
    ).toBe(300);
  });
});

describe('layoutClips', () => {
  it('places clips back to back without transitions', () => {
    const clips: Clip[] = [
      source({ id: 'a', outMs: 4000 }),
      source({ id: 'b', outMs: 6000 }),
    ];

    expect(
      layoutClips(clips).map(({ startMs, endMs }) => [startMs, endMs]),
    ).toEqual([
      [0, 4000],
      [4000, 10000],
    ]);
  });

  it('overlaps a clip with its predecessor by the transition', () => {
    const clips: Clip[] = [
      source({ id: 'a', outMs: 4000 }),
      source({
        id: 'b',
        outMs: 6000,
        transitionIn: { type: 'crossfade', durationMs: 1000 },
      }),
    ];

    expect(
      layoutClips(clips).map(({ startMs, endMs }) => [startMs, endMs]),
    ).toEqual([
      [0, 4000],
      [3000, 9000],
    ]);
  });

  it('is empty for no clips', () => {
    expect(layoutClips([])).toEqual([]);
  });
});

describe('timelineDurationMs', () => {
  it('is zero without clips', () => {
    expect(timelineDurationMs([])).toBe(0);
  });

  it('is the sum of the clips minus the transition overlaps', () => {
    const clips: Clip[] = [
      source({ id: 'a', outMs: 4000 }),
      source({
        id: 'b',
        outMs: 6000,
        transitionIn: { type: 'crossfade', durationMs: 1000 },
      }),
      title({ id: 'c', durationMs: 2000 }),
    ];

    expect(timelineDurationMs(clips)).toBe(4000 + 6000 - 1000 + 2000);
  });
});

describe('placementAt', () => {
  const placements = layoutClips([
    source({ id: 'a', outMs: 4000 }),
    source({ id: 'b', outMs: 6000 }),
  ]);

  it.each([
    [0, 'a'],
    [3999, 'a'],
    [4000, 'b'],
    [9999, 'b'],
  ])('resolves %sms to clip %s', (tMs, expected) => {
    expect(placementAt(placements, tMs)?.clip.id).toBe(expected);
  });

  it('keeps the last clip at the very end of the timeline', () => {
    expect(placementAt(placements, 10000)?.clip.id).toBe('b');
  });

  it('resolves nothing before the start', () => {
    expect(placementAt(placements, -1)).toBeUndefined();
  });
});

describe('sourceTimeAt', () => {
  it('maps timeline time into the asset, respecting the trim', () => {
    const placements = layoutClips([
      source({ id: 'a', outMs: 4000 }),
      source({ id: 'b', inMs: 30000, outMs: 36000 }),
    ]);

    expect(sourceTimeAt(placementAtIndex(placements, 1), 5000)).toBe(31000);
  });

  it('has no source time for a title card', () => {
    const placements = layoutClips([title()]);

    expect(sourceTimeAt(placementAtIndex(placements, 0), 1000)).toBeUndefined();
  });
});

describe('insertClipAt', () => {
  const clips: Clip[] = [source({ id: 'a' }), source({ id: 'b' })];

  it('inserts in the middle', () => {
    expect(
      insertClipAt(clips, source({ id: 'c' }), 1).map((clip) => clip.id),
    ).toEqual(['a', 'c', 'b']);
  });

  it('clamps an index past the end', () => {
    expect(
      insertClipAt(clips, source({ id: 'c' }), 99).map((clip) => clip.id),
    ).toEqual(['a', 'b', 'c']);
  });
});

describe('removeClip', () => {
  it('removes the clip', () => {
    const clips: Clip[] = [source({ id: 'a' }), source({ id: 'b' })];

    expect(removeClip(clips, 'a').map((clip) => clip.id)).toEqual(['b']);
  });

  it('drops the transition of a clip that becomes first', () => {
    const clips: Clip[] = [
      source({ id: 'a' }),
      source({ id: 'b', transitionIn: { type: 'crossfade', durationMs: 500 } }),
    ];

    expect(removeClip(clips, 'a')[0]?.transitionIn).toBeUndefined();
  });

  it('leaves the list alone for an unknown clip', () => {
    const clips: Clip[] = [source({ id: 'a' })];

    expect(removeClip(clips, 'nope')).toEqual(clips);
  });
});

describe('moveClip', () => {
  const clips: Clip[] = [
    source({ id: 'a' }),
    source({ id: 'b' }),
    source({ id: 'c' }),
  ];

  it('moves a clip later', () => {
    expect(moveClip(clips, 'a', 2).map((clip) => clip.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('moves a clip earlier', () => {
    expect(moveClip(clips, 'c', 0).map((clip) => clip.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('drops the transition of whichever clip ends up first', () => {
    const withTransition: Clip[] = [
      source({ id: 'a' }),
      source({ id: 'b', transitionIn: { type: 'crossfade', durationMs: 500 } }),
    ];

    expect(moveClip(withTransition, 'b', 0)[0]?.transitionIn).toBeUndefined();
  });

  it('leaves the list alone for an unknown clip', () => {
    expect(moveClip(clips, 'nope', 0)).toEqual(clips);
  });
});

describe('trimClip', () => {
  const clips: Clip[] = [source({ id: 'a', inMs: 1000, outMs: 9000 })];

  it('trims within the asset', () => {
    expect(trimClip(clips, 'a', { inMs: 2000, outMs: 8000 }, 10000)).toEqual([
      source({ id: 'a', inMs: 2000, outMs: 8000 }),
    ]);
  });

  it('clamps the out point to the asset duration', () => {
    const [trimmed] = trimClip(clips, 'a', { outMs: 99000 }, 10000);

    expect(trimmed).toMatchObject({ outMs: 10000 });
  });

  it('refuses a trim shorter than the minimum clip length', () => {
    expect(trimClip(clips, 'a', { inMs: 8990, outMs: 9000 }, 10000)).toEqual(
      clips,
    );
  });

  it('ignores title clips', () => {
    const titles: Clip[] = [title({ id: 't' })];

    expect(trimClip(titles, 't', { inMs: 1 }, 10000)).toEqual(titles);
  });
});

describe('splitAt', () => {
  it('splits a source clip into two trims of the same asset', () => {
    const clips: Clip[] = [source({ id: 'a', inMs: 1000, outMs: 9000 })];

    expect(splitAt(clips, 3000, 'new')).toEqual([
      source({ id: 'a', inMs: 1000, outMs: 4000 }),
      source({ id: 'new', inMs: 4000, outMs: 9000 }),
    ]);
  });

  it('splits a title card by duration', () => {
    const clips: Clip[] = [title({ id: 't', durationMs: 4000 })];

    expect(splitAt(clips, 1000, 'new')).toEqual([
      title({ id: 't', durationMs: 1000 }),
      title({ id: 'new', durationMs: 3000 }),
    ]);
  });

  it('splits the clip under the playhead, not the first one', () => {
    const clips: Clip[] = [
      source({ id: 'a', outMs: 4000 }),
      source({ id: 'b', outMs: 6000 }),
    ];

    expect(splitAt(clips, 6000, 'new').map((clip) => clip.id)).toEqual([
      'a',
      'b',
      'new',
    ]);
  });

  it('drops the incoming transition on the right hand piece', () => {
    const clips: Clip[] = [
      source({ id: 'a', outMs: 4000 }),
      source({
        id: 'b',
        outMs: 6000,
        transitionIn: { type: 'crossfade', durationMs: 500 },
      }),
    ];

    const [, left, right] = splitAt(clips, 6000, 'new');

    expect(left?.transitionIn).toEqual({ type: 'crossfade', durationMs: 500 });
    expect(right?.transitionIn).toBeUndefined();
  });

  it('refuses a split that would leave a piece below the minimum length', () => {
    const clips: Clip[] = [source({ id: 'a', outMs: 9000 })];

    expect(splitAt(clips, 10, 'new')).toEqual(clips);
  });

  it('refuses a split outside the timeline', () => {
    const clips: Clip[] = [source({ id: 'a', outMs: 9000 })];

    expect(splitAt(clips, -5, 'new')).toEqual(clips);
  });
});

describe('splitting at a fractional time', () => {
  // the editor's playhead accumulates fractional timestamps during playback,
  // and msSchema is an integer, so a fractional split makes the whole document
  // unsaveable rather than just imprecise
  it('lands both pieces on whole milliseconds', () => {
    const clips: Clip[] = [
      {
        kind: 'source',
        id: 'c1',
        assetId: 'a1',
        inMs: 0,
        outMs: 10_000,
        volume: 1,
      },
    ];

    const split = splitAt(clips, 5123.400000000001, 'c2');

    expect(split).toHaveLength(2);
    const times = split.flatMap((clip) =>
      clip.kind === 'source' ? [clip.inMs, clip.outMs] : [],
    );

    expect(times.filter((ms) => !Number.isInteger(ms))).toEqual([]);
  });
});

// the bound used to pass through unrounded, so dragging the out point to the
// end of an asset with a fractional probed duration made every later save fail
it('rounds the asset bound as well as the request', () => {
  const clips = trimClip(
    [
      {
        kind: 'source',
        id: 'clip-1',
        assetId: 'asset-1',
        inMs: 0,
        outMs: 5000,
        volume: 1,
      },
    ],
    'clip-1',
    { outMs: 9999 },
    8123.456,
  );

  expect(clips[0]).toMatchObject({ outMs: 8123 });
  expect(Number.isInteger((clips[0] as { outMs: number }).outMs)).toBe(true);
});
