import { CursorLayer, CursorPathPoint, Point } from '../schema';

// how far a dropped sample may pull the pointer from where the capture put it,
// as a fraction of the frame: about three pixels across a 1080p canvas
export const pointerTolerance = 0.0015;

// the render writes one term per segment into an ffmpeg expression, so the track
// is capped rather than left to grow with the length of the recording
export const maxPointerPoints = 360;

// how many samples one straight run may swallow; without it a pointer parked for
// minutes makes the walk below quadratic
export const maxPointerRun = 200;

// How hard the jitter in the raw capture is damped, from 0 for none to 1 for the
// plain average of the neighbours. Pointer hardware and the browser's own
// coalescing leave a wobble of a pixel or two that the curve below would
// otherwise carry through faithfully, and the tangent limiter turns each wobble
// into a little stop. It is taken out first, as its own step, and kept light:
// a click ring is drawn where the capture recorded it, so the pointer must not
// be pulled far off that.
export const pointerSmoothing = 0.25;

// how many extra positions the curve is read at between two captured samples;
// four turns 10Hz into 40Hz, which the flattening below then thins back down
export const pointerSubdivisions = 4;

// the ceiling on the curve read out before it is thinned, so a capture at the
// document's limit cannot make this the slowest thing in the editor
export const maxPointerReadings = 20000;

// the captured path, smoothed, curved, thinned and rebased into clip-local time
export type CursorPointerTrack = CursorPathPoint[];

const lerp = (from: number, to: number, ratio: number): number =>
  from + (to - from) * ratio;

const between = (
  from: CursorPathPoint,
  to: CursorPathPoint,
  tMs: number,
): Point => {
  const spanMs = to.tMs - from.tMs;
  const ratio = spanMs <= 0 ? 0 : (tMs - from.tMs) / spanMs;
  return { x: lerp(from.x, to.x, ratio), y: lerp(from.y, to.y, ratio) };
};

/* the jitter */

// one pass of a centred average, ends left where the capture put them
export const smoothCursorPath = (
  points: CursorPathPoint[],
  weight: number,
): CursorPathPoint[] =>
  points.map((point, index) => {
    const before = points[index - 1];
    const after = points[index + 1];
    if (!before || !after) {
      return point;
    }
    return {
      tMs: point.tMs,
      x: lerp(point.x, (before.x + after.x) / 2, weight),
      y: lerp(point.y, (before.y + after.y) / 2, weight),
    };
  });

/* the curve */

const slopes = (points: CursorPathPoint[], axis: 'x' | 'y'): number[] =>
  points.slice(1).map((point, index) => {
    const before = points[index];
    if (!before) {
      return 0;
    }
    const spanMs = point.tMs - before.tMs;
    return spanMs <= 0 ? 0 : (point[axis] - before[axis]) / spanMs;
  });

const sameSign = (a: number, b: number): boolean => a * b > 0;

// A pointer that reverses, or stops dead against a window edge, must not be
// carried past the position it actually reached: the tangent at a turn is
// flattened, and elsewhere held to three times the gentler of the two secants
// around it. That is the Fritsch and Carlson limit, and it is what keeps the
// curve from bulging outside the samples it runs through.
const tangents = (points: CursorPathPoint[], axis: 'x' | 'y'): number[] => {
  const secants = slopes(points, axis);
  return points.map((_unused, index) => {
    const before = secants[index - 1];
    const after = secants[index];
    if (before === undefined) {
      return after ?? 0;
    }
    if (after === undefined) {
      return before;
    }
    if (!sameSign(before, after)) {
      return 0;
    }
    const limit = 3 * Math.min(Math.abs(before), Math.abs(after));
    const raw = (before + after) / 2;
    return Math.sign(raw) * Math.min(Math.abs(raw), limit);
  });
};

const hermite = (
  from: number,
  to: number,
  fromSlope: number,
  toSlope: number,
  spanMs: number,
  ratio: number,
): number => {
  const squared = ratio * ratio;
  const cubed = squared * ratio;
  return (
    from * (2 * cubed - 3 * squared + 1) +
    fromSlope * spanMs * (cubed - 2 * squared + ratio) +
    to * (-2 * cubed + 3 * squared) +
    toSlope * spanMs * (cubed - squared)
  );
};

