import { useEffect } from 'react';
import { Frame } from '@asap-hub/frontend-utils';
import {
  ComplianceReportForm,
  ComplianceReportHeader,
  NotFoundPage,
  usePushFromHere,
  utils,
} from '@asap-hub/react-components';
import { projects } from '@asap-hub/routing';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams, useLocation } from 'react-router';
import { useManuscriptToast } from '../network/teams/useManuscriptToast';
import {
  useInvalidateWorkspaceManuscripts,
  useManuscriptById,
  usePostComplianceReport,
  useProjectById,
} from './state';

type ProjectComplianceReportProps = {
  projectId: string;
  projectType: 'discovery' | 'resource' | 'trainee';
};

const getProjectWorkspacePath = (
  projectId: string,
  projectType: ProjectComplianceReportProps['projectType'],
): string => {
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

const ProjectComplianceReport: React.FC<ProjectComplianceReportProps> = ({
  projectId,
  projectType,
}) => {
  const { manuscriptId } = useParams<{ manuscriptId: string }>();
  const [manuscript, setManuscript] = useManuscriptById(manuscriptId ?? '');
  const projectDetail = useProjectById(projectId);
  const { setFormType } = useManuscriptToast();

  const pushFromHere = usePushFromHere();
  const { state } = useLocation();

  const invalidateWorkspaceManuscripts = useInvalidateWorkspaceManuscripts();
  const form = useForm();
  const createComplianceReport = usePostComplianceReport();

  const projectWorkspacePath = getProjectWorkspacePath(projectId, projectType);

  useEffect(() => {
    window.scrollTo({ top: 0 });

    const { fromButton } = (state as { fromButton?: boolean }) ?? {};
    if (fromButton) return;

    void pushFromHere(projectWorkspacePath, { replace: true });
  }, [pushFromHere, state, projectWorkspacePath]);

  if (manuscript && manuscript.versions[0]) {
    const onSuccess = () => {
      setFormType({
        type: 'compliance-report',
        accent: 'successLarge',
      });
      void invalidateWorkspaceManuscripts();
      void pushFromHere(projectWorkspacePath, { replace: true });
    };

    const breadcrumbs = utils.getProjectBreadcrumbs(projectDetail, projectId);

    return (
      <FormProvider {...form}>
        <Frame title="Create Compliance Report">
          <ComplianceReportHeader breadcrumbs={breadcrumbs} />
          <ComplianceReportForm
            onSuccess={onSuccess}
            onSave={createComplianceReport}
            manuscriptTitle={manuscript.title}
            manuscriptVersionId={manuscript.versions[0].id}
            manuscriptType={manuscript.versions[0].type}
            setManuscript={setManuscript}
            manuscriptId={manuscriptId ?? ''}
          />
        </Frame>
      </FormProvider>
    );
  }

  return <NotFoundPage />;
};

export default ProjectComplianceReport;
