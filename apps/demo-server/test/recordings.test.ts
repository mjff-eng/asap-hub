process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { createHash } from 'crypto';
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { isLocal } from '../src/config';
import {
  recordingSessionEntity,
  userEntity,
  videoEntity,
} from '../src/data/entities';
import { captureQuota, inlineEventsMaxBytes } from '../src/routes/recordings';
import { buildSignedCookies } from '../src/signed-cookies';
import * as storage from '../src/storage';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  putObject: jest.fn(),
  getObjectText: jest.fn(),
  objectSize: jest.fn(),
  deletePrefix: jest.fn(),
}));

jest.mock('../src/config', () => ({
  ...jest.requireActual('../src/config'),
  isLocal: jest.fn(() => true),
}));

jest.mock('../src/signed-cookies', () => ({
  buildSignedCookies: jest.fn(async () => [
    { name: 'CloudFront-Policy', value: 'a-policy' },
    { name: 'CloudFront-Signature', value: 'a-signature' },
    { name: 'CloudFront-Key-Pair-Id', value: 'KEYPAIR123' },
  ]),
}));

const mockIsLocal = isLocal as jest.MockedFunction<typeof isLocal>;
const mockBuildSignedCookies = buildSignedCookies as jest.MockedFunction<
  typeof buildSignedCookies
>;

const mockSend = jest.fn();
jest.mock('../src/data/client', () => ({
  getDocumentClient: () => ({
    send: (...args: unknown[]) => mockSend(...args),
  }),
  setDocumentClient: jest.fn(),
}));

const bearer = (claims: Record<string, unknown>): string => {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `Bearer ${encode({ alg: 'none' })}.${encode(claims)}.signature`;
};

const creatorToken = bearer({
  sub: 'auth0|creator',
  email: 'ana@example.com',
  email_verified: true,
  name: 'Ana',
});

const memberToken = bearer({
  sub: 'auth0|member',
  email: 'bob@example.com',
  email_verified: true,
  name: 'Bob',
});

const api = supertest(appFactory());

