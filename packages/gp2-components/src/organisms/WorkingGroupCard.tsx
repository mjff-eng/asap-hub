import { gp2 as gp2Model } from '@asap-hub/model';
import {
  Card,
  ceruleanFernGradientStyles,
  LinkHeadline,
  Paragraph,
  pixels,
  Subtitle,
  TagList,
  utils,
  neutral900,
} from '@asap-hub/react-components';
import { gp2 } from '@asap-hub/routing';
import { css } from '@emotion/react';
import usersIcon from '../icons/users-icon';
import IconWithLabel from '../molecules/IconWithLabel';

const { rem } = pixels;
const { workingGroups } = gp2;
const { getCounterString } = utils;

type WorkingGroupCardProps = Pick<
  gp2Model.WorkingGroupResponse,
  'id' | 'title' | 'members' | 'shortDescription' | 'leadingMembers' | 'tags'
>;
const containerStyles = css({
  display: 'flex',
  gap: rem(16),
  margin: rem(24),
  flexGrow: 1,
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'start',
  flexDirection: 'column',
});
const titleStyles = css({
  margin: `8px 0`,
  fontWeight: 'bold',
  fontSize: '26px',
  lineHeight: '32px',
});

const bottomBorderStyles = css({
  height: rem(4),
  width: '100%',
  ...ceruleanFernGradientStyles,
});
const textStyles = css({
  maxWidth: rem(610),
  color: neutral900.rgb,
});

const tagListContainerStyles = css({
  padding: `${rem(8)} 0`,
});

const WorkingGroupCard: React.FC<WorkingGroupCardProps> = ({
  id,
  title,
  members,
  shortDescription,
  leadingMembers,
  tags,
}) => {
  const workingGroupHref = workingGroups({}).workingGroup({
    workingGroupId: id,
  }).$;
  return (
    <Card padding={false}>
      <div css={containerStyles}>
        <div>
          <LinkHeadline
            href={workingGroupHref}
            level={3}
            css={titleStyles}
            noMargin
          >
            {title}
          </LinkHeadline>
        </div>
        <div css={bottomBorderStyles} />
        <span css={textStyles}>
          <IconWithLabel icon={usersIcon}>
            {getCounterString(members.length, 'Member')}
          </IconWithLabel>
        </span>
        <Subtitle noMargin accent="neutral900">
          {shortDescription}
        </Subtitle>
        {tags.length > 0 && (
          <div css={tagListContainerStyles}>
            <TagList max={3} tags={tags.map((tag) => tag.name)} />
          </div>
        )}
        {leadingMembers === undefined || (
          <Paragraph noMargin accent="neutral900">
            {leadingMembers}
          </Paragraph>
        )}
      </div>
    </Card>
  );
};

export default WorkingGroupCard;
