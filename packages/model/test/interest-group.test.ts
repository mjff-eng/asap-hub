import { getInterestGroupTeamIdsForEvent } from '../src';

describe('getInterestGroupTeamIdsForEvent', () => {
  const eventEndDate = '2025-10-01T09:00:00.000Z';

  test('includes a team whose membership started before the event ends and has no end date', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [{ teamId: 'team-1', startDate: '2025-01-01T00:00:00.000Z' }],
        eventEndDate,
      ),
    ).toEqual(['team-1']);
  });

  test('includes a team whose membership started during the event', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [{ teamId: 'team-1', startDate: '2025-10-01T00:00:00.000Z' }],
        eventEndDate,
      ),
    ).toEqual(['team-1']);
  });

  test('excludes a team whose membership starts when the event ends', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [{ teamId: 'team-1', startDate: eventEndDate }],
        eventEndDate,
      ),
    ).toEqual([]);
  });

  test('excludes a team whose membership starts after the event ends', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [{ teamId: 'team-1', startDate: '2025-10-02T00:00:00.000Z' }],
        eventEndDate,
      ),
    ).toEqual([]);
  });

  test('includes a team whose membership ends when the event ends', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [
          {
            teamId: 'team-1',
            startDate: '2025-01-01T00:00:00.000Z',
            endDate: eventEndDate,
          },
        ],
        eventEndDate,
      ),
    ).toEqual(['team-1']);
  });

  test('includes a team whose membership ends after the event ends', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [
          {
            teamId: 'team-1',
            startDate: '2025-01-01T00:00:00.000Z',
            endDate: '2025-12-01T00:00:00.000Z',
          },
        ],
        eventEndDate,
      ),
    ).toEqual(['team-1']);
  });

  test('excludes a team whose membership ends before the event ends', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [
          {
            teamId: 'team-1',
            startDate: '2025-01-01T00:00:00.000Z',
            endDate: '2025-10-01T08:59:00.000Z',
          },
        ],
        eventEndDate,
      ),
    ).toEqual([]);
  });

  test('treats a null end date as no end date', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [
          {
            teamId: 'team-1',
            startDate: '2025-01-01T00:00:00.000Z',
            endDate: null,
          },
        ],
        eventEndDate,
      ),
    ).toEqual(['team-1']);
  });

  test('excludes a team that became inactive before the event ends', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [
          {
            teamId: 'team-1',
            startDate: '2025-01-01T00:00:00.000Z',
            inactiveSince: '2025-10-01T08:59:00.000Z',
          },
        ],
        eventEndDate,
      ),
    ).toEqual([]);
  });

  test('includes a team that became inactive when the event ends', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [
          {
            teamId: 'team-1',
            startDate: '2025-01-01T00:00:00.000Z',
            inactiveSince: eventEndDate,
          },
        ],
        eventEndDate,
      ),
    ).toEqual(['team-1']);
  });

  test('includes a team that became inactive after the event ends', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [
          {
            teamId: 'team-1',
            startDate: '2025-01-01T00:00:00.000Z',
            inactiveSince: '2025-12-01T00:00:00.000Z',
          },
        ],
        eventEndDate,
      ),
    ).toEqual(['team-1']);
  });

  test('excludes an inactive team even when its membership has no end date', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [
          {
            teamId: 'team-1',
            startDate: '2025-01-01T00:00:00.000Z',
            endDate: null,
            inactiveSince: '2025-06-01T00:00:00.000Z',
          },
        ],
        eventEndDate,
      ),
    ).toEqual([]);
  });

  test('returns each team once when it has more than one matching membership', () => {
    expect(
      getInterestGroupTeamIdsForEvent(
        [
          { teamId: 'team-1', startDate: '2025-01-01T00:00:00.000Z' },
          { teamId: 'team-1', startDate: '2025-02-01T00:00:00.000Z' },
          { teamId: 'team-2', startDate: '2025-01-01T00:00:00.000Z' },
        ],
        eventEndDate,
      ),
    ).toEqual(['team-1', 'team-2']);
  });

  test('returns an empty list when there are no memberships', () => {
    expect(getInterestGroupTeamIdsForEvent([], eventEndDate)).toEqual([]);
  });
});
