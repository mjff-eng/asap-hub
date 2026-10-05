import { SerializedStyles } from '@emotion/react';
import { Avatar } from '../atoms';
import AvatarWithBadge from './AvatarWithBadge';

type UserAvatarProps = {
  readonly imageUrl?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly badgeUrl?: string;
  readonly badgeAlt?: string;
  readonly avatarSize?: number;
  readonly badgeSize?: number;
  readonly overrideBadgeStyles?: SerializedStyles;
};

const UserAvatar: React.FC<UserAvatarProps> = ({
  imageUrl,
  firstName,
  lastName,
  badgeUrl,
  badgeAlt,
  avatarSize,
  badgeSize,
  overrideBadgeStyles,
}) =>
  badgeUrl ? (
    <AvatarWithBadge
      imageUrl={imageUrl}
      firstName={firstName}
      lastName={lastName}
      badgeUrl={badgeUrl}
      badgeAlt={badgeAlt ?? ''}
      badgeSize={badgeSize}
      avatarSize={avatarSize}
      overrideBadgeStyles={overrideBadgeStyles}
    />
  ) : (
    <Avatar imageUrl={imageUrl} firstName={firstName} lastName={lastName} />
  );

export default UserAvatar;
