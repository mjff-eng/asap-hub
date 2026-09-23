/* istanbul ignore file */
import { FC } from 'react';
import { css, keyframes } from '@emotion/react';

import { fern } from '../colors';

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

interface LiveIconProps {
  readonly color?: string;
  readonly size?: number;
}

const LiveIcon: FC<LiveIconProps> = ({ color = fern.hex, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Live</title>
    <circle css={pulseStyles} cx="12" cy="12" r="8" fill={color} />
    <circle cx="12" cy="12" r="4" fill={color} />
  </svg>
);

export default LiveIcon;
