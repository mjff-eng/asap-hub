/* istanbul ignore file */
import { FC } from 'react';

interface UserIconProps {
  readonly color?: string;
}

const UserIcon: FC<UserIconProps> = ({ color = '#4D646B' }) => (
  <svg width="1.5rem" height="1.5rem" viewBox="0 0 24 24" stroke={color}>
    <title>Profile</title>
    <g fill="none" fillRule="evenodd" strokeWidth={1.3}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.671 9.406a3.665 3.665 0 11-7.329.001 3.665 3.665 0 017.33-.001zM5.554 20.098v-2.742c0-1.158.94-2.098 2.098-2.098h8.71c1.16 0 2.1.94 2.1 2.098v2.742" />
      </g>
      <circle cx={12} cy={12} r={10.35} />
    </g>
  </svg>
);

export default UserIcon;
