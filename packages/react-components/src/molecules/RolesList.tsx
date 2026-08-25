import { css } from '@emotion/react';
import { neutral900 } from '../colors';
import { rem } from '../pixels';
import { OverflowBadge } from '../atoms';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
});

const roleTextStyles = css({
  color: neutral900.rgb,
  fontSize: rem(17),
});

type RolesListProps = {
  readonly roles: readonly string[];
  readonly maxVisible?: number;
};

const RolesList: React.FC<RolesListProps> = ({ roles, maxVisible = 2 }) => {
  if (roles.length === 0) return null;

  const visible = roles.slice(0, maxVisible);
  const overflow = roles.length - maxVisible;

  return (
    <div css={containerStyles}>
      {visible.map((role, index) => (
        <div key={index} css={roleTextStyles}>
          {role}
          {index === visible.length - 1 && overflow > 0 && (
            <OverflowBadge count={overflow} />
          )}
        </div>
      ))}
    </div>
  );
};

export default RolesList;
