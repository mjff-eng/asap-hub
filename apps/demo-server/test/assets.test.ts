process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import { createEmptyTimeline, Timeline } from '@asap-hub/demo-timeline';
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { assetEntity, userEntity, videoEntity } from '../src/data/entities';
import * as storage from '../src/storage';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  getObjectText: jest.fn(),
  createMultipartUpload: jest.fn(),
  signUploadParts: jest.fn(),
  completeMultipartUpload: jest.fn(),
  abortMultipartUploadsUnder: jest.fn(),
  deletePrefix: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'generated-asset-id' }));

// the complete handler queues the ingest job; the runner is stubbed so no
// container is ever started from a test
const mockRun = jest.fn().mockResolvedValue({ jobId: 'job-1' });
jest.mock('../src/jobs/runner', () => ({
  getJobRunner: () => ({ run: mockRun, stop: jest.fn() }),
}));

jest.mock('../src/data/client', () => ({
  getDocumentClient: () => ({ send: jest.fn() }),
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
  kind: 'studio',
  processingState: 'empty',
  version: 3,
  createdBy: { sub: 'auth0|creator', name: 'Ana' },
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

const assetItem = (overrides: Record<string, unknown> = {}) => ({
  videoId: 'project-1',
  assetId: 'asset-1',
  kind: 'video',
  state: 'uploading',
  key: 'projects/project-1/assets/asset-1/original.webm',
  mimeType: 'video/webm',
  label: 'Screen recording',
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

const mockAssetGet = (data: Record<string, unknown> | null) => {
  jest.spyOn(assetEntity, 'get').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const mockAssetCreate = () =>
  jest
    .spyOn(assetEntity, 'create')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValue({ go: async () => ({ data: {} }) } as any);

const mockAssetPatch = (data: Record<string, unknown>) => {
  const set = jest.fn().mockReturnValue({ go: async () => ({ data }) });
  jest.spyOn(assetEntity, 'patch').mockReturnValue({
    set,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return set;
};

const mockAssetDelete = () =>
  jest
    .spyOn(assetEntity, 'delete')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValue({ go: async () => ({ data: {} }) } as any);

const mockAssetQuery = (data: Record<string, unknown>[]) => {
  jest.spyOn(assetEntity.query, 'byVideo').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const mockTimeline = (timeline: Timeline) => {
  (storage.getObjectText as jest.Mock).mockResolvedValue(
    JSON.stringify(timeline),
  );
};

const timelineUsing = (assetId: string, where: 'clip' | 'narration') =>
  where === 'clip'
    ? {
        ...createEmptyTimeline(),
        clips: [
          {
            kind: 'source' as const,
            id: 'clip-1',
            assetId,
            inMs: 0,
            outMs: 5000,
            volume: 1,
          },
        ],
      }
    : {
        ...createEmptyTimeline(),
        narration: [
          {
            id: 'take-1',
            assetId,
            startMs: 0,
            inMs: 0,
            outMs: 3000,
            volume: 1,
          },
        ],
      };

beforeEach(() => {
  jest.restoreAllMocks();
  (storage.getObjectText as jest.Mock).mockReset();
  (storage.createMultipartUpload as jest.Mock)
    .mockReset()
    .mockResolvedValue({ uploadId: 'upload-1', key: 'ignored' });
  (storage.signUploadParts as jest.Mock)
    .mockReset()
    .mockResolvedValue([{ partNumber: 1, url: 'https://s3/part-1' }]);
  (storage.completeMultipartUpload as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
  (storage.abortMultipartUploadsUnder as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
  (storage.deletePrefix as jest.Mock).mockReset().mockResolvedValue(undefined);
});

describe('POST /api/projects/:id/assets', () => {
  const body = {
    kind: 'video',
    mimeType: 'video/webm',
    label: 'Screen recording',
    extension: 'webm',
  };

  it('refuses to start an upload while someone else is editing', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(
      projectItem({ lockedBy: 'auth0|someone-else', lockedByName: 'Bo' }),
    );
    const create = mockAssetCreate();

    const response = await api
      .post('/api/projects/project-1/assets')
      .set('Authorization', creatorToken)
      .send(body);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ error: 'locked' });
    expect(create).not.toHaveBeenCalled();
  });

  it('creates the row and opens a multipart upload on the asset key', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    const create = mockAssetCreate();

    const response = await api
      .post('/api/projects/project-1/assets')
      .set('Authorization', creatorToken)
      .send(body);

    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: 'project-1',
        assetId: 'generated-asset-id',
        kind: 'video',
        state: 'uploading',
        key: 'projects/project-1/assets/generated-asset-id/original.webm',
        mimeType: 'video/webm',
        label: 'Screen recording',
      }),
    );
    expect(storage.createMultipartUpload).toHaveBeenCalledWith(
      'projects/project-1/assets/generated-asset-id/original.webm',
      'video/webm',
    );
    expect(response.body).toEqual({
      assetId: 'generated-asset-id',
      uploadId: 'upload-1',
      key: 'projects/project-1/assets/generated-asset-id/original.webm',
      partSize: storage.partSize,
    });
  });

  it('is not found for a plain upload', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ kind: 'upload' }));
    const create = mockAssetCreate();

    const response = await api
      .post('/api/projects/project-1/assets')
      .set('Authorization', creatorToken)
      .send(body);

    expect(response.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
    expect(storage.createMultipartUpload).not.toHaveBeenCalled();
  });

  it('rejects an extension outside the safe alphabet', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    const response = await api
      .post('/api/projects/project-1/assets')
      .set('Authorization', creatorToken)
      .send({ ...body, extension: '../../etc' });

    expect(response.status).toBe(400);
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .post('/api/projects/project-1/assets')
      .set('Authorization', memberToken)
      .send(body);

    expect(response.status).toBe(403);
    expect(storage.createMultipartUpload).not.toHaveBeenCalled();
  });
});

