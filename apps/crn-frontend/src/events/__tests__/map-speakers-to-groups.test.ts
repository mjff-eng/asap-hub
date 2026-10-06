import { EventResponse, EventSpeaker } from '@asap-hub/model';
import { createEventResponse } from '@asap-hub/fixtures';

import { mapSpeakersToGroups } from '../map-speakers-to-groups';

const makeEvent = (speakers: EventSpeaker[]): EventResponse => ({
  ...createEventResponse(),
  speakers,
});

const teamSpeaker = (
  teamId: string,
  teamName: string,
  userId: string,
  role: string,
  extra: Partial<{
    avatarUrl: string;
    alumniSinceDate: string;
    inactiveSince: string;
    displayName: string;
    speakerId: string;
    preliminaryDataShared: boolean;
  }> = {},
): EventSpeaker => ({
  id: extra.speakerId ?? `es-${teamId}-${userId}-${role}`,
  team: {
    id: teamId,
    displayName: teamName,
    inactiveSince: extra.inactiveSince,
  },
  user: {
    id: userId,
    displayName: extra.displayName ?? `User ${userId}`,
    avatarUrl: extra.avatarUrl,
    alumniSinceDate: extra.alumniSinceDate,
  },
  role,
  preliminaryDataShared: extra.preliminaryDataShared,
});

const projectSpeaker = (
  projectId: string,
  projectTitle: string,
  userId: string,
  role: string,
  extra: Partial<{ preliminaryDataShared: boolean }> = {},
): EventSpeaker => ({
  id: `es-${projectId}-${userId}`,
  project: {
    id: projectId,
    title: projectTitle,
    projectType: 'Trainee Project',
  },
  user: { id: userId, displayName: `User ${userId}` },
  role,
  preliminaryDataShared: extra.preliminaryDataShared,
});

