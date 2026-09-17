process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { isLocal } from '../src/config';
import { folderEntity, userEntity, videoEntity } from '../src/data/entities';
import { startLocalEncode } from '../src/local-encoder';
import { partSize } from '../src/storage';
import * as storage from '../src/storage';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  createMultipartUpload: jest.fn(),
  signUploadParts: jest.fn(),
  completeMultipartUpload: jest.fn(),
  abortMultipartUpload: jest.fn(),
  abortMultipartUploadsUnder: jest.fn(),
  putObject: jest.fn(),
  deletePrefix: jest.fn(),
  getObject: jest.fn(),
}));

jest.mock('../src/local-encoder', () => ({ startLocalEncode: jest.fn() }));

jest.mock('../src/config', () => ({
  ...jest.requireActual('../src/config'),
  isLocal: jest.fn(() => true),
}));

jest.mock('uuid', () => ({ v4: () => 'generated-video-id' }));

const mockSend = jest.fn();
jest.mock('../src/data/client', () => ({
  getDocumentClient: () => ({
    send: (...args: unknown[]) => mockSend(...args),
  }),
  setDocumentClient: jest.fn(),
}));

const mockIsLocal = isLocal as jest.MockedFunction<typeof isLocal>;
const mockStartLocalEncode = startLocalEncode as jest.MockedFunction<
  typeof startLocalEncode
>;

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
  mockStartLocalEncode.mockReset();
  mockIsLocal.mockReturnValue(true);
  (storage.createMultipartUpload as jest.Mock).mockReset();
  (storage.signUploadParts as jest.Mock).mockReset();
  (storage.completeMultipartUpload as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
  (storage.abortMultipartUpload as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
  (storage.abortMultipartUploadsUnder as jest.Mock)
    .mockReset()
    .mockResolvedValue(undefined);
  (storage.deletePrefix as jest.Mock).mockReset().mockResolvedValue(undefined);
});

