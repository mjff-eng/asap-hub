import { EventUpdateDetailsRequest } from '@asap-hub/model';
import { SpeakerGroup, SpeakerTeamGroup } from '@asap-hub/react-components';

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

  if (!isPastEvent) {
    return { speakersToRemove };
  }

  const preliminaryDataShared = saved
    .filter(
      (group): group is SpeakerTeamGroup =>
        group.variant === 'team' || group.variant === 'project',
    )
    .flatMap((group) =>
      group.users
        .filter((user) => !user.isExternal)
        .flatMap((user) =>
          (user.speakerIds ?? []).map((speakerId) => ({
            speakerId,
            shared: user.preliminaryFindingsShared,
          })),
        ),
    );

  return { speakersToRemove, preliminaryDataShared };
};
