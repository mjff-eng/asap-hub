/* istanbul ignore file */

import { FC } from 'react';
import { remUnit } from '../pixels';

interface ImpactIconProps {
  readonly color?: string;
  readonly size?: number;
}
const ImpactIcon: FC<ImpactIconProps> = ({ color = '#4D646B', size = 24 }) => (
  <svg
    width={remUnit(size)}
    height={remUnit(size)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Impact icon</title>
    <path
      d="M21.1728 12.7308C21.0331 14.4867 20.3923 16.1657 19.3264 17.5681C18.2606 18.9705 16.8146 20.0375 15.1602 20.6424C13.5057 21.2472 11.7125 21.3643 9.99345 20.98C8.2744 20.5956 6.70182 19.7259 5.46253 18.4741C4.22324 17.2223 3.36934 15.641 3.00228 13.9182C2.63521 12.1954 2.77041 10.4034 3.39182 8.75515C4.01322 7.1069 5.09471 5.67168 6.50779 4.61999C7.92087 3.5683 9.60615 2.94435 11.3634 2.82227"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.9499 13.5425C15.6943 14.2004 15.2787 14.7843 14.7407 15.2412C14.2028 15.6981 13.5594 16.0138 12.8688 16.1596C12.1782 16.3054 11.4621 16.2767 10.7854 16.0762C10.1086 15.8757 9.4925 15.5097 8.99276 15.0112C8.49302 14.5128 8.12541 13.8976 7.92317 13.2214C7.72093 12.5451 7.69044 11.8292 7.83445 11.1382C7.97847 10.4472 8.29245 9.80301 8.74801 9.26387C9.20356 8.72474 9.78632 8.30766 10.4436 8.05035M12.0006 11.9996L15.5394 8.46084M15.5394 8.46084L18.3704 9.16859L21.2014 6.33759L18.3704 5.62984L17.6626 2.79883L14.8316 5.62984L15.5394 8.46084Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ImpactIcon;
