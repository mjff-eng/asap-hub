/* istanbul ignore file */

import { FC } from 'react';

interface InactiveBadgeIconProps {
  entityName?: string;
}

const InactiveBadgeIcon: FC<InactiveBadgeIconProps> = ({
  entityName = 'Team',
}) => (
  <svg
    viewBox="0 0 24 24"
    width="1.5rem"
    height="1.5rem"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Inactive {entityName}</title>
    <path d="m12 3 7.794 4.5v9L12 21l-7.794-4.5v-9L12 3Z" fill="#CE801A" />
    <path
      d="M10 16v-.901l1.072-.165V9.071L10 8.907V8h4v.907l-1.072.164v5.863L14 15.1V16h-4Z"
      fill="#F8EDDE"
    />
  </svg>
);

export default InactiveBadgeIcon;
