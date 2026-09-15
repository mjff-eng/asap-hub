import { BannerPreset } from '../schema';
import { blockHeight } from './layout';
import {
  charactersPerLine,
  PresetCanvas,
  sansFontFamily,
  svgDocument,
  wrapText,
} from './text';
import { textBlockElements } from './textBlock';

// The very scrim the preview draws: a gradient rising from the frame edge,
// solid under the words and gone by the top of the band, never a flat slab.
// Every size is a fraction of the canvas so a banner looks the same at 1080p
// and at 4K; the paddings follow the width, as the preview's percentage
// paddings do.
const lowerThird = {
  scrim: '#000000',
  // the preview's gradient: 0.78 at the frame edge, 0.45 at 60% of the band,
  // nothing at its top
  scrimEdge: 0.78,
  scrimMid: 0.45,
  scrimMidStop: 0.6,
  heading: '#ffffff',
  // white at the preview's 0.92, said as a colour so every renderer agrees
  subtitle: '#ebebeb',
  paddingX: 0.06,
  paddingY: 0.04,
  headingSize: 0.048,
  headingWeight: 700,
  subtitleSize: 0.028,
  subtitleWeight: 500,
  gap: 0.008,
  headingLines: 2,
  subtitleLines: 1,
} as const;

const presets: Record<BannerPreset, typeof lowerThird> = { lowerThird };

export type BannerPosition = 'top' | 'bottom';

export type BannerBand = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const bandHeightPx = (
  preset: BannerPreset,
  canvas: PresetCanvas,
  headingLineCount: number,
  subtitleLineCount: number,
): number => {
  const style = presets[preset];
  const paddingY = Math.round(canvas.width * style.paddingY);
  const headingPx = Math.round(canvas.height * style.headingSize);
  const subtitlePx = Math.round(canvas.height * style.subtitleSize);
  return Math.round(
    paddingY * 2 +
      blockHeight(headingLineCount, headingPx) +
      (subtitleLineCount > 0
        ? Math.round(canvas.height * style.gap) +
          blockHeight(subtitleLineCount, subtitlePx)
        : 0),
  );
};

// the nominal band, one line of each face: what the slide travels against and
// what the editor lanes size themselves by
export const bannerBand = (
  preset: BannerPreset,
  position: BannerPosition,
  canvas: PresetCanvas,
): BannerBand => {
  const height = bandHeightPx(preset, canvas, 1, 1);
  return {
    x: 0,
    y: position === 'bottom' ? canvas.height - height : 0,
    width: canvas.width,
    height,
  };
};

export type BannerInput = {
  preset: BannerPreset;
  text: string;
  subtitle?: string;
  position: BannerPosition;
  canvas: PresetCanvas;
};

export const bannerSvg = ({
  preset,
  text,
  subtitle,
  position,
  canvas,
}: BannerInput): string => {
  const style = presets[preset];
  const paddingX = Math.round(canvas.width * style.paddingX);
  const widthPx = canvas.width - paddingX * 2;
  const headingPx = Math.round(canvas.height * style.headingSize);
  const subtitlePx = Math.round(canvas.height * style.subtitleSize);

  // the band hugs its own words, as the preview's content-sized box does, so
  // a one line banner never drops a third of the frame into shadow
  const headingLineCount = wrapText(
    text,
    charactersPerLine(widthPx, headingPx, 'sans'),
    style.headingLines,
  ).length;
  const height = bandHeightPx(
    preset,
    canvas,
    headingLineCount,
    subtitle ? 1 : 0,
  );
  const y = position === 'bottom' ? canvas.height - height : 0;

  // the gradient runs from the frame edge the band sits against
  const [fromY, toY] =
    position === 'bottom' ? [y + height, y] : [y, y + height];

  return svgDocument(canvas, [
    `<defs><linearGradient id="scrim" gradientUnits="userSpaceOnUse" x1="0" y1="${fromY}" x2="0" y2="${toY}"><stop offset="0" stop-color="${style.scrim}" stop-opacity="${style.scrimEdge}"/><stop offset="${style.scrimMidStop}" stop-color="${style.scrim}" stop-opacity="${style.scrimMid}"/><stop offset="1" stop-color="${style.scrim}" stop-opacity="0"/></linearGradient></defs>`,
    `<rect x="0" y="${y}" width="${canvas.width}" height="${height}" fill="url(#scrim)"/>`,
    ...textBlockElements({
      heading: {
        text,
        fontFamily: sansFontFamily,
        fontSize: headingPx,
        fontWeight: style.headingWeight,
        fill: style.heading,
        glyph: 'sans',
        maxLines: style.headingLines,
      },
      subtitle: subtitle
        ? {
            text: subtitle,
            fontFamily: sansFontFamily,
            fontSize: subtitlePx,
            fontWeight: style.subtitleWeight,
            fill: style.subtitle,
            glyph: 'sans',
            maxLines: style.subtitleLines,
          }
        : undefined,
      box: { y, height },
      widthPx,
      gapPx: Math.round(canvas.height * style.gap),
      x: paddingX,
      anchor: 'start',
    }),
  ]);
};
