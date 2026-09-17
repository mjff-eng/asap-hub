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

export const HomeIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
  </svg>
);

export const FolderIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h7A1.5 1.5 0 0 1 19 9v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 18Z" />
  </svg>
);

export const PlusIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const GridIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
  </svg>
);

export const ListIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" />
  </svg>
);

export const CameraIcon: FC<IconProps> = ({ size = 14 }) => (
  <svg {...svgProps(size)}>
    <rect x="3" y="6.5" width="12" height="11" rx="2" />
    <path d="m15 11 6-3.5v9L15 13Z" />
  </svg>
);

export const TrashIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <path d="M3.5 6.5h17M9.5 6.5V4h5v2.5M5.5 6.5 6.75 20h10.5L18.5 6.5" />
  </svg>
);

export const DragHandleIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <circle cx="8.5" cy="5" r="1.5" fill="currentColor" />
    <circle cx="15.5" cy="5" r="1.5" fill="currentColor" />
    <circle cx="8.5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="15.5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="8.5" cy="19" r="1.5" fill="currentColor" />
    <circle cx="15.5" cy="19" r="1.5" fill="currentColor" />
  </svg>
);

export const UploadIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <path d="M12 15V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15" />
  </svg>
);

export const FolderPlusIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h7A1.5 1.5 0 0 1 19 9v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 18Z" />
    <path d="M11 13.5h4M13 11.5v4" />
  </svg>
);

export const PencilIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <path d="M4 20h4l10-10-4-4L4 16Z" />
    <path d="m14 6 4 4" />
  </svg>
);

export const CaretIcon: FC<IconProps> = ({ size = 14 }) => (
  <svg {...svgProps(size)}>
    <path d="m9.5 6 6 6-6 6" />
  </svg>
);

export const KebabIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="5.5" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="18.5" r="1.3" fill="currentColor" />
  </svg>
);

export const StackIcon: FC<IconProps> = ({ size = 16 }) => (
  <svg {...svgProps(size)}>
    <path d="M12 3.5 3.5 8 12 12.5 20.5 8Z" />
    <path d="m3.5 12 8.5 4.5 8.5-4.5" />
    <path d="m3.5 16 8.5 4.5 8.5-4.5" />
  </svg>
);
