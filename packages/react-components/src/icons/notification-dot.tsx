/* istanbul ignore file */
import { FC } from 'react';

interface NotificationDotIconProps {
  readonly color?: string;
}

const NotificationDotIcon: FC<NotificationDotIconProps> = ({
  color = '#0C8DC3',
}) => (
  <svg
    width="0.5rem"
    height="0.5rem"
    viewBox="0 0 8 8"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Notification Dot</title>

    <circle cx="4" cy="4" r="4" fill={color} />
  </svg>
);

export default NotificationDotIcon;
