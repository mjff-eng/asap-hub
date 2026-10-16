import { NotFoundError } from '@asap-hub/errors';
import { gp2 as gp2Model } from '@asap-hub/model';
import Events from '../../src/controllers/event.controller';
import {
  getEventDataObject,
  getEventResponse,
  getListEventDataObject,
  getListEventResponse,
} from '../fixtures/event.fixtures';
import { eventDataProviderMock } from '../mocks/event.data-provider.mock';

describe('Event controller', () => {
  const eventController = new Events(eventDataProviderMock);

  afterEach(() => {
    jest.resetAllMocks();
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
    test('if there is no project, it should not set the project eventType', async () => {
      const listEventDataObject = getListEventDataObject();
      eventDataProviderMock.fetch.mockResolvedValue({
        ...listEventDataObject,
        items: listEventDataObject.items.map(
          ({ project: _, ...eventDataObject }) => eventDataObject,
        ),
      });
      const result = await eventController.fetch({});

      const listEventResponse = getListEventResponse();
      expect(result).toEqual({
        ...listEventResponse,
        items: listEventResponse.items.map(
          ({ project: __, eventTypes, ...eventResponse }) => ({
            ...eventResponse,
            eventTypes: eventTypes.filter(
              (tag) => tag !== gp2Model.eventProjects,
            ),
          }),
        ),
      });
    });
    test('if there is no working group, it should not set the working group eventType', async () => {
      const listEventDataObject = getListEventDataObject();
      eventDataProviderMock.fetch.mockResolvedValue({
        ...listEventDataObject,
        items: listEventDataObject.items.map(
          ({ workingGroup: _, ...eventDataObject }) => eventDataObject,
        ),
      });
      const result = await eventController.fetch({});

      const listEventResponse = getListEventResponse();
      expect(result).toEqual({
        ...listEventResponse,
        items: listEventResponse.items.map(
          ({ workingGroup: __, eventTypes, ...eventResponse }) => ({
            ...eventResponse,
            eventTypes: eventTypes.filter(
              (tag) => tag !== gp2Model.eventWorkingGroups,
            ),
          }),
        ),
      });
    });
    test('if the calender is GP2 Hub, it should set the gp2 hub eventType', async () => {
      const listEventDataObject = getListEventDataObject();
      eventDataProviderMock.fetch.mockResolvedValue({
        ...listEventDataObject,
        items: listEventDataObject.items.map((eventDataObject) => ({
          ...eventDataObject,
          calendar: {
            ...eventDataObject.calendar,
            name: gp2Model.gp2CalendarName,
          },
        })),
      });
      const result = await eventController.fetch({});

      const listEventResponse = getListEventResponse();
      expect(result).toEqual({
        ...listEventResponse,
        items: listEventResponse.items.map(
          ({ eventTypes, ...eventResponse }) => ({
            ...eventResponse,
            calendar: {
              ...eventResponse.calendar,
              name: gp2Model.gp2CalendarName,
            },
            eventTypes: [...eventTypes, gp2Model.eventGP2Hub],
          }),
        ),
      });
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
      const result = await eventController.fetchById('event-id');

      expect(result).toEqual(getEventResponse());
    });
    test('if there is no project, it should not set the project eventType', async () => {
      const { project: _, ...eventDataObject } = getEventDataObject();
      eventDataProviderMock.fetchById.mockResolvedValue(eventDataObject);
      const result = await eventController.fetchById('event-id');

      const { project: __, eventTypes, ...eventResponse } = getEventResponse();
      expect(result).toEqual({
        ...eventResponse,
        eventTypes: eventTypes.filter((tag) => tag !== gp2Model.eventProjects),
      });
    });
    test('if there is no working group, it should not set the working group eventType', async () => {
      const { workingGroup: _, ...eventDataObject } = getEventDataObject();
      eventDataProviderMock.fetchById.mockResolvedValue(eventDataObject);
      const result = await eventController.fetchById('event-id');

      const {
        workingGroup: __,
        eventTypes,
        ...eventResponse
      } = getEventResponse();
      expect(result).toEqual({
        ...eventResponse,
        eventTypes: eventTypes.filter(
          (tag) => tag !== gp2Model.eventWorkingGroups,
        ),
      });
    });
    test('if the calender is GP2 Hub, it should set the gp2 hub eventType', async () => {
      const eventDataObject = getEventDataObject();
      eventDataProviderMock.fetchById.mockResolvedValue({
        ...eventDataObject,
        calendar: {
          ...eventDataObject.calendar,
          name: gp2Model.gp2CalendarName,
        },
      });
      const result = await eventController.fetchById('event-id');

      const { calendar, eventTypes, ...eventResponse } = getEventResponse();
      expect(result).toEqual({
        ...eventResponse,
        calendar: {
          ...calendar,
          name: gp2Model.gp2CalendarName,
        },
        eventTypes: [...eventTypes, gp2Model.eventGP2Hub],
      });
    });
  });
  describe('Create method', () => {
    test('Should return the newly created event', async () => {
      const googleId = 'a-google-id';
      const calendar = 'a-calendar';
      const hidden = false;
      const {
        title,
        description,
        startDate,
        startDateTimeZone,
        endDate,
        endDateTimeZone,
        status,
        meetingLink,
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
        meetingLink,
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
        meetingLink,
        hideMeetingLink,
        googleId,
        calendar,
        hidden,
      });
    });
  });

  describe('Update method', () => {
    test('Should return the newly updated event', async () => {
      const description = 'a new description';
      eventDataProviderMock.fetchById.mockResolvedValue(getEventDataObject());
      const result = await eventController.update('7', { description });

      expect(result).toEqual(getEventResponse());
      expect(eventDataProviderMock.update).toHaveBeenCalledWith('7', {
        description,
      });
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
      expect(result).toEqual(getEventResponse());
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
