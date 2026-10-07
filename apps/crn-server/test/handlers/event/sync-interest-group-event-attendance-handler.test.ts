import { InterestGroupTeamMembership } from '@asap-hub/model';
import { UpcomingEvent } from '../../../src/data-providers/types';
import { syncInterestGroupEventAttendanceHandler } from '../../../src/handlers/event/sync-interest-group-event-attendance-handler';
import {
  getInterestGroupContentfulWebhookDetail,
  getInterestGroupEvent,
} from '../../fixtures/interest-groups.fixtures';
import { createEventBridgeEventMock } from '../../helpers/events';
import { eventDataProviderMock } from '../../mocks/event.data-provider.mock';
import { interestGroupDataProviderMock } from '../../mocks/interest-group.data-provider.mock';

jest.mock('../../../src/utils/logger');

describe('Sync interest group event attendance handler', () => {
  const handler = syncInterestGroupEventAttendanceHandler(
    eventDataProviderMock,
    interestGroupDataProviderMock,
  );

  const interestGroupPublishedEvent = getInterestGroupEvent(
    'group-id-1',
    'InterestGroupsPublished',
  );
  const interestGroupTeamPublishedEvent = createEventBridgeEventMock(
    getInterestGroupContentfulWebhookDetail('ig-team-1'),
    'InterestGroupsTeamsPublished' as const,
    'ig-team-1',
  );

  const memberships: InterestGroupTeamMembership[] = [
    { teamId: 'team-1', startDate: '2025-01-01T00:00:00.000Z' },
    { teamId: 'team-2', startDate: '2025-01-01T00:00:00.000Z' },
    {
      teamId: 'team-3',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-06-01T00:00:00.000Z',
    },
  ];

  const getUpcomingEvent = (
    overrides: Partial<UpcomingEvent> = {},
  ): UpcomingEvent => ({
    id: 'event-1',
    endDate: '2030-01-01T10:00:00.000Z',
    attendance: [],
    ...overrides,
  });

  beforeEach(() => {
    interestGroupDataProviderMock.fetchCalendarId.mockResolvedValue(
      'calendar-1',
    );
    eventDataProviderMock.fetchInterestGroupMembershipsByCalendarId.mockResolvedValue(
      memberships,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('syncs the events of the published interest group', async () => {
    eventDataProviderMock.fetchUpcomingEventsByCalendarId.mockResolvedValue([
      getUpcomingEvent(),
    ]);

    await handler(interestGroupPublishedEvent);

    expect(interestGroupDataProviderMock.fetchCalendarId).toHaveBeenCalledWith(
      'group-id-1',
    );
    expect(
      interestGroupDataProviderMock.fetchIdByInterestGroupTeamId,
    ).not.toHaveBeenCalled();
    expect(
      eventDataProviderMock.fetchInterestGroupMembershipsByCalendarId,
    ).toHaveBeenCalledWith('calendar-1');
    expect(
      eventDataProviderMock.fetchUpcomingEventsByCalendarId,
    ).toHaveBeenCalledWith('calendar-1', expect.any(Date));
  });

  test('syncs the events of the interest group of the published interest group team', async () => {
    interestGroupDataProviderMock.fetchIdByInterestGroupTeamId.mockResolvedValue(
      'group-id-1',
    );
    eventDataProviderMock.fetchUpcomingEventsByCalendarId.mockResolvedValue([]);

    await handler(interestGroupTeamPublishedEvent);

    expect(
      interestGroupDataProviderMock.fetchIdByInterestGroupTeamId,
    ).toHaveBeenCalledWith('ig-team-1');
    expect(interestGroupDataProviderMock.fetchCalendarId).toHaveBeenCalledWith(
      'group-id-1',
    );
  });

  test('does nothing when the interest group team is not linked to an interest group', async () => {
    interestGroupDataProviderMock.fetchIdByInterestGroupTeamId.mockResolvedValue(
      null,
    );

    await handler(interestGroupTeamPublishedEvent);

    expect(
      interestGroupDataProviderMock.fetchCalendarId,
    ).not.toHaveBeenCalled();
    expect(eventDataProviderMock.updateEventDetails).not.toHaveBeenCalled();
  });

  describe('team published', () => {
    const teamPublishedEvent = createEventBridgeEventMock(
      getInterestGroupContentfulWebhookDetail('team-1'),
      'TeamsPublished' as const,
      'team-1',
    );

    test('syncs the events of each interest group the team belongs to', async () => {
      interestGroupDataProviderMock.fetchIdsByTeamId.mockResolvedValue([
        'group-id-1',
        'group-id-2',
      ]);
      interestGroupDataProviderMock.fetchCalendarId
        .mockResolvedValueOnce('calendar-1')
        .mockResolvedValueOnce('calendar-2');
      eventDataProviderMock.fetchUpcomingEventsByCalendarId.mockResolvedValue(
        [],
      );

      await handler(teamPublishedEvent);

      expect(
        interestGroupDataProviderMock.fetchIdsByTeamId,
      ).toHaveBeenCalledWith('team-1');
      expect(
        interestGroupDataProviderMock.fetchCalendarId,
      ).toHaveBeenCalledWith('group-id-1');
      expect(
        interestGroupDataProviderMock.fetchCalendarId,
      ).toHaveBeenCalledWith('group-id-2');
      expect(
        eventDataProviderMock.fetchUpcomingEventsByCalendarId,
      ).toHaveBeenCalledWith('calendar-1', expect.any(Date));
      expect(
        eventDataProviderMock.fetchUpcomingEventsByCalendarId,
      ).toHaveBeenCalledWith('calendar-2', expect.any(Date));
    });

    test('removes a team that became inactive before the event ends', async () => {
      interestGroupDataProviderMock.fetchIdsByTeamId.mockResolvedValue([
        'group-id-1',
      ]);
      eventDataProviderMock.fetchInterestGroupMembershipsByCalendarId.mockResolvedValue(
        [
          { teamId: 'team-1', startDate: '2025-01-01T00:00:00.000Z' },
          {
            teamId: 'team-2',
            startDate: '2025-01-01T00:00:00.000Z',
            inactiveSince: '2029-12-01T00:00:00.000Z',
          },
        ],
      );
      eventDataProviderMock.fetchUpcomingEventsByCalendarId.mockResolvedValue([
        getUpcomingEvent({
          attendance: [
            { id: 'attendance-1', teamId: 'team-1', attended: false },
            { id: 'attendance-2', teamId: 'team-2', attended: false },
          ],
        }),
      ]);

      await handler(teamPublishedEvent);

      expect(eventDataProviderMock.updateEventDetails).toHaveBeenCalledWith(
        'event-1',
        {
          attendance: [
            { id: 'attendance-1', teamId: 'team-1', attended: false },
          ],
        },
      );
    });

    test('does nothing when the team is not in any interest group', async () => {
      interestGroupDataProviderMock.fetchIdsByTeamId.mockResolvedValue([]);

      await handler(teamPublishedEvent);

      expect(
        interestGroupDataProviderMock.fetchCalendarId,
      ).not.toHaveBeenCalled();
      expect(eventDataProviderMock.updateEventDetails).not.toHaveBeenCalled();
    });
  });

  test('does nothing when the interest group has no calendar', async () => {
    interestGroupDataProviderMock.fetchCalendarId.mockResolvedValue(null);

    await handler(interestGroupPublishedEvent);

    expect(
      eventDataProviderMock.fetchUpcomingEventsByCalendarId,
    ).not.toHaveBeenCalled();
    expect(eventDataProviderMock.updateEventDetails).not.toHaveBeenCalled();
  });

  test('adds the teams that are members when the event ends', async () => {
    eventDataProviderMock.fetchUpcomingEventsByCalendarId.mockResolvedValue([
      getUpcomingEvent(),
    ]);

    await handler(interestGroupPublishedEvent);

    expect(eventDataProviderMock.updateEventDetails).toHaveBeenCalledWith(
      'event-1',
      {
        attendance: [
          { teamId: 'team-1', attended: false },
          { teamId: 'team-2', attended: false },
        ],
      },
    );
  });

  test('removes teams that are no longer members when the event ends', async () => {
    eventDataProviderMock.fetchUpcomingEventsByCalendarId.mockResolvedValue([
      getUpcomingEvent({
        attendance: [
          { id: 'attendance-1', teamId: 'team-1', attended: false },
          { id: 'attendance-2', teamId: 'team-2', attended: false },
          { id: 'attendance-3', teamId: 'team-3', attended: false },
        ],
      }),
    ]);

    await handler(interestGroupPublishedEvent);

    expect(eventDataProviderMock.updateEventDetails).toHaveBeenCalledWith(
      'event-1',
      {
        attendance: [
          { id: 'attendance-1', teamId: 'team-1', attended: false },
          { id: 'attendance-2', teamId: 'team-2', attended: false },
        ],
      },
    );
  });

  test('does not update events whose attendance already matches the interest group teams', async () => {
    eventDataProviderMock.fetchUpcomingEventsByCalendarId.mockResolvedValue([
      getUpcomingEvent({
        attendance: [
          { id: 'attendance-1', teamId: 'team-1', attended: false },
          { id: 'attendance-2', teamId: 'team-2', attended: false },
        ],
      }),
    ]);

    await handler(interestGroupPublishedEvent);

    expect(eventDataProviderMock.updateEventDetails).not.toHaveBeenCalled();
  });

  test('uses the end date of each event', async () => {
    eventDataProviderMock.fetchUpcomingEventsByCalendarId.mockResolvedValue([
      getUpcomingEvent({ id: 'event-1' }),
      getUpcomingEvent({
        id: 'event-2',
        endDate: '2025-05-01T10:00:00.000Z',
        attendance: [
          { id: 'attendance-1', teamId: 'team-1', attended: false },
          { id: 'attendance-2', teamId: 'team-2', attended: false },
        ],
      }),
    ]);

    await handler(interestGroupPublishedEvent);

    expect(eventDataProviderMock.updateEventDetails).toHaveBeenCalledTimes(2);
    expect(eventDataProviderMock.updateEventDetails).toHaveBeenCalledWith(
      'event-1',
      {
        attendance: [
          { teamId: 'team-1', attended: false },
          { teamId: 'team-2', attended: false },
        ],
      },
    );
    expect(eventDataProviderMock.updateEventDetails).toHaveBeenCalledWith(
      'event-2',
      {
        attendance: [
          { id: 'attendance-1', teamId: 'team-1', attended: false },
          { id: 'attendance-2', teamId: 'team-2', attended: false },
          { teamId: 'team-3', attended: false },
        ],
      },
    );
  });
});
