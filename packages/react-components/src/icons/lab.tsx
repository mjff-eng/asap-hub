/* istanbul ignore file */

import { FC } from 'react';
import { remUnit } from '../pixels';

interface LabIconProps {
  readonly color?: string;
  readonly size?: number;
}
const Lab: FC<LabIconProps> = ({ color = '#4D646B', size = 24 }) => (
  <svg
    width={remUnit(size)}
    height={remUnit(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Lab</title>
    <path
      d="M8 3.6h1.9V8c0 .3-.1.6-.2.8l-5.3 8c-1.1 1.6.1 3.8 2.1 3.8h11.1c2 0 3.1-2.2 2.1-3.8l-5.3-8c-.2-.2-.2-.5-.2-.8V3.6H16"
      stroke={color}
      strokeWidth={1.3}
      strokeMiterlimit={10}
      strokeLinecap="round"
    />
    <path
      d="M17.9 14.1H6.5"
      stroke="#4D646B"
      strokeMiterlimit={10}
      strokeLinecap="round"
    />
  </svg>
);

export default Lab;
