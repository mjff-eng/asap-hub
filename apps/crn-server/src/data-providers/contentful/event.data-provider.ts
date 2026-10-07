/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  addLocaleToFields,
  createLink,
  Entry,
  Environment,
  EventsFilter,
  EventsOrder,
  FetchEventByIdQuery,
  FetchEventByIdQueryVariables,
  FetchEventsByExternalAuthorIdQuery,
  FetchEventsByExternalAuthorIdQueryVariables,
  FetchEventsByTeamIdQuery,
  FetchEventsByTeamIdQueryVariables,
  FetchEventsByUserIdQuery,
  FetchEventsByUserIdQueryVariables,
  FetchEventsQuery,
  FetchEventsQueryVariables,
  FetchInterestGroupCalendarQuery,
  FetchInterestGroupCalendarQueryVariables,
  FetchInterestGroupTeamsByCalendarIdQuery,
  FetchInterestGroupTeamsByCalendarIdQueryVariables,
  FetchPreviousEventAttendanceQuery,
  FetchPreviousEventAttendanceQueryVariables,
  FetchUpcomingEventsByCalendarIdQuery,
  FetchUpcomingEventsByCalendarIdQueryVariables,
  FetchWorkingGroupCalendarQuery,
  FetchWorkingGroupCalendarQueryVariables,
  FETCH_EVENTS,
  FETCH_EVENTS_BY_EXTERNAL_AUTHOR_ID,
  FETCH_EVENTS_BY_TEAM_ID,
  FETCH_EVENTS_BY_USER_ID,
  FETCH_EVENT_BY_ID,
  FETCH_INTEREST_GROUP_CALENDAR,
  FETCH_INTEREST_GROUP_TEAMS_BY_CALENDAR_ID,
  FETCH_PREVIOUS_EVENT_ATTENDANCE,
  FETCH_UPCOMING_EVENTS_BY_CALENDAR_ID,
  FETCH_WORKING_GROUP_CALENDAR,
  GraphQLClient,
  Link,
  patchAndPublish,
  pollContentfulGql,
  pollContentfulGqlUntil,
  RichTextFromQuery,
} from '@asap-hub/contentful';
import {
  EventCreateDataObject,
  EventDataObject,
  EventSpeaker,
  EventSpeakerExternalUserData,
  EventSpeakerUserData,
  EventTeamAttendance,
  EventUpdateDataObject,
  EventUpdateDetailsRequest,
  FetchEventsOptions,
  getInterestGroupTeamIdsForEvent,
  InterestGroupTeamMembership,
  isEventStatus,
  isTeamType,
  ListEventDataObject,
} from '@asap-hub/model';
import { cleanArray, parseUserDisplayName } from '@asap-hub/server-common';
import { DateTime } from 'luxon';

import { parseCalendarDataObjectToResponse } from '../../controllers/calendar.controller';
import { getAttendanceToSync } from '../../utils/event-attendance';
import logger from '../../utils/logger';
import { UpcomingEvent, EventDataProvider } from '../types';
import {
  getContentfulEventMaterial,
  MeetingMaterial,
  parseContentfulGraphqlCalendarPartialToDataObject,
} from '../transformers';
import { parseResearchTags } from './research-tag.data-provider';

export type EventItem = NonNullable<
  NonNullable<FetchEventsQuery['eventsCollection']>['items'][number]
>;

type WorkingGroupItem = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<EventItem['calendar']>['linkedFrom']
    >['workingGroupsCollection']
  >['items'][number]
>;

type InterestGroupItem = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<EventItem['calendar']>['linkedFrom']
    >['interestGroupsCollection']
  >['items'][number]
>;

export class EventContentfulDataProvider implements EventDataProvider {
  constructor(
    private contentfulClient: GraphQLClient,
    private getRestClient: () => Promise<Environment>,
  ) {}

  private fetchEventById(id: string) {
    return this.contentfulClient.request<
      FetchEventByIdQuery,
      FetchEventByIdQueryVariables
    >(FETCH_EVENT_BY_ID, { id });
  }

