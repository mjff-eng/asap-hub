import {
  createEmptyTimeline,
  CursorEffect,
  limits,
  parseTimeline,
  Timeline,
  timelineSchema,
} from '@asap-hub/demo-timeline';
import { TimelineAction, timelineReducer } from '../timelineReducer';

const withClips = (): Timeline => {
  const empty = createEmptyTimeline();
  return timelineReducer(
    timelineReducer(empty, {
      type: 'addClip',
      assetId: 'asset-1',
      durationMs: 5000,
      clipId: 'clip-1',
    }),
    {
      type: 'addClip',
      assetId: 'asset-2',
      durationMs: 4000,
      clipId: 'clip-2',
    },
  );
};

describe('addClip', () => {
  it('appends a source clip spanning the whole asset', () => {
    const timeline = timelineReducer(createEmptyTimeline(), {
      type: 'addClip',
      assetId: 'asset-1',
      durationMs: 5000,
      clipId: 'clip-1',
    });

    expect(timeline.clips).toEqual([
      {
        kind: 'source',
        id: 'clip-1',
        assetId: 'asset-1',
        inMs: 0,
        outMs: 5000,
        volume: 1,
      },
    ]);
  });

  it('never makes a clip too short for the render, whatever the ingest reports', () => {
    const timeline = timelineReducer(createEmptyTimeline(), {
      type: 'addClip',
      assetId: 'asset-1',
      durationMs: 0,
      clipId: 'clip-1',
    });

    expect(timeline.clips[0]).toMatchObject({ inMs: 0, outMs: 100 });
    expect(() => parseTimeline(timeline)).not.toThrow();
  });

  it('inserts at a given index', () => {
    const timeline = timelineReducer(withClips(), {
      type: 'addClip',
      assetId: 'asset-3',
      durationMs: 1000,
      clipId: 'clip-3',
      index: 1,
    });

    expect(timeline.clips.map((clip) => clip.id)).toEqual([
      'clip-1',
      'clip-3',
      'clip-2',
    ]);
  });

  // the take's start is the video's t=0, and it has to outlive the recorder:
  // the capture is often applied in a later session, from the saved document
  it('writes the take start on the clip so a later capture can line up', () => {
    const timeline = timelineReducer(createEmptyTimeline(), {
      type: 'addClip',
      assetId: 'asset-1',
      durationMs: 5000,
      clipId: 'clip-1',
      recordedAtEpochMs: 1_700_000_000_000,
    });

    expect(timeline.cursor).toEqual([
      {
        clipId: 'clip-1',
        offsetMs: 0,
        path: [],
        effects: [],
        recordedAtEpochMs: 1_700_000_000_000,
      },
    ]);
    expect(() => parseTimeline(timeline)).not.toThrow();
  });

  // wall clock runs on through a pause the footage never shows, so the spans
  // have to reach the document a capture is read against months later
  it('writes the spans the take stood paused for on the clip', () => {
    const timeline = timelineReducer(createEmptyTimeline(), {
      type: 'addClip',
      assetId: 'asset-1',
      durationMs: 60_000,
      clipId: 'clip-1',
      recordedAtEpochMs: 1_700_000_000_000,
      recordedDurationMs: 60_000,
      recordedPauses: [
        { startMs: 1_700_000_030_000, endMs: 1_700_000_050_000 },
      ],
    });

    expect(timeline.cursor[0]).toEqual({
      clipId: 'clip-1',
      offsetMs: 0,
      path: [],
      effects: [],
      recordedAtEpochMs: 1_700_000_000_000,
      recordedDurationMs: 60_000,
      recordedPauses: [
        { startMs: 1_700_000_030_000, endMs: 1_700_000_050_000 },
      ],
    });
    expect(() => parseTimeline(timeline)).not.toThrow();
  });

  it('rounds a pause span to the whole milliseconds the document allows', () => {
    const timeline = timelineReducer(createEmptyTimeline(), {
      type: 'addClip',
      assetId: 'asset-1',
      durationMs: 60_000,
      clipId: 'clip-1',
      recordedAtEpochMs: 1_700_000_000_000,
      recordedPauses: [
        { startMs: 1_700_000_030_000.4, endMs: 1_700_000_050_000.6 },
      ],
    });

    expect(timeline.cursor[0]?.recordedPauses).toEqual([
      { startMs: 1_700_000_030_000, endMs: 1_700_000_050_001 },
    ]);
    expect(() => parseTimeline(timeline)).not.toThrow();
  });

  it('leaves a take that never paused without any spans', () => {
    expect(
      timelineReducer(createEmptyTimeline(), {
        type: 'addClip',
        assetId: 'asset-1',
        durationMs: 5000,
        clipId: 'clip-1',
        recordedAtEpochMs: 1_700_000_000_000,
        recordedPauses: [],
      }).cursor[0],
    ).not.toHaveProperty('recordedPauses');
  });

  // one capture session spans every take before the apply, so the surface has
  // to be kept per take: the newest take's is the wrong one for all the others
  it('writes what the take was a recording of on the clip', () => {
    const timeline = timelineReducer(createEmptyTimeline(), {
      type: 'addClip',
      assetId: 'asset-1',
      durationMs: 5000,
      clipId: 'clip-1',
      recordedAtEpochMs: 1_700_000_000_000,
      surface: 'monitor',
    });

    expect(timeline.cursor[0]).toEqual({
      clipId: 'clip-1',
      offsetMs: 0,
      path: [],
      effects: [],
      recordedAtEpochMs: 1_700_000_000_000,
      surface: 'monitor',
    });
    expect(() => parseTimeline(timeline)).not.toThrow();
  });

  it('leaves a take the browser never named a surface for without one', () => {
    expect(
      timelineReducer(createEmptyTimeline(), {
        type: 'addClip',
        assetId: 'asset-1',
        durationMs: 5000,
        clipId: 'clip-1',
        recordedAtEpochMs: 1_700_000_000_000,
      }).cursor[0],
    ).not.toHaveProperty('surface');
  });

  it('leaves an imported clip with no take start at all', () => {
    expect(
      timelineReducer(createEmptyTimeline(), {
        type: 'addClip',
        assetId: 'asset-1',
        durationMs: 5000,
        clipId: 'clip-1',
      }).cursor,
    ).toEqual([]);
  });
});

