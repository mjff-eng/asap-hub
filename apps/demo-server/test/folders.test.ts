process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { folderEntity, userEntity, videoEntity } from '../src/data/entities';
import * as cascade from '../src/routes/cascade';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  deletePrefix: jest.fn(),
  abortMultipartUploadsUnder: jest.fn(),
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
const memberToken = bearer({
  sub: 'auth0|member',
  email: 'bob@example.com',
  email_verified: true,
  name: 'Bob',
});

const api = supertest(appFactory());

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockUser = (role: string, sub: string, name: string) => {
  jest.spyOn(userEntity, 'get').mockReturnValue({
    go: async () => ({
      data: {
        sub,
        name,
        email: `${name.toLowerCase()}@example.com`,
        role,
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    }),
  } as any);
};

type Row = { id: string; name: string; parentId?: string };

const mockFolders = (rows: Row[]) =>
  jest
    .spyOn(folderEntity.query, 'all')
    .mockReturnValue({ go: async () => ({ data: rows }) } as any);

const mockFolderGet = (row: Row | null) =>
  jest
    .spyOn(folderEntity, 'get')
    .mockReturnValue({ go: async () => ({ data: row }) } as any);

const mockFolderPut = () =>
  jest
    .spyOn(folderEntity, 'put')
    .mockReturnValue({ go: async () => ({ data: {} }) } as any);

const mockFolderDelete = () =>
  jest
    .spyOn(folderEntity, 'delete')
    .mockReturnValue({ go: async () => ({ data: {} }) } as any);

const mockFolderCreate = () =>
  jest
    .spyOn(folderEntity, 'create')
    .mockReturnValue({ go: async () => ({ data: {} }) } as any);

// videos keyed by folder, so a subtree delete can be asserted per folder
const mockVideosByFolder = (
  byFolder: Record<string, Record<string, unknown>[]>,
) =>
  jest.spyOn(videoEntity.query, 'byFolder').mockImplementation(
    (key: any) =>
      ({
        go: async () => ({ data: byFolder[key.folderId] ?? [] }),
        begins: () => ({
          go: async () => ({ data: byFolder[key.folderId] ?? [] }),
        }),
      }) as any,
  );
/* eslint-enable @typescript-eslint/no-explicit-any */

beforeEach(() => {
  jest.restoreAllMocks();
  mockUser('creator', 'auth0|creator', 'Ana');
});

describe('POST /api/folders depth and parent guards', () => {
  it('refuses a parent that does not exist without creating anything', async () => {
    mockFolders([{ id: 'a', name: 'A' }]);
    const create = mockFolderCreate();

    const response = await api
      .post('/api/folders')
      .set('Authorization', creatorToken)
      .send({ name: 'child', parentId: 'ghost' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('not_found');
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses to nest a fourth level and reports max_depth', async () => {
    // a -> b -> c is already three deep, so c cannot take a child
    mockFolders([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', parentId: 'a' },
      { id: 'c', name: 'C', parentId: 'b' },
    ]);
    const create = mockFolderCreate();

    const response = await api
      .post('/api/folders')
      .set('Authorization', creatorToken)
      .send({ name: 'too deep', parentId: 'c' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('max_depth');
    expect(create).not.toHaveBeenCalled();
  });

  it('allows a third level and persists the parent link', async () => {
    mockFolders([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', parentId: 'a' },
    ]);
    const create = mockFolderCreate();

    const response = await api
      .post('/api/folders')
      .set('Authorization', creatorToken)
      .send({ name: 'third', parentId: 'b' });

    expect(response.status).toBe(200);
    expect(response.body.parentId).toBe('b');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'third', parentId: 'b' }),
    );
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member', 'Bob');
    const create = mockFolderCreate();

    const response = await api
      .post('/api/folders')
      .set('Authorization', memberToken)
      .send({ name: 'nope' });

    expect(response.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/folders/:id move guards', () => {
  it('refuses to move a folder inside itself', async () => {
    mockFolderGet({ id: 'a', name: 'A' });
    mockFolders([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', parentId: 'a' },
    ]);
    const put = mockFolderPut();

    const response = await api
      .patch('/api/folders/a')
      .set('Authorization', creatorToken)
      .send({ parentId: 'a' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('cycle');
    expect(put).not.toHaveBeenCalled();
  });

  it('refuses to move a folder inside its own descendant', async () => {
    mockFolderGet({ id: 'a', name: 'A' });
    mockFolders([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', parentId: 'a' },
      { id: 'c', name: 'C', parentId: 'b' },
    ]);
    const put = mockFolderPut();

    const response = await api
      .patch('/api/folders/a')
      .set('Authorization', creatorToken)
      .send({ parentId: 'c' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('cycle');
    expect(put).not.toHaveBeenCalled();
  });

  it('refuses a move that would push the subtree past the depth limit', async () => {
    // moving a (which carries a child) under b would make the child fourth level
    mockFolderGet({ id: 'a', name: 'A' });
    mockFolders([
      { id: 'a', name: 'A' },
      { id: 'a2', name: 'A2', parentId: 'a' },
      { id: 'root', name: 'Root' },
      { id: 'b', name: 'B', parentId: 'root' },
    ]);
    const put = mockFolderPut();

    const response = await api
      .patch('/api/folders/a')
      .set('Authorization', creatorToken)
      .send({ parentId: 'b' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('max_depth');
    expect(put).not.toHaveBeenCalled();
  });

  it('detaches to the top level on the TOP sentinel', async () => {
    mockFolderGet({ id: 'b', name: 'B', parentId: 'a' });
    mockFolders([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', parentId: 'a' },
    ]);
    const put = mockFolderPut();

    const response = await api
      .patch('/api/folders/b')
      .set('Authorization', creatorToken)
      .send({ parentId: 'TOP' });

    expect(response.status).toBe(200);
    expect(response.body.parentId).toBeUndefined();
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b', parentId: undefined }),
    );
  });

  it('keeps the existing parent when only the name changes', async () => {
    mockFolderGet({ id: 'b', name: 'B', parentId: 'a' });
    const put = mockFolderPut();
    const all = mockFolders([]);

    const response = await api
      .patch('/api/folders/b')
      .set('Authorization', creatorToken)
      .send({ name: 'renamed' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'b',
      name: 'renamed',
      parentId: 'a',
    });
    // no parentId in the body means the folder tree is never even read
    expect(all).not.toHaveBeenCalled();
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'renamed', parentId: 'a' }),
    );
  });

  it('refuses to patch the synthetic ROOT folder', async () => {
    const get = jest.spyOn(folderEntity, 'get');

    const response = await api
      .patch('/api/folders/ROOT')
      .set('Authorization', creatorToken)
      .send({ name: 'renamed' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('root_folder');
    expect(get).not.toHaveBeenCalled();
  });

  it('404s an unknown folder', async () => {
    mockFolderGet(null);
    const put = mockFolderPut();

    const response = await api
      .patch('/api/folders/ghost')
      .set('Authorization', creatorToken)
      .send({ name: 'renamed' });

    expect(response.status).toBe(404);
    expect(put).not.toHaveBeenCalled();
  });

  it('404s an unknown destination parent', async () => {
    mockFolderGet({ id: 'b', name: 'B' });
    mockFolders([{ id: 'b', name: 'B' }]);
    const put = mockFolderPut();

    const response = await api
      .patch('/api/folders/b')
      .set('Authorization', creatorToken)
      .send({ parentId: 'ghost' });

    expect(response.status).toBe(404);
    expect(put).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/folders/:id cascade', () => {
  it('refuses to delete the synthetic ROOT folder', async () => {
    const get = jest.spyOn(folderEntity, 'get');

    const response = await api
      .delete('/api/folders/ROOT')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('root_folder');
    expect(get).not.toHaveBeenCalled();
  });

  it('deletes the whole subtree deepest first and cascades every video', async () => {
    mockFolderGet({ id: 'a', name: 'A' });
    mockFolders([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', parentId: 'a' },
      { id: 'c', name: 'C', parentId: 'b' },
    ]);
    mockVideosByFolder({
      a: [{ id: 'v-a' }],
      b: [{ id: 'v-b' }],
      c: [{ id: 'v-c' }],
    });
    const remove = mockFolderDelete();
    const cascadeSpy = jest
      .spyOn(cascade, 'deleteVideoCascade')
      .mockResolvedValue(undefined);

    const response = await api
      .delete('/api/folders/a')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ locked: [], rendering: [], kept: [] });

    // every video in the subtree is cascaded, not just the ones in the target
    expect(cascadeSpy.mock.calls.map(([id]) => id).sort()).toEqual([
      'v-a',
      'v-b',
      'v-c',
    ]);

    // children are removed before their parent so no row is ever orphaned
    const order = remove.mock.calls.map(
      ([key]) => (key as unknown as { id: string }).id,
    );
    expect(order).toEqual(['c', 'b', 'a']);
  });

  it('deletes the folder rows even when a video cascade fails', async () => {
    mockFolderGet({ id: 'a', name: 'A' });
    mockFolders([{ id: 'a', name: 'A' }]);
    mockVideosByFolder({ a: [{ id: 'v-a' }, { id: 'v-b' }] });
    const remove = mockFolderDelete();
    const logged = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    jest
      .spyOn(cascade, 'deleteVideoCascade')
      .mockImplementation(async (id: string) => {
        if (id === 'v-a') throw new Error('AccessDenied');
      });

    const response = await api
      .delete('/api/folders/a')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(remove).toHaveBeenCalledWith({ id: 'a' });
    expect(logged).toHaveBeenCalledWith(
      'failed to delete video v-a',
      expect.any(Error),
    );
  });

  // a folder delete used to destroy every video under it with no lease check at
  // all, wiping out a colleague's open edit
  it('skips a video another creator holds open and reports it', async () => {
    mockFolderGet({ id: 'a', name: 'A' });
    mockFolders([{ id: 'a', name: 'A' }]);
    mockVideosByFolder({
      a: [
        {
          id: 'v-held',
          lockedBy: 'auth0|other',
          lockExpiresAt: Date.now() + 60000,
        },
        { id: 'v-free' },
      ],
    });
    const remove = mockFolderDelete();
    const cascadeSpy = jest
      .spyOn(cascade, 'deleteVideoCascade')
      .mockResolvedValue(undefined);

    const response = await api
      .delete('/api/folders/a')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      locked: ['v-held'],
      rendering: [],
      kept: ['a'],
    });
    expect(cascadeSpy).toHaveBeenCalledTimes(1);
    expect(cascadeSpy).toHaveBeenCalledWith('v-free');
    // the folder stays with the video it could not remove, or the video would
    // point at a row that no longer exists
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes a video whose lease has expired or is its own', async () => {
    mockFolderGet({ id: 'a', name: 'A' });
    mockFolders([{ id: 'a', name: 'A' }]);
    mockVideosByFolder({
      a: [
        {
          id: 'v-stale',
          lockedBy: 'auth0|other',
          lockExpiresAt: Date.now() - 1000,
        },
        {
          id: 'v-mine',
          lockedBy: 'auth0|creator',
          lockExpiresAt: Date.now() + 60000,
        },
      ],
    });
    const remove = mockFolderDelete();
    const cascadeSpy = jest
      .spyOn(cascade, 'deleteVideoCascade')
      .mockResolvedValue(undefined);

    const response = await api
      .delete('/api/folders/a')
      .set('Authorization', creatorToken);

    expect(response.body).toEqual({ locked: [], rendering: [], kept: [] });
    expect(cascadeSpy.mock.calls.map(([id]) => id).sort()).toEqual([
      'v-mine',
      'v-stale',
    ]);
    expect(remove).toHaveBeenCalledWith({ id: 'a' });
  });

  it('reports a video the cascade refused for an active render', async () => {
    mockFolderGet({ id: 'a', name: 'A' });
    mockFolders([{ id: 'a', name: 'A' }]);
    mockVideosByFolder({ a: [{ id: 'v-rendering' }] });
    const remove = mockFolderDelete();
    jest
      .spyOn(cascade, 'deleteVideoCascade')
      .mockRejectedValue(new cascade.RenderInProgress('v-rendering'));

    const response = await api
      .delete('/api/folders/a')
      .set('Authorization', creatorToken);

    expect(response.body).toEqual({
      locked: [],
      rendering: ['v-rendering'],
      kept: ['a'],
    });
    expect(remove).not.toHaveBeenCalled();
  });

  // the video is kept, so every folder above it has to be kept too
  it('keeps the ancestors of a folder it could not empty', async () => {
    mockFolderGet({ id: 'a', name: 'A' });
    mockFolders([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', parentId: 'a' },
      { id: 'c', name: 'C', parentId: 'b' },
    ]);
    mockVideosByFolder({
      c: [
        {
          id: 'v-held',
          lockedBy: 'auth0|other',
          lockExpiresAt: Date.now() + 60000,
        },
      ],
    });
    const remove = mockFolderDelete();
    jest.spyOn(cascade, 'deleteVideoCascade').mockResolvedValue(undefined);

    const response = await api
      .delete('/api/folders/a')
      .set('Authorization', creatorToken);

    expect(response.body.kept.sort()).toEqual(['a', 'b', 'c']);
    expect(remove).not.toHaveBeenCalled();
  });

  it('404s an unknown folder without deleting anything', async () => {
    mockFolderGet(null);
    const remove = mockFolderDelete();

    const response = await api
      .delete('/api/folders/ghost')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(404);
    expect(remove).not.toHaveBeenCalled();
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member', 'Bob');
    const remove = mockFolderDelete();

    const response = await api
      .delete('/api/folders/a')
      .set('Authorization', memberToken);

    expect(response.status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('GET /api/folders/counts draft visibility', () => {
  it('counts drafts for a creator', async () => {
    mockFolders([{ id: 'a', name: 'A' }]);
    mockVideosByFolder({
      ROOT: [{ id: 'v-1' }],
      a: [{ id: 'v-2' }, { id: 'v-3' }],
    });

    const response = await api
      .get('/api/folders/counts')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body.counts).toEqual({ ROOT: 1, a: 2 });
  });

  it('counts only ready videos for a member', async () => {
    mockUser('member', 'auth0|member', 'Bob');
    mockFolders([{ id: 'a', name: 'A' }]);
    jest.spyOn(videoEntity.query, 'byFolder').mockImplementation(
      (key: { folderId: string }) =>
        ({
          begins: () => ({
            go: async () => ({
              data:
                key.folderId === 'a'
                  ? [
                      { id: 'ready', processingState: 'ready' },
                      { id: 'processing', processingState: 'processing' },
                    ]
                  : [],
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
    );

    const response = await api
      .get('/api/folders/counts')
      .set('Authorization', memberToken);

    expect(response.status).toBe(200);
    // the still-processing video must not be counted for a member
    expect(response.body.counts).toEqual({ ROOT: 0, a: 1 });
  });
});
