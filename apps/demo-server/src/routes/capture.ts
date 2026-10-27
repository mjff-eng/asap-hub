import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import express, { Router } from 'express';
import { getTableName } from '../config';
import { captureBatchSchema } from '../schemas';
import { captureLifecycleTag, putObject } from '../storage';
import { getDocumentClient } from '../data/client';
import { recordingSessionEntity, videoEntity } from '../data/entities';
import { asyncRouter } from './async-router';
import {
  capturePartId,
  capturePartKey,
  captureQuota,
  captureTokenMatches,
  ndjsonContentType,
  recordingSessionKey,
  RecordingSessionItem,
} from './recordings';

// the caller names the content type, so this is the only parser mounted on the
// route and it takes every type: nothing upstream may read the body first and
// leave this cap unenforced
export const maxCaptureBodyBytes = 1024 * 1024;

type CaptureBatch = {
  // the reusable bookmark names the project; a bookmark saved before it names
  // the one session it was minted for
  projectId?: string;
  sessionId?: string;
  token: string;
  clientId: string;
  seq: number;
  events: Record<string, unknown>[];
};

const fromJson = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

const parseBatch = (body: unknown): CaptureBatch | undefined => {
  const result = captureBatchSchema.safeParse(
    typeof body === 'string' ? fromJson(body) : body,
  );
  return result.success ? result.data : undefined;
};

const loadSession = async (
  sessionId: string,
): Promise<RecordingSessionItem | undefined> => {
  const { data } = await recordingSessionEntity.get({ sessionId }).go();
  return (data as RecordingSessionItem | null) ?? undefined;
};

// what a bookmark saved before the reusable one sends: it carries the token of
// the one session it was minted for, and only ever appends to that session
const sessionByToken = async (
  sessionId: string,
  token: string,
): Promise<RecordingSessionItem | undefined> => {
  const session = await loadSession(sessionId);
  return session && captureTokenMatches(token, session.tokenHash)
    ? session
    : undefined;
};

// the reusable bookmark: the project's own token authenticates it, and the row
// says which session is open, so one bookmark saved once follows the creator
// from take to take. No session open means the batch is dropped: the snippet
// posts no-cors and cannot read an answer of any kind, so the studio panel,
// which is still showing no events, is where that shows up.
const sessionByProject = async (
  projectId: string,
  token: string,
): Promise<RecordingSessionItem | undefined> => {
  const { data } = await videoEntity.get({ id: projectId }).go();
  const project = data as {
    captureTokenHash?: string;
    captureSessionId?: string;
  } | null;
  if (
    !project?.captureTokenHash ||
    !project.captureSessionId ||
    !captureTokenMatches(token, project.captureTokenHash)
  ) {
    return undefined;
  }
  const session = await loadSession(project.captureSessionId);
  return session?.videoId === projectId ? session : undefined;
};

const accepts = (
  session: RecordingSessionItem | undefined,
  batch: CaptureBatch,
): session is RecordingSessionItem =>
  session !== undefined &&
  session.state === 'open' &&
  session.expiresAt > Date.now() &&
  // each tab numbers its own batches, so the guard is per client: a replay is
  // rejected while a second tab recording the same screen is not
  !session.parts.includes(capturePartId(batch.clientId, batch.seq)) &&
  session.parts.length < captureQuota.parts &&
  session.eventCount + batch.events.length <= captureQuota.events;

// the snippet posts no-cors and never sees the response, so a retry of a batch
// that did land is normal traffic; reading the session and then appending would
// count its events twice and duplicate its part id, so every test the read made
// is repeated as the condition on the write itself. True means this batch, and
// only this batch, claimed its slot.
const appendPart = async (
  session: RecordingSessionItem,
  partId: string,
  events: number,
): Promise<boolean> => {
  const timestamp = new Date().toISOString();
  try {
    await getDocumentClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: recordingSessionKey(session.sessionId),
        UpdateExpression: [
          'SET lastEventAt = :timestamp, updatedAt = :timestamp,',
          '#parts = list_append(#parts, :part)',
          'ADD eventCount :events',
        ].join(' '),
        ConditionExpression: [
          '#state = :open',
          'expiresAt > :now',
          'NOT contains(#parts, :partId)',
          'size(#parts) < :maxParts',
          'eventCount <= :maxEventCount',
        ].join(' AND '),
        ExpressionAttributeNames: { '#parts': 'parts', '#state': 'state' },
        ExpressionAttributeValues: {
          ':timestamp': timestamp,
          ':part': [partId],
          ':partId': partId,
          ':events': events,
          ':open': 'open',
          ':now': Date.now(),
          ':maxParts': captureQuota.parts,
          ':maxEventCount': captureQuota.events - events,
        },
      }),
    );
    return true;
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
    return false;
  }
};

