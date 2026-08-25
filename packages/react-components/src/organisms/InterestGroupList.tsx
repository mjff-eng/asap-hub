import { InterestGroupResponse, UserResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import React, { Fragment } from 'react';
import { Divider, Link } from '../atoms';
import { neutral900 } from '../colors';
import { rem, tabletScreen } from '../pixels';

const titleStyle = css({
  fontWeight: 'bold',
});

const roleStyle = css({
  color: neutral900.rgb,
});

const containerStyles = css({
  display: 'grid',

  gridColumnGap: rem(18),

  margin: 0,
  marginTop: rem(24),

  padding: 0,
  listStyle: 'none',
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

type InterestGroupListProps = Pick<UserResponse, 'id'> & {
  readonly interestGroups: ReadonlyArray<InterestGroupResponse>;
};

const InterestGroupList: React.FC<InterestGroupListProps> = ({
  id,
  interestGroups,
}) => (
  <ul css={containerStyles}>
    {interestGroups.map((interestGroup, idx) => (
      <Fragment key={`group-${idx}`}>
        {idx === 0 || <Divider />}
        <li key={idx} css={listItemStyle}>
          <div css={[titleStyle]}>Group</div>
          <div>
            <Link
              ellipsed
              href={
                network({})
                  .interestGroups({})
                  .interestGroup({ interestGroupId: interestGroup.id }).$
              }
            >
              {interestGroup.name}
            </Link>
          </div>
          <div css={[titleStyle]}>Role</div>
          <div css={roleStyle}>
            {interestGroup.leaders.find((leader) => leader.user.id === id)
              ?.role ?? 'Member'}
          </div>
        </li>
      </Fragment>
    ))}
  </ul>
);

export default InterestGroupList;
