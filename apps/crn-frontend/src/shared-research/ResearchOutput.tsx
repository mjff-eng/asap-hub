import { Frame, useBackHref } from '@asap-hub/frontend-utils';
import {
  Loading,
  NotFoundPage,
  ResearchOutputToast,
  ResearchOutputToastLocationState,
  ScrollToTop,
  SharedResearchOutput,
  utils,
} from '@asap-hub/react-components';
import {
  ResearchOutputPermissions,
  ResearchOutputPermissionsContext,
  useCurrentUserCRN,
  useFlags,
} from '@asap-hub/react-context';
import { sharedResearch, useRouteParams } from '@asap-hub/routing';
import { getResearchOutputEntityType } from '@asap-hub/validation';
import { Route, Routes, useLocation, useNavigate } from 'react-router';

import {
  ManuscriptVersionResponse,
  projectHasLead,
  ResearchOutputResponse,
  teamHasActiveProjectManager,
} from '@asap-hub/model';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import {
  useLatestManuscriptVersionByManuscriptId,
  useTeamById,
} from '../network/teams/state';
import WorkingGroupOutput from '../network/working-groups/WorkingGroupOutput';
import TeamBasedOutput from '../projects/TeamBasedOutput';
import UserBasedOutput from '../projects/UserBasedOutput';
import { useProjectById } from '../projects/state';
import { usePutResearchOutput } from '../shared-state';
import {
  useProjectOutputPermissions,
  useResearchOutputById,
  useResearchOutputPermissions,
  useTeamOutputPermissions,
} from './state';
import { isGrantEnded } from './util';

const ProjectOutputPermissionsGate: React.FC<{
  projectId: string;
  basePermissions: ResearchOutputPermissions;
  children: (
    permissions: ResearchOutputPermissions,
    hasLead: boolean,
  ) => ReactNode;
}> = ({ projectId, basePermissions, children }) => {
  const project = useProjectById(projectId);
  const permissions = useProjectOutputPermissions(basePermissions, project);
  const hasLead = project ? projectHasLead(project) : false;

  return <>{children(permissions, hasLead)}</>;
};

const TeamBasedProjectOutputPermissionsGate: React.FC<{
  teamId: string;
  basePermissions: ResearchOutputPermissions;
  children: (
    permissions: ResearchOutputPermissions,
    hasLead: boolean,
  ) => ReactNode;
}> = ({ teamId, basePermissions, children }) => {
  const team = useTeamById(teamId);
  const permissions = useTeamOutputPermissions(basePermissions, team?.members);
  const hasLead = teamHasActiveProjectManager(team?.members ?? []);

  return <>{children(permissions, hasLead)}</>;
};

const entityAssociation = {
  'working-group': 'workingGroups',
  project: 'projects',
  team: 'teams',
} as const;

const getAssociationIds = (researchOutputData: ResearchOutputResponse) => {
  const entityType = getResearchOutputEntityType(researchOutputData);

  switch (entityType) {
    case 'working-group':
      return researchOutputData.workingGroups?.map((wg) => wg.id) ?? [];
    case 'project':
      return researchOutputData.project?.id
        ? [researchOutputData.project.id]
        : [];
    case 'team':
    default:
      return researchOutputData.teams.map((team) => team.id);
  }
};

