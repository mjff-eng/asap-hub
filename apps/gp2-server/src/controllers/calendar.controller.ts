import { NotFoundError } from '@asap-hub/errors';
import { CalendarUpdateRequest, gp2 } from '@asap-hub/model';

export default class CalendarsController {
  constructor(private dataProvider: gp2.CalendarDataProvider) {}

  async fetch(): Promise<gp2.ListCalendarResponse> {
    const { total, items: calendars } = await this.dataProvider.fetch({
      active: true,
    });

    const items =
      total > 0
        ? calendars.map(parseCalendarDataObjectToResponse).sort((a, b) => {
            const hasRelationship = (calendar: gp2.CalendarResponse) =>
              calendar.projects.length > 0 || calendar.workingGroups.length > 0;
            const aHasRelationship = hasRelationship(a);
            const bHasRelationship = hasRelationship(b);

            if (aHasRelationship === bHasRelationship) {
              return a.name.localeCompare(b.name, undefined, {
                sensitivity: 'base',
              });
            }

            return aHasRelationship && !bHasRelationship ? 1 : -1;
          })
        : [];

    return { total, items };
  }

  async fetchById(calendarId: string): Promise<gp2.CalendarResponse> {
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
  ): Promise<gp2.CalendarResponse> {
    await this.dataProvider.update(calendarId, data);
    return this.fetchById(calendarId);
  }
}

export const parseCalendarDataObjectToResponse = (
  calendarDataObject: Pick<
    gp2.CalendarDataObject,
    | 'googleCalendarId'
    | 'color'
    | 'name'
    | 'projects'
    | 'workingGroups'
    | 'gp2Calendar'
  >,
): gp2.CalendarResponse => ({
  id: calendarDataObject.googleCalendarId,
  name: calendarDataObject.name,
  color: calendarDataObject.color,
  projects: calendarDataObject.projects || [],
  workingGroups: calendarDataObject.workingGroups || [],
  gp2Calendar: Boolean(calendarDataObject.gp2Calendar),
});