describe('mapSpeakersToGroups', () => {
  it('groups team speakers by team and maps user fields', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair', {
          avatarUrl: 'https://example.com/a.png',
          alumniSinceDate: '2020-01-01',
        }),
      ]),
    );

    expect(groups).toEqual([
      {
        id: 't1',
        variant: 'team',
        teamName: 'Alpha',
        isTeamInactive: false,
        users: [
          {
            id: 'u1',
            speakerIds: ['es-t1-u1-Chair'],
            displayName: 'User u1',
            avatarUrl: 'https://example.com/a.png',
            isAlumni: true,
            roles: ['Chair'],
            preliminaryFindingsShared: false,
          },
        ],
      },
    ]);
  });

  it('accumulates every eventSpeakers entry id for a user merged across roles', () => {
    const [group] = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair', { speakerId: 'es-1' }),
        teamSpeaker('t1', 'Alpha', 'u1', 'Speaker', { speakerId: 'es-2' }),
      ]),
    );

    expect(group).toMatchObject({
      users: [{ id: 'u1', speakerIds: ['es-1', 'es-2'] }],
    });
  });

  it('marks a team as inactive when the team has an inactiveSince date', () => {
    const [group] = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair', {
          inactiveSince: '2022-10-24T11:00:00Z',
        }),
      ]),
    );

    expect(group).toMatchObject({ isTeamInactive: true });
  });

  it('merges multiple roles for the same user within a team and dedupes them', () => {
    const [group] = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair'),
        teamSpeaker('t1', 'Alpha', 'u1', 'Speaker'),
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair'),
      ]),
    );

    expect(group).toMatchObject({
      users: [{ id: 'u1', roles: ['Chair', 'Speaker'] }],
    });
  });

  it('flags each user from their own speaker preliminaryDataShared', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair', {
          preliminaryDataShared: true,
        }),
        teamSpeaker('t1', 'Alpha', 'u2', 'Speaker', {
          preliminaryDataShared: false,
        }),
        teamSpeaker('t2', 'Bravo', 'u3', 'Chair'),
      ]),
    );

    const sharedByUserId = Object.fromEntries(
      groups.flatMap(({ users }) =>
        users.map(({ id, preliminaryFindingsShared }) => [
          id,
          preliminaryFindingsShared,
        ]),
      ),
    );

    expect(sharedByUserId).toEqual({ u1: true, u2: false, u3: false });
  });

  it('keeps preliminaryFindingsShared when a user merged across roles shared in any entry', () => {
    const [group] = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair', {
          preliminaryDataShared: false,
        }),
        teamSpeaker('t1', 'Alpha', 'u1', 'Speaker', {
          preliminaryDataShared: true,
        }),
      ]),
    );

    expect(group).toMatchObject({
      users: [{ id: 'u1', preliminaryFindingsShared: true }],
    });
  });

  it('keeps every speaker of a team in its team group', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair'),
        teamSpeaker('t1', 'Alpha', 'u2', 'Speaker'),
      ]),
    );

    expect(groups).toEqual([
      expect.objectContaining({
        variant: 'team',
        users: [
          expect.objectContaining({ id: 'u1' }),
          expect.objectContaining({ id: 'u2' }),
        ],
      }),
    ]);
  });

  it('orders groups with a shared speaker first, then alphabetically', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t-charlie', 'Charlie', 'u1', 'Chair', {
          preliminaryDataShared: true,
        }),
        teamSpeaker('t-alpha', 'Alpha', 'u2', 'Chair', {
          preliminaryDataShared: false,
        }),
        teamSpeaker('t-bravo', 'Bravo', 'u3', 'Chair', {
          preliminaryDataShared: true,
        }),
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      't-bravo',
      't-charlie',
      't-alpha',
    ]);
  });

  it('sorts a team first when any of its speakers shared preliminary data', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t-alpha', 'Alpha', 'u0', 'Chair', {
          preliminaryDataShared: false,
        }),
        teamSpeaker('t1', 'Zulu', 'u1', 'Chair', {
          preliminaryDataShared: false,
        }),
        teamSpeaker('t1', 'Zulu', 'u2', 'Speaker', {
          preliminaryDataShared: true,
        }),
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual(['t1', 't-alpha']);
  });

  it('collects external speakers into a single trailing external group', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair'),
        { id: 'es-ext-1', externalUser: { name: 'Jane External' } },
        { id: 'es-ext-2', externalUser: { name: 'John External' } },
      ]),
    );

    expect(groups[groups.length - 1]).toEqual({
      id: 'external',
      variant: 'external',
      users: [
        {
          id: 'external-1',
          speakerIds: ['es-ext-1'],
          displayName: 'Jane External',
          preliminaryFindingsShared: false,
        },
        {
          id: 'external-2',
          speakerIds: ['es-ext-2'],
          displayName: 'John External',
          preliminaryFindingsShared: false,
        },
      ],
    });
  });

  it('groups project speakers by project after the team groups', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        projectSpeaker('p1', 'Zeta Project', 'u2', 'Independent Project - Lead'),
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair'),
      ]),
    );

    expect(groups).toEqual([
      expect.objectContaining({ id: 't1', variant: 'team' }),
      {
        id: 'p1',
        variant: 'project',
        projectName: 'Zeta Project',
        projectType: 'Trainee Project',
        users: [
          {
            id: 'u2',
            speakerIds: ['es-p1-u2'],
            displayName: 'User u2',
            avatarUrl: undefined,
            isAlumni: false,
            roles: ['Independent Project - Lead'],
            preliminaryFindingsShared: false,
          },
        ],
      },
    ]);
  });

  it('lists a speaker under both their team and their individual project', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Lead PI'),
        projectSpeaker('p1', 'Project One', 'u1', 'Independent Project - Mentor'),
      ]),
    );

    expect(groups).toEqual([
      expect.objectContaining({
        id: 't1',
        users: [expect.objectContaining({ id: 'u1', roles: ['Lead PI'] })],
      }),
      expect.objectContaining({
        id: 'p1',
        users: [
          expect.objectContaining({
            id: 'u1',
            roles: ['Independent Project - Mentor'],
          }),
        ],
      }),
    ]);
  });

  it('sorts project groups with a shared speaker first, then alphabetically', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        projectSpeaker('p-b', 'Beta', 'u1', 'Lead'),
        projectSpeaker('p-a', 'Alpha', 'u2', 'Lead'),
        projectSpeaker('p-z', 'Zulu', 'u3', 'Lead', {
          preliminaryDataShared: true,
        }),
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual(['p-z', 'p-a', 'p-b']);
  });

  it('nests an external speaker inside the team or project they represent', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair'),
        {
          id: 'es-ext-1',
          externalUser: { name: 'Jane External' },
          team: { id: 't1', displayName: 'Alpha' },
        },
        {
          id: 'es-ext-2',
          externalUser: { name: 'John External' },
          project: { id: 'p1', title: 'Project One' },
        },
      ]),
    );

    expect(groups).toEqual([
      expect.objectContaining({
        id: 't1',
        users: [
          expect.objectContaining({ id: 'u1' }),
          {
            id: 'external-1',
            speakerIds: ['es-ext-1'],
            displayName: 'Jane External',
            roles: [],
            isExternal: true,
            preliminaryFindingsShared: false,
          },
        ],
      }),
      expect.objectContaining({
        id: 'p1',
        variant: 'project',
        projectName: 'Project One',
        users: [
          expect.objectContaining({ id: 'external-2', isExternal: true }),
        ],
      }),
    ]);
  });

  it('nests an external speaker linked to a team and a project in both groups', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        {
          id: 'es-ext-1',
          externalUser: { name: 'Jane External' },
          team: { id: 't1', displayName: 'Alpha' },
          project: { id: 'p1', title: 'Project One' },
        },
      ]),
    );

    expect(groups.map((group) => [group.id, group.users.length])).toEqual([
      ['t1', 1],
      ['p1', 1],
    ]);
  });

  it('omits team-only entries and users without a team', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        { team: { id: 't1', displayName: 'Alpha' } },
        { user: { id: 'u1', displayName: 'Loner' } },
      ]),
    );

    expect(groups).toEqual([]);
  });

  it('yields an empty roles array when the speaker has no role', () => {
    const [group] = mapSpeakersToGroups(
      makeEvent([teamSpeaker('t1', 'Alpha', 'u1', '')]),
    );

    expect(group).toMatchObject({ users: [{ id: 'u1', roles: [] }] });
  });

  it('returns an empty array when there are no speakers', () => {
    expect(mapSpeakersToGroups(makeEvent([]))).toEqual([]);
  });
});
