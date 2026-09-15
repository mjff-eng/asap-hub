import { getSignedCookies } from '@aws-sdk/cloudfront-signer';
import express, { Request } from 'express';
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { Role } from '../src/auth';
import { userEntity, videoEntity } from '../src/data/entities';
import { resetPrivateKeyCache } from '../src/signed-cookies';

// deployed is the only mode that signs anything, so this file runs the app the
// way CloudFront and the gateway see it rather than the local one
jest.mock('../src/config', () => ({
  ...jest.requireActual('../src/config'),
  isLocal: () => false,
  getDemoHostname: () => 'demos.example.org',
  getCloudFrontKeyPairId: () => 'KEYPAIR123',
  getCloudFrontPrivateKeyParameter: () =>
    '/demo-hub/test/cloudfront-private-key',
}));

const mockSsmSend = jest.fn();

jest.mock('@aws-sdk/client-ssm', () => {
  const actual = jest.requireActual('@aws-sdk/client-ssm');
  return {
    ...actual,
    SSMClient: jest.fn().mockImplementation(() => ({
      send: (...args: unknown[]) => mockSsmSend(...args),
    })),
  };
});

jest.mock('@aws-sdk/cloudfront-signer', () => ({
  getSignedCookies: jest.fn(),
}));

jest.mock('../src/data/client', () => ({
  getDocumentClient: () => ({ send: jest.fn() }),
  setDocumentClient: jest.fn(),
}));

const mockGetSignedCookies = getSignedCookies as jest.MockedFunction<
  typeof getSignedCookies
>;

// deployed, the gateway authorizer is what carries the caller, so the requests
// arrive the way serverless-http shapes them rather than as a local bearer
let claims: Record<string, unknown> = {};

const outer = express();
outer.use((req: Request, _res, next) => {
  req.context = {
    authorizer: { jwt: { claims } },
  } as unknown as Request['context'];
  next();
});
outer.use(appFactory());

const api = supertest(outer);

