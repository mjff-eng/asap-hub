import { css } from '@emotion/react';

import { colour } from '../colors';
import { rem } from '../pixels';
import Pill from './Pill';

export const statePillStyles = css({
  '> span': { height: rem(24) },
});

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
  <span css={[statePillStyles, !enabled && disabledStyles]}>
    <Pill accent="gray" noMargin>
      {displayRole(roles)}
    </Pill>
  </span>
);

export default SpeakerRoleBadge;
