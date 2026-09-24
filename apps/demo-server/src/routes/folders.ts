import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { canViewDrafts, requireCreator } from '../auth';
import { folderEntity, videoEntity } from '../data/entities';
import { createFolderSchema, updateFolderSchema } from '../schemas';
import { deleteVideoCascade, RenderInProgress } from './cascade';
import { currentUser, pathParam, requireFolderIdParam } from './request';
import { validate } from './validate';
import { asyncRouter } from './async-router';
import { heldByAnother, videosInFolder } from './video-shared';

export const rootFolderId = 'ROOT';

export const maxFolderDepth = 3;

// PATCH sentinel: parentId 'TOP' detaches a folder to the top level
export const topLevelParentId = 'TOP';

type FolderRow = { id: string; name: string; parentId?: string };

// a video whose folderId names no row appears in no listing and survives every
// cleanup path, so every write that sets one checks the destination first
export const folderExists = async (folderId: string): Promise<boolean> => {
  if (folderId === rootFolderId) {
    return true;
  }
  const { data } = await folderEntity.get({ id: folderId }).go();
  return Boolean(data);
};

const depthOf = (id: string, byId: Map<string, FolderRow>): number => {
  let depth = 1;
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    depth += 1;
    current = byId.get(current.parentId);
  }
  return depth;
};

const subtreeIds = (id: string, folders: readonly FolderRow[]): string[] => {
  const ids = [id];
  for (let index = 0; index < ids.length; index += 1) {
    const parentId = ids[index];
    folders.forEach((folder) => {
      if (folder.parentId === parentId && !ids.includes(folder.id)) {
        ids.push(folder.id);
      }
    });
  }
  return ids;
};

