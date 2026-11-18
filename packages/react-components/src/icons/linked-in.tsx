/* istanbul ignore file */

import { FC } from 'react';

interface LinkedInIconProps {
  readonly color?: string;
}

const LinkedInIcon: FC<LinkedInIconProps> = ({ color = '#00222C' }) => (
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
    <title>LinkedIn</title>
    <path fill="#fff" d="M0 0h28v28H0z" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.8 0h22.4C26.74 0 28 1.26 28 2.8v22.4c0 1.54-1.26 2.8-2.8 2.8H2.8C1.26 28 0 26.74 0 25.2V2.8C0 1.26 1.26 0 2.8 0zm1.4 23.8h4.2V11.2H4.2v12.6zM6.3 8.82A2.51 2.51 0 013.78 6.3c0-1.4 1.12-2.52 2.52-2.52S8.82 4.9 8.82 6.3 7.7 8.82 6.3 8.82zM19.6 23.8h4.2v-7.98c0-2.66-2.24-4.9-4.9-4.9-1.26 0-2.8.84-3.5 1.96V11.2h-4.2v12.6h4.2v-7.42c0-1.12.98-2.1 2.1-2.1s2.1.98 2.1 2.1v7.42z"
    />
  </svg>
);

export default LinkedInIcon;
