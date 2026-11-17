import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { requireAdmin } from '../auth';
import { getTableName } from '../config';
import { getDocumentClient } from '../data/client';
import { videoEntity } from '../data/entities';
import { getJobRunner } from '../jobs/runner';
import { mediaPrefix, objectSize, rawKey } from '../storage';
import { currentUser, pathParam, requireVideoIdParam } from './request';
import {
  isReencodeActive,
  maxReencodeAgeMs,
  reencodeOf,
  ReencodeState,
  serialiseVideo,
  videoKey,
  VideoItem,
} from './video-shared';

export const publishedStreamKey = (id: string, mediaPath?: unknown): string =>
  `${mediaPrefix(id)}${
    typeof mediaPath === 'string' && mediaPath ? `${mediaPath}/` : ''
  }stream.mp4`;

// the original upload is kept for thirty days; after that the published
// stream is the best copy left
const pickSource = async (
  id: string,
  item: VideoItem,
): Promise<{ key: string; source: ReencodeState['source'] } | undefined> => {
  if ((await objectSize(rawKey(id))) !== undefined) {
    return { key: rawKey(id), source: 'original' };
  }
  if (item.processingState !== 'ready') {
    return undefined;
  }
  const streamKey = publishedStreamKey(id, item.mediaPath);
  return (await objectSize(streamKey)) !== undefined
    ? { key: streamKey, source: 'stream' }
    : undefined;
};

const queueReencode = async (
  id: string,
  reencode: ReencodeState,
  now: number,
): Promise<boolean> => {
  try {
    await getDocumentClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: videoKey(id),
        UpdateExpression: 'SET #reencode = :reencode',
        ConditionExpression:
          'attribute_exists(PK) AND (attribute_not_exists(#reencode) OR #reencode.#state <> :queued OR #reencode.#requestedAt < :staleBefore)',
        ExpressionAttributeNames: {
          '#reencode': 'reencode',
          '#state': 'state',
          '#requestedAt': 'requestedAt',
        },
        ExpressionAttributeValues: {
          ':reencode': reencode,
          ':queued': 'queued',
          ':staleBefore': new Date(now - maxReencodeAgeMs).toISOString(),
        },
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return false;
    }
    throw error;
  }
};

// only while the row still names this run: a later re-encode owns the row after that
const recordTaskArn = async (
  id: string,
  reencodeId: string,
  taskArn: string,
): Promise<void> => {
  try {
    await getDocumentClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: videoKey(id),
        UpdateExpression: 'SET #reencode.#taskArn = :taskArn',
        ConditionExpression:
          '#reencode.#reencodeId = :reencodeId AND #reencode.#state = :queued',
        ExpressionAttributeNames: {
          '#reencode': 'reencode',
          '#taskArn': 'taskArn',
          '#reencodeId': 'reencodeId',
          '#state': 'state',
        },
        ExpressionAttributeValues: {
          ':taskArn': taskArn,
          ':reencodeId': reencodeId,
          ':queued': 'queued',
        },
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }
};

export const registerReencodeRoutes = (router: Router): void => {
  const videoId = requireVideoIdParam('id');

  router.post('/:id/reencode', videoId, requireAdmin, async (req, res) => {
    const id = pathParam(req, 'id');
    const { data } = await videoEntity.get({ id }).go();
    if (!data) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const item = data as VideoItem;

    // a studio demo is rendered from its timeline, so it is re-rendered rather than re-encoded
    if ((item.kind ?? 'upload') !== 'upload') {
      res.status(409).json({ error: 'not_an_upload' });
      return;
    }
    if (item.processingState !== 'ready' && item.processingState !== 'failed') {
      res.status(409).json({ error: 'processing' });
      return;
    }
    const now = Date.now();
    if (isReencodeActive(reencodeOf(item), now)) {
      res.status(409).json({ error: 'reencode_active' });
      return;
    }

    const picked = await pickSource(id, item);
    if (!picked) {
      res.status(409).json({ error: 'no_source' });
      return;
    }

    const reencodeId = uuid();
    const reencode: ReencodeState = {
      reencodeId,
      state: 'queued',
      source: picked.source,
      requestedAt: new Date(now).toISOString(),
      requestedByName: currentUser(req).name,
    };
    if (!(await queueReencode(id, reencode, now))) {
      res.status(409).json({ error: 'reencode_active' });
      return;
    }

    let jobId: string;
    try {
      ({ jobId } = await getJobRunner().run('encode', {
        JOB: 'encode',
        VIDEO_ID: id,
        S3_OBJECT_KEY: picked.key,
        REENCODE_ID: reencodeId,
        MEDIA_PATH: reencodeId,
      }));
    } catch (error) {
      await getDocumentClient()
        .send(
          new UpdateCommand({
            TableName: getTableName(),
            Key: videoKey(id),
            UpdateExpression:
              'SET #reencode.#state = :failed, #reencode.#error = :error, #reencode.#finishedAt = :finishedAt',
            ConditionExpression: '#reencode.#reencodeId = :reencodeId',
            ExpressionAttributeNames: {
              '#reencode': 'reencode',
              '#state': 'state',
              '#error': 'error',
              '#finishedAt': 'finishedAt',
              '#reencodeId': 'reencodeId',
            },
            ExpressionAttributeValues: {
              ':failed': 'failed',
              ':error': 'the re-encode job could not be started',
              ':finishedAt': new Date().toISOString(),
              ':reencodeId': reencodeId,
            },
          }),
        )
        .catch(() => undefined);
      // eslint-disable-next-line no-console
      console.error(`could not start the re-encode job for ${id}`, error);
      res.status(502).json({ error: 'reencode_start_failed' });
      return;
    }
    await recordTaskArn(id, reencodeId, jobId);

    const { data: updated } = await videoEntity.get({ id }).go();
    res.json({ video: serialiseVideo(updated as VideoItem, true) });
  });
};
