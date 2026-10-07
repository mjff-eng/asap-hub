import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';

// express 4 does not forward rejected promises to the error handler
export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = handler(req, res, next) as unknown;
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      (result as Promise<unknown>).catch(next);
    }
  };

const methods = ['get', 'post', 'patch', 'put', 'delete'] as const;

// a router whose handlers may all be async, without asyncHandler at every route
export const asyncRouter = (): Router => {
  const router = Router();
  methods.forEach((method) => {
    const original = router[method].bind(router) as (
      ...args: unknown[]
    ) => Router;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (router as any)[method] = (...args: unknown[]) =>
      original(
        ...args.map((arg) =>
          typeof arg === 'function' ? asyncHandler(arg as RequestHandler) : arg,
        ),
      );
  });
  return router;
};
