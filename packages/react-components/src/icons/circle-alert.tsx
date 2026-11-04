/* istanbul ignore file */

import { FC } from 'react';

const VIEW_BOX_SIZE = 24;
const RENDERED_STROKE_PX = 1.5;

interface CircleAlertIconProps {
  readonly color?: string;
  readonly size?: number;
}

const CircleAlertIcon: FC<CircleAlertIconProps> = ({
  color = 'currentColor',
  size = VIEW_BOX_SIZE,
}) => (
  <svg
    width={size}
    height={size}
    viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
    fill="none"
    stroke={color}
    strokeWidth={(RENDERED_STROKE_PX * VIEW_BOX_SIZE) / size}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Alert circle</title>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

export default CircleAlertIcon;
