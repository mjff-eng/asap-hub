import { TitlePreset } from '../schema';
import {
  PresetCanvas,
  sansFontFamily,
  serifFontFamily,
  svgDocument,
} from './text';
import { textBlockElements } from './textBlock';

// every size is a fraction of the canvas height, so a card looks the same at
// 1080p and at 4K
export const titleCardBackground = '#0b0b0f';

const centered = {
  background: titleCardBackground,
  heading: '#ffffff',
  subtitle: '#b9b9c4',
  headingSize: 0.09,
  headingWeight: 600,
  subtitleSize: 0.036,
  subtitleWeight: 400,
  gap: 0.035,
  textWidth: 0.78,
  headingLines: 3,
  subtitleLines: 2,
} as const;

const presets: Record<TitlePreset, typeof centered> = { centered };

export type TitleCardInput = {
  preset: TitlePreset;
  text: string;
  subtitle?: string;
  canvas: PresetCanvas;
};

export const titleCardSvg = ({
  preset,
  text,
  subtitle,
  canvas,
}: TitleCardInput): string => {
  const style = presets[preset];

  return svgDocument(canvas, [
    `<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${style.background}"/>`,
    ...textBlockElements({
      heading: {
        text,
        fontFamily: serifFontFamily,
        fontSize: Math.round(canvas.height * style.headingSize),
        fontWeight: style.headingWeight,
        fill: style.heading,
        glyph: 'serif',
        maxLines: style.headingLines,
      },
      subtitle: subtitle
        ? {
            text: subtitle,
            fontFamily: sansFontFamily,
            fontSize: Math.round(canvas.height * style.subtitleSize),
            fontWeight: style.subtitleWeight,
            fill: style.subtitle,
            glyph: 'sans',
            maxLines: style.subtitleLines,
          }
        : undefined,
      box: { y: 0, height: canvas.height },
      widthPx: canvas.width * style.textWidth,
      gapPx: Math.round(canvas.height * style.gap),
      x: Math.round(canvas.width / 2),
      anchor: 'middle',
    }),
  ]);
};