  async fetchById(id: string): Promise<EventDataObject | null> {
    const { events } = await this.fetchEventById(id);

    if (!events) {
      return null;
    }

    const event = parseGraphQLEvent(events);
    const previousEventAttendance =
      await this.fetchPreviousEventAttendance(events);

    return previousEventAttendance
      ? { ...event, previousEventAttendance }
      : event;
  }

  private async fetchPreviousEventAttendance(item: EventItem) {
    if (!item.googleId) {
      return undefined;
    }

    const baseGoogleId = item.googleId.split('_')[0]!;

    const { eventsCollection } = await this.contentfulClient.request<
      FetchPreviousEventAttendanceQuery,
      FetchPreviousEventAttendanceQueryVariables
    >(FETCH_PREVIOUS_EVENT_ATTENDANCE, {
      googleId: baseGoogleId,
      startDate: item.startDate,
    });

    const previousEvent = eventsCollection?.items[0];

    if (
      !previousEvent ||
      previousEvent.sys.id === item.sys.id ||
      !previousEvent.attendanceCollection ||
      previousEvent.attendanceCollection.total === 0
    ) {
      return undefined;
    }

    return {
      teamsTotal: previousEvent.attendanceCollection.total,
      teamsAttended: previousEvent.attendanceCollection.items.filter(
        (attendance) => attendance?.attended,
      ).length,
    };
  }

  async fetch(options: FetchEventsOptions): Promise<ListEventDataObject> {
    const {
      take = 10,
      skip = 0,
      before,
      after,
      search,
      sortBy,
      sortOrder,
      filter,
    } = options;

    if (filter?.userId) {
      const { users } = await this.contentfulClient.request<
        FetchEventsByUserIdQuery,
        FetchEventsByUserIdQueryVariables
      >(FETCH_EVENTS_BY_USER_ID, {
        limit: take,
        skip,
        id: filter.userId,
      });

      const eventsCollection =
        users?.linkedFrom?.eventSpeakersCollection?.items[0]?.linkedFrom
          ?.eventsCollection;

      return getEventDataObject(eventsCollection);
    }

    if (filter?.externalAuthorId) {
      const { externalAuthors } = await this.contentfulClient.request<
        FetchEventsByExternalAuthorIdQuery,
        FetchEventsByExternalAuthorIdQueryVariables
      >(FETCH_EVENTS_BY_EXTERNAL_AUTHOR_ID, {
        limit: take,
        skip,
        id: filter.externalAuthorId,
      });

      const eventsCollection =
        externalAuthors?.linkedFrom?.eventSpeakersCollection?.items[0]
          ?.linkedFrom?.eventsCollection;

      return getEventDataObject(eventsCollection);
    }

    if (filter?.teamId) {
      const { teams } = await this.contentfulClient.request<
        FetchEventsByTeamIdQuery,
        FetchEventsByTeamIdQueryVariables
      >(FETCH_EVENTS_BY_TEAM_ID, {
        limit: take,
        skip,
        id: filter.teamId,
      });

      const eventsCollection =
        teams?.linkedFrom?.eventSpeakersCollection?.items[0]?.linkedFrom
          ?.eventsCollection;

      return getEventDataObject(eventsCollection);
    }

    const getOrderFilter = () => {
      if (sortBy === 'startDate') {
        if (sortOrder === 'asc') return EventsOrder.StartDateAsc;
        if (sortOrder === 'desc') return EventsOrder.StartDateDesc;
      }

      if (sortBy === 'endDate') {
        if (sortOrder === 'asc') return EventsOrder.EndDateAsc;
        if (sortOrder === 'desc') return EventsOrder.EndDateDesc;
      }

      return undefined;
    };

    const searchFilter = (search || '')
      .split(' ')
      .reduce(
        (
          acc: (
            | { title_contains: string }
            | { researchTags: { name_contains: string } }
          )[],
          word,
        ) => {
          acc.push({ title_contains: word });
          acc.push({ researchTags: { name_contains: word } });
          return acc;
        },
        [],
      );

    let calendarFilter: EventsFilter = {};
    if (filter?.workingGroupId) {
      const { workingGroups } = await this.contentfulClient.request<
        FetchWorkingGroupCalendarQuery,
        FetchWorkingGroupCalendarQueryVariables
      >(FETCH_WORKING_GROUP_CALENDAR, {
        id: filter.workingGroupId,
      });

      if (workingGroups?.calendars) {
        calendarFilter = {
          calendar: { sys: { id: workingGroups.calendars.sys.id } },
        };
      }
    }

    if (filter?.interestGroupId) {
      const { interestGroups } = await this.contentfulClient.request<
        FetchInterestGroupCalendarQuery,
        FetchInterestGroupCalendarQueryVariables
      >(FETCH_INTEREST_GROUP_CALENDAR, {
        id: filter.interestGroupId,
      });

      if (interestGroups?.calendar) {
        calendarFilter = {
          calendar: { sys: { id: interestGroups.calendar.sys.id } },
        };
      }
    }
    const { eventsCollection } = await this.contentfulClient.request<
      FetchEventsQuery,
      FetchEventsQueryVariables
    >(FETCH_EVENTS, {
      limit: take ?? null,
      skip: skip ?? null,
      order: getOrderFilter(),
      where: {
        ...(filter?.hidden !== true ? { hidden_not: true } : {}),
        ...(filter?.googleId ? { googleId_contains: filter.googleId } : {}),
        ...(after ? { endDate_gt: after } : {}),
        ...(before ? { endDate_lt: before } : {}),
        ...(search ? { OR: searchFilter } : {}),
        ...calendarFilter,
      },
    });

    return getEventDataObject(eventsCollection);
  }

