import { css } from '@emotion/react';

import {
  charcoal,
  colorWithTransparency,
  colour,
  neutral300,
  neutral500,
  neutral700,
  neutral900,
  neutral1000,
} from '../colors';
import { mobileScreen, rem, tabletScreen } from '../pixels';

export const contentStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

export const contentWithFooterStyles = css({
  paddingBottom: 0,
});

export const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(15),
});

export const actionsStyles = css({
  display: 'flex',
  gap: rem(12),
});

export const iconButtonStyles = css({
  flexGrow: 0,
  width: rem(40),
  height: rem(40),
  alignItems: 'center',
  borderColor: neutral700.rgb,
  ':hover, :focus': {
    borderColor: neutral700.rgb,
  },
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    // Button re-asserts flexGrow:1 at this breakpoint; re-declare it so the
    // fixed 40px icon button doesn't stretch.
    flexGrow: 0,
    minWidth: rem(40),
  },
});

export const editIconButtonStyles = css([
  iconButtonStyles,
  {
    '> svg': {
      width: rem(24),
      height: rem(24),
      padding: 0,
    },
  },
]);

export const metricsStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: rem(24),
  marginTop: rem(24),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '1fr 1fr',
  },
});

export const viewMoreStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: rem(56),
  borderTop: `1px solid ${neutral500.rgb}`,
});

export const emptyStateStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: rem(24),
});

export const statusIconStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: rem(24),
  height: rem(24),
  verticalAlign: 'middle',
});

export const teamInfoStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  minWidth: 0,
});

// Keep a team row on one line so a long name scrolls the table rather than
// wrapping the name or shrinking the icons.
export const teamInfoNoWrapStyles = css({
  whiteSpace: 'nowrap',
  '> svg': { flexShrink: 0 },
});

// Breathing room below the table for the horizontal scrollbar when it appears.
export const horizontalScrollGutter = css({ paddingBottom: rem(8) });

export const tableWrapperStyles = css({
  marginTop: rem(40),
  overflowX: 'auto',
});

export const headerCellStyles = css({
  textAlign: 'left',
  color: charcoal.rgb,
  fontSize: rem(17),
  fontWeight: 'bold',
  lineHeight: rem(24),
  letterSpacing: rem(0.1),
});

export const cellStyles = css({
  padding: `${rem(16)} 0`,
  verticalAlign: 'middle',
});

export const statusCellStyles = css([cellStyles, { lineHeight: 0 }]);

// The accordion expand/collapse toggle, shared by the speaker table rows and
// the edit-modal team rows.
export const chevronButtonStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
});

export const deleteButtonStyles = (
  enabled: boolean,
  disabledPalette: 'default' | 'light' = 'default',
) => {
  const disabledBorder = disabledPalette === 'light' ? neutral500 : neutral700;
  const disabledBackground = disabledPalette === 'light' ? neutral300 : neutral500;
  return css({
    flexGrow: 0,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: rem(24),
    minWidth: rem(24),
    height: rem(24),
    minHeight: rem(24),
    padding: 0,
    border: `1px solid ${enabled ? neutral500.rgb : disabledBorder.rgb}`,
    borderRadius: rem(4),
    backgroundColor: enabled ? colour.neutral[0].rgb : disabledBackground.rgb,
    boxShadow: enabled
      ? undefined
      : `0 2px 4px ${colorWithTransparency(neutral500, 0.3).rgba}`,
    color: enabled ? neutral1000.rgb : neutral900.rgb,
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      minWidth: rem(24),
    },
    '> svg': {
      width: rem(14.4),
      height: rem(14.4),
      ...(enabled ? {} : { filter: 'none', stroke: neutral900.rgb }),
    },
  });
};
