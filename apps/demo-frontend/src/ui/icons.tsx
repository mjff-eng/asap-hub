/** @jsxImportSource @emotion/react */
import { FC } from 'react';

type IconProps = { readonly size?: number };

const svgProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
});

export const SearchIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <circle cx="11" cy="11" r="6" />
    <path d="m15.5 15.5 4 4" />
  </svg>
);

export const SunIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </svg>
);

export const MoonIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

export const AutoThemeIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
  </svg>
);
