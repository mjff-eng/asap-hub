import { CursorPathPoint, Point } from '../../schema';
import {
  cursorPointAt,
  cursorPointerTrack,
  maxPointerPoints,
  pointerPositionAt,
  pointerTolerance,
  simplifyCursorPath,
} from '../pointer';

// evenly spaced along a straight line, so the damping and the curve are both
// no-ops on it and the numbers below are only about reading the track
const path: CursorPathPoint[] = [
  { tMs: 1000, x: 0, y: 0 },
  { tMs: 1100, x: 0.5, y: 0.25 },
  { tMs: 1200, x: 1, y: 0.5 },
];

const layer = (
  overrides: Partial<{ path: CursorPathPoint[]; offsetMs: number }> = {},
) => ({ path, offsetMs: 0, ...overrides });

describe('the pointer position', () => {
  it('sits on a sample the capture recorded', () => {
    expect(cursorPointAt(layer(), 1100)).toEqual({ x: 0.5, y: 0.25 });
  });

  it('runs between the two samples around it', () => {
    expect(cursorPointAt(layer(), 1150)).toEqual({ x: 0.75, y: 0.375 });
    expect(cursorPointAt(layer(), 1025)).toEqual({ x: 0.125, y: 0.0625 });
  });

  // held at the nearest sample, a clip whose capture ran out early would park a
  // pointer somewhere the creator never put it, for as long as the clip lasts
  it('is nowhere before the capture starts', () => {
    expect(cursorPointAt(layer(), 999)).toBeUndefined();
  });

  it('is nowhere after the capture ends', () => {
    expect(cursorPointAt(layer(), 1201)).toBeUndefined();
  });

  it('is nowhere at all for a clip with no capture', () => {
    expect(cursorPointAt(layer({ path: [] }), 1000)).toBeUndefined();
  });

  it('holds still for a capture of a single sample', () => {
    const only = [{ tMs: 400, x: 0.2, y: 0.3 }];
    expect(cursorPointAt(layer({ path: only }), 400)).toEqual({
      x: 0.2,
      y: 0.3,
    });
    expect(cursorPointAt(layer({ path: only }), 401)).toBeUndefined();
  });

  it('starts and ends exactly where the capture did', () => {
    const track = cursorPointerTrack(layer());
    expect(track[0]).toEqual({ tMs: 1000, x: 0, y: 0 });
    expect(track[track.length - 1]).toEqual({ tMs: 1200, x: 1, y: 0.5 });
  });
});

describe('the layer offset', () => {
  // the render moves every effect by it, so a capture nudged into line by hand
  // has to carry the pointer with it
  it('moves the whole path later', () => {
    expect(cursorPointAt(layer({ offsetMs: 500 }), 1100)).toBeUndefined();
    expect(cursorPointAt(layer({ offsetMs: 500 }), 1600)).toEqual({
      x: 0.5,
      y: 0.25,
    });
  });

  it('moves the whole path earlier', () => {
    expect(cursorPointAt(layer({ offsetMs: -400 }), 700)).toEqual({
      x: 0.5,
      y: 0.25,
    });
  });

  it('leaves every time a whole millisecond', () => {
    const track = cursorPointerTrack(layer({ offsetMs: -37 }));
    expect(track.every(({ tMs }) => Number.isInteger(tMs))).toBe(true);
  });
});

describe('a path out of order', () => {
  it('is read in time order, whichever order it was saved in', () => {
    expect(cursorPointAt(layer({ path: [...path].reverse() }), 1150)).toEqual({
      x: 0.75,
      y: 0.375,
    });
  });
});

/* the shape of the motion */

const frames = (
  track: ReturnType<typeof cursorPointerTrack>,
  fps: number,
): Point[] => {
  const last = track[track.length - 1];
  const first = track[0];
  if (!first || !last) {
    return [];
  }
  const step = 1000 / fps;
  const count = Math.floor((last.tMs - first.tMs) / step);
  return Array.from({ length: count }, (_unused, index) =>
    pointerPositionAt(track, Math.round(first.tMs + index * step)),
  ).filter((point): point is Point => Boolean(point));
};

// How hard the drawn motion is jerked about: the largest change in velocity
// from one frame to the next, against the average speed. Read at 60fps, a 10Hz
// staircase holds one velocity for six frames and then swaps it for another in a
// single frame, which is exactly what reads as robotic.
const roughness = (points: Point[]): number => {
  const steps = points.slice(1).map((point, index) => {
    const before = points[index];
    return { x: point.x - (before?.x ?? 0), y: point.y - (before?.y ?? 0) };
  });
  const mean =
    steps.reduce((total, step) => total + Math.hypot(step.x, step.y), 0) /
    Math.max(1, steps.length);
  if (mean === 0) {
    return 0;
  }
  return steps.slice(1).reduce((worst, step, index) => {
    const before = steps[index];
    return Math.max(
      worst,
      Math.hypot(step.x - (before?.x ?? 0), step.y - (before?.y ?? 0)) / mean,
    );
  }, 0);
};

