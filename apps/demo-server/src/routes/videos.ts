import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Request, Response, Router } from 'express';
import { canViewDrafts, requireCreator } from '../auth';
import { getTableName, isLocal } from '../config';
import { getDocumentClient } from '../data/client';
import { folderEntity, videoEntity } from '../data/entities';
import {
  bulkDeleteSchema,
  bulkMoveSchema,
  publishVideoSchema,
  updateVideoSchema,
} from '../schemas';
import { buildSignedCookies } from '../signed-cookies';
import { deleteVideoCascade, RenderInProgress } from './cascade';
import { folderExists, rootFolderId } from './folders';
import {
  currentUser,
  isFolderId,
  pathParam,
  requireVideoIdParam,
} from './request';
import { validate } from './validate';
import { asyncRouter } from './async-router';
import {
  applyGuardedUpdate,
  heldByAnother,
  holdsLease,
  holderNameOf,
  failedItem,
  isRenderActive,
  leaseDurationMs,
  lockedBody,
  renderOf,
  serialiseVideo,
  videoKey,
  VideoItem,
  VideoRow,
  videosInFolder,
} from './video-shared';

const byRecordedAtDescending = (a: VideoItem, b: VideoItem): number =>
  String(b.recordedAt).localeCompare(String(a.recordedAt));

// folderId and recordedAt are both composed into GSI1, so a write that moves
// either has to carry the recomputed keys; ElectroDB owns the templates, so they
// are read off a put that is never sent rather than rebuilt by hand here
const gsi1KeysOf = (row: VideoRow): Record<string, string> => {
  const { Item } = videoEntity.put(row).params() as {
    Item: Record<string, string>;
  };
  return { GSI1PK: Item.GSI1PK ?? '', GSI1SK: Item.GSI1SK ?? '' };
};

// the same cut: the section files were sliced at the chapter starts, so a list
// with the same starts still describes them however the titles have changed
const sameCut = (
  chapters: { startMs: number }[] = [],
  existing: { startMs: number }[] = [],
): boolean =>
  chapters.length === existing.length &&
  chapters.every(
    (chapter, index) => chapter.startMs === existing[index]?.startMs,
  );

