import {
  EventAttendeesFile,
  EventResponse,
  ListEventResponse,
  UserResponse,
} from '@asap-hub/model';
import { isEventProjectManager } from '@asap-hub/validation';
import Boom from '@hapi/boom';
import { RequestHandler, Response, Router } from 'express';
import multer from 'multer';
import {
  validateEventFetchParameters,
  validateEventParameters,
  validateEventUpdateDetailsPayload,
} from '../validation/event.validation';
import EventController from '../controllers/event.controller';

const upload = multer();

const allowedAttendeesFileExtensions = ['.csv', '.xlsx'];

const canEditAttendance = (
  loggedInUser: UserResponse | undefined,
  event: EventResponse,
) => !!loggedInUser?.techSupport || isEventProjectManager(loggedInUser, event);

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

      const isAttendanceWrite =
        payload.attendance !== undefined ||
        payload.attendeesFileIds !== undefined;
      const isSpeakerWrite =
        payload.speakersToRemove !== undefined ||
        payload.speakersToUnlink !== undefined ||
        payload.preliminaryDataShared !== undefined;

      if (!isAttendanceWrite && !isSpeakerWrite) {
        throw Boom.forbidden();
      }

      const event = await eventController.fetchById(eventId);

      if (isAttendanceWrite && !canEditAttendance(loggedInUser, event)) {
        throw Boom.forbidden();
      }

      if (isSpeakerWrite && !isEventProjectManager(loggedInUser, event)) {
        throw Boom.forbidden();
      }

      const result = await eventController.updateEventDetails(eventId, payload);

      res.json(result);
    },
  );

  eventRoutes.post<{ eventId: string }, EventAttendeesFile>(
    '/events/:eventId/attendees-files',
    upload.single('file') as unknown as RequestHandler<
      { eventId: string },
      EventAttendeesFile
    >,
    async (req, res) => {
      const { params, file, loggedInUser } = req;
      const { eventId } = validateEventParameters(params);

      const event = await eventController.fetchById(eventId);

      if (!canEditAttendance(loggedInUser, event)) {
        throw Boom.forbidden();
      }

      const filename = file?.originalname.toLowerCase() ?? '';
      if (
        !file ||
        !allowedAttendeesFileExtensions.some((extension) =>
          filename.endsWith(extension),
        )
      ) {
        throw Boom.badRequest('No file provided or file is not a CSV or XLSX.');
      }

      const attendeesFile = await eventController.createAttendeesFile({
        content: file.buffer,
        contentType: file.mimetype,
        filename: file.originalname,
      });

      res.status(201).json(attendeesFile);
    },
  );

  return eventRoutes;
};
