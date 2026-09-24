import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { Avatar, Button, Link, Paragraph, PillSelector } from '../atoms';
import { neutral1000, warning100, warning900, colour } from '../colors';
import { binIcon, plusIcon, WarningIcon } from '../icons';
import { deleteButtonStyles } from '../organisms/shared-event-card-styles';
import { mobileScreen, rem } from '../pixels';
import { splitDisplayName } from '../utils/user';
import { avatar24Styles } from './SpeakerUserRow';

const hideOnMobileStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: { display: 'none' },
});

const hideOnDesktopStyles = css({
  [`@media (min-width: ${mobileScreen.max + 1}px)`]: { display: 'none' },
});

// Sits as the table's first row, so its own bottom spacing — not a top margin
// — separates it from the row that follows. Desktop: [icon] [content column],
// icon top-aligned 16px left of the content. Mobile: the desktop icon hides
// and the mobile-only icon inside pendingHeaderStyles takes over.
const cardStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: rem(16),
  marginBottom: rem(16),
  padding: rem(16),
  border: `1px solid ${warning900.rgb}`,
  borderRadius: rem(8),
  backgroundColor: warning100.rgb,
});

const iconDesktopStyles = css([hideOnMobileStyles, { flexShrink: 0 }]);

const contentStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
  flexGrow: 1,
  minWidth: 0,
});

// Desktop: one row (avatar, name, dismiss — dismiss pushed flush right via its
// own marginLeft: auto; the warning icon lives outside this row). Mobile: wraps
// into two lines — icon + dismiss on top, avatar + name below — matching Figma.
// `order`/`flexBasis` reflow visually without changing DOM order (kept stable
// for a11y).
const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(8),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexWrap: 'wrap',
  },
});

const iconStyles = css([
  hideOnDesktopStyles,
  {
    display: 'inline-flex',
    alignItems: 'center',
    [`@media (max-width: ${mobileScreen.max}px)`]: { order: 1 },
  },
]);

// A dedicated, empty line-break — not `flexBasis: 100%` on the avatar or name
// themselves, which would each claim the whole line for themselves (pushing the
// other to a third line) instead of sharing the new line. Hidden on desktop:
// even at zero width it's still a real flex item, so left unhidden it'd eat
// headerStyles' gap on both sides — showing up as stray space before the avatar.
const lineBreakStyles = css([
  hideOnDesktopStyles,
  {
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      order: 3,
      flexBasis: '100%',
      width: 0,
    },
  },
]);

const avatarSlotStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: { order: 4 },
});

// `order` lives on this wrapper, not on nameStyles below: Link renders an <a>,
// so the actual flex child of headerStyles is the anchor, not the inner span —
// order on the span would have no effect.
const nameSlotStyles = css({
  [`@media (max-width: ${mobileScreen.max}px)`]: { order: 5 },
});

const nameStyles = css({
  color: colour.brand.crn[500],
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
});

const dismissStyles = (enabled: boolean) =>
  css([
    deleteButtonStyles(enabled),
    {
      marginLeft: 'auto',
      [`@media (max-width: ${mobileScreen.max}px)`]: {
        order: 2,
      },
    },
  ]);

const warningTextStyles = css({
  color: warning900.rgb,
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    fontSize: rem(14),
    lineHeight: rem(16),
  },
});

const pillStyles = css({
  fontSize: rem(17),
  fontWeight: 400,
  lineHeight: rem(24),
  color: neutral1000.rgb,
});

type PendingSpeakerCardProps = {
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly userId: string;
  readonly teams: ReadonlyArray<{ teamId: string; teamName: string }>;
  readonly onPickTeam: (teamId: string) => void;
  readonly onDismiss: () => void;
  readonly enabled?: boolean;
};

const PendingSpeakerCard: React.FC<PendingSpeakerCardProps> = ({
  displayName,
  avatarUrl,
  userId,
  teams,
  onPickTeam,
  onDismiss,
  enabled = true,
}) => (
  <div css={cardStyles} role="status">
    <span css={iconDesktopStyles}>
      <WarningIcon />
    </span>
    <div css={contentStyles}>
      <div css={headerStyles}>
        <span css={iconStyles}>
          <WarningIcon />
        </span>
        <span css={lineBreakStyles} aria-hidden="true" />
        <span css={avatarSlotStyles}>
          <Avatar
            {...splitDisplayName(displayName)}
            imageUrl={avatarUrl}
            overrideStyles={avatar24Styles}
          />
        </span>
        <span css={nameSlotStyles}>
          <Link href={network({}).users({}).user({ userId }).$} openInNewTab>
            <span css={nameStyles}>{displayName}</span>
          </Link>
        </span>
        <Button
          noMargin
          small
          enabled={enabled}
          aria-label={`Remove ${displayName}`}
          onClick={onDismiss}
          overrideStyles={dismissStyles(enabled)}
        >
          {binIcon}
        </Button>
      </div>
      <Paragraph noMargin styles={warningTextStyles}>
        Pick a team to finish adding them.
      </Paragraph>
      <PillSelector<string>
        fullWidthOnMobile
        enabled={enabled}
        overrideStyles={pillStyles}
        options={teams.map((team) => ({
          value: team.teamId,
          label: team.teamName,
          icon: plusIcon,
        }))}
        value={[]}
        onChange={(values) => values.forEach(onPickTeam)}
      />
    </div>
  </div>
);

export default PendingSpeakerCard;
