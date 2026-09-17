import {
  createEmptyTimeline,
  parseTimeline,
  serialiseTimeline,
  TimelineFormatError,
} from '../document';
import { limits, Timeline } from '../schema';

const parseFailure = (value: unknown): TimelineFormatError => {
  try {
    parseTimeline(value);
  } catch (error) {
    if (error instanceof TimelineFormatError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected parseTimeline to throw a TimelineFormatError');
};

const withClip = (): Timeline => ({
  ...createEmptyTimeline(),
  clips: [
    {
      kind: 'source',
      id: 'clip-1',
      assetId: 'asset-1',
      inMs: 0,
      outMs: 5000,
      volume: 1,
    },
  ],
});

describe('createEmptyTimeline', () => {
  it('starts at 1080p30 with empty tracks', () => {
    expect(createEmptyTimeline()).toEqual({
      schemaVersion: 2,
      canvas: { width: 1920, height: 1080, fps: 30 },
      clips: [],
      banners: [],
      narration: [],
      zooms: [],
      cursor: [],
      chapters: [],
    });
  });
});

describe('parseTimeline', () => {
  it('round-trips a serialised timeline', () => {
    const timeline = withClip();

    expect(parseTimeline(JSON.parse(serialiseTimeline(timeline)))).toEqual(
      timeline,
    );
  });

  it('rejects a document that is not an object', () => {
    expect(() => parseTimeline('nope')).toThrow(TimelineFormatError);
  });

  it('rejects a document without a schema version', () => {
    expect(() => parseTimeline({ clips: [] })).toThrow(/missing schemaVersion/);
  });

  it('rejects a schema version this build does not know', () => {
    expect(() =>
      parseTimeline({ ...createEmptyTimeline(), schemaVersion: 99 }),
    ).toThrow(/newer than this build supports/);
  });

  it('rejects a source clip that ends before it starts', () => {
    const timeline = withClip();
    const [clip] = timeline.clips;

    expect(() =>
      parseTimeline({
        ...timeline,
        clips: [{ ...clip, inMs: 5000, outMs: 5000 }],
      }),
    ).toThrow(TimelineFormatError);
  });

  it('rejects a title card with no length, which renders as an empty file', () => {
    expect(() =>
      parseTimeline({
        ...withClip(),
        clips: [
          {
            kind: 'title',
            id: 'title-1',
            durationMs: 0,
            preset: 'centered',
            text: 'Attendance',
          },
        ],
      }),
    ).toThrow(TimelineFormatError);
  });

  it('accepts a title card as short as the shortest clip the editor can make', () => {
    expect(() =>
      parseTimeline({
        ...withClip(),
        clips: [
          {
            kind: 'title',
            id: 'title-1',
            durationMs: limits.minClipMs,
            preset: 'centered',
            text: 'Attendance',
          },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects a voice over take that plays up to before it starts', () => {
    expect(() =>
      parseTimeline({
        ...withClip(),
        narration: [
          {
            id: 'take-1',
            assetId: 'audio-1',
            startMs: 0,
            inMs: 5000,
            outMs: 1000,
            volume: 1,
          },
        ],
      }),
    ).toThrow(TimelineFormatError);
  });

  it('accepts a voice over take that holds some audio', () => {
    expect(() =>
      parseTimeline({
        ...withClip(),
        narration: [
          {
            id: 'take-1',
            assetId: 'audio-1',
            startMs: 0,
            inMs: 1000,
            outMs: 5000,
            volume: 1,
          },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects duplicate ids across tracks', () => {
    const timeline = withClip();

    expect(() =>
      parseTimeline({
        ...timeline,
        banners: [
          {
            id: 'clip-1',
            startMs: 0,
            durationMs: 1000,
            preset: 'lowerThird',
            text: 'Attendance',
            position: 'bottom',
            animation: 'fade',
          },
        ],
      }),
    ).toThrow(TimelineFormatError);
  });

  it.each(['zooms', 'cursor', 'chapters'] as const)(
    'rejects a %s entry pointing at an unknown clip',
    (track) => {
      const entries = {
        zooms: {
          id: 'z1',
          clipId: 'ghost',
          startMs: 0,
          rampInMs: 300,
          holdMs: 1000,
          rampOutMs: 300,
          focus: { x: 0.5, y: 0.5 },
          scale: 2,
          easing: 'easeInOut',
        },
        cursor: { clipId: 'ghost', offsetMs: 0, path: [], effects: [] },
        chapters: { id: 'c1', clipId: 'ghost', offsetMs: 0, title: 'Intro' },
      };

      expect(() =>
        parseTimeline({ ...withClip(), [track]: [entries[track]] }),
      ).toThrow(/references unknown clip ghost/);
    },
  );

  it('reports the failing path in the issues', () => {
    const error = parseFailure({
      ...createEmptyTimeline(),
      canvas: { width: 10 },
    });

    expect(error.issues?.length).toBeGreaterThan(0);
  });
});

// Version 1 let every applied capture stamp the layer with the surface that
// apply resolved, which was the newest take's. A document carrying one of those
// read every later capture through it and nothing could say otherwise, so the
// pointer stayed hundreds of pixels out for good.
describe('a cursor surface left by version 1', () => {
  const layer = {
    clipId: 'clip-1',
    offsetMs: 0,
    path: [],
    effects: [],
    recordedAtEpochMs: 1_700_000_000_000,
    pointer: 'hand' as const,
  };

  const migrated = (surface?: string): Timeline =>
    parseTimeline({
      ...withClip(),
      schemaVersion: 1,
      cursor: [{ ...layer, ...(surface ? { surface } : {}) }],
    });

  it('is dropped, so the recorder can map the clip again', () => {
    expect(migrated('monitor').cursor[0]).not.toHaveProperty('surface');
  });

  it('leaves the rest of the layer where it was', () => {
    expect(migrated('monitor').cursor[0]).toEqual(layer);
    expect(migrated().cursor[0]).toEqual(layer);
  });

  it('stamps the document with the version that did the dropping', () => {
    expect(migrated('monitor').schemaVersion).toBe(2);
  });
});

// what the take itself wrote when its clip was added, which is the only surface
// a document keeps now
describe('a cursor surface the take wrote', () => {
  const timeline = (): Timeline => ({
    ...withClip(),
    cursor: [
      {
        clipId: 'clip-1',
        offsetMs: 0,
        path: [],
        effects: [],
        recordedAtEpochMs: 1_700_000_000_000,
        surface: 'monitor',
      },
    ],
  });

  it('round-trips through a save and a load', () => {
    expect(parseTimeline(JSON.parse(serialiseTimeline(timeline())))).toEqual(
      timeline(),
    );
  });
});