describe('POST /api/projects/:id/assets/:assetId/parts', () => {
  const sign = () =>
    api
      .post('/api/projects/project-1/assets/asset-1/parts')
      .set('Authorization', creatorToken)
      .send({ uploadId: 'upload-1', partNumbers: [1] });

  it('signs the parts against the stored key', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockAssetGet(assetItem());

    const response = await sign();

    expect(response.status).toBe(200);
    expect(storage.signUploadParts).toHaveBeenCalledWith(
      'projects/project-1/assets/asset-1/original.webm',
      'upload-1',
      [1],
    );
    expect(response.body).toEqual({
      urls: [{ partNumber: 1, url: 'https://s3/part-1' }],
    });
  });

  it('is not found once the asset has left the uploading state', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockAssetGet(assetItem({ state: 'ready' }));

    const response = await sign();

    expect(response.status).toBe(404);
    expect(storage.signUploadParts).not.toHaveBeenCalled();
  });

  it('is not found when the asset row is missing', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockAssetGet(null);

    const response = await sign();

    expect(response.status).toBe(404);
    expect(storage.signUploadParts).not.toHaveBeenCalled();
  });
});

describe('POST /api/projects/:id/assets/:assetId/complete', () => {
  const complete = () =>
    api
      .post('/api/projects/project-1/assets/asset-1/complete')
      .set('Authorization', creatorToken)
      .send({
        uploadId: 'upload-1',
        parts: [{ partNumber: 1, eTag: 'etag-1' }],
      });

  it('completes the upload and moves the asset to preparing', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockAssetGet(assetItem());
    const set = mockAssetPatch(assetItem({ state: 'preparing' }));

    const response = await complete();

    expect(response.status).toBe(200);
    expect(storage.completeMultipartUpload).toHaveBeenCalledWith(
      'projects/project-1/assets/asset-1/original.webm',
      'upload-1',
      [{ partNumber: 1, eTag: 'etag-1' }],
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'preparing' }),
    );
    expect(response.body.asset).toEqual(
      expect.objectContaining({
        assetId: 'asset-1',
        state: 'preparing',
        kind: 'video',
        mimeType: 'video/webm',
        label: 'Screen recording',
      }),
    );
    expect(response.body.asset.key).toBeUndefined();
  });

  it('is not found once the asset has left the uploading state', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockAssetGet(assetItem({ state: 'preparing' }));

    const response = await complete();

    expect(response.status).toBe(404);
    expect(storage.completeMultipartUpload).not.toHaveBeenCalled();
  });
});

