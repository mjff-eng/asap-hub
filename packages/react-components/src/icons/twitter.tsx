/* istanbul ignore file */
import { FC } from 'react';

interface TwitterIconProps {
  readonly color?: string;
}

const TwitterIcon: FC<TwitterIconProps> = ({ color = '#00222C' }) => (
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
    <title>Twitter</title>
    <path fill="#fff" d="M0 0h28v28H0z" />
    <path d="M28 5.316a11.47 11.47 0 01-3.3.905 5.754 5.754 0 002.527-3.178 11.508 11.508 0 01-3.649 1.394 5.735 5.735 0 00-4.193-1.814c-3.709 0-6.434 3.46-5.596 7.052a16.308 16.308 0 01-11.84-6.001 5.752 5.752 0 001.777 7.67 5.72 5.72 0 01-2.6-.72c-.063 2.662 1.844 5.152 4.607 5.706-.808.22-1.694.27-2.595.098a5.749 5.749 0 005.367 3.989A11.55 11.55 0 010 22.797a16.263 16.263 0 008.806 2.58c10.666 0 16.691-9.008 16.328-17.087A11.696 11.696 0 0028 5.316z" />
  </svg>
);

export default TwitterIcon;
