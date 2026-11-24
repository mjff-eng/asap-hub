import type { Product } from './theme';

export type CasBreakpoint =
  | 'mobile'
  | 'tablet'
  | 'laptop'
  | 'desktopL'
  | 'desktopXL';

export const casBreakpoints: Record<CasBreakpoint, number> = {
  mobile: 320,
  tablet: 641,
  laptop: 1025,
  desktopL: 1281,
  desktopXL: 1920,
};

export type CasGrid = {
  readonly margin: number;
  readonly maxWidth: number | null;
  readonly columns: number;
  readonly columnWidth: number;
  readonly gutter: number;
};

const mobileGrid: CasGrid = {
  margin: 24,
  maxWidth: null,
  columns: 4,
  columnWidth: 80,
  gutter: 8,
};

const gp2DesktopGrid: CasGrid = {
  margin: 56,
  maxWidth: 900,
  columns: 12,
  columnWidth: 53,
  gutter: 24,
};

export const casGrid: Record<Product, Record<CasBreakpoint, CasGrid>> = {
  crn: {
    mobile: mobileGrid,
    tablet: {
      margin: 56,
      maxWidth: 688,
      columns: 8,
      columnWidth: 72,
      gutter: 16,
    },
    laptop: {
      margin: 68,
      maxWidth: 888,
      columns: 12,
      columnWidth: 52,
      gutter: 24,
    },
    desktopL: {
      margin: 76,
      maxWidth: 1032,
      columns: 12,
      columnWidth: 64,
      gutter: 24,
    },
    desktopXL: {
      margin: 100,
      maxWidth: 1464,
      columns: 12,
      columnWidth: 100,
      gutter: 24,
    },
  },
  gp2: {
    mobile: mobileGrid,
    tablet: {
      margin: 56,
      maxWidth: 900,
      columns: 8,
      columnWidth: 98.5,
      gutter: 16,
    },
    laptop: gp2DesktopGrid,
    desktopL: gp2DesktopGrid,
    desktopXL: gp2DesktopGrid,
  },
};

export const casContentMaxWidth = 900;

export const casTextMaxWidth = '70ch';

export const casTileMinWidth = 720;

export const casSidenav = {
  open: 256,
  closed: 72,
} as const;

export type CasHeader = {
  readonly height: number;
  readonly accentBar: number;
};

export const casHeader: Record<Product, CasHeader> = {
  crn: { height: 80, accentBar: 0 },
  gp2: { height: 80, accentBar: 4 },
};
