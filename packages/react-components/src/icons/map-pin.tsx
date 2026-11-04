/* istanbul ignore file */

import { FC } from 'react';

const VIEW_BOX_SIZE = 24;
const RENDERED_STROKE_PX = 1.5;

interface MapPinIconProps {
  readonly color?: string;
  readonly size?: number;
}

// Stroke-based so the line weight stays at 1.5px whatever size it renders at.
const MapPinIcon: FC<MapPinIconProps> = ({ color = '#1C1F21', size = 16 }) => (
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
    <title>Map Pin</title>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default MapPinIcon;
