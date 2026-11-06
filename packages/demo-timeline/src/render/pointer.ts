import { CursorPointerTrack } from '../cursor/pointer';
import {
  PointerLayer,
  pointerBox,
  pointerLayers,
  pointerPad,
  PointerVariant,
  pointerVariant,
} from '../cursor/pointerArt';
import { PresetCanvas, svgDocument } from '../presets';
import { CursorPathPoint } from '../schema';
import { secondsFromMs, sinceExpression } from './filters';
import { onZoomedFrame, ZoomExpressions } from './zoom';

export type PointerArtInput = {
  canvas: PresetCanvas;
  variant?: string;
  color?: string;
};

export const pointerScale = (
  variant: PointerVariant,
  canvas: PresetCanvas,
): number => (canvas.height * variant.heightRatio) / variant.height;

// The point inside the sprite the overlay has to aim: the part of the shape that
// does the pointing, one halo in from the corner so nothing is clipped.
export const pointerHotspotPx = ({
  canvas,
  variant,
}: PointerArtInput): { x: number; y: number } => {
  const chosen = pointerVariant(variant);
  const scale = pointerScale(chosen, canvas);
  const pad = pointerPad(chosen);
  return {
    x: Math.round((chosen.hotspot.x + pad) * scale),
    y: Math.round((chosen.hotspot.y + pad) * scale),
  };
};

const attribute = (name: string, value?: string | number): string =>
  value === undefined ? '' : ` ${name}="${value}"`;

const pathElement = (layer: PointerLayer): string =>
  `<path d="${layer.d}"${attribute('fill-rule', layer.fillRule)}${attribute(
    'fill',
    layer.fill,
  )}${attribute('fill-opacity', layer.fillOpacity)}${attribute(
    'stroke',
    layer.stroke,
  )}${attribute('stroke-opacity', layer.strokeOpacity)}${attribute(
    'stroke-width',
    layer.strokeWidth,
  )} stroke-linejoin="round" stroke-linecap="round"/>`;

// the sprite is a few percent of the frame, so it is drawn at its own size and
// walked around the canvas rather than being a canvas sized image that moves
export const pointerSizePx = ({
  canvas,
  variant,
}: PointerArtInput): { width: number; height: number } => {
  const chosen = pointerVariant(variant);
  const scale = pointerScale(chosen, canvas);
  const box = pointerBox(chosen);
  return {
    width: Math.ceil(box.width * scale),
    height: Math.ceil(box.height * scale),
  };
};

export const pointerSvg = ({
  canvas,
  variant,
  color,
}: PointerArtInput): string => {
  const chosen = pointerVariant(variant);
  const scale = pointerScale(chosen, canvas);
  const origin = Math.round(pointerPad(chosen) * scale);

  return svgDocument(pointerSizePx({ canvas, variant }), [
    `<g transform="translate(${origin},${origin}) scale(${scale.toFixed(5)})">`,
    ...pointerLayers(chosen, color).map(pathElement),
    '</g>',
  ]);
};

// The track as a sum of ramps, each clamped to its own segment. It is flat rather
// than nested, so a long capture does not build an expression ffmpeg has to
// recurse through per frame, and it reproduces the track exactly, which is the
// same track the preview reads. The bend lives in the track, not in here: a
// per-segment cubic would need a gate and three powers per term and would treble
// the filtergraph for a curve the track already carries to within a few pixels.
const axisExpression = (
  track: CursorPointerTrack,
  valueOf: (point: CursorPathPoint) => number,
): string => {
  const pixels = track.map((point) => Math.round(valueOf(point)));
  const start = pixels[0];
  if (start === undefined) {
    return '0';
  }

  const terms = track.flatMap((point, index) => {
    const previous = track[index - 1];
    const from = pixels[index - 1];
    const to = pixels[index];
    if (!previous || from === undefined || to === undefined) {
      return [];
    }
    const spanMs = point.tMs - previous.tMs;
    const step = to - from;
    return spanMs <= 0 || step === 0
      ? []
      : [
          `${step > 0 ? '+' : '-'}${Math.abs(step)}*clip(${sinceExpression(
            previous.tMs,
          )}/${secondsFromMs(spanMs)},0,1)`,
        ];
  });

  return `${start}${terms.join('')}`;
};

export type PointerMotion = {
  x: string;
  y: string;
  startMs: number;
  endMs: number;
};

// The pointer walks the picture, not the frame the picture is drawn on: with a
// zoom running it is carried through the same window the picture is cropped to,
// so it stays on whatever it was pointing at. Only where it is drawn moves; the
// shape keeps its size, the way a real pointer does over a magnified page.
const axis = (
  track: CursorPointerTrack,
  size: number,
  hotspot: number,
  read: (point: CursorPathPoint) => number,
  zoom: { crop: string; scale: string } | undefined,
): string =>
  zoom
    ? `${onZoomedFrame(
        axisExpression(track, (point) => read(point) * size),
        size,
        zoom.crop,
        zoom.scale,
      )}-${hotspot}`
    : axisExpression(track, (point) => read(point) * size - hotspot);

// nothing to draw for a clip with no capture, or one whose capture lands wholly
// outside it, which is the same nothing the preview shows
export const pointerMotion = (
  track: CursorPointerTrack,
  { canvas, variant }: PointerArtInput,
  durationMs: number,
  zoom?: ZoomExpressions,
): PointerMotion | undefined => {
  const first = track[0];
  const last = track[track.length - 1];
  if (!first || !last) {
    return undefined;
  }

  const startMs = Math.max(0, first.tMs);
  const endMs = Math.min(durationMs, last.tMs);
  if (endMs <= startMs) {
    return undefined;
  }

  const hotspot = pointerHotspotPx({ canvas, variant });
  return {
    startMs,
    endMs,
    x: axis(
      track,
      canvas.width,
      hotspot.x,
      (point) => point.x,
      zoom && { crop: zoom.cropX, scale: zoom.scale },
    ),
    y: axis(
      track,
      canvas.height,
      hotspot.y,
      (point) => point.y,
      zoom && { crop: zoom.cropY, scale: zoom.scale },
    ),
  };
};
