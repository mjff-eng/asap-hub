import {
  BaseProject,
  ProjectDetail,
  ProjectMember,
  ProjectType,
} from '@asap-hub/model';
import {
  network,
  projectListRouteByType,
  projectRouteByType,
  projects,
} from '@asap-hub/routing';
import {
  DiscoveryProjectIcon,
  ResourceProjectIcon,
  TraineeProjectIcon,
} from '../icons';

export const getMemberHref = (memberId: string): string =>
  network({}).users({}).user({ userId: memberId }).$;

export const withMemberHref = (
  member: ProjectMember,
): ProjectMember & { href: string } => ({
  ...member,
  href: getMemberHref(member.id),
});

type ProjectConfigParams = {
  projectId: BaseProject['id'];
  projectType: ProjectType;
};

export const getProjectIcon = (
  projectType: ProjectConfigParams['projectType'],
) => {
  switch (projectType) {
    case 'Discovery Project':
      return <DiscoveryProjectIcon />;
    case 'Resource Project':
      return <ResourceProjectIcon />;
    case 'Trainee Project':
      return <TraineeProjectIcon />;
  }

  throw new Error(`Unsupported project type: ${projectType}`);
};

export const getProjectRoute = ({
  projectId,
  projectType,
}: ProjectConfigParams) => {
  switch (projectType) {
    case 'Discovery Project':
      return projects({}).discoveryProjects({}).discoveryProject({ projectId })
        .$;
    case 'Resource Project':
      return projects({}).resourceProjects({}).resourceProject({ projectId }).$;
    case 'Trainee Project':
      return projects({}).traineeProjects({}).traineeProject({ projectId }).$;
    default:
      return undefined;
  }
};

export const getProjectConfig = ({
  projectId,
  projectType,
}: ProjectConfigParams) => ({
  href: getProjectRoute({ projectId, projectType }),
  icon: getProjectIcon(projectType),
});

export const getProjectBreadcrumbs = (
  projectDetail: ProjectDetail | undefined,
  projectId: BaseProject['id'],
) =>
  projectDetail
    ? [
        {
          label: `${projectDetail.projectType}s`,
          href: projectListRouteByType[projectDetail.projectType]().$,
        },
        {
          label: projectDetail.title,
          href: projectRouteByType[projectDetail.projectType](projectId).about(
            {},
          ).$,
        },
      ]
    : [];
