import { CaptureEvent } from '../types';
import { sliceCaptureEvents } from '../slice';

const takeOneStart = 1_700_000_000_000;
// the second take starts 30 seconds after the first one ended
const takeTwoStart = takeOneStart + 10_000 + 30_000;

const event = (
  id: string,
  t: number,
  overrides: Partial<CaptureEvent> = {},
): CaptureEvent => ({
  id,
  type: 'click',
  t,
  x: 640,
  y: 360,
  viewportW: 1280,
  viewportH: 720,
  ...overrides,
});

const windows = [
  { clipId: 'clip-1', recordedAtEpochMs: takeOneStart, durationMs: 10_000 },
  { clipId: 'clip-2', recordedAtEpochMs: takeTwoStart, durationMs: 8_000 },
];

describe('sliceCaptureEvents', () => {
  it('gives each take its own events and drops the gap between them', () => {
    const sliced = sliceCaptureEvents(
      [
        event('take1-click', takeOneStart + 2_000),
        event('between-takes', takeOneStart + 20_000),
        event('take2-click', takeTwoStart + 3_000),
      ],
      windows,
    );

    expect(sliced.get('clip-1')?.map(({ id }) => id)).toEqual(['take1-click']);
    expect(sliced.get('clip-2')?.map(({ id }) => id)).toEqual(['take2-click']);
  });

  it('keeps the boundary events: the take start and its very last instant', () => {
    const sliced = sliceCaptureEvents(
      [
        event('at-start', takeOneStart),
        event('at-end', takeOneStart + 10_000),
        event('past-end', takeOneStart + 10_001),
      ],
      windows,
    );

    expect(sliced.get('clip-1')?.map(({ id }) => id)).toEqual([
      'at-start',
      'at-end',
    ]);
  });

  it('hands the same events to two clips of the same footage', () => {
    const sliced = sliceCaptureEvents(
      [event('shared', takeOneStart + 1_000)],
      [
        { clipId: 'clip-1', recordedAtEpochMs: takeOneStart, durationMs: 5000 },
        { clipId: 'copy', recordedAtEpochMs: takeOneStart, durationMs: 5000 },
      ],
    );

    expect(sliced.get('clip-1')).toHaveLength(1);
    expect(sliced.get('copy')).toHaveLength(1);
  });

  it('leaves a clip whose take saw nothing with an empty slice', () => {
    const sliced = sliceCaptureEvents(
      [event('take1-click', takeOneStart + 2_000)],
      windows,
    );

    expect(sliced.get('clip-2')).toEqual([]);
  });
});

// 30 seconds of footage, 20 seconds paused, 30 more: the file holds a minute,
// and the wall clock the capture stamps ran for eighty seconds
describe('a take that was paused mid recording', () => {
  const pauses = [
    { startMs: takeOneStart + 30_000, endMs: takeOneStart + 50_000 },
  ];
  const pausedWindow = [
    {
      clipId: 'clip-1',
      recordedAtEpochMs: takeOneStart,
      durationMs: 60_000,
      pauses,
    },
  ];

  it('keeps a click the take filmed after the pause, past its own length', () => {
    const sliced = sliceCaptureEvents(
      [event('last-click', takeOneStart + 79_000)],
      pausedWindow,
    );

    expect(sliced.get('clip-1')?.map(({ id }) => id)).toEqual(['last-click']);
  });

  it('drops a click nothing was filming', () => {
    const sliced = sliceCaptureEvents(
      [event('during-pause', takeOneStart + 40_000)],
      pausedWindow,
    );

    expect(sliced.get('clip-1')).toEqual([]);
  });

  it('still ends the window once the footage has run out', () => {
    const sliced = sliceCaptureEvents(
      [event('after-the-take', takeOneStart + 80_001)],
      pausedWindow,
    );

    expect(sliced.get('clip-1')).toEqual([]);
  });
});
