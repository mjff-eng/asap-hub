// the cap height of the stacks used sits at roughly this fraction of the em box,
// so a baseline this far below the line top reads as vertically centred
export const ascentRatio = 0.82;

export const lineHeightRatio = 1.2;

export type StackedLine = { text: string; baseline: number };

export const blockHeight = (lineCount: number, fontSize: number): number =>
  lineCount * fontSize * lineHeightRatio;

export const stackLines = (
  lines: string[],
  fontSize: number,
  topY: number,
): StackedLine[] =>
  lines.map((text, index) => ({
    text,
    baseline: Math.round(
      topY + index * fontSize * lineHeightRatio + fontSize * ascentRatio,
    ),
  }));
