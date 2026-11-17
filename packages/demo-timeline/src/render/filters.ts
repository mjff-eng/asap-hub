import { ClipPlacement } from '../clips';
import { Fade, FadeRamps, resolveFade } from '../fade';
import { Canvas, Clip, Transition } from '../schema';

export const secondsFromMs = (ms: number): string => (ms / 1000).toFixed(3);

// `t-1.500` is what ffmpeg's parser wants and `t--1.500` is not, so a moment
// before the clip start adds instead
export const sinceExpression = (tMs: number): string =>
  tMs < 0 ? `(t+${secondsFromMs(-tMs)})` : `(t-${secondsFromMs(tMs)})`;

export const chain = (filters: string[]): string => filters.join(',');

export const label = (name: string): string => `[${name}]`;

export const graph = (segments: string[]): string => segments.join(';');

export const filterSegment = (
  inputs: string[],
  filters: string[],
  output: string,
): string => `${inputs.map(label).join('')}${chain(filters)}${label(output)}`;

// stamped on every frame so the encoder writes it into the stream: the CLI
// colour flags are silently ignored by some ffmpeg builds, and an untagged
// file is read as bt601 by one tool and bt709 by the next
export const colourTagFilter =
  'setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709';

export const evenDown = (value: number): number => 2 * Math.floor(value / 2);

export const evenNear = (value: number): number => 2 * Math.round(value / 2);

