import { ProjectType } from '@asap-hub/model';

import { EventTeamType } from './shared-event-card';

// Shared speaker data shape consumed by both the read-only EventSpeakers card
// and the editable EditEventSpeakersModal, so a single state can flow into
// both and the modal's onSave can write straight back — no adapter needed.

export type SpeakerGroupUser = {
  readonly id: string;
  // eventSpeakers entry ids backing this speaker (one user can map to several
  // via merged roles), used to delete by exact id.
  readonly speakerIds?: string[];
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly roles: string[];
  readonly isAlumni?: boolean;
  // Matched no CRN user, so no profile to link to and no role to show.
  readonly isExternal?: boolean;
  readonly preliminaryFindingsShared: boolean;
};

export type SpeakerGroupExternalUser = {
  readonly id: string;
  readonly speakerIds?: string[];
  readonly displayName: string;
  readonly preliminaryFindingsShared: boolean;
};

export type SpeakerGroup =
  | {
      readonly id: string;
      readonly variant: 'team';
      readonly teamName: string;
      readonly teamType?: EventTeamType;
      readonly isTeamInactive?: boolean;
      readonly users: SpeakerGroupUser[];
    }
  | {
      readonly id: string;
      readonly variant: 'project';
      readonly projectName: string;
      readonly projectType?: ProjectType;
      readonly users: SpeakerGroupUser[];
    }
  | {
      readonly id: 'external';
      readonly variant: 'external';
      readonly users: SpeakerGroupExternalUser[];
    };

export type SpeakerTeamGroup = Extract<SpeakerGroup, { variant: 'team' }>;
export type SpeakerProjectGroup = Extract<SpeakerGroup, { variant: 'project' }>;
export type SpeakerExternalGroup = Extract<
  SpeakerGroup,
  { variant: 'external' }
>;

export const groupFindings = (group: {
  readonly users: ReadonlyArray<{
    readonly preliminaryFindingsShared: boolean;
  }>;
}) => {
  const shared = group.users.filter(
    ({ preliminaryFindingsShared }) => preliminaryFindingsShared,
  ).length;

  return { shared, total: group.users.length, hasAnyShared: shared > 0 };
};

export const groupLabel = (
  group: SpeakerTeamGroup | SpeakerProjectGroup,
): string => (group.variant === 'team' ? group.teamName : group.projectName);

export const sectionTitles = {
  team: 'From Team Projects',
  project: 'From Individual Projects',
  external: 'External',
} as const;

export const sectionNouns = {
  team: 'team',
  project: 'project',
  external: 'speaker',
} as const;

export const showMoreLabel = (hidden: number, noun: string) =>
  `Show ${hidden} more ${noun}${hidden === 1 ? '' : 's'}`;
