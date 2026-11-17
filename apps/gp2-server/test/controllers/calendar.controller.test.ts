import { NotFoundError } from '@asap-hub/errors';
import { CalendarUpdateRequest } from '@asap-hub/model';
import Calendars, {
  parseCalendarDataObjectToResponse,
} from '../../src/controllers/calendar.controller';
import {
  getCalendarDataObject,
  getCalendarResponse,
  getListCalendarResponse,
} from '../fixtures/calendar.fixtures';
import { calendarDataProviderMock } from '../mocks/calendar.data-provider.mock';

describe('Calendars Controller', () => {
  const calendarsController = new Calendars(calendarDataProviderMock);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch method', () => {
    test('Should fetch the calendars', async () => {
      calendarDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [getCalendarDataObject()],
      });
      const result = await calendarsController.fetch();

      expect(result).toMatchObject(getListCalendarResponse());
    });

    test('Should an empty list when there are no calendars', async () => {
      calendarDataProviderMock.fetch.mockResolvedValue({
        total: 0,
        items: [],
      });
      const result = await calendarsController.fetch();

      expect(result).toEqual({ items: [], total: 0 });
    });

    test('Should ask the data provider for active calendars only', async () => {
      calendarDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [getCalendarDataObject()],
      });
      await calendarsController.fetch();

      expect(calendarDataProviderMock.fetch).toBeCalledWith({
        active: true,
      });
    });
    describe('sort order', () => {
      test('calendars with no projects or working groups are sorted alphabetically', async () => {
        const calendar1 = getCalendarDataObject();
        calendar1.projects = [];
        calendar1.workingGroups = [];
        const calendar2 = getCalendarDataObject();
        calendar2.projects = [];
        calendar2.workingGroups = [];
        const calendar3 = getCalendarDataObject();
        calendar3.projects = [];
        calendar3.workingGroups = [];

        calendar1.name = 'c';
        calendar2.name = 'a';
        calendar3.name = 'b';
        calendarDataProviderMock.fetch.mockResolvedValue({
          total: 3,
          items: [calendar1, calendar2, calendar3],
        });
        const result = await calendarsController.fetch();
        expect(result).toEqual({
          items: [
            parseCalendarDataObjectToResponse(calendar2),
            parseCalendarDataObjectToResponse(calendar3),
            parseCalendarDataObjectToResponse(calendar1),
          ],
          total: 3,
        });
      });
      test('calendars with projects or groups are sorted alphabetically', async () => {
        const calendar1 = getCalendarDataObject();
        calendar1.projects = [{ id: '42', title: 'a', status: 'Active' }];
        calendar1.workingGroups = [];
        const calendar2 = getCalendarDataObject();
        calendar2.projects = [{ id: '42', title: 'a', status: 'Active' }];
        calendar2.workingGroups = [];
        const calendar3 = getCalendarDataObject();
        calendar3.projects = [];
        calendar3.workingGroups = [{ id: '42', title: 'a' }];

        calendar1.name = 'c';
        calendar2.name = 'a';
        calendar3.name = 'b';
        calendarDataProviderMock.fetch.mockResolvedValue({
          total: 3,
          items: [calendar1, calendar2, calendar3],
        });
        const result = await calendarsController.fetch();
        expect(result).toEqual({
          items: [
            parseCalendarDataObjectToResponse(calendar2),
            parseCalendarDataObjectToResponse(calendar3),
            parseCalendarDataObjectToResponse(calendar1),
          ],
          total: 3,
        });
      });
      test('calendars with no project or working group are sorted to the top', async () => {
        const calendar1 = getCalendarDataObject();
        const calendar2 = getCalendarDataObject();
        const calendar3 = getCalendarDataObject();

        calendar1.name = 'b';
        calendar1.projects = [{ id: '42', title: 'a', status: 'Active' }];
        calendar1.workingGroups = [];
        calendar2.name = 'c';
        calendar2.projects = [];
        calendar2.workingGroups = [];
        calendar3.name = 'a';
        calendar3.projects = [];
        calendar3.workingGroups = [{ id: '42', title: 'a' }];

        calendarDataProviderMock.fetch.mockResolvedValue({
          total: 3,
          items: [calendar1, calendar2, calendar3],
        });
        const result = await calendarsController.fetch();
        expect(result).toEqual({
          items: [
            parseCalendarDataObjectToResponse(calendar2),
            parseCalendarDataObjectToResponse(calendar3),
            parseCalendarDataObjectToResponse(calendar1),
          ],
          total: 3,
        });
      });
    });
  });

  describe('FetchById method', () => {
    test('Should throw when the calendar is not found', async () => {
      calendarDataProviderMock.fetchById.mockResolvedValue(null);

      await expect(calendarsController.fetchById('not-found')).rejects.toThrow(
        NotFoundError,
      );
    });

    test('Should return the calendar when it finds it', async () => {
      calendarDataProviderMock.fetchById.mockResolvedValue(
        getCalendarDataObject(),
      );
      const result = await calendarsController.fetchById('calendar-id');

      expect(result).toEqual(getCalendarResponse());
    });

    test('Should default a missing gp2Calendar flag to false', async () => {
      const { gp2Calendar: _gp2Calendar, ...calendarDataObject } =
        getCalendarDataObject();
      calendarDataProviderMock.fetchById.mockResolvedValue(calendarDataObject);

      const result = await calendarsController.fetchById('calendar-id');

      expect(result.gp2Calendar).toBe(false);
    });
  });

  describe('Update method', () => {
    test('Should return the updated calendar', async () => {
      calendarDataProviderMock.fetchById.mockResolvedValue(
        getCalendarDataObject(),
      );

      const result = await calendarsController.update('calendar-id', {
        expirationDate: 928349328,
      });

      expect(result).toEqual(getCalendarResponse());
    });

    test('Should call the data provider with correct input', async () => {
      calendarDataProviderMock.fetchById.mockResolvedValue(
        getCalendarDataObject(),
      );

      const input: CalendarUpdateRequest = {
        expirationDate: 928349823,
        resourceId: 'resource-id',
      };
      await calendarsController.update('calendar-id', input);

      expect(calendarDataProviderMock.update).toHaveBeenCalledWith(
        'calendar-id',
        input,
      );
    });
  });
});
