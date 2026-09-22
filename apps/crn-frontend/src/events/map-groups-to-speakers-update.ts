import { EventUpdateDetailsRequest } from '@asap-hub/model';
import {
  groupFindings,
  SpeakerGroup,
  SpeakerTeamGroup,
} from '@asap-hub/react-components';

const collectSpeakerIds = (groups: SpeakerGroup[]): Set<string> =>
  new Set(
    groups.flatMap((group) =>
      group.users.flatMap((user) => user.speakerIds ?? []),
    ),
  );

export const mapGroupsToSpeakersUpdate = (
  original: SpeakerGroup[],
  saved: SpeakerGroup[],
  isPastEvent: boolean,
): EventUpdateDetailsRequest => {
  const savedIds = collectSpeakerIds(saved);
  const speakersToRemove = [...collectSpeakerIds(original)].filter(
    (id) => !savedIds.has(id),
  );

  // Preliminary findings only exist for past events, so upcoming events never
  // write them.
  if (!isPastEvent) {
    return { speakersToRemove };
  }

  const preliminaryDataShared = saved
    .filter((group): group is SpeakerTeamGroup => group.variant === 'team')
    .map((group) => ({
      teamId: group.id,
      // A guest added in this session is never persisted, so their toggle must
      // not flip the team's stored flag. It would be worse than lost: on the
      // next read that flag re-seeds onto every real member of the team.
      shared: groupFindings({
        users: group.users.filter((user) => !user.isExternal),
      }).hasAnyShared,
    }));

  return { speakersToRemove, preliminaryDataShared };
};
