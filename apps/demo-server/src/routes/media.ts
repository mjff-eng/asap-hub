import { Request, Response, Router } from 'express';
import { Readable } from 'stream';
import { getObject } from '../storage';
import { asyncRouter } from './async-router';

export const mediaRouter = (): Router => {
  const router = asyncRouter();

  router.get(/.*/, async (req: Request, res: Response) => {
    const key = `media/${decodeURIComponent(req.path.replace(/^\//, ''))}`;
    const { range } = req.headers;

    try {
      const object = await getObject(key, range);

      if (object.contentType) {
        res.setHeader('Content-Type', object.contentType);
      }
      res.setHeader('Accept-Ranges', 'bytes');
      if (object.contentLength !== undefined) {
        res.setHeader('Content-Length', String(object.contentLength));
      }
      if (object.contentRange) {
        res.setHeader('Content-Range', object.contentRange);
        res.status(206);
      }

      const body = object.body as Readable;
      // headers are already out, so a mid-stream failure can only end the response
      body.on('error', () => res.destroy());
      body.pipe(res);
    } catch {
      res.status(404).json({ error: 'not_found' });
    }
  });

  return router;
};
