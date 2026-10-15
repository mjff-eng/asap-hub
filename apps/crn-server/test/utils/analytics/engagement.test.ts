import { getEngagementItems } from '../../../src/utils/analytics/engagement';
import {
  getEngagementQuery,
  makeEvent,
  makeUser,
} from '../../fixtures/analytics.fixtures';

const interestGroupCalendarIds = new Set(['interest-group-calendar-id']);

describe('getEngagementItems', () => {
  beforeAll(() => {
    jest.useFakeTimers();

    jest.setSystemTime(new Date('2024-07-14T03:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Events', () => {
    it('filters undefined events', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      const speakerItem1 =
        engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection!
          .items[0]!;

      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          speakerItem1,
          {
            user: makeUser({
              userId: 'user-1',
              teams: [{ id: 'team-id-0', role: 'Project Manager' }],
            }),
            linkedFrom: {
              eventsCollection: {
                items: [],
              },
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.eventCount).toEqual(1);
    });

    it('does not count the same event twice', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.eventCount).toEqual(2);
    });

    it('returns events that are not Cancelled', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      const speakerItem1 =
        engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection!
          .items[0]!;

      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          speakerItem1,
          {
            user: makeUser({
              userId: 'user-2',
              teams: [{ id: 'team-id-0', role: 'Key Personnel' }],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-2',
                endDate: '2024-05-15T10:00:00.000Z',
                status: 'Cancelled',
              }),
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.eventCount).toEqual(1);
    });

    it('only counts events that belong to an interest group calendar', () => {
      const user1 = makeUser({
        userId: 'user-1',
        teams: [{ id: 'team-id-0', role: 'Key Personnel' }],
      });

      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: user1,
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
          {
            user: user1,
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-2',
                endDate: '2024-06-11T13:00:00.000Z',
                calendar: { sys: { id: 'working-group-calendar-id' } },
              }),
            },
          },
          {
            user: user1,
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-3',
                endDate: '2024-06-11T13:00:00.000Z',
                calendar: null,
              }),
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]).toEqual(
        expect.objectContaining({
          eventCount: 1,
          totalSpeakerCount: 1,
          uniqueAllRolesCount: 1,
          uniqueKeyPersonnelCount: 1,
        }),
      );
    });

    it('returns the correct number of events', () => {
      const user1 = makeUser({
        userId: 'user-1',
        teams: [{ id: 'team-id-0', role: 'Project Manager' }],
      });

      const engagementQuery = getEngagementQuery().teamsCollection;
      const speakerItems =
        engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection!.items;
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          ...speakerItems,
          {
            user: user1,
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-3',
                endDate: '2024-05-15T10:00:00.000Z',
              }),
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.eventCount).toEqual(3);
    });
  });

  describe('Members', () => {
    it('only counts onboarded members', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.memberCount).toEqual(4);
    });

    it('does not count membership without role', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.teamMembershipCollection!.items[0]!.role =
        null;

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.memberCount).toEqual(3);
    });

    it('does not count membership equal to null', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.teamMembershipCollection!.items[0] =
        null;

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.memberCount).toEqual(3);
    });
  });

  describe('Total Speakers', () => {
    it('does not count external users', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: {
              __typename: 'ExternalAuthors',
            },
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.totalSpeakerCount).toEqual(0);
    });

    it('does not count user who does not belong to the team being analyzed', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.sys.id = 'team-analyzed-id';
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: makeUser({
              userId: 'user-1',
              teams: [
                { id: 'not-the-team-analyzed-id-1', role: 'Project Manager' },
                { id: 'not-the-team-analyzed-id-2', role: 'Key Personnel' },
              ],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.totalSpeakerCount).toEqual(0);
    });

    it('does not count user that is not onboarded', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: makeUser({ onboarded: false }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.totalSpeakerCount).toEqual(0);
    });

    it('returns the correct number of total speakers', () => {
      const user1 = makeUser({
        userId: 'user-1',
        teams: [{ id: 'team-id-0', role: 'Project Manager' }],
      });
      const user2 = makeUser({
        userId: 'user-2',
        teams: [{ id: 'team-id-0', role: 'Key Personnel' }],
      });
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: user1,
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
          {
            user: user2,
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
          {
            user: user1,
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-2',
                endDate: '2024-05-23T18:00:00.000Z',
              }),
            },
          },
          {
            user: user2,
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-3',
                endDate: '2024-05-15T10:00:00.000Z',
              }),
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.totalSpeakerCount).toEqual(4);
    });
  });

  describe('Unique Speakers', () => {
    it('does not count external users', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: {
              __typename: 'ExternalAuthors',
            },
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.uniqueAllRolesCount).toEqual(0);
      expect(result[0]!.uniqueKeyPersonnelCount).toEqual(0);
    });

    it('does not count user who does not belong to the team being analyzed', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.sys.id = 'team-analyzed-id';
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: makeUser({
              userId: 'user-1',
              teams: [
                { id: 'not-the-team-analyzed-id-1', role: 'Project Manager' },
                { id: 'not-the-team-analyzed-id-2', role: 'Key Personnel' },
              ],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.uniqueAllRolesCount).toEqual(0);
      expect(result[0]!.uniqueKeyPersonnelCount).toEqual(0);
    });

    it('returns uniqueKeyPersonnelCount as zero when none of the speakers is a Key Personnel in the team', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: makeUser({
              userId: 'user-1',
              teams: [
                { id: 'team-id-0', role: 'Project Manager' },
                { id: 'team-id-2', role: 'Key Personnel' },
              ],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
          {
            user: makeUser({
              userId: 'user-2',
              teams: [
                { id: 'team-id-0', role: 'ASAP Staff' },
                { id: 'team-id-2', role: 'Key Personnel' },
              ],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
          {
            user: makeUser({
              userId: 'user-3',
              teams: [
                { id: 'team-id-0', role: 'Collaborating PI' },
                { id: 'team-id-2', role: 'Key Personnel' },
              ],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-2',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
        ],
      };

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.uniqueAllRolesCount).toEqual(3);
      expect(result[0]!.uniqueKeyPersonnelCount).toEqual(0);
    });

    it('returns the correct number of unique speakers', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;

      const result = getEngagementItems(
        engagementQuery,
        interestGroupCalendarIds,
        'all',
      );

      expect(result[0]!.uniqueAllRolesCount).toEqual(2);
      expect(result[0]!.uniqueKeyPersonnelCount).toEqual(1);
    });
  });

  describe('Time range', () => {
    it('counts only events within last 30d', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: makeUser({
              userId: 'user-1',
              teams: [{ id: 'team-id-0', role: 'Project Manager' }],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
          {
            user: makeUser({
              userId: 'user-2',
              teams: [
                { id: 'team-id-0', role: 'Key Personnel' },
                { id: 'team-id-1', role: 'Collaborating PI' },
              ],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
          {
            user: makeUser({
              userId: 'user-1',
              teams: [{ id: 'team-id-0', role: 'Project Manager' }],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-2',
                endDate: '2024-06-15T13:00:00.000Z',
              }),
            },
          },
        ],
      };

      expect(
        getEngagementItems(engagementQuery, interestGroupCalendarIds, '30d'),
      ).toEqual([
        {
          id: 'team-id-0',
          inactiveSince: null,
          memberCount: 4,
          name: 'Team A',
          eventCount: 1,
          totalSpeakerCount: 1,
          uniqueAllRolesCount: 1,
          uniqueAllRolesCountPercentage: 25,
          uniqueKeyPersonnelCount: 0,
          uniqueKeyPersonnelCountPercentage: 0,
        },
      ]);
    });

    it('counts only events within current year', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: makeUser({
              userId: 'user-1',
              teams: [{ id: 'team-id-0', role: 'Key Personnel' }],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
          {
            user: makeUser({
              userId: 'user-2',
              teams: [{ id: 'team-id-0', role: 'ASAP Staff' }],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-2',
                endDate: '2023-06-15T13:00:00.000Z',
              }),
            },
          },
        ],
      };

      expect(
        getEngagementItems(
          engagementQuery,
          interestGroupCalendarIds,
          'current-year',
        ),
      ).toEqual([
        {
          id: 'team-id-0',
          inactiveSince: null,
          memberCount: 4,
          name: 'Team A',
          eventCount: 1,
          totalSpeakerCount: 1,
          uniqueAllRolesCount: 1,
          uniqueAllRolesCountPercentage: 25,
          uniqueKeyPersonnelCount: 1,
          uniqueKeyPersonnelCountPercentage: 25,
        },
      ]);
    });

    it('does not count upcoming events', () => {
      const engagementQuery = getEngagementQuery().teamsCollection;
      engagementQuery!.items[0]!.linkedFrom!.eventSpeakersCollection = {
        items: [
          {
            user: makeUser({
              userId: 'user-1',
              teams: [{ id: 'team-id-0', role: 'Key Personnel' }],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-1',
                endDate: '2024-06-11T13:00:00.000Z',
              }),
            },
          },
          {
            user: makeUser({
              userId: 'user-2',
              teams: [{ id: 'team-id-0', role: 'ASAP Staff' }],
            }),
            linkedFrom: {
              eventsCollection: makeEvent({
                eventId: 'event-2',
                endDate: '2024-07-15T13:00:00.000Z',
              }),
            },
          },
        ],
      };

      expect(
        getEngagementItems(engagementQuery, interestGroupCalendarIds, 'all'),
      ).toEqual([
        {
          id: 'team-id-0',
          inactiveSince: null,
          memberCount: 4,
          name: 'Team A',
          eventCount: 1,
          totalSpeakerCount: 1,
          uniqueAllRolesCount: 1,
          uniqueAllRolesCountPercentage: 25,
          uniqueKeyPersonnelCount: 1,
          uniqueKeyPersonnelCountPercentage: 25,
        },
      ]);
    });
  });
});
