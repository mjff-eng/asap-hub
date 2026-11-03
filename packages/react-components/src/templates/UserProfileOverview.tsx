import { css } from '@emotion/react';
import { UserResponse } from '@asap-hub/model';

import { UserProfileBiographyNew } from '../organisms';
import { rem } from '../pixels';

const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(40),
});

type Props = UserResponse & {
  readonly editHrefs?: {
    readonly biography?: string;
  };
};

const UserProfileOverview: React.FC<Props> = ({ editHrefs, ...props }) => (
  <div css={containerStyles}>
    <UserProfileBiographyNew {...props} editHref={editHrefs?.biography} />
  </div>
);

export default UserProfileOverview;
