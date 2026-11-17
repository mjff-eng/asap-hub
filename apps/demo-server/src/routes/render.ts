import {
  keepClips,
  parseTimeline,
  serialiseTimeline,
} from '@asap-hub/demo-timeline';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Response, Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getTableName } from '../config';
import { getDocumentClient } from '../data/client';
import { assetEntity, videoEntity } from '../data/entities';
import { getJobRunner } from '../jobs/runner';
import { cancelRenderSchema, startRenderSchema } from '../schemas';
import {
  getObjectText,
  projectPrefix,
  putObject,
  renderLifecycleTag,
} from '../storage';
import { currentUser, pathParam, requireVideoIdParam } from './request';
import { validate } from './validate';
import {
  applyGuardedUpdate,
  guardedUpdate,
  isRenderActive,
  loadProject,
  renderOf,
  serialiseVideo,
  videoKey,
  RenderState,
  VideoItem,
  VideoWriteConflict,
} from './video-shared';

export type { RenderState } from './video-shared';
export { isRenderActive, maxRenderAgeMs } from './video-shared';

// A render writes to media/{id}/{mediaPath}/, so each one gets its own
// directory and a re-render is not hidden behind the day-long CloudFront TTL on
// the last. The directory is the render id rather than a counter derived from
// the last success: a cancelled or failed render leaves mediaPath where it was,
// so a counter handed the next render the same directory, and a task the cancel
// could not actually stop would then overwrite the published media in place.

export const renderTimelineKey = (videoId: string, renderId: string): string =>
  `${projectPrefix(videoId)}renders/${renderId}/timeline.json`;

// the render map this request built is stale the moment the container starts
// writing progress into it, so only the one field this write knows about moves,
// and only while the row still names this run
const recordTaskArn = async (
  id: string,
  renderId: string,
  taskArn: string,
): Promise<void> => {
  try {
    await getDocumentClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: videoKey(id),
        UpdateExpression: 'SET #render.#taskArn = :taskArn ADD #version :one',
        // the state clause matters as much as the render id: a cancel strips the
        // arn deliberately, and re-attaching it would have the next cancel stop
        // a task that is already on its way out
        ConditionExpression:
          '#render.#renderId = :renderId AND #render.#state IN (:queued, :rendering)',
        ExpressionAttributeNames: {
          '#render': 'render',
          '#taskArn': 'taskArn',
          '#renderId': 'renderId',
          '#state': 'state',
          '#version': 'version',
        },
        ExpressionAttributeValues: {
          ':taskArn': taskArn,
          ':renderId': renderId,
          ':queued': 'queued',
          ':rendering': 'rendering',
          ':one': 1,
        },
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
    // eslint-disable-next-line no-console
    console.error(`the row for ${id} no longer names the render ${renderId}`);
  }
};

type CancelOutcome =
  | { ok: true; taskArn?: string }
  | { ok: false; status: number; body: Record<string, unknown> };

// the container reports progress every few seconds, so the version the editor
// read is usually stale by the time the creator clicks cancel
const maxCancelAttempts = 4;

// the arn goes with the render it belonged to: the task is on its way out, and
// nothing should try to stop it again
const cancelledRender = (
  render: RenderState,
  finishedAt: string,
): RenderState => {
  const cancelled: RenderState = { ...render, state: 'cancelled', finishedAt };
  delete cancelled.taskArn;
  return cancelled;
};

// the cancellation is recorded before the task is stopped: a write that loses
// the version race can be retried, but a task already stopped against a row
// that still says 'rendering' blocks every later export until it ages out
const recordCancellation = async (
  id: string,
  sub: string,
  project: VideoItem,
  version: number,
): Promise<CancelOutcome> => {
  let current = project;
  let expectedVersion = version;

  for (let attempt = 0; attempt < maxCancelAttempts; attempt += 1) {
    const render = renderOf(current);
    if (!render || !isRenderActive(render)) {
      return { ok: false, status: 409, body: { error: 'render_inactive' } };
    }

    const finishedAt = new Date().toISOString();
    try {
      await guardedUpdate({
        id,
        sub,
        now: Date.now(),
        expectedVersion,
        set: {
          render: cancelledRender(render, finishedAt),
          updatedAt: finishedAt,
        },
      });
      return { ok: true, taskArn: render.taskArn };
    } catch (error) {
      if (!(error instanceof VideoWriteConflict)) {
        throw error;
      }
      // a lost lease is the creator's answer; only the version is worth rereading
      if (error.body.error !== 'conflict') {
        return { ok: false, status: 409, body: error.body };
      }
      const { data } = await videoEntity.get({ id }).go();
      if (!data) {
        return { ok: false, status: 404, body: { error: 'not_found' } };
      }
      current = data as VideoItem;
      expectedVersion = current.version as number;
    }
  }

  return { ok: false, status: 409, body: { error: 'conflict' } };
};

const timelinePointerOf = (
  project: VideoItem,
): { key: string; timelineVersion: number } | undefined =>
  project.timeline as { key: string; timelineVersion: number } | undefined;

