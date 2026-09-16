import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { Avatar, Button, Link, Pill, SpeakerRoleBadge } from '../atoms';
import { lead } from '../colors';
import { alumniBadgeIcon, binIcon, userPlaceholderIcon } from '../icons';
import { deleteButtonStyles } from '../organisms/shared-event-card-styles';
import { mobileScreen, rem } from '../pixels';
import { splitDisplayName } from '../utils/user';

export const flexRowGap8Styles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

// [user info block, flex-grow] + [optional delete button]. When a delete
// button is present it bottom-aligns on mobile against the (now two-line)
// user info block, per Figma; read-only rows (no delete) keep the default
// top alignment.
const rowStyles = css(flexRowGap8Styles);

const rowWithRemoveStyles = css([
  flexRowGap8Styles,
  {
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      alignItems: 'flex-end',
    },
  },
]);

// Desktop: a plain row, so topRowStyles + the role badge sit inline. Mobile:
// stacks into two lines — avatar+name on top, role badge below — matching
// Figma's "User Name" column layout.
const userInfoStyles = css([
  flexRowGap8Styles,
  {
    flexGrow: 1,
    minWidth: 0,
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  },
]);

const topRowStyles = flexRowGap8Styles;

export const avatar24Styles = css({
  margin: 0,
  flexShrink: 0,
  width: rem(24),
  height: rem(24),
});

// No truncation, matching the team name policy — a name wider than the card
// just scrolls (overflowX: auto on groupsCardStyles). Color comes from
// Link's default (fern) for team members.
const nameStyles = css({
  display: 'block',
  whiteSpace: 'nowrap',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    // Figma's "Caption/C1" mobile type scale, matching the team name.
    fontSize: rem(14),
    lineHeight: rem(16),
    fontWeight: 400,
  },
});

const externalNameStyles = css([nameStyles, { color: lead.rgb }]);

const placeholderAvatarStyles = css({
  display: 'inline-flex',
  flexShrink: 0,
  '> svg': {
    width: rem(24),
    height: rem(24),
  },
});

const alumniStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
});

type SpeakerUserRowProps = {
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly roles?: string[];
  readonly userId?: string;
  readonly isAlumni?: boolean;
  readonly isExternal?: boolean;
  readonly onRemove?: () => void;
  readonly enabled?: boolean;
};

const SpeakerUserRow: React.FC<SpeakerUserRowProps> = ({
  displayName,
  avatarUrl,
  roles,
  userId,
  isAlumni,
  isExternal = false,
  onRemove,
  enabled = true,
}) => {
  const { firstName, lastName } = splitDisplayName(displayName);
  return (
    <div css={onRemove ? rowWithRemoveStyles : rowStyles} role="listitem">
      <div css={userInfoStyles}>
        <span css={topRowStyles}>
          {isExternal ? (
            <span css={placeholderAvatarStyles}>{userPlaceholderIcon}</span>
          ) : (
            <Avatar
              firstName={firstName}
              lastName={lastName}
              imageUrl={avatarUrl}
              overrideStyles={avatar24Styles}
            />
          )}
          {userId ? (
            <Link href={network({}).users({}).user({ userId }).$} openInNewTab>
              <span css={nameStyles}>{displayName}</span>
            </Link>
          ) : (
            <span css={externalNameStyles}>{displayName}</span>
          )}
          {isAlumni && <span css={alumniStyles}>{alumniBadgeIcon}</span>}
          {isExternal && (
            <Pill accent="gray" noMargin>
              Non CRN
            </Pill>
          )}
        </span>
        {roles && <SpeakerRoleBadge roles={roles} enabled={enabled} />}
      </div>
      {onRemove && (
        <Button
          noMargin
          enabled={enabled}
          aria-label={`Remove ${displayName}`}
          onClick={onRemove}
          overrideStyles={deleteButtonStyles(enabled)}
        >
          {binIcon}
        </Button>
      )}
    </div>
  );
};

export default SpeakerUserRow;
