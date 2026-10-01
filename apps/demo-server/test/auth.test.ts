process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import express, { Express } from 'express';
import supertest from 'supertest';
import {
  claimsMiddleware,
  clearUserInfoCache,
  toStatus,
  userMiddleware,
} from '../src/auth';
import { inviteEntity, userEntity } from '../src/data/entities';
/* eslint-enable import/first */

jest.mock('../src/data/client', () => ({
  getDocumentClient: () => ({ send: jest.fn() }),
  setDocumentClient: jest.fn(),
}));

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const token = (claims: Record<string, unknown>): string =>
  `${encode({ alg: 'none' })}.${encode(claims)}.signature`;

// mirrors app.ts, but lets a test inject gateway claims onto req.context
const harness = (context?: unknown): Express => {
  const app = express();
  if (context !== undefined) {
    app.use((req, _res, next) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).context = context;
      next();
    });
  }
  app.use((req, res, next) => {
    claimsMiddleware(req, res, next).catch(next);
  });
  app.use((req, res, next) => {
    userMiddleware(req, res, next).catch(next);
  });
  app.get('/me', (req, res) => {
    res.json({ ...req.user, claims: req.claims });
  });
  return app;
};

const activeUser = (overrides: Record<string, unknown> = {}) => ({
  sub: 'auth0|member',
  name: 'Bob',
  email: 'bob@example.com',
  role: 'member',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const mockUserGet = (data: Record<string, unknown> | null) =>
  jest.spyOn(userEntity, 'get').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

const mockInviteGet = (data: Record<string, unknown> | null) =>
  jest.spyOn(inviteEntity, 'get').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

beforeEach(() => {
  jest.restoreAllMocks();
  clearUserInfoCache();
});

describe('toStatus', () => {
  it('treats only an explicit revoked value as revoked', () => {
    expect(toStatus('revoked')).toBe('revoked');
    expect(toStatus('active')).toBe('active');
    expect(toStatus(undefined)).toBe('active');
    expect(toStatus('anything else')).toBe('active');
  });
});

describe('claims sources', () => {
  it('prefers claims supplied by the api gateway authorizer', async () => {
    mockUserGet(activeUser({ sub: 'auth0|gateway' }));

    const response = await supertest(
      harness({
        authorizer: {
          jwt: {
            claims: {
              sub: 'auth0|gateway',
              email: 'gw@example.com',
              email_verified: true,
              name: 'Gateway',
            },
          },
        },
      }),
    )
      .get('/me')
      .set('Authorization', `Bearer ${token({ sub: 'auth0|local' })}`);

    expect(response.status).toBe(200);
    expect(response.body.claims.sub).toBe('auth0|gateway');
  });

  it('falls back to the nickname when the claims carry no name', async () => {
    mockUserGet(null);
    mockInviteGet({ email: 'bob@example.com', role: 'member' });
    const create = jest
      .spyOn(userEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(inviteEntity, 'patch').mockReturnValue({
      set: () => ({ go: async () => ({ data: {} }) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await supertest(harness())
      .get('/me')
      .set(
        'Authorization',
        `Bearer ${token({
          sub: 'auth0|member',
          email: 'bob@example.com',
          email_verified: true,
          nickname: 'bobby',
        })}`,
      );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'bobby' }),
    );
  });

  it('rejects a malformed bearer token as unauthenticated', async () => {
    const response = await supertest(harness())
      .get('/me')
      .set('Authorization', 'Bearer not-a-jwt');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'unauthenticated' });
  });

  it('ignores an Authorization header that is not a bearer', async () => {
    const response = await supertest(harness())
      .get('/me')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(response.status).toBe(401);
  });
});

describe('/userinfo fallback', () => {
  const bare = token({ sub: 'auth0|member', name: 'Bob' });

  it('fetches the email from auth0 when the access token lacks one', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'auth0|member',
        email: 'bob@example.com',
        email_verified: true,
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    mockUserGet(null);
    mockInviteGet({ email: 'bob@example.com', role: 'member' });
    jest
      .spyOn(userEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(inviteEntity, 'patch').mockReturnValue({
      set: () => ({ go: async () => ({ data: {} }) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await supertest(harness())
      .get('/me')
      .set('Authorization', `Bearer ${bare}`);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dev-asap-hub.us.auth0.com/userinfo',
      { headers: { Authorization: `Bearer ${bare}` } },
    );
    expect(response.body.email).toBe('bob@example.com');
  });

  it('caches the userinfo response per token', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'auth0|member',
        email: 'bob@example.com',
        email_verified: true,
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    mockUserGet(activeUser());

    const app = harness();
    await supertest(app).get('/me').set('Authorization', `Bearer ${bare}`);
    await supertest(app).get('/me').set('Authorization', `Bearer ${bare}`);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses the request when auth0 rejects the userinfo call', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    mockUserGet(null);

    const response = await supertest(harness())
      .get('/me')
      .set('Authorization', `Bearer ${bare}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'not_invited' });
  });

  it('refuses the request when the userinfo call throws', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ENOTFOUND')) as unknown as typeof fetch;
    mockUserGet(null);

    const response = await supertest(harness())
      .get('/me')
      .set('Authorization', `Bearer ${bare}`);

    expect(response.status).toBe(403);
  });
});

describe('email verification', () => {
  it('accepts the string "true" as verified', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    mockUserGet(null);
    mockInviteGet({ email: 'bob@example.com', role: 'member' });
    const create = jest
      .spyOn(userEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(inviteEntity, 'patch').mockReturnValue({
      set: () => ({ go: async () => ({ data: {} }) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await supertest(harness())
      .get('/me')
      .set(
        'Authorization',
        `Bearer ${token({
          sub: 'auth0|member',
          email: 'bob@example.com',
          email_verified: 'true',
          name: 'Bob',
        })}`,
      );

    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalled();
  });

  it('lowercases the email before looking up the invite', async () => {
    mockUserGet(null);
    const inviteGet = mockInviteGet({
      email: 'bob@example.com',
      role: 'member',
    });
    jest
      .spyOn(userEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(inviteEntity, 'patch').mockReturnValue({
      set: () => ({ go: async () => ({ data: {} }) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await supertest(harness())
      .get('/me')
      .set(
        'Authorization',
        `Bearer ${token({
          sub: 'auth0|member',
          email: 'BOB@Example.COM',
          email_verified: true,
          name: 'Bob',
        })}`,
      );

    expect(inviteGet).toHaveBeenCalledWith({ email: 'bob@example.com' });
  });
});

describe('invite claiming', () => {
  it('refuses an invite already claimed by somebody else', async () => {
    mockUserGet(null);
    mockInviteGet({
      email: 'bob@example.com',
      role: 'member',
      claimedBy: { sub: 'auth0|someone-else', name: 'Eve' },
    });

    const response = await supertest(harness())
      .get('/me')
      .set(
        'Authorization',
        `Bearer ${token({
          sub: 'auth0|member',
          email: 'bob@example.com',
          email_verified: true,
          name: 'Bob',
        })}`,
      );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'not_invited' });
  });

  it('accepts an invite this same user already claimed', async () => {
    mockUserGet(null);
    mockInviteGet({
      email: 'bob@example.com',
      role: 'member',
      claimedBy: { sub: 'auth0|member', name: 'Bob' },
    });
    jest
      .spyOn(userEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(inviteEntity, 'patch').mockReturnValue({
      set: () => ({ go: async () => ({ data: {} }) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await supertest(harness())
      .get('/me')
      .set(
        'Authorization',
        `Bearer ${token({
          sub: 'auth0|member',
          email: 'bob@example.com',
          email_verified: true,
          name: 'Bob',
        })}`,
      );

    expect(response.status).toBe(200);
  });

  it('succeeds when the invite patch fails after the user was created', async () => {
    mockUserGet(null);
    mockInviteGet({ email: 'bob@example.com', role: 'member' });
    jest
      .spyOn(userEntity, 'create')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: {} }) } as any);
    jest.spyOn(inviteEntity, 'patch').mockReturnValue({
      set: () => ({
        go: async () => {
          throw new Error('ConditionalCheckFailed');
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await supertest(harness())
      .get('/me')
      .set(
        'Authorization',
        `Bearer ${token({
          sub: 'auth0|member',
          email: 'bob@example.com',
          email_verified: true,
          name: 'Bob',
        })}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('member');
  });
});

describe('concurrent first request', () => {
  const claims = token({
    sub: 'auth0|member',
    email: 'bob@example.com',
    email_verified: true,
    name: 'Bob',
  });

  it('re-reads the row that a racing request created', async () => {
    jest
      .spyOn(userEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValueOnce({ go: async () => ({ data: null }) } as any)
      .mockReturnValueOnce({
        go: async () => ({ data: activeUser() }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    mockInviteGet({ email: 'bob@example.com', role: 'member' });
    jest.spyOn(userEntity, 'create').mockReturnValue({
      go: async () => {
        throw new Error('already exists');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(inviteEntity, 'patch').mockReturnValue({
      set: () => ({ go: async () => ({ data: {} }) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await supertest(harness())
      .get('/me')
      .set('Authorization', `Bearer ${claims}`);

    expect(response.status).toBe(200);
  });

  it('refuses when the racing row turns out to be revoked', async () => {
    jest
      .spyOn(userEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValueOnce({ go: async () => ({ data: null }) } as any)
      .mockReturnValueOnce({
        go: async () => ({ data: activeUser({ status: 'revoked' }) }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    mockInviteGet({ email: 'bob@example.com', role: 'member' });
    jest.spyOn(userEntity, 'create').mockReturnValue({
      go: async () => {
        throw new Error('already exists');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const response = await supertest(harness())
      .get('/me')
      .set('Authorization', `Bearer ${claims}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'revoked' });
  });

  it('surfaces a 500 when the create failed and no row appeared', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest
      .spyOn(userEntity, 'get')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ go: async () => ({ data: null }) } as any);
    mockInviteGet({ email: 'bob@example.com', role: 'member' });
    jest.spyOn(userEntity, 'create').mockReturnValue({
      go: async () => {
        throw new Error('ThrottlingException');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const app = harness();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.use((_err: any, _req: any, res: any, _next: any) => {
      res.status(500).json({ error: 'internal' });
    });

    const response = await supertest(app)
      .get('/me')
      .set('Authorization', `Bearer ${claims}`);

    expect(response.status).toBe(500);
  });
});
