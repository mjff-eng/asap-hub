import { blockHeight, stackLines } from './layout';
import {
  charactersPerLine,
  GlyphWidth,
  svgTextElement,
  wrapText,
} from './text';

// a heading with an optional subtitle beneath it, centred inside a box: the
// shape every preset draws, differing only in its faces, colours and box

export type TextRun = {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  glyph: GlyphWidth;
  maxLines: number;
};

export type TextBlockInput = {
  heading: TextRun;
  subtitle?: TextRun;
  // the region the block is centred in, in canvas coordinates
  box: { y: number; height: number };
  widthPx: number;
  // only applied when there is a subtitle to separate from the heading
  gapPx: number;
  x: number;
  anchor: 'start' | 'middle';
};

const linesOf = (run: TextRun, widthPx: number): string[] =>
  wrapText(
    run.text,
    charactersPerLine(widthPx, run.fontSize, run.glyph),
    run.maxLines,
  );

const drawRun = (
  run: TextRun,
  lines: string[],
  topY: number,
  { x, anchor }: Pick<TextBlockInput, 'x' | 'anchor'>,
): string[] =>
  stackLines(lines, run.fontSize, topY).map((line) =>
    svgTextElement({
      text: line.text,
      x,
      y: line.baseline,
      fontFamily: run.fontFamily,
      fontSize: run.fontSize,
      fontWeight: run.fontWeight,
      fill: run.fill,
      anchor,
    }),
  );

export const textBlockElements = (input: TextBlockInput): string[] => {
  const { heading, subtitle, box, widthPx, gapPx } = input;

  const headingLines = linesOf(heading, widthPx);
  const subtitleLines = subtitle ? linesOf(subtitle, widthPx) : [];

  const gap = subtitleLines.length > 0 ? gapPx : 0;
  const headingHeight = blockHeight(headingLines.length, heading.fontSize);
  const total =
    headingHeight +
    gap +
    blockHeight(subtitleLines.length, subtitle?.fontSize ?? 0);
  const top = box.y + (box.height - total) / 2;

  return [
    ...drawRun(heading, headingLines, top, input),
    ...(subtitle
      ? drawRun(subtitle, subtitleLines, top + headingHeight + gap, input)
      : []),
  ];
};
