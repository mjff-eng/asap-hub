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
  FetchPreviousEventAttendanceQuery,
  FetchPreviousEventAttendanceQueryVariables,
  FetchWorkingGroupCalendarQuery,
  FetchWorkingGroupCalendarQueryVariables,
  FETCH_EVENTS,
  FETCH_EVENTS_BY_EXTERNAL_AUTHOR_ID,
  FETCH_EVENTS_BY_TEAM_ID,
  FETCH_EVENTS_BY_USER_ID,
  FETCH_EVENT_BY_ID,
  FETCH_INTEREST_GROUP_CALENDAR,
  FETCH_PREVIOUS_EVENT_ATTENDANCE,
  FETCH_WORKING_GROUP_CALENDAR,
  GraphQLClient,
  Link,
  patchAndPublish,
  pollContentfulGql,
  RichTextFromQuery,
} from '@asap-hub/contentful';
import {
  EventCreateDataObject,
  EventDataObject,
  EventSpeaker,
  EventSpeakerExternalUserData,
  EventSpeakerUserData,
  EventPreliminaryDataSharing,
  EventTeamAttendance,
  EventUpdateDataObject,
  EventUpdateDetailsRequest,
  FetchEventsOptions,
  isEventStatus,
  isTeamType,
  ListEventDataObject,
} from '@asap-hub/model';
import { parseUserDisplayName } from '@asap-hub/server-common';
import { DateTime } from 'luxon';

import { parseCalendarDataObjectToResponse } from '../../controllers/calendar.controller';
import logger from '../../utils/logger';
import { EventDataProvider } from '../types';
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
    const newEntry = await environment.createEntry('events', {
      fields: {
        ...addLocaleToFields(otherCreateFields),
        calendar: {
          'en-US': createLink(calendar),
        },
      },
    });

    await newEntry.publish();
    return newEntry.sys.id;
  }

  async update(id: string, update: EventUpdateDataObject): Promise<void> {
    const environment = await this.getRestClient();
    const event = await environment.getEntry(id);
    const { calendar, ...otherUpdateFields } = update;

    const updateWithCalendarLink = {
      ...(calendar ? { calendar: createLink(calendar) } : {}),
      ...otherUpdateFields,
    };

    const result = await patchAndPublish(event, updateWithCalendarLink);

    const fetchEventById = () => this.fetchEventById(id);

    await pollContentfulGql<FetchEventByIdQuery>(
      result.sys.publishedVersion || Infinity,
      fetchEventById,
      'events',
    );
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

    if (data.preliminaryDataShared && data.preliminaryDataShared.length > 0) {
      patchFields.preliminaryDataShared =
        await this.buildPreliminaryDataSharedLinks(
          environment,
          event,
          data.preliminaryDataShared,
        );
    }

    if (Object.keys(patchFields).length === 0) {
      return;
    }

    const result = await patchAndPublish(event, patchFields);

    const fetchEventById = () => this.fetchEventById(id);
    await pollContentfulGql<FetchEventByIdQuery>(
      result.sys.publishedVersion || Infinity,
      fetchEventById,
      'events',
    );
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

  private async buildPreliminaryDataSharedLinks(
    environment: Environment,
    event: Entry,
    preliminaryDataShared: NonNullable<
      EventUpdateDetailsRequest['preliminaryDataShared']
    >,
  ) {
    const existingLinks: Link<'Entry'>[] =
      event.fields.preliminaryDataShared?.['en-US'] || [];

    const existingByTeamId = new Map<string, Entry>();
    await Promise.all(
      existingLinks.map(async (link) => {
        try {
          const entry = await environment.getEntry(link.sys.id);
          const teamId = entry.fields.team?.['en-US']?.sys?.id;
          if (teamId) {
            existingByTeamId.set(teamId, entry);
          }
        } catch (error) {
          logger.warn(
            { error, preliminaryDataSharedId: link.sys.id },
            `Error fetching preliminary data sharing entry with id: ${link.sys.id}`,
          );
        }
      }),
    );

    const createdLinks = await Promise.all(
      preliminaryDataShared.map(async ({ teamId, shared }) => {
        const existingEntry = existingByTeamId.get(teamId);
        if (existingEntry) {
          if (existingEntry.fields.preliminaryDataShared?.['en-US'] !== shared) {
            existingEntry.fields = addLocaleToFields({
              team: createLink(teamId),
              preliminaryDataShared: shared,
            });
            const updatedEntry = await existingEntry.update();
            await updatedEntry.publish();
          }
          return null;
        }

        if (!shared) {
          return null;
        }

        try {
          const newEntry = await environment.createEntry(
            'preliminaryDataSharing',
            {
              fields: addLocaleToFields({
                team: createLink(teamId),
                preliminaryDataShared: shared,
              }),
            },
          );
          const publishedEntry = await newEntry.publish();
          return createLink(publishedEntry.sys.id);
        } catch (e) {
          throw new Error(`Error creating preliminary data sharing entry: ${e}`);
        }
      }),
    );

    return [
      ...existingLinks.map((link) => createLink(link.sys.id)),
      ...createdLinks.flatMap((link) => (link ? [link] : [])),
    ];
  }
}

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
    const { team, user } = speaker;
    // The eventSpeakers entry's own id is requested by the query (added to the
    // shared fragment) but not reflected in the generated result type; widen
    // locally to read it without regenerating graphql.ts.
    const speakerId = (speaker as SpeakerItem & { sys?: { id: string } }).sys
      ?.id;

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

type PreliminaryDataSharedItem = NonNullable<
  NonNullable<EventItem['preliminaryDataSharedCollection']>['items'][number]
>;

export const parseGraphQLPreliminaryDataShared = (
  items: PreliminaryDataSharedItem[],
): EventPreliminaryDataSharing[] =>
  items.reduce<EventPreliminaryDataSharing[]>(
    (list, { preliminaryDataShared, team }) => {
      if (!team) {
        return list;
      }

      list.push({
        team: { id: team.sys.id },
        shared: !!preliminaryDataShared,
      });
      return list;
    },
    [],
  );

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
    ...(item.preliminaryDataSharedCollection
      ? {
          preliminaryDataShared: parseGraphQLPreliminaryDataShared(
            item.preliminaryDataSharedCollection.items.filter(
              (
                x: PreliminaryDataSharedItem | null,
              ): x is PreliminaryDataSharedItem => x !== null,
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
