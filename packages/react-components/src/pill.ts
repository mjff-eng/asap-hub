import { css } from '@emotion/react';
import { rem } from './pixels';

export const pillStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  gap: rem(8),
  verticalAlign: 'middle',
  borderRadius: rem(36),
  padding: `${rem(4)} ${rem(16)}`,
});
