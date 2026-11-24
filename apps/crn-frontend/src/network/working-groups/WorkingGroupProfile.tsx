import { FC, lazy, useEffect, useState } from 'react';
import { Route, Routes, useParams } from 'react-router';
import { v4 as uuid } from 'uuid';

import { Frame } from '@asap-hub/frontend-utils';
import { NotFoundPage, WorkingGroupPage } from '@asap-hub/react-components';
import { ResearchOutputPermissionsContext } from '@asap-hub/react-context';
import { network, useRouteParams } from '@asap-hub/routing';

import { usePaginationParams } from '../../hooks';
import {
  useCanDuplicateResearchOutput,
  useCanShareResearchOutput,
  useResearchOutputById,
  useResearchOutputs,
} from '../../shared-research/state';

import { useUpcomingAndPastEvents } from '../events';
import ProfileSwitch from '../ProfileSwitch';

import { useWorkingGroupById } from './state';

const loadAbout = () =>
  import(/* webpackChunkName: "network-working-group-about" */ './About');
const loadOutputs = () =>
  import(/* webpackChunkName: "network-working-group-outputs" */ './Outputs');
const loadWorkingGroupOutput = () =>
  import(
    /* webpackChunkName: "network-working-group-output" */ './WorkingGroupOutput'
  );

const About = lazy(loadAbout);
const Outputs = lazy(loadOutputs);
const WorkingGroupOutput = lazy(loadWorkingGroupOutput);

const DuplicateOutput: FC = () => {
  const { id } = useParams<{ id: string }>();
  const output = useResearchOutputById(id ?? '');
  if (output && output.workingGroups?.[0]?.id) {
    return (
      <WorkingGroupOutput
        researchOutputData={{
          ...output,
          id: '',
          published: false,
          link: undefined,
          title: `Copy of ${output.title}`,
        }}
        workingGroupId={output.workingGroups[0].id}
        isDuplicate
      />
    );
  }
  return <NotFoundPage />;
};

type WorkingGroupProfileProps = {
  currentTime: Date;
};
const WorkingGroupProfile: FC<WorkingGroupProfileProps> = ({ currentTime }) => {
  const route = network({}).workingGroups({}).workingGroup;
  const [membersListElementId] = useState(`wg-members-${uuid()}`);

  const { workingGroupId } = useRouteParams(route);
  const workingGroup = useWorkingGroupById(workingGroupId);

  const canShareResearchOutput = useCanShareResearchOutput(
    'workingGroups',
    [workingGroupId],
    !workingGroup?.complete,
  );
  const canDuplicateResearchOutput = useCanDuplicateResearchOutput(
    'workingGroups',
    [workingGroupId],
  );

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadAbout().then(loadOutputs).then(loadWorkingGroupOutput);
  }, []);

  const [upcomingEventsResult, pastEventsResult] = useUpcomingAndPastEvents(
    currentTime,
    { workingGroupId },
  );
  const { pageSize } = usePaginationParams();

  const outputResults = useResearchOutputs({
    currentPage: 0,
    searchQuery: '',
    pageSize,
    workingGroupId,
  });
  const outputDraftResults = useResearchOutputs({
    draftsOnly: true,
    userAssociationMember: canShareResearchOutput,
    currentPage: 0,
    searchQuery: '',
    pageSize,
    workingGroupId,
  });

  if (workingGroup) {
    const paths = {
      about: 'about',
      calendar: 'calendar',
      outputs: 'outputs',
      past: 'past',
      upcoming: 'upcoming',
      draftOutputs: 'draft-outputs',
    };
    return (
      <ResearchOutputPermissionsContext.Provider
        value={{ canShareResearchOutput, canDuplicateResearchOutput }}
      >
        <Routes>
          {canShareResearchOutput && (
            <Route
              path="create-output/:outputDocumentType"
              element={
                <Frame title="Share Output">
                  <WorkingGroupOutput workingGroupId={workingGroupId} />
                </Frame>
              }
            />
          )}
          {canDuplicateResearchOutput && (
            <Route
              path="duplicate/:id"
              element={
                <Frame title="Duplicate Output">
                  <DuplicateOutput />
                </Frame>
              }
            />
          )}
          <Route
            path="*"
            element={
              <WorkingGroupPage
                upcomingEventsCount={upcomingEventsResult?.total || 0}
                pastEventsCount={pastEventsResult?.total || 0}
                membersListElementId={membersListElementId}
                workingGroupsDraftOutputsCount={
                  canShareResearchOutput ? outputDraftResults.total : undefined
                }
                workingGroupsOutputsCount={outputResults.total}
                {...workingGroup}
              >
                <ProfileSwitch
                  About={() => (
                    <About
                      showCollaborationCard={
                        !canShareResearchOutput && !workingGroup.complete
                      }
                      membersListElementId={membersListElementId}
                      workingGroup={workingGroup}
                    />
                  )}
                  DraftOutputs={
                    <Outputs
                      workingGroup={workingGroup}
                      draftOutputs
                      userAssociationMember={canShareResearchOutput}
                    />
                  }
                  currentTime={currentTime}
                  displayName={workingGroup.title}
                  eventConstraint={{ workingGroupId }}
                  isActive={!workingGroup.complete}
                  Outputs={
                    <Outputs
                      userAssociationMember={canShareResearchOutput}
                      workingGroup={workingGroup}
                    />
                  }
                  paths={paths}
                  type="working group"
                />
              </WorkingGroupPage>
            }
          />
        </Routes>
      </ResearchOutputPermissionsContext.Provider>
    );
  }

  return <NotFoundPage />;
};

export default WorkingGroupProfile;
