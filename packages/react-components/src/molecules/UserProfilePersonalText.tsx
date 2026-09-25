import React, { FC, useContext, useState } from 'react';
import { css } from '@emotion/react';
import { UserListItemResponse, UserTeam } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { UserProfileContext } from '@asap-hub/react-context';

import { Link, Ellipsis, Anchor, Subtitle, OverflowBadge } from '../atoms';
import { alumniBadgeIcon, locationIcon } from '../icons';
import { rem, lineHeight } from '../pixels';
import { colour } from '../colors';
import {
  formatUserLocation,
  groupUserTeamsByTeamId,
  splitListBy,
} from '../utils';
import TagList from './TagList';
import TooltipInfo from './TooltipInfo';
import { styles, getLinkColors } from '../atoms/Link';

const MAX_TEAMS = 2;

const locationStyles = css({
  padding: `${rem(6)} 0 ${rem(24)}`,
  display: 'flex',
  alignItems: 'center',
  color: colour.foreground.tertiary,
});

const iconStyles = css({
  display: 'inline-block',
  width: rem(lineHeight),
  height: rem(lineHeight),
  paddingRight: rem(6),
});

const paragraphStyles = css({
  marginTop: 0,
  marginBottom: rem(18),
  color: colour.foreground.tertiary,
});

const badgeStyles = css({
  lineHeight: rem(8),
  marginLeft: rem(8),
});

const tagsContainerStyles = css({
  paddingBottom: rem(12),
});

const formatInlineList = (
  items: string[],
  { trailingSpace }: { trailingSpace?: boolean } = {},
): React.ReactNode => {
  if (items.length === 0) return null;
  if (items.length === 1) return trailingSpace ? `${items[0]} ` : items[0];
  if (items.length === 2)
    return trailingSpace
      ? `${items[0]} and ${items[1]} `
      : `${items[0]} and ${items[1]}`;
  const overflow = items.length - 2;
  return (
    <>
      {items[0]},{' '}
      <span style={{ whiteSpace: 'nowrap' }}>
        {items[1]}
        <OverflowBadge count={overflow} />
      </span>
    </>
  );
};

type UserProfilePersonalTextProps = Pick<
  UserListItemResponse,
  | 'institution'
  | 'jobTitle'
  | 'country'
  | 'stateOrProvince'
  | 'city'
  | 'labs'
  | 'tags'
> & { isAlumni?: boolean; teams: UserTeam[] };
const UserProfilePersonalText: FC<UserProfilePersonalTextProps> = ({
  institution,
  country,
  stateOrProvince,
  city,
  jobTitle,
  teams,
  labs,
  tags,
  isAlumni,
}) => {
  const { isOwnProfile } = useContext(UserProfileContext);
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllInactive, setShowAllInactive] = useState(false);

  const uniqueLabNames = [...new Set(labs.map((lab) => `${lab.name} Lab`))];
  const labsList = formatInlineList(uniqueLabNames);

  const [rawInactive, rawActive] = splitListBy(
    teams,
    (team) =>
      isAlumni || !!team?.teamInactiveSince || !!team?.inactiveSinceDate,
  );
  const activeTeams = groupUserTeamsByTeamId(rawActive);
  const inactiveTeams = groupUserTeamsByTeamId(rawInactive);

  const visibleActiveTeams = showAllActive
    ? activeTeams
    : activeTeams.slice(0, MAX_TEAMS);
  const visibleInactiveTeams = showAllInactive
    ? inactiveTeams
    : inactiveTeams.slice(0, MAX_TEAMS);

  return (
    <div>
      <div css={paragraphStyles}>
        {jobTitle || institution ? (
          <>
            {jobTitle}
            {jobTitle && institution && ' at '}
            {institution}
          </>
        ) : isOwnProfile ? (
          <span css={{ color: colour.foreground.disabled }}>
            Where do you work and what's your position?
          </span>
        ) : null}

        {labsList && <div>{labsList}</div>}
        {teams.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <em>No team affiliation</em>
            <TooltipInfo>
              Some members are not linked to a team because they work directly
              under a project.
            </TooltipInfo>
          </div>
        ) : (
          <>
            {visibleActiveTeams.map(({ id, roles: teamRoles, displayName }) => (
              <div key={id}>
                {formatInlineList(teamRoles, { trailingSpace: true })}on{' '}
                <Link href={network({}).teams({}).team({ teamId: id }).$}>
                  Team {displayName}
                </Link>
              </div>
            ))}
            {activeTeams.length > MAX_TEAMS && (
              <Anchor
                href="#"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  if (showAllActive) {
                    setShowAllActive(false);
                  } else {
                    const teamsCard = document.getElementById(
                      'user-teams-tabbed-card',
                    );
                    if (teamsCard) {
                      teamsCard.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      setShowAllActive(true);
                    }
                  }
                }}
                css={(theme) => [styles, getLinkColors(theme.colors, 'light')]}
              >
                {showAllActive ? 'View less roles' : 'View all roles'}
              </Anchor>
            )}
            {inactiveTeams.length ? (
              <div
                css={css({
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: rem(16),
                })}
              >
                <Subtitle noMargin>Former Roles</Subtitle>
                <span css={badgeStyles}>{alumniBadgeIcon}</span>
              </div>
            ) : null}
            {visibleInactiveTeams.map(
              ({ id, roles: teamRoles, displayName }) => (
                <div key={id}>
                  {formatInlineList(teamRoles, { trailingSpace: true })}on{' '}
                  <Link href={network({}).teams({}).team({ teamId: id }).$}>
                    Team {displayName}
                  </Link>
                </div>
              ),
            )}
            {inactiveTeams.length > MAX_TEAMS && (
              <Anchor
                href="#"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  if (showAllInactive) {
                    setShowAllInactive(false);
                  } else {
                    const teamsCard = document.getElementById(
                      'user-teams-tabbed-card',
                    );
                    if (teamsCard) {
                      teamsCard.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      setShowAllInactive(true);
                    }
                  }
                }}
                css={(theme) => [styles, getLinkColors(theme.colors, 'light')]}
              >
                {showAllInactive
                  ? 'View less former roles'
                  : 'View all former roles'}
              </Anchor>
            )}
          </>
        )}
      </div>
      {(country || stateOrProvince || city || isOwnProfile) && (
        <span css={locationStyles}>
          <span css={iconStyles}>{locationIcon}</span>
          {country || stateOrProvince || city ? (
            <Ellipsis>
              {formatUserLocation(city, stateOrProvince, country)}
            </Ellipsis>
          ) : (
            <span css={{ color: colour.foreground.disabled }}>
              Add your location
            </span>
          )}
        </span>
      )}
      {tags?.length ? (
        <div css={tagsContainerStyles}>
          <TagList max={3} tags={tags.map((tag) => tag.name)} />
        </div>
      ) : null}
    </div>
  );
};

export default UserProfilePersonalText;
