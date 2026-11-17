import { Router } from 'express';
import { requireAdmin, requireCreator, Role } from '../auth';
import { inviteEntity } from '../data/entities';
import { sendInviteEmail } from '../email';
import { createInviteSchema } from '../schemas';
import { currentUser, pathParam } from './request';
import { validate } from './validate';
import { asyncRouter } from './async-router';

export const invitesRouter = (): Router => {
  const router = asyncRouter();

  router.get('/', requireCreator, async (_req, res) => {
    const { data } = await inviteEntity.query.all({}).go({ pages: 'all' });
    res.json({
      items: data.map((invite) => ({
        email: invite.email,
        role: invite.role,
        createdAt: invite.createdAt,
        ...(invite.claimedBy ? { claimedBy: invite.claimedBy.name } : {}),
      })),
    });
  });

  router.post(
    '/',
    requireCreator,
    validate(createInviteSchema),
    async (req, res) => {
      const body = req.body as { email: string; role: Role };
      const { role } = body;
      const email = body.email.toLowerCase();

      if (role === 'admin' && currentUser(req).role !== 'admin') {
        res.status(403).json({ error: 'forbidden' });
        return;
      }

      const existing = await inviteEntity.get({ email }).go();
      if (existing.data?.claimedBy) {
        res.status(409).json({ error: 'already_invited' });
        return;
      }

      await inviteEntity
        .upsert({
          email,
          role,
          invitedBy: { sub: currentUser(req).sub, name: currentUser(req).name },
          createdAt: existing.data?.createdAt ?? new Date().toISOString(),
        })
        .go();

      await sendInviteEmail(email);

      res.json({ email, role });
    },
  );

  router.delete('/:email', requireAdmin, async (req, res) => {
    const email = pathParam(req, 'email').toLowerCase();

    const existing = await inviteEntity.get({ email }).go();
    if (!existing.data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    // a claimed invite belongs to a real account, managed from the Users page
    if (existing.data.claimedBy) {
      res.status(400).json({ error: 'claimed' });
      return;
    }

    await inviteEntity.delete({ email }).go();

    res.status(204).end();
  });

  return router;
};