describe('removeClip', () => {
  it('drops the clip', () => {
    const timeline = timelineReducer(withClips(), {
      type: 'removeClip',
      clipId: 'clip-1',
    });

    expect(timeline.clips.map((clip) => clip.id)).toEqual(['clip-2']);
  });

  it('takes the clip-anchored tracks with it', () => {
    const base = withClips();
    const withEffects: Timeline = {
      ...base,
      zooms: [
        {
          id: 'zoom-1',
          clipId: 'clip-1',
          startMs: 0,
          rampInMs: 300,
          holdMs: 500,
          rampOutMs: 300,
          focus: { x: 0.5, y: 0.5 },
          scale: 2,
          easing: 'easeInOut',
        },
      ],
      chapters: [
        { id: 'chapter-1', clipId: 'clip-1', offsetMs: 0, title: 'Intro' },
        { id: 'chapter-2', clipId: 'clip-2', offsetMs: 0, title: 'Next' },
      ],
      cursor: [{ clipId: 'clip-1', offsetMs: 0, path: [], effects: [] }],
    };

    const timeline = timelineReducer(withEffects, {
      type: 'removeClip',
      clipId: 'clip-1',
    });

    expect(timeline.zooms).toEqual([]);
    expect(timeline.cursor).toEqual([]);
    expect(timeline.chapters.map((chapter) => chapter.id)).toEqual([
      'chapter-2',
    ]);
  });
});

describe('moveClip', () => {
  it('reorders the clips', () => {
    const timeline = timelineReducer(withClips(), {
      type: 'moveClip',
      clipId: 'clip-2',
      toIndex: 0,
    });

    expect(timeline.clips.map((clip) => clip.id)).toEqual(['clip-2', 'clip-1']);
  });
});

describe('trimClip', () => {
  it('trims within the asset', () => {
    const timeline = timelineReducer(withClips(), {
      type: 'trimClip',
      clipId: 'clip-1',
      inMs: 1000,
      outMs: 4000,
      assetDurationMs: 5000,
    });

    expect(timeline.clips[0]).toMatchObject({ inMs: 1000, outMs: 4000 });
  });

  it('refuses to trim past the asset', () => {
    const timeline = timelineReducer(withClips(), {
      type: 'trimClip',
      clipId: 'clip-1',
      outMs: 9000,
      assetDurationMs: 5000,
    });

    expect(timeline.clips[0]).toMatchObject({ outMs: 5000 });
  });
});

describe('trimClip carrying the clip-local tracks', () => {
  const zoomAt = (id: string, clipId: string, startMs: number) => ({
    id,
    clipId,
    startMs,
    rampInMs: 100,
    holdMs: 400,
    rampOutMs: 100,
    focus: { x: 0.5, y: 0.5 },
    scale: 2,
    easing: 'easeInOut' as const,
  });

  const withAnchors = (): Timeline => ({
    ...withClips(),
    zooms: [
      zoomAt('zoom-early', 'clip-1', 500),
      zoomAt('zoom-late', 'clip-1', 4000),
      zoomAt('zoom-other', 'clip-2', 500),
    ],
    chapters: [
      { id: 'ch-early', clipId: 'clip-1', offsetMs: 800, title: 'Login' },
      { id: 'ch-late', clipId: 'clip-1', offsetMs: 4500, title: 'Done' },
      { id: 'ch-other', clipId: 'clip-2', offsetMs: 800, title: 'Elsewhere' },
    ],
  });

  const valid = (timeline: Timeline): boolean =>
    timelineSchema.safeParse(timeline).success;

  it('slides zooms and chapters back when the in point moves forward', () => {
    const timeline = timelineReducer(withAnchors(), {
      type: 'trimClip',
      clipId: 'clip-1',
      inMs: 300,
      assetDurationMs: 5000,
    });

    expect(timeline.zooms).toEqual([
      expect.objectContaining({ id: 'zoom-early', startMs: 200 }),
      expect.objectContaining({ id: 'zoom-late', startMs: 3700 }),
      expect.objectContaining({ id: 'zoom-other', startMs: 500 }),
    ]);
    expect(timeline.chapters).toEqual([
      expect.objectContaining({ id: 'ch-early', offsetMs: 500 }),
      expect.objectContaining({ id: 'ch-late', offsetMs: 4200 }),
      expect.objectContaining({ id: 'ch-other', offsetMs: 800 }),
    ]);
    expect(valid(timeline)).toBe(true);
  });

  it('slides them forward again when the in point is given back', () => {
    const trimmed = timelineReducer(withAnchors(), {
      type: 'trimClip',
      clipId: 'clip-1',
      inMs: 300,
      assetDurationMs: 5000,
    });
    const timeline = timelineReducer(trimmed, {
      type: 'trimClip',
      clipId: 'clip-1',
      inMs: 0,
      assetDurationMs: 5000,
    });

    expect(timeline.zooms).toEqual([
      expect.objectContaining({ id: 'zoom-early', startMs: 500 }),
      expect.objectContaining({ id: 'zoom-late', startMs: 4000 }),
      expect.objectContaining({ id: 'zoom-other', startMs: 500 }),
    ]);
    expect(timeline.chapters[0]).toMatchObject({
      id: 'ch-early',
      offsetMs: 800,
    });
    expect(valid(timeline)).toBe(true);
  });

  it('drops what the out point trimmed away and leaves the rest alone', () => {
    const timeline = timelineReducer(withAnchors(), {
      type: 'trimClip',
      clipId: 'clip-1',
      outMs: 2000,
      assetDurationMs: 5000,
    });

    expect(timeline.zooms.map((zoom) => zoom.id)).toEqual([
      'zoom-early',
      'zoom-other',
    ]);
    expect(timeline.zooms[0]).toMatchObject({ startMs: 500 });
    expect(timeline.chapters.map((chapter) => chapter.id)).toEqual([
      'ch-early',
      'ch-other',
    ]);
    expect(timeline.chapters[0]).toMatchObject({ offsetMs: 800 });
    expect(valid(timeline)).toBe(true);
  });

  it('drops what an in point trim pushed off the front of the clip', () => {
    const timeline = timelineReducer(withAnchors(), {
      type: 'trimClip',
      clipId: 'clip-1',
      inMs: 1000,
      assetDurationMs: 5000,
    });

    expect(timeline.zooms.map((zoom) => zoom.id)).toEqual([
      'zoom-late',
      'zoom-other',
    ]);
    expect(timeline.zooms[0]).toMatchObject({ startMs: 3000 });
    expect(timeline.chapters.map((chapter) => chapter.id)).toEqual([
      'ch-late',
      'ch-other',
    ]);
    expect(timeline.chapters[0]).toMatchObject({ offsetMs: 3500 });
    expect(valid(timeline)).toBe(true);
  });

  it('leaves every anchor where it was when the trim is refused', () => {
    const before = withAnchors();
    const timeline = timelineReducer(before, {
      type: 'trimClip',
      clipId: 'clip-1',
      inMs: 4950,
      assetDurationMs: 5000,
    });

    expect(timeline.clips[0]).toMatchObject({ inMs: 0, outMs: 5000 });
    expect(timeline.zooms).toEqual(before.zooms);
    expect(timeline.chapters).toEqual(before.chapters);
    expect(valid(timeline)).toBe(true);
  });
});

