import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { EntityItem } from 'electrodb';
import { Request, Response } from 'express';
import { getTableName } from '../config';
import { getDocumentClient } from '../data/client';
import { videoEntity } from '../data/entities';
import { pathParam } from './request';

export const leaseDurationMs = 90 * 1000;

// ElectroDB types each response differently (a get returns the whole row, an
// all_new patch a partial one), so the routes agree on the widest of them and
// the serialiser is what pins down the shape that leaves the process
export type VideoItem = Record<string, unknown>;

// the whole row as DynamoDB holds it: a get hands one back and a put takes one,
// which is how a write recomputes the GSI keys without restating the templates
export type VideoRow = EntityItem<typeof videoEntity>;

export const videoKey = (id: string) => ({ PK: `VIDEO#${id}`, SK: 'META' });

export type RenderState = {
  renderId: string;
  state: 'queued' | 'rendering' | 'done' | 'failed' | 'cancelled';
  timelineVersion: number;
  // a download renders a picked cut into its own directory and leaves the
  // published demo untouched; absent means the render is the demo itself
  purpose?: 'download';
  downloadPath?: string;
  stage?: string;
  progress?: number;
  taskArn?: string;
  requestedAt?: string;
  finishedAt?: string;
  error?: string;
};

const activeRenderStates = ['queued', 'rendering'];

// a task killed without reporting leaves 'rendering' on the row for ever, and
// nothing else ever clears it, so an active render past the longest one the
// container could plausibly still be running counts as over
export const maxRenderAgeMs = 4 * 60 * 60 * 1000;

export const isRenderActive = (
  render?: RenderState,
  now: number = Date.now(),
): boolean => {
  if (!render || !activeRenderStates.includes(render.state)) {
    return false;
  }
  const requestedAt = Date.parse(render.requestedAt ?? '');
  return Number.isNaN(requestedAt) || now - requestedAt < maxRenderAgeMs;
};

export const renderOf = (item: VideoItem): RenderState | undefined =>
  item.render as RenderState | undefined;

// render and timeline describe how a demo is made rather than how it is
// watched: the download path, the task arn, the ffmpeg error and the timeline
// key are the creator's business, so only a caller who can see drafts gets them
export const serialiseVideo = (item: VideoItem, forCreator = false) => ({
  id: item.id,
  title: item.title,
  status: item.status,
  folderId: item.folderId,
  recordedAt: item.recordedAt,
  durationMs: item.durationMs ?? 0,
  chapters: item.chapters ?? [],
  ...(typeof item.sectionCount === 'number' && item.sectionCount > 0
    ? { sectionCount: item.sectionCount }
    : {}),
  processingState: item.processingState,
  ...(item.processingError ? { processingError: item.processingError } : {}),
  createdBy: item.createdBy,
  ...(item.lockedBy ? { lockedBy: item.lockedBy } : {}),
  ...(item.lockedByName ? { lockedByName: item.lockedByName } : {}),
  ...(typeof item.lockExpiresAt === 'number'
    ? { lockExpiresAt: new Date(item.lockExpiresAt).toISOString() }
    : {}),
  version: item.version,
  kind: item.kind ?? 'upload',
  ...(item.mediaPath ? { mediaPath: item.mediaPath } : {}),
  ...(forCreator && item.timeline ? { timeline: item.timeline } : {}),
  ...(forCreator && item.render ? { render: item.render } : {}),
});

export const failedItem = (error: unknown): VideoItem | undefined =>
  error instanceof ConditionalCheckFailedException
    ? (error.Item as VideoItem | undefined)
    : undefined;

// a row read back from DynamoDB and an ALL_OLD item off a failed condition
// carry the lease differently, and only these two fields decide it
type Lease = { lockedBy?: unknown; lockExpiresAt?: unknown };

// an unexpired lease held by the caller; the same test is repeated as a
// condition on every write so a takeover between the read and the write loses
export const holdsLease = (item: Lease, sub: string, now: number): boolean =>
  item.lockedBy === sub &&
  typeof item.lockExpiresAt === 'number' &&
  item.lockExpiresAt > now;

// the bulk routes take no lease of their own, so what disqualifies a video is
// an unexpired lease belonging to someone else; an unheld one needs no lease
export const heldByAnother = (item: Lease, sub: string, now: number): boolean =>
  typeof item.lockedBy === 'string' &&
  item.lockedBy !== '' &&
  item.lockedBy !== sub &&
  typeof item.lockExpiresAt === 'number' &&
  item.lockExpiresAt > now;

// the pre-flight answer for a caller that does not hold the lease: the write
// condition would reject it anyway, and this names the holder first
export const lockedBody = (item: VideoItem): Record<string, unknown> => ({
  error: 'locked',
  ...(item.lockedByName ? { holderName: item.lockedByName } : {}),
});

export const leaseCondition = 'lockedBy = :sub AND lockExpiresAt > :now';

