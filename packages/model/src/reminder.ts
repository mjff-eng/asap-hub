import { ListResponse } from './common';
import { EventResponse } from './event';
import { ManuscriptDataObject } from './manuscript';
import {
  ResearchOutputDataObject,
  ResearchOutputDraftDataObject,
  ResearchOutputPublishedDataObject,
} from './research-output';

type ReminderEntity =
  | 'Research Output'
  | 'Event'
  | 'Research Output Version'
  | 'Manuscript'
  | 'Discussion';

type ResearchOutputReminderType =
  | 'Published'
  | 'Draft'
  | 'In Review'
  | 'Switch To Draft';

export type EventReminderType =
  | 'Happening Today'
  | 'Happening Now'
  | 'Video Updated'
  | 'Presentation Updated'
  | 'Notes Updated'
  | 'Share Presentation'
  | 'Publish Material'
  | 'Upload Presentation';

type ManuscriptReminderType =
  | 'Manuscript Created'
  | 'Manuscript Resubmitted'
  | 'Manuscript Status Updated';

type DiscussionReminderType =
  | 'Discussion Created by Grantee'
  | 'Discussion Created by Open Science Member'
  | 'Discussion Replied To by Grantee'
  | 'Discussion Replied To by Open Science Member';

type ReminderType =
  | ResearchOutputReminderType
  | EventReminderType
  | ManuscriptReminderType
  | DiscussionReminderType;

interface Reminder {
  id: string;
  entity: ReminderEntity;
  type: ReminderType;
  data: unknown;
}

interface ResearchOutputReminder extends Reminder {
  entity: 'Research Output';
  type: ResearchOutputReminderType;
}

export interface ReminderEventResponse extends EventResponse {
  videoRecordingUpdatedAt: string;
  presentationUpdatedAt: string;
  notesUpdatedAt: string;
}

interface EventReminder extends Reminder {
  entity: 'Event';
  type: EventReminderType;
}

export interface ResearchOutputPublishedReminder
  extends ResearchOutputReminder {
  entity: 'Research Output';
  type: 'Published';
  data: {
    researchOutputId: ResearchOutputPublishedDataObject['id'];
    documentType: ResearchOutputPublishedDataObject['documentType'];
    title: ResearchOutputPublishedDataObject['title'];
    addedDate: ResearchOutputPublishedDataObject['addedDate'];
    statusChangedBy: string;
    associationType: 'team' | 'working group' | 'project';
    associationName: string;
  };
}

export interface ResearchOutputDraftReminder extends ResearchOutputReminder {
  entity: 'Research Output';
  type: 'Draft';
  data: {
    researchOutputId: ResearchOutputDraftDataObject['id'];
    title: ResearchOutputDraftDataObject['title'];
    createdDate: ResearchOutputDraftDataObject['created'];
    createdBy: string;
    associationType: 'team' | 'working group' | 'project';
    associationName: string;
  };
}

export interface ResearchOutputInReviewReminder extends ResearchOutputReminder {
  entity: 'Research Output';
  type: 'In Review';
  data: {
    researchOutputId: ResearchOutputDraftDataObject['id'];
    title: ResearchOutputDraftDataObject['title'];
    documentType: ResearchOutputPublishedDataObject['documentType'];
    createdDate: ResearchOutputDraftDataObject['created'];
    associationType: 'team' | 'working group' | 'project';
    associationName: string;
    statusChangedBy: string;
  };
}

export interface ResearchOutputSwitchToDraftReminder
  extends ResearchOutputReminder {
  entity: 'Research Output';
  type: 'Switch To Draft';
  data: {
    researchOutputId: ResearchOutputDraftDataObject['id'];
    title: ResearchOutputDraftDataObject['title'];
    documentType: ResearchOutputPublishedDataObject['documentType'];
    statusChangedAt: string;
    associationType: 'team' | 'working group';
    associationName: string;
    statusChangedBy: string;
    isProjectOutput?: boolean;
  };
}

export interface ResearchOutputVersionPublishedReminder extends Reminder {
  entity: 'Research Output Version';
  type: 'Published';
  data: {
    researchOutputId: ResearchOutputDataObject['id'];
    title: ResearchOutputDataObject['title'];
    documentType: ResearchOutputDataObject['documentType'];
    publishedAt: string;
    associationType: 'team' | 'working group' | 'project';
    associationName: string;
  };
}

export interface ManuscriptCreatedReminder extends Reminder {
  entity: 'Manuscript';
  type: 'Manuscript Created';
  data: {
    manuscriptId: ManuscriptDataObject['id'];
    title: ManuscriptDataObject['title'];
    teams: string;
    createdBy: string;
    publishedAt: string;
  };
}

export interface ManuscriptResubmittedReminder extends Reminder {
  entity: 'Manuscript';
  type: 'Manuscript Resubmitted';
  data: {
    manuscriptId: ManuscriptDataObject['id'];
    title: ManuscriptDataObject['title'];
    teams: string;
    resubmittedBy: string;
    resubmittedAt: string;
  };
}

