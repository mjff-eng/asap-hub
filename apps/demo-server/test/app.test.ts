process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import supertest from 'supertest';
import { appFactory } from '../src/app';
import {
  folderEntity,
  inviteEntity,
  userEntity,
  videoEntity,
} from '../src/data/entities';
import * as storage from '../src/storage';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  putObject: jest.fn(),
  completeMultipartUpload: jest.fn(),
  createMultipartUpload: jest.fn(),
  signUploadParts: jest.fn(),
  abortMultipartUpload: jest.fn(),
  deletePrefix: jest.fn(),
  getObject: jest.fn(),
}));
jest.mock('../src/email', () => ({ sendInviteEmail: jest.fn() }));

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

const app = appFactory();
const api = supertest(app);

const mockUser = (
  role: 'creator' | 'member' | 'admin',
  sub: string,
  name: string,
  status?: 'active' | 'revoked',
) => {
  jest
    .spyOn(userEntity, 'get')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValue({
      go: async () => ({
        data: {
          sub,
          name,
          email: `${name.toLowerCase()}@example.com`,
          role,
          ...(status ? { status } : {}),
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
};

const adminToken = bearer({
  sub: 'auth0|admin',
  email: 'dana@example.com',
  email_verified: true,
  name: 'Dana',
});

const videoItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'video-1',
  title: 'Sprint 12 demo',
  status: 'draft',
  folderId: 'ROOT',
  recordedAt: '2026-08-01T10:00:00.000Z',
  durationMs: 0,
  chapters: [],
  s3Prefix: 'video-1',
  createdBy: { sub: 'auth0|creator', name: 'Ana' },
  version: 1,
  processingState: 'ready',
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

const mockFolderGet = (data: Record<string, unknown> | null) =>
  jest.spyOn(folderEntity, 'get').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

beforeEach(() => {
  jest.restoreAllMocks();
  mockSend.mockReset();
});

describe('authentication', () => {
  it('rejects a request without a token', async () => {
    const response = await api.get('/api/me');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'unauthenticated' });
  });

  it('returns the profile for a known user', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    const response = await api
      .get('/api/me')
      .set('Authorization', creatorToken);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      sub: 'auth0|creator',
      role: 'creator',
    });
  });
});

describe('invite-first access', () => {
  it('refuses an authenticated user with no invite', async () => {
    jest
      .spyOn(userEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: null }) } as any);
    jest
      .spyOn(inviteEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: null }) } as any);

    const response = await api.get('/api/me').set('Authorization', memberToken);
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'not_invited' });
  });

  it('refuses an unverified email even with an invite', async () => {
    jest
      .spyOn(userEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: null }) } as any);
    const inviteGet = jest
      .spyOn(inviteEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({
        go: async () => ({ data: { role: 'member' } }),
      } as any);

    const response = await api.get('/api/me').set(
      'Authorization',
      bearer({
        sub: 'auth0|unverified',
        email: 'carl@example.com',
        email_verified: false,
        name: 'Carl',
      }),
    );

    expect(response.status).toBe(403);
    expect(inviteGet).not.toHaveBeenCalled();
  });

  it('claims the invite and creates the user on the first request', async () => {
    jest
      .spyOn(userEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: null }) } as any);
    jest.spyOn(inviteEntity, 'get').mockReturnValue({
      go: async () => ({
        data: { email: 'bob@example.com', role: 'member' },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const create = jest
      .spyOn(userEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    const set = jest.fn().mockReturnValue({ go: async () => ({ data: {} }) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(inviteEntity, 'patch').mockReturnValue({ set } as any);

    const response = await api.get('/api/me').set('Authorization', memberToken);

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('member');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'auth0|member', role: 'member' }),
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        claimedBy: { sub: 'auth0|member', name: 'Bob' },
      }),
    );
  });
});

describe('GET /api/videos/:id', () => {
  it('hides a draft from a member behind a 404', async () => {
    mockUser('member', 'auth0|member', 'Bob');
    mockVideoGet(videoItem({ status: 'draft' }));

    const response = await api
      .get('/api/videos/video-1')
      .set('Authorization', memberToken);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
  });

  it('shows a draft to a creator', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(videoItem({ status: 'draft' }));

    const response = await api
      .get('/api/videos/video-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('draft');
  });
});