const mockUser = (role: 'creator' | 'member' | 'admin', sub: string) => {
  jest.spyOn(userEntity, 'get').mockReturnValue({
    go: async () => ({
      data: {
        sub,
        name: 'Ana',
        email: 'ana@example.com',
        role,
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const projectItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'project-1',
  title: 'Sprint 12 demo',
  status: 'draft',
  folderId: 'ROOT',
  recordedAt: '2026-08-01T10:00:00.000Z',
  kind: 'studio',
  processingState: 'empty',
  version: 3,
  createdBy: { sub: 'auth0|creator', name: 'Ana' },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  ...overrides,
});

const token = 'a-capture-token';

const sessionItem = (overrides: Record<string, unknown> = {}) => ({
  sessionId: 'session-1',
  videoId: 'project-1',
  tokenHash: createHash('sha256').update(token).digest('hex'),
  state: 'open',
  eventCount: 4,
  parts: ['tab-a:1', 'tab-a:2'],
  lastEventAt: '2026-08-01T10:05:00.000Z',
  expiresAt: Date.now() + 60_000,
  createdBy: { sub: 'auth0|creator', name: 'Ana' },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:05:00.000Z',
  ...overrides,
});

const mockVideoGet = (data: Record<string, unknown> | null) => {
  jest.spyOn(videoEntity, 'get').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const mockSessionGet = (data: Record<string, unknown> | null) => {
  jest.spyOn(recordingSessionEntity, 'get').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

// the release path reads the row again, and it reads a row the claim has since
// changed, so the two reads answer differently
const mockSessionGetSequence = (
  ...items: (Record<string, unknown> | null)[]
) => {
  let index = 0;
  jest.spyOn(recordingSessionEntity, 'get').mockReturnValue({
    go: async () => {
      const data = items[Math.min(index, items.length - 1)];
      index += 1;
      return { data };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const mockSessionCreate = () =>
  jest
    .spyOn(recordingSessionEntity, 'create')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValue({ go: async () => ({ data: {} }) } as any);

// patch chains .set().add().append().go(); each link is recorded so a test can
// assert on the counters the capture endpoint bumped
const mockSessionPatch = () => {
  const calls = {
    set: jest.fn(),
    add: jest.fn(),
    append: jest.fn(),
  };
  const chain: Record<string, unknown> = { go: async () => ({ data: {} }) };
  (['set', 'add', 'append'] as const).forEach((method) => {
    chain[method] = (value: unknown) => {
      calls[method](value);
      return chain;
    };
  });
  jest
    .spyOn(recordingSessionEntity, 'patch')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValue(chain as any);
  return calls;
};

const postCapture = (body: Record<string, unknown>) =>
  api
    .post('/api/capture')
    .set('Content-Type', 'text/plain;charset=UTF-8')
    .send(JSON.stringify(body));

const batch = (overrides: Record<string, unknown> = {}) => ({
  sessionId: 'session-1',
  token,
  clientId: 'tab-a',
  seq: 3,
  events: [
    { id: 'e1', type: 'move', t: 1, x: 2, y: 3 },
    { id: 'e2', type: 'click', t: 4, x: 5, y: 6 },
  ],
  ...overrides,
});

// the reusable bookmark: the token lives on the project row and the row says
// which session is open, so one bookmark saved once serves every take
const projectToken = 'a-project-token';

const bookmarkedProject = (overrides: Record<string, unknown> = {}) =>
  projectItem({
    captureTokenHash: createHash('sha256').update(projectToken).digest('hex'),
    captureSessionId: 'session-1',
    ...overrides,
  });

const projectBatch = (overrides: Record<string, unknown> = {}) => {
  const { sessionId, ...rest } = batch();
  return { ...rest, projectId: 'project-1', token: projectToken, ...overrides };
};

// the capture endpoint writes through the document client so the idempotency
// guard can ride on the update's own ConditionExpression
const captureWrites = () =>
  mockSend.mock.calls.map(([command]) => command.input);

// a row write echoes what it set, which is how the route tells the token it
// minted from one the project already had
const echoVideoWrite = () =>
  mockSend.mockImplementation(
    async (command: {
      input: { ExpressionAttributeValues?: Record<string, string> };
    }) => ({
      Attributes: {
        captureTokenHash:
          command.input.ExpressionAttributeValues?.[':tokenHash'],
      },
    }),
  );

const hashOf = (token: string) =>
  createHash('sha256').update(token).digest('hex');

const bookmarkTokenOf = (snippetUrl: string) =>
  snippetUrl.split('#project.project-1.')[1] ?? '';

beforeEach(() => {
  jest.restoreAllMocks();
  mockSend.mockReset().mockResolvedValue({});
  (storage.putObject as jest.Mock).mockReset().mockResolvedValue(undefined);
  (storage.getObjectText as jest.Mock).mockReset();
  // the merged stream is there unless a test says otherwise
  (storage.objectSize as jest.Mock).mockReset().mockResolvedValue(2048);
  (storage.deletePrefix as jest.Mock).mockReset().mockResolvedValue(undefined);
  // restoreAllMocks leaves the module factory mocks alone
  mockIsLocal.mockReset().mockReturnValue(true);
  mockBuildSignedCookies.mockClear();
});

describe('POST /api/projects/:id/recordings', () => {
  it('hands a bookmark for the project back once and stores only its hash', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    const create = mockSessionCreate();
    echoVideoWrite();

    const response = await api
      .post('/api/projects/project-1/recordings')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(201);
    const { sessionId, token: issued, snippetUrl, captureUrl } = response.body;
    expect(sessionId).toMatch(/^[0-9a-f]{32}$/);
    // the bookmark names the project, not the take, so it is saved once and
    // reused by every recording after this one
    expect(snippetUrl).toBe(
      `http://localhost:3500/capture/v1.js#project.project-1.${bookmarkTokenOf(
        snippetUrl,
      )}`,
    );
    expect(response.body.bookmarkReady).toBe(false);
    expect(captureUrl).toBe('http://localhost:3500/api/capture');

    const [write] = captureWrites();
    expect(write.Key).toEqual({ PK: 'VIDEO#project-1', SK: 'META' });
    expect(write.UpdateExpression).toContain(
      'captureTokenHash = if_not_exists(captureTokenHash, :tokenHash)',
    );
    expect(write.ExpressionAttributeValues[':sessionId']).toBe(sessionId);
    expect(write.ExpressionAttributeValues[':tokenHash']).toBe(
      hashOf(bookmarkTokenOf(snippetUrl)),
    );
    expect(JSON.stringify(write)).not.toContain(bookmarkTokenOf(snippetUrl));

    const stored = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(stored).toMatchObject({
      sessionId,
      videoId: 'project-1',
      state: 'open',
      eventCount: 0,
      parts: [],
      tokenHash: createHash('sha256').update(issued).digest('hex'),
    });
    expect(JSON.stringify(stored)).not.toContain(issued);
  });

  // the whole point of the reusable bookmark: a second recording must not
  // silently replace the token the creator already saved in their browser
  it('leaves the bookmark a project already has alone', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(bookmarkedProject());
    mockSessionCreate();
    mockSend.mockResolvedValue({
      Attributes: { captureTokenHash: hashOf(projectToken) },
    });

    const response = await api
      .post('/api/projects/project-1/recordings')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(201);
    expect(response.body.snippetUrl).toBeUndefined();
    expect(response.body.bookmarkReady).toBe(true);
  });

  it('points the project at the session it just opened', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(bookmarkedProject());
    mockSessionCreate();
    echoVideoWrite();

    const response = await api
      .post('/api/projects/project-1/recordings')
      .set('Authorization', creatorToken);

    const [write] = captureWrites();
    expect(write.UpdateExpression).toContain('captureSessionId = :sessionId');
    expect(write.ExpressionAttributeValues[':sessionId']).toBe(
      response.body.sessionId,
    );
  });

  // DynamoDB reads a TTL attribute as epoch seconds, so the row carries the
  // same instant twice: expiresAt in the milliseconds the routes compare, and
  // ttl in the seconds the table's TimeToLiveSpecification points at
  it('gives the session a ttl in the seconds dynamodb expires on', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    const create = mockSessionCreate();

    await api
      .post('/api/projects/project-1/recordings')
      .set('Authorization', creatorToken);

    const stored = create.mock.calls[0]?.[0] as {
      expiresAt: number;
      ttl: number;
    };
    expect(stored.ttl).toBe(Math.floor(stored.expiresAt / 1000));
  });

  it('is not found for a plain upload', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ kind: 'upload' }));

    const response = await api
      .post('/api/projects/project-1/recordings')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(404);
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .post('/api/projects/project-1/recordings')
      .set('Authorization', memberToken);

    expect(response.status).toBe(403);
  });
});

describe('POST /api/projects/:id/capture-bookmark', () => {
  it('mints a new bookmark and overwrites the hash the old one is checked against', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(bookmarkedProject());

    const response = await api
      .post('/api/projects/project-1/capture-bookmark')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(201);
    const rotated = bookmarkTokenOf(response.body.snippetUrl);
    expect(rotated).not.toBe(projectToken);
    expect(response.body.snippetUrl).toBe(
      `http://localhost:3500/capture/v1.js#project.project-1.${rotated}`,
    );

    const [write] = captureWrites();
    expect(write.Key).toEqual({ PK: 'VIDEO#project-1', SK: 'META' });
    expect(write.UpdateExpression).toBe('SET captureTokenHash = :tokenHash');
    expect(write.ExpressionAttributeValues[':tokenHash']).toBe(hashOf(rotated));
    expect(JSON.stringify(write)).not.toContain(rotated);
  });

  // rotating is the whole revocation story: the row holds one hash, so a
  // bookmark carrying the token it replaced stops being accepted
  it('leaves a bookmark carrying the replaced token unaccepted', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(bookmarkedProject());

    const rotation = await api
      .post('/api/projects/project-1/capture-bookmark')
      .set('Authorization', creatorToken);
    const rotated = bookmarkTokenOf(rotation.body.snippetUrl);

    jest.restoreAllMocks();
    mockSend.mockReset().mockResolvedValue({});
    mockVideoGet(bookmarkedProject({ captureTokenHash: hashOf(rotated) }));
    mockSessionGet(sessionItem());

    const refused = await postCapture(projectBatch());
    expect(refused.status).toBe(204);
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();

    const accepted = await postCapture(projectBatch({ token: rotated }));
    expect(accepted.status).toBe(204);
    expect(storage.putObject).toHaveBeenCalledTimes(1);
  });

  it('is not found for a plain upload', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ kind: 'upload' }));

    const response = await api
      .post('/api/projects/project-1/capture-bookmark')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(404);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .post('/api/projects/project-1/capture-bookmark')
      .set('Authorization', memberToken);

    expect(response.status).toBe(403);
  });
});