export interface ManuscriptStatusUpdatedReminder extends Reminder {
  entity: 'Manuscript';
  type: 'Manuscript Status Updated';
  data: {
    manuscriptId: ManuscriptDataObject['id'];
    title: ManuscriptDataObject['title'];
    status: ManuscriptDataObject['status'];
    previousStatus: ManuscriptDataObject['status'];
    teams: string;
    updatedBy: string;
    updatedAt: string;
  };
}

export interface DiscussionCreatedReminder extends Reminder {
  entity: 'Discussion';
  type:
    | 'Discussion Created by Open Science Member'
    | 'Discussion Created by Grantee';
  data: {
    manuscriptId: ManuscriptDataObject['id'];
    title: ManuscriptDataObject['title'];
    manuscriptTeams: string;
    createdBy: string;
    publishedAt: string;
  };
}

export interface DiscussionRepliedToReminder extends Reminder {
  entity: 'Discussion';
  type:
    | 'Discussion Replied To by Open Science Member'
    | 'Discussion Replied To by Grantee';
  data: {
    manuscriptId: ManuscriptDataObject['id'];
    title: ManuscriptDataObject['title'];
    manuscriptTeams: string;
    createdBy: string;
    publishedAt: string;
  };
}

export interface EventHappeningTodayReminder extends EventReminder {
  entity: 'Event';
  type: 'Happening Today';
  data: {
    eventId: ReminderEventResponse['id'];
    title: ReminderEventResponse['title'];
    startDate: ReminderEventResponse['startDate'];
  };
}

export interface EventHappeningNowReminder extends EventReminder {
  entity: 'Event';
  type: 'Happening Now';
  data: {
    eventId: ReminderEventResponse['id'];
    title: ReminderEventResponse['title'];
    startDate: ReminderEventResponse['startDate'];
    endDate: ReminderEventResponse['endDate'];
  };
}

export interface SharePresentationReminder extends EventReminder {
  entity: 'Event';
  type: 'Share Presentation';
  data: {
    pmId?: string;
    eventId: ReminderEventResponse['id'];
    title: ReminderEventResponse['title'];
    endDate: ReminderEventResponse['endDate'];
  };
}

export interface PublishMaterialReminder extends EventReminder {
  entity: 'Event';
  type: 'Publish Material';
  data: {
    eventId: ReminderEventResponse['id'];
    title: ReminderEventResponse['title'];
    endDate: ReminderEventResponse['endDate'];
  };
}

export interface UploadPresentationReminder extends EventReminder {
  entity: 'Event';
  type: 'Upload Presentation';
  data: {
    eventId: ReminderEventResponse['id'];
    title: ReminderEventResponse['title'];
    endDate: ReminderEventResponse['endDate'];
  };
}

export interface VideoEventReminder extends EventReminder {
  entity: 'Event';
  type: 'Video Updated';
  data: {
    eventId: ReminderEventResponse['id'];
    title: ReminderEventResponse['title'];
    videoRecordingUpdatedAt: ReminderEventResponse['videoRecordingUpdatedAt'];
  };
}

export interface EventNotesReminder extends EventReminder {
  entity: 'Event';
  type: 'Notes Updated';
  data: {
    eventId: ReminderEventResponse['id'];
    title: ReminderEventResponse['title'];
    notesUpdatedAt: ReminderEventResponse['notesUpdatedAt'];
  };
}

export interface PresentationUpdatedReminder extends EventReminder {
  entity: 'Event';
  type: 'Presentation Updated';
  data: {
    eventId: ReminderEventResponse['id'];
    title: ReminderEventResponse['title'];
    presentationUpdatedAt: ReminderEventResponse['presentationUpdatedAt'];
  };
}

export type ManuscriptReminder =
  | ManuscriptCreatedReminder
  | ManuscriptResubmittedReminder
  | ManuscriptStatusUpdatedReminder;

export type DiscussionReminder =
  | DiscussionCreatedReminder
  | DiscussionRepliedToReminder;

export type ReminderDataObject =
  | ResearchOutputPublishedReminder
  | ResearchOutputDraftReminder
  | ResearchOutputInReviewReminder
  | ResearchOutputSwitchToDraftReminder
  | ResearchOutputVersionPublishedReminder
  | EventHappeningTodayReminder
  | EventHappeningNowReminder
  | VideoEventReminder
  | PresentationUpdatedReminder
  | EventNotesReminder
  | SharePresentationReminder
  | PublishMaterialReminder
  | UploadPresentationReminder
  | ManuscriptReminder
  | DiscussionReminder;

export type ListReminderDataObject = ListResponse<ReminderDataObject>;

export type FetchRemindersOptions = {
  userId: string;
  timezone: string;
};

export type ReminderResponse = {
  description: string;
  subtext?: string;
  date?: string;
  entity: ReminderEntity;
  href?: string;
  id: string;
};
export type ListReminderResponse = ListResponse<ReminderResponse>;
