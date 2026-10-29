import { NotFoundError } from '@asap-hub/errors';
import Events from '../../src/controllers/event.controller';
import {
  getEventDataObject,
  getEventResponse,
  getListEventDataObject,
  getListEventResponse,
} from '../fixtures/events.fixtures';
import { getDataProviderMock } from '../mocks/data-provider.mock';
import { eventDataProviderMock } from '../mocks/event.data-provider.mock';

describe('Event controller', () => {
  const externalAuthorDataProviderMock = getDataProviderMock();
  const eventController = new Events(
    eventDataProviderMock,
    externalAuthorDataProviderMock,
  );

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  describe('Fetch method', () => {
    test('it should fetch the events', async () => {
      eventDataProviderMock.fetch.mockResolvedValue(getListEventDataObject());
      const result = await eventController.fetch({});

      expect(result).toEqual(getListEventResponse());
    });
    test('Should return empty list when there are no events', async () => {
      eventDataProviderMock.fetch.mockResolvedValue({
        total: 0,
        items: [],
      });
      const result = await eventController.fetch({});

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('Fetch by id method', () => {
    test('Should throw when event is not found', async () => {
      eventDataProviderMock.fetchById.mockResolvedValue(null);

      await expect(eventController.fetchById('not-found')).rejects.toThrow(
        NotFoundError,
      );
    });
    test('Should return the event when it finds it', async () => {
      eventDataProviderMock.fetchById.mockResolvedValue(getEventDataObject());
      const result = await eventController.fetchById('project-id');

      expect(result).toEqual(getEventResponse());
    });
  });
  describe('Create method', () => {
    test('Should return the newly created event', async () => {
      const googleId = 'a-google-id';
      const calendar = 'a-new-calendar';
      const hidden = false;
      const {
        title,
        description,
        startDate,
        startDateTimeZone,
        endDate,
        endDateTimeZone,
        status,
        hideMeetingLink,
      } = getEventDataObject();

      eventDataProviderMock.fetchById.mockResolvedValue(getEventDataObject());
      const result = await eventController.create({
        description,
        title,
        startDate,
        startDateTimeZone,
        endDate,
        endDateTimeZone,
        status,
        hideMeetingLink,
        googleId,
        calendar,
        hidden,
      });

      expect(result).toEqual(getEventResponse());
      expect(eventDataProviderMock.create).toHaveBeenCalledWith({
        description,
        title,
        startDate,
        startDateTimeZone,
        endDate,
        endDateTimeZone,
        status,
        hideMeetingLink,
        googleId,
        calendar,
        hidden,
      });
    });
  });

  describe('Update method', () => {
    test('Should return the newly updated event', async () => {
      const event = getEventDataObject();
      const { calendar: _, ...eventUpdate } = event;
      eventDataProviderMock.fetchById.mockResolvedValue(event);
      const result = await eventController.update('7', eventUpdate);

      expect(result).toEqual(getEventResponse());
      expect(eventDataProviderMock.update).toHaveBeenCalledWith(
        '7',
        eventUpdate,
      );
    });
  });

  describe('updateEventDetails method', () => {
    test('Should update attendance and return the refreshed event', async () => {
      const event = getEventDataObject();
      eventDataProviderMock.fetchById.mockResolvedValue(event);

      const result = await eventController.updateEventDetails('7', {
        attendance: [{ teamId: 'team-1', attended: true }],
      });

      expect(eventDataProviderMock.updateEventDetails).toHaveBeenCalledWith(
        '7',
        { attendance: [{ teamId: 'team-1', attended: true }] },
      );
      expect(result).toEqual(getEventResponse());
    });

    test('Should update speakers and preliminary data sharing and return the refreshed event', async () => {
      const event = getEventDataObject();
      eventDataProviderMock.fetchById.mockResolvedValue(event);

      const payload = {
        speakersToRemove: ['speaker-1'],
        preliminaryDataShared: [{ speakerId: 'speaker-2', shared: true }],
      };
      const result = await eventController.updateEventDetails('7', payload);

      expect(eventDataProviderMock.updateEventDetails).toHaveBeenCalledWith(
        '7',
        payload,
      );
      expect(result).toEqual(getEventResponse());
    });

    test('Should create an external author for each new name and add every speaker by id', async () => {
      eventDataProviderMock.fetchById.mockResolvedValue(getEventDataObject());
      externalAuthorDataProviderMock.create
        .mockResolvedValueOnce('external-author-new-1')
        .mockResolvedValueOnce('external-author-new-2');

      await eventController.updateEventDetails('7', {
        speakersToAdd: [
          { userId: 'user-1', teamId: 'team-1' },
          { externalAuthorId: 'external-author-1', projectId: 'project-1' },
          { externalAuthorName: 'Riley Stone', teamId: 'team-2' },
          { externalAuthorName: 'Sam Rivera', preliminaryDataShared: true },
        ],
        speakersToRemove: ['speaker-1'],
      });

      expect(externalAuthorDataProviderMock.create.mock.calls).toEqual([
        [{ name: 'Riley Stone' }],
        [{ name: 'Sam Rivera' }],
      ]);
      expect(eventDataProviderMock.updateEventDetails).toHaveBeenCalledWith(
        '7',
        {
          speakersToAdd: [
            { userId: 'user-1', teamId: 'team-1' },
            { externalAuthorId: 'external-author-1', projectId: 'project-1' },
            { externalAuthorId: 'external-author-new-1', teamId: 'team-2' },
            {
              externalAuthorId: 'external-author-new-2',
              preliminaryDataShared: true,
            },
          ],
          speakersToRemove: ['speaker-1'],
        },
      );
    });

    test('Should not update the event when creating an external author fails', async () => {
      externalAuthorDataProviderMock.create.mockRejectedValueOnce(
        new Error('Contentful error'),
      );

      await expect(
        eventController.updateEventDetails('7', {
          speakersToAdd: [{ externalAuthorName: 'Riley Stone' }],
        }),
      ).rejects.toThrow('Contentful error');
      expect(eventDataProviderMock.updateEventDetails).not.toHaveBeenCalled();
    });
  });

  describe('fetchByGoogleId method', () => {
    const googleId = 'google-event-id';
    test('it should fetch the events', async () => {
      eventDataProviderMock.fetch.mockResolvedValue(getListEventDataObject());
      const result = await eventController.fetchByGoogleId(googleId);

      expect(eventDataProviderMock.fetch).toHaveBeenCalledWith({
        filter: { googleId, hidden: true },
        take: 1,
      });
      expect(result).toEqual(getEventResponse(true));
    });
    test('it should return null if no events found', async () => {
      eventDataProviderMock.fetch.mockResolvedValue({ total: 0, items: [] });
      const result = await eventController.fetchByGoogleId(googleId);

      expect(eventDataProviderMock.fetch).toHaveBeenCalledWith({
        filter: { googleId, hidden: true },
        take: 1,
      });
      expect(result).toEqual(null);
    });
    test('it should throw when the matching event was skipped by the data provider', async () => {
      eventDataProviderMock.fetch.mockResolvedValue({ total: 1, items: [] });

      await expect(eventController.fetchByGoogleId(googleId)).rejects.toThrow(
        `Event with google id ${googleId} exists but could not be parsed`,
      );
    });
  });
});