describe('GET /api/projects/:id/assets', () => {
  it('lists the assets of the project', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockAssetQuery([
      assetItem(),
      assetItem({
        assetId: 'asset-2',
        state: 'ready',
        durationMs: 12000,
        width: 1920,
        height: 1080,
        bytes: 4096,
        proxyKey: 'projects/project-1/assets/asset-2/proxy.mp4',
      }),
    ]);

    const response = await api
      .get('/api/projects/project-1/assets')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body.assets).toEqual([
      {
        assetId: 'asset-1',
        kind: 'video',
        state: 'uploading',
        mimeType: 'video/webm',
        label: 'Screen recording',
        url: '/projects/project-1/assets/asset-1/original.webm',
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        assetId: 'asset-2',
        kind: 'video',
        state: 'ready',
        mimeType: 'video/webm',
        label: 'Screen recording',
        // once the ingest has written a proxy the editor plays that instead
        url: '/projects/project-1/assets/asset-2/proxy.mp4',
        bytes: 4096,
        durationMs: 12000,
        width: 1920,
        height: 1080,
        proxyKey: 'projects/project-1/assets/asset-2/proxy.mp4',
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
    ]);
  });

  it('is not found for a missing project', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(null);

    const response = await api
      .get('/api/projects/project-1/assets')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/projects/:id/assets/:assetId', () => {
  const rename = (body: Record<string, unknown>) =>
    api
      .patch('/api/projects/project-1/assets/asset-1')
      .set('Authorization', creatorToken)
      .send(body);

  it('renames the asset and hands the new row back', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    const set = mockAssetPatch(assetItem({ label: 'The attendance flow' }));

    const response = await rename({ label: 'The attendance flow' });

    expect(response.status).toBe(200);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'The attendance flow' }),
    );
    expect(response.body.asset).toMatchObject({
      assetId: 'asset-1',
      label: 'The attendance flow',
    });
  });

  it('refuses a name that is empty or nothing but spaces', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    expect((await rename({ label: '' })).status).toBe(400);
    expect((await rename({ label: '   ' })).status).toBe(400);
  });

  it('leaves the sources alone while someone else is editing', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(
      projectItem({ lockedBy: 'auth0|someone-else', lockedByName: 'Bo' }),
    );
    const set = mockAssetPatch(assetItem());

    const response = await rename({ label: 'The attendance flow' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ error: 'locked' });
    expect(set).not.toHaveBeenCalled();
  });

  it('refuses once the lease has run out', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ lockExpiresAt: Date.now() - 1000 }));

    expect((await rename({ label: 'Attendance' })).status).toBe(409);
  });

  it('trims the name it stores', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    const set = mockAssetPatch(assetItem({ label: 'Attendance' }));

    await rename({ label: '  Attendance  ' });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Attendance' }),
    );
  });

  it('refuses a name longer than the column holds', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    expect((await rename({ label: 'x'.repeat(301) })).status).toBe(400);
  });

  it('is not for a member', async () => {
    mockUser('member', 'auth0|member');

    expect(
      (
        await api
          .patch('/api/projects/project-1/assets/asset-1')
          .set('Authorization', memberToken)
          .send({ label: 'Nope' })
      ).status,
    ).toBe(403);
  });

  it('answers 404 for a project that is not a studio one', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ kind: 'upload' }));

    expect((await rename({ label: 'Nope' })).status).toBe(404);
  });
});

describe('DELETE /api/projects/:id/assets/:assetId', () => {
  const remove = () =>
    api
      .delete('/api/projects/project-1/assets/asset-1')
      .set('Authorization', creatorToken);

  // the reference check can only speak for the lease holder: another editor's
  // placement of this source may still be inside their autosave debounce, and
  // deleting the objects is not something their save can undo
  it('refuses to remove a source while someone else is editing', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(
      projectItem({ lockedBy: 'auth0|someone-else', lockedByName: 'Bo' }),
    );
    mockTimeline(timelineUsing('asset-9', 'clip'));
    const deleteRow = mockAssetDelete();

    const response = await remove();

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ error: 'locked' });
    expect(deleteRow).not.toHaveBeenCalled();
  });

  it('clears the asset prefix and the row', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockTimeline(timelineUsing('asset-9', 'clip'));
    const deleteRow = mockAssetDelete();

    const response = await remove();

    expect(response.status).toBe(204);
    expect(storage.abortMultipartUploadsUnder).toHaveBeenCalledWith(
      'projects/project-1/assets/asset-1/',
    );
    expect(storage.deletePrefix).toHaveBeenCalledWith(
      'projects/project-1/assets/asset-1/',
    );
    expect(deleteRow).toHaveBeenCalledWith({
      videoId: 'project-1',
      assetId: 'asset-1',
    });
  });

  it('deletes when the project has no timeline revision yet', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ timeline: undefined }));
    const deleteRow = mockAssetDelete();

    const response = await remove();

    expect(response.status).toBe(204);
    expect(storage.getObjectText).not.toHaveBeenCalled();
    expect(deleteRow).toHaveBeenCalled();
  });

  it('refuses when a clip still references the asset', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockTimeline(timelineUsing('asset-1', 'clip'));
    const deleteRow = mockAssetDelete();

    const response = await remove();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'asset_in_use' });
    expect(storage.deletePrefix).not.toHaveBeenCalled();
    expect(deleteRow).not.toHaveBeenCalled();
  });

  it('refuses when a narration take still references the asset', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockTimeline(timelineUsing('asset-1', 'narration'));
    const deleteRow = mockAssetDelete();

    const response = await remove();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'asset_in_use' });
    expect(deleteRow).not.toHaveBeenCalled();
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .delete('/api/projects/project-1/assets/asset-1')
      .set('Authorization', memberToken);

    expect(response.status).toBe(403);
    expect(storage.deletePrefix).not.toHaveBeenCalled();
  });
});
