export type PresetCanvas = { width: number; height: number };

// exported so the container can install the same faces the browser preview uses
// Roboto leads because it is the face the app itself loads; the render
// container installs it, so the export sets the very glyphs the preview shows
export const sansFontFamily =
  "Roboto, Inter, 'Helvetica Neue', Arial, sans-serif";
export const serifFontFamily =
  "'Source Serif Pro', Georgia, 'Times New Roman', serif";

// SVG cannot wrap text, so lines are measured with an average glyph advance:
// the mean advance of the latin lowercase set is close to half the font size
export const averageGlyphWidth = { serif: 0.5, sans: 0.52 } as const;

export type GlyphWidth = keyof typeof averageGlyphWidth;

const xmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeXml = (text: string): string =>
  text.replace(/[&<>"']/g, (character) => xmlEntities[character] ?? character);

export const charactersPerLine = (
  widthPx: number,
  fontSizePx: number,
  glyph: GlyphWidth,
): number =>
  Math.max(1, Math.floor(widthPx / (fontSizePx * averageGlyphWidth[glyph])));

const ellipsis = '...';

const truncateLine = (line: string, maxCharacters: number): string =>
  `${line
    .slice(0, Math.max(0, maxCharacters - ellipsis.length))
    .trimEnd()}${ellipsis}`;

const breakLongWord = (word: string, maxCharacters: number): string[] =>
  word.length <= maxCharacters
    ? [word]
    : [
        word.slice(0, maxCharacters),
        ...breakLongWord(word.slice(maxCharacters), maxCharacters),
      ];

const packWords = (words: string[], maxCharacters: number): string[] =>
  words.reduce<string[]>((lines, word) => {
    const last = lines.at(-1);
    return last !== undefined && last.length + 1 + word.length <= maxCharacters
      ? [...lines.slice(0, -1), `${last} ${word}`]
      : [...lines, word];
  }, []);

export const wrapText = (
  text: string,
  maxCharacters: number,
  maxLines: number,
): string[] => {
  // a line has to hold at least one character, or breaking a long word never ends
  const width = Math.max(1, Math.floor(maxCharacters));

  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .flatMap((word) => breakLongWord(word, width));

  const lines = packWords(words, width);
  if (lines.length <= maxLines) {
    return lines;
  }

  const kept = lines.slice(0, maxLines);
  const last = kept.at(-1) ?? '';
  return [...kept.slice(0, -1), truncateLine(last, width)];
};

export type SvgTextLine = {
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  anchor: 'start' | 'middle';
};

export const svgTextElement = (line: SvgTextLine): string =>
  `<text x="${line.x}" y="${line.y}" font-family="${
    line.fontFamily
  }" font-size="${line.fontSize}" font-weight="${line.fontWeight}" fill="${
    line.fill
  }" text-anchor="${line.anchor}">${escapeXml(line.text)}</text>`;

export const svgDocument = (canvas: PresetCanvas, children: string[]): string =>
  [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`,
    ...children.map((child) => `  ${child}`),
    '</svg>',
  ].join('\n');
