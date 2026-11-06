import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Request, Response, Router } from 'express';
import { requireCreator } from '../auth';
import { getDemoHostname, getTableName, isLocal } from '../config';
import { getDocumentClient } from '../data/client';
import { recordingSessionEntity } from '../data/entities';
import { finaliseRecordingSchema, maxCaptureBatchEvents } from '../schemas';
import { buildSignedCookies } from '../signed-cookies';
import {
  captureLifecycleTag,
  deletePrefix,
  getObjectText,
  objectSize,
  projectPrefix,
  putObject,
} from '../storage';
import { mergeByTimestamp, partsByClient } from './capture-merge';
import { asyncRouter } from './async-router';
import { currentUser, pathParam, requireVideoIdParam } from './request';
import { validate } from './validate';
import { loadProject, videoKey } from './video-shared';

export const recordingSessionKey = (sessionId: string) => ({
  PK: `RECORDING#${sessionId}`,
  SK: 'META',
});

export const captureSessionPrefix = (
  videoId: string,
  sessionId: string,
): string => `${projectPrefix(videoId)}capture/${sessionId}/`;

export const capturePartsPrefix = (
  videoId: string,
  sessionId: string,
): string => `${captureSessionPrefix(videoId, sessionId)}parts/`;

// a part belongs to one tab's numbering, so its id carries both
export const capturePartId = (clientId: string, seq: number): string =>
  `${clientId}:${seq}`;

export const capturePartKey = (
  videoId: string,
  sessionId: string,
  partId: string,
): string =>
  `${capturePartsPrefix(videoId, sessionId)}${partId.replace(':', '-')}.ndjson`;

export const captureEventsKey = (videoId: string, sessionId: string): string =>
  `${captureSessionPrefix(videoId, sessionId)}events.ndjson`;

export const ndjsonContentType = 'application/x-ndjson';

// What the handler may carry itself when the CDN will not give the stream up.
// The gateway caps a lambda response at 6MB and the body is JSON escaped on the
// way out, which measured at about 1.162x, so the true ceiling is nearer
// 5.16MB. 4MB inflates to about 4.65MB and leaves the headers room to spare.
export const inlineEventsMaxBytes = 4 * 1024 * 1024;

// a take is a demo, not a day: a token that leaks is worthless soon after
export const sessionTtlMs = 4 * 60 * 60 * 1000;

export const captureQuota = {
  events: 200000,
  // one part per five second flush per tab: 500 ended a capture silently at
  // about forty minutes while the event quota was nowhere near spent. A part
  // id is ~20 bytes, so 4000 of them is ~80KB on the row, well under the item
  // limit, and covers the four hour session at two tabs with room to spare
  parts: 4000,
  batchEvents: maxCaptureBatchEvents,
};

export const hashCaptureToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const captureTokenMatches = (
  token: string,
  tokenHash: string,
): boolean => {
  const provided = Buffer.from(hashCaptureToken(token), 'hex');
  const stored = Buffer.from(tokenHash, 'hex');
  return provided.length === stored.length && timingSafeEqual(provided, stored);
};

// base64url so the token survives the snippet's URL fragment
export const newCaptureToken = (): string =>
  randomBytes(32).toString('base64url');

export type RecordingSessionItem = {
  sessionId: string;
  videoId: string;
  tokenHash: string;
  state: 'open' | 'closed';
  eventCount: number;
  // "{clientId}:{seq}" per batch, so tabs sharing a session cannot collide
  parts: string[];
  lastEventAt?: string;
  expiresAt: number;
  startedAtEpochMs?: number;
  stoppedAtEpochMs?: number;
  eventsKey?: string;
};

// deployed, the app and the api share one CloudFront distribution, and locally
// the vite dev server proxies /api, so one origin serves the snippet and the
// endpoint it posts to
const appOrigin = (): string => {
  const hostname = getDemoHostname();
  return hostname ? `https://${hostname}` : 'http://localhost:3500';
};

