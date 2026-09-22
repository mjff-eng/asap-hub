import { EventResponse, EventSpeaker } from '@asap-hub/model';
import { createEventResponse } from '@asap-hub/fixtures';

import { mapSpeakersToGroups } from '../map-speakers-to-groups';

const makeEvent = (
  speakers: EventSpeaker[],
  preliminaryDataShared?: EventResponse['preliminaryDataShared'],
): EventResponse => ({
  ...createEventResponse(),
  speakers,
  ...(preliminaryDataShared ? { preliminaryDataShared } : {}),
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

  it('seeds every member of a shared team with preliminaryFindingsShared', () => {
    const groups = mapSpeakersToGroups(
      makeEvent(
        [
          teamSpeaker('t1', 'Alpha', 'u1', 'Chair'),
          teamSpeaker('t1', 'Alpha', 'u2', 'Speaker'),
          teamSpeaker('t2', 'Bravo', 'u3', 'Chair'),
        ],
        [
          { team: { id: 't1' }, shared: true },
          { team: { id: 't2' }, shared: false },
        ],
      ),
    );

    const sharedByUserId = Object.fromEntries(
      groups.flatMap(({ users }) =>
        users.map(({ id, preliminaryFindingsShared }) => [
          id,
          preliminaryFindingsShared,
        ]),
      ),
    );

    expect(sharedByUserId).toEqual({ u1: true, u2: true, u3: false });
  });

  it('synthesises a project group for a team with more than one speaker', () => {
    const groups = mapSpeakersToGroups(
      makeEvent([
        teamSpeaker('t1', 'Alpha', 'u1', 'Chair'),
        teamSpeaker('t1', 'Alpha', 'u2', 'Speaker'),
      ]),
    );

    expect(groups).toContainEqual(
      expect.objectContaining({
        variant: 'project',
        projectName: 'Alpha Project',
        users: [expect.objectContaining({ id: 'u2' })],
      }),
    );
    expect(groups).toContainEqual(
      expect.objectContaining({
        variant: 'team',
        users: [expect.objectContaining({ id: 'u1' })],
      }),
    );
  });

  it('orders groups with a shared speaker first, then alphabetically', () => {
    const groups = mapSpeakersToGroups(
      makeEvent(
        [
          teamSpeaker('t-charlie', 'Charlie', 'u1', 'Chair'),
          teamSpeaker('t-alpha', 'Alpha', 'u2', 'Chair'),
          teamSpeaker('t-bravo', 'Bravo', 'u3', 'Chair'),
        ],
        [
          { team: { id: 't-charlie' }, shared: true },
          { team: { id: 't-alpha' }, shared: false },
          { team: { id: 't-bravo' }, shared: true },
        ],
      ),
    );

    expect(groups.map((group) => group.id)).toEqual([
      't-bravo',
      't-charlie',
      't-alpha',
    ]);
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
