import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { Link, Switch } from '../atoms';
import { lead, steel } from '../colors';
import { chevronDownIcon, chevronUpIcon, InactiveBadgeIcon } from '../icons';
import { EventTeamType, teamIcon } from '../organisms/shared-event-card';
import { chevronButtonStyles } from '../organisms/shared-event-card-styles';
import {
  mobileScreen,
  rem,
  tabletScreen,
  vminLinearCalcClamped,
} from '../pixels';
import SpeakerUserRow from './SpeakerUserRow';

const wrapperStyles = css({
  display: 'flex',
  flexDirection: 'column',
  paddingTop: rem(16),
  paddingBottom: rem(16),
  borderBottom: `1px solid ${steel.rgb}`,
  '&:first-of-type': {
    paddingTop: 0,
  },
  '&:last-of-type': {
    paddingBottom: 0,
    borderBottom: 'none',
  },
});

// [name+counter] and [switch+chevron], per Figma's auto-layout. `gap` is a
// floor — space-between still pushes the switch/chevron group flush right
// whenever there's room.
const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(24),
});

// No `overflow`/`minWidth: 0` — team names never truncate. A name wider than
// the card just scrolls (overflowX: auto on groupsCardStyles), matching
// EditEventAttendanceModal. Spacing between icon/name/badge/count comes from
// `gap`, not a literal space character — a flex container drops anonymous
// all-whitespace text nodes (see EventSpeakers.tsx's teamInfoStyles, the
// same fix applied there).
const labelStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  gap: rem(8),
  fontSize: rem(17),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    // Figma's "Caption/C1" mobile type scale for the team name + counter.
    fontSize: rem(14),
    lineHeight: rem(16),
    '> svg': { display: 'none' },
  },
  '> svg': {
    width: rem(24),
    height: rem(24),
    flexShrink: 0,
  },
});

const leadTextStyles = css({ color: lead.rgb, fontWeight: 400 });

const teamNameStyles = css({ whiteSpace: 'nowrap', fontWeight: 400 });

const externalLabelStyles = css([leadTextStyles, { whiteSpace: 'nowrap' }]);

const inactiveBadgeStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
});

const countStyles = css([leadTextStyles, { flexShrink: 0 }]);

// Scales with the viewport instead of jumping at a breakpoint, bottoming
// out at 12px (Figma's own spacing annotation for this gap).
const actionsGap = vminLinearCalcClamped(
  mobileScreen,
  12,
  tabletScreen,
  24,
  'px',
);

const actionsStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  gap: actionsGap,
});

const nestedListStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  marginTop: rem(16),
  paddingBottom: rem(12),
  paddingLeft: rem(32),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    gap: rem(24),
    paddingLeft: rem(12),
  },
});

export type SpeakerTeamRowUser = {
  readonly id: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly roles: string[];
  readonly isAlumni?: boolean;
};

type SpeakerTeamRowProps = {
  readonly variant?: 'team' | 'external';
  readonly teamId?: string;
  readonly teamType?: EventTeamType;
  readonly isTeamInactive?: boolean;
  readonly label: string;
  readonly users: ReadonlyArray<SpeakerTeamRowUser>;
  readonly preliminaryFindingsShared: boolean;
  readonly showShared?: boolean;
  readonly expanded: boolean;
  readonly onToggleExpanded: () => void;
  readonly onToggleShared: () => void;
  readonly onRemoveUser: (userId: string) => void;
  readonly enabled?: boolean;
};

const SpeakerTeamRow: React.FC<SpeakerTeamRowProps> = ({
  variant = 'team',
  teamId,
  teamType,
  isTeamInactive,
  label,
  users,
  preliminaryFindingsShared,
  showShared = true,
  expanded,
  onToggleExpanded,
  onToggleShared,
  onRemoveUser,
  enabled = true,
}) => (
  <div css={wrapperStyles} role="listitem">
    <div css={headerStyles}>
      <span css={labelStyles}>
        {variant === 'team' && teamIcon(teamType)}
        {variant === 'team' && teamId ? (
          <Link href={network({}).teams({}).team({ teamId }).$}>
            <span css={teamNameStyles}>{label}</span>
          </Link>
        ) : (
          <span css={variant === 'team' ? teamNameStyles : externalLabelStyles}>
            {label}
          </span>
        )}
        {variant === 'team' && isTeamInactive && (
          <span css={inactiveBadgeStyles}>
            <InactiveBadgeIcon />
          </span>
        )}
        <span css={countStyles}>({users.length})</span>
      </span>
      <span css={actionsStyles}>
        {showShared && (
          <Switch
            checked={preliminaryFindingsShared}
            enabled={enabled}
            uncheckedColor="error"
            ariaLabel={`${label} preliminary findings shared`}
            onClick={onToggleShared}
          />
        )}
        <button
          type="button"
          aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
          aria-expanded={expanded}
          onClick={onToggleExpanded}
          css={chevronButtonStyles}
        >
          {expanded ? chevronUpIcon : chevronDownIcon}
        </button>
      </span>
    </div>
    {expanded && (
      <div css={nestedListStyles} role="list">
        {users.map((user) => (
          <SpeakerUserRow
            key={user.id}
            displayName={user.displayName}
            avatarUrl={user.avatarUrl}
            roles={variant === 'team' ? user.roles : undefined}
            userId={variant === 'team' ? user.id : undefined}
            isAlumni={variant === 'team' ? user.isAlumni : undefined}
            isExternal={variant === 'external'}
            onRemove={() => onRemoveUser(user.id)}
            enabled={enabled}
          />
        ))}
      </div>
    )}
  </div>
);

export default SpeakerTeamRow;
