import {
  DiscussionsFilter,
  EventsFilter,
  FETCH_DISCUSSION_REMINDERS,
  FETCH_MESSAGE_REMINDERS,
  FETCH_REMINDERS,
  FETCH_TEAM_PROJECT_MANAGER,
  FetchDiscussionRemindersQuery,
  FetchDiscussionRemindersQueryVariables,
  FetchMessageRemindersQuery,
  FetchMessageRemindersQueryVariables,
  FetchRemindersQuery,
  FetchRemindersQueryVariables,
  FetchTeamProjectManagerQuery,
  FetchTeamProjectManagerQueryVariables,
  GraphQLClient,
  ResearchOutputsFilter,
  ResearchOutputVersionsFilter,
  ManuscriptsFilter,
  Maybe,
  MessagesFilter,
} from '@asap-hub/contentful';
import {
  DiscussionCreatedReminder,
  DiscussionReminder,
  DiscussionRepliedToReminder,
  EventHappeningNowReminder,
  EventHappeningTodayReminder,
  EventNotesReminder,
  FetchRemindersOptions,
  isResearchOutputDocumentType,
  ListReminderDataObject,
  ManuscriptCreatedReminder,
  ManuscriptReminder,
  ManuscriptResubmittedReminder,
  ManuscriptStatus,
  ManuscriptStatusUpdatedReminder,
  PresentationUpdatedReminder,
  PublishMaterialReminder,
  ReminderDataObject,
  ResearchOutputDraftReminder,
  ResearchOutputInReviewReminder,
  ResearchOutputPublishedReminder,
  ResearchOutputSwitchToDraftReminder,
  ResearchOutputVersionPublishedReminder,
  Role,
  SharePresentationReminder,
  TeamRole,
  UploadPresentationReminder,
  VideoEventReminder,
} from '@asap-hub/model';
import {
  cleanArray,
  getReferenceDates,
  inLast24Hours,
  inLast7Days,
  getUserName,
} from '@asap-hub/server-common';
import { DateTime } from 'luxon';
import { isCMSAdministrator } from '@asap-hub/validation';
import { ReminderDataProvider } from '../types';

type EventCollection = FetchRemindersQuery['eventsCollection'];
type EventItem = NonNullable<NonNullable<EventCollection>['items'][number]>;
type ManuscriptCollection = FetchRemindersQuery['manuscriptsCollection'];
export type ManuscriptItem = NonNullable<
  NonNullable<ManuscriptCollection>['items'][number]
>;
type ResearchOutputCollection =
  FetchRemindersQuery['researchOutputsCollection'];
type ResearchOutputItem = NonNullable<
  NonNullable<ResearchOutputCollection>['items'][number]
>;
type ResearchOutputVersionCollection =
  FetchRemindersQuery['researchOutputVersionsCollection'];
type ResearchOutputVersionItem = NonNullable<
  NonNullable<ResearchOutputVersionCollection>['items'][number]
>;

type User = FetchRemindersQuery['users'];

type DiscussionCollection =
  FetchDiscussionRemindersQuery['discussionsCollection'];
type MessageCollection = FetchMessageRemindersQuery['messagesCollection'];
export type DiscussionItem = NonNullable<
  NonNullable<DiscussionCollection>['items'][number]
>;
export type MessageItem = NonNullable<
  NonNullable<MessageCollection>['items'][number]
>;

type DiscussionManuscriptVersion = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<DiscussionItem['linkedFrom']>['manuscriptsCollection']
    >['items'][number]
  >['versionsCollection']
>['items'][number];

type ManuscriptVersionTeamsCollection = NonNullable<
  NonNullable<DiscussionManuscriptVersion>['teamsCollection']
>;

type ManuscriptVersion = NonNullable<
  NonNullable<ManuscriptItem['versionsCollection']>['items'][0]
> & {
  teamsCollection?: ManuscriptVersionTeamsCollection;
};

export class ReminderContentfulDataProvider implements ReminderDataProvider {
  constructor(private contentfulClient: GraphQLClient) {}

  async fetchById(): Promise<null> {
    throw new Error('Method not implemented.');
  }

  async fetch(options: FetchRemindersOptions): Promise<ListReminderDataObject> {
    const { timezone, userId } = options;
    const eventFilter = getEventFilter(timezone);
    const researchOutputFilter = getResearchOutputFilter(timezone);
    const manuscriptFilter = getManuscriptFilter(timezone);
    const researchOutputVersionsFilter =
      getResearchOutputVersionsFilter(timezone);
    const discussionFilter = getDiscussionFilter(timezone);
    const messageFilter = getMessageFilter(timezone);

    const {
      eventsCollection,
      researchOutputsCollection,
      users: user,
      researchOutputVersionsCollection,
      manuscriptsCollection,
    } = await this.contentfulClient.request<
      FetchRemindersQuery,
      FetchRemindersQueryVariables
    >(FETCH_REMINDERS, {
      userId,
      eventFilter,
      researchOutputFilter,
      researchOutputVersionsFilter,
      manuscriptFilter,
    });

    const { discussionsCollection } = await this.contentfulClient.request<
      FetchDiscussionRemindersQuery,
      FetchDiscussionRemindersQueryVariables
    >(FETCH_DISCUSSION_REMINDERS, {
      discussionFilter,
    });

    const { messagesCollection } = await this.contentfulClient.request<
      FetchMessageRemindersQuery,
      FetchMessageRemindersQueryVariables
    >(FETCH_MESSAGE_REMINDERS, {
      messageFilter,
    });

    const fetchTeamProjectManager = async (
      teamId: string,
    ): Promise<FetchTeamProjectManagerQuery['teamMembershipCollection']> => {
      const { teamMembershipCollection } = await this.contentfulClient.request<
        FetchTeamProjectManagerQuery,
        FetchTeamProjectManagerQueryVariables
      >(FETCH_TEAM_PROJECT_MANAGER, { id: teamId });

      return teamMembershipCollection;
    };

    const eventsCollectionItems = cleanArray(eventsCollection?.items);
    const researchOutputsCollectionItems = cleanArray(
      researchOutputsCollection?.items,
    );
    const researchOutputVersionCollectionItems = cleanArray(
      researchOutputVersionsCollection?.items,
    );
    const manuscriptsCollectionItems = cleanArray(manuscriptsCollection?.items);
    const discussionsCollectionItems = cleanArray(discussionsCollection?.items);
    const messagesCollectionItems = cleanArray(messagesCollection?.items);

    const publishedResearchOutputVersionReminders =
      getPublishedResearchOutputVersionRemindersFromQuery(
        researchOutputVersionCollectionItems,
        user,
        timezone,
      );

    const publishedResearchOutputReminders =
      getPublishedResearchOutputRemindersFromQuery(
        researchOutputsCollectionItems,
        user,
        timezone,
      );

    const draftResearchOutputReminders =
      getDraftResearchOutputRemindersFromQuery(
        researchOutputsCollectionItems,
        user,
        timezone,
      );

    const inReviewResearchOutputReminders =
      getInReviewResearchOutputRemindersFromQuery(
        researchOutputsCollectionItems,
        user,
      );

    const switchToDraftResearchOutputReminders =
      getSwitchToDraftResearchOutputRemindersFromQuery(
        researchOutputsCollectionItems,
        user,
        timezone,
      );

    const eventHappeningNowOrTodayReminders =
      getEventHappeningNowOrTodayRemindersFromQuery(
        eventsCollectionItems,
        timezone,
      );

    const eventsEndedInLast72Hours = eventsCollectionItems.filter((event) =>
      hasEventEndedInLast72hours(event, timezone),
    );

    const sharePresentationReminders =
      await getSharePresentationRemindersFromQuery(
        eventsEndedInLast72Hours,
        user,
        fetchTeamProjectManager,
      );

    const publishPresentationReminders = getPublishMaterialRemindersFromQuery(
      eventsEndedInLast72Hours,
      user,
    );

    const uploadPresentationReminders = getUploadPresentationRemindersFromQuery(
      eventsEndedInLast72Hours,
      user,
    );

    const eventMaterialsReminders = getEventMaterialsRemindersFromQuery(
      eventsCollectionItems,
      timezone,
    );

    const versionReminderIds = publishedResearchOutputVersionReminders.map(
      (reminder) => reminder.data.researchOutputId,
    );

    const manuscriptReminders = getManuscriptRemindersFromQuery(
      manuscriptsCollectionItems,
      user,
      userId,
      timezone,
    );

    const discussionReminders = getDiscussionRemindersFromQuery(
      discussionsCollectionItems,
      user,
      userId,
      timezone,
    );

    const repliesReminders = getReplyRemindersFromQuery(
      messagesCollectionItems,
      user,
      userId,
    );

    const reminders = [
      ...publishedResearchOutputReminders.filter(
        (reminder) =>
          !versionReminderIds.includes(reminder.data.researchOutputId),
      ),
      ...draftResearchOutputReminders,
      ...inReviewResearchOutputReminders,
      ...switchToDraftResearchOutputReminders,
      ...publishedResearchOutputVersionReminders,
      ...eventHappeningNowOrTodayReminders,
      ...sharePresentationReminders,
      ...publishPresentationReminders,
      ...uploadPresentationReminders,
      ...eventMaterialsReminders,
      ...manuscriptReminders,
      ...discussionReminders,
      ...repliesReminders,
    ];

    const sortedReminders = reminders.sort((reminderA, reminderB) => {
      const aStartDate = getSortDate(reminderA);
      const bStartDate = getSortDate(reminderB);

      return bStartDate.diff(aStartDate).as('seconds');
    });

    return {
      total: sortedReminders.length,
      items: sortedReminders,
    };
  }
}

