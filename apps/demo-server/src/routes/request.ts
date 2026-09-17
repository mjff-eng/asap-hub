import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AuthenticatedUser } from '../auth';

const anonymous: AuthenticatedUser = {
  sub: '',
  email: '',
  name: '',
  role: 'member',
  status: 'active',
};

// the auth middleware always populates req.user before any router runs
export const currentUser = (req: Request): AuthenticatedUser =>
  req.user ?? anonymous;

export const pathParam = (req: Request, name: string): string =>
  req.params[name] ?? '';

// express decodes %2f in a path param, so an id arrives able to carry '/', '\'
// and '..'. Ids are concatenated straight into S3 keys, DynamoDB key templates
// and CloudFront policy resources, so only this safe alphabet is let through.
const videoIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export const isVideoId = (value: string): boolean => videoIdPattern.test(value);

// folder ids reach the same places (DynamoDB key templates, GSI1PK) and are
// additionally accepted from request bodies, so they share the safe alphabet
export const isFolderId = (value: string): boolean =>
  value === 'ROOT' || videoIdPattern.test(value);

export const requireVideoIdParam =
  (name: string): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!isVideoId(pathParam(req, name))) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    next();
  };

export const requireFolderIdParam =
  (name: string): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!isFolderId(pathParam(req, name))) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    next();
  };
