import { InterestGroupResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import React, { ComponentProps } from 'react';
import { Paragraph, StateTag } from '../atoms';
import { colour } from '../colors';
import { InactiveBadgeIcon, TeamIcon } from '../icons';
import { LinkHeadline, TabbedCard } from '../molecules';
import { mobileScreen, rem, tabletScreen } from '../pixels';
import { splitListBy } from '../utils';

const itemsListWrapper = css({
  listStyle: 'none',
  margin: 0,
  display: 'grid',
  rowGap: rem(12),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    columnGap: rem(15),
  },
});

const listStyles = css({
  padding: 0,
  margin: 0,
  listStyleType: 'none',
});

const listElementStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(24),
  paddingTop: rem(28),
  paddingBottom: rem(28),
  borderBottom: `1px solid ${colour.border.tertiary}`,
  ':last-child': {
    borderBottom: 'none',
  },
});

const teamsStyles = css({
  color: colour.foreground.primary,
  display: 'flex',
  alignItems: 'center',
});

const iconStyles = css({
  display: 'inline-block',
  width: rem(24),
  height: rem(24),
  paddingRight: rem(15),
});

const titleStyle = css({
  display: 'flex',
  flexFlow: 'column',
  gap: rem(12),
  alignItems: 'flex-start',

  [`@media (min-width: ${mobileScreen.max}px)`]: {
    flexFlow: 'row',
    gap: rem(16),
    alignItems: 'center',
  },
});

type TeamGroupsTabbedCardProps = Pick<
  ComponentProps<typeof TabbedCard>,
  'title'
> & {
  teamId: string;
  interestGroups: InterestGroupResponse[];
  isTeamInactive: boolean;
};

const TeamInterestGroupsTabbedCard: React.FC<TeamGroupsTabbedCardProps> = ({
  title,
  teamId,
  interestGroups,
  isTeamInactive,
}) => {
  const [inactiveInterestGroups, activeInterestGroups] = splitListBy(
    interestGroups,
    (interestGroup) => {
      const interestGroupTeam = interestGroup.teams.find(
        (team) => team.id === teamId,
      );
      return (
        isTeamInactive ||
        !interestGroup?.active ||
        (!!interestGroupTeam?.endDate &&
          interestGroupTeam.endDate < new Date().toISOString())
      );
    },
  );

  return (
    <TabbedCard
      title={title}
      activeTabIndex={isTeamInactive ? 1 : 0}
      getShowMoreText={(showMore) =>
        `View ${showMore ? 'Less' : 'More'} Groups`
      }
      tabs={[
        {
          tabTitle: `Active Memberships (${
            isTeamInactive ? 0 : activeInterestGroups.length
          })`,
          items: activeInterestGroups,
          truncateFrom: 2,
          disabled: isTeamInactive,
          empty: (
            <Paragraph accent="neutral900" noMargin>
              There are no active memberships.
            </Paragraph>
          ),
        },
        {
          tabTitle: `Past Memberships (${
            isTeamInactive
              ? interestGroups.length
              : inactiveInterestGroups.length
          })`,
          items: isTeamInactive ? interestGroups : inactiveInterestGroups,
          truncateFrom: 2,
          disabled: inactiveInterestGroups.length === 0,
          empty: (
            <Paragraph accent="neutral900">
              There are no past memberships.
            </Paragraph>
          ),
        },
      ]}
    >
      {({ data }) => (
        <div css={itemsListWrapper}>
          <ul css={listStyles}>
            {data.map(({ id, teams, description, name, active }, index) => {
              const interestGroupTeam = teams.find(
                (team) => team.id === teamId,
              );
              return (
                <li css={listElementStyles} key={`team-group-${index}`}>
                  <div css={titleStyle}>
                    <LinkHeadline
                      href={
                        network({})
                          .interestGroups({})
                          .interestGroup({ interestGroupId: id }).$
                      }
                      level={4}
                      noMargin={true}
                    >
                      {name}
                    </LinkHeadline>
                    {(!active ||
                      (interestGroupTeam?.endDate &&
                        interestGroupTeam.endDate <
                          new Date().toISOString())) && (
                      <StateTag icon={<InactiveBadgeIcon />} label="Inactive" />
                    )}
                  </div>

                  <Paragraph noMargin accent="neutral900">
                    {description}
                  </Paragraph>
                  <span css={teamsStyles}>
                    <span css={iconStyles}>
                      <TeamIcon />{' '}
                    </span>
                    {teams.length} Team{teams.length !== 1 ? 's' : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </TabbedCard>
  );
};

export default TeamInterestGroupsTabbedCard;
