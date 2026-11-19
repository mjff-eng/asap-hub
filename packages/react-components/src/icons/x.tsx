/* istanbul ignore file */
import { FC } from 'react';

interface XIconProps {
  readonly color?: string;
}

const XIcon: FC<XIconProps> = ({ color = '#00222C' }) => (
  <svg
    width="1.5rem"
    height="1.375rem"
    viewBox="0 0 24 22"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>X</title>
    <path
      d="M18.901 0.153H22.581L14.541 9.343L24 21.846H16.594L10.794 14.262L4.156 21.846H0.474L9.074 12.016L0 0.154H7.594L12.837 7.086L18.901 0.153ZM17.61 19.644H19.649L6.486 2.24H4.298L17.61 19.644Z"
      fill="inherit"
    />
  </svg>
);

export default XIcon;