  async create(create: EventCreateDataObject): Promise<string> {
    const environment = await this.getRestClient();

    const { calendar, ...otherCreateFields } = create;

    const memberships =
      await this.fetchInterestGroupMembershipsByCalendarId(calendar);
    const attendanceEntries = await Promise.all(
      getInterestGroupTeamIdsForEvent(memberships, create.endDate).map(
        (teamId) => this.createAttendanceEntry(environment, teamId, false),
      ),
    );
    const attendanceLinks = attendanceEntries.map((entry) =>
      createLink(entry.sys.id),
    );

    const newEntry = await environment.createEntry('events', {
      fields: {
        ...addLocaleToFields(otherCreateFields),
        calendar: {
          'en-US': createLink(calendar),
        },
        ...(attendanceLinks.length > 0
          ? { attendance: { 'en-US': attendanceLinks } }
          : {}),
      },
    });

    await newEntry.publish();
    return newEntry.sys.id;
  }

  async fetchInterestGroupMembershipsByCalendarId(
    calendarId: string,
  ): Promise<InterestGroupTeamMembership[]> {
    const { calendars } = await this.contentfulClient.request<
      FetchInterestGroupTeamsByCalendarIdQuery,
      FetchInterestGroupTeamsByCalendarIdQueryVariables
    >(FETCH_INTEREST_GROUP_TEAMS_BY_CALENDAR_ID, { id: calendarId });

    return parseGraphQLInterestGroupMemberships(
      calendars?.linkedFrom?.interestGroupsCollection?.items[0],
    );
  }

  private async createAttendanceEntry(
    environment: Environment,
    teamId: string,
    attended: boolean,
  ) {
    try {
      const newEntry = await environment.createEntry('attendance', {
        fields: addLocaleToFields({
          team: createLink(teamId),
          attended,
        }),
      });
      return await newEntry.publish();
    } catch (e) {
      throw new Error(`Error creating attendance entry: ${e}`);
    }
  }

  async fetchUpcomingEventsByCalendarId(
    calendarId: string,
    now: Date,
  ): Promise<UpcomingEvent[]> {
    const take = 50;
    const events: UpcomingEvent[] = [];
    let skip = 0;
    let total = 0;

    do {
      const { eventsCollection } = await this.contentfulClient.request<
        FetchUpcomingEventsByCalendarIdQuery,
        FetchUpcomingEventsByCalendarIdQueryVariables
      >(FETCH_UPCOMING_EVENTS_BY_CALENDAR_ID, {
        calendarId,
        now: now.toISOString(),
        limit: take,
        skip,
      });

      total = eventsCollection?.total ?? 0;
      skip += take;
      events.push(
        ...cleanArray(eventsCollection?.items).map(parseGraphQLUpcomingEvent),
      );
    } while (skip < total);

    return events;
  }