// S3 refusing one write is not a reason to lose a batch the counter has already
// been told about, so the object gets one more go before anything is given up
const writePart = async (key: string, body: string): Promise<boolean> => {
  const write = () =>
    putObject(key, body, ndjsonContentType, captureLifecycleTag);
  try {
    await write();
    return true;
  } catch {
    try {
      await write();
      return true;
    } catch (error) {
      // the counters keep going without the object, so the panel reads healthy
      // while nothing lands: this line is the only place the loss is visible
      // eslint-disable-next-line no-console
      console.error(`could not write the capture part ${key}`, error);
      return false;
    }
  }
};

// The slot was claimed before the object was written, so a write that never
// lands leaves the count carrying events no stream holds. Handing the slot back
// keeps the quota a bound on what is really there; a batch that landed in the
// meantime changes the list, and then this simply loses its condition rather
// than erasing it.
const releasePart = async (
  sessionId: string,
  partId: string,
  events: number,
): Promise<void> => {
  try {
    const { data } = await recordingSessionEntity.get({ sessionId }).go();
    const current = data as RecordingSessionItem | null;
    if (!current?.parts?.includes(partId)) {
      return;
    }
    await getDocumentClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: recordingSessionKey(sessionId),
        UpdateExpression: 'SET #parts = :parts ADD eventCount :events',
        ConditionExpression:
          'size(#parts) = :size AND contains(#parts, :partId)',
        ExpressionAttributeNames: { '#parts': 'parts' },
        ExpressionAttributeValues: {
          ':parts': current.parts.filter((id) => id !== partId),
          ':partId': partId,
          ':size': current.parts.length,
          ':events': -events,
        },
      }),
    );
  } catch {
    // the counters are an indicator, not the recording: a release that cannot
    // land must not turn into a failed request the snippet never reads anyway
  }
};

export const captureRouter = (): Router => {
  const router = asyncRouter();

  router.use(express.text({ type: '*/*', limit: maxCaptureBodyBytes }));

  router.post('/', async (req, res) => {
    const batch = parseBatch(req.body);
    if (!batch) {
      res.status(400).end();
      return;
    }

    const session = batch.projectId
      ? await sessionByProject(batch.projectId, batch.token)
      : await sessionByToken(batch.sessionId ?? '', batch.token);

    // every rejection from here answers exactly as an accepted batch does: an
    // unauthenticated caller must not be able to tell a wrong token from a
    // session that was never created, or from a project with nothing recording
    if (!accepts(session, batch)) {
      res.status(204).end();
      return;
    }

    const partId = capturePartId(batch.clientId, batch.seq);

    // accepts() read a session that any number of concurrent batches read too,
    // so it bounds nothing on its own: the conditional counter write is the only
    // thing that admits exactly one batch per slot, and the object is written
    // only once that slot is claimed. A retry of a batch that already landed
    // loses the condition and writes nothing, which is what makes the quota a
    // bound on the bytes and not only on the counters.
    if (!(await appendPart(session, partId, batch.events.length))) {
      res.status(204).end();
      return;
    }

    const lines = batch.events.map((event) => JSON.stringify(event));
    const written = await writePart(
      capturePartKey(session.videoId, session.sessionId, partId),
      `${lines.join('\n')}\n`,
    );
    if (!written) {
      await releasePart(session.sessionId, partId, batch.events.length);
    }

    res.status(204).end();
  });

  return router;
};