export const foldersRouter = (): Router => {
  const router = asyncRouter();

  router.get('/', async (_req, res) => {
    const { data } = await folderEntity.query.all({}).go({ pages: 'all' });
    res.json({
      items: [
        { id: rootFolderId, name: 'Unfiled' },
        ...data.map(({ id, name, parentId }) => ({ id, name, parentId })),
      ],
    });
  });

  router.get('/counts', async (req, res) => {
    const { data } = await folderEntity.query.all({}).go({ pages: 'all' });
    const folderIds = [rootFolderId, ...data.map(({ id }) => id)];
    const isCreator = canViewDrafts(req.user?.role);

    const entries = await Promise.all(
      folderIds.map(async (folderId) => {
        const videos = await videosInFolder(folderId, isCreator);
        // a published video still being encoded has nothing to watch yet, so it
        // is not counted for a member
        const visible = isCreator
          ? videos
          : videos.filter(({ processingState }) => processingState === 'ready');
        return [folderId, visible.length] as const;
      }),
    );

    res.json({ counts: Object.fromEntries(entries) });
  });

  router.post(
    '/',
    requireCreator,
    validate(createFolderSchema),
    async (req, res) => {
      const id = uuid();
      const { name, parentId } = req.body as {
        name: string;
        parentId?: string;
      };

      if (parentId) {
        const { data } = await folderEntity.query.all({}).go({ pages: 'all' });
        const byId = new Map<string, FolderRow>(
          data.map((folder) => [folder.id, folder]),
        );
        if (!byId.has(parentId)) {
          res.status(404).json({ error: 'not_found' });
          return;
        }
        if (depthOf(parentId, byId) >= maxFolderDepth) {
          res.status(400).json({ error: 'max_depth' });
          return;
        }
      }

      await folderEntity
        .create({ id, name, parentId, createdAt: new Date().toISOString() })
        .go();
      res.json({ id, name, parentId });
    },
  );

  const folderIdParam = requireFolderIdParam('id');

  router.patch(
    '/:id',
    folderIdParam,
    requireCreator,
    validate(updateFolderSchema),
    async (req, res) => {
      const id = pathParam(req, 'id');
      if (id === rootFolderId) {
        res.status(400).json({ error: 'root_folder' });
        return;
      }

      const { name, parentId } = req.body as {
        name?: string;
        parentId?: string;
      };
      const existing = await folderEntity.get({ id }).go();
      if (!existing.data) {
        res.status(404).json({ error: 'not_found' });
        return;
      }

      const nextName = name ?? existing.data.name;
      let nextParentId = existing.data.parentId;

      if (parentId !== undefined) {
        const { data: allFolders } = await folderEntity.query
          .all({})
          .go({ pages: 'all' });

        if (parentId === topLevelParentId) {
          nextParentId = undefined;
        } else {
          const byId = new Map<string, FolderRow>(
            allFolders.map((folder) => [folder.id, folder]),
          );
          if (!byId.has(parentId)) {
            res.status(404).json({ error: 'not_found' });
            return;
          }
          // a folder cannot be moved inside itself or any of its descendants
          if (subtreeIds(id, allFolders).includes(parentId)) {
            res.status(400).json({ error: 'cycle' });
            return;
          }

          const movedSubtreeHeight = subtreeIds(id, allFolders).reduce(
            (tallest, descendantId) =>
              Math.max(
                tallest,
                depthOf(descendantId, byId) - depthOf(id, byId),
              ),
            0,
          );
          if (
            depthOf(parentId, byId) + 1 + movedSubtreeHeight >
            maxFolderDepth
          ) {
            res.status(400).json({ error: 'max_depth' });
            return;
          }
          nextParentId = parentId;
        }
      }

      // name is part of GSI1SK, so the item is rewritten wholesale to recompute the key
      await folderEntity
        .put({ ...existing.data, name: nextName, parentId: nextParentId })
        .go();

      res.json({ id, name: nextName, parentId: nextParentId });
    },
  );

  router.delete('/:id', folderIdParam, requireCreator, async (req, res) => {
    const id = pathParam(req, 'id');
    if (id === rootFolderId) {
      res.status(400).json({ error: 'root_folder' });
      return;
    }

    const existing = await folderEntity.get({ id }).go();
    if (!existing.data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const { data: allFolders } = await folderEntity.query
      .all({})
      .go({ pages: 'all' });
    const byId = new Map<string, FolderRow>(
      allFolders.map((folder) => [folder.id, folder]),
    );

    // deepest first so a parent is only removed once its children are gone
    const ids = subtreeIds(id, allFolders).reverse();

    const { sub } = currentUser(req);
    const now = Date.now();
    const locked: string[] = [];
    const rendering: string[] = [];
    // a folder that still holds a video the cascade would not touch has to stay
    // behind with it, or the video would point at a row that no longer exists
    const kept = new Set<string>();

    await ids.reduce(
      (chain, folderId) =>
        chain.then(async () => {
          const { data: videos } = await videoEntity.query
            .byFolder({ folderId })
            .go({ pages: 'all' });

          let skipped = kept.has(folderId);

          await Promise.all(
            videos.map(async (video) => {
              // a video someone else holds open is skipped rather than
              // destroyed, exactly as the single and bulk deletes do
              if (heldByAnother(video, sub, now)) {
                locked.push(video.id);
                skipped = true;
                return;
              }
              try {
                await deleteVideoCascade(video.id);
              } catch (error) {
                if (error instanceof RenderInProgress) {
                  rendering.push(video.id);
                  skipped = true;
                  return;
                }
                // eslint-disable-next-line no-console
                console.error(`failed to delete video ${video.id}`, error);
              }
            }),
          );

          if (skipped) {
            kept.add(folderId);
            const parentId = byId.get(folderId)?.parentId;
            if (parentId) {
              kept.add(parentId);
            }
            return;
          }

          await folderEntity.delete({ id: folderId }).go();
        }),
      Promise.resolve(),
    );

    res.json({ locked, rendering, kept: [...kept] });
  });

  return router;
};
