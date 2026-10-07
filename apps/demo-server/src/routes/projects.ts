import {
  createEmptyTimeline,
  currentSchemaVersion,
  parseTimeline,
  serialiseTimeline,
  Timeline,
  TimelineFormatError,
} from '@asap-hub/demo-timeline';
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { requireCreator } from '../auth';
import { videoEntity } from '../data/entities';
import { createProjectSchema, saveTimelineSchema } from '../schemas';
import {
  deleteObject,
  getObjectText,
  putObject,
  timelineKey,
} from '../storage';
import { registerAssetRoutes } from './assets';
import { asyncRouter } from './async-router';
import { folderExists } from './folders';
import { registerRenderRoutes } from './render';
import { currentUser, pathParam, requireVideoIdParam } from './request';
import { validate } from './validate';
import { createVideoRow } from './video-create';
import {
  applyGuardedUpdate,
  loadProject,
  serialiseVideo,
  VideoItem,
} from './video-shared';

// a timeline document is small next to the media, but big next to a DynamoDB
// item, so the item only ever holds a pointer to the revision in S3
// the document lives in S3, not on the row, so the ceiling only guards the
// request path; half a megabyte was three orders of magnitude under what the
// schema allows a few cursor captures to hold
const maxTimelineBytes = 4 * 1024 * 1024;

type TimelinePointer = {
  key: string;
  timelineVersion: number;
  schemaVersion: number;
  updatedAt: string;
};

const pointerOf = (item: VideoItem): TimelinePointer | undefined =>
  item.timeline as TimelinePointer | undefined;

const writeTimeline = async (
  videoId: string,
  timeline: Timeline,
  timelineVersion: number,
): Promise<TimelinePointer> => {
  const key = timelineKey(videoId, timelineVersion);
  await putObject(key, serialiseTimeline(timeline), 'application/json');
  return {
    key,
    timelineVersion,
    schemaVersion: currentSchemaVersion,
    updatedAt: new Date().toISOString(),
  };
};

export const projectsRouter = (): Router => {
  const router = asyncRouter();
  const videoId = requireVideoIdParam('id');

  router.use(requireCreator);

  router.post('/', validate(createProjectSchema), async (req, res) => {
    const { title, folderId, recordedAt } = req.body as {
      title: string;
      folderId?: string;
      recordedAt?: string;
    };
    if (folderId !== undefined && !(await folderExists(folderId))) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const id = uuid();

    await createVideoRow({
      id,
      title,
      folderId,
      recordedAt,
      kind: 'studio',
      // a project has no rendered output until someone renders it
      processingState: 'empty',
      createdBy: { sub: currentUser(req).sub, name: currentUser(req).name },
    });

    const timeline = createEmptyTimeline();
    const pointer = await writeTimeline(id, timeline, 1);
    const { data } = await videoEntity
      .patch({ id })
      .set({ timeline: pointer, updatedAt: pointer.updatedAt })
      .go({ response: 'all_new' });

    res.status(201).json({
      video: serialiseVideo(data as VideoItem, true),
      timeline,
      timelineVersion: pointer.timelineVersion,
    });
  });

  router.get('/:id/timeline', videoId, async (req, res) => {
    const project = await loadProject(req, res);
    if (!project) {
      return;
    }

    const pointer = pointerOf(project);
    if (!pointer) {
      res.json({ timeline: createEmptyTimeline(), timelineVersion: 0 });
      return;
    }

    res.json({
      timeline: parseTimeline(JSON.parse(await getObjectText(pointer.key))),
      timelineVersion: pointer.timelineVersion,
    });
  });

  router.put(
    '/:id/timeline',
    videoId,
    validate(saveTimelineSchema),
    async (req, res) => {
      const project = await loadProject(req, res);
      if (!project) {
        return;
      }

      const { timeline, timelineVersion, version } = req.body as {
        timeline: unknown;
        timelineVersion: number;
        version: number;
      };

      let parsed: Timeline;
      try {
        parsed = parseTimeline(timeline);
      } catch (error) {
        if (error instanceof TimelineFormatError) {
          res
            .status(400)
            .json({ error: 'invalid_timeline', detail: error.message });
          return;
        }
        throw error;
      }

      const serialised = serialiseTimeline(parsed);
      if (Buffer.byteLength(serialised, 'utf8') > maxTimelineBytes) {
        res.status(413).json({ error: 'timeline_too_large' });
        return;
      }

      // the editor sends the revision it started from; a mismatch means another
      // tab saved in between, and the client rebases rather than overwriting
      const current = pointerOf(project)?.timelineVersion ?? 0;
      if (timelineVersion !== current) {
        res.status(409).json({ error: 'conflict', timelineVersion: current });
        return;
      }

      const pointer = await writeTimeline(
        pathParam(req, 'id'),
        parsed,
        current + 1,
      );

      const written = await applyGuardedUpdate(res, {
        id: pathParam(req, 'id'),
        sub: currentUser(req).sub,
        now: Date.now(),
        expectedVersion: version,
        set: { timeline: pointer, updatedAt: pointer.updatedAt },
      });
      if (!written) {
        // the render container bumps the version every few seconds while it
        // reports progress, so losing this race is routine. The pointer never
        // moved, so nothing will ever read the object, and the timeline prefix
        // is deliberately outside every lifecycle rule.
        await deleteObject(pointer.key).catch((error: unknown) => {
          // eslint-disable-next-line no-console
          console.error(`failed to delete the orphaned ${pointer.key}`, error);
        });
        return;
      }

      const { data } = await videoEntity.get({ id: pathParam(req, 'id') }).go();

      res.json({
        video: serialiseVideo(data as VideoItem, true),
        timelineVersion: pointer.timelineVersion,
      });
    },
  );

  registerAssetRoutes(router);
  registerRenderRoutes(router);

  return router;
};