// the reusable bookmark names the project, not a take, so one bookmark saved
// once keeps sending to whichever session the studio has open
export const projectSnippetUrl = (videoId: string, token: string): string =>
  `${appOrigin()}/capture/v1.js#project.${videoId}.${token}`;

// one write points the project at the session it just opened and, only if the
// project has no bookmark yet, mints its token. The row comes back, so an equal
// hash is what says this call is the one that minted it and may hand it out.
const claimCaptureSession = async (
  videoId: string,
  sessionId: string,
  tokenHash: string,
): Promise<boolean> => {
  const { Attributes } = await getDocumentClient().send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: videoKey(videoId),
      UpdateExpression: [
        'SET captureSessionId = :sessionId,',
        'captureTokenHash = if_not_exists(captureTokenHash, :tokenHash)',
      ].join(' '),
      ExpressionAttributeValues: {
        ':sessionId': sessionId,
        ':tokenHash': tokenHash,
      },
      ReturnValues: 'ALL_NEW',
    }),
  );
  return (
    (Attributes as { captureTokenHash?: string } | undefined)
      ?.captureTokenHash === tokenHash
  );
};

// the read is consistent because the finalise patches eventsKey onto the row
// and the studio asks for the stream in the very next request: an eventually
// consistent get can still answer with the row as it was before the merge, and
// the caller would be told the take was never finalised
const loadSession = async (
  sessionId: string,
): Promise<RecordingSessionItem | undefined> => {
  const { data } = await recordingSessionEntity
    .get({ sessionId })
    .go({ consistent: true });
  return (data as RecordingSessionItem | null) ?? undefined;
};

// closing first is what makes the merge safe: appendPart is conditioned on the
// session still being open, so once this write lands no further batch can be
// accepted, and a second finalise loses the same condition. The row comes back
// on the write, so a batch that landed between the read and the close is still
// merged rather than erased.
const closeSession = async (
  sessionId: string,
  startedAtEpochMs: number | undefined,
  stoppedAtEpochMs: number,
): Promise<Partial<RecordingSessionItem> | undefined> => {
  try {
    const { Attributes } = await getDocumentClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: recordingSessionKey(sessionId),
        UpdateExpression: [
          'SET #state = :closed, updatedAt = :timestamp,',
          'stoppedAtEpochMs = :stoppedAt',
          ...(startedAtEpochMs === undefined
            ? []
            : [', startedAtEpochMs = :startedAt']),
        ].join(' '),
        ConditionExpression: '#state = :open',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':closed': 'closed',
          ':open': 'open',
          ...(startedAtEpochMs === undefined
            ? {}
            : { ':startedAt': startedAtEpochMs }),
          ':stoppedAt': stoppedAtEpochMs,
          ':timestamp': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      }),
    );
    return (Attributes as Partial<RecordingSessionItem> | undefined) ?? {};
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return undefined;
    }
    throw error;
  }
};

// Everything after the close, in the one order that leaves nothing stranded:
// the merged stream is written, the row is told where it landed, and only then
// are the parts it was built from dropped. A failure anywhere here leaves a
// closed session with no eventsKey and every part still in place, which is
// exactly what a retry needs to finish it.
const mergeSessionParts = async (
  videoId: string,
  sessionId: string,
  parts: string[],
): Promise<{ eventsKey: string; eventCount: number }> => {
  // several tabs can share a session when the whole screen is recorded, so
  // each tab's parts are read in its own order and the streams are then merged
  // on the timestamps they all took from the same clock
  const byClient = partsByClient(parts);
  const streams = await Promise.all(
    [...byClient.values()].map((partIds) =>
      Promise.all(
        partIds.map((partId) =>
          // a batch that never landed must not sink the whole recording
          getObjectText(capturePartKey(videoId, sessionId, partId)).catch(
            () => '',
          ),
        ),
      ),
    ),
  );
  const lines = mergeByTimestamp(streams);

  const key = captureEventsKey(videoId, sessionId);
  await putObject(
    key,
    lines.length ? `${lines.join('\n')}\n` : '',
    ndjsonContentType,
    captureLifecycleTag,
  );

  // the session is already closed; this only records where the merged stream
  // landed and drops the part ids it was built from
  await recordingSessionEntity
    .patch({ sessionId })
    .set({
      eventsKey: key,
      parts: [],
      updatedAt: new Date().toISOString(),
    })
    .go();

  // the parts are the only copy of the stream until the row points at the
  // merged one, so tidying them away is the last thing and costs nothing
  await deletePrefix(capturePartsPrefix(videoId, sessionId)).catch(
    () => undefined,
  );

  return { eventsKey: key, eventCount: lines.length };
};