export const getSortDate = (reminder: ReminderDataObject): DateTime => {
  const typeToDateField: Record<
    ReminderDataObject['entity'],
    Partial<Record<ReminderDataObject['type'], string>>
  > = {
    'Research Output': {
      Published: 'addedDate',
      Draft: 'createdDate',
      'In Review': 'createdDate',
      'Switch To Draft': 'statusChangedAt',
    },
    'Research Output Version': {
      Published: 'publishedAt',
    },
    Manuscript: {
      'Manuscript Created': 'publishedAt',
      'Manuscript Status Updated': 'updatedAt',
      'Manuscript Resubmitted': 'resubmittedAt',
    },
    Discussion: {
      'Discussion Created by Grantee': 'publishedAt',
      'Discussion Created by Open Science Member': 'publishedAt',
      'Discussion Replied To by Grantee': 'publishedAt',
      'Discussion Replied To by Open Science Member': 'publishedAt',
    },
    Event: {
      'Happening Today': 'startDate',
      'Happening Now': 'endDate',
      'Video Updated': 'videoRecordingUpdatedAt',
      'Presentation Updated': 'presentationUpdatedAt',
      'Notes Updated': 'notesUpdatedAt',
      'Share Presentation': 'endDate',
      'Publish Material': 'endDate',
      'Upload Presentation': 'endDate',
    },
  };

  const dateField =
    typeToDateField[reminder.entity][reminder.type] || 'endDate';
  return DateTime.fromISO(
    reminder.data[dateField as keyof typeof reminder.data],
  );
};

export const getManuscriptFilter = (zone: string): ManuscriptsFilter => {
  const { last7DaysISO } = getReferenceDates(zone);
  return {
    OR: [
      { sys: { firstPublishedAt_gte: last7DaysISO } },
      { sys: { publishedAt_gte: last7DaysISO } },
      { statusUpdatedAt_gte: last7DaysISO },
    ],
  };
};

export const getDiscussionFilter = (zone: string): DiscussionsFilter => {
  const { last7DaysISO } = getReferenceDates(zone);
  return {
    OR: [{ sys: { firstPublishedAt_gte: last7DaysISO } }],
  };
};

export const getMessageFilter = (zone: string): MessagesFilter => {
  const { last7DaysISO } = getReferenceDates(zone);
  return { sys: { firstPublishedAt_gte: last7DaysISO } };
};

export const getResearchOutputFilter = (
  zone: string,
): ResearchOutputsFilter => {
  const { last24HoursISO } = getReferenceDates(zone);
  return {
    OR: [
      {
        AND: [
          { addedDate_gte: last24HoursISO },
          { sys: { publishedVersion_exists: true } },
        ],
      },
      {
        AND: [
          { createdDate_gte: last24HoursISO },
          { sys: { publishedVersion_exists: false } },
          { addedDate_exists: false },
          { isInReview: false },
        ],
      },
      {
        AND: [
          { sys: { publishedVersion_exists: false } },
          { addedDate_exists: false },
          { isInReview: true },
        ],
      },
      {
        AND: [
          { sys: { publishedVersion_exists: false } },
          { addedDate_exists: false },
          { statusChangedAt_gte: last24HoursISO },
          { isInReview: false },
        ],
      },
    ],
  };
};

export const getResearchOutputVersionsFilter = (
  zone: string,
): ResearchOutputVersionsFilter => {
  const { last24HoursISO } = getReferenceDates(zone);
  return { sys: { publishedAt_gte: last24HoursISO } };
};

export const getEventFilter = (zone: string): EventsFilter => {
  const {
    lastMidnightISO,
    todayMidnightISO,
    last24HoursISO,
    last72HoursISO,
    now,
  } = getReferenceDates(zone);
  return {
    AND: [{ hidden: false, status_not: 'Cancelled' }],
    OR: [
      { videoRecordingUpdatedAt_gte: last24HoursISO },
      { presentationUpdatedAt_gte: last24HoursISO },
      { notesUpdatedAt_gte: last24HoursISO },
      {
        AND: [
          { startDate_gte: lastMidnightISO },
          { startDate_lte: todayMidnightISO },
        ],
      },
      {
        AND: [{ endDate_gte: last72HoursISO }, { endDate_lte: now }],
      },
    ],
  };
};

const convertEventDate = (date: string, zone: string) =>
  DateTime.fromISO(date, { zone }).toUTC();

const hasEventEndedInLast72hours = (event: EventItem, zone: string) => {
  const eventEndDate = convertEventDate(event.endDate, zone);
  const { last72HoursISO, now } = getReferenceDates(zone);

  const eventHasEnded = eventEndDate < now;
  const endedInLast72Hours = eventEndDate >= last72HoursISO;

  return eventHasEnded && endedInLast72Hours;
};

