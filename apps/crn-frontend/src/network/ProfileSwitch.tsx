import { ComponentProps, FC, lazy, ReactElement } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';

import { NoEvents } from '@asap-hub/react-components';
import { events } from '@asap-hub/routing';
import { Frame } from '@asap-hub/frontend-utils';

import { EventConstraint } from '@asap-hub/model';

const loadEventsList = () =>
  import(/* webpackChunkName: "network-events" */ './EventsEmbedList');

const EventsList = lazy(loadEventsList);

type RequiredPaths = 'about' | 'upcoming' | 'past';
type OptionalPaths = 'calendar' | 'outputs' | 'draftOutputs' | 'metrics';

type ProfileSwitchProps = {
  About: FC;
  currentTime: Date;
  displayName: string;
  eventConstraint: EventConstraint;
  isActive?: boolean;
  Metrics?: ReactElement;
  Outputs?: ReactElement;
  DraftOutputs?: ReactElement;
  paths: Record<RequiredPaths, string> & Partial<Record<OptionalPaths, string>>;
  type: ComponentProps<typeof NoEvents>['type'];
};

const ProfileSwitch: FC<ProfileSwitchProps> = ({
  About,
  currentTime,
  displayName,
  eventConstraint,
  isActive,
  Metrics,
  Outputs,
  paths,
  type,
  DraftOutputs,
}) => {
  const { pathname } = useLocation();
  return (
    <Frame title={displayName}>
      <Routes key={pathname}>
        <Route
          path={paths.about}
          element={<Frame title="About">{<About />}</Frame>}
        />
        {Metrics && (
          <Route
            path={paths.metrics}
            element={<Frame title="Metrics">{Metrics}</Frame>}
          />
        )}
        {paths.calendar && (
          <Route
            path={paths.calendar}
            element={<Navigate to={`../${paths.about}`} replace />}
          />
        )}
        {Outputs && (
          <Route
            path={paths.outputs}
            element={<Frame title="Outputs">{Outputs}</Frame>}
          />
        )}
        {DraftOutputs && (
          <Route
            path={paths.draftOutputs}
            element={<Frame title="Draft Outputs">{DraftOutputs}</Frame>}
          />
        )}
        {isActive && (
          <Route
            path={paths.upcoming}
            element={
              <Frame title="Upcoming Events">
                <EventsList
                  constraint={eventConstraint}
                  currentTime={currentTime}
                  past={false}
                  noEventsComponent={
                    <NoEvents link={events({}).upcoming({}).$} type={type} />
                  }
                />
              </Frame>
            }
          />
        )}
        <Route
          path={paths.past}
          element={
            <Frame title="Past Events">
              <EventsList
                constraint={eventConstraint}
                currentTime={currentTime}
                past={true}
                noEventsComponent={
                  <NoEvents past link={events({}).past({}).$} type={type} />
                }
              />
            </Frame>
          }
        />
        <Route index element={<Navigate to={paths.about} replace />} />
      </Routes>
    </Frame>
  );
};

export default ProfileSwitch;