describe('trimClip through the frames of one drag', () => {
  const oneClip = (): Timeline =>
    timelineReducer(createEmptyTimeline(), {
      type: 'addClip',
      assetId: 'asset-1',
      durationMs: 5000,
      clipId: 'clip-1',
    });

  const withZoom = (): Timeline => ({
    ...oneClip(),
    zooms: [
      {
        id: 'zoom-1',
        clipId: 'clip-1',
        startMs: 4000,
        rampInMs: 100,
        holdMs: 400,
        rampOutMs: 100,
        focus: { x: 0.5, y: 0.5 },
        scale: 2,
        easing: 'easeInOut',
      },
    ],
  });

  const withChapter = (): Timeline => ({
    ...oneClip(),
    chapters: [{ id: 'ch-1', clipId: 'clip-1', offsetMs: 800, title: 'Login' }],
  });

  const frame = (handle: 'in' | 'out', atMs: number): TimelineAction => ({
    type: 'trimClip',
    clipId: 'clip-1',
    ...(handle === 'in' ? { inMs: atMs } : { outMs: atMs }),
    assetDurationMs: 5000,
  });

  // a drag hands the reducer one absolute trim per pointer move, every one of
  // them measured from the timeline the gesture opened on
  const drag = (
    origin: Timeline,
    handle: 'in' | 'out',
    frames: number[],
  ): Timeline =>
    frames.reduce(
      (timeline, atMs) =>
        timelineReducer(timeline, frame(handle, atMs), origin),
      origin,
    );

  const valid = (timeline: Timeline): boolean =>
    timelineSchema.safeParse(timeline).success;

  it('gives back a zoom the out handle passed over on the way', () => {
    const timeline = drag(withZoom(), 'out', [4500, 3500, 3000, 4000, 5000]);

    expect(timeline.clips[0]).toMatchObject({ inMs: 0, outMs: 5000 });
    expect(timeline.zooms).toEqual([
      expect.objectContaining({ id: 'zoom-1', startMs: 4000 }),
    ]);
    expect(valid(timeline)).toBe(true);
  });

  it('gives back a chapter the in handle passed over on the way', () => {
    const timeline = drag(withChapter(), 'in', [200, 500, 900, 1200, 600, 0]);

    expect(timeline.clips[0]).toMatchObject({ inMs: 0, outMs: 5000 });
    expect(timeline.chapters).toEqual([
      expect.objectContaining({ id: 'ch-1', offsetMs: 800 }),
    ]);
    expect(valid(timeline)).toBe(true);
  });

  it('slides an anchor the drag has not reached yet with the trim', () => {
    const timeline = drag(withChapter(), 'in', [200, 500]);

    expect(timeline.chapters).toEqual([
      expect.objectContaining({ id: 'ch-1', offsetMs: 300 }),
    ]);
    expect(valid(timeline)).toBe(true);
  });

  // nothing out of range is parked in the document: an autosave can fire in the
  // middle of a drag, and a marker outside its clip would be saved, resolved
  // into programme time and handed to the watch page as a chapter
  it('holds no anchor outside the clip while the drag is over it', () => {
    const mid = drag(withZoom(), 'out', [4500, 3000]);

    expect(mid.zooms).toEqual([]);
    expect(valid(mid)).toBe(true);
  });

  it('drops what the drag left cut away when it ends there', () => {
    const timeline = drag(withChapter(), 'in', [200, 900]);

    expect(timeline.clips[0]).toMatchObject({ inMs: 900 });
    expect(timeline.chapters).toEqual([]);
  });

  // each arrow key press is its own committed edit with no gesture around it,
  // so it reads the timeline it is given, exactly as a released drag does
  it('keeps a nudge past an anchor and back as two committed trims', () => {
    const past = timelineReducer(withChapter(), frame('in', 900));
    const back = timelineReducer(past, frame('in', 0));

    expect(past.chapters).toEqual([]);
    expect(back.chapters).toEqual([]);
  });
});

describe('splitAt', () => {
  it('splits the clip under the playhead', () => {
    const timeline = timelineReducer(withClips(), {
      type: 'splitAt',
      tMs: 2000,
      clipId: 'clip-new',
    });

    expect(timeline.clips.map((clip) => clip.id)).toEqual([
      'clip-1',
      'clip-new',
      'clip-2',
    ]);
    expect(timeline.clips[0]).toMatchObject({ inMs: 0, outMs: 2000 });
    expect(timeline.clips[1]).toMatchObject({ inMs: 2000, outMs: 5000 });
  });

  // cursor times are moments in the footage, so both pieces of a split show
  // the same capture and each draws only the span its own trim shows; without
  // the copy the right piece lost its clicks and a later regenerate skipped it
  it('carries the cursor layer to both pieces', () => {
    const captured = timelineReducer(withClips(), {
      type: 'applyCapture',
      clipId: 'clip-1',
      path: [{ tMs: 100, x: 0.5, y: 0.5 }],
      effects: [
        {
          id: 'ripple-1',
          tMs: 3000,
          type: 'ripple',
          point: { x: 0.2, y: 0.3 },
          origin: 'derived',
        },
      ],
    });
    const seeded = {
      ...captured,
      cursor: captured.cursor.map((layer) => ({
        ...layer,
        recordedAtEpochMs: 1_700_000_000_000,
      })),
    };

    const timeline = timelineReducer(seeded, {
      type: 'splitAt',
      tMs: 2000,
      clipId: 'clip-new',
    });

    const right = timeline.cursor.find((layer) => layer.clipId === 'clip-new');
    expect(right).toMatchObject({
      recordedAtEpochMs: 1_700_000_000_000,
      effects: [{ id: 'ripple-1', tMs: 3000 }],
    });
    expect(
      timeline.cursor.find((layer) => layer.clipId === 'clip-1'),
    ).toBeDefined();
    expect(() => parseTimeline(timeline)).not.toThrow();
  });
});

