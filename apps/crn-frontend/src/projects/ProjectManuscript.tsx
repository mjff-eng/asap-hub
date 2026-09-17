import React, { lazy, useMemo } from 'react';
import { Frame } from '@asap-hub/frontend-utils';
import {
  AuthorResponse,
  AuthorSelectOption,
  ManuscriptError,
} from '@asap-hub/model';
import { useCurrentUserCRN } from '@asap-hub/react-context';
import { ManuscriptHeader, usePushFromHere } from '@asap-hub/react-components';
import { projectRouteByType, projects } from '@asap-hub/routing';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import {
  useAuthorSuggestions,
  useCategorySuggestions,
  useLabSuggestions,
  useGeneratedContent,
  useTeamSuggestions,
  useImpactSuggestions,
} from '../shared-state';
import { usePutManuscript } from '../network/teams/state';
import { useEligibilityReason } from './useEligibilityReason';
import { useManuscriptToast } from '../network/teams/useManuscriptToast';
import {
  useInvalidateWorkspaceManuscripts,
  useManuscriptById,
  usePostManuscript,
  useProjectById,
  useResubmitManuscript,
  useUploadManuscriptFileViaPresignedUrl,
} from './state';

const loadManuscriptForm = () =>
  import(
    /* webpackChunkName: "manuscript-form" */ '@asap-hub/react-components/manuscript-form'
  );
const ManuscriptForm = lazy(loadManuscriptForm);

type ProjectManuscriptProps = {
  projectId: string;
  projectType: 'discovery' | 'resource' | 'trainee';
  resubmitManuscript?: boolean;
};

