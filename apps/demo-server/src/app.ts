import express, { Express, NextFunction, Request, Response } from 'express';
import { claimsMiddleware, userMiddleware } from './auth';
import { isLocal } from './config';
import { asyncHandler } from './routes/async-router';
import { foldersRouter } from './routes/folders';
import { currentUser } from './routes/request';
import { invitesRouter } from './routes/invites';
import { mediaRouter } from './routes/media';
import { captureRouter } from './routes/capture';
import { projectsRouter } from './routes/projects';
import { recordingsRouter } from './routes/recordings';
import { uploadsRouter } from './routes/uploads';
import { usersRouter } from './routes/users';
import { videosRouter } from './routes/videos';

// a Map rather than an object: `type` is whatever the thrown error carries, and
// an object lookup would find Object.prototype members such as `constructor`
const bodyErrorCodes = new Map([
  ['entity.parse.failed', 'invalid_json'],
  ['entity.too.large', 'payload_too_large'],
  ['parameters.too.many', 'payload_too_large'],
  ['charset.unsupported', 'unsupported_media_type'],
  ['encoding.unsupported', 'unsupported_media_type'],
  ['request.aborted', 'request_aborted'],
]);

// a body the parser refuses arrives as an http-errors object carrying both a
// 4xx status and a `type`. Nothing else that reaches the handler carries that
// pair: an aws sdk fault has neither, only $fault and $metadata, so a
// ConditionalCheckFailedException cannot be reflected back as the caller's
// mistake
const clientError = (
  error: Error,
): { status: number; code: string } | undefined => {
  const { status, statusCode, type } = error as Error & {
    status?: unknown;
    statusCode?: unknown;
    type?: unknown;
  };
  const value = typeof status === 'number' ? status : statusCode;
  if (typeof value !== 'number' || value < 400 || value >= 500) {
    return undefined;
  }
  if (typeof type !== 'string') {
    return undefined;
  }
  return {
    status: value,
    code: bodyErrorCodes.get(type) ?? 'invalid_request_body',
  };
};

export const appFactory = (): Express => {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // the capture snippet runs on someone else's site and carries a session token
  // rather than a user, so it is mounted ahead of the auth middleware
  app.use('/api/capture', captureRouter());

  if (isLocal()) {
    app.use('/media', mediaRouter());
  }

  const api = express.Router();
  // the timeline ceiling is 4MB; the body parser must not undercut it. It is
  // mounted here rather than on the app so it can never consume a capture body
  // ahead of that router's own, much smaller, cap
  api.use(express.json({ limit: '5mb' }));
  // per-user payloads and Set-Cookie must never be stored by CloudFront or a
  // shared proxy, whatever the distribution TTLs happen to be
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, private');
    next();
  });
  api.use(asyncHandler(claimsMiddleware));
  api.use(asyncHandler(userMiddleware));

  api.get('/me', (req, res) => {
    const { sub, name, email, role } = currentUser(req);
    res.json({ sub, name, email, role });
  });

  api.use('/folders', foldersRouter());
  api.use('/projects', projectsRouter());
  api.use('/projects', recordingsRouter());
  api.use('/videos', videosRouter());
  api.use('/uploads', uploadsRouter());
  api.use('/invites', invitesRouter());
  api.use('/users', usersRouter());

  app.use('/api', api);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    const refusal = clientError(error);
    if (refusal) {
      // one line, and never the parser's own message, which quotes the body
      // back. It is kept at warn so a caller's mistake cannot bury, or page
      // anyone about, a real fault: the snippet posts no-cors and never sees
      // this answer, so the log is the only trace an over-cap batch leaves
      // eslint-disable-next-line no-console
      console.warn(`${req.method} ${req.path} refused: ${refusal.code}`);
      res.status(refusal.status).json({ error: refusal.code });
      return;
    }
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ error: 'internal' });
  });

  return app;
};
