import { css } from '@emotion/react';
import { UserResponse } from '@asap-hub/model';

import { UserProfileBiographyNew, UserProfileExpertiseNew } from '../organisms';
import { rem } from '../pixels';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(40),
});

type Props = UserResponse & {
  readonly editHrefs?: {
    readonly biography?: string;
    readonly expertiseAndResources?: string;
  };
};

const UserProfileOverview: React.FC<Props> = ({ editHrefs, ...props }) => (
  <div css={containerStyles}>
    <UserProfileBiographyNew {...props} editHref={editHrefs?.biography} />
    <UserProfileExpertiseNew
      {...props}
      editHref={editHrefs?.expertiseAndResources}
    />
  </div>
);

export default UserProfileOverview;
