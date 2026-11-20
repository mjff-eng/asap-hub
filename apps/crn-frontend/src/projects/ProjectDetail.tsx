import { FC, lazy, ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { expandUserTeamRoles } from '@asap-hub/auth';
import { Frame, SearchFrame } from '@asap-hub/frontend-utils';
import {
  isProjectLead,
  isProjectMember,
  ProjectDetail as ProjectDetailResponse,
} from '@asap-hub/model';
import {
  ProjectDetailPage,
  ProjectDetailAbout,
  NotFoundPage,
} from '@asap-hub/react-components';
import { useCurrentUserCRN } from '@asap-hub/react-context';
import { useProjectArticlesSuggestions, useProjectById } from './state';
import {
  useResearchOutputById,
  useResearchOutputs,
} from '../shared-research/state';
import { getProjectResearchOutputListScope } from './projectResearchOutputScope';
import { useFetchAimArticles } from './articles-state';
import { ManuscriptToastProvider } from '../network/teams/ManuscriptToastProvider';
import { EligibilityReasonProvider } from './EligibilityReasonProvider';
import ProjectWorkspace from './ProjectWorkspace';
import ProjectOutputs from './ProjectOutputs';
import type { ProjectDetailConfig } from './projectDetailConfig';
import TeamBasedOutput from './TeamBasedOutput';
import UserBasedOutput from './UserBasedOutput';
import { ASAP_TEAM_NAME } from '../constants';
import { useManuscripts } from '../network/teams/state';

const loadProjectCompliance = () =>
  import(/* webpackChunkName: "project-compliance" */ './Compliance');
const loadProjectManuscript = () =>
  import(/* webpackChunkName: "project-manuscript" */ './ProjectManuscript');
const loadProjectMilestones = () =>
  import(/* webpackChunkName: "project-milestones" */ './ProjectMilestones');
const loadProjectComplianceReport = () =>
  import(
    /* webpackChunkName: "project-compliance-report" */ './ProjectComplianceReport'
  );

const ProjectCompliance = lazy(loadProjectCompliance);
const ProjectManuscript = lazy(loadProjectManuscript);
const ProjectMilestones = lazy(loadProjectMilestones);
const ProjectComplianceReport = lazy(loadProjectComplianceReport);

type Props = {
  config: ProjectDetailConfig;
};

type ProjectOutputCountsProps = {
  projectId: string;
  teamId?: string;
  userAssociationMember: boolean;
  children: (counts: {
    publishedOutputsCount?: number;
    draftOutputsCount?: number;
  }) => ReactNode;
};

const ProjectOutputCountsLoader: FC<ProjectOutputCountsProps> = ({
  projectId,
  teamId,
  userAssociationMember,
  children,
}) => {
  const listScope = getProjectResearchOutputListScope({ projectId, teamId });
  const listOptions = {
    searchQuery: '',
    currentPage: 0,
    pageSize: 10,
    ...listScope,
  };

  const publishedOutputs = useResearchOutputs(listOptions);
  const draftOutputs = useResearchOutputs({
    ...listOptions,
    draftsOnly: true as const,
    userAssociationMember,
  });

  return (
    <>
      {children({
        publishedOutputsCount: publishedOutputs.total,
        draftOutputsCount: draftOutputs.total,
      })}
    </>
  );
};

type ManuscriptsCountProps = {
  children: (counts: { manuscriptsCount?: number }) => ReactNode;
};

const ManuscriptsCountLoader: FC<ManuscriptsCountProps> = ({ children }) => {
  // Fixed on purpose: this loader sits above every tab, so reading the shared
  // `view` param would let an unrelated tab's list toggle change this query
  // key mid-session and suspend the whole page.
  const { total } = useManuscripts({
    searchQuery: '',
    currentPage: 0,
    pageSize: 10,
    requestedAPCCoverage: 'all',
    completedStatus: 'hide',
    selectedStatuses: [],
  });

  return <>{children({ manuscriptsCount: total })}</>;
};

const ManuscriptsCount: FC<ManuscriptsCountProps & { enabled: boolean }> = ({
  enabled,
  children,
}) =>
  enabled ? (
    <ManuscriptsCountLoader>{children}</ManuscriptsCountLoader>
  ) : (
    <>{children({})}</>
  );

const DuplicateOutput: FC<{
  project: ProjectDetailResponse;
  teamId?: string;
}> = ({ project, teamId }) => {
  const { id } = useParams<{ id: string }>();
  const output = useResearchOutputById(id ?? '');

  if (!output) {
    return <NotFoundPage />;
  }

  const duplicatedOutput = {
    ...output,
    id: '',
    published: false,
    link: undefined,
    title: `Copy of ${output.title}`,
  };

  if (output.project?.id === project.id) {
    return (
      <UserBasedOutput
        researchOutputData={duplicatedOutput}
        isDuplicate
        projectId={project.id}
      />
    );
  }

  if (teamId && output.teams.some((team) => team.id === teamId)) {
    return (
      <TeamBasedOutput
        researchOutputData={duplicatedOutput}
        isDuplicate
        project={project}
        teamId={teamId}
      />
    );
  }

  return <NotFoundPage />;
};

const ProjectDetail: FC<Props> = ({ config }) => {
  const { projectId: rawProjectId } = useParams<{ projectId: string }>();
  const projectId = rawProjectId ?? '';
  const projectDetail = useProjectById(projectId);
  const fetchArticles = useFetchAimArticles();
  const user = useCurrentUserCRN();
  const isOpenScienceMember =
    user?.role === 'Staff' && !!user?.openScienceTeamMember;
  const { hash: targetManuscript } = useLocation();

  const teamId =
    projectDetail && 'teamId' in projectDetail
      ? projectDetail.teamId
      : undefined;

  const outputsTeamId =
    projectDetail && config.getIsTeamBased(projectDetail) ? teamId : undefined;

  // TODO: should be expanded to handle searching by project id as this will fail for user-based projects.
  const loadArticleOptions = useProjectArticlesSuggestions(teamId ?? projectId);

  if (!projectDetail) {
    return <NotFoundPage />;
  }

  if (projectDetail.projectType !== config.projectType) {
    return <NotFoundPage />;
  }

  const route = config.getRoute(projectId);

  const isMember =
    !!user && isProjectMember(user.id, user.teams ?? [], projectDetail);
  const isLead =
    !!user &&
    isProjectLead(
      user.id,
      expandUserTeamRoles(user.teams ?? []),
      projectDetail,
    );
  const showWorkspace = isMember || isOpenScienceMember;
  const canSubmitManuscript = showWorkspace && isMember;
  const canEditOrResubmitManuscript =
    showWorkspace && (isMember || isOpenScienceMember);
  const canCreateComplianceReport = showWorkspace && isOpenScienceMember;

  const workspaceHref = showWorkspace ? route.workspace({}).$ : undefined;

  // The project-type check is what scopes compliance to the ASAP resource
  // project: DiscoveryProject also declares teamName and fundedTeam, so a
  // name-only match would show the tab on a discovery project funded by ASAP.
  const showCompliance =
    projectDetail.projectType === 'Resource Project' &&
    projectDetail.fundedTeam?.displayName === ASAP_TEAM_NAME &&
    (isMember || isOpenScienceMember);

  const complianceHref = showCompliance ? route.compliance({}).$ : undefined;
  const isTeamBased = config.getIsTeamBased(projectDetail);

  const hasSupplementGrant =
    'supplementGrant' in projectDetail && !!projectDetail.supplementGrant;
  const activeProjectAims =
    (hasSupplementGrant
      ? projectDetail.supplementGrant?.aims
      : projectDetail.originalGrantAims) || [];

  const isMemberOrStaff = isMember || user?.role === 'Staff';
  const displayDraftOutputs = isMemberOrStaff;
  const canShareOutput = isMember;

  return (
    <Frame title={projectDetail.title || ''}>
      <ManuscriptToastProvider>
        <EligibilityReasonProvider>
          <Routes>
            {canSubmitManuscript && (
              <Route
                path={`workspace${
                  route.workspace({}).createManuscript.template
                }`}
                element={
                  <Frame title="Create Manuscript">
                    <ProjectManuscript
                      projectId={projectId}
                      projectType={config.projectTypeKey}
                    />
                  </Frame>
                }
              />
            )}
            {canEditOrResubmitManuscript && (
              <Route
                path={`workspace${route.workspace({}).editManuscript.template}`}
                element={
                  <Frame title="Edit Manuscript">
                    <ProjectManuscript
                      projectId={projectId}
                      projectType={config.projectTypeKey}
                    />
                  </Frame>
                }
              />
            )}
            {canEditOrResubmitManuscript && (
              <Route
                path={`workspace${
                  route.workspace({}).resubmitManuscript.template
                }`}
                element={
                  <Frame title="Resubmit Manuscript">
                    <ProjectManuscript
                      projectId={projectId}
                      projectType={config.projectTypeKey}
                      resubmitManuscript
                    />
                  </Frame>
                }
              />
            )}
            {canCreateComplianceReport && (
              <Route
                path={`workspace${
                  route.workspace({}).createComplianceReport.template
                }`}
                element={
                  <Frame title="Create Compliance Report">
                    <ProjectComplianceReport
                      projectId={projectId}
                      projectType={config.projectTypeKey}
                    />
                  </Frame>
                }
              />
            )}
            <Route
              path="create-output/:outputDocumentType"
              element={(() => {
                if (!canShareOutput) {
                  return <NotFoundPage />;
                }
                if (isTeamBased) {
                  return teamId ? (
                    <Frame title="Share Output">
                      <TeamBasedOutput
                        teamId={teamId}
                        project={projectDetail}
                      />
                    </Frame>
                  ) : (
                    <NotFoundPage />
                  );
                }
                return (
                  <Frame title="Share Output">
                    <UserBasedOutput projectId={projectId} />
                  </Frame>
                );
              })()}
            />
            <Route
              path="duplicate/:id"
              element={
                canShareOutput ? (
                  <Frame title="Duplicate Output">
                    <DuplicateOutput project={projectDetail} teamId={teamId} />
                  </Frame>
                ) : (
                  <NotFoundPage />
                )
              }
            />
            <Route
              path="*"
              element={
                <ProjectOutputCountsLoader
                  projectId={projectId}
                  teamId={outputsTeamId}
                  userAssociationMember={isMemberOrStaff}
                >
                  {({ publishedOutputsCount, draftOutputsCount }) => (
                    <ManuscriptsCount enabled={showCompliance}>
                      {({ manuscriptsCount }) => (
                        <ProjectDetailPage
                          {...projectDetail}
                          pointOfContactEmail={
                            projectDetail.contactEmail || undefined
                          }
                          aboutHref={route.about({}).$}
                          workspaceHref={workspaceHref}
                          milestonesHref={route.milestones({}).$}
                          complianceHref={complianceHref}
                          manuscriptsCount={manuscriptsCount}
                          outputsHref={route.outputs({}).$}
                          draftOutputsHref={
                            displayDraftOutputs
                              ? route.draftOutputs({}).$
                              : undefined
                          }
                          outputsCount={publishedOutputsCount}
                          draftOutputsCount={draftOutputsCount}
                          canShareOutput={canShareOutput}
                        >
                          <Routes>
                            <Route
                              path="about"
                              element={
                                <ProjectDetailAbout
                                  {...projectDetail}
                                  pointOfContactEmail={
                                    projectDetail.contactEmail || undefined
                                  }
                                  fetchArticles={fetchArticles}
                                  seeMilestonesHref={route.milestones({}).$}
                                />
                              }
                            />
                            <Route
                              path="milestones"
                              element={
                                <Frame title="Project Milestones">
                                  <ProjectMilestones
                                    projectId={projectId}
                                    projectName={projectDetail.title || ''}
                                    seeAimsHref={route.about({}).$}
                                    hasSupplementGrant={hasSupplementGrant}
                                    aims={activeProjectAims}
                                    isLead={isLead}
                                    loadArticleOptions={loadArticleOptions}
                                    milestonesLastUpdated={
                                      projectDetail.milestonesLastUpdated
                                    }
                                  />
                                </Frame>
                              }
                            />
                            {showWorkspace && (
                              <Route
                                path="workspace/*"
                                element={
                                  <ProjectWorkspace
                                    id={projectId}
                                    isProjectMember={isMember}
                                    isTeamBased={isTeamBased}
                                    teamId={teamId}
                                    tools={projectDetail.tools ?? []}
                                    lastModifiedDate={new Date().toISOString()}
                                    contactEmail={
                                      projectDetail.contactEmail || undefined
                                    }
                                    contactName={config.getContactName(
                                      projectDetail,
                                    )}
                                    toolsHref={route.workspace({}).tools({}).$}
                                    editToolHref={(index) =>
                                      route
                                        .workspace({})
                                        .tools({})
                                        .tool({ toolIndex: `${index}` }).$
                                    }
                                    isActiveProject={
                                      projectDetail.status === 'Active'
                                    }
                                    createManuscriptHref={
                                      route.workspace({}).createManuscript({}).$
                                    }
                                    getEditManuscriptHref={(manuscriptId) =>
                                      route
                                        .workspace({})
                                        .editManuscript({ manuscriptId }).$
                                    }
                                    getResubmitManuscriptHref={(manuscriptId) =>
                                      route
                                        .workspace({})
                                        .resubmitManuscript({ manuscriptId }).$
                                    }
                                    getCreateComplianceReportHref={(
                                      manuscriptId,
                                    ) =>
                                      route
                                        .workspace({})
                                        .createComplianceReport({
                                          manuscriptId,
                                        }).$
                                    }
                                    targetManuscriptId={targetManuscript.slice(
                                      1,
                                    )}
                                    workspaceHref={route.workspace({}).$}
                                  />
                                }
                              />
                            )}
                            <Route
                              path="outputs"
                              element={
                                <Frame title="Project Outputs">
                                  <ProjectOutputs
                                    projectId={projectId}
                                    teamId={outputsTeamId}
                                    projectTitle={projectDetail.title}
                                    userAssociationMember={isMemberOrStaff}
                                    hasOutputs={
                                      (publishedOutputsCount ?? 0) > 0
                                    }
                                  />
                                </Frame>
                              }
                            />
                            <Route
                              path="draft-outputs"
                              element={
                                displayDraftOutputs ? (
                                  <Frame title="Project Draft Outputs">
                                    <ProjectOutputs
                                      projectId={projectId}
                                      projectTitle={projectDetail.title}
                                      teamId={outputsTeamId}
                                      draftOutputs
                                      userAssociationMember={isMemberOrStaff}
                                      hasOutputs={
                                        isMemberOrStaff &&
                                        (draftOutputsCount ?? 0) > 0
                                      }
                                    />
                                  </Frame>
                                ) : (
                                  <NotFoundPage />
                                )
                              }
                            />
                            {showCompliance && (
                              <Route
                                path="compliance"
                                element={
                                  <SearchFrame title="Compliance">
                                    <ProjectCompliance />
                                  </SearchFrame>
                                }
                              />
                            )}
                            <Route
                              index
                              element={
                                <Navigate to={route.about({}).$} replace />
                              }
                            />
                          </Routes>
                        </ProjectDetailPage>
                      )}
                    </ManuscriptsCount>
                  )}
                </ProjectOutputCountsLoader>
              }
            />
          </Routes>
        </EligibilityReasonProvider>
      </ManuscriptToastProvider>
    </Frame>
  );
};

export default ProjectDetail;