describe('POST /api/uploads', () => {
  it('writes an uploading draft and returns the multipart handles', async () => {
    mockUser('creator', 'auth0|creator');
    const create = jest
      .spyOn(videoEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    (storage.createMultipartUpload as jest.Mock).mockResolvedValue({
      uploadId: 'upload-1',
      key: 'raw/generated-video-id/original.mp4',
    });

    const response = await api
      .post('/api/uploads')
      .set('Authorization', creatorToken)
      .send({ title: 'Sprint 12 demo' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      videoId: 'generated-video-id',
      uploadId: 'upload-1',
      key: 'raw/generated-video-id/original.mp4',
      partSize,
    });
    expect(partSize).toBe(10485760);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'generated-video-id',
        title: 'Sprint 12 demo',
        status: 'draft',
        folderId: 'ROOT',
        processingState: 'uploading',
        durationMs: 0,
        chapters: [],
        version: 1,
        s3Prefix: 'generated-video-id',
        createdBy: { sub: 'auth0|creator', name: 'Ana' },
      }),
    );
    expect(storage.createMultipartUpload).toHaveBeenCalledWith(
      'raw/generated-video-id/original.mp4',
      'video/mp4',
    );
  });

  it('honours an explicit folder and recorded date', async () => {
    mockUser('creator', 'auth0|creator');
    mockFolderGet({ id: 'folder-9', name: 'Nine' });
    const create = jest
      .spyOn(videoEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    (storage.createMultipartUpload as jest.Mock).mockResolvedValue({
      uploadId: 'upload-1',
      key: 'k',
    });

    await api.post('/api/uploads').set('Authorization', creatorToken).send({
      title: 'Sprint 12 demo',
      folderId: 'folder-9',
      recordedAt: '2026-07-01T09:00:00.000Z',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: 'folder-9',
        recordedAt: '2026-07-01T09:00:00.000Z',
      }),
    );
  });

  // an upload created into a folder that does not exist is invisible in every
  // listing and outlives the folder cleanup
  it('404s a folder that does not exist, without creating a row', async () => {
    mockUser('creator', 'auth0|creator');
    mockFolderGet(null);
    const create = jest.spyOn(videoEntity, 'create');

    const response = await api
      .post('/api/uploads')
      .set('Authorization', creatorToken)
      .send({ title: 'Sprint 12 demo', folderId: 'ghost' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
    expect(create).not.toHaveBeenCalled();
    expect(storage.createMultipartUpload).not.toHaveBeenCalled();
  });

  it('defaults recordedAt to now when it is omitted', async () => {
    mockUser('creator', 'auth0|creator');
    const create = jest
      .spyOn(videoEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    (storage.createMultipartUpload as jest.Mock).mockResolvedValue({
      uploadId: 'upload-1',
      key: 'k',
    });

    await api
      .post('/api/uploads')
      .set('Authorization', creatorToken)
      .send({ title: 'Sprint 12 demo' });

    const written = create.mock.calls[0]![0] as unknown as Record<
      string,
      string
    >;
    expect(written.recordedAt).toBe(written.createdAt);
    expect(written.createdAt).toBe(written.updatedAt);
    expect(Number.isNaN(Date.parse(written.recordedAt!))).toBe(false);
  });

  it('rejects a missing title before touching S3', async () => {
    mockUser('creator', 'auth0|creator');

    const response = await api
      .post('/api/uploads')
      .set('Authorization', creatorToken)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
    expect(storage.createMultipartUpload).not.toHaveBeenCalled();
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .post('/api/uploads')
      .set('Authorization', memberToken)
      .send({ title: 'Sprint 12 demo' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'forbidden' });
    expect(storage.createMultipartUpload).not.toHaveBeenCalled();
  });
});

describe('POST /api/uploads/:videoId/parts', () => {
  it('returns a presigned url for every requested part number', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(videoItem({ processingState: 'uploading' }));
    (storage.signUploadParts as jest.Mock).mockResolvedValue([
      { partNumber: 1, url: 'https://signed.example/1' },
      { partNumber: 2, url: 'https://signed.example/2' },
    ]);

    const response = await api
      .post('/api/uploads/video-1/parts')
      .set('Authorization', creatorToken)
      .send({ uploadId: 'upload-1', partNumbers: [1, 2] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      urls: [
        { partNumber: 1, url: 'https://signed.example/1' },
        { partNumber: 2, url: 'https://signed.example/2' },
      ],
    });
    expect(storage.signUploadParts).toHaveBeenCalledWith(
      'raw/video-1/original.mp4',
      'upload-1',
      [1, 2],
    );
  });

  it('rejects an empty part list', async () => {
    mockUser('creator', 'auth0|creator');

    const response = await api
      .post('/api/uploads/video-1/parts')
      .set('Authorization', creatorToken)
      .send({ uploadId: 'upload-1', partNumbers: [] });

    expect(response.status).toBe(400);
    expect(storage.signUploadParts).not.toHaveBeenCalled();
  });

  it('rejects a non-positive part number', async () => {
    mockUser('creator', 'auth0|creator');

    const response = await api
      .post('/api/uploads/video-1/parts')
      .set('Authorization', creatorToken)
      .send({ uploadId: 'upload-1', partNumbers: [0] });

    expect(response.status).toBe(400);
    expect(storage.signUploadParts).not.toHaveBeenCalled();
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .post('/api/uploads/video-1/parts')
      .set('Authorization', memberToken)
      .send({ uploadId: 'upload-1', partNumbers: [1] });

    expect(response.status).toBe(403);
  });
});