  async update(id: string, update: EventUpdateDataObject): Promise<void> {
    const environment = await this.getRestClient();
    const event = await environment.getEntry(id);
    const { calendar, ...otherUpdateFields } = update;

    const attendanceLinks = await this.getAttendanceLinksForUpdate(
      environment,
      event,
      update,
    );

    const updateWithCalendarLink = {
      ...(calendar ? { calendar: createLink(calendar) } : {}),
      ...otherUpdateFields,
      ...(attendanceLinks ? { attendance: attendanceLinks } : {}),
    };

    const result = await patchAndPublish(event, updateWithCalendarLink);

    const fetchEventById = () => this.fetchEventById(id);

    await pollContentfulGql<FetchEventByIdQuery>(
      result.sys.publishedVersion || Infinity,
      fetchEventById,
      'events',
    );
  }

  /**
   * Recalculates the attendance when the end date or calendar of an event
   * that hasn't ended changes. Events that had already ended are left as
   * they are since their attendance may have been edited.
   */
  private async getAttendanceLinksForUpdate(
    environment: Environment,
    event: Entry,
    update: EventUpdateDataObject,
  ) {
    const currentEndDate: string | undefined = event.fields.endDate?.['en-US'];
    const currentCalendarId: string | undefined =
      event.fields.calendar?.['en-US']?.sys.id;

    const hasEnded = !!currentEndDate && new Date(currentEndDate) <= new Date();
    const endDateChanged =
      !!update.endDate &&
      new Date(update.endDate).getTime() !==
        new Date(currentEndDate ?? 0).getTime();
    const calendarChanged =
      !!update.calendar && update.calendar !== currentCalendarId;

    const endDate = update.endDate ?? currentEndDate;
    const calendarId = update.calendar ?? currentCalendarId;

    if (
      hasEnded ||
      !(endDateChanged || calendarChanged) ||
      !endDate ||
      !calendarId
    ) {
      return null;
    }

    const [memberships, { events: currentEvent }] = await Promise.all([
      this.fetchInterestGroupMembershipsByCalendarId(calendarId),
      this.fetchEventById(event.sys.id),
    ]);

    const currentAttendance = parseGraphQLAttendance(
      cleanArray(currentEvent?.attendanceCollection?.items),
    ).map(({ id, team, attended }) => ({ id, teamId: team.id, attended }));

    const attendance = getAttendanceToSync(
      currentAttendance,
      getInterestGroupTeamIdsForEvent(memberships, endDate),
    );

    return attendance
      ? this.buildAttendanceLinks(environment, event, attendance)
      : null;
  }

  async updateEventDetails(
    id: string,
    data: EventUpdateDetailsRequest,
  ): Promise<void> {
    const environment = await this.getRestClient();
    const event = await environment.getEntry(id);

    const patchFields: Record<string, unknown> = {};

    if (data.attendance) {
      patchFields.attendance = await this.buildAttendanceLinks(
        environment,
        event,
        data.attendance,
      );
    }

    if (data.speakersToRemove && data.speakersToRemove.length > 0) {
      patchFields.speakers = await this.buildSpeakerLinks(
        environment,
        event,
        data.speakersToRemove,
      );
    }

    let updatedSpeakers: SpeakerPreliminaryDataSharedUpdate[] = [];
    if (data.preliminaryDataShared && data.preliminaryDataShared.length > 0) {
      updatedSpeakers = await this.updateSpeakersPreliminaryDataShared(
        environment,
        event,
        data.preliminaryDataShared,
        data.speakersToRemove ?? [],
      );
    }

    const fetchEventById = () => this.fetchEventById(id);

    if (Object.keys(patchFields).length > 0) {
      const result = await patchAndPublish(event, patchFields);
      await pollContentfulGql<FetchEventByIdQuery>(
        result.sys.publishedVersion || Infinity,
        fetchEventById,
        'events',
      );
    }

    if (updatedSpeakers.length > 0) {
      await pollContentfulGqlUntil<FetchEventByIdQuery>(
        fetchEventById,
        (result) =>
          areSpeakersPreliminaryDataSharedSynced(result, updatedSpeakers),
        `Event ${id} speakers preliminary data shared`,
      );
    }
  }