const getEventHappeningNowOrTodayRemindersFromQuery = (
  eventsCollection: EventItem[],
  zone: string,
): (EventHappeningTodayReminder | EventHappeningNowReminder)[] => {
  const { lastMidnightISO, now, todayMidnightISO } = getReferenceDates(zone);

  const eventReminders = eventsCollection.reduce<
    (EventHappeningTodayReminder | EventHappeningNowReminder)[]
  >((events, event) => {
    const startDate = convertEventDate(event.startDate, zone);
    const endDate = convertEventDate(event.endDate, zone);

    if (startDate < now && now < endDate) {
      return [
        ...events,
        {
          id: `event-happening-now-${event.sys.id}`,
          entity: 'Event',
          type: 'Happening Now',
          data: {
            eventId: event.sys.id,
            title: event.title || '',
            startDate: event.startDate,
            endDate: event.endDate,
          },
        },
      ];
    }

    if (
      startDate > lastMidnightISO &&
      startDate < todayMidnightISO &&
      now < endDate
    ) {
      return [
        ...events,
        {
          id: `event-happening-today-${event.sys.id}`,
          entity: 'Event',
          type: 'Happening Today',
          data: {
            eventId: event.sys.id,
            title: event.title || '',
            startDate: event.startDate,
          },
        },
      ];
    }

    return events;
  }, []);

  return eventReminders;
};

const getSharePresentationRemindersFromQuery = async (
  eventsEndedInLast72Hours: EventItem[],
  users: User,
  fetchTeamProjectManager: (
    teamId: string,
  ) => Promise<FetchTeamProjectManagerQuery['teamMembershipCollection']>,
): Promise<SharePresentationReminder[]> => {
  const sharePresentationReminders: SharePresentationReminder[] = [];

  const eventsIAmASpeaker = users?.linkedFrom?.eventSpeakersCollection?.items
    .map((event) => ({
      eventId: event?.linkedFrom?.eventsCollection?.items[0]?.sys.id,
      teamId: event?.team?.sys.id,
    }))
    .filter((eventData) => !!eventData.eventId && !!eventData.teamId);

  const eventIds = eventsIAmASpeaker?.map((e) => e.eventId);

  const reminderEvents = eventsEndedInLast72Hours.filter(
    (event) => eventIds?.includes(event.sys.id),
  );

  for (let i = 0; i < reminderEvents.length; i += 1) {
    const event = reminderEvents[i];
    if (event) {
      const teamId = eventsIAmASpeaker?.filter(
        (e) => e.eventId === event.sys.id,
      )[0]?.teamId;

      const teamRole = users?.teamsCollection?.items.find(
        (t) => t?.team?.sys.id === teamId,
      )?.role;

      const isAdmin =
        isCMSAdministrator(users?.role as Role, teamRole as TeamRole) ||
        teamRole === 'Project Manager';

      if (!isAdmin && teamId) {
        const teamMembershipCollection = await fetchTeamProjectManager(teamId);
        const firstProjectManager = teamMembershipCollection?.items.find(
          (t) => t?.linkedFrom?.usersCollection?.total !== 0,
        );
        const projectManagerId =
          firstProjectManager?.linkedFrom?.usersCollection?.items[0]?.sys.id;

        sharePresentationReminders.push({
          id: `share-presentation-${event.sys.id}`,
          entity: 'Event',
          type: 'Share Presentation',
          data: {
            pmId: projectManagerId,
            eventId: event.sys.id,
            title: event.title || '',
            endDate: event.endDate,
          },
        });
      }
    }
  }
  return sharePresentationReminders;
};

const getPublishMaterialRemindersFromQuery = (
  eventsEndedInLast72Hours: EventItem[],
  users: User,
): PublishMaterialReminder[] =>
  isCMSAdministrator(users?.role as Role)
    ? eventsEndedInLast72Hours.map((event) => ({
        id: `publish-material-${event.sys.id}`,
        entity: 'Event',
        type: 'Publish Material',
        data: {
          eventId: event.sys.id,
          title: event.title || '',
          endDate: event.endDate,
        },
      }))
    : [];

const getUploadPresentationRemindersFromQuery = (
  eventsEndedInLast72Hours: EventItem[],
  user: User,
): UploadPresentationReminder[] => {
  const uploadPresentationReminders: UploadPresentationReminder[] = [];

  if (isCMSAdministrator(user?.role as Role))
    return uploadPresentationReminders;

  const teamsIAmAProjectManager = user?.teamsCollection?.items
    .map((item) => {
      if (item?.role === 'Project Manager') {
        return item.team?.sys.id;
      }
      return null;
    })
    .filter(Boolean);

  eventsEndedInLast72Hours.forEach((event) => {
    const speakerTeams = event.speakersCollection?.items.map(
      (speaker) => speaker?.team?.sys.id,
    );

    const speakersTeamsIAmAProjectManager = speakerTeams?.filter(
      (value) => teamsIAmAProjectManager?.includes(value),
    );

    if (speakersTeamsIAmAProjectManager?.length) {
      uploadPresentationReminders.push({
        id: `upload-presentation-${event.sys.id}`,
        entity: 'Event',
        type: 'Upload Presentation',
        data: {
          eventId: event.sys.id,
          title: event.title || '',
          endDate: event.endDate,
        },
      });
    }
  });

  return uploadPresentationReminders;
};

const getEventMaterialsRemindersFromQuery = (
  eventsCollection: EventItem[],
  zone: string,
): (
  | VideoEventReminder
  | PresentationUpdatedReminder
  | EventNotesReminder
)[] => {
  const eventReminders = eventsCollection.reduce<
    (VideoEventReminder | PresentationUpdatedReminder | EventNotesReminder)[]
  >((events, event) => {
    const {
      sys: { id: eventId },
      title,
      videoRecordingUpdatedAt,
      presentationUpdatedAt,
      notesUpdatedAt,
    } = event;

    if (inLast24Hours(videoRecordingUpdatedAt, zone)) {
      events.push({
        id: `video-event-updated-${eventId}`,
        entity: 'Event',
        type: 'Video Updated',
        data: { eventId, title: title || '', videoRecordingUpdatedAt },
      });
    }

    if (inLast24Hours(presentationUpdatedAt, zone)) {
      events.push({
        id: `presentation-event-updated-${eventId}`,
        entity: 'Event',
        type: 'Presentation Updated',
        data: { eventId, title: title || '', presentationUpdatedAt },
      });
    }

    if (inLast24Hours(notesUpdatedAt, zone)) {
      events.push({
        id: `notes-event-updated-${eventId}`,
        entity: 'Event',
        type: 'Notes Updated',
        data: { eventId, title: title || '', notesUpdatedAt },
      });
    }

    return events;
  }, []);

  return eventReminders;
};

