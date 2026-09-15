import { FC } from 'react';

type IconProps = { readonly size?: number };

const svg =
  (path: JSX.Element, viewBox = '0 0 24 24'): FC<IconProps> =>
  ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );

export const PlayIcon = svg(<path d="M8 5.5v13l11-6.5z" fill="currentColor" />);

export const PauseIcon = svg(
  <>
    <path d="M9 5v14" />
    <path d="M15 5v14" />
  </>,
);

export const SkipStartIcon = svg(
  <>
    <path d="M18 5v14L8 12z" fill="currentColor" />
    <path d="M6 5v14" />
  </>,
);

export const SkipEndIcon = svg(
  <>
    <path d="M6 5v14l10-7z" fill="currentColor" />
    <path d="M18 5v14" />
  </>,
);

export const SplitIcon = svg(
  <>
    <circle cx="6" cy="6" r="2.4" />
    <circle cx="6" cy="18" r="2.4" />
    <path d="M8 7.5 19 18" />
    <path d="M8 16.5 19 6" />
  </>,
);

export const DuplicateIcon = svg(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a1 1 0 0 1 1-1h9" />
  </>,
);

export const MuteIcon = svg(
  <>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="m16 9 5 6" />
    <path d="m21 9-5 6" />
  </>,
);

export const SoundIcon = svg(
  <>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M16 8.5a5 5 0 0 1 0 7" />
    <path d="M19 6a9 9 0 0 1 0 12" />
  </>,
);

export const TrashIcon = svg(
  <>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
  </>,
);

export const PlusIcon = svg(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

export const MinusIcon = svg(<path d="M5 12h14" />);

export const UndoIcon = svg(
  <>
    <path d="M9 7 4 12l5 5" />
    <path d="M4 12h10a6 6 0 0 1 0 12h-3" />
  </>,
);

export const RedoIcon = svg(
  <>
    <path d="m15 7 5 5-5 5" />
    <path d="M20 12H10a6 6 0 0 0 0 12h3" />
  </>,
);

export const RecordIcon = svg(
  <circle cx="12" cy="12" r="6" fill="currentColor" />,
);

export const ExpandIcon = svg(
  <>
    <path d="M9 4H4v5" />
    <path d="M15 4h5v5" />
    <path d="M15 20h5v-5" />
    <path d="M9 20H4v-5" />
  </>,
);

export const CollapseIcon = svg(
  <>
    <path d="M4 9h5V4" />
    <path d="M20 9h-5V4" />
    <path d="M20 15h-5v5" />
    <path d="M4 15h5v5" />
  </>,
);

export const MicrophoneIcon = svg(
  <>
    <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </>,
);

export const AudioIcon = svg(
  <>
    <path d="M4 10v4" />
    <path d="M8 7v10" />
    <path d="M12 4v16" />
    <path d="M16 8v8" />
    <path d="M20 11v2" />
  </>,
);

export const SaveIcon = svg(
  <>
    <path d="M5 4h11l4 4v12H5z" />
    <path d="M8 4v5h7V4" />
    <path d="M8 20v-6h8v6" />
  </>,
);