export const videosRouter = (): Router => {
  const router = asyncRouter();

  router.get('/', async (req: Request, res: Response) => {
    const folderId = (req.query.folderId as string | undefined) || 'ROOT';
    // the query string is the one folder id that reaches a key template without
    // passing through requireFolderIdParam or folderIdField
    if (!isFolderId(folderId)) {
      res.status(400).json({ error: 'invalid_folder_id' });
      return;
    }
    const isCreator = canViewDrafts(req.user?.role);
    const data = await videosInFolder(folderId, isCreator);

    res.json({
      items: (data as VideoItem[])
        .slice()
        .sort(byRecordedAtDescending)
        .map((item) => serialiseVideo(item, isCreator)),
    });
  });

  router.get('/all', async (req: Request, res: Response) => {
    const isCreator = canViewDrafts(req.user?.role);
    const { data: folders } = await folderEntity.query
      .all({})
      .go({ pages: 'all' });
    const folderIds = [rootFolderId, ...folders.map(({ id }) => id)];

    const lists = await Promise.all(
      folderIds.map((folderId) => videosInFolder(folderId, isCreator)),
    );

    res.json({
      items: (lists.flat() as VideoItem[])
        .sort(byRecordedAtDescending)
        .map((item) => serialiseVideo(item, isCreator)),
    });
  });

  router.post(
    '/bulk-move',
    requireCreator,
    validate(bulkMoveSchema),
    async (req: Request, res: Response) => {
      const { ids, folderId } = req.body as { ids: string[]; folderId: string };

      if (!(await folderExists(folderId))) {
        res.status(404).json({ error: 'not_found' });
        return;
      }

      const moved: string[] = [];
      const missing: string[] = [];
      const locked: string[] = [];

      const moveOne = async (id: string): Promise<void> => {
        const existing = await videoEntity.get({ id }).go();
        if (!existing.data) {
          missing.push(id);
          return;
        }
        // a move is as visible to an open edit as a delete is: the editor would
        // find the demo it is holding somewhere else the moment it saved, so a
        // video someone else holds open is skipped, exactly as bulk-delete does
        if (heldByAnother(existing.data, currentUser(req).sub, Date.now())) {
          locked.push(id);
          return;
        }
        // patch recomputes GSI1PK from folderId and leaves the rest of the item alone
        await videoEntity
          .patch({ id })
          .set({ folderId, updatedAt: new Date().toISOString() })
          .add({ version: 1 })
          .go();
        moved.push(id);
      };
      await ids.reduce(
        (chain, id) => chain.then(() => moveOne(id)),
        Promise.resolve(),
      );

      res.json({ moved, missing, locked });
    },
  );

  router.post(
    '/bulk-delete',
    requireCreator,
    validate(bulkDeleteSchema),
    async (req: Request, res: Response) => {
      const { ids } = req.body as { ids: string[] };
      const deleted: string[] = [];
      const missing: string[] = [];
      const locked: string[] = [];
      const rendering: string[] = [];

      const deleteOne = async (id: string): Promise<void> => {
        const existing = await videoEntity.get({ id }).go();
        if (!existing.data) {
          missing.push(id);
          return;
        }
        // a video someone else holds open is skipped rather than destroyed,
        // matching the single delete; an unheld video needs no lease
        if (heldByAnother(existing.data, currentUser(req).sub, Date.now())) {
          locked.push(id);
          return;
        }
        try {
          await deleteVideoCascade(id);
          deleted.push(id);
        } catch (error) {
          if (error instanceof RenderInProgress) {
            rendering.push(id);
            return;
          }
          // eslint-disable-next-line no-console
          console.error(`failed to delete video ${id}`, error);
        }
      };
      await ids.reduce(
        (chain, id) => chain.then(() => deleteOne(id)),
        Promise.resolve(),
      );

      res.json({ deleted, missing, locked, rendering });
    },
  );

  const videoId = requireVideoIdParam('id');

  // the read that every guarded write starts from: 404 when the row is gone,
  // 409 naming the holder when the caller does not hold the lease the write
  // will be conditioned on anyway
  const readHeldVideo = async (
    req: Request,
    res: Response,
    now: number,
  ): Promise<VideoRow | undefined> => {
    const { data } = await videoEntity.get({ id: pathParam(req, 'id') }).go();
    if (!data) {
      res.status(404).json({ error: 'not_found' });
      return undefined;
    }
    if (!holdsLease(data, currentUser(req).sub, now)) {
      res.status(409).json(lockedBody(data));
      return undefined;
    }
    return data;
  };

  const respondWithVideo = async (
    req: Request,
    res: Response,
    id: string,
  ): Promise<void> => {
    const { data } = await videoEntity.get({ id }).go();
    res.json({
      video: serialiseVideo(data as VideoItem, canViewDrafts(req.user?.role)),
    });
  };

  router.get('/:id', videoId, async (req: Request, res: Response) => {
    const { data } = await videoEntity.get({ id: pathParam(req, 'id') }).go();
    if (!data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const isCreator = canViewDrafts(req.user?.role);
    if (!isCreator && data.status !== 'published') {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(serialiseVideo(data as VideoItem, isCreator));
  });

  router.patch(
    '/:id',
    videoId,
    requireCreator,
    validate(updateVideoSchema),
    async (req: Request, res: Response) => {
      const id = pathParam(req, 'id');
      const { version, ...changes } = req.body as {
        version: number;
        title?: string;
        folderId?: string;
        chapters?: { startMs: number; title: string }[];
        recordedAt?: string;
      };

      const now = Date.now();
      const existing = await readHeldVideo(req, res, now);
      if (!existing) {
        return;
      }

      if (
        changes.folderId !== undefined &&
        changes.folderId !== existing.folderId &&
        !(await folderExists(changes.folderId))
      ) {
        res.status(404).json({ error: 'not_found' });
        return;
      }

      const next = {
        title: changes.title ?? existing.title,
        folderId: changes.folderId ?? existing.folderId,
        recordedAt: changes.recordedAt ?? existing.recordedAt,
        chapters: changes.chapters ?? existing.chapters,
      };

      const written = await applyGuardedUpdate(res, {
        id,
        sub: currentUser(req).sub,
        now,
        expectedVersion: version,
        set: {
          ...next,
          // the section files were cut on the chapter starts, so a start moving
          // leaves none of them describing a chapter any more. The editor sends
          // the whole list on every save, renames included, and a rename cuts
          // nothing new.
          ...(sameCut(next.chapters, existing.chapters)
            ? {}
            : { sectionCount: 0 }),
          updatedAt: new Date().toISOString(),
          ...gsi1KeysOf({ ...existing, ...next }),
        },
      });
      if (!written) {
        return;
      }

      await respondWithVideo(req, res, id);
    },
  );

  // publishing is the same guarded write as unpublishing, down to the GSI sort
  // key the status is composed into
  const setStatus =
    (status: 'draft' | 'published') =>
    async (req: Request, res: Response): Promise<void> => {
      const id = pathParam(req, 'id');
      const { version } = req.body as { version: number };

      const now = Date.now();
      const existing = await readHeldVideo(req, res, now);
      if (!existing) {
        return;
      }

      const written = await applyGuardedUpdate(res, {
        id,
        sub: currentUser(req).sub,
        now,
        expectedVersion: version,
        set: {
          status,
          statusKey: status.toUpperCase(),
          updatedAt: new Date().toISOString(),
          ...gsi1KeysOf({ ...existing, status }),
        },
      });
      if (!written) {
        return;
      }

      await respondWithVideo(req, res, id);
    };

  router.post(
    '/:id/publish',
    videoId,
    requireCreator,
    validate(publishVideoSchema),
    setStatus('published'),
  );

  router.post(
    '/:id/unpublish',
    videoId,
    requireCreator,
    validate(publishVideoSchema),
    setStatus('draft'),
  );

  router.post('/:id/lease', videoId, requireCreator, async (req, res) => {
    const id = pathParam(req, 'id');
    const now = Date.now();
    const lockExpiresAt = now + leaseDurationMs;

    try {
      await getDocumentClient().send(
        new UpdateCommand({
          TableName: getTableName(),
          Key: videoKey(id),
          UpdateExpression:
            'SET lockedBy = :sub, lockedByName = :name, lockExpiresAt = :expires',
          // UpdateItem upserts, and every lease clause is true of an item that
          // does not exist, so without attribute_exists any id at all would mint
          // a VIDEO# row carrying none of the entity's required attributes
          ConditionExpression:
            'attribute_exists(PK) AND (attribute_not_exists(lockedBy) OR lockedBy = :sub OR lockExpiresAt < :now)',
          ExpressionAttributeValues: {
            ':sub': currentUser(req).sub,
            ':name': currentUser(req).name,
            ':expires': lockExpiresAt,
            ':now': now,
          },
          ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
        }),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        const failed = failedItem(error);
        // nothing came back on the failed condition, so there was no row to lease
        if (!failed) {
          res.status(404).json({ error: 'not_found' });
          return;
        }
        res.status(409).json({
          error: 'locked',
          ...(holderNameOf(failed) ? { holderName: holderNameOf(failed) } : {}),
        });
        return;
      }
      throw error;
    }

    res.json({
      lockedBy: currentUser(req).sub,
      lockedByName: currentUser(req).name,
      lockExpiresAt: new Date(lockExpiresAt).toISOString(),
    });
  });

  router.delete('/:id/lease', videoId, requireCreator, async (req, res) => {
    try {
      await getDocumentClient().send(
        new UpdateCommand({
          TableName: getTableName(),
          Key: videoKey(pathParam(req, 'id')),
          UpdateExpression: 'REMOVE lockedBy, lockedByName, lockExpiresAt',
          ConditionExpression: 'lockedBy = :sub',
          ExpressionAttributeValues: { ':sub': currentUser(req).sub },
        }),
      );
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
    res.status(204).end();
  });

  router.delete('/:id', videoId, requireCreator, async (req, res) => {
    const id = pathParam(req, 'id');

    const { data } = await videoEntity.get({ id }).go();
    if (!data) {
      res.status(204).end();
      return;
    }

    // deleting destroys the row and its media, so it needs the same lease the
    // other writes take; otherwise a second creator can wipe a demo mid-edit
    if (!holdsLease(data, currentUser(req).sub, Date.now())) {
      res.status(409).json(lockedBody(data));
      return;
    }

    // a container still writing into media/{id}/ would strand its output the
    // moment the prefix is emptied, and only a GLACIER_IR transition watches it
    if (isRenderActive(renderOf(data as VideoItem))) {
      res.status(409).json({ error: 'render_active' });
      return;
    }

    await deleteVideoCascade(id);
    res.status(204).end();
  });

  router.post('/:id/access', videoId, async (req, res) => {
    const id = pathParam(req, 'id');
    const { data } = await videoEntity.get({ id }).go();
    if (!data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const isCreator = canViewDrafts(req.user?.role);
    if (!isCreator && data.status !== 'published') {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // a studio render writes into media/{id}/r{n}/ so a re-render is not hidden
    // behind the day long CloudFront TTL on the previous output
    const mediaPath =
      typeof data.mediaPath === 'string' && data.mediaPath
        ? data.mediaPath
        : '';
    const base = mediaPath ? `/media/${id}/${mediaPath}` : `/media/${id}`;

    if (!isLocal()) {
      // an export cut lives under media/{id}/downloads/, which the studio may
      // fetch and a viewer may not, so a viewer is signed for the published
      // revision alone
      const scope = isCreator ? '' : mediaPath;
      const cookies = await buildSignedCookies(id, 'media', Date.now(), scope);
      const path = scope ? `/media/${id}/${scope}/` : `/media/${id}/`;
      if (scope) {
        // transitional: a viewer who watched before the path narrowed still
        // holds the broad cookie under the same name, and it is sent alongside
        // this one; retire this once no browser session predates that release
        cookies.forEach(({ name }) => {
          res.clearCookie(name, {
            path: `/media/${id}/`,
            secure: true,
            httpOnly: true,
            sameSite: 'lax',
          });
        });
      }
      cookies.forEach(({ name, value }) => {
        res.cookie(name, value, {
          path,
          secure: true,
          httpOnly: true,
          sameSite: 'lax',
        });
      });
    }

    res.json({
      streamUrl: `${base}/stream.mp4`,
      spriteUrl: `${base}/sprite.jpg`,
      thumbnailsVttUrl: `${base}/thumbnails.vtt`,
      sectionsBaseUrl: `${base}/sections`,
    });
  });

  return router;
};
