import { BasicCalendar, BasicCalendarResponse } from './calendar-common';
import { FetchPaginationOptions, ListResponse } from './common';
import {
  InterestGroupDataObject,
  InterestGroupResponse,
} from './interest-group';
import { WorkingGroupDataObject, WorkingGroupResponse } from './working-group';

export interface CalendarDataObject extends BasicCalendar {
  interestGroups?: Pick<InterestGroupDataObject, 'id' | 'active'>[];
  workingGroups?: Pick<WorkingGroupDataObject, 'id' | 'complete'>[];
  crnCalendar?: boolean;
  seminarSeries?: boolean;
}

export type ListCalendarDataObject = ListResponse<CalendarDataObject>;

export interface CalendarResponse extends BasicCalendarResponse {
  interestGroups: Pick<InterestGroupResponse, 'id' | 'active'>[];
  workingGroups: Pick<WorkingGroupResponse, 'id' | 'complete'>[];
  crnCalendar: boolean;
  seminarSeries: boolean;
}

export type ListCalendarResponse = ListResponse<CalendarResponse>;

export type FetchCalendarOptions = FetchPaginationOptions;