export const fitToCanvasFilters = (canvas: Canvas): string[] => [
  // bt709 named on the way in and stamped on the way out; the even size is
  // asked for out loud so the picture the zoom reads its pixels out of is the
  // one pictureBox predicts rather than whatever the odd size happened to be
  `scale=${canvas.width}:${canvas.height}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos:out_color_matrix=bt709`,
  `pad=${canvas.width}:${canvas.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
  'setsar=1',
  colourTagFilter,
];

// where the picture itself sits inside the canvas, in canvas pixels
export type PictureBox = { pw: number; ph: number; ox: number; oy: number };

// The one definition of the letterbox: what the fit above actually draws, to
// the pixel, so the zoom can read its pixels out of the picture rather than
// out of the bars. Both roundings are ffmpeg's own, measured rather than
// reasoned about: force_divisible_by=2 lands on the nearest even size, past
// the exact fit if that is nearer, and pad silently floors an odd offset to an
// even one under yuv420p's chroma subsampling.
export const pictureBox = (
  source: { width: number; height: number },
  canvas: Canvas,
): PictureBox => {
  const heightLimited =
    source.width * canvas.height <= source.height * canvas.width;
  const pw = heightLimited
    ? evenNear((canvas.height * source.width) / source.height)
    : canvas.width;
  const ph = heightLimited
    ? canvas.height
    : evenNear((canvas.width * source.height) / source.width);
  return {
    pw,
    ph,
    ox: evenDown(Math.trunc((canvas.width - pw) / 2)),
    oy: evenDown(Math.trunc((canvas.height - ph) / 2)),
  };
};

export type VideoFilterContext = { canvas: Canvas; placement: ClipPlacement };

// every filter a clip's own video needs, in chain order; a title card's
// background is generated at canvas size already, so it only needs square pixels
export const videoFilters = ({
  canvas,
  placement,
}: VideoFilterContext): string[] =>
  placement.clip.kind === 'source'
    ? fitToCanvasFilters(canvas)
    : ['setsar=1', colourTagFilter];

// screen recordings are variable frame rate, and concat or xfade over VFR
// desyncs the audio, so every stage one clip is resampled to a constant rate
export const resampleFilter = 'aresample=async=1:first_pts=0';

export const audioSampleRate = 48000;

// concat rewrites the timebase of what it produces, and xfade refuses two
// inputs whose timebases differ, so both sides of a blend are pinned to one
export const timebaseFilter = 'settb=AVTB';

// concat and acrossfade refuse to join streams whose rate, layout or sample
// format differ, and a recording's own audio is often 44.1kHz mono while the
// silence generated for a title card is 48kHz stereo
export const audioFormatFilter = `aformat=sample_fmts=fltp:sample_rates=${audioSampleRate}:channel_layouts=stereo`;

export const clipAudioFilters = (clip: Clip): string[] =>
  clip.kind === 'source' && clip.volume !== 1
    ? [`volume=${clip.volume}`, resampleFilter, audioFormatFilter]
    : [resampleFilter, audioFormatFilter];

// The window the overlay is enabled for, and the effect's own unclipped span
// when a clip shows only a piece of it. The ramps belong to the span: a banner
// cut in half by a boundary keeps one solid edge on each side of it.
export type OverlayWindow = Fade & {
  startMs: number;
  endMs: number;
  spanStartMs?: number;
  spanEndMs?: number;
  // the preview eases its fade out, so by halfway the ring is already faint;
  // a linear fade read heavier for its whole back half
  easedFadeOut?: boolean;
  // the ring expands as it fades, exactly as the preview plays it: the art is
  // drawn crisp at its largest and scaled down per frame, so every size is a
  // downscale rather than a blow up
  grow?: {
    durationMs: number;
    fromScale: number;
    width: number;
    height: number;
  };
};

// a signed distance in pixels: the offset the overlay travels from and back to
export type OverlaySlide = { distancePx: number };

// where the art's own image sits on the canvas, for an overlay rasterised at its
// bounding box rather than over the whole frame
export type OverlayOrigin = { x: number; y: number };

// ffmpeg expressions in t for an overlay that is somewhere different on every
// frame, rather than parked where its own image drew it
export type OverlayMove = { x: string; y: string };

type FadeSpan = { startMs: number; endMs: number };

const fadeSpan = (visible: OverlayWindow): FadeSpan => ({
  startMs: visible.spanStartMs ?? visible.startMs,
  endMs: visible.spanEndMs ?? visible.endMs,
});

export const overlayFadeRamps = (visible: OverlayWindow): FadeRamps => {
  const span = fadeSpan(visible);
  return resolveFade(visible, span.endMs - span.startMs);
};

type FadeRamp = { type: 'in' | 'out'; fromMs: number; durationMs: number };

// each ramp sits at the effect's own end, and a ramp the clip never reaches is
// dropped rather than dragged inside it
const fadeRampsOf = (visible: OverlayWindow): FadeRamp[] => {
  const span = fadeSpan(visible);
  const { inMs, outMs } = overlayFadeRamps(visible);
  return [
    ...(inMs > 0
      ? [{ type: 'in' as const, fromMs: span.startMs, durationMs: inMs }]
      : []),
    ...(outMs > 0
      ? [
          {
            type: 'out' as const,
            fromMs: span.endMs - outMs,
            durationMs: outMs,
          },
        ]
      : []),
  ].filter(
    (ramp) =>
      ramp.fromMs + ramp.durationMs > visible.startMs &&
      ramp.fromMs < visible.endMs,
  );
};

// ffmpeg refuses a negative fade st, so a ramp that began before frame 0 is
// written on a clock rolled forward far enough to hold it and trimmed back off
export const overlayPreRollMs = (visible: OverlayWindow): number =>
  Math.max(0, ...fadeRampsOf(visible).map((ramp) => -ramp.fromMs));

const growExpression = (visible: OverlayWindow): string | undefined => {
  const { grow } = visible;
  if (!grow) {
    return undefined;
  }
  const fromMs =
    (visible.spanStartMs ?? visible.startMs) + overlayPreRollMs(visible);
  const progress = `clip(${sinceExpression(fromMs)}/${secondsFromMs(
    grow.durationMs,
  )},0,1)`;
  // the preview's css ease-out, near enough: fast out of the click, easing in
  // to full size
  return `${grow.fromScale.toFixed(4)}+${(1 - grow.fromScale).toFixed(
    4,
  )}*(1-pow(1-${progress},2))`;
};

export const overlayGrowFilters = (visible: OverlayWindow): string[] => {
  const factor = growExpression(visible);
  return factor
    ? [
        `scale=w='ceil(iw*(${factor}))':h='ceil(ih*(${factor}))':eval=frame:flags=lanczos`,
      ]
    : [];
};

const overlayFadeFilters = (visible: OverlayWindow): string[] => {
  const ramps = fadeRampsOf(visible);
  const preRollMs = overlayPreRollMs(visible);
  return [
    ...ramps.flatMap((ramp) => {
      const fade = `fade=t=${ramp.type}:st=${secondsFromMs(
        ramp.fromMs + preRollMs,
      )}:d=${secondsFromMs(ramp.durationMs)}:alpha=1`;
      // two linear fades multiply into the (1-p)^2 the preview's ease-out
      // opacity traces
      return visible.easedFadeOut && ramp.type === 'out'
        ? [fade, fade]
        : [fade];
    }),
    ...(preRollMs > 0
      ? [`trim=start=${secondsFromMs(preRollMs)}`, 'setpts=PTS-STARTPTS']
      : []),
  ];
};

// The fades run in rgba where the alpha lives; the conversion to video colour
// happens here, once, with the matrix said out loud: left to the overlay's
// auto scaler it used bt601 and shifted every drawn colour, and it subsampled
// the art's chroma to 2x2 blocks on the way.
// eval=frame so the pass-through size follows a growing overlay per frame:
// left at init it froze every later frame to the first frame's dimensions
const overlayColourFilters = [
  'scale=flags=accurate_rnd:out_color_matrix=bt709:eval=frame',
  'format=yuva444p',
];

export const overlayInputFilters = (visible?: OverlayWindow): string[] =>
  visible
    ? [
        'format=rgba',
        ...overlayGrowFilters(visible),
        ...overlayFadeFilters(visible),
        ...overlayColourFilters,
      ]
    : ['format=rgba', ...overlayColourFilters];

// the preset draws itself at the right place on a canvas sized PNG, so the
// overlay always composites at the origin
export const overlayOrigin = '0:0';

// ramps the whole overlay from distancePx to zero over the fade in, holds it in
// place, then ramps back out; min and max clamp each ramp to its own window
const slideExpression = (
  distancePx: number,
  span: FadeSpan,
  { inMs, outMs }: FadeRamps,
): string =>
  `${distancePx}*(1-min(1,max(0,${sinceExpression(
    span.startMs,
  )}/${secondsFromMs(inMs)}))+min(1,max(0,${sinceExpression(
    span.endMs - outMs,
  )}/${secondsFromMs(outMs)})))`;

const shifted = (offset: number, expression: string): string =>
  offset === 0 ? expression : `${offset}+(${expression})`;

const overlayPosition = (
  visible: OverlayWindow,
  slide: OverlaySlide | undefined,
  move: OverlayMove | undefined,
  { x, y }: OverlayOrigin,
): string => {
  // a growing overlay stays centred on the click while its frame changes size
  const { grow } = visible;
  const atX = grow ? `${x}+(${grow.width}-w)/2` : undefined;
  const atY = grow ? `${y}+(${grow.height}-h)/2` : undefined;
  if (move) {
    return atX && atY
      ? `x='${atX}+(${move.x})':y='${atY}+(${move.y})'`
      : `x='${shifted(x, move.x)}':y='${shifted(y, move.y)}'`;
  }
  if (atX && atY) {
    return `x='${atX}':y='${atY}'`;
  }
  const ramps = overlayFadeRamps(visible);
  return slide && ramps.inMs > 0 && ramps.outMs > 0
    ? `x=${x}:y='${shifted(
        y,
        slideExpression(slide.distancePx, fadeSpan(visible), ramps),
      )}'`
    : `${x}:${y}`;
};

export const overlayFilter = (
  visible?: OverlayWindow,
  slide?: OverlaySlide,
  move?: OverlayMove,
  origin: OverlayOrigin = { x: 0, y: 0 },
): string =>
  visible
    ? `overlay=${overlayPosition(
        visible,
        slide,
        move,
        origin,
      )}:format=yuv444:enable='between(t,${secondsFromMs(
        visible.startMs,
      )},${secondsFromMs(visible.endMs)})'`
    : `overlay=${overlayOrigin}:format=yuv444`;

const xfadeNames: Record<Exclude<Transition['type'], 'cut'>, string> = {
  crossfade: 'fade',
  slide: 'slideleft',
};

export const xfadeTransition = (transition: Transition | undefined): string =>
  transition && transition.type !== 'cut'
    ? xfadeNames[transition.type]
    : xfadeNames.crossfade;