describe('splitAt dealing the tracks', () => {
  const withZooms = (): Timeline => ({
    ...withClips(),
    zooms: [
      {
        id: 'zoom-early',
        clipId: 'clip-1',
        startMs: 500,
        rampInMs: 100,
        holdMs: 400,
        rampOutMs: 100,
        focus: { x: 0.5, y: 0.5 },
        scale: 2,
        easing: 'easeInOut',
      },
      {
        id: 'zoom-late',
        clipId: 'clip-1',
        startMs: 3000,
        rampInMs: 100,
        holdMs: 400,
        rampOutMs: 100,
        focus: { x: 0.5, y: 0.5 },
        scale: 2,
        easing: 'easeInOut',
      },
    ],
    chapters: [
      { id: 'ch-late', clipId: 'clip-1', offsetMs: 4000, title: 'Late' },
    ],
  });

  // a zoom past the cut stayed on the left piece, anchored beyond its end: it
  // never played again and sat still on the lane while the content moved
  it('moves what belongs past the cut onto the right piece, rebased', () => {
    const split = timelineReducer(withZooms(), {
      type: 'splitAt',
      tMs: 2000,
      clipId: 'clip-new',
    });

    expect(split.zooms).toEqual([
      expect.objectContaining({
        id: 'zoom-early',
        clipId: 'clip-1',
        startMs: 500,
      }),
      expect.objectContaining({
        id: 'zoom-late',
        clipId: 'clip-new',
        startMs: 1000,
      }),
    ]);
    expect(split.chapters[0]).toMatchObject({
      clipId: 'clip-new',
      offsetMs: 2000,
    });
    expect(() => parseTimeline(split)).not.toThrow();
  });
});

describe('duplicateClip', () => {
  it('carries the cursor layer to the copy', () => {
    const captured = timelineReducer(withClips(), {
      type: 'applyCapture',
      clipId: 'clip-1',
      path: [{ tMs: 100, x: 0.5, y: 0.5 }],
      effects: [
        {
          id: 'ripple-1',
          tMs: 500,
          type: 'ripple',
          point: { x: 0.2, y: 0.3 },
          origin: 'derived',
        },
      ],
    });

    const timeline = timelineReducer(captured, {
      type: 'duplicateClip',
      clipId: 'clip-1',
      newClipId: 'clip-copy',
    });

    expect(
      timeline.cursor.find((layer) => layer.clipId === 'clip-copy')?.effects,
    ).toEqual(
      timeline.cursor.find((layer) => layer.clipId === 'clip-1')?.effects,
    );
  });
});

describe('setClipVolume', () => {
  it('sets the volume of a source clip', () => {
    const timeline = timelineReducer(withClips(), {
      type: 'setClipVolume',
      clipId: 'clip-1',
      volume: 0,
    });

    expect(timeline.clips[0]).toMatchObject({ volume: 0 });
  });
});

describe('setTransition', () => {
  it('sets the incoming transition of a later clip', () => {
    const timeline = timelineReducer(withClips(), {
      type: 'setTransition',
      clipId: 'clip-2',
      transition: { type: 'crossfade', durationMs: 500 },
    });

    expect(timeline.clips[1]).toMatchObject({
      transitionIn: { type: 'crossfade', durationMs: 500 },
    });
  });

  it('never gives the first clip a transition', () => {
    const timeline = timelineReducer(withClips(), {
      type: 'setTransition',
      clipId: 'clip-1',
      transition: { type: 'crossfade', durationMs: 500 },
    });

    expect(timeline.clips[0]).not.toHaveProperty('transitionIn');
  });
});

describe('title cards', () => {
  it('inserts a title card at the given index', () => {
    const timeline = timelineReducer(withClips(), {
      type: 'addTitleCard',
      clipId: 'title-1',
      index: 1,
      text: 'Attendance',
      durationMs: 3000,
    });

    expect(timeline.clips.map((clip) => clip.id)).toEqual([
      'clip-1',
      'title-1',
      'clip-2',
    ]);
    expect(timeline.clips[1]).toMatchObject({
      kind: 'title',
      preset: 'centered',
      text: 'Attendance',
      durationMs: 3000,
    });
  });

  it('never lets a card be shortened out of existence', () => {
    const withTitle = timelineReducer(withClips(), {
      type: 'addTitleCard',
      clipId: 'title-1',
      index: 0,
      text: 'Attendance',
      durationMs: 3000,
    });

    const timeline = timelineReducer(withTitle, {
      type: 'updateTitleCard',
      clipId: 'title-1',
      durationMs: 0,
    });

    expect(timeline.clips[0]).toMatchObject({ durationMs: 100 });
    expect(() => parseTimeline(timeline)).not.toThrow();
  });

  it('edits its text and length', () => {
    const withTitle = timelineReducer(withClips(), {
      type: 'addTitleCard',
      clipId: 'title-1',
      index: 0,
      text: 'Attendance',
      durationMs: 3000,
    });

    const timeline = timelineReducer(withTitle, {
      type: 'updateTitleCard',
      clipId: 'title-1',
      subtitle: 'Under a feature flag',
      durationMs: 5000,
    });

    expect(timeline.clips[0]).toMatchObject({
      text: 'Attendance',
      subtitle: 'Under a feature flag',
      durationMs: 5000,
    });
  });
});

describe('banners', () => {
  const banner = {
    id: 'banner-1',
    startMs: 1000,
    durationMs: 4000,
    preset: 'lowerThird' as const,
    text: 'Attendance',
    position: 'bottom' as const,
    animation: 'fade' as const,
  };

  it('adds one to the overlay track', () => {
    expect(
      timelineReducer(withClips(), { type: 'addBanner', banner }).banners,
    ).toEqual([banner]);
  });

  it('updates one without letting its id change', () => {
    const added = timelineReducer(withClips(), { type: 'addBanner', banner });

    const timeline = timelineReducer(added, {
      type: 'updateBanner',
      bannerId: 'banner-1',
      change: { text: 'Speakers', startMs: 2000, id: 'hacked' },
    });

    expect(timeline.banners[0]).toMatchObject({
      id: 'banner-1',
      text: 'Speakers',
      startMs: 2000,
    });
  });

  it('removes one', () => {
    const added = timelineReducer(withClips(), { type: 'addBanner', banner });

    expect(
      timelineReducer(added, { type: 'removeBanner', bannerId: 'banner-1' })
        .banners,
    ).toEqual([]);
  });

  // programme timed, but hung on the content underneath: what pushed or
  // pulled the clips carries the banner with what it was sitting over
  it('pulls a banner up when the clip before it is removed', () => {
    const added = timelineReducer(withClips(), { type: 'addBanner', banner });
    const shifted = timelineReducer(added, {
      type: 'removeClip',
      clipId: 'clip-1',
    });

    expect(shifted.banners[0]?.startMs).toBe(
      Math.max(0, banner.startMs - 5000),
    );
  });

  it('pushes a banner along when a title card lands before it', () => {
    const added = timelineReducer(withClips(), { type: 'addBanner', banner });
    const pushed = timelineReducer(added, {
      type: 'addTitleCard',
      clipId: 'title-1',
      index: 0,
      text: 'Section',
      durationMs: 3000,
    });

    expect(pushed.banners[0]?.startMs).toBe(banner.startMs + 3000);
  });
});

