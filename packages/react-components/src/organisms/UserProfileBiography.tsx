import { useContext } from 'react';
import { css } from '@emotion/react';
import { UserProfileContext } from '@asap-hub/react-context';

import { Card, Headline2, Paragraph, Link } from '../atoms';
import { docsIcon } from '../icons';
import { mobileScreen } from '../pixels';
import UserProfilePlaceholderCard from './UserProfilePlaceholderCard';

const stretchOnMobile = css({
  display: 'flex',
  [`@media (max-width: ${mobileScreen.width}px)`]: {
    flexDirection: 'column',
  },
});

type UserProfileBiographyProps = {
  readonly biography?: string;
  readonly biosketch?: string;
};
const UserProfileBiography: React.FC<UserProfileBiographyProps> = ({
  biography,
  biosketch,
}) => {
  const { isOwnProfile } = useContext(UserProfileContext);
  return biography || isOwnProfile ? (
    <Card>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Headline2 styleAsHeading={3}>Biography</Headline2>
        {biography ? (
          <Paragraph accent="neutral900">{biography}</Paragraph>
        ) : (
          <UserProfilePlaceholderCard title="What’s your story?">
            Complement your profile with a biography. You may summarize your
            background and highlight any past achievements.
          </UserProfilePlaceholderCard>
        )}
        {biosketch && (
          <div css={stretchOnMobile}>
            <Link buttonStyle href={biosketch}>
              {docsIcon}
              View Biosketch
            </Link>
          </div>
        )}
      </div>
    </Card>
  ) : null;
};

export default UserProfileBiography;
