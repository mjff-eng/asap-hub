/* istanbul ignore file */
import { FC } from 'react';

interface TeamIconProps {
  readonly color?: string;
}

const TeamIcon: FC<TeamIconProps> = ({ color = '#4D646B' }) => (
  <svg width="1.5rem" height="1.5rem" viewBox="0 0 24 24" stroke={color}>
    <title>Team</title>
    <g
      strokeWidth={1.3}
      fill="none"
      fillRule="evenodd"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.516 5.843a3.511 3.511 0 11-7.022.001 3.511 3.511 0 017.022-.001zM9.82 17.651v-3.466c0-1.109.901-2.01 2.01-2.01h8.35c1.11 0 2.01.901 2.01 2.01v3.466M9.834 7.231a2.95 2.95 0 11-5.9 0 2.95 2.95 0 015.9 0zM1.69 17.651v-3.045c0-.932.756-1.687 1.689-1.687h3.524" />
    </g>
  </svg>
);
export default TeamIcon;
