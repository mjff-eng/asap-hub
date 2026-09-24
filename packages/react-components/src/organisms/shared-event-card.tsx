import { ProjectType, TeamType } from '@asap-hub/model';

import {
  DiscoveryTeamIcon,
  ProjectIcon,
  ResourceTeamIcon,
  TeamIcon,
} from '../icons';
import { getProjectIcon } from '../utils';

export const defaultVisibleRows = 5;
export const defaultVisibleSpeakers = 5;

export type EventTeamType = TeamType;

export const teamIcon = (teamType?: EventTeamType) => {
  switch (teamType) {
    case 'Discovery Team':
      return <DiscoveryTeamIcon />;
    case 'Resource Team':
      return <ResourceTeamIcon />;
    default:
      return <TeamIcon />;
  }
};

export const projectIcon = (projectType?: ProjectType) =>
  projectType ? getProjectIcon(projectType) : <ProjectIcon />;
