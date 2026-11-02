import {
  isActiveTeamMember,
  ProjectMember,
  ProjectMemberTeam,
  TeamMember,
  TeamRole,
  teamRolePriorities,
  UserAward,
  UserTeam,
} from '@asap-hub/model';

import { splitListBy } from './common';
import { getMemberHref } from './project';

const mergeInactiveSinceDate = (
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined => {
  if (!incoming) {
    return undefined;
  }

  if (!existing) {
    return existing;
  }

  return incoming > existing ? incoming : existing;
};

const mergeById = <T extends { id: string }>(
  target: T[] | undefined,
  source: readonly T[] | undefined,
): T[] | undefined => {
  if (!source?.length) {
    return target;
  }

  const ids = new Set((target || []).map((t) => t.id));
  const newItems = source.filter((s) => !ids.has(s.id));

  if (!newItems.length) {
    return target;
  }

  if (!target) {
    return [...newItems];
  }

  target.push(...newItems);

  return target;
};

export type GroupedUserTeam = {
  id: string;
  displayName?: string;
  teamInactiveSince?: string;
  proposal?: string;
  roles: TeamRole[];
  inactiveSinceDate?: string;
};

export const byTeamRolePriority = (
  a: GroupedUserTeam,
  b: GroupedUserTeam,
): number =>
  (a.roles[0] ? teamRolePriorities[a.roles[0]] : 0) -
  (b.roles[0] ? teamRolePriorities[b.roles[0]] : 0);

export const groupUserTeamsByTeamId = (
  teams: UserTeam[],
): GroupedUserTeam[] => {
  const teamMap = new Map<string, GroupedUserTeam>();

  for (const team of teams) {
    const existing = teamMap.get(team.id);
    if (existing) {
      if (!existing.roles.includes(team.role)) {
        existing.roles.push(team.role);
      }
      existing.inactiveSinceDate = mergeInactiveSinceDate(
        existing.inactiveSinceDate,
        team.inactiveSinceDate,
      );
    } else {
      teamMap.set(team.id, {
        id: team.id,
        displayName: team.displayName,
        teamInactiveSince: team.teamInactiveSince,
        proposal: team.proposal,
        roles: [team.role],
        inactiveSinceDate: team.inactiveSinceDate,
      });
    }
  }

  return Array.from(teamMap.values());
};

export type GroupedTeamMember = Omit<TeamMember, 'role'> & {
  roles: TeamRole[];
};

export const groupTeamMembersByUserId = (
  members: TeamMember[],
): GroupedTeamMember[] => {
  const memberMap = new Map<string, GroupedTeamMember>();

  for (const member of members) {
    const existing = memberMap.get(member.id);
    if (existing) {
      if (!existing.roles.includes(member.role)) {
        existing.roles.push(member.role);
      }
      existing.labs = mergeById(existing.labs, member.labs);
      existing.inactiveSinceDate = mergeInactiveSinceDate(
        existing.inactiveSinceDate,
        member.inactiveSinceDate,
      );
      if (!member.alumniSinceDate) {
        existing.alumniSinceDate = undefined;
      }
    } else {
      const { role, ...rest } = member;
      memberMap.set(member.id, { ...rest, roles: [role] });
    }
  }

  return Array.from(memberMap.values());
};

export const getTeamMembersByStatus = (
  members: ReadonlyArray<TeamMember | null | undefined>,
  isTeamInactive: boolean,
): { activeMembers: GroupedTeamMember[]; pastMembers: GroupedTeamMember[] } => {
  const validMembers = members.filter((member): member is TeamMember =>
    Boolean(member),
  );
  const [rawPast, rawActive] = splitListBy(
    validMembers,
    (member) => isTeamInactive || !isActiveTeamMember(member),
  );
  const active = groupTeamMembersByUserId(rawActive);
  const activeIdSet = new Set(active.map((m) => m.id));
  const past = groupTeamMembersByUserId(rawPast).filter(
    (m) => !activeIdSet.has(m.id),
  );
  return { activeMembers: active, pastMembers: past };
};

export type GroupedProjectMember = {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  email?: string;
  alumniSinceDate?: string;
  href?: string;
  teams?: ProjectMemberTeam[];
  roles: string[];
  latestAward?: UserAward;
};

export const groupProjectMembersByUserId = (
  members: readonly ProjectMember[],
): GroupedProjectMember[] => {
  const memberMap = new Map<string, GroupedProjectMember>();

  for (const member of members) {
    const existing = memberMap.get(member.id);
    if (existing) {
      if (member.role && !existing.roles.includes(member.role)) {
        existing.roles.push(member.role);
      }
      existing.teams = mergeById(existing.teams, member.teams);
    } else {
      memberMap.set(member.id, {
        id: member.id,
        displayName: member.displayName,
        firstName: member.firstName,
        lastName: member.lastName,
        avatarUrl: member.avatarUrl,
        email: member.email,
        alumniSinceDate: member.alumniSinceDate,
        href: getMemberHref(member.id),
        teams: member.teams ? [...member.teams] : undefined,
        roles: member.role ? [member.role] : [],
        latestAward: member.latestAward,
      });
    }
  }

  return Array.from(memberMap.values());
};
