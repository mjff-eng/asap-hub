import {
  casHeader,
  pixels,
  colour,
  mediaBelow,
  mediaFrom,
  pageContainerStyles,
} from '@asap-hub/react-components';
import { css } from '@emotion/react';

const { rem, remUnit } = pixels;

// A navigation link in the header, set on the element that wraps it. The
// link's own vertical padding makes it taller than the header, so it takes
// the header height instead and centres its content. The link is either an
// anchor with the padding, or a router anchor around a div with the padding.
export const headerLinkStyles = css({
  '& > a, & > a > div': {
    boxSizing: 'border-box',
    height: remUnit(casHeader.gp2.height),
    paddingTop: 0,
    paddingBottom: 0,
    display: 'flex',
    alignItems: 'center',
  },
});

export const mobileQuery = mediaBelow.tablet;
export const nonMobileQuery = mediaFrom.tablet;

const layoutContentVerticalPadding = { mobile: 33, tablet: 48 };

export const layoutContentVerticalPaddingStyles = {
  paddingTop: remUnit(layoutContentVerticalPadding.mobile),
  paddingBottom: remUnit(layoutContentVerticalPadding.mobile),
  [mediaFrom.tablet]: {
    paddingTop: remUnit(layoutContentVerticalPadding.tablet),
    paddingBottom: remUnit(layoutContentVerticalPadding.tablet),
  },
};

export const removeLayoutPaddingStyles = {
  marginTop: remUnit(-layoutContentVerticalPadding.mobile),
  [mediaFrom.tablet]: {
    marginTop: remUnit(-layoutContentVerticalPadding.tablet),
  },
};

// The page content of every GP2 page: the GP2 page grid of the CAS Design
// System (24px margins on mobile, 56px from tablet up, at most 900px wide and
// centred) with the vertical padding shared by the pages.
export const layoutContentStyles = css(
  pageContainerStyles.gp2,
  layoutContentVerticalPaddingStyles,
);

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
