import { keepClips } from '../selection';
import { layoutClips } from '../clips';
import { createEmptyTimeline, parseTimeline } from '../document';
import { SourceClip, Timeline } from '../schema';

const clip = (
  id: string,
  outMs: number,
  overrides: Partial<SourceClip> = {},
): SourceClip => ({
  kind: 'source',
  id,
  assetId: `asset-${id}`,
  inMs: 0,
  outMs,
  volume: 1,
  ...overrides,
});

// a 4s, a 6s and a 5s clip: b crossfades in over a for one second, so the
// programme runs a [0,4000) b [3000,9000) c [9000,14000)
const three = (): Timeline => ({
  ...createEmptyTimeline(),
  clips: [
    clip('a', 4000),
    clip('b', 6000, {
      transitionIn: { type: 'crossfade', durationMs: 1000 },
    }),
    clip('c', 5000),
  ],
});

describe('the clips of the cut', () => {
  it('keeps the picked clips in timeline order, whatever order they were picked in', () => {
    const cut = keepClips(three(), ['c', 'a']);

    expect(cut.clips.map((each) => each.id)).toEqual(['a', 'c']);
    expect(() => parseTimeline(cut)).not.toThrow();
  });

  it('keeps a crossfade between clips that were already neighbours', () => {
    const cut = keepClips(three(), ['a', 'b']);

    expect(cut.clips[1]?.transitionIn).toEqual({
      type: 'crossfade',
      durationMs: 1000,
    });
  });

  // a blend with a clip that is not in the cut has nothing to blend with
  it('drops a crossfade whose partner was not picked', () => {
    const cut = keepClips(three(), ['b', 'c']);

    expect(cut.clips[0]?.transitionIn).toBeUndefined();
  });
});

describe('what the clips carry', () => {
  const withTracks = (): Timeline => ({
    ...three(),
    zooms: [
      {
        id: 'zoom-b',
        clipId: 'b',
        startMs: 500,
        rampInMs: 200,
        holdMs: 800,
        rampOutMs: 200,
        focus: { x: 0.5, y: 0.5 },
        scale: 2,
        easing: 'easeInOut',
      },
    ],
    cursor: [
      {
        clipId: 'c',
        offsetMs: 0,
        path: [{ tMs: 100, x: 0.5, y: 0.5 }],
        effects: [
          {
            id: 'ripple-1',
            tMs: 700,
            type: 'ripple',
            point: { x: 0.2, y: 0.3 },
            origin: 'derived',
          },
        ],
      },
    ],
    chapters: [
      { id: 'ch-a', clipId: 'a', offsetMs: 0, title: 'Intro' },
      { id: 'ch-b', clipId: 'b', offsetMs: 100, title: 'Middle' },
    ],
  });

  it('travels the zooms, clicks and chapters with their clips', () => {
    const cut = keepClips(withTracks(), ['b', 'c']);

    expect(cut.zooms.map((each) => each.id)).toEqual(['zoom-b']);
    expect(cut.cursor.map((each) => each.clipId)).toEqual(['c']);
    expect(cut.chapters.map((each) => each.id)).toEqual(['ch-b']);
  });

  it('leaves behind everything anchored to a dropped clip', () => {
    const cut = keepClips(withTracks(), ['a']);

    expect(cut.zooms).toEqual([]);
    expect(cut.cursor).toEqual([]);
    expect(cut.chapters.map((each) => each.id)).toEqual(['ch-a']);
  });
});

describe('a voice over cut to the picked spans', () => {
  const take = {
    id: 'take-1',
    assetId: 'voice-1',
    startMs: 2000,
    inMs: 0,
    outMs: 10000,
    volume: 1,
  };

  it('stays whole over a contiguous picked pair, blend included', () => {
    const cut = keepClips({ ...three(), narration: [take] }, ['a', 'b']);

    // the picked pair lays out exactly as the original, so the take is
    // untouched apart from its tail past the cut's end
    expect(cut.narration).toEqual([
      { ...take, startMs: 2000, inMs: 0, outMs: 7000 },
    ]);
    expect(() => parseTimeline(cut)).not.toThrow();
  });

  // picking a and c drops b, and with it the crossfade: a plays its whole
  // four seconds, so only b's own stretch [4000, 9000) of voice is skipped
  it('skips the audio that played over a dropped clip', () => {
    const cut = keepClips({ ...three(), narration: [take] }, ['a', 'c']);

    expect(cut.narration).toEqual([
      { ...take, id: 'take-1-1', startMs: 2000, inMs: 0, outMs: 2000 },
      { ...take, id: 'take-1-2', startMs: 4000, inMs: 7000, outMs: 10000 },
    ]);
    expect(() => parseTimeline(cut)).not.toThrow();
  });

  it('drops a take that only played over dropped clips', () => {
    const nowhere = { ...take, startMs: 4000, outMs: 4000 + 1000 };
    const cut = keepClips({ ...three(), narration: [nowhere] }, ['a']);

    expect(cut.narration).toEqual([]);
  });
});

