import { SkeletonBodyFrame as Frame } from '@asap-hub/frontend-utils';
import { AboutInitiative, AboutPage } from '@asap-hub/react-components';
import { useFlags } from '@asap-hub/react-context';
import { about } from '@asap-hub/routing';
import { FC, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';

const loadAbout = () => import(/* webpackChunkName: "about" */ './About');

const loadWhosInvolved = () =>
  import(/* webpackChunkName: "about-whos-involved" */ './WhosInvolved');

const AboutBody = lazy(loadAbout);
const WhosInvolvedBody = lazy(loadWhosInvolved);

const About: FC<Record<string, never>> = () => {
  const { isEnabled } = useFlags();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadAbout().then(loadWhosInvolved);
  }, []);

  if (isEnabled('ABOUT_ASAP_TABS')) {
    return (
      <Routes>
        <Route
          path={about({}).initiative.template}
          element={
            <AboutPage>
              <AboutInitiative />
            </AboutPage>
          }
        />
        <Route
          path={about({}).whosInvolved.template}
          element={
            <AboutPage>
              <Frame title="Who's involved">
                <WhosInvolvedBody />
              </Frame>
            </AboutPage>
          }
        />
        <Route
          path="*"
          element={<Navigate to={about({}).initiative({}).$} replace />}
        />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        index
        element={
          <AboutPage>
            <Frame title="About ASAP">
              <AboutBody />
            </Frame>
          </AboutPage>
        }
      />
    </Routes>
  );
};

export default About;
