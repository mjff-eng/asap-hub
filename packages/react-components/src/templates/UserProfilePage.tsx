import { ComponentProps } from 'react';
import { isEnabled } from '@asap-hub/flags';

import UserProfileHeader from './UserProfileHeader';
import UserProfileHeaderNew from './UserProfileHeaderNew';
import PageConstraints from './PageConstraints';

type UserProfilePageProps = ComponentProps<typeof UserProfileHeader> & {
  children: React.ReactNode;
};

const UserProfilePage: React.FC<UserProfilePageProps> = ({
  children,
  ...profile
}) => (
  <article>
    {isEnabled('NEW_USER_DETAIL_PAGE') ? (
      <UserProfileHeaderNew {...profile} />
    ) : (
      <UserProfileHeader {...profile} />
    )}
    <PageConstraints as="main">{children}</PageConstraints>
  </article>
);

export default UserProfilePage;
