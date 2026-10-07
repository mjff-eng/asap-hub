import 'source-map-support/register';

import {
  getInterestGroupTeamIdsForEvent,
  InterestGroupEvent,
  InterestGroupTeamEvent,
  TeamEvent,
} from '@asap-hub/model';
import { EventBridgeHandler } from '@asap-hub/server-common';
import { mapLimit } from 'async';
import { Handler } from 'aws-lambda/handler';
import {
  EventDataProvider,
  InterestGroupDataProvider,
} from '../../data-providers/types';
import { getEventDataProvider } from '../../dependencies/events.dependencies';
import { getInterestGroupDataProvider } from '../../dependencies/interest-groups.dependencies';
import { getAttendanceToSync } from '../../utils/event-attendance';
import logger from '../../utils/logger';
import { sentryWrapper } from '../../utils/sentry-wrapper';
import {
  InterestGroupPayload,
  InterestGroupTeamPayload,
  TeamPayload,
} from '../event-bus';

const MAX_CONCURRENT_EVENT_UPDATES = 5;

type SyncEventType = InterestGroupEvent | InterestGroupTeamEvent | TeamEvent;
type SyncPayload =
  | InterestGroupPayload
  | InterestGroupTeamPayload
  | TeamPayload;

const syncInterestGroupFactory =
  (
    eventDataProvider: EventDataProvider,
    interestGroupDataProvider: InterestGroupDataProvider,
  ) =>
  async (interestGroupId: string) => {
    const calendarId =
      await interestGroupDataProvider.fetchCalendarId(interestGroupId);

    if (!calendarId) {
      logger.info(
        `Interest group ${interestGroupId} has no calendar, skipping attendance sync`,
      );
      return;
    }

    const now = new Date();
    const [memberships, events] = await Promise.all([
      eventDataProvider.fetchInterestGroupMembershipsByCalendarId(calendarId),
      eventDataProvider.fetchUpcomingEventsByCalendarId(calendarId, now),
    ]);

    const updates = events.flatMap((calendarEvent) => {
      const attendance = getAttendanceToSync(
        calendarEvent.attendance,
        getInterestGroupTeamIdsForEvent(memberships, calendarEvent.endDate),
      );
      return attendance ? [{ eventId: calendarEvent.id, attendance }] : [];
    });

    await mapLimit(
      updates,
      MAX_CONCURRENT_EVENT_UPDATES,
      async ({ eventId, attendance }: (typeof updates)[number]) => {
        logger.info(
          `Updating attendance for event ${eventId} of interest group ${interestGroupId}`,
        );
        await eventDataProvider.updateEventDetails(eventId, { attendance });
      },
    );
  };

/**
 * Keeps the attendance of interest group events that haven't ended in sync
 * with the interest group teams. It runs when an interest group, an interest
 * group team or a team (e.g. its inactiveSince) is published.
 */
export const syncInterestGroupEventAttendanceHandler = (
  eventDataProvider: EventDataProvider,
  interestGroupDataProvider: InterestGroupDataProvider,
): EventBridgeHandler<SyncEventType, SyncPayload> => {
  const syncInterestGroup = syncInterestGroupFactory(
    eventDataProvider,
    interestGroupDataProvider,
  );

  const getInterestGroupIds = async (
    detailType: SyncEventType,
    resourceId: string,
  ): Promise<string[]> => {
    if (detailType.startsWith('InterestGroupsTeams')) {
      const interestGroupId =
        await interestGroupDataProvider.fetchIdByInterestGroupTeamId(
          resourceId,
        );
      return interestGroupId ? [interestGroupId] : [];
    }
    if (detailType.startsWith('Teams')) {
      return interestGroupDataProvider.fetchIdsByTeamId(resourceId);
    }
    return [resourceId];
  };

  return async (event) => {
    const detailType = event['detail-type'];
    const { resourceId } = event.detail;
    logger.info(`Received ${detailType} event for entry with id ${resourceId}`);

    const interestGroupIds = await getInterestGroupIds(detailType, resourceId);

    if (interestGroupIds.length === 0) {
      logger.info(
        `Entry ${resourceId} is not linked to an interest group, skipping attendance sync`,
      );
      return;
    }

    for (const interestGroupId of interestGroupIds) {
      await syncInterestGroup(interestGroupId);
    }
  };
};

/* istanbul ignore next */
export const handler: Handler = sentryWrapper(
  syncInterestGroupEventAttendanceHandler(
    getEventDataProvider(),
    getInterestGroupDataProvider(),
  ),
);
