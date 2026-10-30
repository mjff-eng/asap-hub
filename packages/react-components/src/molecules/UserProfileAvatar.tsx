import { UserResponse } from '@asap-hub/model';
import { css, SerializedStyles } from '@emotion/react';
import { useCallback } from 'react';

import { Anchor, Avatar, Spinner } from '../atoms';
import { colour, colourWithAlpha } from '../colors';
import { uploadIcon } from '../icons';
import { badgesAnchorId } from '../organisms/UserProfileBadges';
import { rem } from '../pixels';
import { badgeImageStyles } from './AvatarWithBadge';

const DEFAULT_AVATAR_SIZE = 128;
const BADGE_SIZE = 48;

const containerStyles = (size: number) =>
  css({
    position: 'relative',
    isolation: 'isolate',
    width: rem(size),
    height: rem(size),
  });
const avatarStyles = css({
  width: '100%',
  height: '100%',
  margin: 0,
});

const overlayStyles = css({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  backgroundColor: colourWithAlpha(colour.neutral[900], 0.5),
});
const uploadOverlayStyles = css({
  cursor: 'pointer',
  opacity: 0,
  transition: 'opacity 150ms ease-in-out',
  ':hover, :focus-within': {
    opacity: 1,
  },
});

const badgeStyles = css({
  position: 'absolute',
  right: rem(-10),
  bottom: rem(-8),
  display: 'inline-flex',
  width: rem(BADGE_SIZE),
  height: rem(BADGE_SIZE),
  zIndex: 1,
});

export type UserProfileAvatarBadge = {
  readonly name: string;
  readonly iconUrl: string;
  readonly href: string;
};

type UserProfileAvatarProps = Pick<
  UserResponse,
  'avatarUrl' | 'firstName' | 'lastName'
> & {
  readonly size?: number;
  readonly badge?: UserProfileAvatarBadge;
  readonly onImageSelect?: (file: File) => void;
  readonly avatarSaving?: boolean;
  readonly overrideStyles?: SerializedStyles;
};

const UserProfileAvatar: React.FC<UserProfileAvatarProps> = ({
  avatarUrl,
  firstName,
  lastName,
  size = DEFAULT_AVATAR_SIZE,
  badge,
  onImageSelect,
  avatarSaving,
  overrideStyles,
}) => {
  const scrollToBadges = useCallback(() => {
    document.getElementById(badgesAnchorId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  return (
    <div css={[containerStyles(size), overrideStyles]}>
      <Avatar
        imageUrl={avatarUrl}
        firstName={firstName}
        lastName={lastName}
        overrideStyles={avatarStyles}
      />
      {badge && (
        <span css={badgeStyles}>
          <Anchor
            href={badge.href}
            aria-label={`${badge.name} badge`}
            onClick={scrollToBadges}
          >
            <img css={badgeImageStyles} src={badge.iconUrl} alt="" />
          </Anchor>
        </span>
      )}
      {onImageSelect &&
        (avatarSaving ? (
          <div css={overlayStyles}>
            <Spinner
              size={24}
              color={colour.neutral[0]}
              trackColor={colourWithAlpha(colour.neutral[0], 0.4)}
              ariaLabel="Saving avatar"
              ariaBusy
            />
          </div>
        ) : (
          <label
            css={[overlayStyles, uploadOverlayStyles]}
            aria-label="Edit Avatar"
          >
            {uploadIcon}
            <input
              type="file"
              accept="image/png,image/jpeg"
              aria-label="Upload Avatar"
              onChange={(event) =>
                event.target.files?.length &&
                event.target.files[0] &&
                onImageSelect(event.target.files[0])
              }
              css={{ display: 'none' }}
            />
          </label>
        ))}
    </div>
  );
};

export default UserProfileAvatar;
