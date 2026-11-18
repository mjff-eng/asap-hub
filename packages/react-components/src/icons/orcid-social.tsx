/* istanbul ignore file */

import { FC } from 'react';

interface OrcidSocialIconProps {
  readonly color?: string;
}

const OrcidSocialIcon: FC<OrcidSocialIconProps> = ({ color = '#00222C' }) => (
  <svg
    width="1.75rem"
    height="1.75rem"
    viewBox="0 0 28 28"
    xmlns="http://www.w3.org/2000/svg"
    fill={color}
    style={{
      stroke: 'none',
      zIndex: 1,
    }}
  >
    <title>ORCID</title>
    <path fill="transparent" d="M0 0h28v28H0z" />
    <g
      style={{
        mixBlendMode: 'darken',
      }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 14C0 6.267 6.267 0 14 0s14 6.267 14 14-6.267 14-14 14S0 21.733 0 14zm9.44 6.366V8.652H7.754v11.714h1.684zM8.596 7.317a1.109 1.109 0 01-1.105-1.104c0-.613.492-1.105 1.105-1.105.612 0 1.105.503 1.105 1.105 0 .601-.493 1.104-1.105 1.104zm3.314 13.06h4.572c3.86 0 6.212-2.855 6.212-5.863 0-2.767-1.903-5.862-6.234-5.862h-4.55v11.725z"
      />
      <path d="M16.187 10.172h-2.592v8.684h2.68c3.817 0 4.692-2.898 4.692-4.342 0-2.351-1.498-4.342-4.78-4.342z" />
    </g>
  </svg>
);

export default OrcidSocialIcon;
