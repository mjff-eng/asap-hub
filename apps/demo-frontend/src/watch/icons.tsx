/** @jsxImportSource @emotion/react */
import { FC } from 'react';

const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true,
  focusable: false,
} as const;

export const PlayIcon: FC = () => (
  <svg {...base}>
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

export const PauseIcon: FC = () => (
  <svg {...base}>
    <path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z" />
  </svg>
);

export const VolumeHighIcon: FC = () => (
  <svg {...base}>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
    <path
      d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export const VolumeMutedIcon: FC = () => (
  <svg {...base}>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
    <path
      d="M15.5 9.5l5 5m0-5l-5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const ChaptersIcon: FC = () => (
  <svg {...base}>
    <path d="M4 6h2v2H4zm4 0h12v2H8zM4 11h2v2H4zm4 0h12v2H8zM4 16h2v2H4zm4 0h12v2H8z" />
  </svg>
);

export const EnterFullscreenIcon: FC = () => (
  <svg {...base}>
    <path d="M4 9V4h5v2H6v3zm11-5h5v5h-2V6h-3zm5 11v5h-5v-2h3v-3zM9 20H4v-5h2v3h3z" />
  </svg>
);

export const ExitFullscreenIcon: FC = () => (
  <svg {...base}>
    <path d="M9 4v5H4V7h3V4zm6 0h2v3h3v2h-5zm5 11v2h-3v3h-2v-5zM4 15h5v5H7v-3H4z" />
  </svg>
);
