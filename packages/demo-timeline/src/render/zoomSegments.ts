import { Canvas, Zoom } from '../schema';
import { zoomDurationMs } from '../zoom';
import { evenDown, evenNear, PictureBox } from './filters';

// A zoom is a ramp in, a hold and a ramp out, and only the ramps actually
// move the window. This reads a clip's zooms as a run of quiet, still and
// moving stretches, so the tiling can give each stretch the cheapest chain
// that is exact there: a held window is cut out of the source first and
// scaled up once (a quarter of the work at 2x), and a quiet stretch carries
// no zoom arithmetic at all.

export type ZoomSpanKind = 'quiet' | 'still' | 'moving';

// the held window: the magnification and the crop origin as a fraction of
// the frame, exactly the numbers the moving expressions would compute there
export type StillWindow = { scale: number; cropX: number; cropY: number };

export type ZoomSpan = {
  startMs: number;
  endMs: number;
  kind: ZoomSpanKind;
  // only for a still span
  window?: StillWindow;
};

// a sliver is not worth its own branch; the moving chain is correct at every
// instant, so a short span is simply left on it
export const minZoomSpanMs = 200;

// the same numbers the expressions carry: the strings round the constants, so
// the held window is computed from the rounded values too, or the still frame
// would sit a fraction of a pixel away from the moving frame beside it
const roundedGain = (zoom: Zoom): number => Number((zoom.scale - 1).toFixed(3));
const roundedFocus = (value: number): number => Number(value.toFixed(4));

const eased = (zoom: Zoom, ramp: number): number =>
  zoom.easing === 'linear'
    ? ramp
    : ramp < 0.5
      ? 2 * ramp * ramp
      : 1 - 2 * (1 - ramp) * (1 - ramp);

const progressAt = (zoom: Zoom, tMs: number): number => {
  const holdStartMs = zoom.startMs + zoom.rampInMs;
  const holdEndMs = holdStartMs + zoom.holdMs;
  const endMs = holdEndMs + zoom.rampOutMs;
  if (tMs < zoom.startMs || tMs >= endMs) {
    return 0;
  }
  if (tMs < holdStartMs) {
    return zoom.rampInMs === 0
      ? 1
      : eased(zoom, (tMs - zoom.startMs) / zoom.rampInMs);
  }
  if (tMs < holdEndMs) {
    return 1;
  }
  return zoom.rampOutMs === 0
    ? 0
    : 1 - eased(zoom, (tMs - holdEndMs) / zoom.rampOutMs);
};

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

// the window at one instant, mirroring zoomExpressions term for term
const windowAt = (zooms: Zoom[], tMs: number): StillWindow => {
  const gains = zooms.map((zoom) => roundedGain(zoom) * progressAt(zoom, tMs));
  const scale = 1 + gains.reduce((total, each) => total + each, 0);
  const crop = (focus: (zoom: Zoom) => number): number =>
    clamp(
      zooms.reduce(
        (total, zoom, at) =>
          total + roundedFocus(focus(zoom)) * (1 - 1 / (1 + (gains[at] ?? 0))),
        0,
      ),
      0,
      1 - 1 / scale,
    );
  return {
    scale,
    cropX: crop((zoom) => zoom.focus.x),
    cropY: crop((zoom) => zoom.focus.y),
  };
};

export const sameWindow = (a?: StillWindow, b?: StillWindow): boolean =>
  a !== undefined &&
  b !== undefined &&
  a.scale === b.scale &&
  a.cropX === b.cropX &&
  a.cropY === b.cropY;

const phaseIn = (zoom: Zoom, fromMs: number, toMs: number): ZoomSpanKind => {
  const holdStartMs = zoom.startMs + zoom.rampInMs;
  const holdEndMs = holdStartMs + zoom.holdMs;
  const endMs = holdEndMs + zoom.rampOutMs;
  if (toMs <= zoom.startMs || fromMs >= endMs) {
    return 'quiet';
  }
  if (fromMs >= holdStartMs && toMs <= holdEndMs) {
    return 'still';
  }
  return 'moving';
};

