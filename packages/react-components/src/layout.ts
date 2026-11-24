import { css, SerializedStyles } from '@emotion/react';
import {
  CasBreakpoint,
  casBreakpoints,
  casContentMaxWidth,
  CasGrid,
  casTextMaxWidth,
  casTileMinWidth,
  casGrid,
} from './cas-layout';
import type { Product } from './theme';
import { perRem, rem, remUnit } from './pixels';

export type MediaBreakpoint = Exclude<CasBreakpoint, 'mobile'>;

const mediaBreakpoints: ReadonlyArray<MediaBreakpoint> = [
  'tablet',
  'laptop',
  'desktopL',
  'desktopXL',
];

const minWidth = (breakpoint: MediaBreakpoint) =>
  `(min-width: ${casBreakpoints[breakpoint] / perRem}em)`;

const byBreakpoint = (query: (breakpoint: MediaBreakpoint) => string) =>
  Object.fromEntries(
    mediaBreakpoints.map((breakpoint) => [breakpoint, query(breakpoint)]),
  ) as Record<MediaBreakpoint, string>;

export const mediaCondition = {
  from: byBreakpoint(minWidth),
  below: byBreakpoint((breakpoint) => `not all and ${minWidth(breakpoint)}`),
};

export const mediaFrom = byBreakpoint(
  (breakpoint) => `@media ${mediaCondition.from[breakpoint]}`,
);

export const mediaBelow = byBreakpoint(
  (breakpoint) => `@media ${mediaCondition.below[breakpoint]}`,
);

export const pageGutterProperty = '--page-gutter';

export const pageGutter = `var(${pageGutterProperty}, ${remUnit(24)})`;

const pageMarginGridStyles = ({ margin, gutter }: CasGrid) => ({
  paddingLeft: remUnit(margin),
  paddingRight: remUnit(margin),
  [pageGutterProperty]: remUnit(gutter),
});

const pageContainerGridStyles = (grid: CasGrid) => ({
  ...pageMarginGridStyles(grid),
  maxWidth:
    grid.maxWidth === null ? 'none' : remUnit(grid.maxWidth + grid.margin * 2),
});

const gridRules = (
  grids: Record<CasBreakpoint, CasGrid>,
  gridStyles: (grid: CasGrid) => Record<string, string>,
) => {
  let below = gridStyles(grids.mobile);
  const rules: Record<string, Record<string, string>> = {};
  mediaBreakpoints.forEach((breakpoint) => {
    const styles = gridStyles(grids[breakpoint]);
    const changed = Object.fromEntries(
      Object.entries(styles).filter(([key, value]) => below[key] !== value),
    );
    if (Object.keys(changed).length > 0) {
      rules[mediaFrom[breakpoint]] = changed;
    }
    below = styles;
  });
  return { ...gridStyles(grids.mobile), ...rules };
};

export const pageContainerStyles: Record<Product, SerializedStyles> = {
  crn: css({
    boxSizing: 'border-box',
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    ...gridRules(casGrid.crn, pageContainerGridStyles),
  }),
  gp2: css({
    boxSizing: 'border-box',
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    ...gridRules(casGrid.gp2, pageContainerGridStyles),
  }),
};

export const pageMarginStyles: Record<Product, SerializedStyles> = {
  crn: css(gridRules(casGrid.crn, pageMarginGridStyles)),
  gp2: css(gridRules(casGrid.gp2, pageMarginGridStyles)),
};

const pageContentContainerGridStyles = (grid: CasGrid) => ({
  ...pageMarginGridStyles(grid),
  maxWidth:
    grid.maxWidth === null
      ? 'none'
      : remUnit(Math.min(grid.maxWidth, casContentMaxWidth) + grid.margin * 2),
});

export const pageContentContainerStyles: Record<Product, SerializedStyles> = {
  crn: css({
    boxSizing: 'border-box',
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    ...gridRules(casGrid.crn, pageContentContainerGridStyles),
  }),
  gp2: css({
    boxSizing: 'border-box',
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    ...gridRules(casGrid.gp2, pageContentContainerGridStyles),
  }),
};

export const contentWidthStyles = css({
  width: '100%',
  maxWidth: remUnit(casContentMaxWidth),
  marginLeft: 'auto',
  marginRight: 'auto',
});

export const pageHeaderTextStyles = css({
  maxWidth: casTextMaxWidth,
});

export const tileGridStyles = css({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(min(${remUnit(
    casTileMinWidth,
  )}, 100%), 1fr))`,
  columnGap: pageGutter,
});

export const MAX_PAGE_CONTENT_WIDTH = 1600;

export const MAX_NAVIGATION_MENU_WIDTH = MAX_PAGE_CONTENT_WIDTH / 3;

// Below this desktop height the nav won't fit, so the rail scrolls instead.
export const shortMenuViewportHeight = 700;
export const shortViewportQuery = `@media ${mediaCondition.from.laptop} and (max-height: ${shortMenuViewportHeight}px)`;

// Collapse/expand width animation; shared by the grid transition and JS timer.
export const menuTransitionMs = 250;

export const networkContentTopPadding = rem(48);
export const defaultContentTopPadding = rem(36);
