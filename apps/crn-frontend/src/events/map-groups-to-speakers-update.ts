import {
  EventSpeakerUnlinkItem,
  EventUpdateDetailsRequest,
} from '@asap-hub/model';
import { SpeakerGroup, SpeakerTeamGroup } from '@asap-hub/react-components';

const collectSpeakerVariants = (
  groups: SpeakerGroup[],
): Map<string, Set<SpeakerGroup['variant']>> =>
  groups.reduce(
    (map, group) =>
      group.users
        .flatMap((user) => user.speakerIds ?? [])
        .reduce(
          (acc, speakerId) =>
            acc.set(
              speakerId,
              new Set([...(acc.get(speakerId) ?? []), group.variant]),
            ),
          map,
        ),
    new Map<string, Set<SpeakerGroup['variant']>>(),
  );

const unlinkableFields: EventSpeakerUnlinkItem['field'][] = ['team', 'project'];

export const mapGroupsToSpeakersUpdate = (
  original: SpeakerGroup[],
  saved: SpeakerGroup[],
  isPastEvent: boolean,
): EventUpdateDetailsRequest => {
  const originalVariants = collectSpeakerVariants(original);
  const savedVariants = collectSpeakerVariants(saved);

  const speakersToRemove = [...originalVariants.keys()].filter(
    (id) => !savedVariants.has(id),
  );
  const speakersToUnlink = [...originalVariants].flatMap(
    ([speakerId, variants]) => {
      const remaining = savedVariants.get(speakerId);
      return remaining
        ? unlinkableFields
            .filter((field) => variants.has(field) && !remaining.has(field))
            .map((field) => ({ speakerId, field }))
        : [];
    },
  );
  const removals = {
    speakersToRemove,
    ...(speakersToUnlink.length > 0 ? { speakersToUnlink } : {}),
  };

  if (!isPastEvent) {
    return removals;
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

  return { ...removals, preliminaryDataShared };
};
