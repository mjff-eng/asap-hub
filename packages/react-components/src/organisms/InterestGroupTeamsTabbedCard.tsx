import { TeamResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import React, { ComponentProps } from 'react';
import { Link, Paragraph } from '../atoms';
import { InactiveBadgeIcon, TeamIcon } from '../icons';
import { TabbedCard } from '../molecules';
import { rem, tabletScreen } from '../pixels';
import { splitListBy } from '../utils';

const inactiveBadgeStyles = css({
  lineHeight: rem(18),
  verticalAlign: 'middle',
});

const listItemStyle = css({
  display: 'flex',
  flexFlow: 'row',
  gap: rem(9),
});

const containerStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: `${rem(32)} 0`,
  display: 'grid',
  rowGap: rem(12),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '1fr 1fr',
    columnGap: rem(15),
  },
});

type InterestGroupTeamsTabbedCardProps = Pick<
  ComponentProps<typeof TabbedCard>,
  'description'
> & {
  teams: ReadonlyArray<
    Pick<TeamResponse, 'id' | 'displayName' | 'inactiveSince'> & {
      endDate?: string;
    }
  >;
  isInterestGroupActive: boolean;
};

const GroupTeamsTabbedCard: React.FC<InterestGroupTeamsTabbedCardProps> = ({
  teams,
  isInterestGroupActive,
}) => {
  const [inactiveTeams, activeTeams] = splitListBy(
    teams,
    (team) =>
      !isInterestGroupActive ||
      !!team?.inactiveSince ||
      (!!team?.endDate && team.endDate < new Date().toISOString()),
  );

  return (
    <TabbedCard
      title={'Interest Group Teams'}
      activeTabIndex={isInterestGroupActive ? 0 : 1}
      tabs={[
        {
          tabTitle: `Active Teams (${activeTeams.length})`,
          items: activeTeams,
          truncateFrom: 8,
          disabled: !isInterestGroupActive,
          empty: (
            <Paragraph accent="tertiary">
              There are no active team members.
            </Paragraph>
          ),
        },
        {
          tabTitle: `Past Teams (${inactiveTeams.length})`,
          items: inactiveTeams,
          truncateFrom: 8,
          disabled: inactiveTeams.length === 0,
          empty: (
            <Paragraph accent="tertiary">
              There are no past team members.
            </Paragraph>
          ),
        },
      ]}
      getShowMoreText={(showMore) => `View ${showMore ? 'Less' : 'More'} Teams`}
    >
      {({ data }) => (
        <ul css={containerStyles}>
          {data.map(({ id, displayName, inactiveSince, endDate }) => (
            <li key={`team-${id}`} css={listItemStyle}>
              <TeamIcon />
              <Link
                ellipsed
                href={network({}).teams({}).team({ teamId: id }).$}
              >
                {displayName}
              </Link>
              {inactiveSince ||
                (endDate && endDate < new Date().toISOString() && (
                  <span css={inactiveBadgeStyles}>
                    <InactiveBadgeIcon />
                  </span>
                ))}
            </li>
          ))}
        </ul>
      )}
    </TabbedCard>
  );
};

export default GroupTeamsTabbedCard;
