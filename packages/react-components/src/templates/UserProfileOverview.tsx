import { css } from '@emotion/react';
import { UserResponse } from '@asap-hub/model';

import {
  UserProfileBiographyNew,
  UserProfileExpertiseNew,
  UserProfileRecentWorksNew,
  UserProfileRoleNew,
} from '../organisms';
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
    readonly role?: string;
  };
};

const UserProfileOverview: React.FC<Props> = ({ editHrefs, ...props }) => (
  <div css={containerStyles}>
    <UserProfileBiographyNew
      {...props}
      questions={props.role === 'Staff' ? [] : props.questions}
      editHref={editHrefs?.biography}
    />
    <UserProfileExpertiseNew
      {...props}
      editHref={editHrefs?.expertiseAndResources}
    />
    <UserProfileRoleNew {...props} editHref={editHrefs?.role} />
    <UserProfileRecentWorksNew {...props} />
  </div>
);

export default UserProfileOverview;
