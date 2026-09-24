import {
  EventResponse,
  EventSpeaker,
  EventSpeakerExternalUser,
  EventSpeakerUser,
} from '@asap-hub/model';
import {
  groupFindings,
  groupLabel,
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
  SpeakerTeamGroup,
} from '@asap-hub/react-components';

const isExternalSpeaker = (
  speaker: EventSpeaker,
): speaker is EventSpeakerExternalUser => 'externalUser' in speaker;

const isTeamSpeaker = (speaker: EventSpeaker): speaker is EventSpeakerUser =>
  'user' in speaker && 'team' in speaker && 'role' in speaker;

type MutableTeamGroup = {
  id: string;
  teamName: string;
  isTeamInactive: boolean;
  users: Map<
    string,
    SpeakerGroupUser & { roles: string[]; speakerIds: string[] }
  >;
};

export const mapSpeakersToGroups = (event: EventResponse): SpeakerGroup[] => {
  const sharedByTeamId = new Map(
    (event.preliminaryDataShared ?? []).map(({ team, shared }) => [
      team.id,
      shared,
    ]),
  );

  const teamGroups = new Map<string, MutableTeamGroup>();
  const externalUsers: SpeakerGroupExternalUser[] = [];

  event.speakers.forEach((speaker, index) => {
    if (isExternalSpeaker(speaker)) {
      externalUsers.push({
        id: `external-${index}`,
        speakerIds: speaker.id ? [speaker.id] : [],
        displayName: speaker.externalUser.name,
        preliminaryFindingsShared: false,
      });
      return;
    }

    if (!isTeamSpeaker(speaker)) {
      return;
    }

    const { team, user, role } = speaker;
    const group = teamGroups.get(team.id) ?? {
      id: team.id,
      teamName: team.displayName,
      isTeamInactive: !!team.inactiveSince,
      users: new Map(),
    };

    const existing = group.users.get(user.id);
    if (existing) {
      if (role && !existing.roles.includes(role)) {
        existing.roles.push(role);
      }
      if (speaker.id && !existing.speakerIds.includes(speaker.id)) {
        existing.speakerIds.push(speaker.id);
      }
    } else {
      group.users.set(user.id, {
        id: user.id,
        speakerIds: speaker.id ? [speaker.id] : [],
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isAlumni: !!user.alumniSinceDate,
        roles: role ? [role] : [],
        preliminaryFindingsShared: sharedByTeamId.get(team.id) ?? false,
      });
    }

    teamGroups.set(team.id, group);
  });

  const teams: SpeakerTeamGroup[] = Array.from(teamGroups.values()).map(
    (group) => ({
      id: group.id,
      variant: 'team' as const,
      teamName: group.teamName,
      isTeamInactive: group.isTeamInactive,
      users: Array.from(group.users.values()),
    }),
  );

  const crnGroups = teams.sort((a, b) => {
    const aShared = groupFindings(a).hasAnyShared;
    const bShared = groupFindings(b).hasAnyShared;
    if (aShared !== bShared) {
      return aShared ? -1 : 1;
    }
    return groupLabel(a).localeCompare(groupLabel(b));
  });

  if (externalUsers.length > 0) {
    return [
      ...crnGroups,
      {
        id: 'external',
        variant: 'external',
        users: externalUsers,
      },
    ];
  }

  return crnGroups;
};
