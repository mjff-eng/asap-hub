/* istanbul ignore file */
import { FC } from 'react';
import { remUnit } from '../pixels';

interface MemberIconProps {
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
}

const MemberIcon: FC<MemberIconProps> = ({
  width = 24,
  height = 24,
  color = '#4D646B',
}) => (
  <svg
    width={remUnit(width)}
    height={remUnit(height)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.05 6.3498C10.6417 6.3498 9.50001 7.49148 9.50001 8.89981C9.50001 10.3081 10.6417 11.4498 12.05 11.4498C13.4583 11.4498 14.6 10.3081 14.6 8.89981C14.6 7.49148 13.4583 6.3498 12.05 6.3498ZM8.20001 8.89981C8.20001 6.77351 9.92372 5.0498 12.05 5.0498C14.1763 5.0498 15.9 6.77351 15.9 8.89981C15.9 11.0261 14.1763 12.7498 12.05 12.7498C9.92372 12.7498 8.20001 11.0261 8.20001 8.89981ZM8.15001 14.7498C7.509 14.7498 7.00001 15.2588 7.00001 15.8998V18.2998C7.00001 18.6588 6.709 18.9498 6.35001 18.9498C5.99103 18.9498 5.70001 18.6588 5.70001 18.2998V15.8998C5.70001 14.5408 6.79103 13.4498 8.15001 13.4498H15.85C17.209 13.4498 18.3 14.5408 18.3 15.8998V18.2998C18.3 18.6588 18.009 18.9498 17.65 18.9498C17.291 18.9498 17 18.6588 17 18.2998V15.8998C17 15.2588 16.491 14.7498 15.85 14.7498H8.15001Z"
      fill={color}
    />
  </svg>
);
export default MemberIcon;