// Reads the curve through the samples at a few positions inside every gap, so
// what follows has a smooth line to thin rather than the 10Hz staircase the
// capture arrives as. Whole milliseconds throughout: a fractional time reaches
// the ffmpeg expression as noise and buys nothing.
export const flowCursorPath = (
  points: CursorPathPoint[],
  subdivisions: number,
): CursorPathPoint[] => {
  const last = points[points.length - 1];
  if (points.length < 3 || !last || subdivisions < 2) {
    return [...points];
  }

  const slopeX = tangents(points, 'x');
  const slopeY = tangents(points, 'y');

  const read = points.slice(0, -1).flatMap((from, index) => {
    const to = points[index + 1];
    const fromSlopeX = slopeX[index];
    const toSlopeX = slopeX[index + 1];
    const fromSlopeY = slopeY[index];
    const toSlopeY = slopeY[index + 1];
    if (
      !to ||
      fromSlopeX === undefined ||
      toSlopeX === undefined ||
      fromSlopeY === undefined ||
      toSlopeY === undefined
    ) {
      return [];
    }
    const spanMs = to.tMs - from.tMs;
    return Array.from({ length: subdivisions }, (_unused, step) => {
      const ratio = step / subdivisions;
      return {
        tMs: Math.round(from.tMs + spanMs * ratio),
        x: hermite(from.x, to.x, fromSlopeX, toSlopeX, spanMs, ratio),
        y: hermite(from.y, to.y, fromSlopeY, toSlopeY, spanMs, ratio),
      };
    });
  });

  return [...read, last].filter(
    (point, index, all) =>
      index === 0 || point.tMs > (all[index - 1]?.tMs ?? 0),
  );
};

/* the thinning */

// how far the pointer would be pulled by dropping this sample: the gap between
// where it was and where the straight line across it puts it at that moment
const chordError = (
  from: CursorPathPoint,
  to: CursorPathPoint,
  point: CursorPathPoint,
): number => {
  const on = between(from, to, point.tMs);
  return Math.hypot(point.x - on.x, point.y - on.y);
};

const chordHolds = (
  points: CursorPathPoint[],
  fromIndex: number,
  toIndex: number,
  tolerance: number,
): boolean => {
  const from = points[fromIndex];
  const to = points[toIndex];
  if (!from || !to) {
    return false;
  }
  for (let index = fromIndex + 1; index < toIndex; index += 1) {
    const point = points[index];
    if (point && chordError(from, to, point) > tolerance) {
      return false;
    }
  }
  return true;
};

// Keeps the readings the shape needs and drops the ones a straight line already
// passes through, measuring every dropped reading against the chord it would be
// replaced by rather than against its neighbours, so error cannot accumulate
// along a slow drift. The curve survives it because a curve needs readings only
// where it actually bends.
export const simplifyCursorPath = (
  points: CursorPathPoint[],
  tolerance: number,
): CursorPathPoint[] => {
  const first = points[0];
  if (!first || points.length <= 2) {
    return [...points];
  }

  const kept = [first];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let next = anchor + 1;
    while (
      next + 1 < points.length &&
      next + 1 - anchor <= maxPointerRun &&
      chordHolds(points, anchor, next + 1, tolerance)
    ) {
      next += 1;
    }
    const point = points[next];
    if (point) {
      kept.push(point);
    }
    anchor = next;
  }
  return kept;
};

/* the track */

const subdivisionsFor = (count: number): number =>
  Math.max(
    1,
    Math.min(pointerSubdivisions, Math.floor(maxPointerReadings / count)),
  );

// The one place a capture becomes something either side can draw: damped,
// curved, thinned to a bounded number of samples, and moved by the layer's nudge
// so its times are the clip's. A path so busy that the tolerance cannot bring it
// under the cap is coarsened rather than cut short, so the pointer still runs the
// length of the recording.
export const cursorPointerTrack = (
  layer: Pick<CursorLayer, 'path' | 'offsetMs'>,
): CursorPointerTrack => {
  const ordered = [...layer.path].sort((a, b) => a.tMs - b.tMs);
  if (ordered.length === 0) {
    return [];
  }

  const flowed = flowCursorPath(
    smoothCursorPath(ordered, pointerSmoothing),
    subdivisionsFor(ordered.length),
  );

  let tolerance = pointerTolerance;
  let thinned = simplifyCursorPath(flowed, tolerance);
  while (thinned.length > maxPointerPoints && tolerance < 1) {
    tolerance *= 2;
    thinned = simplifyCursorPath(flowed, tolerance);
  }

  return thinned
    .slice(0, maxPointerPoints)
    .map(({ tMs, x, y }) => ({ tMs: tMs + layer.offsetMs, x, y }));
};

// Where the pointer is at a clip-local moment, read straight off the track. The
// bend is already in the track, so both sides read it the same way and neither
// has to know how it got there. Before the first sample and after the last the
// pointer is nowhere: a clip whose capture never started, or one whose capture
// ran out early, shows no pointer rather than one parked at an address it never
// had.
export const pointerPositionAt = (
  track: CursorPointerTrack,
  tMs: number,
): Point | undefined => {
  const first = track[0];
  const last = track[track.length - 1];
  if (!first || !last || tMs < first.tMs || tMs > last.tMs) {
    return undefined;
  }

  let low = 0;
  let high = track.length - 1;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    const point = track[mid];
    if (point && point.tMs <= tMs) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const from = track[low];
  const to = track[high];
  return from && to ? between(from, to, tMs) : undefined;
};

export const cursorPointAt = (
  layer: Pick<CursorLayer, 'path' | 'offsetMs'>,
  tMs: number,
): Point | undefined => pointerPositionAt(cursorPointerTrack(layer), tMs);
