import { css } from '@emotion/react';
import { getLatestUserAward, UserListItemResponse } from '@asap-hub/model';
import { network } from '@asap-hub/routing';

import { Card, Caption, StateTag } from '../atoms';
import {
  LinkHeadline,
  UserAvatar,
  UserProfilePersonalText,
  ImageLink,
} from '../molecules';
import { tabletScreen, rem } from '../pixels';
import { formatDate } from '../date';
import { alumniBadgeIcon } from '../icons';

const containerStyles = css({
  display: 'grid',
  columnGap: '25px',
  rowGap: '12px',
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    gridTemplateColumns: '90px auto',
  },
});

const textContainerStyles = css({
  flexGrow: 1,
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'start',
});

const profileTextStyles = css({
  flexBasis: '100%',
});

const moveStyles = css({
  [`@media (min-width: ${tabletScreen.min}px)`]: {
    display: 'flex',
    alignItems: 'baseline',
    columnGap: rem(15),
    flexBasis: 'auto',
    order: -1,
  },
  [`@media (max-width: ${tabletScreen.min}px)`]: {
    marginBottom: rem(15),
  },
});

const PeopleCard: React.FC<UserListItemResponse> = ({
  id,
  alumniSinceDate,
  fullDisplayName,
  createdDate,
  firstName,
  lastName,
  avatarUrl,
  degree,
  ...props
}) => {
  const userHref = network({}).users({}).user({ userId: id }).$;
  const latestAward = getLatestUserAward(props.teams);

  return (
    <Card accent={alumniSinceDate ? 'neutral200' : undefined}>
      <div css={[containerStyles]}>
        <ImageLink link={userHref}>
          <UserAvatar
            imageUrl={avatarUrl}
            firstName={firstName}
            lastName={lastName}
            badgeUrl={latestAward?.iconUrl}
            badgeAlt={latestAward?.name}
            badgeSize={42}
            avatarSize={90}
          />
        </ImageLink>
        <div css={textContainerStyles}>
          <div css={moveStyles}>
            <LinkHeadline href={userHref} level={2} styleAsHeading={4}>
              {fullDisplayName}
              {degree && `, ${degree}`}
            </LinkHeadline>
            {alumniSinceDate && (
              <StateTag icon={alumniBadgeIcon} label="Alumni" />
            )}
          </div>

          <div css={profileTextStyles}>
            <UserProfilePersonalText {...props} />
          </div>
          <Caption accent="tertiary" asParagraph>
            {alumniSinceDate
              ? `Alumni since: ${formatDate(new Date(alumniSinceDate))}`
              : `Joined: ${formatDate(new Date(createdDate))}`}
          </Caption>
        </div>
      </div>
    </Card>
  );
};

export default PeopleCard;
