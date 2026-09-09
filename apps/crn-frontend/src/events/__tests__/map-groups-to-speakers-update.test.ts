import { SpeakerGroup } from '@asap-hub/react-components';

import { mapGroupsToSpeakersUpdate } from '../map-groups-to-speakers-update';

const teamGroup = (
  overrides: Partial<Extract<SpeakerGroup, { variant: 'team' }>> = {},
): SpeakerGroup => ({
  id: 'team-1',
  variant: 'team',
  teamName: 'Team One',
  preliminaryFindingsShared: false,
  users: [
    { id: 'user-1', speakerIds: ['speaker-1'], displayName: 'User One', roles: ['Lead'] },
  ],
  ...overrides,
});

const externalGroup = (
  users: Array<{ id: string; speakerIds?: string[]; displayName: string }>,
): SpeakerGroup => ({
  id: 'external',
  variant: 'external',
  preliminaryFindingsShared: false,
  users,
});

describe('mapGroupsToSpeakersUpdate', () => {
  test('Should mark removed CRN speaker entry ids in speakersToRemove', () => {
    const original = [teamGroup()];
    const saved = [teamGroup({ users: [] })];

    expect(mapGroupsToSpeakersUpdate(original, saved).speakersToRemove).toEqual([
      'speaker-1',
    ]);
  });

  test('Should remove every entry id a merged multi-role user maps to', () => {
    const original = [
      teamGroup({
        users: [
          {
            id: 'user-1',
            speakerIds: ['speaker-1', 'speaker-2'],
            displayName: 'User One',
            roles: ['Lead', 'Co-PI'],
          },
        ],
      }),
    ];
    const saved = [teamGroup({ users: [] })];

    expect(mapGroupsToSpeakersUpdate(original, saved).speakersToRemove).toEqual([
      'speaker-1',
      'speaker-2',
    ]);
  });

  test('Should mark removed external speaker entry ids', () => {
    const original = [
      externalGroup([
        { id: 'external-0', speakerIds: ['ext-1'], displayName: 'Jane' },
      ]),
    ];
    const saved = [externalGroup([])];

    expect(mapGroupsToSpeakersUpdate(original, saved).speakersToRemove).toEqual([
      'ext-1',
    ]);
  });

  test('Should not mark anything for removal when nothing was removed', () => {
    const groups = [teamGroup()];

    expect(mapGroupsToSpeakersUpdate(groups, groups).speakersToRemove).toEqual(
      [],
    );
  });

  test('Should map preliminary findings per team, excluding the external group', () => {
    const saved = [
      teamGroup({ preliminaryFindingsShared: true }),
      externalGroup([
        { id: 'external-0', speakerIds: ['ext-1'], displayName: 'Jane' },
      ]),
    ];

    expect(
      mapGroupsToSpeakersUpdate(saved, saved).preliminaryDataShared,
    ).toEqual([{ teamId: 'team-1', shared: true }]);
  });

  test('Should tolerate users without speakerIds', () => {
    const original = [
      teamGroup({
        users: [{ id: 'user-1', displayName: 'User One', roles: ['Lead'] }],
      }),
    ];

    expect(mapGroupsToSpeakersUpdate(original, original).speakersToRemove).toEqual(
      [],
    );
  });
});
