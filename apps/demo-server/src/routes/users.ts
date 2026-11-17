import { Router } from 'express';
import { requireAdmin, Role, toStatus, UserStatus } from '../auth';
import { inviteEntity, userEntity } from '../data/entities';
import { updateUserSchema } from '../schemas';
import { currentUser, pathParam } from './request';
import { validate } from './validate';
import { asyncRouter } from './async-router';

export const usersRouter = (): Router => {
  const router = asyncRouter();

  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    const { data } = await userEntity.query.all({}).go({ pages: 'all' });
    res.json({
      items: data.map((user) => ({
        sub: user.sub,
        name: user.name,
        email: user.email,
        role: user.role,
        status: toStatus(user.status),
        createdAt: user.createdAt,
      })),
    });
  });

  router.patch('/:sub', validate(updateUserSchema), async (req, res) => {
    const sub = pathParam(req, 'sub');
    if (sub === currentUser(req).sub) {
      res.status(400).json({ error: 'self_target' });
      return;
    }

    const existing = await userEntity.get({ sub }).go();
    if (!existing.data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const { role, status } = req.body as {
      role?: Role;
      status?: UserStatus;
    };

    const { data } = await userEntity
      .patch({ sub })
      .set({
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
      })
      .go({ response: 'all_new' });

    res.json({
      sub,
      name: data.name ?? existing.data.name,
      email: data.email ?? existing.data.email,
      role: data.role ?? role ?? existing.data.role,
      status: toStatus(data.status ?? status),
      createdAt: data.createdAt ?? existing.data.createdAt,
    });
  });

  router.delete('/:sub', async (req, res) => {
    const sub = pathParam(req, 'sub');
    if (sub === currentUser(req).sub) {
      res.status(400).json({ error: 'self_target' });
      return;
    }

    const existing = await userEntity.get({ sub }).go();
    if (!existing.data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // the invite goes first, and its failure fails the request: userMiddleware
    // rebuilds a user from a surviving invite on the very next request, so a
    // swallowed error here undoes the deletion moments later
    await inviteEntity.delete({ email: existing.data.email }).go();
    await userEntity.delete({ sub }).go();

    res.status(204).end();
  });

  return router;
};