describe('GET /api/projects/:id/recordings/:sessionId', () => {
  it('reports what the studio indicator shows', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem());

    const response = await api
      .get('/api/projects/project-1/recordings/session-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      state: 'open',
      eventCount: 4,
      // one tab so far; a second one recording the same screen would say two
      clientCount: 1,
      lastEventAt: '2026-08-01T10:05:00.000Z',
    });
  });

  it('reports an open session past its lifetime as expired', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ expiresAt: Date.now() - 1 }));

    const response = await api
      .get('/api/projects/project-1/recordings/session-1')
      .set('Authorization', creatorToken);

    expect(response.body.state).toBe('expired');
  });

  it('is not found for a session belonging to another project', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ videoId: 'project-2' }));

    const response = await api
      .get('/api/projects/project-1/recordings/session-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(404);
  });
});

describe('GET /api/projects/:id/recordings/:sessionId/events', () => {
  const finalisedSession = (overrides: Record<string, unknown> = {}) =>
    sessionItem({
      state: 'closed',
      parts: [],
      eventsKey: 'projects/project-1/capture/session-1/events.ndjson',
      ...overrides,
    });

  const getEvents = (authorization = creatorToken, query = '') =>
    api
      .get(`/api/projects/project-1/recordings/session-1/events${query}`)
      .set('Authorization', authorization);

  const cookiesOf = (response: { headers: Record<string, unknown> }) =>
    (response.headers['set-cookie'] ?? []) as string[];

  // a long take merges to far more than a lambda response may carry, so the
  // route names the object and the browser reads it from storage
  it('hands back the path the stream is served from, not the stream', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession());
    (storage.objectSize as jest.Mock).mockResolvedValue(4096);

    const response = await getEvents();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      url: '/projects/project-1/capture/session-1/events.ndjson',
      bytes: 4096,
    });
    expect(storage.getObjectText).not.toHaveBeenCalled();
  });

  // through the CDN an object that was never written answers 403, exactly like
  // a cookie that was refused, so the size is the only thing that tells them
  // apart and it has to be told before the browser is sent there
  it('says the stream is missing rather than naming a path nothing serves', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession());
    (storage.objectSize as jest.Mock).mockResolvedValue(undefined);

    const response = await getEvents();

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'stream_missing' });
  });

  // nothing about the CDN half can be proved without a deploy, so a stream
  // small enough for the response the gateway allows has a second way through
  it('carries the bytes itself when the caller asks for them inline', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession());
    (storage.objectSize as jest.Mock).mockResolvedValue(64);
    (storage.getObjectText as jest.Mock).mockResolvedValue(
      '{"id":"e1","t":1}\n',
    );

    const response = await getEvents(creatorToken, '?inline=1');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/x-ndjson');
    expect(response.text).toBe('{"id":"e1","t":1}\n');
    expect(storage.getObjectText).toHaveBeenCalledWith(
      'projects/project-1/capture/session-1/events.ndjson',
    );
  });

  it('refuses to carry a stream larger than the response may hold', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession());
    (storage.objectSize as jest.Mock).mockResolvedValue(
      inlineEventsMaxBytes + 1,
    );

    const response = await getEvents(creatorToken, '?inline=1');

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: 'too_large',
      bytes: inlineEventsMaxBytes + 1,
      limit: inlineEventsMaxBytes,
    });
    expect(storage.getObjectText).not.toHaveBeenCalled();
  });

  it('carries a stream sitting exactly on the cap', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession());
    (storage.objectSize as jest.Mock).mockResolvedValue(inlineEventsMaxBytes);
    (storage.getObjectText as jest.Mock).mockResolvedValue('{"id":"e1"}\n');

    const response = await getEvents(creatorToken, '?inline=1');

    expect(response.status).toBe(200);
  });

  // the inline path is the same route, so it may not be a way around the check
  // the CDN path answers to
  it('refuses an inline read from a caller who may not read the project', async () => {
    mockUser('member', 'auth0|member');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession());

    const response = await getEvents(memberToken, '?inline=1');

    expect(response.status).toBe(403);
    expect(storage.getObjectText).not.toHaveBeenCalled();
  });

  it('refuses an inline read of a session nothing has finalised yet', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession({ eventsKey: undefined }));

    const response = await getEvents(creatorToken, '?inline=1');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'not_finalised' });
  });

  // the studio asks for the stream in the request after the one that merged it,
  // and an eventually consistent read can still answer with the row as it was
  it('reads the session consistently, so a fresh merge is never missed', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    const get = jest
      .spyOn(recordingSessionEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: jest.fn(async () => ({ data: null })) } as any);

    await getEvents();

    expect(get.mock.results[0]?.value.go).toHaveBeenCalledWith({
      consistent: true,
    });
  });

  it('still refuses a session nothing has finalised yet', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession({ eventsKey: undefined }));

    const response = await getEvents();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'not_finalised' });
  });

  it('still refuses a caller who may not read the project', async () => {
    mockUser('member', 'auth0|member');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession());

    const response = await getEvents(memberToken);

    expect(response.status).toBe(403);
    expect(mockBuildSignedCookies).not.toHaveBeenCalled();
  });

  it('is not found for a session belonging to another project', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession({ videoId: 'project-2' }));

    const response = await getEvents();

    expect(response.status).toBe(404);
  });

  // deployed the path is a CloudFront one behind the same key group the sources
  // are served through, so the route that authorises the read signs it too
  it('signs the project prefix the path sits under when deployed', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession());
    // auth decodes the bearer token only in local mode, so stay local for the
    // middleware and flip to deployed for the handler's own isLocal() check
    mockIsLocal.mockReturnValueOnce(true).mockReturnValue(false);

    const response = await getEvents();

    expect(response.status).toBe(200);
    expect(mockBuildSignedCookies).toHaveBeenCalledWith(
      'project-1',
      'projects',
    );
    expect(cookiesOf(response).map((cookie) => cookie.split('=')[0])).toEqual([
      'CloudFront-Policy',
      'CloudFront-Signature',
      'CloudFront-Key-Pair-Id',
    ]);
    expect(
      cookiesOf(response).every((cookie) =>
        cookie.includes('Path=/projects/project-1/'),
      ),
    ).toBe(true);
  });

  it('signs nothing locally, where the vite proxy reads minio directly', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(finalisedSession());

    const response = await getEvents();

    expect(response.status).toBe(200);
    expect(mockBuildSignedCookies).not.toHaveBeenCalled();
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});

