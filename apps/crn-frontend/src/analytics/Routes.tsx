import { isEnabled } from '@asap-hub/flags';
import { SkeletonBodyFrame as Frame } from '@asap-hub/frontend-utils';
import {
  AnalyticsPage,
  ExportAnalyticsModal,
} from '@asap-hub/react-components';
import { analytics } from '@asap-hub/routing';
import { lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useOpensearchMetrics } from '../hooks/opensearch';

import { downloadAnalyticsXLSX } from './utils/export';

const loadProductivity = () =>
  import(/* webpackChunkName: "productivity" */ './productivity/Productivity');

const loadLeadership = () =>
  import(/* webpackChunkName: "leadership" */ './leadership/Leadership');

const loadCollaboration = () =>
  import(
    /* webpackChunkName: "collaboration" */ './collaboration/Collaboration'
  );

const loadEngagement = () =>
  import(/* webpackChunkName: "engagement" */ './engagement/Engagement');

const loadOpenScience = () =>
  import(/* webpackChunkName: "open-science" */ './open-science/OpenScience');

const loadAwards = () =>
  import(/* webpackChunkName: "awards" */ './awards/Awards');

const LeadershipBody = lazy(loadLeadership);
const ProductivityBody = lazy(loadProductivity);
const CollaborationBody = lazy(loadCollaboration);
const EngagementBody = lazy(loadEngagement);
const OpenScienceBody = lazy(loadOpenScience);
const AwardsBody = lazy(loadAwards);

const AnalyticsRoutes = () => {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadLeadership().then(loadProductivity).then(loadCollaboration);
  }, []);

  const opensearchMetrics = useOpensearchMetrics();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleExportAnalytics = () => setIsModalOpen(true);

  const handleDownload = downloadAnalyticsXLSX({
    opensearchMetrics,
  });

  return (
    <>
      {isModalOpen && (
        <ExportAnalyticsModal
          onDismiss={() => setIsModalOpen(false)}
          onDownload={handleDownload}
        />
      )}
      <Routes>
        <Route
          path={`${analytics({}).productivity.template}/*`}
          element={
            <Routes>
              <Route
                path={analytics({}).productivity({}).metric.template}
                element={
                  <AnalyticsPage onExportAnalytics={handleExportAnalytics}>
                    <Frame title="Resource & Data Sharing">
                      <ProductivityBody />
                    </Frame>
                  </AnalyticsPage>
                }
              />
              <Route
                path="*"
                element={
                  <Navigate
                    to={
                      analytics({}).productivity({}).metric({ metric: 'user' })
                        .$
                    }
                    replace
                  />
                }
              />
            </Routes>
          }
        />
        <Route
          path={`${analytics({}).collaboration.template}/*`}
          element={
            <Routes>
              <Route
                path={
                  analytics({}).collaboration({}).collaborationPath.template
                }
                element={
                  <AnalyticsPage onExportAnalytics={handleExportAnalytics}>
                    <Frame title="Collaboration">
                      <CollaborationBody />
                    </Frame>
                  </AnalyticsPage>
                }
              />
              <Route
                path="*"
                element={
                  <Navigate
                    to={
                      analytics({}).collaboration({}).collaborationPath({
                        metric: 'user',
                        type: 'within-team',
                      }).$
                    }
                    replace
                  />
                }
              />
            </Routes>
          }
        />
        <Route
          path={`${analytics({}).engagement.template}/*`}
          element={
            <Routes>
              <Route
                path={analytics({}).engagement({}).metric.template}
                element={
                  <AnalyticsPage onExportAnalytics={handleExportAnalytics}>
                    <Frame title="Engagement">
                      <EngagementBody />
                    </Frame>
                  </AnalyticsPage>
                }
              />
              <Route
                path="*"
                element={
                  <Navigate
                    to={
                      analytics({})
                        .engagement({})
                        .metric({ metric: 'presenters' }).$
                    }
                    replace
                  />
                }
              />
            </Routes>
          }
        />
        <Route
          path={`${analytics({}).leadership.template}/*`}
          element={
            <Routes>
              <Route
                path={analytics({}).leadership({}).metric.template}
                element={
                  <AnalyticsPage onExportAnalytics={handleExportAnalytics}>
                    <Frame title="Leadership & Membership">
                      <LeadershipBody />
                    </Frame>
                  </AnalyticsPage>
                }
              />
              <Route
                path="*"
                element={
                  <Navigate
                    to={
                      analytics({})
                        .leadership({})
                        .metric({ metric: 'working-group' }).$
                    }
                    replace
                  />
                }
              />
            </Routes>
          }
        />
        <Route
          path={`${analytics({}).openScience.template}/*`}
          element={
            <Routes>
              <Route
                path={analytics({}).openScience({}).metric.template}
                element={
                  <AnalyticsPage onExportAnalytics={handleExportAnalytics}>
                    <Frame title="Open Science">
                      <OpenScienceBody />
                    </Frame>
                  </AnalyticsPage>
                }
              />
              <Route
                path="*"
                element={
                  <Navigate
                    to={
                      analytics({})
                        .openScience({})
                        .metric({ metric: 'preprint-compliance' }).$
                    }
                    replace
                  />
                }
              />
            </Routes>
          }
        />
        {isEnabled('AWARDS_TAB') && (
          <Route
            path={`${analytics({}).awards.template}/*`}
            element={
              <Routes>
                <Route
                  path={analytics({}).awards({}).metric.template}
                  element={
                    <AnalyticsPage onExportAnalytics={handleExportAnalytics}>
                      <Frame title="Awards">
                        <AwardsBody />
                      </Frame>
                    </AnalyticsPage>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Navigate
                      to={
                        analytics({})
                          .awards({})
                          .metric({ metric: 'os-champion' }).$
                      }
                      replace
                    />
                  }
                />
              </Routes>
            }
          />
        )}
        <Route
          path="*"
          element={
            <Navigate
              to={analytics({}).productivity({ metric: 'user' }).$}
              replace
            />
          }
        />
      </Routes>
    </>
  );
};

export default AnalyticsRoutes;
