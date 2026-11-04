/* istanbul ignore file */
import { FC } from 'react';

interface GlobeIconProps {
  readonly color?: string;
  readonly strokeWidth?: number;
}

const GlobeIcon: FC<GlobeIconProps> = ({ color = '#00222C', strokeWidth }) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    stroke={color}
    xmlns="http://www.w3.org/2000/svg"
    style={{
      fill: 'none',
    }}
  >
    <title>Website</title>
    <path
      clipRule="evenodd"
      d="M15.767 12c0 5.099-1.687 9.23-3.767 9.23S8.234 17.1 8.234 12c0-5.1 1.686-9.231 3.766-9.231s3.767 4.132 3.767 9.23z"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      clipRule="evenodd"
      d="M21.23 12A9.23 9.23 0 0112 21.23 9.23 9.23 0 012.768 12 9.23 9.23 0 0112 2.769a9.23 9.23 0 019.23 9.23z"
      strokeWidth={strokeWidth ?? 1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.826 8.922h16.342M3.826 15.078h16.342"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export default GlobeIcon;