describe('a banner cut to the picked spans', () => {
  const banner = {
    id: 'banner-1',
    startMs: 3500,
    durationMs: 7000,
    preset: 'lowerThird' as const,
    text: 'Hello',
    position: 'bottom' as const,
    animation: 'fade' as const,
  };

  // the banner starts at 3500, inside what was the blend window; with b
  // dropped that moment belongs to a's own tail, so the piece survives there
  it('lands the surviving stretches in the new time', () => {
    const cut = keepClips({ ...three(), banners: [banner] }, ['a', 'c']);

    expect(cut.banners).toEqual([
      { ...banner, id: 'banner-1-1', startMs: 3500, durationMs: 500 },
      { ...banner, id: 'banner-1-2', startMs: 4000, durationMs: 1500 },
    ]);
  });

  it('splits across a gap in the pick', () => {
    const early = { ...banner, startMs: 2500, durationMs: 8000 };
    const cut = keepClips({ ...three(), banners: [early] }, ['a', 'c']);

    expect(cut.banners).toEqual([
      { ...early, id: 'banner-1-1', startMs: 2500, durationMs: 1500 },
      { ...early, id: 'banner-1-2', startMs: 4000, durationMs: 1500 },
    ]);
  });

  it('keeps its own id when nothing cut it', () => {
    const early = { ...banner, startMs: 500, durationMs: 2000 };
    const cut = keepClips({ ...three(), banners: [early] }, ['a']);

    expect(cut.banners).toEqual([early]);
  });
});

it('maps the crossfade window to the incoming clip alone, never twice', () => {
  // a take entirely inside the a/b overlap [3000, 4000)
  const inTheBlend = {
    id: 'take-x',
    assetId: 'voice-1',
    startMs: 3200,
    inMs: 0,
    outMs: 600,
    volume: 1,
  };
  const cut = keepClips({ ...three(), narration: [inTheBlend] }, [
    'a',
    'b',
    'c',
  ]);

  expect(cut.narration).toEqual([inTheBlend]);
  // picking everything reproduces the original layout exactly
  expect(layoutClips(cut.clips)).toEqual(layoutClips(three().clips));
});

// a dropped neighbour's crossfade no longer exists in the cut: the kept clip
// plays its whole length, so its tail keeps the banners and voice over that
// sat over the blend window
describe('the tail a dropped crossfade used to claim', () => {
  const doc = (): Timeline => ({
    ...three(),
    banners: [
      {
        id: 'tail',
        startMs: 3200,
        durationMs: 600,
        preset: 'lowerThird',
        text: 'Over the blend',
        position: 'bottom',
        animation: 'fade',
      },
    ],
    narration: [
      {
        id: 'nar',
        assetId: 'asset-nar',
        startMs: 2500,
        inMs: 0,
        outMs: 1500,
        volume: 1,
      },
    ],
  });

  it("keeps a banner over the kept clip's whole length", () => {
    const cut = keepClips(doc(), ['a']);

    expect(cut.banners).toEqual([
      expect.objectContaining({ id: 'tail', startMs: 3200, durationMs: 600 }),
    ]);
  });

  it('keeps the voice over to the end of the take', () => {
    const cut = keepClips(doc(), ['a']);

    expect(cut.narration).toEqual([
      expect.objectContaining({
        id: 'nar',
        startMs: 2500,
        inMs: 0,
        outMs: 1500,
      }),
    ]);
  });
});

describe('piece ids that would collide', () => {
  it('renames a minted duplicate instead of poisoning the cut', () => {
    const stem = 'y'.repeat(60);
    const banner = (id: string) => ({
      id,
      startMs: 0,
      durationMs: 14000,
      preset: 'lowerThird' as const,
      text: 'Spans everything',
      position: 'bottom' as const,
      animation: 'fade' as const,
    });
    const cut = keepClips(
      { ...three(), banners: [banner(`${stem}AAAA`), banner(`${stem}BBBB`)] },
      ['a', 'c'],
    );

    const ids = cut.banners.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length <= 64)).toBe(true);
    expect(() => parseTimeline(JSON.parse(JSON.stringify(cut)))).not.toThrow();
  });
});
