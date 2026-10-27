import { NotFoundError } from '@asap-hub/errors';
import {
  CalendarDataObject,
  CalendarDataProvider,
  CalendarResponse,
  CalendarUpdateRequest,
  ListCalendarResponse,
} from '@asap-hub/model';

export default class CalendarController {
  constructor(private dataProvider: CalendarDataProvider) {}

  async fetch(): Promise<ListCalendarResponse> {
    const { total, items: calendars } = await this.dataProvider.fetch({
      active: true,
    });

    const items =
      total > 0 ? calendars.map(parseCalendarDataObjectToResponse) : [];

    return { total, items };
  }

  async fetchById(calendarId: string): Promise<CalendarResponse> {
    const calendar = await this.dataProvider.fetchById(calendarId);

    if (!calendar) {
      throw new NotFoundError(
        undefined,
        `Calendar with id ${calendarId} not found`,
      );
    }

    return parseCalendarDataObjectToResponse(calendar);
  }

  async update(
    calendarId: string,
    data: CalendarUpdateRequest,
  ): Promise<CalendarResponse> {
    await this.dataProvider.update(calendarId, data);
    return this.fetchById(calendarId);
  }
}

export const parseCalendarDataObjectToResponse = (
  calendarDataObject: Pick<
    CalendarDataObject,
    | 'googleCalendarId'
    | 'color'
    | 'name'
    | 'interestGroups'
    | 'workingGroups'
    | 'crnCalendar'
    | 'seminarSeries'
  >,
): CalendarResponse => ({
  id: calendarDataObject.googleCalendarId,
  name: calendarDataObject.name,
  color: calendarDataObject.color,
  interestGroups: calendarDataObject.interestGroups || [],
  workingGroups: calendarDataObject.workingGroups || [],
  crnCalendar: !!calendarDataObject.crnCalendar,
  seminarSeries: !!calendarDataObject.seminarSeries,
});
