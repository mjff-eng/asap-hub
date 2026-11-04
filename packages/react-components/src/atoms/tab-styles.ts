import { css } from '@emotion/react';
import { rem } from '../pixels';
import { colour } from '../colors';

export const TAB_PADDING = 16;
export const TAB_PADDING_TOP = 8;
export const TAB_BORDER_WIDTH = 4;

export const tabStyles = css({
  display: 'inline-block',
  padding: rem(TAB_PADDING),
  paddingTop: rem(TAB_PADDING_TOP),

  color: colour.foreground.tertiary,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
});

export const tabActiveStyles = css({
  paddingBottom: rem(TAB_PADDING - TAB_BORDER_WIDTH),
  borderBottom: `solid ${rem(TAB_BORDER_WIDTH)} ${colour.foreground.brand}`,

  color: colour.foreground.primary,
  fontWeight: 'bold',
});
