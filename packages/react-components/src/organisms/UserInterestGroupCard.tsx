import { InterestGroupResponse, UserResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import React from 'react';
import { Divider, Link, Paragraph } from '../atoms';
import { colour } from '../colors';
import { TabbedCard } from '../molecules';
import { rem, tabletScreen } from '../pixels';
import { splitListBy } from '../utils';

const itemsListWrapper = css({
  display: 'flex',
  flexDirection: 'column',
  paddingTop: rem(33),
  paddingBottom: rem(33),
});

const dividerStyles = css({
  display: 'flex',
  height: rem(42),
  flexDirection: 'column',
  justifyContent: 'center',
});

const titleStyle = css({
  fontWeight: 'bold',
});

const roleStyle = css({
  color: colour.foreground.tertiary,
});

const listItemStyle = css({
  display: 'grid',

  gridTemplateColumns: '1fr',
  gridTemplateRows: '1fr 1fr',
  gridRowGap: rem(12),

  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridAutoFlow: 'column',
    gridTemplateColumns: '1fr 1fr',

    '&:not(:first-of-type)': {
      gridTemplateRows: '1fr',
    },

    [`&:not(:first-of-type) > :nth-of-type(odd)`]: {
      display: 'none',
    },
  },
});

type UserInterestGroupItemProps = InterestGroupResponse & {
  index: number;
  userId: string;
};

const UserInterestGroupItem: React.FC<UserInterestGroupItemProps> = ({
  id,
  userId,
  name,
  leaders,
  index,
}) => (
  <>
    {index !== 0 && (
      <div css={dividerStyles}>
        <Divider />
      </div>
    )}
    <li css={listItemStyle}>
      <div css={[titleStyle]}>Group</div>
      <div>
        <Link
          ellipsed
          href={
            network({})
              .interestGroups({})
              .interestGroup({ interestGroupId: id }).$
          }
        >
          {name}
        </Link>
      </div>
      <div css={[titleStyle]}>Role</div>
      <div css={roleStyle}>
        {leaders.find((leader) => leader.user.id === userId)?.role ?? 'Member'}
      </div>
    </li>
  </>
);

type UserInterestGroupCardProps = Pick<
  UserResponse,
  'alumniSinceDate' | 'id'
> & {
  interestGroups: InterestGroupResponse[];
};

const UserInterestGroupCard: React.FC<UserInterestGroupCardProps> = ({
  id,
  alumniSinceDate,
  interestGroups,
}) => {
  const [activeMemberships, inactiveMemberships] = splitListBy(
    interestGroups,
    (interestGroup) => {
      if (interestGroup.active) {
        const leader = interestGroup.leaders.find(
          (leaderData) => leaderData.user.id === id,
        );
        if (leader?.inactiveSinceDate) {
          return false;
        }
        return !alumniSinceDate;
      }
      return false;
    },
  );

  return (
    <TabbedCard
      title="Interest Groups"
      description={
        <Paragraph
          noMargin
          accent="tertiary"
          styles={css({ margin: '0 0 8px' })}
        >
          Interest groups allow teams to share findings with other teams about
          topics of interest. Find out the membership status of this member.
        </Paragraph>
      }
      activeTabIndex={alumniSinceDate ? 1 : 0}
      getShowMoreText={(showMore) =>
        `View ${showMore ? 'less' : 'more'} interest groups`
      }
      tabs={[
        {
          tabTitle: `Active Collaborations (${
            alumniSinceDate ? 0 : activeMemberships.length
          })`,
          items: activeMemberships,
          truncateFrom: 5,
          disabled: activeMemberships.length === 0,
          empty: (
            <Paragraph accent="tertiary">
              There are no active collaborations.
            </Paragraph>
          ),
        },
        {
          tabTitle: `Past Collaborations (${inactiveMemberships.length})`,
          items: inactiveMemberships,
          truncateFrom: 5,
          disabled: inactiveMemberships.length === 0,
          empty: (
            <Paragraph accent="tertiary">
              There are no past collaborations.
            </Paragraph>
          ),
        },
      ]}
    >
      {({ data }) => (
        <div css={itemsListWrapper}>
          {data.map((item, index) => (
            <UserInterestGroupItem
              key={`${index}-user-interest-group`}
              {...item}
              userId={id}
              index={index}
            />
          ))}
        </div>
      )}
    </TabbedCard>
  );
};

export default UserInterestGroupCard;
