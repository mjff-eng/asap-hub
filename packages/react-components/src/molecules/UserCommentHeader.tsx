import { UserResponse } from '@asap-hub/model';
import { css } from '@emotion/react';
import { FC } from 'react';

import { Avatar } from '../atoms';
import { neutral900 } from '../colors';
import { formatDate } from '../date';
import { rem } from '../pixels';
import { ImageLink } from '.';
import UserTeamInfo from './UserTeamInfo';
import { colors } from '..';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: rem(6),
});

const userContainerStyles = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: rem(8),
});

const userInfoStyles = css({
  display: 'inline-flex',
  flexDirection: 'row',
});

const separatorStyles = css({
  fontSize: rem(14),
  fontWeight: 400,
  color: colors.neutral900.rgb,
});

const dateStyles = css({
  width: 'max-content',
  color: neutral900.rgb,
  fontSize: rem(14),
  fontWeight: 400,
});

type UserCommentHeaderProps = Pick<
  UserResponse,
  'displayName' | 'firstName' | 'lastName' | 'avatarUrl' | 'alumniSinceDate'
> & {
  userHref: string;
  teams: {
    href: string;
    name: string;
  }[];
  date: string;
  showTeamName?: boolean;
};

const UserCommentHeader: FC<UserCommentHeaderProps> = ({
  userHref,
  displayName,
  firstName,
  lastName,
  avatarUrl,
  alumniSinceDate,
  teams,
  date,
  showTeamName,
}) => (
  <div css={containerStyles}>
    <div css={userContainerStyles}>
      <ImageLink link={userHref}>
        <Avatar
          firstName={firstName}
          lastName={lastName}
          imageUrl={avatarUrl}
        />
      </ImageLink>
      <div css={userInfoStyles}>
        <UserTeamInfo
          displayName={displayName}
          userHref={userHref}
          teams={teams}
          alumniSinceDate={alumniSinceDate}
          showTeamName={showTeamName}
        />
      </div>
      <span css={separatorStyles}> • </span>
      <span css={dateStyles}>{formatDate(new Date(date))}</span>
    </div>
  </div>
);
export default UserCommentHeader;