describe('POST /api/capture', () => {
  it('needs no authentication and writes the batch under the session', async () => {
    mockSessionGet(sessionItem());

    const response = await postCapture(batch());

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/project-1/capture/session-1/parts/tab-a-3.ndjson',
      '{"id":"e1","type":"move","t":1,"x":2,"y":3}\n{"id":"e2","type":"click","t":4,"x":5,"y":6}\n',
      'application/x-ndjson',
      'lifecycle=capture',
    );

    const [write] = captureWrites();
    expect(write.Key).toEqual({ PK: 'RECORDING#session-1', SK: 'META' });
    expect(write.ExpressionAttributeValues).toMatchObject({
      ':part': ['tab-a:3'],
      ':partId': 'tab-a:3',
      ':events': 2,
    });
  });

  // the snippet posts no-cors and never sees the response, so a retry of a batch
  // that did land is ordinary traffic and must not be counted twice
  it('makes the part id and the quotas conditions of the write itself', async () => {
    mockSessionGet(sessionItem());

    await postCapture(batch());

    const [{ ConditionExpression, ExpressionAttributeValues }] =
      captureWrites();
    expect(ConditionExpression).toContain('NOT contains(#parts, :partId)');
    expect(ConditionExpression).toContain('size(#parts) < :maxParts');
    expect(ConditionExpression).toContain('eventCount <= :maxEventCount');
    expect(ConditionExpression).toContain('#state = :open');
    expect(ConditionExpression).toContain('expiresAt > :now');
    expect(ExpressionAttributeValues[':maxParts']).toBe(captureQuota.parts);
    expect(ExpressionAttributeValues[':maxEventCount']).toBe(200_000 - 2);
  });

  it('still answers 204 when the write loses its condition to a retry', async () => {
    mockSessionGet(sessionItem());
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
      }),
    );

    const response = await postCapture(batch());

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
  });

  // the session read is stale for every concurrent batch, so the conditional
  // counter write is the only thing that bounds the object writes; putting the
  // object first let N batches with distinct seq each write up to a MiB while
  // only the quota's worth of counters landed
  it('writes nothing to s3 when the counter write loses its condition', async () => {
    mockSessionGet(sessionItem());
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
      }),
    );

    await postCapture(batch());

    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('claims the counter slot before it writes the object', async () => {
    mockSessionGet(sessionItem());
    const order: string[] = [];
    mockSend.mockImplementation(async () => {
      order.push('counter');
      return {};
    });
    (storage.putObject as jest.Mock).mockImplementation(async () => {
      order.push('object');
    });

    await postCapture(batch());

    expect(order).toEqual(['counter', 'object']);
  });

  // the counter is bumped before the object is written, so a put that fails
  // once used to drop the batch while the count still carried its events
  it('writes the batch again when the first attempt fails', async () => {
    mockSessionGet(sessionItem({ parts: [] }));
    (storage.putObject as jest.Mock)
      .mockRejectedValueOnce(new Error('s3 is having a day'))
      .mockResolvedValueOnce(undefined);

    const response = await postCapture(batch());

    expect(response.status).toBe(204);
    expect(storage.putObject).toHaveBeenCalledTimes(2);
    // the claim, and nothing given back
    expect(captureWrites()).toHaveLength(1);
  });

  it('gives the claimed slot back when the batch cannot be written at all', async () => {
    mockSessionGetSequence(
      sessionItem({ parts: [], eventCount: 0 }),
      sessionItem({ parts: ['tab-a:3'], eventCount: 2 }),
    );
    (storage.putObject as jest.Mock).mockRejectedValue(
      new Error('s3 is having a day'),
    );

    const response = await postCapture(batch());

    expect(response.status).toBe(204);
    expect(storage.putObject).toHaveBeenCalledTimes(2);

    const [, release] = captureWrites();
    expect(release.ExpressionAttributeValues[':parts']).toEqual([]);
    expect(release.ExpressionAttributeValues[':events']).toBe(-2);
    expect(release.ConditionExpression).toContain('contains(#parts, :partId)');
  });

  it('never writes anything under raw/', async () => {
    mockSessionGet(sessionItem());

    await postCapture(batch());

    const [key] = (storage.putObject as jest.Mock).mock.calls[0] as string[];
    expect(key).toMatch(/^projects\//);
  });

  it.each([
    ['an unknown session', null, batch()],
    ['a wrong token', sessionItem(), batch({ token: 'not-the-token' })],
    ['an expired session', sessionItem({ expiresAt: Date.now() - 1 }), batch()],
    ['a closed session', sessionItem({ state: 'closed' }), batch()],
    ['a replayed batch from the same tab', sessionItem(), batch({ seq: 2 })],
    [
      'a session over its event quota',
      sessionItem({ eventCount: 199_999 }),
      batch(),
    ],
    [
      'a session over its batch quota',
      sessionItem({ parts: new Array(captureQuota.parts).fill('tab-a:1') }),
      batch(),
    ],
  ])('answers 204 and stores nothing for %s', async (_label, session, body) => {
    mockSessionGet(session);

    const response = await postCapture(body);

    expect(response.status).toBe(204);
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it.each([
    ['a body that is not json', 'not json at all'],
    ['a batch with no events', JSON.stringify(batch({ events: [] }))],
    [
      'a session id outside the safe alphabet',
      JSON.stringify(batch({ sessionId: '../../etc' })),
    ],
    [
      'a sequence number that is not positive',
      JSON.stringify(batch({ seq: 0 })),
    ],
  ])(
    'answers 400 for %s without touching the session',
    async (_label, body) => {
      const get = jest.spyOn(recordingSessionEntity, 'get');

      const response = await api
        .post('/api/capture')
        .set('Content-Type', 'text/plain;charset=UTF-8')
        .send(body);

      expect(response.status).toBe(400);
      expect(get).not.toHaveBeenCalled();
      expect(storage.putObject).not.toHaveBeenCalled();
    },
  );

  it('rejects a batch larger than the cap', async () => {
    mockSessionGet(sessionItem());

    const response = await postCapture(
      batch({
        events: new Array(5001).fill({ id: 'e', type: 'move', t: 1 }),
      }),
    );

    expect(response.status).toBe(400);
    expect(storage.putObject).not.toHaveBeenCalled();
  });
});

describe('POST /api/capture from the reusable bookmark', () => {
  // the bug this replaces: every recording minted a session, so a bookmark
  // saved from an earlier one posted to a session that was already closed
  it('routes a batch that names the project to the session it has open', async () => {
    mockVideoGet(bookmarkedProject());
    mockSessionGet(sessionItem());

    const response = await postCapture(projectBatch());

    expect(response.status).toBe(204);
    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/project-1/capture/session-1/parts/tab-a-3.ndjson',
      expect.any(String),
      'application/x-ndjson',
      'lifecycle=capture',
    );
    const [write] = captureWrites();
    expect(write.Key).toEqual({ PK: 'RECORDING#session-1', SK: 'META' });
  });

  it('follows the project to a session opened after the bookmark was saved', async () => {
    mockVideoGet(bookmarkedProject({ captureSessionId: 'session-9' }));
    mockSessionGet(sessionItem({ sessionId: 'session-9', parts: [] }));

    const response = await postCapture(projectBatch());

    expect(response.status).toBe(204);
    const [write] = captureWrites();
    expect(write.Key).toEqual({ PK: 'RECORDING#session-9', SK: 'META' });
  });

  // a bookmark saved before the reusable one carries its session's own token
  // and must keep working for as long as that session is open
  it('still accepts a bookmark that names the session', async () => {
    mockSessionGet(sessionItem());

    const response = await postCapture(batch());

    expect(response.status).toBe(204);
    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/project-1/capture/session-1/parts/tab-a-3.ndjson',
      expect.any(String),
      'application/x-ndjson',
      'lifecycle=capture',
    );
  });

  it.each([
    [
      'nothing is recording',
      bookmarkedProject({ captureSessionId: undefined }),
    ],
    [
      'the project has no bookmark',
      projectItem({ captureSessionId: 'session-1' }),
    ],
    ['the project is gone', null],
  ])('answers 204 and stores nothing when %s', async (_label, project) => {
    mockVideoGet(project);
    mockSessionGet(sessionItem());

    const response = await postCapture(projectBatch());

    expect(response.status).toBe(204);
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it.each([
    ['the take has been finalised', sessionItem({ state: 'closed' })],
    ['the session has expired', sessionItem({ expiresAt: Date.now() - 1 })],
    [
      'the session belongs to another project',
      sessionItem({ videoId: 'project-2' }),
    ],
    ['the batch is a replay', sessionItem()],
  ])('answers 204 and stores nothing when %s', async (label, session) => {
    mockVideoGet(bookmarkedProject());
    mockSessionGet(session);

    const response = await postCapture(
      projectBatch(label === 'the batch is a replay' ? { seq: 2 } : {}),
    );

    expect(response.status).toBe(204);
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('answers 204 for a token the project no longer holds', async () => {
    mockVideoGet(bookmarkedProject());
    mockSessionGet(sessionItem());

    const response = await postCapture(
      projectBatch({ token: 'not-the-token' }),
    );

    expect(response.status).toBe(204);
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  // the quota bounds the S3 writes, not only the counters, so it has to hold on
  // the routed session exactly as it does on a named one
  it('holds the event quota and keeps it a condition of the write', async () => {
    mockVideoGet(bookmarkedProject());
    mockSessionGet(sessionItem({ eventCount: 199_999 }));

    const over = await postCapture(projectBatch());

    expect(over.status).toBe(204);
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();

    mockSessionGet(sessionItem());
    await postCapture(projectBatch());

    const [{ ConditionExpression, ExpressionAttributeValues }] =
      captureWrites();
    expect(ConditionExpression).toContain('eventCount <= :maxEventCount');
    expect(ConditionExpression).toContain('size(#parts) < :maxParts');
    expect(ExpressionAttributeValues[':maxEventCount']).toBe(200_000 - 2);
  });

  it('holds the batch quota on the routed session', async () => {
    mockVideoGet(bookmarkedProject());
    mockSessionGet(
      sessionItem({ parts: new Array(captureQuota.parts).fill('tab-a:1') }),
    );

    const response = await postCapture(projectBatch());

    expect(response.status).toBe(204);
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('writes nothing to s3 when the counter write loses its condition', async () => {
    mockVideoGet(bookmarkedProject());
    mockSessionGet(sessionItem());
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
      }),
    );

    const response = await postCapture(projectBatch());

    expect(response.status).toBe(204);
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it.each([
    [
      'names both a project and a session',
      { ...projectBatch(), sessionId: 'session-1' },
    ],
    ['names neither', { ...projectBatch(), projectId: undefined }],
    [
      'names a project outside the safe alphabet',
      projectBatch({ projectId: '../../etc' }),
    ],
  ])('answers 400 for a batch that %s', async (_label, body) => {
    const videos = jest.spyOn(videoEntity, 'get');
    const sessions = jest.spyOn(recordingSessionEntity, 'get');

    const response = await postCapture(body);

    expect(response.status).toBe(400);
    expect(videos).not.toHaveBeenCalled();
    expect(sessions).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });
});

describe('POST /api/projects/:id/recordings/:sessionId/finalise', () => {
  const finalise = (body: Record<string, unknown>) =>
    api
      .post('/api/projects/project-1/recordings/session-1/finalise')
      .set('Authorization', creatorToken)
      .send(body);

  it('concatenates the batches into one immutable stream and closes the session', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ parts: ['tab-a:2', 'tab-a:1', 'tab-a:2'] }));
    const patch = mockSessionPatch();
    (storage.getObjectText as jest.Mock).mockImplementation(
      async (key: string) =>
        key.endsWith('tab-a-1.ndjson')
          ? '{"id":"e1","t":1}\n'
          : '{"id":"e2","t":2}\n{"id":"e3","t":3}',
    );

    const response = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });

    expect(response.status).toBe(200);
    expect(storage.getObjectText).toHaveBeenCalledTimes(2);
    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/project-1/capture/session-1/events.ndjson',
      '{"id":"e1","t":1}\n{"id":"e2","t":2}\n{"id":"e3","t":3}\n',
      'application/x-ndjson',
      'lifecycle=capture',
    );
    expect(storage.deletePrefix).toHaveBeenCalledWith(
      'projects/project-1/capture/session-1/parts/',
    );
    expect(patch.set).toHaveBeenCalledWith(
      expect.objectContaining({
        eventsKey: 'projects/project-1/capture/session-1/events.ndjson',
        parts: [],
      }),
    );
    expect(response.body).toEqual({
      state: 'closed',
      eventsKey: 'projects/project-1/capture/session-1/events.ndjson',
      eventCount: 3,
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });
  });

  it('carries on when a batch object never landed', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ parts: ['tab-a:1', 'tab-a:2'] }));
    mockSessionPatch();
    (storage.getObjectText as jest.Mock).mockImplementation(
      async (key: string) => {
        if (key.endsWith('1.ndjson')) {
          throw new Error('NoSuchKey');
        }
        return '{"id":"e2"}\n';
      },
    );

    const response = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });

    expect(response.status).toBe(200);
    expect(response.body.eventCount).toBe(1);
  });

  it('refuses to finalise a session twice', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(
      sessionItem({
        state: 'closed',
        eventsKey: 'projects/project-1/capture/session-1/events.ndjson',
      }),
    );

    const response = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'already_finalised' });
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  // the close lands, the merge does not, and the take used to be unreachable
  // for good: the retry lost the close and the events route had no key
  it('finishes a session closed by a finalise whose merge never landed', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ parts: ['tab-a:1'] }));
    mockSessionPatch();
    (storage.getObjectText as jest.Mock).mockResolvedValue('{"id":"e1","t":1}');
    (storage.putObject as jest.Mock).mockRejectedValueOnce(
      new Error('s3 is having a day'),
    );

    const failed = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });
    expect(failed.status).toBe(500);

    // the row the retry reads: closed by the first attempt, with no eventsKey
    mockSessionGet(
      sessionItem({
        state: 'closed',
        parts: ['tab-a:1'],
        startedAtEpochMs: 1_700_000_000_000,
        stoppedAtEpochMs: 1_700_000_060_000,
      }),
    );
    const patch = mockSessionPatch();

    const retry = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });

    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({
      state: 'closed',
      eventsKey: 'projects/project-1/capture/session-1/events.ndjson',
      eventCount: 1,
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });
    expect(patch.set).toHaveBeenCalledWith(
      expect.objectContaining({
        eventsKey: 'projects/project-1/capture/session-1/events.ndjson',
      }),
    );
  });

  it('serves the events of a session the retry finished', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ state: 'closed', parts: ['tab-a:1'] }));
    mockSessionPatch();
    (storage.getObjectText as jest.Mock).mockResolvedValue('{"id":"e1","t":1}');

    const retry = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });
    expect(retry.status).toBe(200);

    mockSessionGet(
      sessionItem({
        state: 'closed',
        parts: [],
        eventsKey: retry.body.eventsKey,
      }),
    );
    const events = await api
      .get('/api/projects/project-1/recordings/session-1/events')
      .set('Authorization', creatorToken);

    expect(events.status).toBe(200);
    expect(events.body).toEqual({
      url: `/${retry.body.eventsKey}`,
      bytes: 2048,
    });
  });

  // the parts are the only copy of the stream until the row points at the
  // merged one, so a merge that never landed must leave them alone
  it('keeps the parts until the eventsKey is on the row', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ parts: ['tab-a:1'] }));
    mockSessionPatch();
    (storage.getObjectText as jest.Mock).mockResolvedValue('{"id":"e1","t":1}');
    (storage.putObject as jest.Mock).mockRejectedValue(
      new Error('s3 is having a day'),
    );

    const response = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });

    expect(response.status).toBe(500);
    expect(storage.deletePrefix).not.toHaveBeenCalled();
  });

  it('drops the parts only once the row points at the merged stream', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ parts: ['tab-a:1'] }));
    const order: string[] = [];
    jest.spyOn(recordingSessionEntity, 'patch').mockReturnValue({
      set: () => ({
        go: async () => {
          order.push('eventsKey');
          return { data: {} };
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    (storage.getObjectText as jest.Mock).mockResolvedValue('{"id":"e1","t":1}');
    (storage.deletePrefix as jest.Mock).mockImplementation(async () => {
      order.push('deleteParts');
    });

    const response = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });

    expect(response.status).toBe(200);
    expect(order).toEqual(['eventsKey', 'deleteParts']);
  });

  it('rejects a window that stops before it started', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem());

    const response = await finalise({
      startedAtEpochMs: 1_700_000_060_000,
      stoppedAtEpochMs: 1_700_000_000_000,
    });

    expect(response.status).toBe(400);
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  // a batch accepted after the merge was written, but before the row said
  // closed, used to be erased with the parts list and never reach the stream
  it('closes the session with a conditional write before it merges anything', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ parts: ['tab-a:1'] }));
    mockSessionPatch();
    (storage.getObjectText as jest.Mock).mockResolvedValue('{"id":"e1"}\n');
    const order: string[] = [];
    mockSend.mockImplementation(async () => {
      order.push('close');
      return {};
    });
    (storage.putObject as jest.Mock).mockImplementation(async () => {
      order.push('merge');
    });

    const response = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });

    expect(response.status).toBe(200);
    expect(order).toEqual(['close', 'merge']);

    const { ConditionExpression, ExpressionAttributeValues, ReturnValues } =
      mockSend.mock.calls[0]![0].input;
    expect(ConditionExpression).toBe('#state = :open');
    expect(ExpressionAttributeValues[':closed']).toBe('closed');
    expect(ExpressionAttributeValues[':startedAt']).toBe(1_700_000_000_000);
    expect(ReturnValues).toBe('ALL_NEW');
  });

  // both requests pass the read's state check, so only the condition separates them
  it('refuses the second of two concurrent finalises', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem());
    mockSessionPatch();
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
      }),
    );

    const response = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'already_finalised' });
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(storage.deletePrefix).not.toHaveBeenCalled();
  });

  it('merges the parts the close returned, not the ones the read saw', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ parts: ['tab-a:1'] }));
    mockSessionPatch();
    // a batch landed between the read and the close, so the row carries two
    mockSend.mockResolvedValue({
      Attributes: { parts: ['tab-a:1', 'tab-a:2'] },
    });
    (storage.getObjectText as jest.Mock).mockImplementation(
      async (key: string) =>
        key.endsWith('tab-a-1.ndjson')
          ? '{"id":"e1","t":1}'
          : '{"id":"e2","t":2}',
    );

    const response = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });

    expect(response.body.eventCount).toBe(2);
    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/project-1/capture/session-1/events.ndjson',
      '{"id":"e1","t":1}\n{"id":"e2","t":2}\n',
      'application/x-ndjson',
      'lifecycle=capture',
    );
  });
});

