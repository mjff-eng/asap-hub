import React, { FC } from 'react';
import { css } from '@emotion/react';
import { network } from '@asap-hub/routing';

import {
  LabIcon,
  TeamIcon,
  InactiveBadgeIcon,
  WorkingGroupsIcon,
  ImpactIcon,
  CategoryIcon,
} from '../icons';
import { Avatar, Link } from '../atoms';
import { rem } from '../pixels';
import { neutral900, colour } from '../colors';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  margin: 0,
});

const inlineContainerStyles = css({
  display: 'unset',
  padding: 0,
});

const itemStyles = css({
  borderBottom: `1px solid ${colour.general.blue.cerulean[25]}`,
  paddingBottom: rem(24),
  paddingTop: rem(24),
  color: neutral900.rgb,

  '&:first-of-type': {
    paddingTop: rem(18),
  },
});

const inlineItemStyles = css({
  display: 'inline',
  borderBottom: 'none',
  padding: '0',
});

const bulletStyles = css({
  padding: `0 ${rem(6)}`,
  'li:last-of-type > &': {
    display: 'none',
  },
});

const iconStyles = css({
  verticalAlign: 'middle',
  display: 'inline-block',
  height: rem(24),
  marginRight: rem(9),
});

const inactiveBadgeStyles = css({
  lineHeight: rem(18),
  verticalAlign: 'middle',
  marginLeft: rem(8),
});

const moreStyles = css({
  overflow: 'hidden',
  display: 'grid',
  gridTemplateColumns: 'min-content 1fr',
  gridColumnGap: rem(6),
  alignItems: 'center',
});

const avatarStyles = css({
  fontSize: rem(20),
});
const nameStyles = css({
  fontSize: rem(17),
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
});

interface AssociationListProps {
  readonly associations: ReadonlyArray<{
    displayName: string;
    id: string;
    inactiveSince?: string;
  }>;
  readonly type: 'Team' | 'Lab' | 'Working Group' | 'Impact' | 'Category';
  readonly inline?: boolean;
  readonly max?: number;
  readonly more?: number;
}
const icon: Record<AssociationListProps['type'], React.ReactElement> = {
  Lab: <LabIcon />,
  Team: <TeamIcon />,
  'Working Group': <WorkingGroupsIcon />,
  Impact: <ImpactIcon />,
  Category: <CategoryIcon />,
};
const Indicator = ({ type }: { type: AssociationListProps['type'] }) => (
  <div css={iconStyles}>{icon[type]}</div>
);

const AssociationList: FC<AssociationListProps> = ({
  associations,
  type,
  max = Number.POSITIVE_INFINITY,
  inline = false,
  more,
}) => {
  const limitExceeded = associations.length > max;

  if (!associations.length) {
    return null;
  }

  if (limitExceeded) {
    return (
      <div>
        <Indicator type={type} />
        {associations.length} {type}
        {associations.length === 1 ? '' : 's'}
      </div>
    );
  }

  return (
    <div>
      {inline && <Indicator type={type} />}
      <ul css={[containerStyles, inline && inlineContainerStyles]}>
        {associations.map(({ displayName, id, inactiveSince }) => (
          <li key={id} css={[itemStyles, inline && inlineItemStyles]}>
            {inline || <Indicator type={type} />}
            {type === 'Team' && (
              <>
                <Link href={network({}).teams({}).team({ teamId: id }).$}>
                  {type} {displayName}
                </Link>
                {inactiveSince && (
                  <span css={inactiveBadgeStyles}>
                    <InactiveBadgeIcon />
                  </span>
                )}
              </>
            )}
            {type === 'Lab' && (
              <>
                {displayName} {type}
              </>
            )}
            {(type === 'Impact' || type === 'Category') && <>{displayName}</>}
            {type === 'Working Group' && (
              <Link
                href={
                  network({})
                    .workingGroups({})
                    .workingGroup({ workingGroupId: id }).$
                }
              >
                {displayName}
              </Link>
            )}
            {inline && <span css={bulletStyles}>•</span>}
          </li>
        ))}
        {more && (
          <div css={moreStyles}>
            <div css={avatarStyles}>
              <Avatar placeholder={`+${more}`} />
            </div>
            <span css={nameStyles}>
              {type}
              {more === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </ul>
    </div>
  );
};

export default AssociationList;
