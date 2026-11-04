import {
  SpeakerGroup,
  SpeakerGroupExternalUser,
  SpeakerGroupUser,
  SpeakerProjectGroup,
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

const projectSpeakerGroup = (
  overrides: Partial<SpeakerProjectGroup> = {},
): SpeakerGroup => ({
  id: 'project-1',
  variant: 'project',
  projectName: 'Project One',
  users: [],
  ...overrides,
});

const externalGroup = (users: SpeakerGroupExternalUser[]): SpeakerGroup => ({
  id: 'external',
  variant: 'external',
  users,
});

const newSpeaker = (overrides: Partial<SpeakerGroupUser> = {}) =>
  speaker({
    id: 'user-2',
    speakerIds: [],
    displayName: 'User Two',
    ...overrides,
  });

const newGuest = (
  overrides: Partial<SpeakerGroupExternalUser> = {},
): SpeakerGroupExternalUser => ({
  id: 'external-1-Guest',
  speakerIds: [],
  displayName: 'Guest',
  preliminaryFindingsShared: false,
  ...overrides,
});

describe('mapGroupsToSpeakersUpdate', () => {
  describe('speakersToAdd', () => {
    test('Should add CRN users with the team or project they were added to', () => {
      const original = [teamGroup()];
      const saved = [
        teamGroup({ users: [speaker(), newSpeaker()] }),
        projectSpeakerGroup({ users: [newSpeaker({ id: 'user-3' })] }),
      ];

      expect(
        mapGroupsToSpeakersUpdate(original, saved, false).speakersToAdd,
      ).toEqual([
        { userId: 'user-2', teamId: 'team-1' },
        { userId: 'user-3', projectId: 'project-1' },
      ]);
    });

    test('Should add external speakers by external author id or by name', () => {
      const saved = [
        teamGroup({
          users: [
            newSpeaker({
              id: 'external-1-Riley',
              displayName: 'Riley Stone',
              isExternal: true,
              externalAuthorId: 'external-author-1',
            }),
          ],
        }),
        projectSpeakerGroup({
          users: [
            newSpeaker({
              id: 'external-2-Sam',
              displayName: 'Sam Rivera',
              isExternal: true,
            }),
          ],
        }),
        externalGroup([
          newGuest({ externalAuthorId: 'external-author-2' }),
          newGuest({ id: 'external-3-Guest' }),
        ]),
      ];

      expect(mapGroupsToSpeakersUpdate([], saved, false).speakersToAdd).toEqual(
        [
          { externalAuthorId: 'external-author-1', teamId: 'team-1' },
          { externalAuthorName: 'Sam Rivera', projectId: 'project-1' },
          { externalAuthorId: 'external-author-2' },
          { externalAuthorName: 'Guest' },
        ],
      );
    });

    test('Should send the preliminary findings of new speakers on a past event', () => {
      const saved = [
        teamGroup({
          users: [speaker(), newSpeaker({ preliminaryFindingsShared: true })],
        }),
        externalGroup([newGuest()]),
      ];

      expect(
        mapGroupsToSpeakersUpdate([teamGroup()], saved, true).speakersToAdd,
      ).toEqual([
        { userId: 'user-2', teamId: 'team-1', preliminaryDataShared: true },
        { externalAuthorName: 'Guest', preliminaryDataShared: false },
      ]);
    });

    test('Should not send speakersToAdd when no speaker was added', () => {
      const groups = [teamGroup()];

      expect(
        mapGroupsToSpeakersUpdate(groups, groups, true),
      ).not.toHaveProperty('speakersToAdd');
    });
  });

  test('Should leave a speaker added in this session out of preliminaryDataShared', () => {
    const groups = [
      teamGroup({
        users: [
          speaker({ preliminaryFindingsShared: false }),
          speaker({
            id: 'external-1-Guest',
            speakerIds: [],
            displayName: 'Guest',
            roles: [],
            isExternal: true,
            preliminaryFindingsShared: true,
          }),
        ],
      }),
    ];

    expect(
      mapGroupsToSpeakersUpdate(groups, groups, true).preliminaryDataShared,
    ).toEqual([{ speakerId: 'speaker-1', shared: false }]);
  });

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

  test('Should only send removed project and affiliated external speakers for an upcoming event', () => {
    const projectGroup = (users: SpeakerGroupUser[]): SpeakerGroup => ({
      id: 'project-1',
      variant: 'project',
      projectName: 'Project One',
      users,
    });
    const projectUser = speaker({ id: 'user-2', speakerIds: ['speaker-2'] });
    const affiliatedExternal = speaker({
      id: 'external-3',
      speakerIds: ['speaker-3'],
      roles: [],
      isExternal: true,
    });
    const original = [projectGroup([projectUser, affiliatedExternal])];
    const saved = [projectGroup([])];

    expect(mapGroupsToSpeakersUpdate(original, saved, false)).toEqual({
      speakersToRemove: ['speaker-2', 'speaker-3'],
    });
  });

  describe('a speaker entry listed under a team and a project', () => {
    const projectGroup = (users: SpeakerGroupUser[]): SpeakerGroup => ({
      id: 'project-1',
      variant: 'project',
      projectName: 'Project One',
      users,
    });
    const original = [
      teamGroup(),
      projectGroup([speaker({ roles: ['Lead PI'] })]),
    ];

    test('Should only unlink the project when removed from the project', () => {
      const saved = [teamGroup(), projectGroup([])];

      expect(mapGroupsToSpeakersUpdate(original, saved, false)).toEqual({
        speakersToRemove: [],
        speakersToUnlink: [{ speakerId: 'speaker-1', field: 'project' }],
      });
    });

    test('Should only unlink the team when removed from the team', () => {
      const saved = [
        teamGroup({ users: [] }),
        projectGroup([speaker({ roles: ['Lead PI'] })]),
      ];

      expect(mapGroupsToSpeakersUpdate(original, saved, true)).toMatchObject({
        speakersToRemove: [],
        speakersToUnlink: [{ speakerId: 'speaker-1', field: 'team' }],
      });
    });

    test('Should remove the entry when removed from both', () => {
      const saved = [teamGroup({ users: [] }), projectGroup([])];

      expect(mapGroupsToSpeakersUpdate(original, saved, false)).toEqual({
        speakersToRemove: ['speaker-1'],
      });
    });

    test('Should unlink an affiliated external speaker the same way', () => {
      const external = speaker({
        id: 'external-3',
        speakerIds: ['speaker-3'],
        roles: [],
        isExternal: true,
      });
      const withExternal = [
        teamGroup({ users: [external] }),
        projectGroup([external]),
      ];
      const saved = [teamGroup({ users: [] }), projectGroup([external])];

      expect(mapGroupsToSpeakersUpdate(withExternal, saved, false)).toEqual({
        speakersToRemove: [],
        speakersToUnlink: [{ speakerId: 'speaker-3', field: 'team' }],
      });
    });
  });

  test('Should not mark anything for removal when nothing was removed', () => {
    const groups = [teamGroup()];

    expect(
      mapGroupsToSpeakersUpdate(groups, groups, true).speakersToRemove,
    ).toEqual([]);
  });

  test("Should emit one item per speaker entry, external ones included, carrying that user's own flag", () => {
    const saved = [
      teamGroup({
        users: [
          speaker({
            id: 'user-1',
            speakerIds: ['speaker-1'],
            preliminaryFindingsShared: false,
          }),
          speaker({
            id: 'user-2',
            speakerIds: ['speaker-2'],
            preliminaryFindingsShared: true,
          }),
          speaker({
            id: 'external-3',
            speakerIds: ['speaker-3'],
            roles: [],
            isExternal: true,
            preliminaryFindingsShared: true,
          }),
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
    ).toEqual([
      { speakerId: 'speaker-1', shared: false },
      { speakerId: 'speaker-2', shared: true },
      { speakerId: 'speaker-3', shared: true },
      { speakerId: 'ext-1', shared: true },
    ]);
  });

  test('Should repeat the flag on every entry id of a merged multi-role user', () => {
    const saved = [
      teamGroup({
        users: [
          speaker({
            speakerIds: ['speaker-1', 'speaker-2'],
            roles: ['Lead', 'Co-PI'],
            preliminaryFindingsShared: true,
          }),
        ],
      }),
    ];

    expect(
      mapGroupsToSpeakersUpdate(saved, saved, true).preliminaryDataShared,
    ).toEqual([
      { speakerId: 'speaker-1', shared: true },
      { speakerId: 'speaker-2', shared: true },
    ]);
  });

  test('Should include project groups in preliminary findings', () => {
    const saved: SpeakerGroup[] = [
      teamGroup(),
      {
        id: 'project-1',
        variant: 'project',
        projectName: 'Project One',
        users: [
          speaker({
            id: 'user-2',
            speakerIds: ['speaker-2'],
            preliminaryFindingsShared: true,
          }),
        ],
      },
    ];

    expect(
      mapGroupsToSpeakersUpdate(saved, saved, true).preliminaryDataShared,
    ).toEqual([
      { speakerId: 'speaker-1', shared: false },
      { speakerId: 'speaker-2', shared: true },
    ]);
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
