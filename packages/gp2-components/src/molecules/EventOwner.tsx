import { gp2 as gp2Model } from '@asap-hub/model';
import { Link, Paragraph } from '@asap-hub/react-components';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { ComponentProps } from 'react';
import { projectIcon, usersIcon, workingGroupIcon } from '../icons';
import IconWithLabel from './IconWithLabel';

const { projects, workingGroups } = gp2Routing;

type EventOwnerProps = Pick<gp2Model.EventResponse, 'project' | 'workingGroup'>;
const getProperties = ({
  project,
  workingGroup,
}: EventOwnerProps): {
  title: string;
} & Partial<Pick<ComponentProps<typeof Link>, 'href'>> &
  Pick<ComponentProps<typeof IconWithLabel>, 'icon'> => {
  if (workingGroup) {
    return {
      ...workingGroup,
      href: workingGroups({}).workingGroup({
        workingGroupId: workingGroup.id,
      }).$,
      icon: workingGroupIcon,
    };
  }
  return project
    ? {
        ...project,
        href: projects({}).project({ projectId: project.id }).$,
        icon: projectIcon,
      }
    : {
        title: 'GP2 Hub',
        icon: usersIcon,
      };
};

const EventOwner: React.FC<EventOwnerProps> = ({ project, workingGroup }) => {
  const { title, href, icon } = getProperties({ project, workingGroup });

  return (
    <IconWithLabel noMargin icon={icon}>
      {href ? (
        <Link href={href}>{title}</Link>
      ) : (
        <Paragraph noMargin accent="neutral900">
          {title}
        </Paragraph>
      )}
    </IconWithLabel>
  );
};

export default EventOwner;