describe('POST /api/uploads/:videoId/complete', () => {
  const mockPatch = () => {
    mockVideoGet(videoItem({ processingState: 'uploading' }));
    const set = jest
      .fn()
      .mockReturnValue({ go: async () => ({ data: videoItem() }) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(videoEntity, 'patch').mockReturnValue({ set } as any);
    return set;
  };

  it('completes the multipart upload then flips the item to processing', async () => {
    mockUser('creator', 'auth0|creator');
    const set = mockPatch();

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
    expect(response.body.video).toMatchObject({ id: 'video-1' });
  });

  it('kicks off the local encoder when running locally', async () => {
    mockUser('creator', 'auth0|creator');
    mockPatch();
    mockIsLocal.mockReturnValue(true);

    await api
      .post('/api/uploads/video-1/complete')
      .set('Authorization', creatorToken)
      .send({ uploadId: 'upload-1', parts: [{ partNumber: 1, eTag: 'abc' }] });

    expect(mockStartLocalEncode).toHaveBeenCalledWith('video-1');
  });

  it('leaves encoding to the deployed pipeline when not local', async () => {
    mockUser('creator', 'auth0|creator');
    mockPatch();
    // auth decodes the bearer token only in local mode, so stay local for the
    // middleware and flip to deployed for the handler's own isLocal() check
    mockIsLocal.mockReturnValueOnce(true).mockReturnValue(false);

    const response = await api
      .post('/api/uploads/video-1/complete')
      .set('Authorization', creatorToken)
      .send({ uploadId: 'upload-1', parts: [{ partNumber: 1, eTag: 'abc' }] });

    expect(response.status).toBe(200);
    expect(mockStartLocalEncode).not.toHaveBeenCalled();
  });

  it('rejects a body with no parts', async () => {
    mockUser('creator', 'auth0|creator');

    const response = await api
      .post('/api/uploads/video-1/complete')
      .set('Authorization', creatorToken)
      .send({ uploadId: 'upload-1', parts: [] });

    expect(response.status).toBe(400);
    expect(storage.completeMultipartUpload).not.toHaveBeenCalled();
  });

  it('surfaces a 500 when S3 fails to complete the upload', async () => {
    mockUser('creator', 'auth0|creator');
    mockPatch();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (storage.completeMultipartUpload as jest.Mock).mockRejectedValue(
      new Error('NoSuchUpload'),
    );

    const response = await api
      .post('/api/uploads/video-1/complete')
      .set('Authorization', creatorToken)
      .send({ uploadId: 'upload-1', parts: [{ partNumber: 1, eTag: 'abc' }] });

    expect(response.status).toBe(500);
    expect(mockStartLocalEncode).not.toHaveBeenCalled();
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .post('/api/uploads/video-1/complete')
      .set('Authorization', memberToken)
      .send({ uploadId: 'upload-1', parts: [{ partNumber: 1, eTag: 'abc' }] });

    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/uploads/:videoId', () => {
  it('aborts the multipart upload and deletes a still-uploading item', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(videoItem({ processingState: 'uploading' }));
    const remove = jest
      .spyOn(videoEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .delete('/api/uploads/video-1?uploadId=upload-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(204);
    expect(storage.abortMultipartUpload).toHaveBeenCalledWith(
      'raw/video-1/original.mp4',
      'upload-1',
    );
    expect(remove).toHaveBeenCalledWith({ id: 'video-1' });
  });

  it('keeps an item that has already moved past uploading', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(videoItem({ processingState: 'ready' }));
    const remove = jest
      .spyOn(videoEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .delete('/api/uploads/video-1?uploadId=upload-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(204);
    expect(remove).not.toHaveBeenCalled();
  });

  it('skips the abort when no uploadId is supplied', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(videoItem({ processingState: 'uploading' }));
    jest
      .spyOn(videoEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .delete('/api/uploads/video-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(204);
    expect(storage.abortMultipartUpload).not.toHaveBeenCalled();
    // the prefix sweep still runs, so a retried upload cannot be left behind
    expect(storage.abortMultipartUploadsUnder).toHaveBeenCalledWith(
      'raw/video-1/',
    );
  });

  it('sweeps every upload left open on the key, not just the one supplied', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(videoItem({ processingState: 'uploading' }));
    jest
      .spyOn(videoEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .delete('/api/uploads/video-1?uploadId=upload-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(204);
    expect(storage.abortMultipartUploadsUnder).toHaveBeenCalledWith(
      'raw/video-1/',
    );
    expect(storage.deletePrefix).toHaveBeenCalledWith('raw/video-1/');
  });

  it('leaves the sweep alone for an item past uploading', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(videoItem({ processingState: 'ready' }));

    const response = await api
      .delete('/api/uploads/video-1?uploadId=upload-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(204);
    expect(storage.abortMultipartUploadsUnder).not.toHaveBeenCalled();
    expect(storage.deletePrefix).not.toHaveBeenCalled();
  });

  it('still deletes the item when the sweep fails', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(videoItem({ processingState: 'uploading' }));
    const remove = jest
      .spyOn(videoEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    (storage.abortMultipartUploadsUnder as jest.Mock).mockRejectedValue(
      new Error('AccessDenied'),
    );

    const response = await api
      .delete('/api/uploads/video-1?uploadId=upload-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(204);
    expect(remove).toHaveBeenCalledWith({ id: 'video-1' });
  });

  it('still succeeds when the abort call fails', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(videoItem({ processingState: 'uploading' }));
    const remove = jest
      .spyOn(videoEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    (storage.abortMultipartUpload as jest.Mock).mockRejectedValue(
      new Error('NoSuchUpload'),
    );

    const response = await api
      .delete('/api/uploads/video-1?uploadId=upload-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(204);
    expect(remove).toHaveBeenCalled();
  });

  it('is a no-op for an unknown video', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(null);
    const remove = jest
      .spyOn(videoEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .delete('/api/uploads/video-1')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(204);
    expect(remove).not.toHaveBeenCalled();
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .delete('/api/uploads/video-1')
      .set('Authorization', memberToken);

    expect(response.status).toBe(403);
  });
});