const getPublishedResearchOutputRemindersFromQuery = (
  researchOutputsCollectionItems: ResearchOutputItem[],
  user: User,
  zone: string,
): ResearchOutputPublishedReminder[] => {
  if (
    !user ||
    !user.teamsCollection?.items ||
    !researchOutputsCollectionItems.length
  ) {
    return [];
  }

  const userTeamIds = getUserTeamIds(user);
  const userWorkingGroupIds = getWorkingGroupIds(user);

  return researchOutputsCollectionItems.reduce<
    ResearchOutputPublishedReminder[]
  >((researchOutputReminders, researchOutput) => {
    const isPublished = !!researchOutput.sys.publishedAt;

    if (
      !researchOutput.title ||
      !researchOutput.documentType ||
      !isResearchOutputDocumentType(researchOutput.documentType) ||
      !isPublished ||
      !inLast24Hours(researchOutput.addedDate, zone)
    )
      return researchOutputReminders;

    const { associationName, associationType } =
      getAssociationNameAndType(researchOutput);
    const userName = getUserName(researchOutput);

    const researchOutputTeamIds = (researchOutput?.teamsCollection?.items || [])
      .filter((teamItem) => teamItem?.sys.id !== undefined)
      .map((teamItem) => teamItem?.sys.id as string);

    const researchOutputWorkingGroupId = researchOutput?.workingGroup?.sys.id;

    const isInTeam = researchOutputTeamIds.some((teamId) =>
      userTeamIds.includes(teamId),
    );

    const isInWorkingGroup = researchOutputWorkingGroupId
      ? userWorkingGroupIds.includes(researchOutputWorkingGroupId)
      : false;

    if (
      associationName &&
      associationType &&
      userName &&
      (((associationType === 'team' || associationType === 'project') &&
        isInTeam) ||
        (associationType === 'working group' && isInWorkingGroup))
    ) {
      const publishedBy = researchOutput.statusChangedBy
        ? `${researchOutput.statusChangedBy.firstName} ${researchOutput.statusChangedBy.lastName}`
        : userName;
      researchOutputReminders.push({
        id: `research-output-published-${researchOutput.sys.id}`,
        entity: 'Research Output',
        type: 'Published',
        data: {
          researchOutputId: researchOutput.sys.id,
          documentType: researchOutput.documentType,
          title: researchOutput.title,
          addedDate: researchOutput.addedDate,
          statusChangedBy: publishedBy,
          associationType,
          associationName,
        },
      });
    }

    return researchOutputReminders;
  }, []);
};

const getDraftResearchOutputRemindersFromQuery = (
  researchOutputsCollectionItems: ResearchOutputItem[],
  user: User,
  zone: string,
): ResearchOutputDraftReminder[] => {
  if (
    !user ||
    !user.teamsCollection?.items ||
    !researchOutputsCollectionItems.length
  ) {
    return [];
  }

  const userTeamIds = getUserTeamIds(user);
  const userWorkingGroupIds = getWorkingGroupIds(user);
  const isAsapStaff = user.role === 'Staff';

  return researchOutputsCollectionItems.reduce<ResearchOutputDraftReminder[]>(
    (researchOutputReminders, researchOutput) => {
      const userName = getUserName(researchOutput);
      const isPublished = !!researchOutput.sys.publishedAt;
      const isInReview = !!researchOutput.isInReview;
      const switchedToDraft = !!researchOutput.statusChangedBy;
      if (
        !researchOutput.title ||
        !researchOutput.documentType ||
        !isResearchOutputDocumentType(researchOutput.documentType) ||
        isPublished ||
        isInReview ||
        switchedToDraft ||
        !inLast24Hours(researchOutput.createdDate, zone)
      )
        return researchOutputReminders;

      const { associationName, associationType } =
        getAssociationNameAndType(researchOutput);

      const researchOutputTeamIds = (
        researchOutput?.teamsCollection?.items || []
      )
        .filter((teamItem) => teamItem?.sys.id !== undefined)
        .map((teamItem) => teamItem?.sys.id as string);

      const researchOutputWorkingGroupId = researchOutput?.workingGroup?.sys.id;

      const isInTeam = researchOutputTeamIds.some((teamId) =>
        userTeamIds.includes(teamId),
      );

      const isInWorkingGroup = researchOutputWorkingGroupId
        ? userWorkingGroupIds.includes(researchOutputWorkingGroupId)
        : false;

      if (
        associationName &&
        associationType &&
        userName &&
        (((associationType === 'team' || associationType === 'project') &&
          isInTeam) ||
          (associationType === 'working group' && isInWorkingGroup) ||
          isAsapStaff)
      ) {
        researchOutputReminders.push({
          id: `research-output-draft-${researchOutput.sys.id}`,
          entity: 'Research Output',
          type: 'Draft',
          data: {
            researchOutputId: researchOutput.sys.id,
            title: researchOutput.title,
            createdDate: researchOutput.createdDate,
            createdBy: userName,
            associationType,
            associationName,
          },
        });
      }

      return researchOutputReminders;
    },
    [],
  );
};

const getInReviewResearchOutputRemindersFromQuery = (
  researchOutputsCollectionItems: ResearchOutputItem[],
  user: User,
): ResearchOutputInReviewReminder[] => {
  if (
    !user ||
    !user.teamsCollection?.items ||
    !researchOutputsCollectionItems.length
  ) {
    return [];
  }

  const userProjectManagerTeamIds = getUserProjectManagerTeamIds(user);
  const userProjectManagerWorkingGroupIds =
    getUserProjectManagerWorkingGroupIds(user);
  const isAsapStaff = user.role === 'Staff';

  return researchOutputsCollectionItems.reduce<
    ResearchOutputInReviewReminder[]
  >((researchOutputReminders, researchOutput) => {
    const isPublished = !!researchOutput.sys.publishedAt;
    if (
      !researchOutput.title ||
      !researchOutput.documentType ||
      !isResearchOutputDocumentType(researchOutput.documentType) ||
      isPublished ||
      !researchOutput.isInReview ||
      !researchOutput.statusChangedBy
    )
      return researchOutputReminders;

    const { associationName, associationType } =
      getAssociationNameAndType(researchOutput);

    const researchOutputTeamIds = (researchOutput?.teamsCollection?.items || [])
      .filter((teamItem) => teamItem?.sys.id !== undefined)
      .map((teamItem) => teamItem?.sys.id as string);

    const researchOutputWorkingGroupId = researchOutput?.workingGroup?.sys.id;

    const isProjectManagerInTeam = researchOutputTeamIds.some((teamId) =>
      userProjectManagerTeamIds.includes(teamId),
    );

    const isProjectManagerInWorkingGroup = researchOutputWorkingGroupId
      ? userProjectManagerWorkingGroupIds.includes(researchOutputWorkingGroupId)
      : false;

    if (
      associationName &&
      associationType &&
      (((associationType === 'team' || associationType === 'project') &&
        isProjectManagerInTeam) ||
        (associationType === 'working group' &&
          isProjectManagerInWorkingGroup) ||
        isAsapStaff)
    ) {
      researchOutputReminders.push({
        id: `research-output-in-review-${researchOutput.sys.id}`,
        entity: 'Research Output',
        type: 'In Review',
        data: {
          researchOutputId: researchOutput.sys.id,
          title: researchOutput.title,
          createdDate: researchOutput.createdDate,
          documentType: researchOutput.documentType,
          statusChangedBy: `${researchOutput.statusChangedBy.firstName} ${researchOutput.statusChangedBy.lastName}`,
          associationType,
          associationName,
        },
      });
    }

    return researchOutputReminders;
  }, []);
};

