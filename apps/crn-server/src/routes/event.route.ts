import { EventResponse, ListEventResponse } from '@asap-hub/model';
import { isEventProjectManager } from '@asap-hub/validation';
import Boom from '@hapi/boom';
import { Response, Router } from 'express';
import {
  validateEventFetchParameters,
  validateEventParameters,
  validateEventUpdateDetailsPayload,
} from '../validation/event.validation';
import EventController from '../controllers/event.controller';

export const eventRouteFactory = (eventController: EventController): Router => {
  const eventRoutes = Router();

  eventRoutes.get('/events', async (req, res: Response<ListEventResponse>) => {
    const query = validateEventFetchParameters(req.query);
    const result = await eventController.fetch(query);

    res.json(result);
  });

  eventRoutes.get<{ eventId: string }>(
    '/events/:eventId',
    async (req, res: Response<EventResponse>) => {
      const { params } = req;
      const { eventId } = validateEventParameters(params);
      const result = await eventController.fetchById(eventId);

      res.json(result);
    },
  );

  eventRoutes.patch<{ eventId: string }>(
    '/events/:eventId',
    async (req, res: Response<EventResponse>) => {
      const { params, body, loggedInUser } = req;
      const { eventId } = validateEventParameters(params);
      const payload = validateEventUpdateDetailsPayload(body);

      const isAttendanceWrite = payload.attendance !== undefined;
      const isSpeakerWrite =
        payload.speakersToRemove !== undefined ||
        payload.preliminaryDataShared !== undefined;

      if (!isAttendanceWrite && !isSpeakerWrite) {
        throw Boom.forbidden();
      }

      if (isAttendanceWrite && !loggedInUser?.techSupport) {
        throw Boom.forbidden();
      }

      if (isSpeakerWrite) {
        const event = await eventController.fetchById(eventId);

        if (!isEventProjectManager(loggedInUser, event)) {
          throw Boom.forbidden();
        }
      }

      const result = await eventController.updateEventDetails(eventId, payload);

      res.json(result);
    },
  );

  return eventRoutes;
};
