import {
  TeamMember,
  TeamRole,
  teamRole,
  teamRolePriorities,
} from '@asap-hub/model';

export const sortMembers = (a: TeamMember, b: TeamMember) => {
  if (teamRolePriorities[a.role] === teamRolePriorities[b.role]) {
    // sort ascending on lastName
    return a.lastName < b.lastName ? -1 : 1;
  }
  return teamRolePriorities[a.role] - teamRolePriorities[b.role];
};

export const isTeamRole = (data: string | null): data is TeamRole =>
  teamRole.includes(data as TeamRole);
