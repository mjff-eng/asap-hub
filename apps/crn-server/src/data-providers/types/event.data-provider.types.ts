import {
  DataProvider,
  EventCreateDataObject,
  EventDataObject,
  EventUpdateDataObject,
  EventUpdateDetailsDataObject,
  FetchEventsOptions,
  InterestGroupTeamMembership,
} from '@asap-hub/model';
import { ExistingEventAttendance } from '../../utils/event-attendance';

export type UpcomingEvent = {
  id: string;
  endDate: string;
  attendance: ExistingEventAttendance[];
};

export type EventDataProvider = DataProvider<
  EventDataObject,
  EventDataObject,
  FetchEventsOptions,
  EventCreateDataObject,
  null,
  EventUpdateDataObject
> & {
  updateEventDetails: (
    id: string,
    data: EventUpdateDetailsDataObject,
  ) => Promise<void>;
  fetchInterestGroupMembershipsByCalendarId: (
    calendarId: string,
  ) => Promise<InterestGroupTeamMembership[]>;
  fetchUpcomingEventsByCalendarId: (
    calendarId: string,
    now: Date,
  ) => Promise<UpcomingEvent[]>;
};
