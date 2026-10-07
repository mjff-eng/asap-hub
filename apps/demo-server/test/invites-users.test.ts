process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { inviteEntity, userEntity } from '../src/data/entities';
import { sendInviteEmail } from '../src/email';
/* eslint-enable import/first */

jest.mock('../src/email', () => ({ sendInviteEmail: jest.fn() }));

jest.mock('../src/data/client', () => ({
  getDocumentClient: () => ({ send: jest.fn() }),
  setDocumentClient: jest.fn(),
}));

const mockSendInviteEmail = sendInviteEmail as jest.MockedFunction<
  typeof sendInviteEmail
>;

const bearer = (claims: Record<string, unknown>): string => {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `Bearer ${encode({ alg: 'none' })}.${encode(claims)}.signature`;
};

const adminToken = bearer({
  sub: 'auth0|admin',
  email: 'dana@example.com',
  email_verified: true,
  name: 'Dana',
});

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

const mockCaller = (role: 'creator' | 'member' | 'admin', sub: string) =>
  jest.spyOn(userEntity, 'get').mockReturnValue({
    go: async () => ({
      data: {
        sub,
        name: 'Caller',
        email: 'caller@example.com',
        role,
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const callerThen = (
  role: 'creator' | 'member' | 'admin',
  sub: string,
  target: Record<string, unknown> | null,
) =>
  jest
    .spyOn(userEntity, 'get')
    .mockReturnValueOnce({
      go: async () => ({
        data: {
          sub,
          name: 'Caller',
          email: 'caller@example.com',
          role,
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValueOnce({ go: async () => ({ data: target }) } as any);

beforeEach(() => {
  jest.restoreAllMocks();
  mockSendInviteEmail.mockReset().mockResolvedValue(undefined);
});

describe('GET /api/invites', () => {
  it('lists invites and names the claimer where there is one', async () => {
    mockCaller('creator', 'auth0|creator');
    jest.spyOn(inviteEntity.query, 'all').mockReturnValue({
      go: async () => ({
        data: [
          {
            email: 'bob@example.com',
            role: 'member',
            createdAt: '2026-01-01T00:00:00.000Z',
            claimedBy: { sub: 'auth0|member', name: 'Bob' },
          },
          {
            email: 'new@example.com',
            role: 'creator',
            createdAt: '2026-02-01T00:00:00.000Z',
          },
        ],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await api
      .get('/api/invites')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toEqual({
      email: 'bob@example.com',
      role: 'member',
      createdAt: '2026-01-01T00:00:00.000Z',
      claimedBy: 'Bob',
    });
    expect(response.body.items[1]).not.toHaveProperty('claimedBy');
  });

  it('refuses a member', async () => {
    mockCaller('member', 'auth0|member');

    const response = await api
      .get('/api/invites')
      .set('Authorization', memberToken);

    expect(response.status).toBe(403);
  });
});

describe('POST /api/invites', () => {
  it('normalises the email, keeps the original createdAt and sends the email', async () => {
    mockCaller('creator', 'auth0|creator');
    jest.spyOn(inviteEntity, 'get').mockReturnValue({
      go: async () => ({
        data: {
          email: 'new@example.com',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const upsert = jest
      .spyOn(inviteEntity, 'upsert')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .post('/api/invites')
      .set('Authorization', creatorToken)
      .send({ email: 'NEW@Example.COM', role: 'member' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ email: 'new@example.com', role: 'member' });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        role: 'member',
        createdAt: '2026-01-01T00:00:00.000Z',
        invitedBy: { sub: 'auth0|creator', name: 'Caller' },
      }),
    );
    expect(mockSendInviteEmail).toHaveBeenCalledWith('new@example.com');
  });

  it('stamps a fresh createdAt for a brand new invite', async () => {
    mockCaller('creator', 'auth0|creator');
    jest
      .spyOn(inviteEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: null }) } as any);
    const upsert = jest
      .spyOn(inviteEntity, 'upsert')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    await api
      .post('/api/invites')
      .set('Authorization', creatorToken)
      .send({ email: 'new@example.com', role: 'member' });

    const written = upsert.mock.calls[0]![0] as unknown as Record<
      string,
      string
    >;
    expect(Number.isNaN(Date.parse(written.createdAt!))).toBe(false);
  });

  it('refuses to re-invite an address that is already claimed', async () => {
    mockCaller('creator', 'auth0|creator');
    jest.spyOn(inviteEntity, 'get').mockReturnValue({
      go: async () => ({
        data: {
          email: 'bob@example.com',
          claimedBy: { sub: 'auth0|member', name: 'Bob' },
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const upsert = jest
      .spyOn(inviteEntity, 'upsert')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .post('/api/invites')
      .set('Authorization', creatorToken)
      .send({ email: 'bob@example.com', role: 'member' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'already_invited' });
    expect(upsert).not.toHaveBeenCalled();
    expect(mockSendInviteEmail).not.toHaveBeenCalled();
  });

  it('rejects an address that is not an email', async () => {
    mockCaller('creator', 'auth0|creator');

    const response = await api
      .post('/api/invites')
      .set('Authorization', creatorToken)
      .send({ email: 'not-an-email', role: 'member' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
  });

  it('rejects an unknown role', async () => {
    mockCaller('creator', 'auth0|creator');

    const response = await api
      .post('/api/invites')
      .set('Authorization', creatorToken)
      .send({ email: 'new@example.com', role: 'superuser' });

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/invites/:email', () => {
  it('deletes an unclaimed invite, normalising the address', async () => {
    mockCaller('admin', 'auth0|admin');
    const inviteGet = jest.spyOn(inviteEntity, 'get').mockReturnValue({
      go: async () => ({ data: { email: 'new@example.com', role: 'member' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const remove = jest
      .spyOn(inviteEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .delete('/api/invites/NEW%40Example.COM')
      .set('Authorization', adminToken);

    expect(response.status).toBe(204);
    expect(inviteGet).toHaveBeenCalledWith({ email: 'new@example.com' });
    expect(remove).toHaveBeenCalledWith({ email: 'new@example.com' });
  });

  it('returns 404 for an unknown invite', async () => {
    mockCaller('admin', 'auth0|admin');
    jest
      .spyOn(inviteEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: null }) } as any);
    const remove = jest
      .spyOn(inviteEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .delete('/api/invites/ghost@example.com')
      .set('Authorization', adminToken);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
    expect(remove).not.toHaveBeenCalled();
  });

  it('refuses to delete a claimed invite', async () => {
    mockCaller('admin', 'auth0|admin');
    jest.spyOn(inviteEntity, 'get').mockReturnValue({
      go: async () => ({
        data: {
          email: 'bob@example.com',
          claimedBy: { sub: 'auth0|member', name: 'Bob' },
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const remove = jest
      .spyOn(inviteEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .delete('/api/invites/bob@example.com')
      .set('Authorization', adminToken);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'claimed' });
    expect(remove).not.toHaveBeenCalled();
  });

  it('refuses a creator, since cancelling is admin-only', async () => {
    mockCaller('creator', 'auth0|creator');

    const response = await api
      .delete('/api/invites/new@example.com')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'forbidden' });
  });
});

describe('PATCH /api/users/:sub', () => {
  it('applies a role change and echoes the merged row', async () => {
    callerThen('admin', 'auth0|admin', {
      sub: 'auth0|member',
      name: 'Bob',
      email: 'bob@example.com',
      role: 'member',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const set = jest.fn().mockReturnValue({
      go: async () => ({
        data: {
          sub: 'auth0|member',
          name: 'Bob',
          email: 'bob@example.com',
          role: 'creator',
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(userEntity, 'patch').mockReturnValue({ set } as any);

    const response = await api
      .patch('/api/users/auth0%7Cmember')
      .set('Authorization', adminToken)
      .send({ role: 'creator' });

    expect(response.status).toBe(200);
    expect(set).toHaveBeenCalledWith({ role: 'creator' });
    expect(response.body).toEqual({
      sub: 'auth0|member',
      name: 'Bob',
      email: 'bob@example.com',
      role: 'creator',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('revokes a user without touching their role', async () => {
    callerThen('admin', 'auth0|admin', {
      sub: 'auth0|member',
      name: 'Bob',
      email: 'bob@example.com',
      role: 'member',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const set = jest.fn().mockReturnValue({
      go: async () => ({ data: { status: 'revoked' } }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(userEntity, 'patch').mockReturnValue({ set } as any);

    const response = await api
      .patch('/api/users/auth0%7Cmember')
      .set('Authorization', adminToken)
      .send({ status: 'revoked' });

    expect(response.status).toBe(200);
    expect(set).toHaveBeenCalledWith({ status: 'revoked' });
    // the fields the patch did not return fall back to the row that was read
    expect(response.body).toMatchObject({
      name: 'Bob',
      email: 'bob@example.com',
      role: 'member',
      status: 'revoked',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('rejects an unknown role value', async () => {
    mockCaller('admin', 'auth0|admin');

    const response = await api
      .patch('/api/users/auth0%7Cmember')
      .set('Authorization', adminToken)
      .send({ role: 'superuser' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
  });

  it('rejects an unknown status value', async () => {
    mockCaller('admin', 'auth0|admin');

    const response = await api
      .patch('/api/users/auth0%7Cmember')
      .set('Authorization', adminToken)
      .send({ status: 'banned' });

    expect(response.status).toBe(400);
  });

  it('refuses a member', async () => {
    mockCaller('member', 'auth0|member');

    const response = await api
      .patch('/api/users/auth0%7Cother')
      .set('Authorization', memberToken)
      .send({ role: 'creator' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'forbidden' });
  });
});

describe('DELETE /api/users/:sub', () => {
  it('returns 404 for an unknown user', async () => {
    callerThen('admin', 'auth0|admin', null);
    const remove = jest
      .spyOn(userEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);

    const response = await api
      .delete('/api/users/auth0%7Cghost')
      .set('Authorization', adminToken);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'not_found' });
    expect(remove).not.toHaveBeenCalled();
  });

  // userMiddleware rebuilds a user from a surviving invite on the very next
  // request, so the invite has to be gone before the user row is
  it('deletes the invite before the user', async () => {
    callerThen('admin', 'auth0|admin', {
      sub: 'auth0|member',
      email: 'bob@example.com',
    });
    const order: string[] = [];
    jest.spyOn(userEntity, 'delete').mockReturnValue({
      go: async () => {
        order.push('user');
        return { data: {} };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const removeInvite = jest.spyOn(inviteEntity, 'delete').mockReturnValue({
      go: async () => {
        order.push('invite');
        return { data: {} };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await api
      .delete('/api/users/auth0%7Cmember')
      .set('Authorization', adminToken);

    expect(response.status).toBe(204);
    expect(removeInvite).toHaveBeenCalledWith({ email: 'bob@example.com' });
    expect(order).toEqual(['invite', 'user']);
  });

  it('fails the request and keeps the user when the invite cannot be deleted', async () => {
    callerThen('admin', 'auth0|admin', {
      sub: 'auth0|member',
      email: 'bob@example.com',
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const removeUser = jest
      .spyOn(userEntity, 'delete')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    jest.spyOn(inviteEntity, 'delete').mockReturnValue({
      go: async () => {
        throw new Error('ThrottlingException');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await api
      .delete('/api/users/auth0%7Cmember')
      .set('Authorization', adminToken);

    expect(response.status).toBe(500);
    expect(removeUser).not.toHaveBeenCalled();
  });

  it('refuses a creator', async () => {
    mockCaller('creator', 'auth0|creator');

    const response = await api
      .delete('/api/users/auth0%7Cmember')
      .set('Authorization', creatorToken);

    expect(response.status).toBe(403);
  });
});
