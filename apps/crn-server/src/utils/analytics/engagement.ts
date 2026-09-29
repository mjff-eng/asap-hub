import { FetchEngagementQuery } from '@asap-hub/contentful';
import { EngagementDataObject, TimeRangeOption } from '@asap-hub/model';
import { cleanArray } from '@asap-hub/server-common';
import {
  getRangeFilterParams,
  isNotCancelledEventStatus,
  isPastEvent,
} from './common';

type Membership = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<FetchEngagementQuery['teamsCollection']>['items'][number]
    >['linkedFrom']
  >['teamMembershipCollection']
>['items'][number];

export const getEngagementItems = (
  teamCollection: FetchEngagementQuery['teamsCollection'],
  rangeKey?: TimeRangeOption,
): EngagementDataObject[] =>
  cleanArray(teamCollection?.items).map((teamItem) => {
    let totalSpeakerCount = 0;
    const events = new Set();
    const uniqueSpeakers = {
      allRoles: new Set(),
      keyPersonnel: new Set(),
    };

    cleanArray(teamItem.linkedFrom?.eventSpeakersCollection?.items)
      .filter(getFilterEventByRange(rangeKey))
      .filter(isNotCancelledEvent)
      .forEach((eventSpeakerItem) => {
        const eventId =
          eventSpeakerItem.linkedFrom?.eventsCollection?.items[0]?.sys.id;
        if (eventId) {
          events.add(eventId);

          if (
            eventSpeakerItem.user?.__typename === 'Users' &&
            eventSpeakerItem.user?.onboarded
          ) {
            const userRole = cleanArray(
              eventSpeakerItem.user.teamsCollection?.items,
            ).find((speaker) => speaker.team?.sys.id === teamItem.sys.id)?.role;

            const userId = eventSpeakerItem.user.sys.id;

            if (userRole) {
              totalSpeakerCount += 1;
              uniqueSpeakers.allRoles.add(userId);
              if (userRole === 'Key Personnel') {
                uniqueSpeakers.keyPersonnel.add(userId);
              }
            }
          }
        }
      });

    const memberCount: number = (
      teamItem.linkedFrom?.teamMembershipCollection?.items || []
    ).reduce(
      (count, membership: Membership | null) =>
        membership &&
        membership.linkedFrom?.usersCollection?.items[0]?.onboarded &&
        membership.role
          ? count + 1
          : count,
      0,
    );
    const uniqueAllRolesCount = uniqueSpeakers.allRoles.size;
    const uniqueKeyPersonnelCount = uniqueSpeakers.keyPersonnel.size;

    return {
      id: teamItem.sys.id,
      name: teamItem.displayName || '',
      inactiveSince: teamItem.inactiveSince,
      memberCount,
      eventCount: events.size || 0,
      totalSpeakerCount,
      uniqueAllRolesCount,
      uniqueAllRolesCountPercentage: memberCount
        ? Math.round((uniqueAllRolesCount / memberCount) * 100)
        : 0,
      uniqueKeyPersonnelCount,
      uniqueKeyPersonnelCountPercentage: memberCount
        ? Math.round((uniqueKeyPersonnelCount / memberCount) * 100)
        : 0,
    };
  });

export type EventSpeakersCollectionItem = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<FetchEngagementQuery['teamsCollection']>['items'][number]
    >['linkedFrom']
  >['eventSpeakersCollection']
>['items'][number];

export const getFilterEventByRange =
  (rangeKey?: TimeRangeOption) => (item: EventSpeakersCollectionItem) => {
    const filter = getRangeFilterParams(rangeKey);
    const endDate = item?.linkedFrom?.eventsCollection?.items[0]?.endDate;
    return isPastEvent(endDate) && (!filter || endDate >= filter);
  };

export const isNotCancelledEvent = (
  eventSpeakerItem: EventSpeakersCollectionItem,
) =>
  isNotCancelledEventStatus(
    eventSpeakerItem?.linkedFrom?.eventsCollection?.items[0]?.status,
  );
