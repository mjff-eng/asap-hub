import { createAuthUser } from '@asap-hub/fixtures';
import { AuthHandler } from '@asap-hub/server-common';
import supertest from 'supertest';
import { appFactory } from '../../src/app';
import { getListReminderResponse } from '../fixtures/reminders.fixtures';
import { loggerMock } from '../mocks/logger.mock';
import { reminderControllerMock } from '../mocks/reminder.controller.mock';

describe('/reminders/ route', () => {
  const getLoggedUser = jest.fn().mockReturnValue(createAuthUser());
  const authHandlerMock: AuthHandler = (req, _res, next) => {
    req.loggedInUser = getLoggedUser();
    next();
  };
  const app = appFactory({
    authHandler: authHandlerMock,
    reminderController: reminderControllerMock,
    logger: loggerMock,
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /reminders', () => {
    test('Should return 200 when no reminders exist', async () => {
      reminderControllerMock.fetch.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const response = await supertest(app).get('/reminders').query({
        timezone: 'Europe/London',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        total: 0,
        items: [],
      });
    });

    test('Should call the controller with the logged-in user ID and requested timezone', async () => {
      const userId = 'some-user-id';
      const someUser = {
        ...createAuthUser(),
        id: userId,
      };
      const timezone = 'Europe/London';
      getLoggedUser.mockReturnValueOnce(someUser);

      await supertest(app).get('/reminders').query({
        timezone,
      });

      expect(reminderControllerMock.fetch).toHaveBeenCalledWith({
        userId,
        timezone,
        isNewEventPageEnabled: false,
      });
    });

    test('Should pass the isNewEventPageEnabled parameter to the controller', async () => {
      const userId = 'some-user-id';
      getLoggedUser.mockReturnValueOnce({ ...createAuthUser(), id: userId });

      await supertest(app).get('/reminders').query({
        timezone: 'Europe/London',
        isNewEventPageEnabled: true,
      });

      expect(reminderControllerMock.fetch).toHaveBeenCalledWith({
        userId,
        timezone: 'Europe/London',
        isNewEventPageEnabled: true,
      });
    });

    test('Should return 400 when isNewEventPageEnabled is not a boolean', async () => {
      const response = await supertest(app).get('/reminders').query({
        timezone: 'Europe/London',
        isNewEventPageEnabled: 'abc',
      });

      expect(response.status).toBe(400);
    });

    test('Should return the results correctly', async () => {
      reminderControllerMock.fetch.mockResolvedValueOnce(
        getListReminderResponse(),
      );

      const response = await supertest(app).get('/reminders').query({
        timezone: 'Europe/London',
      });

      expect(response.body).toEqual(getListReminderResponse());
    });

    test('Should return 403 when the user is not logged in', async () => {
      getLoggedUser.mockReturnValueOnce(undefined);

      const response = await supertest(app).get('/reminders').query({
        timezone: 'Europe/London',
      });

      expect(response.status).toBe(403);
    });

    describe('Parameter validation', () => {
      test('Should return a validation error when additional arguments exist', async () => {
        const response = await supertest(app).get('/reminders/').query({
          timezone: 'Europe/London',
          additionalField: 'some-data',
        });

        expect(response.status).toBe(400);
      });

      test('Should return a validation error when the timezone is missing', async () => {
        const response = await supertest(app).get('/reminders/');

        expect(response.status).toBe(400);
      });

      test('Should return a validation error when the timezone is not valid', async () => {
        const response = await supertest(app).get('/reminders/').query({
          timezone: 'Europe/Foo',
        });

        expect(response.status).toBe(400);
      });
    });
  });
});