  private async buildAttendanceLinks(
    environment: Environment,
    event: Entry,
    attendanceData: NonNullable<EventUpdateDetailsRequest['attendance']>,
  ) {
    const existingLinks: Link<'Entry'>[] =
      event.fields.attendance?.['en-US'] || [];

    const incomingIds = new Set(
      attendanceData
        .map((attendance) => attendance.id)
        .filter((attendanceId): attendanceId is string => !!attendanceId),
    );
    const linksToDelete = existingLinks.filter(
      (link) => !incomingIds.has(link.sys.id),
    );

    await Promise.all(
      linksToDelete.map(async (link) => {
        try {
          const attendanceEntry = await environment.getEntry(link.sys.id);
          try {
            if (attendanceEntry.isPublished()) {
              await attendanceEntry.unpublish();
            }
            try {
              await attendanceEntry.delete();
            } catch (error) {
              logger.warn(
                { error, attendanceId: link.sys.id },
                `Error deleting attendance entry with id: ${link.sys.id}`,
              );
            }
          } catch (error) {
            logger.warn(
              { error, attendanceId: link.sys.id },
              `Error unpublishing attendance entry with id: ${link.sys.id}`,
            );
          }
        } catch (error) {
          logger.warn(
            { error, attendanceId: link.sys.id },
            `Error fetching attendance entry with id: ${link.sys.id}`,
          );
        }
      }),
    );

    const attendanceEntries = await Promise.all(
      attendanceData.map(async ({ id: attendanceId, teamId, attended }) => {
        if (attendanceId) {
          let attendanceEntry;
          try {
            attendanceEntry = await environment.getEntry(attendanceId);
          } catch (error) {
            logger.warn(
              { error, attendanceId },
              `Attendance entry with id: ${attendanceId} no longer exists, skipping`,
            );
            return null;
          }
          if (attendanceEntry.fields.attended?.['en-US'] === attended) {
            return attendanceEntry;
          }
          attendanceEntry.fields = addLocaleToFields({
            team: createLink(teamId),
            attended,
          });
          const updatedEntry = await attendanceEntry.update();
          return updatedEntry.publish();
        }

        return this.createAttendanceEntry(environment, teamId, attended);
      }),
    );

    return attendanceEntries
      .flatMap((attendanceEntry) => (attendanceEntry ? [attendanceEntry] : []))
      .map((attendanceEntry) => createLink(attendanceEntry.sys.id));
  }

  private async buildSpeakerLinks(
    environment: Environment,
    event: Entry,
    speakersToRemove: string[],
  ) {
    const existingLinks: Link<'Entry'>[] =
      event.fields.speakers?.['en-US'] || [];
    const removeSet = new Set(speakersToRemove);

    await Promise.all(
      existingLinks
        .filter((link) => removeSet.has(link.sys.id))
        .map(async (link) => {
          try {
            const speakerEntry = await environment.getEntry(link.sys.id);
            try {
              if (speakerEntry.isPublished()) {
                await speakerEntry.unpublish();
              }
              try {
                await speakerEntry.delete();
              } catch (error) {
                logger.warn(
                  { error, speakerId: link.sys.id },
                  `Error deleting speaker entry with id: ${link.sys.id}`,
                );
              }
            } catch (error) {
              logger.warn(
                { error, speakerId: link.sys.id },
                `Error unpublishing speaker entry with id: ${link.sys.id}`,
              );
            }
          } catch (error) {
            logger.warn(
              { error, speakerId: link.sys.id },
              `Error fetching speaker entry with id: ${link.sys.id}`,
            );
          }
        }),
    );

    return existingLinks
      .filter((link) => !removeSet.has(link.sys.id))
      .map((link) => createLink(link.sys.id));
  }