const ProjectManuscript: React.FC<ProjectManuscriptProps> = ({
  projectId,
  projectType,
  resubmitManuscript = false,
}) => {
  const invalidateWorkspaceManuscripts = useInvalidateWorkspaceManuscripts();
  const { manuscriptId } = useParams<{ manuscriptId: string }>();
  const [manuscript] = useManuscriptById(manuscriptId ?? '');
  const projectDetail = useProjectById(projectId);

  const user = useCurrentUserCRN();
  const projectMembers =
    projectDetail && 'members' in projectDetail
      ? projectDetail.members
      : undefined;
  const projectMemberIds = useMemo(
    () => projectMembers?.map((member) => member.id),
    [projectMembers],
  );
  const projectTeam =
    projectDetail && 'fundedTeam' in projectDetail
      ? projectDetail.fundedTeam
      : undefined;

  const ownership = useMemo(() => {
    // Creating
    if (!manuscript) {
      if (projectTeam) {
        return {
          type: 'team' as const,
          teamId: projectTeam.id,
          projectId: undefined,
        };
      }

      return {
        type: 'project' as const,
        teamId: undefined,
        projectId,
      };
    }

    // Existing manuscript
    return {
      type: manuscript.teamId ? ('team' as const) : ('project' as const),
      teamId: manuscript.teamId,
      projectId: manuscript.projectId,
    };
  }, [manuscript, projectTeam, projectId]);

  const manuscriptTeamId =
    ownership.type === 'team' ? ownership.teamId : undefined;

  const manuscriptProjectId =
    ownership.type === 'project' ? ownership.projectId : undefined;

  const { eligibilityReasons } = useEligibilityReason();
  const { setFormType } = useManuscriptToast();
  const form = useForm();
  const createManuscript = usePostManuscript();
  const updateManuscript = usePutManuscript();
  const handleResubmitManuscript = useResubmitManuscript();
  const handleFileUpload = useUploadManuscriptFileViaPresignedUrl();
  const getTeamSuggestions = useTeamSuggestions();
  const getLabSuggestions = useLabSuggestions();
  const getAuthorSuggestions = useAuthorSuggestions();
  const getShortDescriptionFromDescription = useGeneratedContent();
  const getImpactSuggestions = useImpactSuggestions();
  const getCategorySuggestions = useCategorySuggestions();

  const pushFromHere = usePushFromHere();

  const getWorkspacePath = (): string => {
    const projectRoutes = projects({});
    switch (projectType) {
      case 'discovery':
        return projectRoutes
          .discoveryProjects({})
          .discoveryProject({ projectId })
          .workspace({}).$;
      case 'resource':
        return projectRoutes
          .resourceProjects({})
          .resourceProject({ projectId })
          .workspace({}).$;
      case 'trainee':
      default:
        return projectRoutes
          .traineeProjects({})
          .traineeProject({ projectId })
          .workspace({}).$;
    }
  };

  const onSuccess = () => {
    const path = getWorkspacePath();
    setFormType({ type: 'manuscript', accent: 'successLarge' });
    // edits are patched into the list cache; a refetch could serve stale data
    if (!manuscriptId || resubmitManuscript) {
      void invalidateWorkspaceManuscripts();
    }
    void pushFromHere(path);
  };

  const onError = (error: ManuscriptError | Error) => {
    if ('statusCode' in error && error.statusCode === 422) {
      setFormType({ type: 'server-validation-error', accent: 'error' });
    } else {
      setFormType({ type: 'default-error', accent: 'error' });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const {
    teams: manuscriptTeams,
    labs: manuscriptLabs,
    firstAuthors: manuscriptFirstAuthors,
    correspondingAuthor: manuscriptCorrespondingAuthor,
    additionalAuthors: manuscriptAdditionalAuthors,
    ...manuscriptVersion
  } = manuscript?.versions[0] || {};

  const { impact: manuscriptImpact, categories: manuscriptCategories } =
    manuscript || {};
  const selectedImpact = manuscriptImpact
    ? {
        value: manuscriptImpact.id,
        label: manuscriptImpact.name,
      }
    : undefined;

  const selectedCategories = (manuscriptCategories || [])?.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const selectedTeams = useMemo(() => {
    // Existing manuscript
    if (manuscriptTeams?.length) {
      return manuscriptTeams.map((team, index) => ({
        value: team.id,
        label: team.displayName,

        // Only lock first team when manuscript itself is team-owned
        isFixed: ownership.type === 'team' && index === 0,
      }));
    }

    // New team-owned manuscript
    if (ownership.type === 'team' && projectTeam) {
      return [
        {
          value: projectTeam.id,
          label: projectTeam.displayName,
          isFixed: true,
        },
      ];
    }

    // New user-owned manuscript
    return [];
  }, [manuscriptTeams, ownership.type, projectTeam]);

  const selectedLabs = (manuscriptLabs || []).map((lab) => ({
    value: lab.id,
    label: lab.name,
    labPITeamIds: lab.labPITeamIds,
    isFixed: false,
  }));

  const convertAuthorsToSelectOptions = (
    authors: AuthorResponse[] | undefined,
  ) =>
    (authors || []).map((author) => ({
      author,
      label: author.displayName,
      value: author.id,
    })) as (AuthorResponse & AuthorSelectOption)[];

  const breadcrumbs = projectDetail
    ? [
        {
          label: `${projectDetail.projectType}s`,
          href: {
            'Discovery Project': projects({}).discoveryProjects({}).$,
            'Resource Project': projects({}).resourceProjects({}).$,
            'Trainee Project': projects({}).traineeProjects({}).$,
          }[projectDetail.projectType],
        },
        {
          label: projectDetail.title,
          href: projectRouteByType[projectDetail.projectType](projectId).about(
            {},
          ).$,
        },
      ]
    : [];

  return (
    <FormProvider {...form}>
      <Frame title="Create Manuscript">
        <ManuscriptHeader
          resubmitManuscript={resubmitManuscript}
          isEditMode={!!manuscriptId && !resubmitManuscript}
          breadcrumbs={breadcrumbs}
        />
        <ManuscriptForm
          getShortDescriptionFromDescription={
            getShortDescriptionFromDescription
          }
          manuscriptId={manuscriptId}
          onSuccess={onSuccess}
          onCreate={createManuscript}
          onError={onError}
          onUpdate={updateManuscript}
          onResubmit={handleResubmitManuscript}
          teamId={manuscriptTeamId}
          projectId={manuscriptProjectId}
          isOpenScienceTeamMember={user?.openScienceTeamMember}
          handleFileUpload={handleFileUpload}
          eligibilityReasons={eligibilityReasons}
          getTeamSuggestions={getTeamSuggestions}
          selectedTeams={selectedTeams}
          getLabSuggestions={getLabSuggestions}
          selectedLabs={selectedLabs}
          getAuthorSuggestions={(input: string) =>
            getAuthorSuggestions(input).then((authors) =>
              authors.map((author) => ({
                author,
                label: author.displayName,
                value: author.id,
              })),
            )
          }
          title={manuscript?.title}
          url={manuscript?.url}
          impact={selectedImpact}
          layImpactStatement={manuscript?.layImpactStatement}
          preprintDate={manuscript?.preprintDate}
          publicationDate={manuscript?.publicationDate}
          categories={selectedCategories}
          firstAuthors={convertAuthorsToSelectOptions(manuscriptFirstAuthors)}
          correspondingAuthor={convertAuthorsToSelectOptions(
            manuscriptCorrespondingAuthor,
          )}
          additionalAuthors={convertAuthorsToSelectOptions(
            manuscriptAdditionalAuthors,
          )}
          resubmitManuscript={resubmitManuscript}
          clearFormToast={() => {
            setFormType({ type: '', accent: 'successLarge' });
          }}
          getImpactSuggestions={getImpactSuggestions}
          getCategorySuggestions={getCategorySuggestions}
          onInvalid={() => {
            setFormType({ type: 'server-validation-error', accent: 'error' });
          }}
          projectMemberIds={projectMemberIds}
          {...manuscriptVersion}
          versionsCount={manuscript?.versions.length}
        />
      </Frame>
    </FormProvider>
  );
};

export default ProjectManuscript;
