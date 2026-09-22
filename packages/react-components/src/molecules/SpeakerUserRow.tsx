import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { Avatar, Button, Link, Pill, SpeakerRoleBadge, Switch } from '../atoms';
import { lead, neutral1000, silver, success100, success500 } from '../colors';
import {
  alumniBadgeIcon,
  binIcon,
  invalidTickIcon,
  tickInCircleIcon,
  userPlaceholderIcon,
} from '../icons';
import {
  deleteButtonStyles,
  statusIconStyles,
} from '../organisms/shared-event-card-styles';
import {
  mobileScreen,
  rem,
  tabletScreen,
  vminLinearCalcClamped,
} from '../pixels';
import { splitDisplayName } from '../utils/user';

// Fixed at Figma's State Tag width in the column header, on group rows and on
// speaker rows alike, so the three read from one left edge. The chevron only
// exists on group rows; the others reserve its width instead.
const findingsColumnWidth = 152;
const chevronColumnWidth = 24;

export const actionsGap = vminLinearCalcClamped(
  mobileScreen,
  12,
  tabletScreen,
  24,
  'px',
);

export const findingsColumnStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  // A flex item's default `min-width: auto` keeps it from shrinking below its
  // content, which let the wider column header ignore this width and sit out of
  // line with the pills. The header label overflows to the right instead.
  minWidth: 0,
  width: rem(findingsColumnWidth),
  whiteSpace: 'nowrap',
  [`@media (max-width: ${mobileScreen.max}px)`]: { width: 'auto' },
});

export const chevronSpacerStyles = css({
  flexShrink: 0,
  width: rem(chevronColumnWidth),
  [`@media (max-width: ${mobileScreen.max}px)`]: { display: 'none' },
});

export const trailingColumnsStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  gap: actionsGap,
});

// getButtonStyles grows every button to `min-width: 100%` under the mobile
// breakpoint; these stay the 24px box they are on desktop.
export const squareIconButtonStyles = (enabled: boolean) =>
  css([
    deleteButtonStyles(enabled),
    {
      flex: `0 0 ${rem(24)}`,
      maxWidth: rem(24),
      [`@media (max-width: ${mobileScreen.max}px)`]: {
        flexGrow: 0,
        minWidth: rem(24),
        maxWidth: rem(24),
      },
    },
  ]);

// Figma's State Tag: no border, 4px inline padding either side of the icon and
// the label. Pill would bring a border and its own <small> type scale.
export const findingsPillStyles = (shared: boolean) =>
  css({
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rem(4),
    width: rem(findingsColumnWidth),
    height: rem(24),
    padding: `0 ${rem(4)}`,
    borderRadius: rem(24),
    backgroundColor: shared ? success100.rgb : silver.rgb,
    color: shared ? success500.rgb : lead.rgb,
    fontSize: rem(14),
    lineHeight: 16 / 14,
    whiteSpace: 'nowrap',
    // Figma draws the glyph at 14x14 centred in its 24x24 slot; the icons ship
    // at 20x20, which is the size they keep outside the pill.
    '> span > svg': { width: rem(14), height: rem(14) },
  });

export const flexRowGap8Styles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

// [user info block, flex-grow] + [findings control] + [optional delete button].
// On mobile the row becomes a two-row grid: the user info block spans both rows
// and stacks internally, so the controls land in the second row beside the
// badge instead of on a third line of their own.
const rowStyles = css([
  flexRowGap8Styles,
  {
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      '> :first-child': { gridRow: '1 / 3', gridColumn: 1 },
      '> :not(:first-child)': { gridRow: 2, gridColumn: 2 },
    },
  },
]);

// Desktop: a plain row, so the name line and the badges sit inline. Mobile: stacks
// into two lines — avatar+name on top, the "Non CRN" or role badge below —
// matching Figma's "User Name" column layout.
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

const externalNameStyles = css([nameStyles, { color: neutral1000.rgb }]);

export const placeholderAvatarStyles = css({
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

export const findingsIcon = (shared: boolean) => (
  <span
    css={statusIconStyles}
    role="img"
    aria-label={
      shared ? 'Shared preliminary findings' : 'No preliminary findings'
    }
  >
    {shared ? tickInCircleIcon : invalidTickIcon}
  </span>
);

type SpeakerUserRowProps = {
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly roles?: string[];
  readonly userId?: string;
  readonly isAlumni?: boolean;
  readonly isExternal?: boolean;
  readonly preliminaryFindingsShared?: boolean;
  readonly showShared?: boolean;
  readonly onToggleShared?: (shared: boolean) => void;
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
  preliminaryFindingsShared = false,
  showShared = false,
  onToggleShared,
  onRemove,
  enabled = true,
}) => {
  const { firstName, lastName } = splitDisplayName(displayName);
  return (
    <div css={rowStyles} role="listitem">
      <div css={userInfoStyles}>
        <span css={flexRowGap8Styles}>
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
        </span>
        {isExternal && (
          <Pill accent="gray" noMargin>
            Non CRN
          </Pill>
        )}
        {roles && <SpeakerRoleBadge roles={roles} enabled={enabled} />}
      </div>
      {(showShared || onRemove) && (
        <span css={trailingColumnsStyles}>
          {showShared && (
            <span css={findingsColumnStyles}>
              {onToggleShared ? (
                <Switch
                  checked={preliminaryFindingsShared}
                  enabled={enabled}
                  ariaLabel={`${displayName} preliminary findings shared`}
                  onClick={() => onToggleShared(!preliminaryFindingsShared)}
                />
              ) : (
                findingsIcon(preliminaryFindingsShared)
              )}
            </span>
          )}
          {onRemove ? (
            <Button
              noMargin
              enabled={enabled}
              aria-label={`Remove ${displayName}`}
              onClick={onRemove}
              overrideStyles={squareIconButtonStyles(enabled)}
            >
              {binIcon}
            </Button>
          ) : (
            // Holds the chevron's column on the group row above, so the switch
            // or icon lands in the same place with or without a bin.
            <span css={chevronSpacerStyles} />
          )}
        </span>
      )}
    </div>
  );
};

export default SpeakerUserRow;