  private async updateSpeakersPreliminaryDataShared(
    environment: Environment,
    event: Entry,
    preliminaryDataShared: NonNullable<
      EventUpdateDetailsRequest['preliminaryDataShared']
    >,
    speakersToRemove: string[],
  ): Promise<SpeakerPreliminaryDataSharedUpdate[]> {
    const sharedBySpeakerId = new Map(
      preliminaryDataShared.map(({ speakerId, shared }) => [speakerId, shared]),
    );
    const removeSet = new Set(speakersToRemove);
    const speakerLinks: Link<'Entry'>[] = (
      event.fields.speakers?.['en-US'] || []
    ).filter(
      (link: Link<'Entry'>) =>
        !removeSet.has(link.sys.id) && sharedBySpeakerId.has(link.sys.id),
    );

    const updates = await Promise.all(
      speakerLinks.map(
        async (link): Promise<SpeakerPreliminaryDataSharedUpdate | null> => {
          let speakerEntry: Entry;
          try {
            speakerEntry = await environment.getEntry(link.sys.id);
          } catch (error) {
            logger.warn(
              { error, speakerId: link.sys.id },
              `Error fetching speaker entry with id: ${link.sys.id}`,
            );
            return null;
          }

          const shared = sharedBySpeakerId.get(link.sys.id);
          if (
            shared === undefined ||
            speakerEntry.fields.preliminaryDataShared?.['en-US'] === shared
          ) {
            return null;
          }

          await patchAndPublish(speakerEntry, {
            preliminaryDataShared: shared,
          });
          return { speakerId: link.sys.id, shared };
        },
      ),
    );

    return updates.filter(
      (update): update is SpeakerPreliminaryDataSharedUpdate => update !== null,
    );
  }
}

type SpeakerPreliminaryDataSharedUpdate = {
  speakerId: string;
  shared: boolean;
};

export const areSpeakersPreliminaryDataSharedSynced = (
  result: FetchEventByIdQuery,
  updates: SpeakerPreliminaryDataSharedUpdate[],
): boolean => {
  const sharedBySpeakerId = new Map<string, boolean>();
  (result.events?.speakersCollection?.items ?? []).forEach((item) => {
    if (item) {
      sharedBySpeakerId.set(item.sys.id, !!item.preliminaryDataShared);
    }
  });

  return updates.every(({ speakerId, shared }) => {
    const current = sharedBySpeakerId.get(speakerId);
    return current === undefined || current === shared;
  });
};

type SpeakerItem = NonNullable<
  NonNullable<EventItem['speakersCollection']>['items'][number]
>;

type UserSpeaker = Extract<SpeakerItem['user'], { __typename: 'Users' }>;

type ExternalAuthorSpeaker = Extract<
  SpeakerItem['user'],
  { __typename: 'ExternalAuthors' }
>;

export const parseEventSpeakerUser = (
  user: UserSpeaker,
): EventSpeakerUserData => ({
  id: user.sys.id,
  alumniSinceDate: user.alumniSinceDate ?? undefined,
  firstName: user.firstName ?? undefined,
  lastName: user.lastName ?? undefined,
  displayName: parseUserDisplayName(
    user.firstName ?? '',
    user.lastName ?? '',
    undefined,
    user.nickname ?? '',
  ),
  avatarUrl: user.avatar?.url ?? undefined,
});

export const parseEventSpeakerExternalUser = (
  user: ExternalAuthorSpeaker,
): EventSpeakerExternalUserData => ({
  name: user?.name || '',
});

export const parseGraphQLSpeakers = (speakers: SpeakerItem[]): EventSpeaker[] =>
  (speakers || []).reduce((speakerList: EventSpeaker[], speaker) => {
    const { sys, team, user } = speaker;
    const speakerId = sys.id;

    if (user?.__typename === 'ExternalAuthors') {
      speakerList.push({
        id: speakerId,
        externalUser: parseEventSpeakerExternalUser(user),
      });
      return speakerList;
    }

    if (!team) {
      if (user?.__typename === 'Users' && user.onboarded === true) {
        speakerList.push({
          user: parseEventSpeakerUser(user),
        });
      }
      return speakerList;
    }

    if (!user) {
      speakerList.push({
        team: {
          id: team.sys.id,
          displayName: team.displayName ?? '',
          inactiveSince: team.inactiveSince ?? undefined,
        },
      });
      return speakerList;
    }

    if (user.__typename === 'Users') {
      const role =
        user?.teamsCollection?.items
          ?.filter((t) => t?.team?.sys.id === team.sys.id)
          .filter((s) => s?.role)[0]?.role || undefined;

      if (!role || user.onboarded !== true) {
        speakerList.push({
          team: {
            id: team.sys.id,
            displayName: team.displayName ?? '',
            inactiveSince: team.inactiveSince ?? undefined,
          },
        });
        return speakerList;
      }

      speakerList.push({
        id: speakerId,
        team: {
          id: team.sys.id,
          displayName: team.displayName ?? '',
          inactiveSince: team.inactiveSince ?? undefined,
        },
        user: parseEventSpeakerUser(user),
        role,
        preliminaryDataShared: !!speaker.preliminaryDataShared,
      });
    }
    return speakerList;
  }, []);

