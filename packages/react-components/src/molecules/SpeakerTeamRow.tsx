import { ProjectType } from '@asap-hub/model';
import { network, projectRouteByType } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { useState } from 'react';

import { Button, Link } from '../atoms';
import { lead, steel } from '../colors';
import { chevronDownIcon, chevronUpIcon, InactiveBadgeIcon } from '../icons';
import {
  defaultVisibleSpeakers,
  EventTeamType,
  projectIcon,
  teamIcon,
} from '../organisms/shared-event-card';
import { chevronButtonStyles } from '../organisms/shared-event-card-styles';
import { groupFindings, showMoreLabel } from '../organisms/speaker-group';
import { mobileScreen, rem } from '../pixels';
import SpeakerUserRow, {
  findingsColumnStyles,
  findingsIcon,
  findingsPillStyles,
  trailingColumnsStyles,
} from './SpeakerUserRow';

const wrapperStyles = css({
  display: 'flex',
  flexDirection: 'column',
  paddingTop: rem(16),
  paddingBottom: rem(16),
  borderBottom: `1px solid ${steel.rgb}`,
  // Padding stays: it is half of the 32 between sections.
  '&:last-of-type': {
    borderBottom: 'none',
  },
});

const headerStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(24),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: rem(8),
  },
});

const groupTrailingStyles = css([
  trailingColumnsStyles,
  {
    [`@media (max-width: ${mobileScreen.max}px)`]: {
      alignSelf: 'stretch',
      justifyContent: 'space-between',
    },
  },
]);

// Team names never truncate; a name wider than the card scrolls it. Spacing
// comes from `gap`, not spaces — a flex container drops whitespace text nodes.
const labelStyles = css({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  gap: rem(8),
  fontSize: rem(17),
  [`@media (max-width: ${mobileScreen.max}px)`]: {
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

const showMoreStyles = css({
  display: 'flex',
  paddingLeft: rem(32),
  [`@media (max-width: ${mobileScreen.max}px)`]: { paddingLeft: rem(12) },
});

export type SpeakerTeamRowUser = {
  readonly id: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly roles: string[];
  readonly isAlumni?: boolean;
  readonly isExternal?: boolean;
  readonly preliminaryFindingsShared: boolean;
};

type SpeakerTeamRowProps = {
  readonly variant?: 'team' | 'project' | 'external';
  readonly teamId?: string;
  readonly teamType?: EventTeamType;
  readonly isTeamInactive?: boolean;
  readonly projectId?: string;
  readonly projectType?: ProjectType;
  readonly label: string;
  readonly users: ReadonlyArray<SpeakerTeamRowUser>;
  readonly showShared?: boolean;
  readonly showCount?: boolean;
  readonly expanded: boolean;
  readonly onToggleExpanded: () => void;
  readonly onToggleUserShared?: (userId: string, shared: boolean) => void;
  readonly onRemoveUser?: (userId: string) => void;
  readonly enabled?: boolean;
};

const SpeakerTeamRow: React.FC<SpeakerTeamRowProps> = ({
  variant = 'team',
  teamId,
  teamType,
  isTeamInactive,
  projectId,
  projectType,
  label,
  users,
  showShared = true,
  showCount = true,
  expanded,
  onToggleExpanded,
  onToggleUserShared,
  onRemoveUser,
  enabled = true,
}) => {
  const [showAllUsers, setShowAllUsers] = useState(false);
  const { shared, total, hasAnyShared } = groupFindings({ users });
  const visibleUsers = showAllUsers
    ? users
    : users.slice(0, defaultVisibleSpeakers);
  const hiddenUsers = users.length - visibleUsers.length;
  // The project route tree is split by type, so there is no path without one.
  const href =
    variant === 'project'
      ? projectId && projectType && projectRouteByType[projectType](projectId).$
      : variant === 'team' &&
        teamId &&
        network({}).teams({}).team({ teamId }).$;

  return (
    <div css={wrapperStyles} role="listitem">
      <div css={headerStyles}>
        <span css={labelStyles}>
          {variant === 'team' && teamIcon(teamType)}
          {variant === 'project' && projectIcon(projectType)}
          {href ? (
            <Link href={href} openInNewTab>
              <span css={teamNameStyles}>{label}</span>
            </Link>
          ) : (
            <span
              css={
                variant === 'external' ? externalLabelStyles : teamNameStyles
              }
            >
              {label}
            </span>
          )}
          {variant === 'team' && isTeamInactive && (
            <span css={inactiveBadgeStyles}>
              <InactiveBadgeIcon />
            </span>
          )}
          {showCount && <span css={countStyles}>({users.length})</span>}
        </span>
        <span css={groupTrailingStyles}>
          {showShared && (
            <span css={findingsColumnStyles}>
              <span css={findingsPillStyles(hasAnyShared)}>
                {findingsIcon(hasAnyShared)}
                {`${shared} of ${total} shared`}
              </span>
            </span>
          )}
          <button
            type="button"
            aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
            aria-expanded={expanded}
            onClick={() => {
              setShowAllUsers(false);
              onToggleExpanded();
            }}
            css={chevronButtonStyles}
          >
            {expanded ? chevronUpIcon : chevronDownIcon}
          </button>
        </span>
      </div>
      {expanded && (
        <div css={nestedListStyles} role="list">
          {visibleUsers.map((user) => {
            const isExternalUser = variant === 'external' || !!user.isExternal;
            return (
              <SpeakerUserRow
                key={user.id}
                displayName={user.displayName}
                avatarUrl={user.avatarUrl}
                roles={isExternalUser ? undefined : user.roles}
                userId={isExternalUser ? undefined : user.id}
                isAlumni={isExternalUser ? undefined : user.isAlumni}
                isExternal={isExternalUser}
                preliminaryFindingsShared={user.preliminaryFindingsShared}
                showShared={showShared}
                onToggleShared={
                  onToggleUserShared && !isExternalUser
                    ? (nextShared) => onToggleUserShared(user.id, nextShared)
                    : undefined
                }
                onRemove={
                  onRemoveUser ? () => onRemoveUser(user.id) : undefined
                }
                enabled={enabled}
              />
            );
          })}
        </div>
      )}
      {expanded && hiddenUsers > 0 && (
        <span css={showMoreStyles}>
          <Button linkStyle onClick={() => setShowAllUsers(true)}>
            {`${showMoreLabel(hiddenUsers, 'speaker')} in ${label}`}
          </Button>
        </span>
      )}
    </div>
  );
};

export default SpeakerTeamRow;
