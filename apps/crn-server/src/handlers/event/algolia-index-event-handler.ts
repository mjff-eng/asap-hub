import { AlgoliaClient, algoliaSearchClientFactory } from '@asap-hub/algolia';
import { NotFoundError } from '@asap-hub/errors';
import { EventController, EventDataObject, EventEvent } from '@asap-hub/model';
import { EventBridgeHandler } from '@asap-hub/server-common';
import { notFound, isBoom } from '@hapi/boom';
import { EventBridgeEvent } from 'aws-lambda';
import { algoliaApiKey, algoliaAppId, algoliaIndex } from '../../config';
import Event from '../../controllers/event.controller';
import { getEventDataProvider } from '../../dependencies/events.dependencies';
import { getExternalAuthorDataProvider } from '../../dependencies/external-authors.dependencies';
import logger from '../../utils/logger';
import { sentryWrapper } from '../../utils/sentry-wrapper';
import { EventPayload } from '../event-bus';
import { addTagsFunction } from '../helper';

export const indexEventHandler =
  (
    eventController: EventController,
    algoliaClient: AlgoliaClient<'crn'>,
  ): EventBridgeHandler<EventEvent, EventPayload> =>
  async (event) => {
    logger.debug(`Event ${event['detail-type']}`);

    try {
      const crnEvent = await eventController.fetchById(event.detail.resourceId);

      logger.debug(`Fetched event ${crnEvent.id}`);
      if (crnEvent.hidden) {
        throw notFound();
      }
      await algoliaClient.save({
        data: addTagsFunction(crnEvent) as EventDataObject,
        type: 'event',
      });

      logger.debug(`Saved event  ${crnEvent.id}`);
    } catch (e) {
      if (
        (isBoom(e) && e.output.statusCode === 404) ||
        e instanceof NotFoundError
      ) {
        await algoliaClient.remove(event.detail.resourceId);
        return;
      }

      logger.error(e, 'Error while saving event to Algolia');
      throw e;
    }
  };

/* istanbul ignore next */
export const handler = sentryWrapper(
  indexEventHandler(
    new Event(getEventDataProvider(), getExternalAuthorDataProvider()),
    algoliaSearchClientFactory({ algoliaApiKey, algoliaAppId, algoliaIndex }),
  ),
);

export type EventIndexEventBridgeEvent = EventBridgeEvent<
  EventEvent,
  EventController
>;
