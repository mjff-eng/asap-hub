import { css } from '@emotion/react';
import { Link } from '../atoms';
import { rem } from '../pixels';
import { colour } from '../colors';
import { GroupedProjectMember } from '../utils';
import RolesList from './RolesList';
import UserAvatar from './UserAvatar';

const memberCardStyles = css({
  display: 'flex',
  gap: rem(12),
  alignItems: 'flex-start',
});

const avatarStyles = css({
  flexShrink: 0,
  width: rem(48),
  height: rem(48),
});

const memberInfoStyles = css({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
});

const nameStyles = css({
  fontSize: rem(17),
  fontWeight: 500,
  color: colour.foreground.brand,
  textDecoration: 'none',
  '&:hover': {
    textDecoration: 'underline',
  },
});

const noRoleStyles = css({
  color: colour.foreground.tertiary,
  fontSize: rem(17),
  fontStyle: 'italic',
});

type ProjectMemberCardProps = {
  readonly member: GroupedProjectMember;
};

const ProjectMemberCard: React.FC<ProjectMemberCardProps> = ({ member }) => (
  <div css={memberCardStyles}>
    <div css={avatarStyles}>
      <UserAvatar
        imageUrl={member.avatarUrl}
        firstName={member.firstName}
        lastName={member.lastName}
        badgeUrl={member.latestAward?.smallIconUrl}
        badgeAlt={member.latestAward?.name}
        badgeSize={18}
        avatarSize={48}
        overrideBadgeStyles={css({ right: rem(0), bottom: rem(0) })}
      />
    </div>
    <div css={memberInfoStyles}>
      <Link href={member.href}>
        <span css={nameStyles}>{member.displayName}</span>
      </Link>
      {member.roles.length > 0 ? (
        <RolesList roles={member.roles} maxVisible={2} />
      ) : (
        <div css={noRoleStyles}>No role assigned</div>
      )}
    </div>
  </div>
);

export default ProjectMemberCard;
