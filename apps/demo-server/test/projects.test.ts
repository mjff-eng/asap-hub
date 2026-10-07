process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { createEmptyTimeline, Timeline } from '@asap-hub/demo-timeline';
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { folderEntity, userEntity, videoEntity } from '../src/data/entities';
import * as storage from '../src/storage';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  putObject: jest.fn(),
  getObjectText: jest.fn(),
  deleteObject: jest.fn(),
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

const lockExpiresAt = () => Date.now() + 60_000;

const projectItem = (overrides: Record<string, unknown> = {}) => ({
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
  lockExpiresAt: lockExpiresAt(),
  timeline: {
    key: 'projects/project-1/timeline/4.json',
    timelineVersion: 4,
    schemaVersion: 1,
    updatedAt: '2026-08-01T10:00:00.000Z',
  },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  ...overrides,
});

const mockVideoGet = (data: Record<string, unknown> | null) => {
  jest.spyOn(videoEntity, 'get').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const timelineWithClip = (): Timeline => ({
  ...createEmptyTimeline(),
  clips: [
    {
      kind: 'source',
      id: 'clip-1',
      assetId: 'asset-1',
      inMs: 0,
      outMs: 5000,
      volume: 1,
    },
  ],
});

beforeEach(() => {
  jest.restoreAllMocks();
  mockSend.mockReset().mockResolvedValue({});
  (storage.putObject as jest.Mock).mockReset().mockResolvedValue(undefined);
  (storage.getObjectText as jest.Mock).mockReset();
  (storage.deleteObject as jest.Mock).mockReset().mockResolvedValue(undefined);
});

describe('POST /api/projects', () => {
  it('creates an empty studio project and its first timeline revision', async () => {
    mockUser('creator', 'auth0|creator');
    const create = jest
      .spyOn(videoEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    jest.spyOn(videoEntity, 'patch').mockReturnValue({
      set: () => ({
        go: async () => ({
          data: projectItem({ id: 'generated-project-id' }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await api
      .post('/api/projects')
      .set('Authorization', creatorToken)
      .send({ title: 'Sprint 12 demo' });

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'generated-project-id',
        kind: 'studio',
        processingState: 'empty',
        status: 'draft',
        folderId: 'ROOT',
      }),
    );
    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/generated-project-id/timeline/1-generated-project-id.json',
      JSON.stringify(createEmptyTimeline()),
      'application/json',
    );
    expect(response.body.timeline).toEqual(createEmptyTimeline());
    expect(response.body.timelineVersion).toBe(1);
  });

  // a project created into a folder that does not exist is invisible in every
  // listing and outlives the folder cleanup
  it('404s a folder that does not exist, without creating a row', async () => {
    mockUser('creator', 'auth0|creator');
    jest
      .spyOn(folderEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: null }) } as any);
    const create = jest.spyOn(videoEntity, 'create');

    const response = await api
      .post('/api/projects')
      .set('Authorization', creatorToken)
      .send({ title: 'Sprint 12 demo', folderId: 'ghost' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
    expect(create).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .post('/api/projects')
      .set('Authorization', memberToken)
      .send({ title: 'Sprint 12 demo' });

    expect(response.status).toBe(403);
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('rejects a project without a title', async () => {
    mockUser('creator', 'auth0|creator');

    const response = await api
      .post('/api/projects')
      .set('Authorization', creatorToken)
      .send({});

    expect(response.status).toBe(400);
  });
});

describe('GET /api/projects/:id/timeline', () => {
  it('reads the revision the pointer names', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    const timeline = timelineWithClip();
    (storage.getObjectText as jest.Mock).mockResolvedValue(
      JSON.stringify(timeline),
    );

    const response = await api
      .get('/api/projects/project-1/timeline')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(storage.getObjectText).toHaveBeenCalledWith(
      'projects/project-1/timeline/4.json',
    );
    expect(response.body).toEqual({ timeline, timelineVersion: 4 });
  });

  it('hands back an empty timeline when the project has no revision yet', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ timeline: undefined }));

    const response = await api
      .get('/api/projects/project-1/timeline')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      timeline: createEmptyTimeline(),
      timelineVersion: 0,
    });
    expect(storage.getObjectText).not.toHaveBeenCalled();
  });

  it('is not found for a plain upload', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ kind: 'upload' }));

    const response = await api
      .get('/api/projects/project-1/timeline')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(404);
  });

  it('is not found for a missing project', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(null);

    const response = await api
      .get('/api/projects/project-1/timeline')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(404);
  });
});