describe('voice over', () => {
  const take = {
    id: 'take-1',
    assetId: 'audio-1',
    startMs: 1000,
    inMs: 0,
    outMs: 4000,
    volume: 1,
  };

  const withTake = () =>
    timelineReducer(withClips(), { type: 'addNarration', narration: take });

  it('adds a take to the voice over lane', () => {
    expect(withTake().narration).toEqual([take]);
  });

  it('retimes a take without letting it change recording', () => {
    const timeline = timelineReducer(withTake(), {
      type: 'updateNarration',
      narrationId: 'take-1',
      change: { startMs: 2500, assetId: 'somewhere-else' } as never,
    });

    expect(timeline.narration[0]).toMatchObject({
      startMs: 2500,
      assetId: 'audio-1',
    });
  });

  it('refuses a skip that would run past the point the take plays up to', () => {
    const timeline = timelineReducer(withTake(), {
      type: 'updateNarration',
      narrationId: 'take-1',
      change: { inMs: 6000 },
    });

    expect(timeline.narration[0]).toMatchObject({ inMs: 0, outMs: 4000 });
  });

  it('refuses an end that would land before the take starts playing', () => {
    const trimmed = timelineReducer(withTake(), {
      type: 'updateNarration',
      narrationId: 'take-1',
      change: { inMs: 2000 },
    });

    const timeline = timelineReducer(trimmed, {
      type: 'updateNarration',
      narrationId: 'take-1',
      change: { startMs: 3000, inMs: 2000, outMs: 1000 },
    });

    expect(timeline.narration[0]).toMatchObject({
      startMs: 1000,
      inMs: 2000,
      outMs: 4000,
    });
  });

  it('keeps every take the schema will accept', () => {
    const timeline = timelineReducer(withTake(), {
      type: 'updateNarration',
      narrationId: 'take-1',
      change: { inMs: 6000 },
    });

    expect(() => parseTimeline(timeline)).not.toThrow();
  });

  it('removes a take', () => {
    expect(
      timelineReducer(withTake(), {
        type: 'removeNarration',
        narrationId: 'take-1',
      }).narration,
    ).toEqual([]);
  });

  it('carries a take with the content it was spoken over', () => {
    const pulled = timelineReducer(withTake(), {
      type: 'removeClip',
      clipId: 'clip-1',
    });

    expect(pulled.narration[0]).toEqual({
      ...take,
      startMs: Math.max(0, take.startMs - 5000),
    });
  });
});

describe('title card fades', () => {
  const withTitle = () =>
    timelineReducer(createEmptyTimeline(), {
      type: 'addTitleCard',
      clipId: 'title-1',
      index: 0,
      text: 'Attendance',
      durationMs: 3000,
    });

  it('starts with no fade of its own, so the default applies', () => {
    const clip = withTitle().clips[0];

    expect(clip).toHaveProperty('kind', 'title');
    expect(clip && 'fadeInMs' in clip && clip.fadeInMs).toBeFalsy();
  });

  it('takes the ramps the creator sets', () => {
    const timeline = timelineReducer(withTitle(), {
      type: 'updateTitleCard',
      clipId: 'title-1',
      fadeInMs: 800,
      fadeOutMs: 150,
    });

    expect(timeline.clips[0]).toMatchObject({ fadeInMs: 800, fadeOutMs: 150 });
  });

  // zero is a real choice, not an absent one: the text arrives instantly
  it('keeps an instant fade rather than falling back to the default', () => {
    const timeline = timelineReducer(withTitle(), {
      type: 'updateTitleCard',
      clipId: 'title-1',
      fadeInMs: 0,
    });

    expect(timeline.clips[0]).toMatchObject({ fadeInMs: 0 });
  });

  it('leaves the heading alone when only a fade changes', () => {
    const timeline = timelineReducer(withTitle(), {
      type: 'updateTitleCard',
      clipId: 'title-1',
      fadeOutMs: 900,
    });

    expect(timeline.clips[0]).toMatchObject({
      text: 'Attendance',
      durationMs: 3000,
    });
  });
});

describe('chapters', () => {
  const withMarker = () =>
    timelineReducer(withClips(), {
      type: 'addChapter',
      id: 'chapter-1',
      clipId: 'clip-1',
      offsetMs: 1000,
      title: 'Attendance',
    });

  it('renames without moving', () => {
    const timeline = timelineReducer(withMarker(), {
      type: 'updateChapter',
      chapterId: 'chapter-1',
      title: 'Speakers',
    });

    expect(timeline.chapters[0]).toEqual({
      id: 'chapter-1',
      clipId: 'clip-1',
      offsetMs: 1000,
      title: 'Speakers',
    });
  });

  // a retimed marker re-anchors to whichever clip is under the new moment, so
  // it still travels with that clip when it is trimmed or reordered
  it('re-anchors to another clip when it is retimed across a boundary', () => {
    const timeline = timelineReducer(withMarker(), {
      type: 'updateChapter',
      chapterId: 'chapter-1',
      clipId: 'clip-2',
      offsetMs: 500,
    });

    expect(timeline.chapters[0]).toMatchObject({
      clipId: 'clip-2',
      offsetMs: 500,
      title: 'Attendance',
    });
  });

  it('accepts the very start of a clip', () => {
    const timeline = timelineReducer(withMarker(), {
      type: 'updateChapter',
      chapterId: 'chapter-1',
      offsetMs: 0,
    });

    expect(timeline.chapters[0]).toMatchObject({ offsetMs: 0 });
  });

  it('goes when its clip goes', () => {
    expect(
      timelineReducer(withMarker(), { type: 'removeClip', clipId: 'clip-1' })
        .chapters,
    ).toEqual([]);
  });
});

describe('a playhead that is not on a whole millisecond', () => {
  // playback accumulates fractional DOMHighResTimeStamp deltas, and every
  // millisecond in the document has to be an integer or the server rejects the
  // whole timeline and no further save can succeed
  it('splits on whole milliseconds', () => {
    const next = timelineReducer(withClips(), {
      type: 'splitAt',
      tMs: 2123.400000000001,
      clipId: 'clip-3',
    });

    const times = next.clips.flatMap((clip) =>
      clip.kind === 'source' ? [clip.inMs, clip.outMs] : [clip.durationMs ?? 0],
    );

    expect(times.filter((ms) => !Number.isInteger(ms))).toEqual([]);
  });

  it('keeps the document valid for the server', () => {
    const next = timelineReducer(withClips(), {
      type: 'splitAt',
      tMs: 2123.400000000001,
      clipId: 'clip-3',
    });

    expect(() => parseTimeline(JSON.parse(JSON.stringify(next)))).not.toThrow();
  });
});

