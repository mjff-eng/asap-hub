import { css } from '@emotion/react';

import { colour } from '../colors';
import Pill from './Pill';

const disabledStyles = css({
  '> span': { backgroundColor: colour.neutral[100] },
});

type SpeakerRoleBadgeProps = {
  readonly roles: string[];
  readonly enabled?: boolean;
};

const displayRole = ([role, ...rest]: string[]): string => {
  if (role === undefined) {
    return 'No role';
  }
  if (rest.length > 0) {
    return 'Multiple roles';
  }
  return role;
};

const SpeakerRoleBadge: React.FC<SpeakerRoleBadgeProps> = ({
  roles,
  enabled = true,
}) => (
  <span css={!enabled && disabledStyles}>
    <Pill accent="gray" noMargin>
      {displayRole(roles)}
    </Pill>
  </span>
);

export default SpeakerRoleBadge;
