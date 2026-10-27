import { ListCalendarResponse } from '@asap-hub/model';
import supertest from 'supertest';
import { appFactory } from '../../src/app';
import { authHandlerMock } from '../mocks/auth-handler.mock';
import { calendarControllerMock } from '../mocks/calendar.controller.mock';
import { loggerMock } from '../mocks/logger.mock';

describe('/calendars/ route', () => {
  const app = appFactory({
    calendarController: calendarControllerMock,
    authHandler: authHandlerMock,
    logger: loggerMock,
  });

  describe('GET /calendars', () => {
    test('Should return 200 when no calendars are found', async () => {
      calendarControllerMock.fetch.mockResolvedValueOnce({
        total: 0,
        items: [],
      });

      const response = await supertest(app).get('/calendars');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ total: 0, items: [] });
    });

    test('Should return the results correctly', async () => {
      calendarControllerMock.fetch.mockResolvedValueOnce(listCalendarResponse);

      const response = await supertest(app).get('/calendars');

      expect(response.body).toEqual(listCalendarResponse);
    });
  });
});

const listCalendarResponse: ListCalendarResponse = {
  total: 2,
  items: [
    {
      id: 'calendar-id-1',
      color: '#5C1158',
      name: 'Kubernetes Meetups',
      interestGroups: [],
      workingGroups: [],
      crnCalendar: false,
      seminarSeries: false,
    },
    {
      id: 'calendar-id-2',
      color: '#B1365F',
      name: 'Service Mesh Conferences',
      interestGroups: [],
      workingGroups: [],
      crnCalendar: false,
      seminarSeries: false,
    },
  ],
};
