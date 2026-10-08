import {
  SkeletonHeaderFrame as Frame,
  queryClientDefaultOptions,
} from '@asap-hub/frontend-utils';
import {
  Layout,
  Loading,
  LoadingContentHeader,
  NotFoundPage,
} from '@asap-hub/react-components';
import { useCurrentUserCRN, useFlags } from '@asap-hub/react-context';
import {
  about,
  analytics,
  compliance,
  dashboard,
  discover,
  events,
  network,
  news,
  projects,
  sharedResearch,
  tags,
} from '@asap-hub/routing';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC, Suspense, lazy, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router';

import ReactQueryDevtoolsProduction from './ReactQueryDevtoolsProduction';

import CheckOnboarded from './auth/CheckOnboarded';
import { useCurrentUserProfileTabRoute } from './hooks';
import Onboardable from './Onboardable';
import { CosaBanner } from './components/CosaBanner';
import { ProjectsBanner } from './components/ProjectsBanner';

const loadNews = () => import(/* webpackChunkName: "news" */ './news/Routes');
const loadNetwork = () =>
  import(/* webpackChunkName: "network" */ './network/Network');
const loadSharedResearch = () =>
  import(/* webpackChunkName: "shared-research" */ './shared-research/Routes');
const loadDashboard = () =>
  import(/* webpackChunkName: "dashboard" */ './dashboard/Dashboard');
const loadDiscover = () =>
  import(/* webpackChunkName: "discover" */ './discover/Routes');
const loadEvents = () =>
  import(/* webpackChunkName: "events" */ './events/Events');
const loadTags = () => import(/* webpackChunkName: "tags" */ './tags/Routes');

const loadAbout = () =>
  import(/* webpackChunkName: "about" */ './about/Routes');

const loadAnalytics = () =>
  import(/* webpackChunkName: "analytics" */ './analytics/Routes');
const loadProjects = () =>
  import(/* webpackChunkName: "projects" */ './projects/Projects');
const loadCompliance = () =>
  import(
    /* webpackChunkName: "compliance" */ './compliance/ManuscriptWorkspaceRedirect'
  );

const News = lazy(loadNews);
const Network = lazy(loadNetwork);
const SharedResearch = lazy(loadSharedResearch);
const Dashboard = lazy(loadDashboard);
const Discover = lazy(loadDiscover);
const Events = lazy(loadEvents);
const About = lazy(loadAbout);
const Analytics = lazy(loadAnalytics);
const Tags = lazy(loadTags);
const Projects = lazy(loadProjects);
const ComplianceRedirect = lazy(loadCompliance);

