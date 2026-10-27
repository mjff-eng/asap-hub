import { Router } from 'express';
import { playbackErrorSchema } from '../schemas';
import { currentUser, pathParam, requireVideoIdParam } from './request';
import { validate } from './validate';

// the browser's own MediaError text is the only record of why a video would not play for someone
export const registerPlaybackErrorRoutes = (router: Router): void => {
  router.post(
    '/:id/playback-errors',
    requireVideoIdParam('id'),
    validate(playbackErrorSchema),
    (req, res) => {
      const { code, message, userAgent } = req.body as {
        code: number;
        message: string;
        userAgent?: string;
      };
      const { sub, role } = currentUser(req);
      // eslint-disable-next-line no-console
      console.warn(
        JSON.stringify({
          event: 'playback_error',
          videoId: pathParam(req, 'id'),
          sub,
          role,
          code,
          message,
          userAgent,
        }),
      );
      res.status(204).end();
    },
  );
};
