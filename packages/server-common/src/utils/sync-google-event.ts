import {
  EventController,
  EventResponse,
  EventStatus,
  gp2,
} from '@asap-hub/model';
import { calendar_v3 as calendarV3 } from '@googleapis/calendar';
import {
  GoogleEvent,
  validateGoogleEvent,
} from '../validation/sync-google-event.validation';
import { Logger } from './logger';

export type SyncEvent = (
  eventPayload: calendarV3.Schema$Event,
  googleCalendarId: string,
  cmsCalendarId: string,
  defaultTimezone: string,
) => Promise<EventResponse | gp2.EventResponse>;

const getEventDate = (eventDate: calendarV3.Schema$EventDateTime): string =>
  eventDate.dateTime
    ? new Date(eventDate.dateTime).toISOString()
    : new Date(eventDate.date || 0).toISOString();

const validateEvent = (
  eventPayload: calendarV3.Schema$Event,
  logger: Logger,
): GoogleEvent => {
  try {
    return validateGoogleEvent(eventPayload as GoogleEvent);
  } catch (error) {
    logger.error(error, 'Ignored event update, validation error');
    throw error;
  }
};
export const syncEventFactory =
  (
    eventsController: EventController | gp2.EventController,
    logger: Logger,
    app: 'crn' | 'gp2',
  ): SyncEvent =>
  async (eventPayload, googleCalendarId, cmsCalendarId, defaultTimezone) => {
    const googleEvent = validateEvent(eventPayload, logger);

    logger.debug({ googleEvent }, 'google event');

    if (googleEvent.organizer?.email !== googleCalendarId) {
      logger.error(
        `The calendar is not the organiser of the event. Google Event Id: ${googleEvent.id}. Organizer: ${googleEvent.organizer?.email}. GoogleCalendarId: ${googleCalendarId}`,
      );
      throw new Error('Invalid organiser');
    }

    const isCRNEvent = app === 'crn';

    const newEvent = {
      googleId: googleEvent.id,
      title: googleEvent.summary,
      description: googleEvent.description,
      startDate: getEventDate(googleEvent.start),
      startDateTimeZone: googleEvent.start.timeZone || defaultTimezone,
      endDate: getEventDate(googleEvent.end),
      endDateTimeZone: googleEvent.end.timeZone || defaultTimezone,
      status: (googleEvent.status.charAt(0).toUpperCase() +
        googleEvent.status.slice(1)) as EventStatus,
      calendar: cmsCalendarId,
      // the GP2 content model has no recurring field, so only send it for CRN
      ...(isCRNEvent
        ? { recurring: Boolean(googleEvent.recurringEventId) }
        : {}),
    };

    try {
      logger.debug('Searching for event %s', googleEvent.id);
      const existingEvent = await eventsController.fetchByGoogleId(
        googleEvent.id,
      );

      if (existingEvent) {
        const hidden =
          (newEvent.status === 'Cancelled' &&
            existingEvent.status !== 'Cancelled') ||
          existingEvent.hidden ||
          false;

        const eventToUpdate = { ...newEvent, hidden };
        logger.debug(
          { id: existingEvent.id, event: eventToUpdate },
          'Found event. Updating.',
        );
        return eventsController.update(existingEvent.id, eventToUpdate);
      }

      const hidden = newEvent.status === 'Cancelled';
      if (isCRNEvent) {
        // inPerson is owned by editors in the CMS, so it is only set on
        // create and never sent on update.
        const crnEventToCreate = {
          ...newEvent,
          hidden,
          inPerson: false,
        };

        logger.info(
          {
            id: googleEvent.id,
            event: crnEventToCreate,
          },
          'Event not found. Creating.',
        );
        return eventsController.create(crnEventToCreate);
      }

      const gp2EventToCreate = { ...newEvent, hidden, inPerson: false };

      logger.info(
        {
          id: googleEvent.id,
          event: gp2EventToCreate,
        },
        'Event not found. Creating.',
      );
      return eventsController.create(gp2EventToCreate);
    } catch (err) {
      logger.error(err, 'Error syncing event');
      throw err;
    }
  };