export const zoomSpans = (zooms: Zoom[], durationMs: number): ZoomSpan[] => {
  const edges = [
    0,
    durationMs,
    ...zooms.flatMap((zoom) => {
      const holdStartMs = zoom.startMs + zoom.rampInMs;
      return [
        zoom.startMs,
        holdStartMs,
        holdStartMs + zoom.holdMs,
        zoom.startMs + zoomDurationMs(zoom),
      ];
    }),
  ]
    .map((edge) => clamp(edge, 0, durationMs))
    .sort((a, b) => a - b)
    .filter((edge, at, all) => at === 0 || edge > (all[at - 1] ?? 0));

  const classified: ZoomSpan[] = [];
  for (let at = 0; at < edges.length - 1; at += 1) {
    const startMs = edges[at] ?? 0;
    const endMs = edges[at + 1] ?? 0;
    const phases = zooms.map((zoom) => phaseIn(zoom, startMs, endMs));
    const kind: ZoomSpanKind =
      endMs - startMs < minZoomSpanMs || phases.includes('moving')
        ? 'moving'
        : phases.includes('still')
          ? 'still'
          : 'quiet';
    // the window is read here, while the stretch still speaks for one set of
    // holds: a zoom with no ramp at all begins and ends mid stretch, so two
    // held stretches can touch with different windows either side
    classified.push({
      startMs,
      endMs,
      kind,
      ...(kind === 'still'
        ? { window: windowAt(zooms, (startMs + endMs) / 2) }
        : {}),
    });
  }

  // neighbours of one kind read as one stretch, and two held ones only when
  // they hold the very same window
  return classified.reduce<ZoomSpan[]>((spans, span) => {
    const last = spans[spans.length - 1];
    if (
      last &&
      last.kind === span.kind &&
      (span.kind !== 'still' || sameWindow(last.window, span.window))
    ) {
      last.endMs = span.endMs;
      return spans;
    }
    return [...spans, { ...span }];
  }, []);
};

const evenUp = (value: number): number => 2 * Math.ceil(value / 2);

// the frame the moving chain magnifies to, kept even because the chain runs
// in yuv420p
const magnifiedSize = (size: number, scale: number): number =>
  evenDown(size * scale);

// where the moving chain's crop really lands: ffmpeg rounds the expression to
// a whole pixel of that frame, holds the window inside it, then floors it to
// an even one
const movingCropAt = (share: number, frame: number, shown: number): number =>
  evenDown(Math.min(Math.max(Math.round(share * frame), 0), frame - shown));

// What the moving chain shows on one axis: the magnified picture, where inside
// it the window starts, and how much black the canvas puts either side when the
// window reaches past the picture. Only the source can supply `visible`; the
// bars are the canvas's own, and pixels were never there to crop.
type AxisWindow = {
  frame: number;
  movingAt: number;
  visible: number;
  barLow: number;
};

const axisWindow = (
  canvasSize: number,
  scale: number,
  share: number,
  picture?: { size: number; offset: number },
): AxisWindow => {
  const canvasFrame = magnifiedSize(canvasSize, scale);
  if (!picture) {
    return {
      frame: canvasFrame,
      movingAt: movingCropAt(share, canvasFrame, canvasSize),
      visible: canvasSize,
      barLow: 0,
    };
  }
  const frame = evenNear((picture.size * canvasFrame) / canvasSize);
  const padAt = evenDown((picture.offset * frame) / picture.size);
  // the letterboxed moving chain spells the even floor out in its crop, so the
  // window is floored before it is held inside the frame rather than rounded
  const want =
    Math.min(evenDown(share * canvasFrame), canvasFrame - canvasSize) - padAt;
  // Zooms stack, so five held 4x ones aimed at a corner can put the whole
  // window inside a bar. A crop of nothing is not a rectangle ffmpeg will take,
  // so two pixels of picture are always kept: the moving chain shows solid
  // black there and this shows all but two columns of it.
  const barLow = Math.min(Math.max(0, -want), canvasSize - 2);
  const barHigh = Math.min(
    Math.max(0, want + canvasSize - frame),
    canvasSize - 2 - barLow,
  );
  const visible = canvasSize - barLow - barHigh;
  return {
    frame,
    movingAt: Math.min(Math.max(0, want), frame - visible),
    visible,
    barLow,
  };
};

