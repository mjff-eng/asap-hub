process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { folderEntity, userEntity, videoEntity } from '../src/data/entities';
import {
  bulkMoveSchema,
  createUploadSchema,
  updateVideoSchema,
} from '../src/schemas';
import { isFolderId, isVideoId } from '../src/routes/request';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  deletePrefix: jest.fn(),
  createMultipartUpload: jest.fn(),
}));
jest.mock('../src/email', () => ({ sendInviteEmail: jest.fn() }));
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

const api = supertest(appFactory());

beforeEach(() => {
  jest.restoreAllMocks();
  jest
    .spyOn(userEntity, 'get')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValue({
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
});

describe('id alphabets', () => {
  it.each(['../other', 'a/b', 'a\\b', '', 'a'.repeat(129), '#META'])(
    'rejects %p as a video id',
    (value) => {
      expect(isVideoId(value)).toBe(false);
    },
  );

  it('accepts ROOT only as a folder id', () => {
    expect(isFolderId('ROOT')).toBe(true);
    expect(isVideoId('../ROOT')).toBe(false);
    expect(isFolderId('../escape')).toBe(false);
  });
});

describe('folder id path guard', () => {
  it('refuses a traversal id on PATCH without touching the table', async () => {
    const get = jest.spyOn(folderEntity, 'get');

    const response = await api
      .patch('/api/folders/..%2F..%2Fraw')
      .set('Authorization', creatorToken)
      .send({ name: 'renamed' });

    expect(response.status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });

  it('refuses a traversal id on DELETE without cascading', async () => {
    const get = jest.spyOn(folderEntity, 'get');

    const response = await api
      .delete('/api/folders/..%2F..%2Fmedia')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });
});

describe('body supplied folder ids', () => {
  it('rejects a traversal folderId on bulk-move before any write', async () => {
    const patch = jest.spyOn(videoEntity, 'patch');

    const response = await api
      .post('/api/videos/bulk-move')
      .set('Authorization', creatorToken)
      .send({
        ids: ['11111111-1111-4111-8111-111111111111'],
        folderId: '../escape',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
    expect(patch).not.toHaveBeenCalled();
  });

  it('rejects a traversal folderId on the upload and patch schemas', () => {
    expect(
      createUploadSchema.safeParse({ title: 'A', folderId: '../escape' })
        .success,
    ).toBe(false);
    expect(
      updateVideoSchema.safeParse({ version: 1, folderId: 'a/b' }).success,
    ).toBe(false);
    expect(
      bulkMoveSchema.safeParse({ ids: [], folderId: 'ROOT' }).success,
    ).toBe(false);
  });
});

describe('payload bounds', () => {
  it('rejects an oversized chapter list', () => {
    const chapters = Array.from({ length: 501 }, (_unused, index) => ({
      startMs: index,
      title: 'chapter',
    }));

    expect(updateVideoSchema.safeParse({ version: 1, chapters }).success).toBe(
      false,
    );
    expect(
      updateVideoSchema.safeParse({
        version: 1,
        chapters: chapters.slice(0, 2),
      }).success,
    ).toBe(true);
  });

  it('rejects an unbounded chapter title', () => {
    expect(
      updateVideoSchema.safeParse({
        version: 1,
        chapters: [{ startMs: 0, title: 'x'.repeat(301) }],
      }).success,
    ).toBe(false);
  });
});