const getSwitchToDraftResearchOutputRemindersFromQuery = (
  researchOutputsCollectionItems: ResearchOutputItem[],
  user: User,
  zone: string,
): ResearchOutputSwitchToDraftReminder[] => {
  if (
    !user ||
    !user.teamsCollection?.items ||
    !researchOutputsCollectionItems.length
  ) {
    return [];
  }

  const userTeamIds = getUserTeamIds(user);
  const userWorkingGroupIds = getWorkingGroupIds(user);
  const isAsapStaff = user.role === 'Staff';

  return researchOutputsCollectionItems.reduce<
    ResearchOutputSwitchToDraftReminder[]
  >((researchOutputReminders, researchOutput) => {
    const isPublished = !!researchOutput.sys.publishedAt;

    if (
      !researchOutput.title ||
      !researchOutput.documentType ||
      !isResearchOutputDocumentType(researchOutput.documentType) ||
      isPublished ||
      !inLast24Hours(researchOutput.statusChangedAt, zone) ||
      researchOutput.isInReview ||
      !researchOutput.statusChangedBy
    ) {
      return researchOutputReminders;
    }

    const researchOutputTeamIds = (researchOutput?.teamsCollection?.items || [])
      .filter((teamItem) => teamItem?.sys.id !== undefined)
      .map((teamItem) => teamItem?.sys.id as string);

    const researchOutputWorkingGroupId = researchOutput?.workingGroup?.sys.id;

    const isInTeam = researchOutputTeamIds.some((teamId) =>
      userTeamIds.includes(teamId),
    );

    const isInWorkingGroup = researchOutputWorkingGroupId
      ? userWorkingGroupIds.includes(researchOutputWorkingGroupId)
      : false;

    const { associationName, associationType } = getAssociationNameAndType(
      researchOutput,
      false,
    );

    if (
      associationName &&
      (associationType === 'team' || associationType === 'working group') &&
      ((associationType === 'team' && isInTeam) ||
        (associationType === 'working group' && isInWorkingGroup) ||
        isAsapStaff)
    ) {
      const { firstName, lastName } = researchOutput.statusChangedBy;
      const isProjectOutput =
        associationType === 'team' && isProjectLinkedOutput(researchOutput);

      researchOutputReminders.push({
        id: `research-output-switch-to-draft-${researchOutput.sys.id}`,
        entity: 'Research Output',
        type: 'Switch To Draft',
        data: {
          researchOutputId: researchOutput.sys.id,
          title: researchOutput.title,
          statusChangedAt: researchOutput.statusChangedAt,
          documentType: researchOutput.documentType,
          statusChangedBy: `${firstName} ${lastName}`,
          associationType,
          associationName,
          ...(isProjectOutput ? { isProjectOutput } : {}),
        },
      });
    }
    return researchOutputReminders;
  }, []);
};

const getPublishedResearchOutputVersionRemindersFromQuery = (
  items: ResearchOutputVersionItem[],
  user: User,
  zone: string,
): ResearchOutputVersionPublishedReminder[] => {
  if (!user || !user.teamsCollection?.items || !items.length) {
    return [];
  }

  items.sort((reminderA, reminderB) => {
    const aStartDate = DateTime.fromISO(reminderA.sys.publishedAt);
    const bStartDate = DateTime.fromISO(reminderB.sys.publishedAt);

    return bStartDate.diff(aStartDate).as('seconds');
  });

  const seenOutputList: string[] = [];

  const userTeamIds = getUserTeamIds(user);
  const userWorkingGroupIds = getWorkingGroupIds(user);

  return items.reduce<ResearchOutputVersionPublishedReminder[]>(
    (reminders, researchOutputVersion) => {
      const isPublished = !!researchOutputVersion.sys.publishedAt;
      const researchOutput = cleanArray(
        researchOutputVersion.linkedFrom?.researchOutputsCollection?.items,
      )[0];

      if (
        !researchOutput ||
        !researchOutput.title ||
        !researchOutput.documentType ||
        !isResearchOutputDocumentType(researchOutput.documentType) ||
        !isPublished ||
        !inLast24Hours(researchOutputVersion.sys.publishedAt, zone) ||
        seenOutputList.includes(researchOutput.sys.id)
      ) {
        return reminders;
      }

      const { associationName, associationType } =
        getAssociationNameAndType(researchOutput);

      const researchOutputTeamIds = (
        researchOutput.teamsCollection?.items || []
      )
        .filter((teamItem) => teamItem?.sys.id !== undefined)
        .map((teamItem) => teamItem?.sys.id as string);

      const researchOutputWorkingGroupId = researchOutput.workingGroup?.sys.id;

      const isInTeam = researchOutputTeamIds.some((teamId) =>
        userTeamIds.includes(teamId),
      );

      const isInWorkingGroup = researchOutputWorkingGroupId
        ? userWorkingGroupIds.includes(researchOutputWorkingGroupId)
        : false;

      if (
        associationName &&
        associationType &&
        (((associationType === 'team' || associationType === 'project') &&
          isInTeam) ||
          (associationType === 'working group' && isInWorkingGroup))
      ) {
        seenOutputList.push(researchOutput.sys.id);
        reminders.push({
          id: `research-output-version-published-${researchOutputVersion.sys.id}`,
          entity: 'Research Output Version',
          type: 'Published',
          data: {
            researchOutputId: researchOutput.sys.id,
            documentType: researchOutput.documentType,
            title: researchOutput.title,
            publishedAt: researchOutputVersion.sys.publishedAt,
            associationType,
            associationName,
          },
        });
      }

      return reminders;
    },
    [],
  );
};

type ValidManuscriptItem = ManuscriptItem & {
  assignedUsersCollection: { items: { sys: { id: string } }[] };
  versionsCollection: {
    items: { createdBy: { firstName: string; lastName: string } }[];
  };
};

type ValidDiscussionItem = DiscussionItem & {
  message: {
    createdBy: {
      firstName: string;
      lastName: string;
      role: string;
      openScienceTeamMember: boolean;
      sys: { id: string };
    };
  };
};

type ValidMessageItem = MessageItem & {
  createdBy: {
    firstName: string;
    lastName: string;
    role: string;
    openScienceTeamMember: boolean;
    sys: { id: string };
  };
  linkedFrom: { discussionsCollection: { items: ValidDiscussionItem[] } };
};

const isTeamBasedManuscript = (manuscript: ManuscriptItem): boolean =>
  !!manuscript.teamsCollection?.items &&
  manuscript.teamsCollection.items.length > 0 &&
  !!manuscript.teamsCollection.items[0]?.displayName;

const isTeamBasedManuscriptVersion = (
  manuscriptVersion: ManuscriptVersion | undefined,
): boolean => !!manuscriptVersion?.teamsCollection?.items.length;

const isValidManuscriptItem = (
  manuscript: ManuscriptItem,
): manuscript is ValidManuscriptItem =>
  (isTeamBasedManuscript(manuscript) || !!manuscript.project?.title) &&
  !!manuscript.versionsCollection?.items &&
  manuscript.versionsCollection.items.length > 0 &&
  !!manuscript.versionsCollection.items[0]?.createdBy;

const isValidDiscussionItem = (
  discussion: DiscussionItem,
): discussion is ValidDiscussionItem =>
  !!discussion.message &&
  !!discussion.message.createdBy &&
  !!discussion.linkedFrom?.manuscriptsCollection?.items &&
  discussion.linkedFrom.manuscriptsCollection.items.length > 0 &&
  !!discussion.linkedFrom.manuscriptsCollection.items[0]?.versionsCollection
    ?.items &&
  discussion.linkedFrom.manuscriptsCollection.items[0].versionsCollection.items
    .length > 0;

