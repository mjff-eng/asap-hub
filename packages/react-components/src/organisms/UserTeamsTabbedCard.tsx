import { UserTeam } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import React, { Fragment } from 'react';
import { Divider, Link, Paragraph } from '../atoms';
import { InactiveBadgeIcon } from '../icons';
import { TabbedCard } from '../molecules';
import { rem, tabletScreen } from '../pixels';
import { colour } from '../colors';
import {
  byTeamRolePriority,
  groupUserTeamsByTeamId,
  splitListBy,
} from '../utils';
import { formatDateToTimezone, weekdayShortDateFormat } from '../date';

const MAX_TEAMS = 5;

const inactiveBadgeStyles = css({
  lineHeight: 0,
  verticalAlign: 'top',
  marginLeft: rem(8),
});

const listItemStyle = css({
  display: 'grid',

  gridTemplateColumns: '1fr',
  gridTemplateRows: '1fr 1fr',
  rowGap: rem(16),

  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridAutoFlow: 'column',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: 'auto 1fr',
    rowGap: rem(12),

    '&:not(:first-of-type)': {
      gridTemplateRows: '1fr',
    },

    [`&:not(:first-of-type) > :nth-of-type(odd)`]: {
      display: 'none',
    },
  },
});

const containerStyle = css({
  display: 'grid',

  columnGap: rem(12),

  margin: 0,
  marginTop: rem(32),

  [`@media (min-width: ${tabletScreen.min}px)`]: {
    marginTop: rem(24),
  },

  padding: 0,
  listStyle: 'none',
});

const titleStyle = css({
  fontWeight: 'bold',
});

const dividerMobileStyle = css({
  marginBottom: rem(8),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    marginBottom: 0,
  },
});

const roleTitleMobileStyle = css({
  marginTop: rem(16),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    marginTop: 0,
  },
});

const rolesColumnStyle = css({
  color: colour.foreground.tertiary,
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gap: 0,
  },
});

type UserTeamsTabbedCardProps = {
  userAlumni: boolean;
  teams: UserTeam[];
};

const UserTeamsTabbedCard: React.FC<UserTeamsTabbedCardProps> = ({
  userAlumni,
  teams,
}) => {
  const teamHref = (id: string) => network({}).teams({}).team({ teamId: id }).$;
  const [rawInactive, rawActive] = splitListBy(
    teams,
    (team) =>
      userAlumni || !!team?.teamInactiveSince || !!team?.inactiveSinceDate,
  );
  const activeTeams =
    groupUserTeamsByTeamId(rawActive).sort(byTeamRolePriority);
  const inactiveTeams =
    groupUserTeamsByTeamId(rawInactive).sort(byTeamRolePriority);
  return (
    <div id="user-teams-tabbed-card">
      <TabbedCard
        title="Teams and Roles"
        description={
          <Paragraph noMargin accent="tertiary">
            Teams are a constellation of labs focus on a specific grant
            proposal. Find out teams status and the member's current and past
            roles within them.
          </Paragraph>
        }
        activeTabIndex={userAlumni ? 1 : 0}
        tabs={[
          {
            tabTitle: `Current (${activeTeams.length})`,
            items: activeTeams,
            truncateFrom: MAX_TEAMS,
            empty: (
              <Paragraph accent="tertiary" noMargin>
                No team affiliation.
              </Paragraph>
            ),
          },
          {
            tabTitle: `Former (${inactiveTeams.length})`,
            items: inactiveTeams,
            truncateFrom: MAX_TEAMS,
            empty: (
              <Paragraph accent="tertiary" noMargin>
                There are no previous teams.
              </Paragraph>
            ),
          },
        ]}
        getShowMoreText={(showMore) =>
          `View ${showMore ? 'Less' : 'More'} Teams`
        }
      >
        {({ data }) => (
          <div>
            <ul css={containerStyle}>
              {data.map(
                (
                  {
                    id,
                    displayName,
                    teamInactiveSince,
                    roles: teamRoles,
                    inactiveSinceDate,
                  },
                  idx,
                ) => {
                  const showDateLeftColumn =
                    !!inactiveSinceDate || !!teamInactiveSince;
                  const formattedDateLeft =
                    showDateLeftColumn &&
                    formatDateToTimezone(
                      (inactiveSinceDate || teamInactiveSince) as string,
                      weekdayShortDateFormat,
                    );
                  return (
                    <Fragment key={`team-${idx}`}>
                      {idx === 0 || (
                        <div css={dividerMobileStyle}>
                          <Divider />
                        </div>
                      )}
                      <li key={idx} css={listItemStyle}>
                        <div css={titleStyle}>Team</div>
                        <div>
                          <Link href={teamHref(id)}>Team {displayName}</Link>
                          {teamInactiveSince && (
                            <span css={inactiveBadgeStyles}>
                              <InactiveBadgeIcon />
                            </span>
                          )}
                        </div>
                        <div css={[titleStyle, roleTitleMobileStyle]}>Role</div>
                        <div css={rolesColumnStyle}>
                          {teamRoles.map((role) => (
                            <div key={role}>{role}</div>
                          ))}
                        </div>
                        {showDateLeftColumn && (
                          <>
                            <div css={titleStyle}>Date Left</div>
                            <div>{formattedDateLeft}</div>
                          </>
                        )}
                      </li>
                    </Fragment>
                  );
                },
              )}
            </ul>
          </div>
        )}
      </TabbedCard>
    </div>
  );
};

export default UserTeamsTabbedCard;
