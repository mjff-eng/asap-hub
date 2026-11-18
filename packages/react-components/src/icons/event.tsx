/* istanbul ignore file */
import { FC } from 'react';

interface EventIconProps {
  readonly color?: string;
}

const EventIcon: FC<EventIconProps> = ({ color = '#4D646B' }) => (
  <svg
    width="1.5rem"
    height="1.5rem"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Event</title>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.25 3.1a.65.65 0 0 1 .65.65V5.2H17V3.75a.65.65 0 1 1 1.3 0V5.2h1.95a.65.65 0 0 1 .65.65v14.4a.65.65 0 0 1-.65.65H3.75a.65.65 0 0 1-.65-.65V5.85a.65.65 0 0 1 .65-.65H5.6V3.75a.65.65 0 0 1 .65-.65ZM4.4 10.9v8.7h15.2v-8.7H4.4Zm15.2-1.3H4.4V6.5h15.2v3.1Z"
      fill={color}
    />
  </svg>
);

export default EventIcon;