const ResearchOutput: React.FC = () => {
  const { researchOutputId } = useRouteParams(
    sharedResearch({}).researchOutput,
  );

  const location = useLocation();
  const navigate = useNavigate();

  const outputPath = sharedResearch({}).researchOutput({ researchOutputId }).$;

  const [toast, setToast] = useState<ResearchOutputToast | undefined>();

  useEffect(() => {
    const stateToast = (
      location.state as ResearchOutputToastLocationState | null
    )?.toast;
    if (stateToast) {
      setToast(stateToast);
      void navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      });
    } else if (location.pathname !== outputPath) {
      setToast(undefined);
    }
  }, [
    location.pathname,
    location.search,
    location.state,
    navigate,
    outputPath,
  ]);

  const researchOutputData = useResearchOutputById(researchOutputId);
  const { isEnabled } = useFlags();
  const grantDocument = isEnabled('STAGING_MODE')
    ? researchOutputData?.grantDocument
    : undefined;

  const backHref = useBackHref() ?? sharedResearch({}).$;

  const entityType = researchOutputData
    ? getResearchOutputEntityType(researchOutputData)
    : 'team';
  const association = entityAssociation[entityType];
  const associationIds = researchOutputData
    ? getAssociationIds(researchOutputData)
    : [];

  const permissions = useResearchOutputPermissions(
    association,
    associationIds,
    researchOutputData?.published,
    !!researchOutputData?.relatedManuscriptVersion,
  );

  const updateResearchOutput = usePutResearchOutput();
  const publishResearchOutput = usePutResearchOutput(true);

  const currentUser = useCurrentUserCRN();
  const getLatestManuscriptVersion = useLatestManuscriptVersionByManuscriptId();

  const [latestManuscriptVersion, setLatestManuscriptVersion] = useState<
    ManuscriptVersionResponse | undefined
  >();

  useEffect(() => {
    if (researchOutputData?.relatedManuscript) {
      getLatestManuscriptVersion(researchOutputData?.relatedManuscript)
        .then((data) => setLatestManuscriptVersion(data))
        .catch(() => {
          setLatestManuscriptVersion(undefined);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researchOutputData?.relatedManuscript]);

  const checkForNewVersion = async (): Promise<boolean> => {
    if (!researchOutputData?.relatedManuscript) return false;

    try {
      const latest = await getLatestManuscriptVersion(
        researchOutputData.relatedManuscript,
      );

      setLatestManuscriptVersion(latest);

      return (
        !!latest?.versionId &&
        latest.versionId !== researchOutputData.relatedManuscriptVersion
      );
    } catch (error) {
      setLatestManuscriptVersion(undefined);
      return false;
    }
  };

  if (researchOutputData) {
    const renderOutputForm = (versionAction: 'create' | 'edit') => {
      switch (entityType) {
        case 'working-group':
          return researchOutputData.workingGroups?.[0]?.id ? (
            <WorkingGroupOutput
              workingGroupId={researchOutputData.workingGroups[0].id}
              researchOutputData={researchOutputData}
              versionAction={versionAction}
            />
          ) : (
            <NotFoundPage />
          );
        case 'project':
          return researchOutputData.project?.id ? (
            <UserBasedOutput
              projectId={researchOutputData.project.id}
              researchOutputData={researchOutputData}
              latestManuscriptVersion={
                versionAction === 'create' ? latestManuscriptVersion : undefined
              }
              versionAction={versionAction}
            />
          ) : (
            <NotFoundPage />
          );
        case 'team':
          return researchOutputData.teams[0]?.id ? (
            <TeamBasedOutput
              teamId={researchOutputData.teams[0].id}
              researchOutputData={researchOutputData}
              latestManuscriptVersion={
                versionAction === 'create' ? latestManuscriptVersion : undefined
              }
              versionAction={versionAction}
            />
          ) : (
            <NotFoundPage />
          );
        default:
          return <NotFoundPage />;
      }
    };

    const renderResearchOutputView = (hasLead = false) => (
      <Frame title={researchOutputData.title}>
        {toast === 'published' && <ScrollToTop />}
        <SharedResearchOutput
          {...researchOutputData}
          grantDocument={grantDocument}
          grantEnded={isGrantEnded(grantDocument)}
          projectHasLead={hasLead}
          backHref={backHref}
          onRequestReview={(shouldReview) =>
            updateResearchOutput(researchOutputData.id, {
              ...utils.transformResearchOutputResponseToRequest(
                researchOutputData,
              ),
              statusChangedById: currentUser?.id,
              hasStatusChanged: true,
              isInReview: shouldReview,
            })
          }
          onPublish={() =>
            publishResearchOutput(researchOutputData.id, {
              ...utils.transformResearchOutputResponseToRequest(
                researchOutputData,
              ),
              statusChangedById: currentUser?.id,
              hasStatusChanged: true,
              isInReview: false,
              published: true,
            })
          }
          toast={toast}
          checkForNewVersion={checkForNewVersion}
        />
      </Frame>
    );

    const renderWithPermissions = (
      resolvedPermissions: ResearchOutputPermissions,
      hasLead = false,
    ) => (
      <ResearchOutputPermissionsContext.Provider value={resolvedPermissions}>
        <Suspense key={location.pathname} fallback={<Loading />}>
          <Routes>
            <Route index element={renderResearchOutputView(hasLead)} />
            {resolvedPermissions.canVersionResearchOutput && (
              <Route
                path={
                  sharedResearch({}).researchOutput({ researchOutputId })
                    .versionResearchOutput.template
                }
                element={renderOutputForm('create')}
              />
            )}
            {resolvedPermissions.canEditResearchOutput && (
              <Route
                path={
                  sharedResearch({}).researchOutput({ researchOutputId })
                    .editResearchOutput.template
                }
                element={renderOutputForm('edit')}
              />
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ResearchOutputPermissionsContext.Provider>
    );

    if (entityType === 'project' && researchOutputData.project?.id) {
      return (
        <ProjectOutputPermissionsGate
          projectId={researchOutputData.project.id}
          basePermissions={permissions}
        >
          {renderWithPermissions}
        </ProjectOutputPermissionsGate>
      );
    }

    const teamBasedProject = researchOutputData.teams[0];
    if (
      entityType === 'team' &&
      teamBasedProject?.project &&
      teamBasedProject.id
    ) {
      return (
        <TeamBasedProjectOutputPermissionsGate
          teamId={teamBasedProject.id}
          basePermissions={permissions}
        >
          {renderWithPermissions}
        </TeamBasedProjectOutputPermissionsGate>
      );
    }

    return renderWithPermissions(permissions);
  }
  return <NotFoundPage />;
};
export default ResearchOutput;