const AuthenticatedApp: FC<{
  setIsOnboardable?: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ setIsOnboardable }) => {
  useEffect(() => {
    // order by the likelyhood of user navigating there
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadDashboard()
      .then(loadNews)
      .then(loadNetwork)
      .then(loadSharedResearch)
      .then(loadProjects)
      .then(loadCompliance)
      .then(loadDiscover)
      .then(loadAbout)
      .then(loadAnalytics)
      .then(loadEvents)
      .then(loadTags);
  }, []);

  const location = useLocation();
  // Show the general page loader only when the first part of the pathname changes "/network", "/shared-research", etc.
  // Sub routes ("/network/users/:userId") need to add the "key" property to the `Router` handling that sub-path.
  const topLevelRoute = location.pathname.split('/')[1] || '';
  const user = useCurrentUserCRN();
  const tabRoute = useCurrentUserProfileTabRoute();
  const canViewAnalytics = user?.role === 'Staff';
  // `user` is null until auth0 finishes loading, so this guard also covers
  // the pre-ready state.
  if (!user) {
    return <Loading />;
  }

  return (
    <Onboardable>
      {(onboardable) => {
        if (setIsOnboardable) {
          setIsOnboardable(Boolean(onboardable));
        }
        return (
          <Layout
            userOnboarded={user.onboarded}
            onboardable={onboardable}
            canViewAnalytics={canViewAnalytics}
            onboardModalHref={
              tabRoute ? tabRoute({}).editOnboarded({}).$ : undefined
            }
            userProfileHref={network({}).users({}).user({ userId: user.id }).$}
            firstName={user.firstName}
            lastName={user.lastName}
            displayName={user.displayName}
            avatarUrl={user.avatarUrl}
            teams={user.teams.map(({ id, displayName = '' }) => ({
              name: displayName,
              href: network({}).teams({}).team({ teamId: id }).$,
            }))}
            workingGroups={user.workingGroups.map(
              ({ id, name = '', active }) => ({
                name,
                active,
                href: network({})
                  .workingGroups({})
                  .workingGroup({ workingGroupId: id }).$,
              }),
            )}
            interestGroups={user.interestGroups.map(
              ({ id, name = '', active }) => ({
                name,
                active,
                href: network({})
                  .interestGroups({})
                  .interestGroup({ interestGroupId: id }).$,
              }),
            )}
            projects={
              user.projects
                ? user.projects.map(({ id, title, projectType }) => ({
                    name: title,
                    href:
                      projectType === 'Discovery Project'
                        ? projects({}).discoveryProjects({}).discoveryProject({
                            projectId: id,
                          }).$
                        : projectType === 'Resource Project'
                          ? projects({}).resourceProjects({}).resourceProject({
                              projectId: id,
                            }).$
                          : projects({}).traineeProjects({}).traineeProject({
                              projectId: id,
                            }).$,
                    projectType,
                  }))
                : undefined
            }
            aboutHref="https://www.parkinsonsroadmap.org/"
          >
            <CosaBanner />
            <ProjectsBanner />
            <CheckOnboarded>
              <Suspense key={topLevelRoute} fallback={<LoadingContentHeader />}>
                <Routes>
                  <Route
                    path={dashboard.template}
                    element={
                      <Frame title="Dashboard">
                        <Dashboard />
                      </Frame>
                    }
                  />
                  <Route
                    path={dashboard({}).dismissGettingStarted({}).$}
                    element={
                      <Frame title="Dashboard">
                        <Dashboard />
                      </Frame>
                    }
                  />
                  <Route
                    path={`${discover.template}/*`}
                    element={
                      <Frame title="Guides & Tutorials">
                        <Discover />
                      </Frame>
                    }
                  />
                  <Route
                    path={`${about.template}/*`}
                    element={
                      <Frame title="About ASAP">
                        <About />
                      </Frame>
                    }
                  />
                  {canViewAnalytics && (
                    <Route
                      path={`${analytics.template}/*`}
                      element={
                        <Frame title="Analytics">
                          <Analytics />
                        </Frame>
                      }
                    />
                  )}
                  <Route
                    path={`${news.template}/*`}
                    element={
                      <Frame title="News">
                        <News />
                      </Frame>
                    }
                  />
                  <Route
                    path={`${network.template}/*`}
                    element={
                      <Frame title={null}>
                        <Network />
                      </Frame>
                    }
                  />
                  <Route
                    path={`${sharedResearch.template}/*`}
                    element={
                      <Frame title="Shared Research">
                        <SharedResearch />
                      </Frame>
                    }
                  />
                  <Route
                    path={`${projects.template}/*`}
                    element={
                      <Frame title={null}>
                        <Projects />
                      </Frame>
                    }
                  />
                  <Route
                    path={
                      compliance.template + compliance({}).manuscript.template
                    }
                    element={
                      <Frame title="Compliance">
                        <ComplianceRedirect />
                      </Frame>
                    }
                  />
                  <Route
                    path={`${events.template}/*`}
                    element={
                      <Frame title={null}>
                        <Events />
                      </Frame>
                    }
                  />
                  <Route
                    path={`${tags.template}/*`}
                    element={
                      <Frame title="Tags">
                        <Tags />
                      </Frame>
                    }
                  />

                  <Route
                    path="*"
                    element={
                      <Frame title="Not Found">
                        <NotFoundPage />
                      </Frame>
                    }
                  />
                </Routes>
              </Suspense>
            </CheckOnboarded>
          </Layout>
        );
      }}
    </Onboardable>
  );
};
const AuthenticatedAppWithProviders: FC<
  Record<string, React.Dispatch<React.SetStateAction<boolean>> | never>
> = ({ setIsOnboardable }) => {
  // The QueryClient lives and dies with this component: logout unmounts
  // AuthenticatedApp and discards the whole cache.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: queryClientDefaultOptions }),
  );
  const { isEnabled } = useFlags();
  return (
    <QueryClientProvider client={queryClient}>
      {/* the boundary must sit inside the provider: a suspension escaping
          above it would keep this component from committing, recreating the
          QueryClient (and refetching) on every retry */}
      <Suspense fallback={<Loading />}>
        <AuthenticatedApp setIsOnboardable={setIsOnboardable} />
      </Suspense>
      {isEnabled('QUERY_DEVTOOLS') && <ReactQueryDevtoolsProduction />}
    </QueryClientProvider>
  );
};

export default AuthenticatedAppWithProviders;
