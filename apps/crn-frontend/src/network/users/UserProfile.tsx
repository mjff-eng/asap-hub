import { Frame, getEventListOptions } from '@asap-hub/frontend-utils';
import {
  NotFoundPage,
  UserProfilePage,
  NoEvents,
} from '@asap-hub/react-components';
import {
  useCurrentUserCRN,
  useFlags,
  UserProfileContext,
} from '@asap-hub/react-context';
import { events, network, useRouteParams } from '@asap-hub/routing';
import { ComponentProps, FC, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';

import { useEvents } from '../../events/state';
import {
  useCurrentUserProfileTabRoute,
  usePaginationParams,
} from '../../hooks';
import { useResearchOutputs } from '../../shared-research/state';
import { useUserById } from './state';
import { useManageUserAvatar } from './useManageUserAvatar';

const loadResearch = () =>
  import(/* webpackChunkName: "network-profile-research" */ './Research');
const loadOverview = () =>
  import(/* webpackChunkName: "network-profile-overview" */ './Overview');
const loadAbout = () =>
  import(/* webpackChunkName: "network-profile-about" */ './About');
const loadOutputs = () =>
  import(/* webpackChunkName: "network-profile-outputs" */ './Outputs');
const loadEditing = () =>
  import(/* webpackChunkName: "network-editing" */ './Editing');
const loadEventsList = () =>
  import(/* webpackChunkName: "network-events" */ '../EventsEmbedList');
const Research = lazy(loadResearch);
const Overview = lazy(loadOverview);
const About = lazy(loadAbout);
const Outputs = lazy(loadOutputs);
const Editing = lazy(loadEditing);
const EventsList = lazy(loadEventsList);

type UserProfileProps = {
  currentTime: Date;
};

const UserProfile: FC<UserProfileProps> = ({ currentTime }) => {
  const route = network({}).users({}).user;
  const { userId } = useRouteParams(route);

  const tabRoute = useCurrentUserProfileTabRoute();
  const { isEnabled } = useFlags();
  const isNewUserDetailPageEnabled = isEnabled('NEW_USER_DETAIL_PAGE');

  const user = useUserById(userId);
  const currentUser = useCurrentUserCRN();

  const { avatarSaving, onImageSelect } = useManageUserAvatar(userId);

  const { pageSize } = usePaginationParams();
  const researchOutputsResult = useResearchOutputs({
    currentPage: 0,
    pageSize,
    searchQuery: '',
    userId,
  });

  const { pathname } = useLocation();

  const isOwnProfile = currentUser?.id === user?.id;
  const isUserOnboarded = currentUser?.onboarded;

  const upcomingEventsResult = useEvents(
    getEventListOptions(currentTime, {
      past: false,
      pageSize,
      constraint: { userId },
    }),
    currentUser,
  );

  const pastEventsResult = useEvents(
    getEventListOptions(currentTime, {
      past: true,
      pageSize,
      constraint: { userId },
    }),
    currentUser,
  );

  if (user) {
    const profilePageProps: Omit<
      ComponentProps<typeof UserProfilePage>,
      'children'
    > = {
      ...user,

      editPersonalInfoHref:
        isOwnProfile && tabRoute
          ? tabRoute({}).editPersonalInfo({}).$
          : undefined,
      editContactInfoHref:
        isOwnProfile && tabRoute
          ? tabRoute({}).editContactInfo({}).$
          : undefined,
      onImageSelect: isOwnProfile && tabRoute ? onImageSelect : undefined,
      avatarSaving,
      sharedOutputsCount: isUserOnboarded
        ? researchOutputsResult.total
        : undefined,
      upcomingEventsCount: isUserOnboarded
        ? upcomingEventsResult.total
        : undefined,
      pastEventsCount: isUserOnboarded ? pastEventsResult.total : undefined,
    };

    return (
      <UserProfileContext.Provider value={{ isOwnProfile }}>
        <Frame title={user.displayName}>
          <UserProfilePage {...profilePageProps}>
            {
              <>
                <Routes key={pathname}>
                  <Route
                    path="research/*"
                    element={
                      <Frame title="Research">
                        <>
                          <Research user={user} />
                          {isOwnProfile && tabRoute && (
                            <Editing user={user} backHref={tabRoute({}).$} />
                          )}
                        </>
                      </Frame>
                    }
                  />
                  {isNewUserDetailPageEnabled && (
                    <Route
                      path="overview/*"
                      element={
                        <Frame title="Overview">
                          <>
                            <Overview user={user} />
                            {isOwnProfile && tabRoute && (
                              <Editing user={user} backHref={tabRoute({}).$} />
                            )}
                          </>
                        </Frame>
                      }
                    />
                  )}
                  <Route
                    path="about/*"
                    element={
                      <Frame title="About">
                        <>
                          <About user={user} />
                          {isOwnProfile && tabRoute && (
                            <Editing user={user} backHref={tabRoute({}).$} />
                          )}
                        </>
                      </Frame>
                    }
                  />
                  <Route
                    path="outputs/*"
                    element={
                      <Frame title="Outputs">
                        <>
                          <Outputs userId={user?.id} />
                          {isOwnProfile && tabRoute && (
                            <Editing user={user} backHref={tabRoute({}).$} />
                          )}
                        </>
                      </Frame>
                    }
                  />
                  <Route
                    path="upcoming/*"
                    element={
                      <Frame title="Upcoming Events">
                        <>
                          <EventsList
                            constraint={{ userId: user?.id }}
                            currentTime={currentTime}
                            past={false}
                            noEventsComponent={
                              <NoEvents
                                link={events({}).upcoming({}).$}
                                type="member"
                              />
                            }
                          />
                          {isOwnProfile && tabRoute && (
                            <Editing user={user} backHref={tabRoute({}).$} />
                          )}
                        </>
                      </Frame>
                    }
                  />
                  <Route
                    path="past/*"
                    element={
                      <Frame title="Past Events">
                        <>
                          <EventsList
                            past
                            constraint={{ userId: user?.id }}
                            currentTime={currentTime}
                            noEventsComponent={
                              <NoEvents
                                past
                                link={events({}).past({}).$}
                                type="member"
                              />
                            }
                          />
                          {isOwnProfile && tabRoute && (
                            <Editing user={user} backHref={tabRoute({}).$} />
                          )}
                        </>
                      </Frame>
                    }
                  />
                  <Route
                    index
                    element={
                      <Navigate
                        to={
                          isNewUserDetailPageEnabled
                            ? route({ userId }).overview({}).$
                            : route({ userId }).research({}).$
                        }
                        replace
                      />
                    }
                  />
                </Routes>
              </>
            }
          </UserProfilePage>
        </Frame>
      </UserProfileContext.Provider>
    );
  }

  return <NotFoundPage />;
};

export default UserProfile;
