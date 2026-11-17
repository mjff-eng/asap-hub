process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import { createHash } from 'crypto';
import supertest from 'supertest';
import { appFactory } from '../src/app';
import {
  recordingSessionEntity,
  userEntity,
  videoEntity,
} from '../src/data/entities';
import { maxCaptureBodyBytes } from '../src/routes/capture';
import * as storage from '../src/storage';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  putObject: jest.fn(),
  getObjectText: jest.fn(),
  deleteObject: jest.fn(),
  deletePrefix: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'generated-project-id' }));

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

const api = supertest(appFactory());

const mockUser = () => {
  jest.spyOn(userEntity, 'get').mockReturnValue({
    go: async () => ({
      data: {
        sub: 'auth0|creator',
        name: 'Ana',
        email: 'ana@example.com',
        role: 'creator',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const token = 'a-capture-token';

const sessionItem = () => ({
  sessionId: 'session-1',
  videoId: 'project-1',
  tokenHash: createHash('sha256').update(token).digest('hex'),
  state: 'open',
  eventCount: 4,
  parts: ['tab-a:1'],
  lastEventAt: '2026-08-01T10:05:00.000Z',
  expiresAt: Date.now() + 60_000,
  createdBy: { sub: 'auth0|creator', name: 'Ana' },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:05:00.000Z',
});

const mockSessionGet = () => {
  jest.spyOn(recordingSessionEntity, 'get').mockReturnValue({
    go: async () => ({ data: sessionItem() }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const projectItem = () => ({
  id: 'project-1',
  title: 'Sprint 12 demo',
  status: 'draft',
  folderId: 'ROOT',
  recordedAt: '2026-08-01T10:00:00.000Z',
  durationMs: 0,
  chapters: [],
  s3Prefix: 'project-1',
  createdBy: { sub: 'auth0|creator', name: 'Ana' },
  version: 3,
  kind: 'studio',
  processingState: 'empty',
  lockedBy: 'auth0|creator',
  lockedByName: 'Ana',
  lockExpiresAt: Date.now() + 60_000,
  timeline: {
    key: 'projects/project-1/timeline/4.json',
    timelineVersion: 4,
    schemaVersion: 1,
    updatedAt: '2026-08-01T10:00:00.000Z',
  },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
});

const mockVideoGet = () => {
  jest.spyOn(videoEntity, 'get').mockReturnValue({
    go: async () => ({ data: projectItem() }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const batch = (events: Record<string, unknown>[]) => ({
  sessionId: 'session-1',
  token,
  clientId: 'tab-a',
  seq: 3,
  events,
});

const smallEvents = [
  { id: 'e1', type: 'move', t: 1, x: 2, y: 3 },
  { id: 'e2', type: 'click', t: 4, x: 5, y: 6 },
];

const eventsOverCaptureCap = () =>
  Array.from({ length: 1200 }, (_unused, index) => ({
    id: `e${index}`,
    type: 'move',
    t: index,
    x: 2,
    y: 3,
    pad: 'x'.repeat(1000),
  }));

const postCapture = (contentType: string, body: unknown) =>
  api
    .post('/api/capture')
    .set('Content-Type', contentType)
    .send(JSON.stringify(body));

const putTimeline = (body: string) =>
  api
    .put('/api/projects/project-1/timeline')
    .set('Content-Type', 'application/json')
    .set('Authorization', creatorToken)
    .send(body);

const saveTimeline = (body: unknown) => putTimeline(JSON.stringify(body));

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockSend.mockReset().mockResolvedValue({});
  (storage.putObject as jest.Mock).mockReset().mockResolvedValue(undefined);
  (storage.getObjectText as jest.Mock).mockReset();
  (storage.deleteObject as jest.Mock).mockReset().mockResolvedValue(undefined);
});

describe('POST /api/capture body cap', () => {
  it('refuses a batch over the cap sent as application/json', async () => {
    mockSessionGet();
    const body = batch(eventsOverCaptureCap());
    expect(Buffer.byteLength(JSON.stringify(body))).toBeGreaterThan(
      maxCaptureBodyBytes,
    );

    const response = await postCapture('application/json', body);

    // the caller must not be able to lift the cap by naming a content type the
    // route never chose
    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: 'payload_too_large' });
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('refuses a batch over the cap sent as text/plain', async () => {
    mockSessionGet();

    const response = await postCapture(
      'text/plain;charset=UTF-8',
      batch(eventsOverCaptureCap()),
    );

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: 'payload_too_large' });
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  // the batch is over the route's own 1MB cap and nowhere near the api
  // router's 5MB one, so a 413 is only possible if the capture cap is the one
  // being applied
  it('refuses it on the capture cap rather than the api one', async () => {
    mockSessionGet();
    const body = JSON.stringify(batch(eventsOverCaptureCap()));
    expect(Buffer.byteLength(body)).toBeGreaterThan(maxCaptureBodyBytes);
    expect(Buffer.byteLength(body)).toBeLessThan(5 * 1024 * 1024);

    const response = await api
      .post('/api/capture')
      .set('Content-Type', 'text/plain;charset=UTF-8')
      .send(body);

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: 'payload_too_large' });
    // the snippet posts no-cors and never reads this, so the one line the
    // refusal leaves is all anyone has; it must not be an error
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      'POST /api/capture refused: payload_too_large',
    );
  });

  it('still accepts a batch under the cap sent as application/json', async () => {
    mockSessionGet();

    const response = await postCapture('application/json', batch(smallEvents));

    expect(response.status).toBe(204);
    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/project-1/capture/session-1/parts/tab-a-3.ndjson',
      '{"id":"e1","type":"move","t":1,"x":2,"y":3}\n{"id":"e2","type":"click","t":4,"x":5,"y":6}\n',
      'application/x-ndjson',
      'lifecycle=capture',
    );
  });

  it('still accepts a batch under the cap sent as text/plain', async () => {
    mockSessionGet();

    const response = await postCapture(
      'text/plain;charset=UTF-8',
      batch(smallEvents),
    );

    expect(response.status).toBe(204);
    expect(storage.putObject).toHaveBeenCalled();
  });
});

describe('the authenticated api body parser', () => {
  it('parses an ordinary json body', async () => {
    mockUser();
    mockVideoGet();

    const response = await saveTimeline({
      timeline: 'not a timeline',
      timelineVersion: 4,
      version: 3,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_timeline');
  });

  // the timeline ceiling is 4MB, so a body near the 5MB parser limit has to
  // reach the handler rather than be refused on the way in
  it('parses a body near the 5MB limit', async () => {
    mockUser();
    mockVideoGet();
    const timeline = 'x'.repeat(4_500_000);

    const response = await saveTimeline({
      timeline,
      timelineVersion: 4,
      version: 3,
    });

    expect(Buffer.byteLength(timeline)).toBeGreaterThan(4 * 1024 * 1024);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_timeline');
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('refuses a body over the 5MB limit', async () => {
    mockUser();
    mockVideoGet();

    const response = await saveTimeline({
      timeline: 'x'.repeat(6_000_000),
      timelineVersion: 4,
      version: 3,
    });

    // the editor stands its retry clock down on a 413: reported as a 500 it
    // would keep offering the same oversized document back to the server
    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: 'payload_too_large' });
    expect(console.error).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('refuses a malformed json body with a 400', async () => {
    mockUser();
    mockVideoGet();

    const response = await putTimeline('{"timeline": ');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_json' });
    expect(console.error).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('refuses a charset it cannot decode with a 415', async () => {
    mockUser();
    mockVideoGet();

    const response = await api
      .put('/api/projects/project-1/timeline')
      .set('Content-Type', 'application/json; charset=utf-32')
      .set('Authorization', creatorToken)
      .send('{}');

    expect(response.status).toBe(415);
    expect(response.body).toEqual({ error: 'unsupported_media_type' });
    expect(console.error).not.toHaveBeenCalled();
  });
});

// the route loads the project before it reads the body, so an entity that
// throws is the shortest way to put a chosen error in front of the real
// appFactory handler
const throwOnLoad = (error: unknown) => {
  jest.spyOn(videoEntity, 'get').mockReturnValue({
    go: async () => {
      throw error;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const raise = (error: unknown) => {
  mockUser();
  throwOnLoad(error);
  return saveTimeline({
    timeline: { version: 1 },
    timelineVersion: 4,
    version: 3,
  });
};

const errorWith = (fields: Record<string, unknown>) =>
  Object.assign(new Error('raised for the handler'), fields);

describe('the error handler', () => {
  it('answers a genuine server fault with a 500 and logs it', async () => {
    const response = await raise(new Error('dynamo is having a day'));

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'internal' });
    expect(console.error).toHaveBeenCalled();
  });

  it('answers a 4xx status without a type with a 500', async () => {
    const response = await raise(errorWith({ status: 409 }));

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'internal' });
    expect(console.error).toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('answers a type carried on a 5xx status with a 500', async () => {
    const response = await raise(
      errorWith({ status: 503, type: 'entity.parse.failed' }),
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'internal' });
    expect(console.error).toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('answers a 4xx type it has no code for with invalid_request_body', async () => {
    const response = await raise(
      errorWith({ status: 400, type: 'request.size.invalid' }),
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_request_body' });
    expect(console.error).not.toHaveBeenCalled();
  });

  // a type naming an Object.prototype member must not be found by the lookup:
  // reported as-is it answers {} and logs the member's source
  it.each(['constructor', 'toString', 'valueOf', '__proto__'])(
    'answers a type of %s with invalid_request_body',
    async (type) => {
      const response = await raise(errorWith({ status: 400, type }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'invalid_request_body' });
      expect(console.warn).toHaveBeenCalledWith(
        'PUT /api/projects/project-1/timeline refused: invalid_request_body',
      );
    },
  );

  it('still answers an unknown path with the 404 handler', async () => {
    const response = await api.get('/nothing-here');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not Found' });
  });
});
