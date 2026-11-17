import { EventResponse } from '@asap-hub/model';
import { calendar_v3 as calendarV3 } from 'googleapis';
import { syncEventFactory } from '../../src';
import { getEventResponse } from '../fixtures/events.fixtures';
import { eventControllerMock } from '../mocks/event-controller.mock';
import { loggerMock as logger } from '../mocks/logger.mock';

describe('Sync calendar util hook', () => {
  const googleCalendarId = 'google-calendar-id';
  const calendarId = 'calendar-id';
  const defaultCalendarTimezone = 'Europe/Lisbon';
  const syncEventWith = (app: 'crn' | 'gp2') => {
    const sync = syncEventFactory(eventControllerMock, logger, app);
    return (event: calendarV3.Schema$Event) =>
      sync(event, googleCalendarId, calendarId, defaultCalendarTimezone);
  };
  const syncEvent = syncEventWith('crn');
  const syncGp2Event = syncEventWith('gp2');

  const expectedEvent = (overrides: Record<string, unknown> = {}) => ({
    googleId: '04rteq6hj3gfq9g3i8v2oqetvd',
    title: 'Event Title',
    description: 'Event Description',
    startDate: '2021-02-27T00:00:00.000Z',
    startDateTimeZone: 'Europe/Lisbon',
    endDate: '2021-02-28T00:00:00.000Z',
    endDateTimeZone: 'Europe/Lisbon',
    status: 'Confirmed',
    calendar: calendarId,
    hidden: false,
    inPerson: false,
    recurring: false,
    ...overrides,
  });

  // inPerson is only sent on create, so update payloads do not carry it
  const expectedUpdate = (overrides: Record<string, unknown> = {}) => {
    const { inPerson, ...event } = expectedEvent(overrides);
    return event;
  };

  const existingEventWith = (overrides: Partial<EventResponse> = {}) => ({
    ...getEventResponse(),
    id: 'event-id',
    ...overrides,
  });

  const cancelledGoogleEvent = () => ({
    ...getGoogleEvent(),
    status: 'cancelled',
  });

  afterEach(jest.resetAllMocks);

  test('Should create the event when it is not found', async () => {
    eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(null);

    await syncEvent(getGoogleEvent());

    expect(eventControllerMock.update).not.toHaveBeenCalled();
    expect(eventControllerMock.create).toHaveBeenCalledTimes(1);
    expect(eventControllerMock.create).toHaveBeenCalledWith(expectedEvent());
  });

  test('Should create gp2 event when it is not found', async () => {
    eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(null);

    await syncGp2Event(getGoogleEvent());

    const { recurring, ...gp2Event } = expectedEvent();
    expect(eventControllerMock.update).not.toHaveBeenCalled();
    expect(eventControllerMock.create).toHaveBeenCalledTimes(1);
    expect(eventControllerMock.create).toHaveBeenCalledWith(gp2Event);
  });

  test('Should mark the CRN event as recurring when it belongs to a recurring series', async () => {
    eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(null);

    await syncEvent({
      ...getGoogleEvent(),
      recurringEventId: 'recurring-event-id',
    });

    expect(eventControllerMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ recurring: true }),
    );
  });

  test('Should not send the recurring flag on gp2 events', async () => {
    eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(null);

    await syncGp2Event({
      ...getGoogleEvent(),
      recurringEventId: 'recurring-event-id',
    });

    expect(eventControllerMock.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ recurring: expect.anything() }),
    );
  });

  test('Should update event when it exists', async () => {
    eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(
      existingEventWith(),
    );

    await syncEvent(getGoogleEvent());

    expect(eventControllerMock.create).not.toHaveBeenCalled();
    expect(eventControllerMock.update).toHaveBeenCalledTimes(1);
    expect(eventControllerMock.update).toHaveBeenCalledWith(
      'event-id',
      expectedUpdate(),
    );
  });

  test('Should NOT update the event if the organiser of the event is different from the current calendar', async () => {
    const googleEvent = getGoogleEvent();
    googleEvent.organizer!.email = 'some-other-organizer';

    await expect(syncEvent(googleEvent)).rejects.toThrow('Invalid organiser');

    expect(eventControllerMock.create).not.toHaveBeenCalled();
    expect(eventControllerMock.update).not.toHaveBeenCalled();
  });

  describe('Hidden flag', () => {
    test('Should create an event and mark as hidden when the status is cancelled', async () => {
      eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(null);

      await syncEvent(cancelledGoogleEvent());

      expect(eventControllerMock.update).not.toHaveBeenCalled();
      expect(eventControllerMock.create).toHaveBeenCalledTimes(1);
      expect(eventControllerMock.create).toHaveBeenCalledWith(
        expectedEvent({ status: 'Cancelled', hidden: true }),
      );
    });

    test.each`
      scenario                                   | existing                                      | googleStatus   | expectedStatus | expectedHidden
      ${'update to hidden when cancelled'}       | ${{ status: 'Confirmed' }}                    | ${'cancelled'} | ${'Cancelled'} | ${true}
      ${'remain hidden when still cancelled'}    | ${{ status: 'Cancelled', hidden: true }}      | ${'cancelled'} | ${'Cancelled'} | ${true}
      ${'remain visible when still cancelled'}   | ${{ status: 'Cancelled', hidden: false }}     | ${'cancelled'} | ${'Cancelled'} | ${false}
      ${'remain visible when hidden is missing'} | ${{ status: 'Cancelled', hidden: undefined }} | ${'cancelled'} | ${'Cancelled'} | ${false}
      ${'remain hidden on tentative'}            | ${{ status: 'Confirmed', hidden: true }}      | ${'tentative'} | ${'Tentative'} | ${true}
    `(
      'Should $scenario',
      async ({ existing, googleStatus, expectedStatus, expectedHidden }) => {
        eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(
          existingEventWith(existing),
        );

        await syncEvent({ ...getGoogleEvent(), status: googleStatus });

        expect(eventControllerMock.update).toHaveBeenCalledWith(
          'event-id',
          expectedUpdate({ status: expectedStatus, hidden: expectedHidden }),
        );
      },
    );
  });

  describe('In Person', () => {
    test('Should create an event and mark the field inPerson as false', async () => {
      eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(null);

      await syncEvent(getGoogleEvent());

      expect(eventControllerMock.update).not.toHaveBeenCalled();
      expect(eventControllerMock.create).toHaveBeenCalledTimes(1);
      expect(eventControllerMock.create).toHaveBeenCalledWith(
        expectedEvent({ inPerson: false }),
      );
    });

    test('Should create a gp2 event and mark the field inPerson as false', async () => {
      eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(null);

      await syncGp2Event(getGoogleEvent());

      expect(eventControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ inPerson: false }),
      );
    });

    test.each(['crn', 'gp2'] as const)(
      'Should not override the inPerson field when updating a %s event',
      async (app) => {
        eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(
          existingEventWith({ inPerson: true }),
        );

        await syncEventWith(app)(getGoogleEvent());

        expect(eventControllerMock.update).toHaveBeenCalledWith(
          'event-id',
          expect.not.objectContaining({ inPerson: expect.anything() }),
        );
      },
    );
  });

  describe('Should throw when a remote operation throws', () => {
    test('fetchByGoogleId', async () => {
      eventControllerMock.fetchByGoogleId.mockRejectedValueOnce(new Error());
      await expect(syncEvent(getGoogleEvent())).rejects.toThrow();
    });

    test('update', async () => {
      eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(
        existingEventWith(),
      );
      eventControllerMock.update.mockRejectedValueOnce(new Error());
      await expect(syncEvent(getGoogleEvent())).rejects.toThrow();
    });

    test('create', async () => {
      eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(null);
      eventControllerMock.create.mockRejectedValueOnce(new Error());
      await expect(syncEvent(getGoogleEvent())).rejects.toThrow();
    });
  });

  test.each`
    scenario                   | end                                                                        | expectedEndDate               | expectedEndTimeZone
    ${'with dateTime'}         | ${{ dateTime: '2021-02-27T10:00:00Z', timeZone: 'Europe/London' }}         | ${'2021-02-27T10:00:00.000Z'} | ${'Europe/London'}
    ${'converts dates to UTC'} | ${{ dateTime: '2040-09-13T13:30:00-04:00', timeZone: 'America/New_York' }} | ${'2040-09-13T17:30:00.000Z'} | ${'America/New_York'}
  `(
    'Should create event - $scenario',
    async ({ end, expectedEndDate, expectedEndTimeZone }) => {
      eventControllerMock.fetchByGoogleId.mockResolvedValueOnce(null);

      await syncEvent({ ...getGoogleEvent(), end });

      expect(eventControllerMock.update).not.toHaveBeenCalled();
      expect(eventControllerMock.create).toHaveBeenCalledTimes(1);
      expect(eventControllerMock.create).toHaveBeenCalledWith(
        expectedEvent({
          endDate: expectedEndDate,
          endDateTimeZone: expectedEndTimeZone,
        }),
      );
    },
  );

  describe('Validation test', () => {
    test.each`
      scenario                | buildEvent
      ${'empty object'}       | ${() => ({})}
      ${'missing fields: id'} | ${() => ({ ...getGoogleEvent(), id: undefined })}
      ${'missing dates'}      | ${() => ({ ...getGoogleEvent(), start: {}, end: {} })}
      ${'bad dates'}          | ${() => ({ ...getGoogleEvent(), start: { timeZone: 'notice-no-dates' }, end: { timeZone: 'notice-no-dates' } })}
    `(
      'Should reject when validation fails - $scenario',
      async ({ buildEvent }) => {
        await expect(syncEvent(buildEvent())).rejects.toThrow();
      },
    );
  });
});

const getGoogleEvent = (): calendarV3.Schema$Event => ({
  kind: 'calendar#event',
  etag: '"3228679679662000"',
  id: '04rteq6hj3gfq9g3i8v2oqetvd',
  status: 'confirmed',
  htmlLink:
    'https://www.google.com/calendar/event?eid=MDRydGVxNmhqM2dmcTlnM2k4djJvcWV0dmQgY181dTNiYWs4ZGE3Z3Nma2QzNGF0azAyMTFyZ0Bn',
  created: '2021-02-26T11:43:59.000Z',
  updated: '2021-02-26T11:43:59.831Z',
  summary: 'Event Title',
  description: 'Event Description',
  creator: {
    email: 'calendar@asap.science',
  },
  organizer: {
    email: 'google-calendar-id',
    displayName: 'New Test',
    self: true,
  },
  start: {
    date: '2021-02-27',
  },
  end: {
    date: '2021-02-28',
  },
  transparency: 'transparent',
  iCalUID: '04rteq6hj3gfq9g3i8v2oqetvd@google.com',
  sequence: 0,
  reminders: {
    useDefault: false,
  },
});
