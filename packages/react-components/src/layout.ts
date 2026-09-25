import {
  smallDesktopScreen,
  vminLinearCalc,
  mobileScreen,
  largeDesktopScreen,
  rem,
} from './pixels';

export const MAX_PAGE_CONTENT_WIDTH = 1600;

export const MAX_NAVIGATION_MENU_WIDTH = MAX_PAGE_CONTENT_WIDTH / 3;

export const drawerQuery = `@media (max-width: ${
  smallDesktopScreen.width - 1
}px)`;
export const crossQuery = `@media (min-width: ${smallDesktopScreen.width}px)`;

// Below this desktop height the nav won't fit, so the rail scrolls instead.
export const shortMenuViewportHeight = 700;
export const shortViewportQuery = `@media (min-width: ${smallDesktopScreen.width}px) and (max-height: ${shortMenuViewportHeight}px)`;

// Collapse/expand width animation; shared by the grid transition and JS timer.
export const menuTransitionMs = 250;

const largeDesktopColWidth = 66;
const largeDesktopColGap = 30;
export const contentSidePaddingWithoutNavigation = (
  desktopCols: 2 | 4 | 6 | 8 | 10 | 12 = 12,
): string =>
  vminLinearCalc(
    mobileScreen,
    24,
    largeDesktopScreen,
    159 +
      ((12 - desktopCols) / 2) * (largeDesktopColWidth + largeDesktopColGap),
    'px',
  );
export const contentSidePaddingWithNavigation = (
  desktopCols: 2 | 4 | 6 | 8 | 10 | 12 = 12,
): string =>
  vminLinearCalc(
    mobileScreen,
    24,
    largeDesktopScreen,
    30 + ((12 - desktopCols) / 2) * (largeDesktopColWidth + largeDesktopColGap),
    'px',
  );

export const networkContentTopPadding = rem(48);
export const defaultContentTopPadding = rem(36);

export const defaultPageLayoutPaddingStyle = `${defaultContentTopPadding} ${contentSidePaddingWithNavigation(
  8,
)}`;
