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

// videoEntity.get is overloaded for batch reads, so a single-key stub is typed
// through the mock rather than the overload
const stubVideoGet = (lookup: (id: string) => Record<string, unknown> | null) =>
  (jest.spyOn(videoEntity, 'get') as unknown as jest.Mock).mockImplementation(
    ({ id }: { id: string }) => ({
      go: async () => ({ data: lookup(id) }),
    }),
  );

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockUser = (role: string, sub: string, name: string) => {
  jest.spyOn(userEntity, 'get').mockReturnValue({
    go: async () => ({
      data: {
        sub,
        name,
        email: 'x@example.com',
        role,
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    }),
  } as any);
};

const video = (id: string, recordedAt: string, extra: object = {}) => ({
  id,
  title: id,
  status: 'published',
  folderId: 'ROOT',
  recordedAt,
  processingState: 'ready',
  createdBy: 'auth0|creator',
  version: 1,
  ...extra,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

beforeEach(() => {
  jest.restoreAllMocks();
  mockUser('creator', 'auth0|creator', 'Ana');
});

describe('GET /api/videos draft visibility', () => {
  it('queries drafts unrestricted for a creator and sorts newest first', async () => {
    const begins = jest.fn();
    jest.spyOn(videoEntity.query, 'byFolder').mockReturnValue({
      begins,
      go: async () => ({
        data: [
          video('older', '2026-01-01T00:00:00.000Z'),
          video('newer', '2026-06-01T00:00:00.000Z'),
        ],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await api
      .get('/api/videos')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { id: string }) => item.id)).toEqual([
      'newer',
      'older',
    ]);
    // a creator must not be narrowed to the PUBLISHED prefix
    expect(begins).not.toHaveBeenCalled();
  });

  it('narrows a member to the PUBLISHED key prefix', async () => {
    mockUser('member', 'auth0|member', 'Bob');
    const begins = jest.fn().mockReturnValue({
      go: async () => ({ data: [video('pub', '2026-01-01T00:00:00.000Z')] }),
    });
    jest
      .spyOn(videoEntity.query, 'byFolder')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ begins } as any);

    const response = await api
      .get('/api/videos')
      .set('Authorization', memberToken);

    expect(response.status).toBe(200);
    expect(begins).toHaveBeenCalledWith({
      statusKey: 'PUBLISHED',
      recordedAt: '',
    });
  });

  it('defaults to the ROOT folder when no folderId is given', async () => {
    const byFolder = jest.spyOn(videoEntity.query, 'byFolder').mockReturnValue({
      begins: jest.fn(),
      go: async () => ({ data: [] }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await api.get('/api/videos').set('Authorization', creatorToken);

    expect(byFolder).toHaveBeenCalledWith({ folderId: 'ROOT' });
  });

  it('passes an explicit folderId through', async () => {
    const byFolder = jest.spyOn(videoEntity.query, 'byFolder').mockReturnValue({
      begins: jest.fn(),
      go: async () => ({ data: [] }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await api
      .get('/api/videos?folderId=folder-9')
      .set('Authorization', creatorToken);

    expect(byFolder).toHaveBeenCalledWith({ folderId: 'folder-9' });
  });

  // the query string is the one folder id that used to reach the key template
  // without ever meeting the safe alphabet
  it('rejects a folderId outside the safe alphabet without querying', async () => {
    const byFolder = jest.spyOn(videoEntity.query, 'byFolder');

    const response = await api
      .get('/api/videos?folderId=..%2Fother')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_folder_id');
    expect(byFolder).not.toHaveBeenCalled();
  });
});

describe('GET /api/videos/all', () => {
  it('merges every folder and sorts across them', async () => {
    jest.spyOn(folderEntity.query, 'all').mockReturnValue({
      go: async () => ({ data: [{ id: 'f1', name: 'F1' }] }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    jest.spyOn(videoEntity.query, 'byFolder').mockImplementation(
      (key: { folderId: string }) =>
        ({
          begins: jest.fn(),
          go: async () => ({
            data:
              key.folderId === 'ROOT'
                ? [video('root-old', '2026-01-01T00:00:00.000Z')]
                : [video('f1-new', '2026-09-01T00:00:00.000Z')],
          }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
    );

    const response = await api
      .get('/api/videos/all')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { id: string }) => item.id)).toEqual([
      'f1-new',
      'root-old',
    ]);
  });

  it('narrows a member to published across every folder', async () => {
    mockUser('member', 'auth0|member', 'Bob');
    jest.spyOn(folderEntity.query, 'all').mockReturnValue({
      go: async () => ({ data: [{ id: 'f1', name: 'F1' }] }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const begins = jest
      .fn()
      .mockReturnValue({ go: async () => ({ data: [] }) });
    jest
      .spyOn(videoEntity.query, 'byFolder')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ begins } as any);

    await api.get('/api/videos/all').set('Authorization', memberToken);

    // ROOT plus the one real folder, both narrowed
    expect(begins).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/videos/bulk-move', () => {
  const uuidA = '11111111-1111-4111-8111-111111111111';
  const uuidB = '22222222-2222-4222-8222-222222222222';

  it('separates moved from missing ids and bumps the version of each move', async () => {
    jest
      .spyOn(folderEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: { id: 'f1' } }) } as any);
    stubVideoGet((id) => (id === uuidA ? { id } : null));
    const set = jest.fn();
    const add = jest.fn();
    const go = jest.fn().mockResolvedValue({ data: {} });
    set.mockReturnValue({ add });
    add.mockReturnValue({ go });
    jest
      .spyOn(videoEntity, 'patch')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ set } as any);

    const response = await api
      .post('/api/videos/bulk-move')
      .set('Authorization', creatorToken)
      .send({ ids: [uuidA, uuidB], folderId: 'f1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      moved: [uuidA],
      missing: [uuidB],
      locked: [],
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ folderId: 'f1' }),
    );
    expect(add).toHaveBeenCalledWith({ version: 1 });
  });

  // a move is as disruptive to an open edit as a delete: the editor would find
  // the demo it is holding somewhere else the moment it saved
  it('skips a video another creator holds open, as bulk-delete does', async () => {
    jest
      .spyOn(folderEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: { id: 'f1' } }) } as any);
    stubVideoGet((id) =>
      id === uuidA
        ? { id, lockedBy: 'auth0|other', lockExpiresAt: Date.now() + 60000 }
        : { id },
    );
    const patch = jest.spyOn(videoEntity, 'patch').mockReturnValue({
      set: () => ({ add: () => ({ go: async () => ({ data: {} }) }) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await api
      .post('/api/videos/bulk-move')
      .set('Authorization', creatorToken)
      .send({ ids: [uuidA, uuidB], folderId: 'f1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      moved: [uuidB],
      missing: [],
      locked: [uuidA],
    });
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('moves a video whose lease has expired or is its own', async () => {
    jest
      .spyOn(folderEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: { id: 'f1' } }) } as any);
    stubVideoGet((id) =>
      id === uuidA
        ? { id, lockedBy: 'auth0|other', lockExpiresAt: Date.now() - 1000 }
        : { id, lockedBy: 'auth0|creator', lockExpiresAt: Date.now() + 60000 },
    );
    jest.spyOn(videoEntity, 'patch').mockReturnValue({
      set: () => ({ add: () => ({ go: async () => ({ data: {} }) }) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await api
      .post('/api/videos/bulk-move')
      .set('Authorization', creatorToken)
      .send({ ids: [uuidA, uuidB], folderId: 'f1' });

    expect(response.body).toEqual({
      moved: [uuidA, uuidB],
      missing: [],
      locked: [],
    });
  });

  it('404s an unknown destination folder before moving anything', async () => {
    jest
      .spyOn(folderEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: null }) } as any);
    const patch = jest.spyOn(videoEntity, 'patch');

    const response = await api
      .post('/api/videos/bulk-move')
      .set('Authorization', creatorToken)
      .send({ ids: [uuidA], folderId: 'ghost' });

    expect(response.status).toBe(404);
    expect(patch).not.toHaveBeenCalled();
  });

  it('skips the folder lookup when moving to ROOT', async () => {
    const folderGet = jest.spyOn(folderEntity, 'get');
    jest
      .spyOn(videoEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: null }) } as any);

    const response = await api
      .post('/api/videos/bulk-move')
      .set('Authorization', creatorToken)
      .send({ ids: [uuidA], folderId: 'ROOT' });

    expect(response.status).toBe(200);
    expect(folderGet).not.toHaveBeenCalled();
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member', 'Bob');
    const patch = jest.spyOn(videoEntity, 'patch');

    const response = await api
      .post('/api/videos/bulk-move')
      .set('Authorization', memberToken)
      .send({ ids: [uuidA], folderId: 'ROOT' });

    expect(response.status).toBe(403);
    expect(patch).not.toHaveBeenCalled();
  });
});

describe('POST /api/videos/bulk-delete', () => {
  const uuidA = '11111111-1111-4111-8111-111111111111';
  const uuidB = '22222222-2222-4222-8222-222222222222';
  const uuidC = '33333333-3333-4333-8333-333333333333';

  it('reports deleted and missing ids separately', async () => {
    stubVideoGet((id) => (id === uuidB ? null : { id }));
    const cascadeSpy = jest
      .spyOn(cascade, 'deleteVideoCascade')
      .mockResolvedValue(undefined);

    const response = await api
      .post('/api/videos/bulk-delete')
      .set('Authorization', creatorToken)
      .send({ ids: [uuidA, uuidB] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      deleted: [uuidA],
      missing: [uuidB],
      locked: [],
      rendering: [],
    });
    expect(cascadeSpy).toHaveBeenCalledTimes(1);
    expect(cascadeSpy).toHaveBeenCalledWith(uuidA);
  });

  it('omits a video whose cascade threw from the deleted list', async () => {
    stubVideoGet((id) => ({ id }));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest
      .spyOn(cascade, 'deleteVideoCascade')
      .mockImplementation(async (id: string) => {
        if (id === uuidA) throw new Error('AccessDenied');
      });

    const response = await api
      .post('/api/videos/bulk-delete')
      .set('Authorization', creatorToken)
      .send({ ids: [uuidA, uuidC] });

    expect(response.status).toBe(200);
    // the failed one is neither deleted nor missing, so the client can retry it
    expect(response.body).toEqual({
      deleted: [uuidC],
      missing: [],
      locked: [],
      rendering: [],
    });
  });

  it('skips a video another creator holds open', async () => {
    stubVideoGet((id) =>
      id === uuidA
        ? { id, lockedBy: 'auth0|other', lockExpiresAt: Date.now() + 60000 }
        : { id },
    );
    const cascadeSpy = jest
      .spyOn(cascade, 'deleteVideoCascade')
      .mockResolvedValue(undefined);

    const response = await api
      .post('/api/videos/bulk-delete')
      .set('Authorization', creatorToken)
      .send({ ids: [uuidA, uuidC] });

    expect(response.body).toEqual({
      deleted: [uuidC],
      missing: [],
      locked: [uuidA],
      rendering: [],
    });
    expect(cascadeSpy).not.toHaveBeenCalledWith(uuidA);
  });

  it('deletes a video whose lease has expired or is its own', async () => {
    stubVideoGet((id) =>
      id === uuidA
        ? { id, lockedBy: 'auth0|other', lockExpiresAt: Date.now() - 1000 }
        : { id, lockedBy: 'auth0|creator', lockExpiresAt: Date.now() + 60000 },
    );
    jest.spyOn(cascade, 'deleteVideoCascade').mockResolvedValue(undefined);

    const response = await api
      .post('/api/videos/bulk-delete')
      .set('Authorization', creatorToken)
      .send({ ids: [uuidA, uuidC] });

    expect(response.body).toEqual({
      deleted: [uuidA, uuidC],
      missing: [],
      locked: [],
      rendering: [],
    });
  });

  // a video the cascade refuses because a container is still writing is not a
  // failure the client should retry blindly, so it gets its own bucket
  it('reports a video the cascade refused for an active render', async () => {
    stubVideoGet((id) => ({ id }));
    jest
      .spyOn(cascade, 'deleteVideoCascade')
      .mockImplementation(async (id: string) => {
        if (id === uuidA) throw new cascade.RenderInProgress(id);
      });

    const response = await api
      .post('/api/videos/bulk-delete')
      .set('Authorization', creatorToken)
      .send({ ids: [uuidA, uuidC] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      deleted: [uuidC],
      missing: [],
      locked: [],
      rendering: [uuidA],
    });
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member', 'Bob');
    const cascadeSpy = jest.spyOn(cascade, 'deleteVideoCascade');

    const response = await api
      .post('/api/videos/bulk-delete')
      .set('Authorization', memberToken)
      .send({ ids: [uuidA] });

    expect(response.status).toBe(403);
    expect(cascadeSpy).not.toHaveBeenCalled();
  });
});