const reportedState = (session: RecordingSessionItem): string =>
  session.state === 'open' && session.expiresAt <= Date.now()
    ? 'expired'
    : session.state;

export const recordingsRouter = (): Router => {
  const router = asyncRouter();
  const videoId = requireVideoIdParam('id');
  const sessionId = requireVideoIdParam('sessionId');

  router.use(requireCreator);

  // the session the request names, only if it belongs to this project
  const loadProjectSession = async (
    req: Request,
    res: Response,
  ): Promise<RecordingSessionItem | undefined> => {
    const project = await loadProject(req, res);
    if (!project) {
      return undefined;
    }
    const session = await loadSession(pathParam(req, 'sessionId'));
    if (!session || session.videoId !== pathParam(req, 'id')) {
      res.status(404).json({ error: 'not_found' });
      return undefined;
    }
    return session;
  };

  router.post('/:id/recordings', videoId, async (req, res) => {
    const project = await loadProject(req, res);
    if (!project) {
      return;
    }

    const id = pathParam(req, 'id');
    const newSessionId = randomBytes(16).toString('hex');
    // still minted, so a bookmark saved before the reusable one keeps a session
    // token of its own to present
    const token = newCaptureToken();
    const now = Date.now();
    const timestamp = new Date(now).toISOString();

    await recordingSessionEntity
      .create({
        sessionId: newSessionId,
        videoId: id,
        tokenHash: hashCaptureToken(token),
        state: 'open',
        eventCount: 0,
        parts: [],
        expiresAt: now + sessionTtlMs,
        ttl: Math.floor((now + sessionTtlMs) / 1000),
        createdBy: {
          sub: currentUser(req).sub,
          name: currentUser(req).name,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .go();

    const captureToken = newCaptureToken();
    const minted = await claimCaptureSession(
      id,
      newSessionId,
      hashCaptureToken(captureToken),
    );

    res.status(201).json({
      sessionId: newSessionId,
      token,
      // the bookmark is handed out the once it is minted and never again; a
      // creator who lost it asks for a new one, which revokes the old
      ...(minted
        ? // the credentials ride in the fragment, which no proxy, referrer or
          // access log along the way ever sees
          { snippetUrl: projectSnippetUrl(id, captureToken) }
        : {}),
      bookmarkReady: !minted,
      captureUrl: `${appOrigin()}/api/capture`,
      expiresAt: new Date(now + sessionTtlMs).toISOString(),
    });
  });

  // the bookmark is a bearer secret on someone else's origin, so it has to be
  // replaceable: this overwrites the hash, and every bookmark carrying the old
  // token stops being accepted from here on
  router.post('/:id/capture-bookmark', videoId, async (req, res) => {
    const project = await loadProject(req, res);
    if (!project) {
      return;
    }

    const id = pathParam(req, 'id');
    const token = newCaptureToken();
    await getDocumentClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: videoKey(id),
        UpdateExpression: 'SET captureTokenHash = :tokenHash',
        ExpressionAttributeValues: {
          ':tokenHash': hashCaptureToken(token),
        },
      }),
    );

    res.status(201).json({
      snippetUrl: projectSnippetUrl(id, token),
      captureUrl: `${appOrigin()}/api/capture`,
    });
  });

  router.get(
    '/:id/recordings/:sessionId',
    videoId,
    sessionId,
    async (req, res) => {
      const session = await loadProjectSession(req, res);
      if (!session) {
        return;
      }

      res.json({
        state: reportedState(session),
        eventCount: session.eventCount,
        // several tabs share a session when the whole screen is recorded, and
        // the creator needs to see each one arrive
        clientCount: partsByClient(session.parts).size,
        lastEventAt: session.lastEventAt ?? null,
      });
    },
  );

  // The editor reads the immutable stream back to derive effects from it, and
  // a long take merges to tens of megabytes: proxying that through the handler
  // failed the whole apply at the gateway, which caps a lambda response at 6MB.
  // The stream already lives under projects/{id}/, which the same origin serves
  // from storage, so this route authorises the read and names the object.
  //
  // ?inline=1 carries the bytes instead, for a stream small enough that the cap
  // allows it. Nothing about the CDN half can be proved from here, and a whole
  // feature may not rest on a property only a deploy can test, so the studio
  // has a second way through whenever the first one refuses it.
  router.get(
    '/:id/recordings/:sessionId/events',
    videoId,
    sessionId,
    async (req, res) => {
      const session = await loadProjectSession(req, res);
      if (!session) {
        return;
      }
      if (!session.eventsKey) {
        res.status(409).json({ error: 'not_finalised' });
        return;
      }

      const id = pathParam(req, 'id');
      // through the CDN a missing object is a 403, indistinguishable from a
      // refused one, so the size is what says whether the stream is even there
      const bytes = await objectSize(session.eventsKey);
      if (bytes === undefined) {
        res.status(404).json({ error: 'stream_missing' });
        return;
      }

      if (req.query.inline === '1') {
        if (bytes > inlineEventsMaxBytes) {
          res
            .status(413)
            .json({ error: 'too_large', bytes, limit: inlineEventsMaxBytes });
          return;
        }
        res
          .type(ndjsonContentType)
          .send(await getObjectText(session.eventsKey));
        return;
      }

      // deployed, projects/ sits behind a CloudFront key group; locally the
      // vite proxy reads the same path straight from MinIO
      if (!isLocal()) {
        const cookies = await buildSignedCookies(id, 'projects');
        cookies.forEach(({ name, value }) => {
          res.cookie(name, value, {
            path: `/projects/${id}/`,
            secure: true,
            httpOnly: true,
            sameSite: 'lax',
          });
        });
      }

      res.json({ url: `/${session.eventsKey}`, bytes });
    },
  );

  router.post(
    '/:id/recordings/:sessionId/finalise',
    videoId,
    sessionId,
    validate(finaliseRecordingSchema),
    async (req, res) => {
      const session = await loadProjectSession(req, res);
      if (!session) {
        return;
      }
      const { startedAtEpochMs, stoppedAtEpochMs } = req.body as {
        startedAtEpochMs: number;
        stoppedAtEpochMs: number;
      };
      const id = pathParam(req, 'id');
      const currentSessionId = pathParam(req, 'sessionId');

      // A finalise that closed the session and then failed on the merge left a
      // take nothing could ever reach: the retry lost the close and the events
      // route had no key to serve. The parts are still there, so the retry
      // finishes the job it left rather than refusing it.
      if (session.state !== 'open') {
        if (session.eventsKey) {
          res.status(409).json({ error: 'already_finalised' });
          return;
        }
        const merged = await mergeSessionParts(
          id,
          currentSessionId,
          session.parts,
        );
        res.json({
          state: 'closed',
          ...merged,
          startedAtEpochMs: session.startedAtEpochMs ?? startedAtEpochMs,
          stoppedAtEpochMs: session.stoppedAtEpochMs ?? stoppedAtEpochMs,
        });
        return;
      }

      const closed = await closeSession(
        currentSessionId,
        startedAtEpochMs,
        stoppedAtEpochMs,
      );
      if (!closed) {
        res.status(409).json({ error: 'already_finalised' });
        return;
      }

      const merged = await mergeSessionParts(
        id,
        currentSessionId,
        closed.parts ?? session.parts,
      );

      res.json({
        state: 'closed',
        ...merged,
        startedAtEpochMs,
        stoppedAtEpochMs,
      });
    },
  );

  return router;
};