const signedIn = (role: Role) => {
  const sub = `auth0|${role}`;
  claims = { sub, email: `${role}@example.com`, email_verified: true };
  jest.spyOn(userEntity, 'get').mockReturnValue({
    go: async () => ({
      data: {
        sub,
        name: role,
        email: `${role}@example.com`,
        role,
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const mockVideoGet = (data: Record<string, unknown> | null) => {
  jest.spyOn(videoEntity, 'get').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const projectItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'project-1',
  title: 'Sprint 12 demo',
  status: 'published',
  folderId: 'ROOT',
  recordedAt: '2026-08-01T10:00:00.000Z',
  durationMs: 120_000,
  chapters: [],
  sectionCount: 2,
  createdBy: { sub: 'auth0|creator', name: 'Ana' },
  version: 3,
  kind: 'studio',
  mediaPath: 'r2',
  processingState: 'ready',
  timeline: {
    key: 'projects/project-1/timeline/4.json',
    timelineVersion: 4,
    schemaVersion: 1,
    updatedAt: '2026-08-01T10:00:00.000Z',
  },
  render: {
    renderId: 'render-1',
    state: 'done',
    timelineVersion: 4,
    purpose: 'download',
    downloadPath: 'downloads/render-1',
    taskArn: 'arn:aws:ecs:eu-west-1:111122223333:task/demo/abc',
    stage: 'encoding',
    progress: 100,
    error: 'ffmpeg: no such file',
  },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  ...overrides,
});

const policyResource = (): string => {
  const args = mockGetSignedCookies.mock.calls[0]![0];
  const policy = JSON.parse(args.policy as string);
  return policy.Statement[0].Resource as string;
};

const covers = (resource: string, url: string): boolean =>
  new RegExp(
    `^${resource
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*')}$`,
  ).test(url);

type ParsedCookie = {
  name: string;
  value: string;
  path: string;
  expired: boolean;
};

const setCookieHeader = (headers: Record<string, unknown>): string[] =>
  (headers['set-cookie'] as string[] | undefined) ?? [];

const parseSetCookie = (headers: Record<string, unknown>): ParsedCookie[] =>
  setCookieHeader(headers).map((cookie) => {
    const [name, ...rest] = cookie.split(';')[0]!.split('=');
    return {
      name: name!,
      value: rest.join('='),
      path: /Path=([^;]+)/.exec(cookie)![1]!,
      expired: /Expires=Thu, 01 Jan 1970/.test(cookie),
    };
  });

// the response also carries the headers that retire the broad cookie a viewer
// kept from before the path narrowed; those are empty and already expired, so
// the paths a caller is actually signed for are the ones left over
const cookiePaths = (headers: Record<string, unknown>): string[] =>
  parseSetCookie(headers)
    .filter(({ expired }) => !expired)
    .map(({ path }) => path);

beforeEach(() => {
  jest.restoreAllMocks();
  resetPrivateKeyCache();
  mockSsmSend.mockReset().mockResolvedValue({
    Parameter: { Value: '-----BEGIN RSA PRIVATE KEY-----' },
  });
  mockGetSignedCookies.mockReset().mockReturnValue({
    'CloudFront-Policy': 'policy-value',
    'CloudFront-Signature': 'signature-value',
    'CloudFront-Key-Pair-Id': 'KEYPAIR123',
  });
});

describe('GET /api/videos/:id', () => {
  it('keeps the render and the timeline out of what a member reads', async () => {
    signedIn('member');
    mockVideoGet(projectItem());

    const response = await api.get('/api/videos/project-1');

    expect(response.status).toBe(200);
    expect(response.body.render).toBeUndefined();
    expect(response.body.timeline).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('downloads/render-1');
    expect(JSON.stringify(response.body)).not.toContain('arn:aws:ecs');
    // what the watch page reads is untouched
    expect(response.body).toMatchObject({
      id: 'project-1',
      title: 'Sprint 12 demo',
      mediaPath: 'r2',
      sectionCount: 2,
    });
  });

  it('hands the creator the whole render map and the timeline pointer', async () => {
    signedIn('creator');
    const item = projectItem();
    mockVideoGet(item);

    const response = await api.get('/api/videos/project-1');

    expect(response.status).toBe(200);
    expect(response.body.render).toEqual(item.render);
    expect(response.body.timeline).toEqual(item.timeline);
  });
});

describe('POST /api/videos/:id/access', () => {
  it('signs a member for the published revision alone', async () => {
    signedIn('member');
    mockVideoGet(projectItem());

    const response = await api.post('/api/videos/project-1/access');

    expect(response.status).toBe(200);
    const resource = policyResource();
    expect(resource).toBe('https://demos.example.org/media/project-1/r2/*');
    expect(
      covers(
        resource,
        'https://demos.example.org/media/project-1/downloads/render-1/stream.mp4',
      ),
    ).toBe(false);
    expect(cookiePaths(response.headers)).toEqual([
      '/media/project-1/r2/',
      '/media/project-1/r2/',
      '/media/project-1/r2/',
    ]);
  });

  it('still covers the stream and the per chapter sections a member downloads', async () => {
    signedIn('member');
    mockVideoGet(projectItem());

    const response = await api.post('/api/videos/project-1/access');

    expect(response.body).toEqual({
      streamUrl: '/media/project-1/r2/stream.mp4',
      spriteUrl: '/media/project-1/r2/sprite.jpg',
      thumbnailsVttUrl: '/media/project-1/r2/thumbnails.vtt',
      sectionsBaseUrl: '/media/project-1/r2/sections',
    });

    const resource = policyResource();
    const [path] = cookiePaths(response.headers);
    [
      response.body.streamUrl,
      response.body.spriteUrl,
      response.body.thumbnailsVttUrl,
      `${response.body.sectionsBaseUrl}/0.mp4`,
      '/media/project-1/r2/thumb.jpg',
    ].forEach((url) => {
      expect(covers(resource, `https://demos.example.org${url}`)).toBe(true);
      expect(url.startsWith(path!)).toBe(true);
    });
  });

  it('signs a creator for the whole video so the studio can fetch an export', async () => {
    signedIn('creator');
    mockVideoGet(projectItem());

    const response = await api.post('/api/videos/project-1/access');

    const resource = policyResource();
    expect(resource).toBe('https://demos.example.org/media/project-1/*');
    expect(
      covers(
        resource,
        'https://demos.example.org/media/project-1/downloads/render-1/stream.mp4',
      ),
    ).toBe(true);
    expect(cookiePaths(response.headers)[0]).toBe('/media/project-1/');
  });

  it('signs the whole prefix for an upload that has no revision', async () => {
    signedIn('member');
    mockVideoGet(
      projectItem({ kind: 'upload', mediaPath: undefined, render: undefined }),
    );

    const response = await api.post('/api/videos/project-1/access');

    expect(policyResource()).toBe(
      'https://demos.example.org/media/project-1/*',
    );
    expect(cookiePaths(response.headers)[0]).toBe('/media/project-1/');
    expect(response.body.streamUrl).toBe('/media/project-1/stream.mp4');
  });

  it('retires the broad cookie a returning viewer still carries', async () => {
    signedIn('member');
    mockVideoGet(projectItem());

    const response = await api.post('/api/videos/project-1/access');

    const cookies = parseSetCookie(response.headers);
    expect(cookies.filter(({ expired }) => expired)).toEqual([
      {
        name: 'CloudFront-Policy',
        value: '',
        path: '/media/project-1/',
        expired: true,
      },
      {
        name: 'CloudFront-Signature',
        value: '',
        path: '/media/project-1/',
        expired: true,
      },
      {
        name: 'CloudFront-Key-Pair-Id',
        value: '',
        path: '/media/project-1/',
        expired: true,
      },
    ]);
    expect(cookies.filter(({ expired }) => !expired)).toEqual([
      {
        name: 'CloudFront-Policy',
        value: 'policy-value',
        path: '/media/project-1/r2/',
        expired: false,
      },
      {
        name: 'CloudFront-Signature',
        value: 'signature-value',
        path: '/media/project-1/r2/',
        expired: false,
      },
      {
        name: 'CloudFront-Key-Pair-Id',
        value: 'KEYPAIR123',
        path: '/media/project-1/r2/',
        expired: false,
      },
    ]);
  });

  it('repeats on the retiring header the attributes the broad cookie was set with', async () => {
    signedIn('member');
    mockVideoGet(projectItem());

    const response = await api.post('/api/videos/project-1/access');

    const retiring = setCookieHeader(response.headers).filter((cookie) =>
      /Expires=Thu, 01 Jan 1970/.test(cookie),
    );

    expect(retiring).toHaveLength(3);
    retiring.forEach((cookie) => {
      expect(cookie).toContain('Path=/media/project-1/;');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
    });
  });

  it('retires nothing for a creator, whose path never narrowed', async () => {
    signedIn('creator');
    mockVideoGet(projectItem());

    const response = await api.post('/api/videos/project-1/access');

    expect(
      parseSetCookie(response.headers).filter(({ expired }) => expired),
    ).toEqual([]);
    expect(setCookieHeader(response.headers)).toHaveLength(3);
  });

  it('retires nothing for an upload, whose path never narrowed either', async () => {
    signedIn('member');
    mockVideoGet(
      projectItem({ kind: 'upload', mediaPath: undefined, render: undefined }),
    );

    const response = await api.post('/api/videos/project-1/access');

    expect(
      parseSetCookie(response.headers).filter(({ expired }) => expired),
    ).toEqual([]);
    expect(setCookieHeader(response.headers)).toHaveLength(3);
  });
});
