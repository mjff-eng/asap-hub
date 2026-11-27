export const lineHeight = 24;
export const perRem = 16;

// Despite the name, returns em: relative to the parent element's font size.
// Use remUnit for sizes that should only follow the root font size.
export const rem = (value: number): `${number}em` => `${value / perRem}em`;

// Returns rem: relative to the root font size, which follows the browser font size setting,
// so the result does not depend on the font size of the parent element.
export const remUnit = (value: number): `${number}rem` =>
  `${value / perRem}rem`;

// A unitless line height scales with the font size the element ends up with,
// including when the browser raises it to its minimum font size.
export const unitlessLineHeight = (
  fontSizePx: number,
  lineHeightPx: number,
): number => lineHeightPx / fontSizePx;

export const formTargetWidth = 354;
