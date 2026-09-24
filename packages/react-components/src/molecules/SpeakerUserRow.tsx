import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { Avatar, Button, Link, Pill, SpeakerRoleBadge, Switch } from '../atoms';
import {
  lead,
  neutral1000,
  silver,
  steel,
  success100,
  success500,
} from '../colors';
import {
  alumniBadgeIcon,
  binIcon,
  tickInCircleIcon,
  userPlaceholderIcon,
} from '../icons';
import { InvalidTickIcon } from '../icons/invalid-tick-icon';
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
  // Without this a flex item never shrinks below its content, and the wider
  // column header would ignore the width below.
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

// getButtonStyles grows every button to `min-width: 100%` on mobile.
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

// Not the Pill atom: it brings a border and its own <small> type scale.
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
    // The icons ship at 20x20, which is the size they keep outside the pill.
    '> span > svg': { width: rem(14), height: rem(14) },
  });

export const flexRowGap8Styles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
});

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

const nameStyles = css({
  display: 'block',
  whiteSpace: 'nowrap',
  [`@media (max-width: ${mobileScreen.max}px)`]: {
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

export const findingsIcon = (shared: boolean, crossColor?: string) => (
  <span
    css={statusIconStyles}
    role="img"
    aria-label={
      shared ? 'Shared preliminary findings' : 'No preliminary findings'
    }
  >
    {shared ? tickInCircleIcon : <InvalidTickIcon color={crossColor} />}
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
                findingsIcon(preliminaryFindingsShared, steel.rgb)
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
            // Holds the chevron's column on the group row above.
            <span css={chevronSpacerStyles} />
          )}
        </span>
      )}
    </div>
  );
};

export default SpeakerUserRow;