const isValidMessageItem = (
  message: MessageItem,
): message is ValidMessageItem =>
  !!message.createdBy &&
  !!message.linkedFrom?.discussionsCollection?.items &&
  message.linkedFrom.discussionsCollection.items.length > 0 &&
  !!message.linkedFrom.discussionsCollection.items[0]?.linkedFrom
    ?.manuscriptsCollection?.items &&
  message.linkedFrom.discussionsCollection.items[0].linkedFrom
    .manuscriptsCollection.items.length > 0 &&
  !!message.linkedFrom.discussionsCollection.items[0].linkedFrom
    .manuscriptsCollection.items[0]?.versionsCollection?.items &&
  message.linkedFrom.discussionsCollection.items[0].linkedFrom
    .manuscriptsCollection.items[0].versionsCollection.items.length > 0;

const getManuscriptRemindersFromQuery = (
  manuscriptsCollectionItems: ManuscriptItem[],
  user: User,
  userId: string,
  timezone: string,
): ManuscriptReminder[] => {
  if (!user || !manuscriptsCollectionItems.length) return [];

  const userProjectManagerOrLeadPITeamIds =
    getUserProjectManagerOrLeadPITeamIds(user);

  return manuscriptsCollectionItems.reduce<ManuscriptReminder[]>(
    (reminders, manuscript) => {
      if (!isValidManuscriptItem(manuscript)) return reminders;
      const manuscriptItem = {
        ...manuscript,
        versionsCollection: {
          items: cleanArray(manuscript.versionsCollection.items),
        },
      } as ValidManuscriptItem;

      const manuscriptVersions = manuscriptItem.versionsCollection.items;
      const isManuscriptResubmitted = manuscriptVersions.length > 1;
      const manuscriptFirstVersion = manuscriptVersions[0] as ManuscriptVersion;
      const manuscriptLastVersion = manuscriptVersions[
        manuscriptVersions.length - 1
      ] as ManuscriptVersion;
      const isAssignedUser = manuscriptItem.assignedUsersCollection.items.some(
        (assignedUser) => assignedUser?.sys.id === userId,
      );

      if (isStaffAndMemberOfOpenScienceTeam(user)) {
        if (
          isManuscriptResubmitted &&
          inLast7Days(manuscriptLastVersion.sys.firstPublishedAt, timezone) &&
          isReminderForDifferentUser(
            manuscriptLastVersion.createdBy?.sys.id,
            userId,
          ) &&
          isAssignedUser
        ) {
          reminders.push(createManuscriptResubmittedReminder(manuscriptItem));
        } else if (
          inLast7Days(manuscriptItem.sys.firstPublishedAt, timezone) &&
          isReminderForDifferentUser(
            manuscriptFirstVersion.createdBy?.sys.id,
            userId,
          )
        ) {
          reminders.push(createManuscriptCreatedReminder(manuscriptItem));
        }

        return reminders;
      }

      if (
        isManuscriptResubmitted &&
        inLast7Days(manuscriptLastVersion.sys.firstPublishedAt, timezone) &&
        (isManuscriptAuthor(manuscriptLastVersion, userId) ||
          isManuscriptProjectManagerOrLeadPI(
            manuscript.teamsCollection,
            userProjectManagerOrLeadPITeamIds,
          ) ||
          (isTeamBasedManuscript(manuscriptItem) &&
            isManuscriptLabPI(manuscriptLastVersion.labsCollection, userId))) &&
        isReminderForDifferentUser(
          manuscriptLastVersion.createdBy?.sys.id,
          userId,
        )
      ) {
        reminders.push(createManuscriptResubmittedReminder(manuscriptItem));
      } else if (
        inLast7Days(manuscript.sys.firstPublishedAt, timezone) &&
        isReminderForDifferentUser(
          manuscriptFirstVersion.createdBy?.sys.id,
          userId,
        ) &&
        (isManuscriptAuthor(manuscriptFirstVersion, userId) ||
          isManuscriptProjectManagerOrLeadPI(
            manuscriptItem.teamsCollection,
            userProjectManagerOrLeadPITeamIds,
          ) ||
          (isTeamBasedManuscript(manuscriptItem) &&
            isManuscriptLabPI(manuscriptFirstVersion.labsCollection, userId)))
      ) {
        reminders.push(createManuscriptCreatedReminder(manuscriptItem));
      }

      if (
        !isStatusSupersededByResubmission(manuscriptItem) &&
        inLast7Days(manuscriptItem.statusUpdatedAt, timezone) &&
        isManuscriptStatusUpdatedByAnotherUser(manuscriptItem, userId) &&
        (isManuscriptAuthor(manuscriptFirstVersion, userId) ||
          isManuscriptProjectManagerOrLeadPI(
            manuscriptItem.teamsCollection,
            userProjectManagerOrLeadPITeamIds,
          ) ||
          (isTeamBasedManuscript(manuscriptItem) &&
            isManuscriptLabPI(manuscriptFirstVersion.labsCollection, userId)))
      ) {
        reminders.push(createManuscriptStatusUpdatedReminder(manuscriptItem));
      }

      return reminders;
    },
    [],
  );
};

const getDiscussionRemindersFromQuery = (
  discussionItems: DiscussionItem[],
  user: User,
  userId: string,
  timezone: string,
): DiscussionReminder[] => {
  if (!user || !discussionItems.length) return [];

  const userProjectManagerOrLeadPITeamIds =
    getUserProjectManagerOrLeadPITeamIds(user);

  return discussionItems.reduce<DiscussionReminder[]>(
    (reminders, discussion) => {
      if (!isValidDiscussionItem(discussion)) return reminders;

      const manuscript = discussion.linkedFrom?.manuscriptsCollection?.items[0];
      const manuscriptVersion = manuscript?.versionsCollection
        ?.items[0] as ManuscriptVersion;
      const isTeamBased = isTeamBasedManuscriptVersion(manuscriptVersion);

      const isManuscriptContributor =
        isManuscriptProjectManagerOrLeadPI(
          manuscriptVersion.teamsCollection,
          userProjectManagerOrLeadPITeamIds,
        ) ||
        isManuscriptAuthor(manuscriptVersion, userId) ||
        (isTeamBased &&
          isManuscriptLabPI(manuscriptVersion.labsCollection, userId));
      const isAssignedUser = manuscript?.assignedUsersCollection?.items.some(
        (assignedUser) => assignedUser?.sys.id === userId,
      );

      if (
        inLast7Days(discussion.sys.firstPublishedAt, timezone) &&
        isReminderForDifferentUser(discussion.message.createdBy.sys.id, userId)
      ) {
        if (
          isStaffAndMemberOfOpenScienceTeam(discussion.message?.createdBy) &&
          isManuscriptContributor
        ) {
          reminders.push(
            createDiscussionCreatedReminder(discussion, 'Open Science Member'),
          );
        } else if (
          !isStaffAndMemberOfOpenScienceTeam(discussion.message?.createdBy) &&
          (isManuscriptContributor || isAssignedUser)
        ) {
          reminders.push(
            createDiscussionCreatedReminder(discussion, 'Grantee'),
          );
        }
      }

      return reminders;
    },
    [],
  );
};

