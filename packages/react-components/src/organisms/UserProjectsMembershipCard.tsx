import { isProjectStatus, UserProjectMembership } from '@asap-hub/model';

import { Pill } from '../atoms';
import {
  MembershipCard,
  MembershipName,
  ResponsiveTable,
  ResponsiveTableColumn,
} from '../molecules';
import { getProjectIcon, getProjectRoute } from '../utils';
import { getStatusPillAccent } from './ProjectCard';

const columns: ReadonlyArray<ResponsiveTableColumn<UserProjectMembership>> = [
  {
    key: 'name',
    title: 'Project Name',
    render: (project) => (
      <MembershipName
        icon={getProjectIcon(project.projectType)}
        href={getProjectRoute({
          projectId: project.id,
          projectType: project.projectType,
        })}
      >
        {project.title}
      </MembershipName>
    ),
  },
  {
    key: 'type',
    title: 'Type',
    width: '25%',
    render: (project) => project.projectType,
  },
  {
    key: 'status',
    title: 'Status',
    width: '25%',
    render: ({ status }) =>
      status ? (
        <Pill
          accent={
            isProjectStatus(status) ? getStatusPillAccent(status) : undefined
          }
          noMargin
        >
          {status}
        </Pill>
      ) : null,
  },
];

type ProjectsMembershipCardProps = {
  readonly projects: ReadonlyArray<UserProjectMembership>;
};

const UserProjectsMembershipCard: React.FC<ProjectsMembershipCardProps> = ({
  projects,
}) => (
  <MembershipCard
    title="Projects"
    description="Explore all projects this user has contributed to."
    items={projects}
    empty="No projects yet."
    truncateFrom={6}
  >
    {({ data }) => (
      <ResponsiveTable
        columns={columns}
        rows={data}
        getRowKey={(project) => project.id}
        testId="projects-membership-table"
      />
    )}
  </MembershipCard>
);

export default UserProjectsMembershipCard;