describe('applyCapture', () => {
  const capturedOn = (surface: 'browser' | 'monitor') =>
    timelineReducer(
      timelineReducer(createEmptyTimeline(), {
        type: 'addClip',
        assetId: 'asset-1',
        durationMs: 5000,
        clipId: 'clip-1',
        recordedAtEpochMs: 1_700_000_000_000,
        surface,
      }),
      {
        type: 'applyCapture',
        clipId: 'clip-1',
        path: [{ tMs: 0, x: 0.1, y: 0.1 }],
        effects: [],
      },
    ).cursor[0];

  it('leaves the surface the take wrote where it is', () => {
    expect(capturedOn('monitor')).toMatchObject({ surface: 'monitor' });
    expect(capturedOn('browser')).toMatchObject({ surface: 'browser' });
  });

  it('gives a clip that kept no surface none of its own', () => {
    expect(
      timelineReducer(withClips(), {
        type: 'applyCapture',
        clipId: 'clip-1',
        path: [{ tMs: 0, x: 0.1, y: 0.1 }],
        effects: [],
      }).cursor[0],
    ).not.toHaveProperty('surface');
  });
});

describe('setCursorOffset', () => {
  const withCapture = () =>
    timelineReducer(
      timelineReducer(createEmptyTimeline(), {
        type: 'addClip',
        assetId: 'asset-1',
        durationMs: 5000,
        clipId: 'clip-1',
        recordedAtEpochMs: 1_700_000_000_000,
      }),
      {
        type: 'applyCapture',
        clipId: 'clip-1',
        path: [{ tMs: 0, x: 0.1, y: 0.1 }],
        effects: [],
      },
    );

  const offsetOf = (offsetMs: number) =>
    timelineReducer(withCapture(), {
      type: 'setCursorOffset',
      clipId: 'clip-1',
      offsetMs,
    }).cursor[0]?.offsetMs;

  it('slides the whole capture either way', () => {
    expect(offsetOf(1500)).toBe(1500);
    expect(offsetOf(-4286)).toBe(-4286);
  });

  // the server rejects a fraction anywhere in the document, and then no later
  // save succeeds either
  it('keeps the nudge a whole millisecond', () => {
    expect(offsetOf(1500.4000000000001)).toBe(1500);
  });

  it('holds the nudge inside what the document allows', () => {
    expect(offsetOf(120_000)).toBe(limits.offsetMs);
    expect(offsetOf(-120_000)).toBe(-limits.offsetMs);
  });

  it('leaves the take start it was recorded with alone', () => {
    const next = timelineReducer(withCapture(), {
      type: 'setCursorOffset',
      clipId: 'clip-1',
      offsetMs: 1500,
    });

    expect(next.cursor[0]?.recordedAtEpochMs).toBe(1_700_000_000_000);
    expect(() => parseTimeline(JSON.parse(JSON.stringify(next)))).not.toThrow();
  });
});

describe('setCursorAlign', () => {
  it('stores a rounded, bounded trim and drops a zero', () => {
    const trimmed = timelineReducer(withClips(), {
      type: 'setCursorAlign',
      clipId: 'clip-1',
      alignXPx: 12.4,
      alignYPx: -900,
    });

    expect(trimmed.cursor[0]).toMatchObject({
      clipId: 'clip-1',
      alignXPx: 12,
      alignYPx: -500,
    });

    const cleared = timelineReducer(trimmed, {
      type: 'setCursorAlign',
      clipId: 'clip-1',
      alignXPx: 0,
      alignYPx: 0,
    });
    expect(cleared.cursor[0]).not.toHaveProperty('alignXPx');
    expect(cleared.cursor[0]).not.toHaveProperty('alignYPx');
    expect(() => parseTimeline(cleared)).not.toThrow();
  });
});

// a capture is applied two round trips after the creator asked for it, so the
// clip it was read against can be deleted while it is in flight
describe('a cursor action naming a clip that is gone', () => {
  const effect: CursorEffect = {
    id: 'effect-1',
    tMs: 500,
    type: 'ripple',
    point: { x: 0.5, y: 0.5 },
    origin: 'manual',
  };

  const withoutClip2 = (): Timeline =>
    timelineReducer(
      timelineReducer(withClips(), {
        type: 'addCursorEffect',
        clipId: 'clip-1',
        effect,
      }),
      { type: 'removeClip', clipId: 'clip-2' },
    );

  const cases: [string, TimelineAction][] = [
    [
      'applyCapture',
      {
        type: 'applyCapture',
        clipId: 'clip-2',
        path: [{ tMs: 0, x: 0.5, y: 0.5 }],
        effects: [],
      },
    ],
    ['addCursorEffect', { type: 'addCursorEffect', clipId: 'clip-2', effect }],
    [
      'setCursorOffset',
      { type: 'setCursorOffset', clipId: 'clip-2', offsetMs: 1500 },
    ],
    [
      'setCursorPointer',
      { type: 'setCursorPointer', clipId: 'clip-2', pointer: 'hand' },
    ],
    [
      'moveCursorEffect',
      {
        type: 'moveCursorEffect',
        fromClipId: 'clip-1',
        toClipId: 'clip-2',
        effectId: 'effect-1',
        tMs: 200,
      },
    ],
  ];

  it.each(cases)('leaves %s no layer the server would reject', (_, action) => {
    const timeline = timelineReducer(withoutClip2(), action);

    expect(timeline.cursor.map((layer) => layer.clipId)).toEqual(['clip-1']);
    expect(timelineSchema.safeParse(timeline).success).toBe(true);
  });

  it('keeps the effect where it is when the clip it was dragged to is gone', () => {
    const timeline = timelineReducer(withoutClip2(), {
      type: 'moveCursorEffect',
      fromClipId: 'clip-1',
      toClipId: 'clip-2',
      effectId: 'effect-1',
      tMs: 200,
    });

    expect(timeline.cursor[0]?.effects).toEqual([effect]);
  });
});

describe('content past the end of the programme', () => {
  const banner = {
    id: 'banner-late',
    startMs: 12_000,
    durationMs: 2000,
    preset: 'lowerThird' as const,
    text: 'Credits',
    position: 'bottom' as const,
    animation: 'fade' as const,
  };

  it('keeps a banner beyond the last clip the same distance from the end', () => {
    const added = timelineReducer(withClips(), { type: 'addBanner', banner });

    const timeline = timelineReducer(added, {
      type: 'removeClip',
      clipId: 'clip-1',
    });

    expect(timeline.banners[0]?.startMs).toBe(7000);
  });
});

