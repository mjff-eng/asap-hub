/* istanbul ignore file */

interface PercentageIconProps {
  title: string;
  color?: string;
}

const PercentageIcon: React.FC<PercentageIconProps> = ({
  title,
  color = '#4D646B',
}) => (
  <svg
    width="1.5rem"
    height="1.5rem"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{title}</title>
    <path
      d="M15.5 16C15.6326 16 15.7598 15.9473 15.8536 15.8536C15.9473 15.7598 16 15.6326 16 15.5C16 15.3674 15.9473 15.2402 15.8536 15.1464C15.7598 15.0527 15.6326 15 15.5 15C15.3674 15 15.2402 15.0527 15.1464 15.1464C15.0527 15.2402 15 15.3674 15 15.5C15 15.6326 15.0527 15.7598 15.1464 15.8536C15.2402 15.9473 15.3674 16 15.5 16ZM8.5 9C8.63261 9 8.75979 8.94732 8.85355 8.85355C8.94732 8.75979 9 8.63261 9 8.5C9 8.36739 8.94732 8.24021 8.85355 8.14645C8.75979 8.05268 8.63261 8 8.5 8C8.36739 8 8.24021 8.05268 8.14645 8.14645C8.05268 8.24021 8 8.36739 8 8.5C8 8.63261 8.05268 8.75979 8.14645 8.85355C8.24021 8.94732 8.36739 9 8.5 9Z"
      fill={color}
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 8L8 16"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="9.25" stroke={color} strokeWidth="1.5" />
  </svg>
);
export default PercentageIcon;
