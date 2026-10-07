// A click ring is drawn over whatever the creator was demoing, which is often a
// white page, so the colour is theirs to choose. Whichever they pick, the ring
// carries a dark outer edge as well: one colour cannot sit on every background,
// and a white ring on a white page is invisible without it.
export const cursorColors = [
  { id: 'white', label: 'White', hex: '#ffffff' },
  { id: 'black', label: 'Black', hex: '#000000' },
  { id: 'amber', label: 'Amber', hex: '#ffb300' },
  { id: 'red', label: 'Red', hex: '#ff3b30' },
  { id: 'green', label: 'Green', hex: '#34c759' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'magenta', label: 'Magenta', hex: '#e040fb' },
] as const;

export const defaultCursorColor = '#ffffff';

// the edge is what makes a ring readable on a background of its own colour, so
// it flips for a dark ring: black on black needs a light edge, not another dark
// one
export const cursorEdge = '#000000';
export const cursorEdgeOpacity = 0.45;

const darkInks = new Set(['#000000']);

export const edgeFor = (hex: string): { color: string; opacity: number } =>
  darkInks.has(hex.toLowerCase())
    ? { color: '#ffffff', opacity: 0.75 }
    : { color: cursorEdge, opacity: cursorEdgeOpacity };

export const isCursorColor = (value: string): boolean =>
  /^#[0-9a-f]{6}$/i.test(value);

// anything saved before the picker existed, or anything that is not a colour at
// all, falls back rather than reaching the SVG as an attribute of its own
export const resolveCursorColor = (color?: string): string =>
  color && isCursorColor(color) ? color : defaultCursorColor;
