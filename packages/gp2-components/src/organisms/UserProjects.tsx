import { gp2 } from '@asap-hub/model';
import { Link, Subtitle } from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { ComponentProps } from 'react';
import { EditableCard, StatusPill } from '../molecules';
import { CardTable } from '.';

type UserProjectsProps = Pick<gp2.UserResponse, 'id' | 'projects'> &
  Pick<ComponentProps<typeof EditableCard>, 'subtitle'> & {
    noLinks?: boolean;
    isOnboarding?: boolean;
  };

const UserProjects: React.FC<UserProjectsProps> = ({
  projects,
  id,
  subtitle,
  noLinks = false,
  isOnboarding = false,
}) => {
  const getUserProjectRole = (
    userId: gp2.UserResponse['id'],
    project: gp2.UserResponse['projects'][number],
  ): gp2.ProjectMemberRole | null =>
    project.members.find((member) => member.userId === userId)?.role || null;

  return (
    <EditableCard
      title="Projects"
      subtitle={
        subtitle ||
        'This member has been involved in the following GP2 projects.'
      }
    >
      {projects.length ? (
        <CardTable
          isOnboarding={isOnboarding}
          headings={
            isOnboarding ? ['Name', 'Status'] : ['Name', 'Role', 'Status']
          }
        >
          {projects.map((project) => {
            const name = noLinks ? (
              project.title
            ) : (
              <Link
                underlined
                href={
                  gp2Routing.projects({}).project({
                    projectId: project.id,
                  }).$
                }
              >
                {project.title}
              </Link>
            );
            const role = getUserProjectRole(id, project) || '';
            const status = <StatusPill status={project.status} />;

            return {
              id: project.id,
              values: isOnboarding ? [name, status] : [name, role, status],
            };
          })}
        </CardTable>
      ) : (
        <Subtitle accent={'neutral900'}>
          You are not associated to any projects.
        </Subtitle>
      )}
    </EditableCard>
  );
};

export default UserProjects;
