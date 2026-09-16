import { EventUpdateDetailsRequest } from '@asap-hub/model';
import { SpeakerGroup } from '@asap-hub/react-components';

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
    .filter((group) => group.variant === 'team')
    .map((group) => ({
      teamId: group.id,
      shared: group.preliminaryFindingsShared,
    }));

  return { speakersToRemove, preliminaryDataShared };
};
