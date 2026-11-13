import { BasicCalendar, BasicCalendarResponse } from '../calendar-common';
import { FetchPaginationOptions, ListResponse } from '../common';
import { WorkingGroupDataObject, WorkingGroupResponse } from './working-group';
import { ProjectDataObject, ProjectResponse } from './project';

export interface CalendarDataObject extends BasicCalendar {
  projects?: Pick<ProjectDataObject, 'id' | 'title' | 'status'>[];
  workingGroups?: Pick<WorkingGroupDataObject, 'id' | 'title'>[];
  gp2Calendar?: boolean;
}

export type ListCalendarDataObject = ListResponse<CalendarDataObject>;

export interface CalendarResponse extends BasicCalendarResponse {
  projects: Pick<ProjectResponse, 'id' | 'title' | 'status'>[];
  workingGroups: Pick<WorkingGroupResponse, 'id' | 'title'>[];
  gp2Calendar: boolean;
}

export type ListCalendarResponse = ListResponse<CalendarResponse>;

export type FetchCalendarOptions = FetchPaginationOptions;

export const gp2CalendarName = 'GP2 Hub';
