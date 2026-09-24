import { edgeFor, resolveCursorColor } from '../cursorColors';
import { PresetCanvas, svgDocument } from '../presets';
import { CursorEffect, Point } from '../schema';

// how long each effect stays on screen, the same windows the preview plays
export const rippleDurationMs = 600;
export const spotlightDurationMs = 1200;

// the preview cuts the scrim in and out, which reads as a flash once it is
// burnt into the picture, so the render ramps it
export const spotlightFadeMs = 200;

// the ring expands from a spot to over twice its size as it fades, the same
// travel the preview's css animation makes
export const rippleFromScale = 0.4;
export const rippleToScale = 2.2;

export type CursorArtInput = {
  point: Point;
  canvas: PresetCanvas;
  color?: string;
};

// where the art sits on the canvas and how big it is, so the overlay composites
// only the pixels it draws on
export type ArtBox = { x: number; y: number; width: number; height: number };

// every size is a fraction of the canvas, so a click looks the same at 1080p
// and at 4K
// the preview's animation starts the whole ring at 0.85, so the art carries
// that baseline in its own opacities rather than ever compositing at full
const rippleStyle = {
  diameter: 0.09,
  strokeWidth: 0.004,
  startOpacity: 0.85,
  fillOpacity: 0.18,
} as const;

const spotlightStyle = {
  scrim: '#000000',
  scrimOpacity: 0.55,
  clearStop: 0.08,
  scrimStop: 0.26,
} as const;

const rippleRadius = (canvas: PresetCanvas): number =>
  Math.round((canvas.width * rippleStyle.diameter) / 2);

const rippleStroke = (canvas: PresetCanvas): number =>
  Math.max(1, Math.round(canvas.height * rippleStyle.strokeWidth));

// The ring is about a tenth of the frame across, so drawing it on a canvas sized
// image cost a full frame composite per click: 60 of them on a 3s clip measured
// 49.0s of ffmpeg. This is the box it actually covers, one stroke out for the
// dark edge and half of one again because a stroke straddles its own path.
export const rippleBox = ({ point, canvas }: CursorArtInput): ArtBox => {
  // drawn crisp at the animation's largest size and scaled DOWN per frame, so
  // every size of the ring is a downscale rather than a blow up
  const reach = Math.ceil(
    (rippleRadius(canvas) + rippleStroke(canvas) * 2) * rippleToScale,
  );
  return {
    x: Math.round(point.x * canvas.width) - reach,
    y: Math.round(point.y * canvas.height) - reach,
    width: reach * 2,
    height: reach * 2,
  };
};

export const rippleSvg = ({ point, canvas, color }: CursorArtInput): string => {
  const radius = Math.round(rippleRadius(canvas) * rippleToScale);
  const strokeWidth = Math.max(
    1,
    Math.round(rippleStroke(canvas) * rippleToScale),
  );
  const ink = resolveCursorColor(color);
  const box = rippleBox({ point, canvas });
  const centre = box.width / 2;

  // the dark edge sits just outside the ring, so a white click stays readable on
  // a white page and a coloured one stays readable on its own colour
  const edge = edgeFor(ink);

  const at = (value: number): string =>
    (value * rippleStyle.startOpacity).toFixed(3);
  return svgDocument(box, [
    `<circle cx="${centre}" cy="${centre}" r="${
      radius + strokeWidth
    }" fill="none" stroke="${edge.color}" stroke-opacity="${at(
      edge.opacity,
    )}" stroke-width="${strokeWidth}"/>`,
    `<circle cx="${centre}" cy="${centre}" r="${radius}" fill="${ink}" fill-opacity="${at(
      rippleStyle.fillOpacity,
    )}" stroke="${ink}" stroke-opacity="${at(
      1,
    )}" stroke-width="${strokeWidth}"/>`,
  ]);
};

// a css radial-gradient measures its stops against the distance to the farthest
// corner, so the svg gradient is given that same radius
const farthestCornerPx = (point: Point, canvas: PresetCanvas): number => {
  const x = point.x * canvas.width;
  const y = point.y * canvas.height;
  return Math.max(
    ...[0, canvas.width].flatMap((cornerX) =>
      [0, canvas.height].map((cornerY) => Math.hypot(cornerX - x, cornerY - y)),
    ),
  );
};

export const spotlightSvg = ({ point, canvas }: CursorArtInput): string => {
  const cx = Math.round(point.x * canvas.width);
  const cy = Math.round(point.y * canvas.height);
  const radius = Math.round(farthestCornerPx(point, canvas));

  return svgDocument(canvas, [
    `<defs><radialGradient id="spotlight" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${radius}"><stop offset="${spotlightStyle.clearStop}" stop-color="${spotlightStyle.scrim}" stop-opacity="0"/><stop offset="${spotlightStyle.scrimStop}" stop-color="${spotlightStyle.scrim}" stop-opacity="${spotlightStyle.scrimOpacity}"/></radialGradient></defs>`,
    `<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="url(#spotlight)"/>`,
  ]);
};

export type CursorArt = ArtBox & {
  svg: string;
  durationMs: number;
  fadeInMs: number;
  fadeOutMs: number;
  easedFadeOut?: boolean;
  grow?: { durationMs: number; fromScale: number };
};

// the zoom effect is a marker the editor materialises into a Zoom of its own,
// so it has no art to draw
export const cursorArt = (
  effect: CursorEffect,
  canvas: PresetCanvas,
): CursorArt | undefined => {
  const input = { point: effect.point, canvas, color: effect.color };
  if (effect.type === 'ripple') {
    // the ring expands as it fades, the very animation the preview plays
    return {
      svg: rippleSvg(input),
      ...rippleBox(input),
      durationMs: rippleDurationMs,
      fadeInMs: 0,
      fadeOutMs: rippleDurationMs,
      easedFadeOut: true,
      grow: {
        durationMs: rippleDurationMs,
        fromScale: rippleFromScale / rippleToScale,
      },
    };
  }
  return effect.type === 'spotlight'
    ? {
        // the scrim darkens everything the click is not on, so its box is the
        // whole frame however small the clear centre is
        svg: spotlightSvg(input),
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
        durationMs: spotlightDurationMs,
        fadeInMs: spotlightFadeMs,
        fadeOutMs: spotlightFadeMs,
      }
    : undefined;
};