// ReturnValuesOnConditionCheckFailure hands back raw AttributeValues, while a
// stubbed client in tests may hand back plain values
const unwrap = (raw: unknown): unknown => {
  if (raw && typeof raw === 'object') {
    if ('S' in raw) return String((raw as { S: unknown }).S);
    if ('N' in raw) return Number((raw as { N: unknown }).N);
  }
  return raw;
};

export const holderNameOf = (item?: VideoItem): string | undefined => {
  const name = unwrap(item?.lockedByName);
  return typeof name === 'string' ? name : undefined;
};

// the write condition bundles the lease and the version, so the item returned
// on failure is what tells the client whether to warn about a takeover or rebase
export const conflictBody = (
  item: VideoItem,
  sub: string,
  now: number,
): Record<string, unknown> => {
  const lost = !holdsLease(
    {
      lockedBy: unwrap(item.lockedBy),
      lockExpiresAt: unwrap(item.lockExpiresAt),
    },
    sub,
    now,
  );
  const holderName = holderNameOf(item);
  return {
    error: lost ? 'locked' : 'conflict',
    ...(holderName ? { holderName } : {}),
  };
};

export class VideoWriteConflict extends Error {
  constructor(readonly body: Record<string, unknown>) {
    super(String(body.error));
    this.name = 'VideoWriteConflict';
  }
}

export type GuardedUpdate = {
  id: string;
  sub: string;
  now: number;
  expectedVersion: number;
  set: Record<string, unknown>;
  remove?: string[];
};

const namePlaceholder = (attribute: string) => `#${attribute}`;
const valuePlaceholder = (attribute: string) => `:${attribute}`;

// every studio write is conditioned on the caller still holding the lease and on
// the version it read, so one helper owns the expression all of them share
export const guardedUpdate = async ({
  id,
  sub,
  now,
  expectedVersion,
  set,
  remove = [],
}: GuardedUpdate): Promise<void> => {
  const attributes = Object.keys(set);
  const assignments = [
    ...attributes.map(
      (attribute) =>
        `${namePlaceholder(attribute)} = ${valuePlaceholder(attribute)}`,
    ),
    '#version = #version + :one',
  ];

  try {
    await getDocumentClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: videoKey(id),
        UpdateExpression: [
          `SET ${assignments.join(', ')}`,
          ...(remove.length ? [`REMOVE ${remove.join(', ')}`] : []),
        ].join(' '),
        ConditionExpression: `${leaseCondition} AND #version = :expectedVersion`,
        ExpressionAttributeNames: {
          ...Object.fromEntries(
            attributes.map((attribute) => [
              namePlaceholder(attribute),
              attribute,
            ]),
          ),
          '#version': 'version',
        },
        ExpressionAttributeValues: {
          ...Object.fromEntries(
            attributes.map((attribute) => [
              valuePlaceholder(attribute),
              set[attribute],
            ]),
          ),
          ':one': 1,
          ':sub': sub,
          ':now': now,
          ':expectedVersion': expectedVersion,
        },
        ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
      }),
    );
  } catch (error) {
    const item = failedItem(error);
    if (item) {
      throw new VideoWriteConflict(conflictBody(item, sub, now));
    }
    throw error;
  }
};

// a lost condition is the only 409 the guarded writes produce, so the conflict
// body becomes a response in one place; true means the write landed
export const applyGuardedUpdate = async (
  res: Response,
  update: GuardedUpdate,
): Promise<boolean> => {
  try {
    await guardedUpdate(update);
    return true;
  } catch (error) {
    if (error instanceof VideoWriteConflict) {
      res.status(409).json(error.body);
      return false;
    }
    throw error;
  }
};

// a member only ever sees published videos, and the exclusion belongs in the
// query rather than in a filter, so a folder full of drafts cannot be read out
// of DynamoDB and then dropped on the way to the response
export const videosInFolder = async (
  folderId: string,
  canSeeDrafts: boolean,
): Promise<VideoRow[]> => {
  const query = canSeeDrafts
    ? videoEntity.query.byFolder({ folderId })
    : videoEntity.query
        .byFolder({ folderId })
        // the empty recordedAt makes the prefix 'PUBLISHED#', so DRAFT can never match
        .begins({ statusKey: 'PUBLISHED', recordedAt: '' });

  const { data } = await query.go({ pages: 'all' });
  return data;
};

export type LoadProject = (
  req: Request,
  res: Response,
) => Promise<VideoItem | undefined>;

// a plain upload has no timeline, assets, recordings or renders, so every studio
// route reads its project through here and answers the same 404 for both
export const loadProject: LoadProject = async (req, res) => {
  const { data } = await videoEntity.get({ id: pathParam(req, 'id') }).go();
  if (!data || data.kind !== 'studio') {
    res.status(404).json({ error: 'not_found' });
    return undefined;
  }
  return data as VideoItem;
};