describe('leases', () => {
  it('acquires a lease and returns the holder', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockSend.mockResolvedValue({});

    const response = await api
      .post('/api/videos/video-1/lease')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body.lockedBy).toBe('auth0|creator');
    const params = mockSend.mock.calls[0][0].input;
    expect(params.ConditionExpression).toBe(
      'attribute_exists(PK) AND (attribute_not_exists(lockedBy) OR lockedBy = :sub OR lockExpiresAt < :now)',
    );
    expect(params.ReturnValuesOnConditionCheckFailure).toBe('ALL_OLD');
  });

  // UpdateItem upserts, and every lease clause holds of an item that is not
  // there, so without attribute_exists any id at all would mint a VIDEO# row
  it('is not found, and creates nothing, for an id that has no row', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
      }),
    );

    const response = await api
      .post('/api/videos/video-1/lease')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
  });

  it('returns 409 with the holder name when someone else holds the lease', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'conditional check failed',
        $metadata: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Item: { lockedByName: 'Diana' } as any,
      }),
    );

    const response = await api
      .post('/api/videos/video-1/lease')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'locked', holderName: 'Diana' });
  });
});

describe('PATCH /api/videos/:id', () => {
  it('refuses when the caller does not hold the lease', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(videoItem({ lockedBy: 'auth0|other', lockedByName: 'Diana' }));

    const response = await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({ title: 'New title', version: 1 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'locked', holderName: 'Diana' });
  });

  it('returns 409 conflict when the version does not match', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(
      videoItem({
        lockedBy: 'auth0|creator',
        lockedByName: 'Ana',
        lockExpiresAt: Date.now() + 60000,
      }),
    );
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'conditional check failed',
        $metadata: {},
        Item: {
          lockedBy: { S: 'auth0|creator' },
          lockedByName: { S: 'Ana' },
          lockExpiresAt: { N: String(Date.now() + 60000) },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }),
    );

    const response = await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({ title: 'New title', version: 3 });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('conflict');
  });

  it('rewrites the GSI1 keys when the folder moves', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(
      videoItem({
        lockedBy: 'auth0|creator',
        lockedByName: 'Ana',
        lockExpiresAt: Date.now() + 60000,
      }),
    );
    mockFolderGet({ id: 'folder-9', name: 'Nine' });
    mockSend.mockResolvedValue({});

    await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({ folderId: 'folder-9', version: 1 });

    const values = mockSend.mock.calls[0][0].input.ExpressionAttributeValues;
    expect(values[':GSI1PK']).toBe('FOLDER#folder-9');
    expect(values[':GSI1SK']).toBe('DRAFT#2026-08-01T10:00:00.000Z#video-1');
  });

  // a video moved into a folder that does not exist shows up in no listing and
  // survives every cleanup path, so the destination is checked before the write
  it('404s a destination folder that does not exist, without writing', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(
      videoItem({
        lockedBy: 'auth0|creator',
        lockedByName: 'Ana',
        lockExpiresAt: Date.now() + 60000,
      }),
    );
    mockFolderGet(null);
    mockSend.mockResolvedValue({});

    const response = await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({ folderId: 'ghost', version: 1 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does not look the folder up when the video already sits in it', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(
      videoItem({
        lockedBy: 'auth0|creator',
        lockedByName: 'Ana',
        lockExpiresAt: Date.now() + 60000,
      }),
    );
    const folderGet = mockFolderGet(null);
    mockSend.mockResolvedValue({});

    const response = await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({ folderId: 'ROOT', version: 1 });

    expect(response.status).toBe(200);
    expect(folderGet).not.toHaveBeenCalled();
  });

  it('rejects an invalid body', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');

    const response = await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({ title: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
  });

  // a chapter runs to the next one's start, so two on the same millisecond leave
  // the first with nothing to play and no file to download
  it('rejects two chapters starting at the same millisecond', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');

    const response = await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({
        version: 1,
        chapters: [
          { startMs: 0, title: 'Intro' },
          { startMs: 60000, title: 'Second' },
          { startMs: 60000, title: 'Twin' },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rejects chapters that are out of order', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');

    const response = await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({
        version: 1,
        chapters: [
          { startMs: 60000, title: 'Second' },
          { startMs: 0, title: 'Intro' },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
  });

  // the sections were cut at the chapter starts, so a start moving leaves none
  // of the files describing a chapter
  describe('the sections a render cut', () => {
    const cut = [
      { startMs: 0, title: 'Intro' },
      { startMs: 60000, title: 'Second' },
    ];

    const sectioned = () => {
      mockUser('creator', 'auth0|creator', 'Ana');
      mockVideoGet(
        videoItem({
          lockedBy: 'auth0|creator',
          lockedByName: 'Ana',
          lockExpiresAt: Date.now() + 60000,
          chapters: cut,
          sectionCount: 2,
        }),
      );
      mockSend.mockResolvedValue({});
    };

    const writtenValues = () =>
      mockSend.mock.calls[0][0].input.ExpressionAttributeValues;

    it('are forgotten when a chapter is added', async () => {
      sectioned();

      const response = await api
        .patch('/api/videos/video-1')
        .set('Authorization', creatorToken)
        .send({
          version: 1,
          chapters: [...cut, { startMs: 120000, title: 'Third' }],
        });

      expect(response.status).toBe(200);
      expect(writtenValues()[':sectionCount']).toBe(0);
    });

    it('are forgotten when a start moves', async () => {
      sectioned();

      await api
        .patch('/api/videos/video-1')
        .set('Authorization', creatorToken)
        .send({
          version: 1,
          chapters: [
            { startMs: 0, title: 'Intro' },
            { startMs: 90000, title: 'Second' },
          ],
        });

      expect(writtenValues()[':sectionCount']).toBe(0);
    });

    it('are forgotten when a chapter is removed', async () => {
      sectioned();

      await api
        .patch('/api/videos/video-1')
        .set('Authorization', creatorToken)
        .send({ version: 1, chapters: [{ startMs: 0, title: 'Intro' }] });

      expect(writtenValues()[':sectionCount']).toBe(0);
    });

    // the editor sends the whole list on every save, so a rename arrives as the
    // same starts under a new name and must not throw the files away
    it('survive a chapter being renamed', async () => {
      sectioned();

      await api
        .patch('/api/videos/video-1')
        .set('Authorization', creatorToken)
        .send({
          version: 1,
          chapters: [
            { startMs: 0, title: 'Intro' },
            { startMs: 60000, title: 'Renamed' },
          ],
        });

      expect(writtenValues()).not.toHaveProperty(':sectionCount');
    });

    it('survive the demo being renamed with its chapters attached', async () => {
      sectioned();

      await api
        .patch('/api/videos/video-1')
        .set('Authorization', creatorToken)
        .send({ version: 1, title: 'Renamed', chapters: cut });

      expect(writtenValues()).not.toHaveProperty(':sectionCount');
    });

    it('survive a save that carries no chapters at all', async () => {
      sectioned();

      await api
        .patch('/api/videos/video-1')
        .set('Authorization', creatorToken)
        .send({ version: 1, title: 'Renamed' });

      expect(writtenValues()).not.toHaveProperty(':sectionCount');
    });
  });
});

const heldLease = (overrides: Record<string, unknown> = {}) =>
  videoItem({
    lockedBy: 'auth0|creator',
    lockedByName: 'Ana',
    lockExpiresAt: Date.now() + 60000,
    ...overrides,
  });

describe('POST /api/videos/:id/publish', () => {
  it('flips the status and rewrites GSI1SK', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(heldLease({ chapters: [{ startMs: 0, title: 'Intro' }] }));
    mockSend.mockResolvedValue({});

    const response = await api
      .post('/api/videos/video-1/publish')
      .set('Authorization', creatorToken)
      .send({ version: 1 });

    expect(response.status).toBe(200);
    const values = mockSend.mock.calls[0][0].input.ExpressionAttributeValues;
    expect(values[':status']).toBe('published');
    expect(values[':GSI1SK']).toBe(
      'PUBLISHED#2026-08-01T10:00:00.000Z#video-1',
    );
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('refuses to publish without holding the lease', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(videoItem());
    mockSend.mockResolvedValue({});

    const response = await api
      .post('/api/videos/video-1/publish')
      .set('Authorization', creatorToken)
      .send({ version: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('locked');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('refuses to publish on an expired lease', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(heldLease({ lockExpiresAt: Date.now() - 1000 }));
    mockSend.mockResolvedValue({});

    const response = await api
      .post('/api/videos/video-1/publish')
      .set('Authorization', creatorToken)
      .send({ version: 1 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'locked', holderName: 'Ana' });
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/videos/:id', () => {
  it('refuses to delete a demo someone else is editing', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(
      videoItem({
        lockedBy: 'auth0|other',
        lockedByName: 'Diana',
        lockExpiresAt: Date.now() + 60000,
      }),
    );

    const response = await api
      .delete('/api/videos/video-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'locked', holderName: 'Diana' });
    expect(storage.deletePrefix).not.toHaveBeenCalled();
  });

  it('refuses to delete when the caller has not taken the lease', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(
      videoItem({
        lockedBy: 'auth0|other',
        lockedByName: 'Diana',
        lockExpiresAt: Date.now() - 1000,
      }),
    );
    mockSend.mockResolvedValue({});

    const response = await api
      .delete('/api/videos/video-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(409);
  });

  // the only lifecycle rule on media/ transitions to GLACIER_IR, so anything a
  // running container writes after the prefix is emptied is billed for ever
  it('refuses while a render is still writing into the media prefix', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(
      heldLease({
        render: {
          renderId: 'render-1',
          state: 'rendering',
          timelineVersion: 4,
          requestedAt: new Date().toISOString(),
        },
      }),
    );

    const response = await api
      .delete('/api/videos/video-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'render_active' });
    expect(storage.deletePrefix).not.toHaveBeenCalled();
  });
});

describe('POST /api/videos/:id/unpublish', () => {
  it('refuses to unpublish without holding the lease', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(videoItem({ status: 'published' }));
    mockSend.mockResolvedValue({});

    const response = await api
      .post('/api/videos/video-1/unpublish')
      .set('Authorization', creatorToken)
      .send({ version: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('locked');
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('lease conditions on writes', () => {
  it('makes the lease expiry part of the write condition', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(heldLease());
    mockSend.mockResolvedValue({});

    await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({ title: 'New title', version: 1 });

    const { input } = mockSend.mock.calls[0][0];
    expect(input.ConditionExpression).toContain('lockExpiresAt > :now');
    expect(typeof input.ExpressionAttributeValues[':now']).toBe('number');
  });

  it('reports a takeover as locked, not as a version conflict', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(heldLease());
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'conditional check failed',
        $metadata: {},
        Item: {
          lockedBy: { S: 'auth0|other' },
          lockedByName: { S: 'Diana' },
          lockExpiresAt: { N: String(Date.now() + 60000) },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }),
    );

    const response = await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({ title: 'New title', version: 1 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'locked', holderName: 'Diana' });
  });

  it('still reports a plain version clash as a conflict', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(heldLease());
    mockSend.mockRejectedValue(
      new ConditionalCheckFailedException({
        message: 'conditional check failed',
        $metadata: {},
        Item: {
          lockedBy: { S: 'auth0|creator' },
          lockedByName: { S: 'Ana' },
          lockExpiresAt: { N: String(Date.now() + 60000) },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }),
    );

    const response = await api
      .patch('/api/videos/video-1')
      .set('Authorization', creatorToken)
      .send({ title: 'New title', version: 1 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'conflict', holderName: 'Ana' });
  });
});

describe('uploads', () => {
  it('marks the video as processing once the upload completes', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    mockVideoGet(videoItem({ processingState: 'uploading' }));
    const set = jest
      .fn()
      .mockReturnValue({ go: async () => ({ data: videoItem() }) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(videoEntity, 'patch').mockReturnValue({ set } as any);

    const response = await api
      .post('/api/uploads/video-1/complete')
      .set('Authorization', creatorToken)
      .send({ uploadId: 'upload-1', parts: [{ partNumber: 1, eTag: 'abc' }] });

    expect(response.status).toBe(200);
    expect(storage.completeMultipartUpload).toHaveBeenCalledWith(
      'raw/video-1/original.mp4',
      'upload-1',
      [{ partNumber: 1, eTag: 'abc' }],
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ processingState: 'processing' }),
    );
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member', 'Bob');

    const response = await api
      .post('/api/uploads')
      .set('Authorization', memberToken)
      .send({ title: 'A demo' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'forbidden' });
  });
});

describe('folders', () => {
  it('prepends the synthetic ROOT folder', async () => {
    mockUser('member', 'auth0|member', 'Bob');
    jest.spyOn(inviteEntity, 'get').mockReturnValue({
      go: async () => ({ data: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { folderEntity } = await import('../src/data/entities');
    jest.spyOn(folderEntity.query, 'all').mockReturnValue({
      go: async () => ({ data: [{ id: 'folder-1', name: 'Sprint 12' }] }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await api
      .get('/api/folders')
      .set('Authorization', memberToken);

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toEqual({ id: 'ROOT', name: 'Unfiled' });
    expect(response.body.items[1]).toEqual({
      id: 'folder-1',
      name: 'Sprint 12',
    });
  });
});

describe('revoked users', () => {
  it('refuses every endpoint with 403 revoked', async () => {
    mockUser('creator', 'auth0|creator', 'Ana', 'revoked');

    const me = await api.get('/api/me').set('Authorization', creatorToken);
    expect(me.status).toBe(403);
    expect(me.body).toEqual({ error: 'revoked' });

    const folders = await api
      .get('/api/folders')
      .set('Authorization', creatorToken);
    expect(folders.status).toBe(403);
    expect(folders.body).toEqual({ error: 'revoked' });
  });

  it('treats a row without a status as active', async () => {
    mockUser('member', 'auth0|member', 'Bob');
    const response = await api.get('/api/me').set('Authorization', memberToken);
    expect(response.status).toBe(200);
  });
});

describe('admin invites', () => {
  it('refuses a creator inviting an admin', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    const response = await api
      .post('/api/invites')
      .set('Authorization', creatorToken)
      .send({ email: 'new@example.com', role: 'admin' });
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'forbidden' });
  });

  it('lets an admin invite an admin', async () => {
    mockUser('admin', 'auth0|admin', 'Dana');
    jest.spyOn(inviteEntity, 'get').mockReturnValue({
      go: async () => ({ data: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const upsert = jest
      .spyOn(inviteEntity, 'upsert')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .post('/api/invites')
      .set('Authorization', adminToken)
      .send({ email: 'New@example.com', role: 'admin' });

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.com', role: 'admin' }),
    );
  });
});

describe('user management', () => {
  it('refuses a creator', async () => {
    mockUser('creator', 'auth0|creator', 'Ana');
    const response = await api
      .get('/api/users')
      .set('Authorization', creatorToken);
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'forbidden' });
  });

  it('lists the users partition for an admin', async () => {
    mockUser('admin', 'auth0|admin', 'Dana');
    jest.spyOn(userEntity.query, 'all').mockReturnValue({
      go: async () => ({
        data: [
          {
            sub: 'auth0|member',
            name: 'Bob',
            email: 'bob@example.com',
            role: 'member',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await api
      .get('/api/users')
      .set('Authorization', adminToken);

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toEqual({
      sub: 'auth0|member',
      name: 'Bob',
      email: 'bob@example.com',
      role: 'member',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('refuses a self role change with self_target', async () => {
    mockUser('admin', 'auth0|admin', 'Dana');
    const response = await api
      .patch('/api/users/auth0%7Cadmin')
      .set('Authorization', adminToken)
      .send({ role: 'member' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'self_target' });
  });

  it('refuses a self delete with self_target', async () => {
    mockUser('admin', 'auth0|admin', 'Dana');
    const response = await api
      .delete('/api/users/auth0%7Cadmin')
      .set('Authorization', adminToken);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'self_target' });
  });

  it('rejects a patch with neither role nor status', async () => {
    mockUser('admin', 'auth0|admin', 'Dana');
    const response = await api
      .patch('/api/users/auth0%7Cmember')
      .set('Authorization', adminToken)
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
  });

  it('returns 404 for an unknown user', async () => {
    jest
      .spyOn(userEntity, 'get')
      .mockReturnValueOnce({
        go: async () => ({
          data: {
            sub: 'auth0|admin',
            name: 'Dana',
            email: 'dana@example.com',
            role: 'admin',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValueOnce({ go: async () => ({ data: null }) } as any);

    const response = await api
      .patch('/api/users/auth0%7Cghost')
      .set('Authorization', adminToken)
      .send({ status: 'revoked' });

    expect(response.status).toBe(404);
  });

  it('deletes the user and their invite', async () => {
    jest
      .spyOn(userEntity, 'get')
      .mockReturnValueOnce({
        go: async () => ({
          data: {
            sub: 'auth0|admin',
            name: 'Dana',
            email: 'dana@example.com',
            role: 'admin',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .mockReturnValueOnce({
        go: async () => ({
          data: { sub: 'auth0|member', email: 'bob@example.com' },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    const deleteUser = jest
      .spyOn(userEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    const deleteInvite = jest
      .spyOn(inviteEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .delete('/api/users/auth0%7Cmember')
      .set('Authorization', adminToken);

    expect(response.status).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith({ sub: 'auth0|member' });
    expect(deleteInvite).toHaveBeenCalledWith({ email: 'bob@example.com' });
  });
});