type StillAxis = {
  crop: number;
  cropAt: number;
  scaled: number;
  showAt: number;
};

// how far the source crop may be pulled back, and how much wider it may be
// cut, hunting for the alignment; the pixels this adds are the only extra work
const gridSteps = 48;

// beating the candidate before it by less than this is float noise, and a
// wider crop bought with nothing is just more work
const closer = 1e-6;

// The moving chain rounds against its magnified frame and the still chain has
// to round against the source, so the still crop is pulled back to the even
// source pixel that lands nearest that frame's grid and widened until the
// magnification comes out exact. What the pull back and the widening overhang
// is taken off again by a second crop, which costs nothing.
const stillAxis = (
  shown: number,
  inputSize: number,
  frame: number,
  movingAt: number,
): StillAxis => {
  const gain = frame / inputSize;
  const from = movingAt / gain;
  const to = (movingAt + shown) / gain;

  let cropAt = evenDown(from);
  let showAt = evenNear(movingAt - cropAt * gain);
  let offBy = Math.abs(showAt - (movingAt - cropAt * gain));
  for (let back = 2; offBy > closer && back <= 2 * gridSteps; back += 2) {
    const pulled = evenDown(from) - back;
    if (pulled < 0) {
      break;
    }
    const wanted = movingAt - pulled * gain;
    const near = evenNear(wanted);
    if (Math.abs(near - wanted) < offBy - closer) {
      cropAt = pulled;
      showAt = near;
      offBy = Math.abs(near - wanted);
    }
  }

  const covers = Math.min(evenUp(to - cropAt), evenDown(inputSize - cropAt));
  let crop = covers;
  let scaled = Math.max(evenNear(covers * gain), showAt + shown);
  let wrongBy = Infinity;
  for (let wider = 0; wider <= 2 * gridSteps; wider += 2) {
    const wide = covers + wider;
    const size = evenNear(wide * gain);
    if (cropAt + wide > inputSize) {
      break;
    }
    if (size >= showAt + shown) {
      const off = Math.abs(size - wide * gain) / (wide * gain);
      if (off < wrongBy - closer) {
        crop = wide;
        scaled = size;
        wrongBy = off;
        if (off <= closer) {
          break;
        }
      }
    }
  }

  return { crop, cropAt, scaled, showAt };
};

// the held window cut straight out of the source and scaled up once, rather
// than magnifying the whole frame first: the same rectangle of the source, at
// the same magnification, the moving chain shows either side of the seam
export const stillFilters = (
  window: StillWindow,
  canvas: Canvas,
  input: { width: number; height: number },
  picture?: PictureBox,
): string[] => {
  const across = axisWindow(
    canvas.width,
    window.scale,
    window.cropX,
    picture && { size: picture.pw, offset: picture.ox },
  );
  const down = axisWindow(
    canvas.height,
    window.scale,
    window.cropY,
    picture && { size: picture.ph, offset: picture.oy },
  );
  const x = stillAxis(
    across.visible,
    input.width,
    across.frame,
    across.movingAt,
  );
  const y = stillAxis(down.visible, input.height, down.frame, down.movingAt);
  const overhangs =
    x.showAt > 0 ||
    y.showAt > 0 ||
    x.scaled !== across.visible ||
    y.scaled !== down.visible;
  const barred =
    across.visible !== canvas.width || down.visible !== canvas.height;

  return [
    `crop=${x.crop}:${y.crop}:${x.cropAt}:${y.cropAt}`,
    `scale=${x.scaled}:${y.scaled}:flags=lanczos:out_color_matrix=bt709`,
    // the overhang comes off before the bar goes on: trimming a padded frame
    // either eats the bar or lets the picture spill over it
    ...(overhangs
      ? [`crop=${across.visible}:${down.visible}:${x.showAt}:${y.showAt}`]
      : []),
    ...(barred
      ? [
          `pad=${canvas.width}:${canvas.height}:${across.barLow}:${down.barLow}:color=black`,
        ]
      : []),
  ];
};