describe('two tabs sharing one session', () => {
  it('accepts a batch from each, because the sequence guard is per tab', async () => {
    mockSessionGet(sessionItem({ parts: [] }));

    const first = await postCapture(batch({ clientId: 'tab-a', seq: 1 }));
    const second = await postCapture(batch({ clientId: 'tab-b', seq: 1 }));

    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    expect(
      captureWrites().map(
        ({ ExpressionAttributeValues }) => ExpressionAttributeValues[':part'],
      ),
    ).toEqual([['tab-a:1'], ['tab-b:1']]);
  });

  it('writes each tab its own part object', async () => {
    mockSessionGet(sessionItem({ parts: [] }));

    await postCapture(batch({ clientId: 'tab-b', seq: 4 }));

    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/project-1/capture/session-1/parts/tab-b-4.ndjson',
      expect.any(String),
      'application/x-ndjson',
      'lifecycle=capture',
    );
  });

  const finalise = (body: Record<string, unknown>) =>
    api
      .post('/api/projects/project-1/recordings/session-1/finalise')
      .set('Authorization', creatorToken)
      .send(body);

  it('merges both streams into one, ordered by the clock they share', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSessionGet(sessionItem({ parts: ['tab-a:1', 'tab-b:1', 'tab-a:2'] }));
    mockSessionPatch();
    (storage.getObjectText as jest.Mock).mockImplementation(
      async (key: string) => {
        if (key.endsWith('tab-a-1.ndjson')) return '{"id":"a1","t":10}';
        if (key.endsWith('tab-a-2.ndjson')) return '{"id":"a2","t":30}';
        return '{"id":"b1","t":20}';
      },
    );

    const response = await finalise({
      startedAtEpochMs: 1_700_000_000_000,
      stoppedAtEpochMs: 1_700_000_060_000,
    });

    expect(response.status).toBe(200);
    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/project-1/capture/session-1/events.ndjson',
      '{"id":"a1","t":10}\n{"id":"b1","t":20}\n{"id":"a2","t":30}\n',
      'application/x-ndjson',
      'lifecycle=capture',
    );
  });
});
