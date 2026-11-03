import { Frame } from '@asap-hub/frontend-utils';
import { UserResponse } from '@asap-hub/model';
import {
  BiographyQuestionsModal,
  ExpertiseAndResourcesModal,
  RoleModal,
  UserProfileOverview,
} from '@asap-hub/react-components';
import { useUserProfileContext } from '@asap-hub/react-context';
import { network } from '@asap-hub/routing';
import { Route, Routes } from 'react-router';

import { usePatchUserById } from './state';
import { useResearchTags } from '../../shared-state';

type OverviewProps = {
  user: UserResponse;
};

const Overview: React.FC<OverviewProps> = ({ user }) => {
  const { isOwnProfile } = useUserProfileContext();

  const route = network({}).users({}).user({ userId: user.id }).overview({});

  const patchUser = usePatchUserById(user.id);
  const researchTags = useResearchTags();

  return (
    <>
      <UserProfileOverview
        {...user}
        editHrefs={
          isOwnProfile
            ? {
                biography: route.editBiography({}).$,
                expertiseAndResources: route.editExpertiseAndResources({}).$,
                role: route.editRole({}).$,
              }
            : undefined
        }
      />
      {isOwnProfile && (
        <Routes>
          <Route
            path={route.editBiography.template}
            element={
              <Frame title="Edit Biography">
                <BiographyQuestionsModal
                  {...user}
                  backHref={route.$}
                  onSave={(updates) => patchUser(updates)}
                />
              </Frame>
            }
          />
          <Route
            path={route.editExpertiseAndResources.template}
            element={
              <Frame title="Edit Expertise and Resources">
                <ExpertiseAndResourcesModal
                  {...user}
                  backHref={route.$}
                  onSave={(updates) => patchUser(updates)}
                  suggestions={researchTags}
                />
              </Frame>
            }
          />
          <Route
            path={route.editRole.template}
            element={
              <Frame title="Edit Role">
                <RoleModal
                  {...user}
                  backHref={route.$}
                  onSave={(updates) => patchUser(updates)}
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
