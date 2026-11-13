import { FetchOptions, ListResponse } from '../common';
import { BasicEvent, SortOptions } from '../event-common';
import { CalendarResponse } from './calendar';
import { TagDataObject } from './tag';
import { ProjectResponse } from './project';
import { WorkingGroupResponse } from './working-group';
import { RelatedOutputs } from './output';

export interface EventSpeakerUser {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  avatarUrl?: string;
  alumniSinceDate?: string;
}
export interface EventSpeakerExternalUser {
  name: string;
  orcid?: string;
}
export interface SpeakerInfo {
  speaker: EventSpeakerUser | EventSpeakerExternalUser | undefined;
}
export type EventSpeaker = SpeakerInfo & { topic?: string };

export interface EventDataObject extends Omit<BasicEvent, 'tags'> {
  calendar: CalendarResponse;
  project?: Pick<ProjectResponse, 'id' | 'title' | 'status'>;
  workingGroup?: Pick<WorkingGroupResponse, 'id' | 'title'>;
  speakers: EventSpeaker[];
  tags: TagDataObject[];
  relatedOutputs?: RelatedOutputs[];
}

export type ListEventDataObject = ListResponse<EventDataObject>;
export type EventResponse = EventDataObject & {
  eventTypes: string[];
};
export type ListEventResponse = ListResponse<EventResponse>;

export type EventConstraint = {
  userId?: string;
  workingGroupId?: string;
  projectId?: string;
};

export type EventCreateDataObject = Pick<
  EventDataObject,
  | 'title'
  | 'description'
  | 'startDate'
  | 'startDateTimeZone'
  | 'endDate'
  | 'endDateTimeZone'
  | 'status'
  | 'meetingLink'
  | 'inPerson'
> & {
  googleId: string;
  calendar: string;
  hidden: boolean;
};

export type EventUpdateDataObject = Partial<
  Omit<EventDataObject, 'calendar' | 'tags'> & {
    calendar: string;
    tags?: Omit<TagDataObject, 'name'>[] | null;
  }
>;

export type EventCreateRequest = EventCreateDataObject;
export type EventUpdateRequest = EventUpdateDataObject;

type BaseFilterOptions = {
  workingGroupId?: never;
  projectId?: never;
  userId?: never;
  externalUserId?: never;
  googleId?: never;
  hidden?: never;
  calendarId?: never;
};

type ExclusiveFilterOption<T> = Omit<BaseFilterOptions, keyof T> & T;

type FilterOptions =
  | ExclusiveFilterOption<{ workingGroupId?: string }>
  | ExclusiveFilterOption<{ projectId?: string }>
  | ExclusiveFilterOption<{ userId?: string }>
  | ExclusiveFilterOption<{ externalUserId?: string }>
  | ExclusiveFilterOption<{
      googleId?: string;
      hidden?: boolean;
    }>
  | ExclusiveFilterOption<{ calendarId?: string }>;

export const eventWorkingGroups = 'Working Groups';
export const eventProjects = 'Projects';
export const eventGP2Hub = 'GP2 Hub';

export type EventType =
  | typeof eventWorkingGroups
  | typeof eventProjects
  | typeof eventGP2Hub;

export type FetchEventSearchFilter = {
  eventType?: EventType[];
};

export type FetchEventsOptions = {
  after?: string;
  before?: string;
} & SortOptions &
  FetchOptions<FilterOptions>;