type AttendanceItem = NonNullable<
  NonNullable<EventItem['attendanceCollection']>['items'][number]
>;

export const parseGraphQLAttendance = (
  attendance: AttendanceItem[],
): EventTeamAttendance[] =>
  attendance.reduce<EventTeamAttendance[]>((list, { sys, attended, team }) => {
    if (!team) {
      return list;
    }

    list.push({
      id: sys.id,
      attended: !!attended,
      team: {
        id: team.sys.id,
        displayName: team.displayName ?? '',
        teamType: isTeamType(team.teamType) ? team.teamType : undefined,
        inactiveSince: team.inactiveSince ?? undefined,
      },
    });
    return list;
  }, []);

type InterestGroupTeamsItem = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        FetchInterestGroupTeamsByCalendarIdQuery['calendars']
      >['linkedFrom']
    >['interestGroupsCollection']
  >['items'][number]
>;

const parseGraphQLInterestGroupMemberships = (
  interestGroup: InterestGroupTeamsItem | null | undefined,
): InterestGroupTeamMembership[] =>
  cleanArray(interestGroup?.teamsCollection?.items).flatMap(
    ({ team, startDate, endDate }) =>
      team && startDate
        ? [
            {
              teamId: team.sys.id,
              startDate,
              endDate,
              inactiveSince: team.inactiveSince,
            },
          ]
        : [],
  );

type UpcomingEventItem = NonNullable<
  NonNullable<
    FetchUpcomingEventsByCalendarIdQuery['eventsCollection']
  >['items'][number]
>;

const parseGraphQLUpcomingEvent = ({
  sys,
  endDate,
  attendanceCollection,
}: UpcomingEventItem): UpcomingEvent => ({
  id: sys.id,
  endDate,
  attendance: cleanArray(attendanceCollection?.items).flatMap(
    ({ sys: attendanceSys, attended, team }) =>
      team
        ? [{ id: attendanceSys.id, teamId: team.sys.id, attended: !!attended }]
        : [],
  ),
});

