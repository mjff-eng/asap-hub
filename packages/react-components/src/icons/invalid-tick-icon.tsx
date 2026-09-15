/* istanbul ignore file */

export const InvalidTickIcon: React.FC<{ color?: string }> = ({
  color = '#C2C9CE',
}) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Cross</title>
    <circle cx="10" cy="10" r="9.25" stroke={color} strokeWidth="1.5" />
    <path d="M6.25 13.75L13.75 6.25" stroke={color} strokeWidth="1.5" />
    <path d="M13.75 13.75L6.25 6.25" stroke={color} strokeWidth="1.5" />
  </svg>
);

const invalidTick = <InvalidTickIcon />;

export default invalidTick;
