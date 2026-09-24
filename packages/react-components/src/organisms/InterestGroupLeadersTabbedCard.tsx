import { InterestGroupLeader } from '@asap-hub/model';
import { css } from '@emotion/react';
import React from 'react';
import { Paragraph } from '../atoms';
import { MembersList, TabbedCard } from '../molecules';
import { rem, tabletScreen } from '../pixels';
import { splitListBy } from '../utils';

const containerStyles = css({
  padding: `${rem(32)} 0`,
  display: 'grid',
  rowGap: rem(12),
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    columnGap: rem(15),
  },
});

type InterestGroupLeadersTabbedCardProps = {
  leaders: ReadonlyArray<
    Pick<InterestGroupLeader, 'user' | 'role' | 'inactiveSinceDate'>
  >;
  isInterestGroupActive: boolean;
};

const InterestGroupLeadersTabbedCard: React.FC<
  InterestGroupLeadersTabbedCardProps
> = ({ leaders, isInterestGroupActive: isGroupActive }) => {
  const [inactiveLeaders, activeLeaders] = splitListBy(
    leaders,
    (leader) =>
      !isGroupActive ||
      !!leader?.user?.alumniSinceDate ||
      !!leader?.inactiveSinceDate,
  );

  return (
    <TabbedCard
      title={'Interest Group Leaders'}
      activeTabIndex={isGroupActive ? 0 : 1}
      tabs={[
        {
          tabTitle: `Active Leaders (${activeLeaders.length})`,
          items: activeLeaders,
          disabled: !isGroupActive,
          empty: (
            <Paragraph accent="neutral900">
              There are no active leaders.
            </Paragraph>
          ),
        },
        {
          tabTitle: `Past Leaders (${inactiveLeaders.length})`,
          items: inactiveLeaders,
          disabled: inactiveLeaders.length === 0,

          empty: (
            <Paragraph accent="neutral900">
              There are no past leaders.
            </Paragraph>
          ),
        },
      ]}
    >
      {({ data }) => (
        <div css={containerStyles}>
          <MembersList
            members={data.map(({ user, role }) => ({
              ...user,
              firstLine: user.displayName,
              secondLine: role,
              thirdLine: user.teams.length <= 1 ? user.teams : 'Multiple Teams',
            }))}
          />
        </div>
      )}
    </TabbedCard>
  );
};

export default InterestGroupLeadersTabbedCard;