export const parseGraphQLEvent = (item: EventItem): EventDataObject => {
  if (!item.calendar) {
    throw new Error(`Event (${item.sys.id}) doesn't have a calendar"`);
  }

  if (item.status && !isEventStatus(item.status)) {
    throw new Error(`Invalid event (${item.sys.id}) status "${item.status}"`);
  }

  const calendar = parseCalendarDataObjectToResponse({
    ...parseContentfulGraphqlCalendarPartialToDataObject(item.calendar),
    interestGroups: [],
    workingGroups: [],
  });

  const startDate = DateTime.fromISO(item.startDate);
  const endDate = DateTime.fromISO(item.endDate);
  const isStale = endDate.diffNow('days').get('days') < -14; // 14 days have passed after the event

  const {
    sys: { id, publishedAt },
    lastUpdated,
    title,
    description,
    startDateTimeZone,
    endDateTimeZone,
    notesPermanentlyUnavailable,
    notes,
    notesUpdatedAt,
    videoRecordingPermanentlyUnavailable,
    videoRecording,
    videoRecordingUpdatedAt,
    presentationPermanentlyUnavailable,
    presentation,
    presentationUpdatedAt,
    meetingMaterialsPermanentlyUnavailable,
    meetingMaterials,
    meetingLink,
    thumbnail,
    hideMeetingLink,
    status,
    hidden,
    recurring,
    speakersCollection,
  } = item;

  const group =
    item.calendar.linkedFrom?.interestGroupsCollection?.items
      .filter((x): x is InterestGroupItem => x !== null)
      .map((ig) => ({
        id: ig.sys.id,
        name: ig.name || '',
        active: !!ig.active,
        thumbnail: ig.thumbnail?.url ?? undefined,
        tools: {
          slack: ig.slack || undefined,
          googleDrive: ig.googleDrive ?? undefined,
        },
      }))[0] || undefined;

  const workingGroup =
    item.calendar.linkedFrom?.workingGroupsCollection?.items
      .filter((x): x is WorkingGroupItem => x !== null)
      .map((wg) => ({
        id: wg.sys.id,
        title: wg.title || '',
      }))[0] || undefined;

  const speakersItems =
    speakersCollection?.items.filter(
      (x: SpeakerItem | null): x is SpeakerItem => x !== null,
    ) ?? [];
  return {
    id,
    title: title!,
    description: description || '',
    startDate: startDate.toUTC().toString(),
    startDateTimeZone: startDateTimeZone!,
    startDateTimestamp: startDate.toSeconds(),
    endDate: endDate.toUTC().toString(),
    endDateTimeZone: endDateTimeZone!,
    endDateTimestamp: endDate.toSeconds(),
    lastModifiedDate: lastUpdated || publishedAt,
    notes: getContentfulEventMaterial<string, undefined>(
      notes as RichTextFromQuery,
      !!notesPermanentlyUnavailable,
      isStale,
      undefined,
    ),
    ...(notesUpdatedAt && {
      notesUpdatedAt,
    }),
    videoRecording: getContentfulEventMaterial<string, undefined>(
      videoRecording as RichTextFromQuery,
      !!videoRecordingPermanentlyUnavailable,
      isStale,
      undefined,
    ),
    ...(videoRecordingUpdatedAt && {
      videoRecordingUpdatedAt,
    }),
    presentation: getContentfulEventMaterial<string, undefined>(
      presentation as RichTextFromQuery,
      !!presentationPermanentlyUnavailable,
      isStale,
      undefined,
    ),
    ...(presentationUpdatedAt && {
      presentationUpdatedAt,
    }),
    meetingMaterials: getContentfulEventMaterial<MeetingMaterial, []>(
      meetingMaterials,
      !!meetingMaterialsPermanentlyUnavailable,
      isStale,
      [],
    ),
    thumbnail: thumbnail?.url ?? undefined,
    meetingLink: meetingLink || undefined,
    hideMeetingLink: hideMeetingLink || false,
    status,
    hidden: hidden || false,
    recurring: recurring || false,
    tags: parseResearchTags(item.researchTagsCollection?.items || []),
    relatedTutorials: (item.linkedFrom?.tutorialsCollection?.items ?? []).map(
      (data) => ({
        id: data?.sys.id,
        title: data?.title || '',
        created: data?.addedDate,
      }),
    ),
    relatedResearch: (
      item.linkedFrom?.researchOutputsCollection?.items ?? []
    ).map((data) => ({
      id: data?.sys.id ?? '',
      title: data?.title,
      type: data?.type,
      documentType: data?.documentType,
      teams: (data?.teamsCollection?.items ?? [])
        .filter((x) => x !== null)
        .map((team) => ({
          id: team?.sys.id,
          displayName: team?.displayName,
        })),
      workingGroups: data?.workingGroup
        ? [{ id: data?.workingGroup?.sys.id, title: data?.workingGroup?.title }]
        : [],
    })),
    calendar,
    speakers: parseGraphQLSpeakers(speakersItems),
    workingGroup,
    interestGroup: group,
    ...(item.attendanceCollection
      ? {
          attendance: parseGraphQLAttendance(
            item.attendanceCollection.items.filter(
              (x: AttendanceItem | null): x is AttendanceItem => x !== null,
            ),
          ),
        }
      : {}),
  };
};

const getEventDataObject = (
  eventsCollection: FetchEventsQuery['eventsCollection'],
) => {
  if (!eventsCollection?.items) {
    return {
      total: 0,
      items: [],
    };
  }

  return {
    total: eventsCollection.total,
    items: eventsCollection.items
      .filter((x): x is EventItem => x !== null)
      .map(parseGraphQLEvent),
  };
};