describe('PUT /api/projects/:id/timeline', () => {
  const save = (body: Record<string, unknown>) =>
    api
      .put('/api/projects/project-1/timeline')
      .set('Authorization', creatorToken)
      .send(body);

  it('writes the next revision and moves the pointer', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    const timeline = timelineWithClip();

    const response = await save({
      timeline,
      timelineVersion: 4,
      version: 3,
    });

    expect(response.status).toBe(200);
    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/project-1/timeline/5-generated-project-id.json',
      JSON.stringify(timeline),
      'application/json',
    );
    expect(response.body.timelineVersion).toBe(5);

    const { ConditionExpression, ExpressionAttributeValues } =
      mockSend.mock.calls[0]![0].input;
    expect(ConditionExpression).toBe(
      'lockedBy = :sub AND lockExpiresAt > :now AND #version = :expectedVersion',
    );
    expect(ExpressionAttributeValues[':expectedVersion']).toBe(3);
    expect(ExpressionAttributeValues[':timeline']).toMatchObject({
      key: 'projects/project-1/timeline/5-generated-project-id.json',
      timelineVersion: 5,
      schemaVersion: 2,
    });
  });

  // the pointer must name the object this write put, never one another tab put
  // under a key both of them derived from the same version
  it('points at the object it wrote, not at the version alone', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    await save({
      timeline: timelineWithClip(),
      timelineVersion: 4,
      version: 3,
    });

    const [writtenKey] = (storage.putObject as jest.Mock).mock.calls[0] as [
      string,
    ];
    const { ExpressionAttributeValues } = mockSend.mock.calls[0]![0].input;
    expect(ExpressionAttributeValues[':timeline'].key).toBe(writtenKey);
    expect(writtenKey).not.toBe('projects/project-1/timeline/5.json');
  });

  // pointers written before the key carried a uuid still have to read back
  it('still reads a pointer stored in the old key format', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(
      projectItem({
        timeline: {
          key: 'projects/project-1/timeline/4.json',
          timelineVersion: 4,
          schemaVersion: 1,
          updatedAt: '2026-08-01T10:00:00.000Z',
        },
      }),
    );
    const timeline = timelineWithClip();
    (storage.getObjectText as jest.Mock).mockResolvedValue(
      JSON.stringify(timeline),
    );

    const response = await api
      .get('/api/projects/project-1/timeline')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(storage.getObjectText).toHaveBeenCalledWith(
      'projects/project-1/timeline/4.json',
    );
    expect(response.body.timeline).toEqual(timeline);
  });

  it('rejects a timeline that fails validation', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    const response = await save({
      timeline: { ...createEmptyTimeline(), canvas: { width: 10 } },
      timelineVersion: 4,
      version: 3,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_timeline');
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('rejects a timeline whose clip references an unknown asset window', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    const timeline = timelineWithClip();
    const [clip] = timeline.clips;

    const response = await save({
      timeline: {
        ...timeline,
        clips: [{ ...clip, inMs: 5000, outMs: 4000 }],
      },
      timelineVersion: 4,
      version: 3,
    });

    expect(response.status).toBe(400);
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('conflicts when another tab already saved a newer revision', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    const response = await save({
      timeline: timelineWithClip(),
      timelineVersion: 2,
      version: 3,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'conflict', timelineVersion: 4 });
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('reports a lost lease when the guarded write is rejected', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
        Item: {
          lockedBy: { S: 'auth0|someone-else' },
          lockedByName: { S: 'Bo' },
          lockExpiresAt: { N: String(lockExpiresAt()) },
        },
      }),
    );

    const response = await save({
      timeline: timelineWithClip(),
      timelineVersion: 4,
      version: 3,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'locked', holderName: 'Bo' });
  });

  // the object is put before the CAS, and the render container bumps the version
  // every few seconds, so losing the race is routine; nothing else ever reclaims
  // the timeline prefix
  it('deletes the revision it wrote when the guarded write is rejected', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
        Item: {
          lockedBy: { S: 'auth0|creator' },
          lockedByName: { S: 'Ana' },
          lockExpiresAt: { N: String(lockExpiresAt()) },
        },
      }),
    );

    const response = await save({
      timeline: timelineWithClip(),
      timelineVersion: 4,
      version: 3,
    });

    expect(response.status).toBe(409);
    const [writtenKey] = (storage.putObject as jest.Mock).mock.calls[0] as [
      string,
    ];
    expect(storage.deleteObject).toHaveBeenCalledWith(writtenKey);
  });

  it('leaves the revision alone when the write lands', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    await save({
      timeline: timelineWithClip(),
      timelineVersion: 4,
      version: 3,
    });

    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('still answers 409 when the orphan cannot be deleted', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (storage.deleteObject as jest.Mock).mockRejectedValue(
      new Error('AccessDenied'),
    );
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
        Item: { lockedBy: { S: 'auth0|creator' } },
      }),
    );

    const response = await save({
      timeline: timelineWithClip(),
      timelineVersion: 4,
      version: 3,
    });

    expect(response.status).toBe(409);
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .put('/api/projects/project-1/timeline')
      .set('Authorization', memberToken)
      .send({
        timeline: createEmptyTimeline(),
        timelineVersion: 4,
        version: 3,
      });

    expect(response.status).toBe(403);
  });
});

describe('POST /api/videos/:id/access for a studio render', () => {
  it('points at the revision the item names', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(
      projectItem({
        status: 'published',
        mediaPath: 'r2',
        processingState: 'ready',
      }),
    );

    const response = await api
      .post('/api/videos/project-1/access')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      streamUrl: '/media/project-1/r2/stream.mp4',
      spriteUrl: '/media/project-1/r2/sprite.jpg',
      thumbnailsVttUrl: '/media/project-1/r2/thumbnails.vtt',
      sectionsBaseUrl: '/media/project-1/r2/sections',
    });
  });

  it('falls back to the flat path for an upload that has no revision', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ kind: 'upload', mediaPath: undefined }));

    const response = await api
      .post('/api/videos/project-1/access')
      .set('Authorization', creatorToken);

    expect(response.body.streamUrl).toBe('/media/project-1/stream.mp4');
  });
});
