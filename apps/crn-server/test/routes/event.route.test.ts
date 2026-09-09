import { createUserResponse } from '@asap-hub/fixtures';
import { FetchEventsOptions, UserResponse } from '@asap-hub/model';
import { AuthHandler } from '@asap-hub/server-common';
import Boom from '@hapi/boom';
import supertest from 'supertest';
import { appFactory } from '../../src/app';

import {
  getEventResponse,
  getListEventResponse,
} from '../fixtures/events.fixtures';
import { eventControllerMock } from '../mocks/event.controller.mock';
import { loggerMock } from '../mocks/logger.mock';

describe('/events/ routes', () => {
  const userMockFactory = jest.fn<UserResponse | undefined, []>();
  const authHandlerMock: AuthHandler = (req, _res, next) => {
    req.loggedInUser = userMockFactory();
    return next();
  };

  const app = appFactory({
    authHandler: authHandlerMock,
    eventController: eventControllerMock,
    logger: loggerMock,
  });

  beforeEach(() => {
    userMockFactory.mockReturnValue(createUserResponse());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /events', () => {
    const query = { after: '2021-02-08T14:13:37.138Z' };

    test('Should return 200 when no events exist', async () => {
      eventControllerMock.fetch.mockResolvedValueOnce({
        total: 0,
        items: [],
      });
      const response = await supertest(app).get('/events').query(query);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        total: 0,
        items: [],
      });
    });

    test('Should return results correctly', async () => {
      const listEventResponse = getListEventResponse();
      eventControllerMock.fetch.mockResolvedValueOnce(listEventResponse);
      const response = await supertest(app).get('/events').query(query);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(listEventResponse);
    });

    test('Should call the controller method with the correct parameters', async () => {
      eventControllerMock.fetch.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await supertest(app).get('/events').query({
        take: 15,
        skip: 5,
        before: '2021-02-08T14:29:59.895Z',
        after: '2021-02-08T14:13:37.138Z',
        sortBy: 'startDate',
        sortOrder: 'desc',
      });

      const expectedParams: FetchEventsOptions = {
        take: 15,
        skip: 5,
        before: '2021-02-08T14:29:59.895Z',
        after: '2021-02-08T14:13:37.138Z',
        sortBy: 'startDate',
        sortOrder: 'desc',
      };

      expect(eventControllerMock.fetch).toBeCalledWith(expectedParams);
    });

    describe('Parameter validation', () => {
      test('Should return a validation error when additional fields exist', async () => {
        const response = await supertest(app).get('/events').query({
          additionalField: 'some-data',
        });
        expect(response.status).toBe(400);
      });

      test('Should return a validation error when before parameter is present but empty', async () => {
        const response = await supertest(app).get('/events').query({
          before: '',
        });
        expect(response.status).toBe(400);
      });

      test('Should return a validation error when before parameter is invalid', async () => {
        const response = await supertest(app).get('/events').query({
          before: 'not-a-date',
        });
        expect(response.status).toBe(400);
      });

      test('Should return a validation error when after parameter is present but empty', async () => {
        const response = await supertest(app).get('/events').query({
          after: '',
        });
        expect(response.status).toBe(400);
      });

      test('Should return a validation error when after parameter is invalid', async () => {
        const response = await supertest(app).get('/events').query({
          after: 'not-a-date',
        });
        expect(response.status).toBe(400);
      });

      test('Should return a validation error when skip parameter is invalid', async () => {
        const response = await supertest(app).get('/events').query({
          before: '2021-02-08T14:13:37.138Z',
          skip: 'invalid-parameter',
        });
        expect(response.status).toBe(400);
      });

      test('Should return a validation error when take parameter is invalid', async () => {
        const response = await supertest(app).get('/events').query({
          before: '2021-02-08T14:13:37.138Z',
          take: 'invalid-parameter',
        });
        expect(response.status).toBe(400);
      });

      test('Should return a validation error when the sort column is not supported', async () => {
        const response = await supertest(app).get('/events').query({
          before: '2021-02-08T14:13:37.138Z',
          sortBy: 'lastModifiedDate',
        });
        expect(response.status).toBe(400);
      });

      test('Should return a validation error when the sort order is not supported', async () => {
        const response = await supertest(app).get('/events').query({
          before: '2021-02-08T14:13:37.138Z',
          sortOrder: 'up',
        });
        expect(response.status).toBe(400);
      });

      test('Should default to ascending order by startDate when the sort params are not given', async () => {
        eventControllerMock.fetch.mockResolvedValueOnce({
          items: [],
          total: 0,
        });

        const response = await supertest(app).get('/events').query({
          before: '2021-02-08T14:13:37.138Z',
        });

        expect(response.status).toBe(200);
        expect(eventControllerMock.fetch).toBeCalledWith({
          before: expect.anything(),
          sortBy: 'startDate',
          sortOrder: 'asc',
        });
      });

      test('Should default to ascending order when the sort-order param is not given', async () => {
        eventControllerMock.fetch.mockResolvedValueOnce({
          items: [],
          total: 0,
        });

        const response = await supertest(app).get('/events').query({
          before: '2021-02-08T14:13:37.138Z',
          sortBy: 'endDate',
        });

        expect(response.status).toBe(200);
        expect(eventControllerMock.fetch).toBeCalledWith({
          before: expect.anything(),
          sortBy: 'endDate',
          sortOrder: 'asc',
        });
      });

      test('Should default to order by startDate when the sort-by param is not given', async () => {
        eventControllerMock.fetch.mockResolvedValueOnce({
          items: [],
          total: 0,
        });

        const response = await supertest(app).get('/events').query({
          before: '2021-02-08T14:13:37.138Z',
          sortOrder: 'desc',
        });

        expect(response.status).toBe(200);
        expect(eventControllerMock.fetch).toBeCalledWith({
          before: expect.anything(),
          sortBy: 'startDate',
          sortOrder: 'desc',
        });
      });

      test('Should return 200 when sorting by the end date in descending order', async () => {
        eventControllerMock.fetch.mockResolvedValueOnce({
          items: [],
          total: 0,
        });

        const response = await supertest(app).get('/events').query({
          before: '2021-02-08T14:13:37.138Z',
          sortBy: 'endDate',
          sortOrder: 'desc',
        });

        expect(response.status).toBe(200);
      });

      test('Should return 200 when sorting by the start date in ascending order', async () => {
        eventControllerMock.fetch.mockResolvedValueOnce({
          items: [],
          total: 0,
        });

        const response = await supertest(app).get('/events').query({
          before: '2021-02-08T14:13:37.138Z',
          sortBy: 'startDate',
          sortOrder: 'asc',
        });

        expect(response.status).toBe(200);
      });
    });
  });

  describe('GET /events/{event_id}', () => {
    test('Should return 404 when no event exist', async () => {
      eventControllerMock.fetchById.mockRejectedValueOnce(Boom.notFound());

      const response = await supertest(app).get('/events/123');

      expect(response.status).toBe(404);
    });

    test('Should return the results correctly', async () => {
      eventControllerMock.fetchById.mockResolvedValueOnce(getEventResponse());

      const response = await supertest(app).get('/events/123');

      expect(response.body).toEqual(getEventResponse());
    });
  });

  describe('PATCH /events/{event_id}', () => {
    test('Should update attendance and return the updated event for a tech support user', async () => {
      userMockFactory.mockReturnValueOnce({
        ...createUserResponse(),
        techSupport: true,
      });
      eventControllerMock.updateEventDetails.mockResolvedValueOnce(
        getEventResponse(),
      );

      const response = await supertest(app)
        .patch('/events/123')
        .send({ attendance: [{ teamId: 'team-1', attended: true }] });

      expect(response.status).toBe(200);
      expect(eventControllerMock.updateEventDetails).toHaveBeenCalledWith(
        '123',
        { attendance: [{ teamId: 'team-1', attended: true }] },
      );
      expect(response.body).toEqual(getEventResponse());
    });

    test('Should return 403 when the logged in user is not a tech support user', async () => {
      userMockFactory.mockReturnValueOnce({
        ...createUserResponse(),
        techSupport: false,
      });

      const response = await supertest(app)
        .patch('/events/123')
        .send({ attendance: [{ teamId: 'team-1', attended: true }] });

      expect(response.status).toBe(403);
      expect(eventControllerMock.updateEventDetails).not.toHaveBeenCalled();
    });

    test('Should return 403 when there is no logged in user', async () => {
      userMockFactory.mockReturnValueOnce(undefined);

      const response = await supertest(app)
        .patch('/events/123')
        .send({ attendance: [{ teamId: 'team-1', attended: true }] });

      expect(response.status).toBe(403);
      expect(eventControllerMock.updateEventDetails).not.toHaveBeenCalled();
    });

    test('Should update speakers and preliminary data sharing for a tech support user', async () => {
      userMockFactory.mockReturnValueOnce({
        ...createUserResponse(),
        techSupport: true,
      });
      eventControllerMock.updateEventDetails.mockResolvedValueOnce(
        getEventResponse(),
      );

      const payload = {
        speakersToRemove: ['speaker-1'],
        preliminaryDataShared: [{ teamId: 'team-1', shared: true }],
      };
      const response = await supertest(app)
        .patch('/events/123')
        .send(payload);

      expect(response.status).toBe(200);
      expect(eventControllerMock.updateEventDetails).toHaveBeenCalledWith(
        '123',
        payload,
      );
      expect(response.body).toEqual(getEventResponse());
    });

    test('Should return a validation error for an unknown property', async () => {
      const response = await supertest(app)
        .patch('/events/123')
        .send({ unexpected: true });

      expect(response.status).toBe(400);
    });

    test('Should return a validation error when an attendance item is missing required fields', async () => {
      const response = await supertest(app)
        .patch('/events/123')
        .send({ attendance: [{ teamId: 'team-1' }] });

      expect(response.status).toBe(400);
    });

    test('Should return a validation error when a preliminary data sharing item is missing required fields', async () => {
      const response = await supertest(app)
        .patch('/events/123')
        .send({ preliminaryDataShared: [{ teamId: 'team-1' }] });

      expect(response.status).toBe(400);
    });
  });
});
