import {
  EventResponse,
  EventSpeaker,
  EventSpeakerExternalUser,
  EventSpeakerProjectUser,
  EventSpeakerUser,
} from '@asap-hub/model';
import {
  groupFindings,
  groupLabel,
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
  SpeakerProjectGroup,
  SpeakerTeamGroup,
} from '@asap-hub/react-components';

const isExternalSpeaker = (
  speaker: EventSpeaker,
): speaker is EventSpeakerExternalUser => 'externalUser' in speaker;

const isTeamSpeaker = (speaker: EventSpeaker): speaker is EventSpeakerUser =>
  'user' in speaker && 'team' in speaker && 'role' in speaker;

const isProjectSpeaker = (
  speaker: EventSpeaker,
): speaker is EventSpeakerProjectUser =>
  'user' in speaker && 'project' in speaker && 'role' in speaker;

type MutableUser = Omit<
  SpeakerGroupUser,
  'roles' | 'speakerIds' | 'preliminaryFindingsShared'
> & {
  roles: string[];
  speakerIds: string[];
  preliminaryFindingsShared: boolean;
};

type MutableGroup =
  | (Omit<SpeakerTeamGroup, 'users'> & { users: Map<string, MutableUser> })
  | (Omit<SpeakerProjectGroup, 'users'> & { users: Map<string, MutableUser> });

const addUser = (
  group: MutableGroup,
  speaker: EventSpeakerUser | EventSpeakerProjectUser,
) => {
  const { user, role } = speaker;
  const existing = group.users.get(user.id);
  if (existing) {
    if (role && !existing.roles.includes(role)) {
      existing.roles.push(role);
    }
    if (speaker.id && !existing.speakerIds.includes(speaker.id)) {
      existing.speakerIds.push(speaker.id);
    }
    if (speaker.preliminaryDataShared) {
      existing.preliminaryFindingsShared = true;
    }
    return;
  }
  group.users.set(user.id, {
    id: user.id,
    speakerIds: speaker.id ? [speaker.id] : [],
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isAlumni: !!user.alumniSinceDate,
    roles: role ? [role] : [],
    preliminaryFindingsShared: !!speaker.preliminaryDataShared,
  });
};

const toSortedGroups = <T extends SpeakerTeamGroup | SpeakerProjectGroup>(
  groups: Map<string, MutableGroup>,
): T[] =>
  Array.from(groups.values())
    .map((group) => ({ ...group, users: Array.from(group.users.values()) }) as T)
    .sort((a, b) => {
      const aShared = groupFindings(a).hasAnyShared;
      const bShared = groupFindings(b).hasAnyShared;
      if (aShared !== bShared) {
        return aShared ? -1 : 1;
      }
      return groupLabel(a).localeCompare(groupLabel(b));
    });

export const mapSpeakersToGroups = (event: EventResponse): SpeakerGroup[] => {
  const teamGroups = new Map<string, MutableGroup>();
  const projectGroups = new Map<string, MutableGroup>();
  const externalUsers: SpeakerGroupExternalUser[] = [];

  const teamGroup = ({ team }: { team: EventSpeakerUser['team'] }) => {
    const group = teamGroups.get(team.id) ?? {
      id: team.id,
      variant: 'team' as const,
      teamName: team.displayName,
      isTeamInactive: !!team.inactiveSince,
      users: new Map(),
    };
    teamGroups.set(team.id, group);
    return group;
  };

  const projectGroup = ({
    project,
  }: {
    project: EventSpeakerProjectUser['project'];
  }) => {
    const group = projectGroups.get(project.id) ?? {
      id: project.id,
      variant: 'project' as const,
      projectName: project.title,
      projectType: project.projectType,
      users: new Map(),
    };
    projectGroups.set(project.id, group);
    return group;
  };

  event.speakers.forEach((speaker, index) => {
    if (isExternalSpeaker(speaker)) {
      const externalUser = {
        id: `external-${index}`,
        speakerIds: speaker.id ? [speaker.id] : [],
        displayName: speaker.externalUser.name,
        preliminaryFindingsShared: false,
      };
      const { team, project } = speaker;
      if (!team && !project) {
        externalUsers.push(externalUser);
        return;
      }
      const affiliatedUser = { ...externalUser, roles: [], isExternal: true };
      if (team) {
        teamGroup({ team }).users.set(externalUser.id, affiliatedUser);
      }
      if (project) {
        projectGroup({ project }).users.set(externalUser.id, affiliatedUser);
      }
      return;
    }

    if (isProjectSpeaker(speaker)) {
      addUser(projectGroup(speaker), speaker);
    } else if (isTeamSpeaker(speaker)) {
      addUser(teamGroup(speaker), speaker);
    }
  });

  const groups: SpeakerGroup[] = [
    ...toSortedGroups<SpeakerTeamGroup>(teamGroups),
    ...toSortedGroups<SpeakerProjectGroup>(projectGroups),
  ];

  if (externalUsers.length > 0) {
    return [
      ...groups,
      {
        id: 'external',
        variant: 'external',
        users: externalUsers,
      },
    ];
  }

  return groups;
};
