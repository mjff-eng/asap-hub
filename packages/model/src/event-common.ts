import { BasicCalendarResponse } from './calendar-common';
import { AllOrNone } from './common';

export const MEETING_LINK_AVAILABLE_HOURS_BEFORE_EVENT: number = 24;
export const EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT: number = 1;
export const EVENT_CONSIDERED_IN_PROGRESS_MINUTES_BEFORE_EVENT: number = 5;

export const eventStatus = ['Confirmed', 'Tentative', 'Cancelled'] as const;
export type EventStatus = (typeof eventStatus)[number];
export const isEventStatus = (status: string | null): status is EventStatus =>
  eventStatus.includes(status as EventStatus);

export interface BasicEvent {
  id: string;

  startDate: string;
  startDateTimeZone: string;
  startDateTimestamp: number;
  endDate: string;
  endDateTimeZone: string;
  endDateTimestamp: number;

  title: string;
  description?: string;
  status: EventStatus;
  hidden?: boolean;
  recurring?: boolean;
  lastModifiedDate: string;
  thumbnail?: string;
  googleId?: string;
  copyMeetingLink?: boolean;

  // These are typically added around the date when the event happens.
  // `null` means it is not intended to add materials to the event in the future.
  notes?: string | null;
  videoRecording?: string | null;
  presentation?: string | null;
  meetingMaterials:
    | {
        title: string;
        url: string;
      }[]
    | null;
  meetingLink?: string;
  inPerson?: boolean;

  calendar: BasicCalendarResponse;
  notesUpdatedAt?: string;
  videoRecordingUpdatedAt?: string;
  presentationUpdatedAt?: string;
}

export const eventMaterialTypes: ReadonlyArray<
  keyof Pick<
    BasicEvent,
    'notes' | 'videoRecording' | 'presentation' | 'meetingMaterials'
  >
> = ['notes', 'videoRecording', 'presentation', 'meetingMaterials'];

export type SortOptions = AllOrNone<{
  sortBy: 'startDate' | 'endDate';
  sortOrder: 'asc' | 'desc';
}>;
