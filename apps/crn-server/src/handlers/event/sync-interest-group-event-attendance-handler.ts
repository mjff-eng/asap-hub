import 'source-map-support/register';

import {
  getInterestGroupTeamIdsForEvent,
  InterestGroupEvent,
  InterestGroupTeamEvent,
} from '@asap-hub/model';
import { EventBridgeHandler } from '@asap-hub/server-common';
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
import { InterestGroupPayload, InterestGroupTeamPayload } from '../event-bus';

const isInterestGroupTeamEvent = (
  detailType: InterestGroupEvent | InterestGroupTeamEvent,
): detailType is InterestGroupTeamEvent =>
  detailType.startsWith('InterestGroupsTeams');

/**
 * Keeps the attendance of interest group events that haven't ended in sync
 * with the interest group teams.
 *
 * Unpublished entries are not handled:
 * - Unpublishing an interest group leaves the attendance of its events as
 *   it is. Republishing it triggers InterestGroupsPublished, which syncs the
 *   attendance again.
 * - Once an interest group team is unpublished, its interest group can't be
 *   found through GraphQL. The team is removed from the attendance the next
 *   time the interest group is published. Handling it directly would need a
 *   lookup through the management API (links_to_entry).
 */
export const syncInterestGroupEventAttendanceHandler =
  (
    eventDataProvider: EventDataProvider,
    interestGroupDataProvider: InterestGroupDataProvider,
  ): EventBridgeHandler<
    InterestGroupEvent | InterestGroupTeamEvent,
    InterestGroupPayload | InterestGroupTeamPayload
  > =>
  async (event) => {
    const { resourceId } = event.detail;
    logger.info(
      `Received ${event['detail-type']} event for entry with id ${resourceId}`,
    );

    const interestGroupId = isInterestGroupTeamEvent(event['detail-type'])
      ? await interestGroupDataProvider.fetchIdByInterestGroupTeamId(resourceId)
      : resourceId;

    if (!interestGroupId) {
      logger.info(
        `Interest group team ${resourceId} is not linked to an interest group, skipping attendance sync`,
      );
      return;
    }

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

    for (const calendarEvent of events) {
      const attendance = getAttendanceToSync(
        calendarEvent.attendance,
        getInterestGroupTeamIdsForEvent(memberships, calendarEvent.endDate),
      );

      if (attendance) {
        logger.info(
          `Updating attendance for event ${calendarEvent.id} of interest group ${interestGroupId}`,
        );
        await eventDataProvider.updateEventDetails(calendarEvent.id, {
          attendance,
        });
      }
    }
  };

/* istanbul ignore next */
export const handler: Handler = sentryWrapper(
  syncInterestGroupEventAttendanceHandler(
    getEventDataProvider(),
    getInterestGroupDataProvider(),
  ),
);
