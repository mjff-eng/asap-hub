import {
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
  SpeakerTeamGroup,
} from '@asap-hub/react-components';

import { mapGroupsToSpeakersUpdate } from '../map-groups-to-speakers-update';

const speaker = (
  overrides: Partial<SpeakerGroupUser> = {},
): SpeakerGroupUser => ({
  id: 'user-1',
  speakerIds: ['speaker-1'],
  displayName: 'User One',
  roles: ['Lead'],
  preliminaryFindingsShared: false,
  ...overrides,
});

const teamGroup = (
  overrides: Partial<SpeakerTeamGroup> = {},
): SpeakerGroup => ({
  id: 'team-1',
  variant: 'team',
  teamName: 'Team One',
  users: [speaker()],
  ...overrides,
});

const externalGroup = (users: SpeakerGroupExternalUser[]): SpeakerGroup => ({
  id: 'external',
  variant: 'external',
  users,
});

describe('mapGroupsToSpeakersUpdate', () => {
  test('Should mark removed CRN speaker entry ids in speakersToRemove', () => {
    const original = [teamGroup()];
    const saved = [teamGroup({ users: [] })];

    expect(
      mapGroupsToSpeakersUpdate(original, saved, true).speakersToRemove,
    ).toEqual(['speaker-1']);
  });

  test('Should remove every entry id a merged multi-role user maps to', () => {
    const original = [
      teamGroup({
        users: [
          speaker({
            speakerIds: ['speaker-1', 'speaker-2'],
            roles: ['Lead', 'Co-PI'],
          }),
        ],
      }),
    ];
    const saved = [teamGroup({ users: [] })];

    expect(
      mapGroupsToSpeakersUpdate(original, saved, true).speakersToRemove,
    ).toEqual(['speaker-1', 'speaker-2']);
  });

  test('Should mark removed external speaker entry ids', () => {
    const original = [
      externalGroup([
        {
          id: 'external-0',
          speakerIds: ['ext-1'],
          displayName: 'Jane',
          preliminaryFindingsShared: false,
        },
      ]),
    ];
    const saved = [externalGroup([])];

    expect(
      mapGroupsToSpeakersUpdate(original, saved, true).speakersToRemove,
    ).toEqual(['ext-1']);
  });

  test('Should not mark anything for removal when nothing was removed', () => {
    const groups = [teamGroup()];

    expect(
      mapGroupsToSpeakersUpdate(groups, groups, true).speakersToRemove,
    ).toEqual([]);
  });

  test('Should mark a team as shared when exactly one of its speakers shared', () => {
    const saved = [
      teamGroup({
        users: [
          speaker({ id: 'user-1', preliminaryFindingsShared: false }),
          speaker({ id: 'user-2', preliminaryFindingsShared: true }),
        ],
      }),
      externalGroup([
        {
          id: 'external-0',
          speakerIds: ['ext-1'],
          displayName: 'Jane',
          preliminaryFindingsShared: true,
        },
      ]),
    ];

    expect(
      mapGroupsToSpeakersUpdate(saved, saved, true).preliminaryDataShared,
    ).toEqual([{ teamId: 'team-1', shared: true }]);
  });

  test('Should mark a team as not shared when none of its speakers shared', () => {
    const saved = [
      teamGroup({
        users: [
          speaker({ id: 'user-1' }),
          speaker({ id: 'user-2', preliminaryFindingsShared: false }),
        ],
      }),
    ];

    expect(
      mapGroupsToSpeakersUpdate(saved, saved, true).preliminaryDataShared,
    ).toEqual([{ teamId: 'team-1', shared: false }]);
  });

  test('Should exclude project groups from preliminary findings', () => {
    const saved: SpeakerGroup[] = [
      teamGroup(),
      {
        id: 'project-1',
        variant: 'project',
        projectName: 'Project One',
        users: [speaker({ id: 'user-2', preliminaryFindingsShared: true })],
      },
    ];

    expect(
      mapGroupsToSpeakersUpdate(saved, saved, true).preliminaryDataShared,
    ).toEqual([{ teamId: 'team-1', shared: false }]);
  });

  test('Should omit preliminary findings for an upcoming event', () => {
    const saved = [
      teamGroup({ users: [speaker({ preliminaryFindingsShared: true })] }),
    ];

    expect(mapGroupsToSpeakersUpdate(saved, saved, false)).not.toHaveProperty(
      'preliminaryDataShared',
    );
  });

  test('Should tolerate users without speakerIds', () => {
    const original = [
      teamGroup({ users: [speaker({ speakerIds: undefined })] }),
    ];

    expect(
      mapGroupsToSpeakersUpdate(original, original, true).speakersToRemove,
    ).toEqual([]);
  });
});