// a hand moving a mouse: it rests, sets off, arrives and rests again, sampled at
// the 10Hz the capture resamples to
const restsAndBursts = (): CursorPathPoint[] => {
  const legs = [
    [0.2, 0.2],
    [0.8, 0.3],
    [0.75, 0.8],
    [0.25, 0.6],
    [0.5, 0.35],
  ];
  const points: CursorPathPoint[] = [];
  let tMs = 0;
  legs.forEach(([x = 0, y = 0], index) => {
    const [nextX, nextY] = legs[index + 1] ?? [];
    for (let step = 0; step < 10; step += 1) {
      points.push({ tMs, x, y });
      tMs += 100;
    }
    if (nextX === undefined || nextY === undefined) {
      return;
    }
    for (let step = 1; step <= 8; step += 1) {
      const ratio = step / 8;
      const eased = ratio * ratio * (3 - 2 * ratio);
      points.push({
        tMs,
        x: x + (nextX - x) * eased,
        y: y + (nextY - y) * eased,
      });
      tMs += 100;
    }
  });
  return points;
};

describe('the shape of the motion', () => {
  const drawn = restsAndBursts();

  it.each([30, 60])('is gentler at %ifps than the raw samples are', (fps) => {
    const curved = roughness(
      frames(cursorPointerTrack({ path: drawn, offsetMs: 0 }), fps),
    );
    expect(curved).toBeLessThan(roughness(frames(drawn, fps)) / 2);
  });

  // the limiter is what stops a curve bulging past a reversal the pointer
  // actually made, which would read as the cursor overshooting and coming back
  it('never carries the pointer outside the samples it runs through', () => {
    const bounce = [
      { tMs: 0, x: 0.2, y: 0.5 },
      { tMs: 100, x: 0.8, y: 0.5 },
      { tMs: 200, x: 0.2, y: 0.5 },
      { tMs: 300, x: 0.8, y: 0.5 },
    ];
    const track = cursorPointerTrack({ path: bounce, offsetMs: 0 });
    expect(Math.min(...track.map(({ x }) => x))).toBeGreaterThanOrEqual(0.2);
    expect(Math.max(...track.map(({ x }) => x))).toBeLessThanOrEqual(0.8);
  });
});

describe('thinning what the curve read', () => {
  const straight = Array.from({ length: 50 }, (_unused, index) => ({
    tMs: index * 100,
    x: index / 100,
    y: index / 100,
  }));

  it('keeps only the ends of a straight run', () => {
    expect(simplifyCursorPath(straight, pointerTolerance)).toHaveLength(2);
  });

  it('keeps a reading the straight line misses', () => {
    const detour = [
      ...straight.slice(0, 25),
      { tMs: 2500, x: 0.9, y: 0.1 },
      ...straight.slice(26),
    ];
    expect(
      simplifyCursorPath(detour, pointerTolerance).map(({ tMs }) => tMs),
    ).toContain(2500);
  });

  it('stays inside the tolerance it was thinned against', () => {
    const wander = Array.from({ length: 300 }, (_unused, index) => ({
      tMs: index * 25,
      x: 0.5 + Math.sin(index / 11) * 0.3,
      y: 0.5 + Math.cos(index / 8) * 0.3,
    }));
    const thinned = simplifyCursorPath(wander, pointerTolerance);
    const worst = wander.reduce((furthest, point) => {
      const on = pointerPositionAt(thinned, point.tMs);
      return on
        ? Math.max(furthest, Math.hypot(point.x - on.x, point.y - on.y))
        : furthest;
    }, 0);
    expect(worst).toBeLessThanOrEqual(pointerTolerance);
  });
});

describe('a capture too busy to draw in full', () => {
  const busy = Array.from({ length: 6000 }, (_unused, index) => ({
    tMs: index * 100,
    x: index % 2 === 0 ? 0.1 : 0.9,
    y: index % 3 === 0 ? 0.2 : 0.8,
  }));

  // the render writes one expression term per segment, so it is coarsened rather
  // than allowed to grow the filtergraph without end
  it('never leaves the render more segments than it can carry', () => {
    expect(
      cursorPointerTrack({ path: busy, offsetMs: 0 }).length,
    ).toBeLessThanOrEqual(maxPointerPoints);
  });

  it('still runs the whole length of the recording', () => {
    const track = cursorPointerTrack({ path: busy, offsetMs: 0 });
    expect(track[track.length - 1]?.tMs).toBe(599900);
  });
});
