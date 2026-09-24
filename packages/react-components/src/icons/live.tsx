/* istanbul ignore file */
import { css, keyframes } from '@emotion/react';

import { colour } from '../colors';

const pulse = keyframes({
  '0%': { transform: 'scale(0.5)', opacity: 0.5 },
  '100%': { transform: 'scale(1.25)', opacity: 0 },
});

const pulseStyles = css({
  transformBox: 'fill-box',
  transformOrigin: 'center',
  animation: `${pulse} 1.1s ease-out infinite`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    transform: 'none',
    opacity: 0.25,
  },
});

const live = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Live</title>
    <circle
      css={pulseStyles}
      cx="12"
      cy="12"
      r="8"
      fill={colour.brand.crn[500]}
    />
    <circle cx="12" cy="12" r="4" fill={colour.brand.crn[500]} />
  </svg>
);

export default live;
