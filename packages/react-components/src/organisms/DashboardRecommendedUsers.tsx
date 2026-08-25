import { UserListItemResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';
import { css } from '@emotion/react';
import { Card, Avatar, Ellipsis, Paragraph } from '../atoms';
import { ImageLink, LinkHeadline, TagList } from '../molecules';
import { rem, tabletScreen } from '../pixels';

const NUMBER_OF_TAGS_TO_DISPLAY = 5;

const recommendedUsersStyles = css({
  display: 'flex',
  flexFlow: 'column',
  gap: rem(24),
  [`@media (min-width: ${tabletScreen.width}px)`]: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gridGap: rem(15),
  },
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
  recommendedUsers: UserListItemResponse[];
};

const DashboardRecommendedUsers: React.FC<DashboardRecommendedUsersProps> = ({
  recommendedUsers,
}) => (
  <div css={recommendedUsersStyles}>
    {recommendedUsers.map((user) => (
      <Card key={user.id}>
        <div css={containerStyles}>
          <ImageLink link={network({}).users({}).user({ userId: user.id }).$}>
            <Avatar
              overrideStyles={avatarStyles}
              imageUrl={user.avatarUrl}
              firstName={user.firstName}
              lastName={user.lastName}
            />
          </ImageLink>
          <LinkHeadline
            href={network({}).users({}).user({ userId: user.id }).$}
            level={3}
            noMargin
            title={`${user.displayName}${
              (user.degree && `, ${user.degree}`) || ''
            }`}
          >
            <Ellipsis>
              {user.displayName}
              {user.degree && `, ${user.degree}`}
            </Ellipsis>
          </LinkHeadline>
          {user.teams.length > 0 && user.teams[0] && (
            <div css={roleStyles}>
              <Paragraph noMargin accent="neutral900">
                {user.teams[0].role} on team
              </Paragraph>
              <Paragraph noMargin accent="neutral900">
                {user.teams[0].displayName}
              </Paragraph>
            </div>
          )}
          <TagList
            centerContent
            // eslint-disable-next-line no-underscore-dangle
            tags={user._tags}
            max={NUMBER_OF_TAGS_TO_DISPLAY}
          />
        </div>
      </Card>
    ))}
  </div>
);

export default DashboardRecommendedUsers;