const getReplyRemindersFromQuery = (
  messageItems: MessageItem[],
  user: User,
  userId: string,
): DiscussionReminder[] => {
  if (!user || !messageItems.length) return [];

  const userProjectManagerOrLeadPITeamIds =
    getUserProjectManagerOrLeadPITeamIds(user);

  return messageItems.reduce<DiscussionReminder[]>((reminders, message) => {
    if (!isValidMessageItem(message)) return reminders;

    const discussion = message.linkedFrom?.discussionsCollection?.items[0];
    const isReply = discussion?.message?.sys.id !== message.sys.id;

    if (
      isReply &&
      isReminderForDifferentUser(message.createdBy.sys.id, userId)
    ) {
      const manuscript =
        message.linkedFrom?.discussionsCollection?.items[0]?.linkedFrom
          ?.manuscriptsCollection?.items[0];
      const manuscriptVersion = manuscript?.versionsCollection
        ?.items[0] as ManuscriptVersion;
      const isTeamBased = isTeamBasedManuscriptVersion(manuscriptVersion);

      const isAssignedUser = manuscript?.assignedUsersCollection?.items.some(
        (assignedUser) => assignedUser?.sys.id === userId,
      );

      const isManuscriptContributor =
        isManuscriptProjectManagerOrLeadPI(
          manuscriptVersion.teamsCollection,
          userProjectManagerOrLeadPITeamIds,
        ) ||
        isManuscriptAuthor(manuscriptVersion, userId) ||
        (isTeamBased &&
          isManuscriptLabPI(manuscriptVersion.labsCollection, userId));

      if (
        isStaffAndMemberOfOpenScienceTeam(message?.createdBy) &&
        isManuscriptContributor
      ) {
        reminders.push(
          createDiscussionRepliedToReminder(message, 'Open Science Member'),
        );
      } else if (
        !isStaffAndMemberOfOpenScienceTeam(message?.createdBy) &&
        (isManuscriptContributor || isAssignedUser)
      ) {
        reminders.push(createDiscussionRepliedToReminder(message, 'Grantee'));
      }
    }
    return reminders;
  }, []);
};

const isReminderForDifferentUser = (
  actorId: string | undefined,
  userId: string,
): boolean => actorId !== userId;

const isManuscriptStatusUpdatedByAnotherUser = (
  manuscript: ManuscriptItem,
  userId: string,
): boolean => manuscript.statusUpdatedBy?.sys.id !== userId;

export const getTeamNames = (
  teams: Maybe<string | undefined>[] | undefined,
): string => {
  if (teams) {
    const teamNames = [
      ...new Set(teams.filter((teamName): teamName is string => !!teamName)),
    ].map((teamName) => `Team ${teamName}`);

    if (teamNames.length === 1 && teamNames[0]) return teamNames[0];
    if (teamNames.length === 2) return teamNames.join(' and ');

    return `${teamNames.slice(0, -1).join(', ')} and ${teamNames.slice(-1)}`;
  }
  return '';
};

type TeamsWithLinkedProject = {
  items: Maybe<{
    linkedFrom?: Maybe<{
      projectMembershipCollection?: Maybe<{
        items: Maybe<{
          linkedFrom?: Maybe<{
            projectsCollection?: Maybe<{
              items: Maybe<{ title?: Maybe<string> }>[];
            }>;
          }>;
        }>[];
      }>;
    }>;
  }>[];
};

const getTeamLinkedProjectTitle = (
  teams: Maybe<TeamsWithLinkedProject> | undefined,
): string | undefined =>
  teams?.items[0]?.linkedFrom?.projectMembershipCollection?.items[0]?.linkedFrom
    ?.projectsCollection?.items[0]?.title || undefined;

const getManuscriptAssociationName = (
  manuscript: ValidManuscriptItem,
): string => {
  if (!isTeamBasedManuscript(manuscript)) {
    return manuscript.project?.title || '';
  }

  return (
    getTeamLinkedProjectTitle(manuscript.teamsCollection) ||
    getTeamNames(
      manuscript.teamsCollection?.items.map((team) => team?.displayName),
    )
  );
};

const getDiscussionManuscriptAssociationName = (
  manuscript: Maybe<{ project?: Maybe<{ title?: Maybe<string> }> }> | undefined,
  manuscriptVersion: ManuscriptVersion | undefined,
): string => {
  if (!isTeamBasedManuscriptVersion(manuscriptVersion)) {
    return manuscript?.project?.title || '';
  }

  return (
    getTeamLinkedProjectTitle(manuscriptVersion?.teamsCollection) ||
    getTeamNames(
      manuscriptVersion?.teamsCollection?.items.map(
        (teams) => teams?.displayName,
      ),
    )
  );
};

const createManuscriptCreatedReminder = (
  manuscript: ValidManuscriptItem,
): ManuscriptCreatedReminder => ({
  id: `manuscript-created-${manuscript.sys.id}`,
  entity: 'Manuscript',
  type: 'Manuscript Created',
  data: {
    manuscriptId: manuscript.sys.id,
    title: manuscript.title || '',
    teams: getManuscriptAssociationName(manuscript),
    createdBy: `${manuscript.versionsCollection.items[0]?.createdBy?.firstName} ${manuscript.versionsCollection.items[0]?.createdBy?.lastName}`,
    publishedAt: manuscript.sys.firstPublishedAt,
  },
});

const createManuscriptResubmittedReminder = (
  manuscript: ValidManuscriptItem,
): ManuscriptResubmittedReminder => {
  const manuscriptVersions = manuscript.versionsCollection.items || [];

  const lastVersion = manuscriptVersions[manuscriptVersions.length - 1];

  return {
    id: `manuscript-resubmitted-${manuscript.sys.id}`,
    entity: 'Manuscript',
    type: 'Manuscript Resubmitted',
    data: {
      manuscriptId: manuscript.sys.id,
      title: manuscript.title || '',
      teams: getManuscriptAssociationName(manuscript),
      resubmittedBy: `${lastVersion?.createdBy?.firstName} ${lastVersion?.createdBy?.lastName}`,
      resubmittedAt: lastVersion?.sys.firstPublishedAt,
    },
  };
};

const createDiscussionCreatedReminder = (
  discussion: ValidDiscussionItem,
  actor: 'Grantee' | 'Open Science Member',
): DiscussionCreatedReminder => {
  const manuscript = discussion.linkedFrom?.manuscriptsCollection?.items[0];
  const manuscriptVersion = manuscript?.versionsCollection?.items[0];
  const userTeams = discussion.message.createdBy?.teamsCollection?.items.map(
    (member) => member?.team?.displayName,
  );
  const manuscriptTeams = getDiscussionManuscriptAssociationName(
    manuscript,
    manuscriptVersion as ManuscriptVersion,
  );

  return {
    id: `discussion-created-${discussion.sys.id}`,
    entity: 'Discussion',
    type:
      actor === 'Grantee'
        ? 'Discussion Created by Grantee'
        : 'Discussion Created by Open Science Member',
    data: {
      manuscriptId: manuscript?.sys.id || '',
      title: manuscript?.title || '',
      manuscriptTeams,
      createdBy: `${discussion.message.createdBy.firstName} ${discussion.message.createdBy.lastName}`,
      userTeams: getTeamNames(userTeams),
      publishedAt: discussion.sys.firstPublishedAt,
    },
  };
};

