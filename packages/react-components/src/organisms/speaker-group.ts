import { EventTeamType } from './shared-event-card';

// Shared speaker data shape consumed by both the read-only EventSpeakers card
// and the editable EditEventSpeakersModal, so a single state can flow into
// both and the modal's onSave can write straight back — no adapter needed.

export type SpeakerGroupUser = {
  readonly id: string;
  // Contentful eventSpeakers entry ids backing this displayed speaker (one
  // user can map to several entries via merged roles). Used to delete by exact
  // id; optional so manually-built groups (stories/tests) can omit it.
  readonly speakerIds?: string[];
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly roles: string[];
  readonly isAlumni?: boolean;
};

export type SpeakerGroupExternalUser = {
  readonly id: string;
  readonly speakerIds?: string[];
  readonly displayName: string;
};

export type SpeakerGroup =
  | {
      readonly id: string;
      readonly variant: 'team';
      readonly teamName: string;
      readonly teamType?: EventTeamType;
      readonly isTeamInactive?: boolean;
      readonly preliminaryFindingsShared: boolean;
      readonly users: SpeakerGroupUser[];
    }
  | {
      readonly id: 'external';
      readonly variant: 'external';
      readonly preliminaryFindingsShared: boolean;
      readonly users: SpeakerGroupExternalUser[];
    };

export type SpeakerTeamGroup = Extract<SpeakerGroup, { variant: 'team' }>;
export type SpeakerExternalGroup = Extract<
  SpeakerGroup,
  { variant: 'external' }
>;
