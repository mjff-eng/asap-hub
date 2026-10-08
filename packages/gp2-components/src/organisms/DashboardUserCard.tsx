import { gp2 } from '@asap-hub/model';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { css } from '@emotion/react';

import {
  Card,
  Avatar,
  Ellipsis,
  Paragraph,
  ImageLink,
  LinkHeadline,
  TagList,
  pixels,
} from '@asap-hub/react-components';

const { rem } = pixels;
const NUMBER_OF_TAGS_TO_DISPLAY = 5;

const cardStyles = css({
  padding: `${rem(32)} ${rem(24)}`,
});

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: rem(15),
});

const avatarStyles = css({
  width: rem(96),
  height: rem(96),
});

const roleStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

type DashboardRecommendedUsersProps = {
  user: gp2.UserResponse;
};

const DashboardRecommendedUsers: React.FC<DashboardRecommendedUsersProps> = ({
  user,
}) => (
  <Card key={user.id} overrideStyles={cardStyles}>
    <div css={containerStyles}>
      <ImageLink link={gp2Routing.users({}).user({ userId: user.id }).$}>
        <Avatar
          overrideStyles={avatarStyles}
          imageUrl={user.avatarUrl}
          firstName={user.firstName}
          lastName={user.lastName}
        />
      </ImageLink>
      <LinkHeadline
        href={gp2Routing.users({}).user({ userId: user.id }).$}
        level={4}
        noMargin
        title={`${user.displayName}${
          !!user.degrees.length && `, ${user.degrees.join(', ')}`
        }`}
      >
        <Ellipsis>
          {user.displayName}
          {!!user.degrees.length && `, ${user.degrees.join(', ')}`}
        </Ellipsis>
      </LinkHeadline>

      <div css={roleStyles}>
        <Paragraph noMargin accent="tertiary">
          {user.role}
        </Paragraph>
      </div>

      <TagList
        tags={user.tags.map(({ name }) => name)}
        max={NUMBER_OF_TAGS_TO_DISPLAY}
      />
    </div>
  </Card>
);

export default DashboardRecommendedUsers;
