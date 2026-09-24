import { css } from '@emotion/react';

import { neutral900, colour } from '../colors';
import { rem, tabletScreen } from '../pixels';
import { headlineStyles } from '../text';

export const metricContainerStyles = css({
  boxSizing: 'border-box',
  padding: rem(24),
  backgroundColor: colour.background.secondary,
  border: `1px solid ${colour.border.tertiary}`,
  borderRadius: rem(8),
});

export const metricLabelStyles = css({
  margin: 0,
  color: neutral900.rgb,
  fontSize: rem(17),
  lineHeight: rem(24),
});

export const metricValueStyles = css(headlineStyles[1], {
  margin: 0,
  color: colour.foreground.primary,
});

export const metricProgressRowStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(24),
});

export const metricWheelStyles = css({
  display: 'none',
  flexShrink: 0,
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'flex',
  },
});

export const metricBarStyles = css({
  marginTop: rem(16),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'none',
  },
});
