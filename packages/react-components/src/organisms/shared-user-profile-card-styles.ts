import { css } from '@emotion/react';

import { colour } from '../colors';
import { rem } from '../pixels';

export const cardContentStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
  padding: rem(24),
});

export const cardHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(8),
});

export const cardSectionStyles = css({
  borderTop: `1px solid ${colour.border.tertiary}`,
});

export const emptyStateTextStyles = css({
  margin: 0,
  fontWeight: 500,
  color: colour.foreground.secondary,
});

export const bodyTextStyles = css({
  margin: 0,
  color: colour.foreground.secondary,
});
