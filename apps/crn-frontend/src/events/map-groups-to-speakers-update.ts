import {
  EventSpeakerAddItem,
  EventSpeakerUnlinkItem,
  EventUpdateDetailsRequest,
} from '@asap-hub/model';
import {
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
} from '@asap-hub/react-components';

type SpeakerRow = SpeakerGroupUser | SpeakerGroupExternalUser;

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

const isNewSpeaker = ({ speakerIds = [] }: SpeakerRow) =>
  speakerIds.length === 0;

const isExternalSpeaker = (group: SpeakerGroup, user: SpeakerRow) =>
  group.variant === 'external' || ('isExternal' in user && !!user.isExternal);

const toSpeakerIdentity = (group: SpeakerGroup, user: SpeakerRow) => {
  if (!isExternalSpeaker(group, user)) {
    return { userId: user.id };
  }
  return user.externalAuthorId
    ? { externalAuthorId: user.externalAuthorId }
    : { externalAuthorName: user.displayName };
};

const toAffiliation = (group: SpeakerGroup) =>
  ({
    team: { teamId: group.id },
    project: { projectId: group.id },
    external: {},
  })[group.variant];

const collectSpeakersToAdd = (
  groups: SpeakerGroup[],
  isPastEvent: boolean,
): EventSpeakerAddItem[] =>
  groups.flatMap((group) =>
    group.users.filter(isNewSpeaker).map((user) => ({
      ...toSpeakerIdentity(group, user),
      ...toAffiliation(group),
      ...(isPastEvent && {
        preliminaryDataShared: user.preliminaryFindingsShared,
      }),
    })),
  );

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
  const speakersToAdd = collectSpeakersToAdd(saved, isPastEvent);
  const speakerChanges = {
    speakersToRemove,
    ...(speakersToUnlink.length > 0 ? { speakersToUnlink } : {}),
    ...(speakersToAdd.length > 0 ? { speakersToAdd } : {}),
  };

  if (!isPastEvent) {
    return speakerChanges;
  }

  const preliminaryDataShared = saved.flatMap((group) =>
    group.users.flatMap((user) =>
      (user.speakerIds ?? []).map((speakerId) => ({
        speakerId,
        shared: user.preliminaryFindingsShared,
      })),
    ),
  );

  return { ...speakerChanges, preliminaryDataShared };
};