export const registerRenderRoutes = (router: Router): void => {
  const videoId = requireVideoIdParam('id');

  const respondWithVideo = async (res: Response, id: string): Promise<void> => {
    const { data } = await videoEntity.get({ id }).go();
    res.json({ video: serialiseVideo(data as VideoItem, true) });
  };

  router.post(
    '/:id/render',
    videoId,
    validate(startRenderSchema),
    async (req, res) => {
      const project = await loadProject(req, res);
      if (!project) {
        return;
      }

      if (isRenderActive(renderOf(project))) {
        res.status(409).json({ error: 'render_active' });
        return;
      }

      const pointer = timelinePointerOf(project);
      const whole = pointer
        ? parseTimeline(JSON.parse(await getObjectText(pointer.key)))
        : undefined;
      if (!whole || !pointer || whole.clips.length === 0) {
        res.status(400).json({ error: 'empty_timeline' });
        return;
      }

      // a download renders the picked cut of the document rather than all of
      // it, and everything the picked clips carry travels with them
      const { clipIds } = req.body as { clipIds?: string[] };
      if (clipIds) {
        const known = new Set(whole.clips.map((clip) => clip.id));
        if (clipIds.some((clipId) => !known.has(clipId))) {
          res.status(400).json({ error: 'unknown_clip' });
          return;
        }
      }
      const timeline = clipIds ? keepClips(whole, clipIds) : whole;
      if (timeline.clips.length === 0) {
        res.status(400).json({ error: 'empty_timeline' });
        return;
      }
      // splitting banners and takes at the pick boundaries can push a legal
      // document over its own limits; the container would only find that out
      // after a full spin-up, so the cut is refused here instead
      if (clipIds) {
        try {
          parseTimeline(JSON.parse(serialiseTimeline(timeline)));
        } catch {
          res.status(400).json({ error: 'invalid_cut' });
          return;
        }
      }

      const id = pathParam(req, 'id');

      // an asset the ingest has not finished with has no probed duration or
      // audio flag, and a render started against one came out with the wrong
      // trims or no audio track at all
      const { data: ownedAssets } = await assetEntity.query
        .byVideo({ videoId: id })
        .go({ pages: 'all' });
      const ready = new Set(
        ownedAssets
          .filter((asset) => asset.state === 'ready')
          .map((asset) => asset.assetId),
      );
      const used = [
        ...timeline.clips.flatMap((clip) =>
          clip.kind === 'source' ? [clip.assetId] : [],
        ),
        ...timeline.narration.map((take) => take.assetId),
      ];
      if (used.some((assetId) => !ready.has(assetId))) {
        res.status(409).json({ error: 'asset_not_ready' });
        return;
      }

      const { version } = req.body as { version: number };
      const { sub } = currentUser(req);
      const renderId = uuid();
      const timelineKey = renderTimelineKey(id, renderId);

      // the container renders this snapshot, so an edit saved while the job runs
      // cannot change what comes out of it
      await putObject(
        timelineKey,
        serialiseTimeline(timeline),
        'application/json',
        renderLifecycleTag,
      );

      const requestedAt = new Date().toISOString();
      const render: RenderState = {
        renderId,
        state: 'queued',
        timelineVersion: pointer.timelineVersion,
        progress: 0,
        requestedAt,
        ...(clipIds ? { purpose: 'download' as const } : {}),
      };

      const queued = await applyGuardedUpdate(res, {
        id,
        sub,
        now: Date.now(),
        expectedVersion: version,
        // chapters are not written here: they describe the media, so the
        // container writes them with it when the render lands. Writing them now
        // would retitle a published demo the moment an export was started, even
        // if that export then failed or was cancelled.
        set: { render, updatedAt: requestedAt },
      });
      if (!queued) {
        return;
      }

      let jobId: string;
      try {
        ({ jobId } = await getJobRunner().run('render', {
          JOB: 'render',
          VIDEO_ID: id,
          RENDER_ID: renderId,
          TIMELINE_KEY: timelineKey,
          // a download must never overwrite the published media, so it gets a
          // directory of its own and the container skips the ready flip
          MEDIA_PATH: clipIds ? `downloads/${renderId}` : renderId,
          ...(clipIds ? { PURPOSE: 'download' } : {}),
        }));
      } catch (error) {
        // a render nobody started must not sit queued, blocking every later one
        await guardedUpdate({
          id,
          sub,
          now: Date.now(),
          expectedVersion: version + 1,
          set: {
            render: {
              ...render,
              state: 'failed',
              error: 'the render job could not be started',
              finishedAt: new Date().toISOString(),
            },
          },
        }).catch(() => undefined);
        // eslint-disable-next-line no-console
        console.error(`could not start the render job for ${id}`, error);
        res.status(502).json({ error: 'render_start_failed' });
        return;
      }

      await recordTaskArn(id, renderId, jobId);

      await respondWithVideo(res, id);
    },
  );

  router.delete(
    '/:id/render',
    videoId,
    validate(cancelRenderSchema),
    async (req, res) => {
      const project = await loadProject(req, res);
      if (!project) {
        return;
      }

      const id = pathParam(req, 'id');
      const { version } = req.body as { version: number };
      const outcome = await recordCancellation(
        id,
        currentUser(req).sub,
        project,
        version,
      );
      if (!outcome.ok) {
        res.status(outcome.status).json(outcome.body);
        return;
      }

      if (outcome.taskArn) {
        // the task may already be gone; the row is what the editor believes
        await getJobRunner()
          .stop(outcome.taskArn)
          .catch((error: unknown) => {
            // eslint-disable-next-line no-console
            console.error(
              `could not stop the render task ${outcome.taskArn}`,
              error,
            );
          });
      }

      await respondWithVideo(res, id);
    },
  );
};