describe('a transition left on the first clip', () => {
  it('drops the transition a clip moved to the front had', () => {
    const blended = timelineReducer(withClips(), {
      type: 'setTransition',
      clipId: 'clip-2',
      transition: { type: 'crossfade', durationMs: 500 },
    });

    const promoted = timelineReducer(blended, {
      type: 'moveClip',
      clipId: 'clip-2',
      toIndex: 0,
    });
    const demoted = timelineReducer(promoted, {
      type: 'moveClip',
      clipId: 'clip-2',
      toIndex: 1,
    });

    expect(promoted.clips[0]?.transitionIn).toBeUndefined();
    expect(demoted.clips[1]).toMatchObject({ id: 'clip-2' });
    expect(demoted.clips[1]?.transitionIn).toBeUndefined();
  });

  it('clears one a stored document kept at the next edit', () => {
    const base = withClips();
    const stored: Timeline = {
      ...base,
      clips: base.clips.map((clip, index) =>
        index === 0
          ? { ...clip, transitionIn: { type: 'crossfade', durationMs: 500 } }
          : clip,
      ),
    };

    const timeline = timelineReducer(stored, {
      type: 'setClipVolume',
      clipId: 'clip-2',
      volume: 0.5,
    });

    expect(timeline.clips[0]?.transitionIn).toBeUndefined();
    expect(timeline.clips[1]).toMatchObject({ volume: 0.5 });
    expect(() => parseTimeline(timeline)).not.toThrow();
  });
});

describe('splitAt leaving the tracks before the cut alone', () => {
  it('keeps an early chapter and another clip chapter where they were', () => {
    const base: Timeline = {
      ...withClips(),
      chapters: [
        { id: 'ch-early', clipId: 'clip-1', offsetMs: 500, title: 'Intro' },
        { id: 'ch-other', clipId: 'clip-2', offsetMs: 3000, title: 'Other' },
      ],
    };

    const split = timelineReducer(base, {
      type: 'splitAt',
      tMs: 2000,
      clipId: 'clip-new',
    });

    expect(split.chapters).toEqual([
      { id: 'ch-early', clipId: 'clip-1', offsetMs: 500, title: 'Intro' },
      { id: 'ch-other', clipId: 'clip-2', offsetMs: 3000, title: 'Other' },
    ]);
  });
});

describe('duplicateClip of a clip that is gone', () => {
  it('leaves the timeline as it was', () => {
    const before = withClips();

    expect(
      timelineReducer(before, {
        type: 'duplicateClip',
        clipId: 'missing',
        newClipId: 'clip-copy',
      }),
    ).toBe(before);
  });
});

describe('toggleMute', () => {
  it('silences a clip and gives its sound back on the second press', () => {
    const muted = timelineReducer(withClips(), {
      type: 'toggleMute',
      clipId: 'clip-1',
    });
    const unmuted = timelineReducer(muted, {
      type: 'toggleMute',
      clipId: 'clip-1',
    });

    expect(muted.clips[0]).toMatchObject({ volume: 0 });
    expect(muted.clips[1]).toMatchObject({ volume: 1 });
    expect(unmuted.clips[0]).toMatchObject({ volume: 1 });
  });

  it('leaves a title card alone', () => {
    const withTitle = timelineReducer(withClips(), {
      type: 'addTitleCard',
      clipId: 'title-1',
      index: 0,
      text: 'Attendance',
      durationMs: 3000,
    });

    const timeline = timelineReducer(withTitle, {
      type: 'toggleMute',
      clipId: 'title-1',
    });

    expect(timeline.clips[0]).toEqual(withTitle.clips[0]);
  });
});

describe('editing one item among several', () => {
  const banner = (id: string, text: string) => ({
    id,
    startMs: 1000,
    durationMs: 2000,
    preset: 'lowerThird' as const,
    text,
    position: 'bottom' as const,
    animation: 'fade' as const,
  });

  it('updates only the banner it names', () => {
    const two = [banner('banner-1', 'One'), banner('banner-2', 'Two')].reduce(
      (timeline, next) =>
        timelineReducer(timeline, { type: 'addBanner', banner: next }),
      withClips(),
    );

    const timeline = timelineReducer(two, {
      type: 'updateBanner',
      bannerId: 'banner-2',
      change: { text: 'Second' },
    });

    expect(timeline.banners.map(({ text }) => text)).toEqual(['One', 'Second']);
  });

  it('retimes only the voice over take it names', () => {
    const take = (id: string) => ({
      id,
      assetId: `audio-${id}`,
      startMs: 0,
      inMs: 0,
      outMs: 2000,
      volume: 1,
    });
    const two = timelineReducer(
      timelineReducer(withClips(), {
        type: 'addNarration',
        narration: take('take-1'),
      }),
      { type: 'addNarration', narration: take('take-2') },
    );

    const timeline = timelineReducer(two, {
      type: 'updateNarration',
      narrationId: 'take-2',
      change: { startMs: 3000 },
    });

    expect(timeline.narration.map(({ startMs }) => startMs)).toEqual([0, 3000]);
  });

  it('renames only the chapter it names', () => {
    const two = [
      { id: 'chapter-1', title: 'Intro' },
      { id: 'chapter-2', title: 'Outro' },
    ].reduce(
      (timeline, { id, title }) =>
        timelineReducer(timeline, {
          type: 'addChapter',
          id,
          clipId: 'clip-1',
          offsetMs: 0,
          title,
        }),
      withClips(),
    );

    const timeline = timelineReducer(two, {
      type: 'updateChapter',
      chapterId: 'chapter-1',
      title: 'Welcome',
    });

    expect(timeline.chapters.map(({ title }) => title)).toEqual([
      'Welcome',
      'Outro',
    ]);
  });

  it('removes only the chapter it names', () => {
    const two = ['chapter-1', 'chapter-2'].reduce(
      (timeline, id) =>
        timelineReducer(timeline, {
          type: 'addChapter',
          id,
          clipId: 'clip-1',
          offsetMs: 0,
          title: id,
        }),
      withClips(),
    );

    const timeline = timelineReducer(two, {
      type: 'removeChapter',
      chapterId: 'chapter-1',
    });

    expect(timeline.chapters.map(({ id }) => id)).toEqual(['chapter-2']);
  });
});

