import { EventResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';

import { Link } from '../atoms';
import { colour } from '../colors';
import {
  asapEventIcon,
  InterestGroupsIcon,
  InactiveBadgeIcon,
  WorkingGroupsIcon,
} from '../icons';
import { rem } from '../pixels';

const listItemStyles = css({
  color: colour.foreground.tertiary,
  whiteSpace: 'break-spaces',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: rem(17),
  display: 'flex',
});

const iconStyles = css({
  display: 'inline-grid',
  verticalAlign: 'middle',
  width: rem(24),
  height: rem(24),
  paddingRight: rem(9),
});

const inactiveBadgeStyles = {
  lineHeight: rem(18),
  verticalAlign: 'middle',
  marginLeft: rem(8),
};

const EventOwner: React.FC<
  Pick<EventResponse, 'interestGroup' | 'workingGroup'>
> = ({ interestGroup, workingGroup }) => (
  <div css={listItemStyles}>
    {interestGroup ? (
      <Link
        href={
          network({})
            .interestGroups({})
            .interestGroup({ interestGroupId: interestGroup.id }).$
        }
      >
        <span css={iconStyles}>
          <InterestGroupsIcon />
        </span>
        {interestGroup.name}
        {!interestGroup.active && (
          <span css={inactiveBadgeStyles}>
            <InactiveBadgeIcon entityName="Interest Group" />
          </span>
        )}
      </Link>
    ) : workingGroup ? (
      <Link
        href={
          network({})
            .workingGroups({})
            .workingGroup({ workingGroupId: workingGroup.id }).$
        }
      >
        <span css={iconStyles}>
          <WorkingGroupsIcon />
        </span>
        {workingGroup.title}
      </Link>
    ) : (
      <>
        <span css={iconStyles}>{asapEventIcon}</span>
        ASAP Event
      </>
    )}
  </div>
);

export default EventOwner;
