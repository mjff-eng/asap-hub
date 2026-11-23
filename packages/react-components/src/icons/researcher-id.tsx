/* istanbul ignore file */

import { FC } from 'react';

interface ResearcherIdIconProps {
  readonly color?: string;
}

const ResearcherIdIcon: FC<ResearcherIdIconProps> = ({ color = '#00222C' }) => (
  <svg
    width="1.75rem"
    height="1.75rem"
    viewBox="0 0 28 28"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
    style={{
      stroke: 'none',
    }}
  >
    <title>ResearcherID</title>
    <path fill="#fff" d="M0 0h28v28H0z" />
    <path d="M5.368 26V2h8.366c2.14 0 3.667.216 4.584.647.917.431 1.67 1.179 2.26 2.243.588 1.064.883 2.338.883 3.823 0 1.877-.45 3.389-1.35 4.535-.902 1.146-2.18 1.866-3.84 2.161.851.611 1.555 1.28 2.112 2.005.557.726 1.315 2.027 2.276 3.905L23.05 26h-4.74l-2.875-5.222c-1.035-1.888-1.738-3.07-2.109-3.544-.37-.474-.764-.802-1.179-.982-.415-.18-1.08-.27-1.997-.27h-.82V26H5.37zM9.33 12.15h2.947c1.801 0 2.947-.079 3.438-.237.491-.158.89-.477 1.195-.958.306-.48.458-1.119.458-1.915 0-.764-.153-1.378-.458-1.842a2.334 2.334 0 00-1.244-.958c-.37-.12-1.446-.18-3.225-.18H9.33v6.09z" />
  </svg>
);

export default ResearcherIdIcon;
