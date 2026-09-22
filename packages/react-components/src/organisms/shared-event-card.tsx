import { ProjectType, TeamType } from '@asap-hub/model';

import {
  DiscoveryProjectIcon,
  DiscoveryTeamIcon,
  ProjectIcon,
  ResourceProjectIcon,
  ResourceTeamIcon,
  TeamIcon,
  TraineeProjectIcon,
} from '../icons';

export const defaultVisibleTeams = 10;
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

export const projectIcon = (projectType?: ProjectType) => {
  switch (projectType) {
    case 'Discovery Project':
      return <DiscoveryProjectIcon />;
    case 'Resource Project':
      return <ResourceProjectIcon />;
    case 'Trainee Project':
      return <TraineeProjectIcon />;
    default:
      return <ProjectIcon />;
  }
};