describe('zooms', () => {
  const zoom = (id: string, startMs: number) => ({
    id,
    clipId: 'clip-1',
    startMs,
    rampInMs: 100,
    holdMs: 400,
    rampOutMs: 100,
    focus: { x: 0.5, y: 0.5 },
    scale: 2,
    easing: 'easeInOut' as const,
  });

  const withZooms = () =>
    timelineReducer(
      timelineReducer(withClips(), { type: 'addZoom', zoom: zoom('z1', 500) }),
      { type: 'addZoom', zoom: zoom('z2', 2000) },
    );

  it('updates one without letting it change id or clip', () => {
    const timeline = timelineReducer(withZooms(), {
      type: 'updateZoom',
      zoomId: 'z2',
      change: { scale: 3, startMs: 2500, id: 'hacked', clipId: 'clip-2' },
    });

    expect(timeline.zooms[0]).toEqual(zoom('z1', 500));
    expect(timeline.zooms[1]).toMatchObject({
      id: 'z2',
      clipId: 'clip-1',
      scale: 3,
      startMs: 2500,
    });
  });

  it('removes one', () => {
    const timeline = timelineReducer(withZooms(), {
      type: 'removeZoom',
      zoomId: 'z1',
    });

    expect(timeline.zooms.map(({ id }) => id)).toEqual(['z2']);
  });
});

describe('editing cursor effects', () => {
  const effect = (
    id: string,
    tMs: number,
    origin: CursorEffect['origin'],
  ): CursorEffect => ({
    id,
    tMs,
    type: 'ripple',
    point: { x: 0.5, y: 0.5 },
    origin,
  });

  const captured = (): Timeline =>
    timelineReducer(withClips(), {
      type: 'applyCapture',
      clipId: 'clip-1',
      path: [],
      effects: [
        effect('derived-1', 500, 'derived'),
        effect('manual-1', 1500, 'manual'),
        effect('derived-2', 2500, 'derived'),
      ],
    });

  const effectsOf = (timeline: Timeline, clipId: string) =>
    timeline.cursor.find((layer) => layer.clipId === clipId)?.effects;

  it('marks a derived effect as hand edited when it is changed', () => {
    const timeline = timelineReducer(captured(), {
      type: 'updateCursorEffect',
      clipId: 'clip-1',
      effectId: 'derived-1',
      change: { point: { x: 0.1, y: 0.2 }, id: 'hacked' },
    });

    expect(effectsOf(timeline, 'clip-1')?.[0]).toEqual({
      ...effect('derived-1', 500, 'derived-edited'),
      point: { x: 0.1, y: 0.2 },
    });
    expect(effectsOf(timeline, 'clip-1')?.[2]).toEqual(
      effect('derived-2', 2500, 'derived'),
    );
  });

  it('keeps a manual effect manual when it is changed', () => {
    const timeline = timelineReducer(captured(), {
      type: 'updateCursorEffect',
      clipId: 'clip-1',
      effectId: 'manual-1',
      change: { tMs: 1800 },
    });

    expect(effectsOf(timeline, 'clip-1')?.[1]).toEqual(
      effect('manual-1', 1800, 'manual'),
    );
  });

  it('removes one effect and keeps the rest', () => {
    const timeline = timelineReducer(captured(), {
      type: 'removeCursorEffect',
      clipId: 'clip-1',
      effectId: 'manual-1',
    });

    expect(effectsOf(timeline, 'clip-1')?.map(({ id }) => id)).toEqual([
      'derived-1',
      'derived-2',
    ]);
  });

  it('sets the pointer drawn for a clip', () => {
    const timeline = timelineReducer(captured(), {
      type: 'setCursorPointer',
      clipId: 'clip-1',
      pointer: 'hand',
    });

    expect(timeline.cursor[0]).toMatchObject({ pointer: 'hand' });
  });

  describe('dragging an effect', () => {
    it('re-sorts it by time when it stays on its own clip', () => {
      const timeline = timelineReducer(captured(), {
        type: 'moveCursorEffect',
        fromClipId: 'clip-1',
        toClipId: 'clip-1',
        effectId: 'derived-1',
        tMs: 3000,
      });

      expect(effectsOf(timeline, 'clip-1')).toEqual([
        effect('manual-1', 1500, 'manual'),
        effect('derived-2', 2500, 'derived'),
        effect('derived-1', 3000, 'derived-edited'),
      ]);
    });

    it('gives it to a clip that has no cursor layer yet', () => {
      const timeline = timelineReducer(captured(), {
        type: 'moveCursorEffect',
        fromClipId: 'clip-1',
        toClipId: 'clip-2',
        effectId: 'manual-1',
        tMs: 200,
      });

      expect(effectsOf(timeline, 'clip-1')?.map(({ id }) => id)).toEqual([
        'derived-1',
        'derived-2',
      ]);
      expect(
        timeline.cursor.find((layer) => layer.clipId === 'clip-2'),
      ).toEqual({
        clipId: 'clip-2',
        offsetMs: 0,
        path: [],
        effects: [effect('manual-1', 200, 'manual')],
      });
      expect(timelineSchema.safeParse(timeline).success).toBe(true);
    });

    it('slots it into the layer of the clip it lands on, in time order', () => {
      const both = timelineReducer(captured(), {
        type: 'applyCapture',
        clipId: 'clip-2',
        path: [],
        effects: [
          effect('other-1', 100, 'manual'),
          effect('other-2', 900, 'manual'),
        ],
      });

      const timeline = timelineReducer(both, {
        type: 'moveCursorEffect',
        fromClipId: 'clip-1',
        toClipId: 'clip-2',
        effectId: 'derived-2',
        tMs: 400,
      });

      expect(effectsOf(timeline, 'clip-1')?.map(({ id }) => id)).toEqual([
        'derived-1',
        'manual-1',
      ]);
      expect(effectsOf(timeline, 'clip-2')).toEqual([
        effect('other-1', 100, 'manual'),
        effect('derived-2', 400, 'derived-edited'),
        effect('other-2', 900, 'manual'),
      ]);
    });
  });
});

describe('setCanvas', () => {
  it('hands back the same timeline when nothing about the canvas changed', () => {
    const before = withClips();

    expect(
      timelineReducer(before, {
        type: 'setCanvas',
        canvas: { ...before.canvas },
      }),
    ).toBe(before);
  });

  it('takes a canvas of a different size', () => {
    const before = withClips();

    const timeline = timelineReducer(before, {
      type: 'setCanvas',
      canvas: { ...before.canvas, width: 3840, height: 2160 },
    });

    expect(timeline.canvas).toMatchObject({ width: 3840, height: 2160 });
    expect(timeline.clips).toBe(before.clips);
  });
});

it('leaves the timeline alone for an action it does not know', () => {
  const before = withClips();

  expect(
    timelineReducer(before, { type: 'unknown' } as unknown as TimelineAction),
  ).toBe(before);
});
