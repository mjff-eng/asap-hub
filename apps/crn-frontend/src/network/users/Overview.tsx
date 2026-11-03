import { Frame } from '@asap-hub/frontend-utils';
import { UserResponse } from '@asap-hub/model';
import {
  BiographyModal,
  UserProfileOverview,
} from '@asap-hub/react-components';
import { useUserProfileContext } from '@asap-hub/react-context';
import { network } from '@asap-hub/routing';
import { Route, Routes } from 'react-router';

import { usePatchUserById } from './state';

type OverviewProps = {
  user: UserResponse;
};

const Overview: React.FC<OverviewProps> = ({ user }) => {
  const { isOwnProfile } = useUserProfileContext();

  const route = network({}).users({}).user({ userId: user.id }).overview({});

  const patchUser = usePatchUserById(user.id);

  return (
    <>
      <UserProfileOverview
        {...user}
        editHrefs={
          isOwnProfile ? { biography: route.editBiography({}).$ } : undefined
        }
      />
      {isOwnProfile && (
        <Routes>
          <Route
            path={route.editBiography.template}
            element={
              <Frame title="Edit Biography">
                <BiographyModal
                  biography={user.biography}
                  backHref={route.$}
                  onSave={(biography) => patchUser({ biography })}
                />
              </Frame>
            }
          />
        </Routes>
      )}
    </>
  );
};

export default Overview;
