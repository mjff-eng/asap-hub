import {
  EventResponse,
  EventSpeaker,
  EventSpeakerExternalUser,
  EventSpeakerUser,
} from '@asap-hub/model';
import {
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
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
  preliminaryFindingsShared: boolean;
  users: Map<string, SpeakerGroupUser & { roles: string[]; speakerIds: string[] }>;
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
      preliminaryFindingsShared: sharedByTeamId.get(team.id) ?? false,
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
      });
    }

    teamGroups.set(team.id, group);
  });

  const teams: SpeakerGroup[] = Array.from(teamGroups.values())
    .map((group) => ({
      id: group.id,
      variant: 'team' as const,
      teamName: group.teamName,
      isTeamInactive: group.isTeamInactive,
      preliminaryFindingsShared: group.preliminaryFindingsShared,
      users: Array.from(group.users.values()),
    }))
    .sort((a, b) => {
      if (a.preliminaryFindingsShared !== b.preliminaryFindingsShared) {
        return a.preliminaryFindingsShared ? -1 : 1;
      }
      return a.teamName.localeCompare(b.teamName);
    });

  if (externalUsers.length > 0) {
    return [
      ...teams,
      {
        id: 'external',
        variant: 'external',
        preliminaryFindingsShared: false,
        users: externalUsers,
      },
    ];
  }

  return teams;
};
