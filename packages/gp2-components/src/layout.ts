import { pixels, colour } from '@asap-hub/react-components';
import { css } from '@emotion/react';

const {
  largeDesktopScreen,
  mobileScreen,
  rem,
  smallDesktopScreen,
  tabletScreen,
  vminLinearCalcClamped,
} = pixels;

export const smallDesktopQuery = `@media (min-width: ${
  smallDesktopScreen.width
}px) and (max-width: ${largeDesktopScreen.width - 1}px)`;

const headerMaxWidth = 748;
const smallerScreenMaxMargin = 72;

export const mobileQuery = `@media (max-width: ${tabletScreen.width - 1}px)`;
export const nonMobileQuery = `@media (min-width: ${tabletScreen.width}px)`;
export const smallerScreenQuery = `@media (max-width: ${
  headerMaxWidth + smallerScreenMaxMargin * 2 - 1
}px)`;

export const layoutContentStyles = {
  width: headerMaxWidth,
  padding: `${vminLinearCalcClamped(
    mobileScreen,
    33,
    tabletScreen,
    48,
    'px',
  )} 0`,
  margin: `0 auto`,
  [smallerScreenQuery]: {
    maxWidth: headerMaxWidth,
    width: 'auto',
    margin: `0 ${vminLinearCalcClamped(
      mobileScreen,
      24,
      tabletScreen,
      smallerScreenMaxMargin,
      'px',
    )}`,
  },
};

export const detailHeaderStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(32),
  borderBottom: `1px solid ${colour.border.tertiary}`,
});

export const mainStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(48),
  padding: `${rem(48)} 0`,
  [mobileQuery]: {
    gap: rem(24),
    padding: `${rem(32)} 0`,
  },
});

export const buttonWrapperStyle = css({
  margin: 'auto',
  width: 'fit-content',
  [mobileQuery]: {
    width: '100%',
  },
});

export const modalStyles = css({
  width: '100%',
  height: '100%',
  display: 'grid',
  gridTemplateRows: `max-content 1fr max-content`,
});

export const footerStyles = css({
  display: 'flex',
  gap: rem(24),
  marginTop: rem(32),
  justifyContent: 'space-between',
  [mobileQuery]: {
    display: 'flex',
    flexDirection: 'column-reverse',
  },

  borderTop: `1px solid ${colour.border.tertiary}`,
});

export const padding24Styles = css({
  paddingTop: rem(24),
});

export const formContainer = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(18),
  overflowY: 'scroll',
  [mobileQuery]: {
    overflowY: 'unset',
  },
});
