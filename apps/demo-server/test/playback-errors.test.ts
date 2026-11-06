process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { userEntity } from '../src/data/entities';
/* eslint-enable import/first */

jest.mock('../src/data/client', () => ({
  getDocumentClient: () => ({ send: jest.fn() }),
  setDocumentClient: jest.fn(),
}));

const bearer = (claims: Record<string, unknown>): string => {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `Bearer ${encode({ alg: 'none' })}.${encode(claims)}.signature`;
};

const token = bearer({
  sub: 'auth0|viewer',
  email: 'gabi@example.com',
  email_verified: true,
  name: 'Gabi',
});

const api = supertest(appFactory());

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(userEntity, 'get').mockReturnValue({
    go: async () => ({
      data: {
        sub: 'auth0|viewer',
        name: 'Gabi',
        email: 'gabi@example.com',
        role: 'member',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
});

describe('POST /api/videos/:id/playback-errors', () => {
  it('logs what the browser reported for the viewer and video', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await api
      .post('/api/videos/video-1/playback-errors')
      .set('Authorization', token)
      .send({
        code: 3,
        message: 'PIPELINE_ERROR_DECODE: video decode failed',
        userAgent: 'Chrome/154',
      });

    expect(response.status).toBe(204);
    expect(JSON.parse(warn.mock.calls[0]?.[0] as string)).toEqual({
      event: 'playback_error',
      videoId: 'video-1',
      sub: 'auth0|viewer',
      role: 'member',
      code: 3,
      message: 'PIPELINE_ERROR_DECODE: video decode failed',
      userAgent: 'Chrome/154',
    });
  });

  it('refuses a body that is not a media error', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await api
      .post('/api/videos/video-1/playback-errors')
      .set('Authorization', token)
      .send({ code: 'bad', message: 'x'.repeat(600) });

    expect(response.status).toBe(400);
    expect(warn).not.toHaveBeenCalled();
  });
});