const createDiscussionRepliedToReminder = (
  message: ValidMessageItem,
  actor: 'Grantee' | 'Open Science Member',
): DiscussionRepliedToReminder => {
  const discussion = message.linkedFrom.discussionsCollection.items[0];

  const manuscript = discussion?.linkedFrom?.manuscriptsCollection?.items[0];
  const manuscriptVersion = manuscript?.versionsCollection?.items[0];

  const manuscriptTeams = getDiscussionManuscriptAssociationName(
    manuscript,
    manuscriptVersion as ManuscriptVersion,
  );
  const userTeams = message.createdBy?.teamsCollection?.items.map(
    (member) => member?.team?.displayName,
  );

  return {
    id: `discussion-replied-${message.sys.id}`,
    entity: 'Discussion',
    type:
      actor === 'Grantee'
        ? 'Discussion Replied To by Grantee'
        : 'Discussion Replied To by Open Science Member',
    data: {
      manuscriptId: manuscript?.sys.id || '',
      title: manuscript?.title || '',
      manuscriptTeams,
      userTeams: getTeamNames(userTeams),
      createdBy: `${message.createdBy.firstName} ${message.createdBy.lastName}`,
      publishedAt: message.sys.firstPublishedAt,
    },
  };
};

const isStatusSupersededByResubmission = (
  manuscript: ManuscriptItem,
): boolean => manuscript.status === 'Manuscript Resubmitted';

const createManuscriptStatusUpdatedReminder = (
  manuscript: ValidManuscriptItem,
): ManuscriptStatusUpdatedReminder => ({
  id: `manuscript-status-updated-${manuscript.sys.id}`,
  entity: 'Manuscript',
  type: 'Manuscript Status Updated',
  data: {
    manuscriptId: manuscript.sys.id,
    title: manuscript.title || '',
    status: manuscript.status as ManuscriptStatus,
    previousStatus: manuscript.previousStatus as ManuscriptStatus,
    teams: getManuscriptAssociationName(manuscript),
    updatedBy: `${manuscript.statusUpdatedBy?.firstName} ${manuscript.statusUpdatedBy?.lastName}`,
    updatedAt: manuscript.statusUpdatedAt,
  },
});

const isManuscriptAuthor = (
  manuscriptVersion: ManuscriptVersion,
  userId: string,
): boolean => {
  if (!manuscriptVersion) return false;
  const isFirstAuthor = manuscriptVersion?.firstAuthorsCollection?.items.some(
    (author) => author?.__typename === 'Users' && author?.sys?.id === userId,
  );

  const isAdditionalAuthor =
    !!manuscriptVersion?.additionalAuthorsCollection?.items.some(
      (author) => author?.__typename === 'Users' && author?.sys?.id === userId,
    );

  const isCorrespondingAuthor =
    !!manuscriptVersion?.correspondingAuthorCollection?.items.some(
      (author) => author?.__typename === 'Users' && author?.sys?.id === userId,
    );

  return isFirstAuthor || isAdditionalAuthor || isCorrespondingAuthor;
};

const isManuscriptProjectManagerOrLeadPI = (
  manuscriptTeams: ManuscriptItem['teamsCollection'],
  userProjectManagerOrLeadPITeamIds: string[],
): boolean =>
  !!manuscriptTeams?.items.some(
    (teamItem) =>
      teamItem?.sys.id &&
      userProjectManagerOrLeadPITeamIds.includes(teamItem.sys.id),
  );

const isManuscriptLabPI = (
  manuscriptLabs: ManuscriptVersion['labsCollection'],
  userId: string,
): boolean =>
  !!manuscriptLabs?.items.some(
    (lab) => lab?.labPi && lab.labPi.sys.id === userId,
  );

const isStaffAndMemberOfOpenScienceTeam = (user: NonNullable<User>): boolean =>
  user.role === 'Staff' && !!user.openScienceTeamMember;

const getUserTeamIds = (user: NonNullable<User>): string[] => {
  if (!user.teamsCollection) return [];

  return user.teamsCollection.items
    .filter((teamItem) => teamItem?.team?.sys.id !== undefined)
    .map((teamItem) => teamItem?.team?.sys.id as string);
};

const getUserProjectManagerTeamIds = (user: NonNullable<User>): string[] => {
  if (!user.teamsCollection) return [];

  return user.teamsCollection.items
    .filter((teamItem) => teamItem?.role === 'Project Manager')
    .map((teamItem) => teamItem?.team?.sys.id as string);
};

const getUserProjectManagerOrLeadPITeamIds = (
  user: NonNullable<User>,
): string[] => {
  if (!user.teamsCollection) return [];

  return user.teamsCollection.items
    .filter(
      (teamItem) =>
        teamItem?.role === 'Project Manager' ||
        teamItem?.role === 'Lead PI (Core Leadership)',
    )
    .map((teamItem) => teamItem?.team?.sys.id as string);
};

type UserLinkedFrom = NonNullable<NonNullable<User>['linkedFrom']>;
type WorkingGroupMembersCollection =
  UserLinkedFrom['workingGroupMembersCollection'];
type WorkingGroupLeadersCollection =
  UserLinkedFrom['workingGroupLeadersCollection'];

const getIdsFromWorkingGroupCollection = (
  collection: WorkingGroupMembersCollection | WorkingGroupLeadersCollection,
): string[] =>
  collection?.items
    ? collection.items
        .filter(
          (item) =>
            item?.linkedFrom?.workingGroupsCollection?.items[0]?.sys.id !==
            undefined,
        )
        .map(
          (item) =>
            item?.linkedFrom?.workingGroupsCollection?.items[0]?.sys
              .id as string,
        )
    : [];

const getWorkingGroupIds = (user: User): string[] => {
  if (!user || !user.linkedFrom) return [];

  const workingGroupMembers = getIdsFromWorkingGroupCollection(
    user.linkedFrom?.workingGroupMembersCollection,
  );

  const workingGroupLeaders = getIdsFromWorkingGroupCollection(
    user.linkedFrom.workingGroupLeadersCollection,
  );

  return workingGroupMembers?.concat(workingGroupLeaders);
};

const getUserProjectManagerWorkingGroupIds = (user: User): string[] => {
  if (!user || !user.linkedFrom) return [];

  return user.linkedFrom.workingGroupLeadersCollection?.items
    ? user.linkedFrom.workingGroupLeadersCollection?.items
        .filter((item) => item?.role === 'Project Manager')
        .map(
          (item) =>
            item?.linkedFrom?.workingGroupsCollection?.items[0]?.sys
              .id as string,
        )
    : [];
};

const isProjectLinkedOutput = (
  researchOutput: Pick<ResearchOutputItem, 'teamsCollection' | 'project'>,
): boolean =>
  !!(
    researchOutput.project?.title ||
    getTeamLinkedProjectTitle(researchOutput.teamsCollection)
  );

const getAssociationNameAndType = (
  researchOutput: Pick<
    ResearchOutputItem,
    'workingGroup' | 'teamsCollection' | 'project'
  >,
  includeProjectAssociation = true,
): {
  associationType: 'team' | 'working group' | 'project' | null;
  associationName: string | null;
} => {
  if (researchOutput.workingGroup && researchOutput.workingGroup.title) {
    return {
      associationType: 'working group',
      associationName: researchOutput.workingGroup.title,
    };
  }

  if (
    researchOutput.teamsCollection &&
    researchOutput.teamsCollection.items[0]?.displayName
  ) {
    const projectTitle = includeProjectAssociation
      ? researchOutput.project?.title ||
        getTeamLinkedProjectTitle(researchOutput.teamsCollection)
      : undefined;

    if (projectTitle) {
      return {
        associationType: 'project',
        associationName: projectTitle,
      };
    }

    return {
      associationType: 'team',
      associationName: researchOutput.teamsCollection.items[0].displayName,
    };
  }

  return {
    associationType: null,
    associationName: null,
  };
};
