process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import supertest from 'supertest';
import { appFactory } from '../src/app';
import { userEntity, videoEntity } from '../src/data/entities';
import { setJobRunner } from '../src/jobs/runner';
import { publishedStreamKey } from '../src/routes/reencode';
import {
  isReencodeActive,
  maxReencodeAgeMs,
  serialiseVideo,
} from '../src/routes/video-shared';
import * as storage from '../src/storage';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  objectSize: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'reencode-1' }));

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

const token = bearer({
  sub: 'auth0|someone',
  email: 'ana@example.com',
  email_verified: true,
  name: 'Ana',
});

const api = supertest(appFactory());

const mockUser = (role: 'creator' | 'member' | 'admin') => {
  jest.spyOn(userEntity, 'get').mockReturnValue({
    go: async () => ({
      data: {
        sub: 'auth0|someone',
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

const uploadItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'video-1',
  title: 'Demo Sprint 19',
  status: 'published',
  folderId: 'ROOT',
  recordedAt: '2026-09-29T12:07:00.000Z',
  durationMs: 787_203,
  chapters: [{ startMs: 0, title: 'Breadcrumb on Projects' }],
  s3Prefix: 'video-1',
  createdBy: { sub: 'auth0|diego', name: 'Diego' },
  version: 7,
  kind: 'upload',
  processingState: 'ready',
  createdAt: '2026-09-29T12:07:00.000Z',
  updatedAt: '2026-09-29T12:07:00.000Z',
  ...overrides,
});

const mockVideoGet = (data: Record<string, unknown> | null) => {
  jest.spyOn(videoEntity, 'get').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const mockExisting = (...keys: string[]) => {
  (storage.objectSize as jest.Mock).mockImplementation(async (key: string) =>
    keys.includes(key) ? 1024 : undefined,
  );
};

const conditionFailed = () =>
  new ConditionalCheckFailedException({ message: 'no', $metadata: {} });

const run = jest.fn();
const stop = jest.fn();

const reencode = (role: 'creator' | 'member' | 'admin' = 'admin') => {
  mockUser(role);
  return api.post('/api/videos/video-1/reencode').set('Authorization', token);
};

const sentInput = (call: number) => mockSend.mock.calls[call]?.[0].input;

beforeEach(() => {
  jest.restoreAllMocks();
  mockSend.mockReset().mockResolvedValue({});
  (storage.objectSize as jest.Mock).mockReset();
  run.mockReset().mockResolvedValue({ jobId: 'task-arn-1' });
  stop.mockReset().mockResolvedValue(undefined);
  setJobRunner({ run, stop });
});

afterAll(() => {
  setJobRunner(undefined);
});

describe('POST /api/videos/:id/reencode', () => {
  it.each(['creator', 'member'] as const)('refuses a %s', async (role) => {
    mockVideoGet(uploadItem());

    const response = await reencode(role);

    expect(response.status).toBe(403);
    expect(run).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('answers 404 for a video that does not exist', async () => {
    mockVideoGet(null);

    const response = await reencode();

    expect(response.status).toBe(404);
  });

  it('refuses a studio demo, which is re-rendered instead', async () => {
    mockVideoGet(uploadItem({ kind: 'studio' }));

    const response = await reencode();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'not_an_upload' });
  });

  it('refuses while the first encode is still running', async () => {
    mockVideoGet(uploadItem({ processingState: 'processing' }));

    const response = await reencode();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'processing' });
  });

  it('refuses while another re-encode is running', async () => {
    mockVideoGet(
      uploadItem({
        reencode: {
          reencodeId: 'earlier',
          state: 'queued',
          source: 'original',
          requestedAt: new Date().toISOString(),
        },
      }),
    );

    const response = await reencode();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'reencode_active' });
    expect(run).not.toHaveBeenCalled();
  });

  it('re-encodes from the original upload into its own directory', async () => {
    mockVideoGet(uploadItem());
    mockExisting('raw/video-1/original.mp4');

    const response = await reencode();

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith('encode', {
      JOB: 'encode',
      VIDEO_ID: 'video-1',
      S3_OBJECT_KEY: 'raw/video-1/original.mp4',
      REENCODE_ID: 'reencode-1',
      MEDIA_PATH: 'reencode-1',
    });
    const queued = sentInput(0);
    expect(queued.UpdateExpression).toBe('SET #reencode = :reencode');
    expect(queued.ExpressionAttributeValues[':reencode']).toEqual({
      reencodeId: 'reencode-1',
      state: 'queued',
      source: 'original',
      requestedAt: expect.any(String),
      requestedByName: 'Ana',
    });
    expect(sentInput(1).ExpressionAttributeValues[':taskArn']).toBe(
      'task-arn-1',
    );
  });

  it('leaves the published media and processing state alone when it queues', async () => {
    mockVideoGet(uploadItem({ mediaPath: 'earlier' }));
    mockExisting('raw/video-1/original.mp4');

    await reencode();

    const writes = mockSend.mock.calls.map(
      ([command]) => command.input.UpdateExpression as string,
    );
    expect(writes.join(' ')).not.toMatch(/mediaPath|processingState|version/);
  });

  it('falls back to the published stream once the original has expired', async () => {
    mockVideoGet(uploadItem({ mediaPath: 'earlier' }));
    mockExisting('media/video-1/earlier/stream.mp4');

    const response = await reencode();

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledWith(
      'encode',
      expect.objectContaining({
        S3_OBJECT_KEY: 'media/video-1/earlier/stream.mp4',
      }),
    );
    expect(sentInput(0).ExpressionAttributeValues[':reencode'].source).toBe(
      'stream',
    );
  });

  it('answers 409 when neither the original nor a stream is left', async () => {
    mockVideoGet(uploadItem());
    mockExisting();

    const response = await reencode();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'no_source' });
    expect(run).not.toHaveBeenCalled();
  });

  it('starts nothing when a concurrent request queued first', async () => {
    mockVideoGet(uploadItem());
    mockExisting('raw/video-1/original.mp4');
    mockSend.mockRejectedValueOnce(conditionFailed());

    const response = await reencode();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'reencode_active' });
    expect(run).not.toHaveBeenCalled();
  });

  it('records a job that would not start as failed', async () => {
    mockVideoGet(uploadItem());
    mockExisting('raw/video-1/original.mp4');
    run.mockRejectedValueOnce(new Error('no capacity'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await reencode();

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'reencode_start_failed' });
    expect(sentInput(1).ExpressionAttributeValues).toMatchObject({
      ':failed': 'failed',
      ':reencodeId': 'reencode-1',
    });
  });
});

describe('POST /api/videos/:id/reencode when a write goes wrong', () => {
  // a failed first encode never published a stream, so whatever sits at the
  // stream key is not a copy worth re-encoding from
  it('looks no further than the original for an upload whose encode failed', async () => {
    mockVideoGet(uploadItem({ processingState: 'failed' }));
    mockExisting('media/video-1/stream.mp4');

    const response = await reencode();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'no_source' });
    expect(storage.objectSize).toHaveBeenCalledTimes(1);
    expect(storage.objectSize).toHaveBeenCalledWith('raw/video-1/original.mp4');
  });

  it('starts nothing when queueing fails for any other reason', async () => {
    mockVideoGet(uploadItem());
    mockExisting('raw/video-1/original.mp4');
    mockSend.mockRejectedValueOnce(new Error('ThrottlingException'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await reencode();

    expect(response.status).toBe(500);
    expect(run).not.toHaveBeenCalled();
  });

  it('still answers 502 when the failure cannot be recorded either', async () => {
    mockVideoGet(uploadItem());
    mockExisting('raw/video-1/original.mp4');
    run.mockRejectedValueOnce(new Error('no capacity'));
    mockSend
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('ThrottlingException'));
    const logged = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const response = await reencode();

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'reencode_start_failed' });
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(logged).toHaveBeenCalledWith(
      'could not start the re-encode job for video-1',
      expect.any(Error),
    );
  });

  // a later re-encode owns the row by then, so its own task arn must stay
  it('leaves the task arn off a row a later re-encode already took', async () => {
    mockVideoGet(uploadItem());
    mockExisting('raw/video-1/original.mp4');
    mockSend.mockResolvedValueOnce({}).mockRejectedValueOnce(conditionFailed());

    const response = await reencode();

    expect(response.status).toBe(200);
    expect(response.body.video.id).toBe('video-1');
    expect(sentInput(1).ConditionExpression).toContain(':reencodeId');
  });

  it('fails when the task arn cannot be written for any other reason', async () => {
    mockVideoGet(uploadItem());
    mockExisting('raw/video-1/original.mp4');
    mockSend
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('ThrottlingException'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await reencode();

    expect(response.status).toBe(500);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe('isReencodeActive', () => {
  const now = Date.parse('2026-10-12T15:00:00.000Z');
  const queuedAt = (ms: number) => ({
    reencodeId: 'r',
    state: 'queued' as const,
    source: 'original' as const,
    requestedAt: new Date(ms).toISOString(),
  });

  it('counts a recent queued re-encode as active', () => {
    expect(isReencodeActive(queuedAt(now - 60_000), now)).toBe(true);
  });

  it('lets a re-encode whose task never reported age out', () => {
    expect(isReencodeActive(queuedAt(now - maxReencodeAgeMs - 1), now)).toBe(
      false,
    );
  });

  it('measures the age against the current time by default', () => {
    expect(isReencodeActive(queuedAt(Date.now() - 60_000))).toBe(true);
    expect(isReencodeActive(queuedAt(Date.now() - maxReencodeAgeMs - 1))).toBe(
      false,
    );
  });

  it('does not count a finished one', () => {
    expect(isReencodeActive({ ...queuedAt(now), state: 'done' }, now)).toBe(
      false,
    );
  });
});

describe('serialiseVideo', () => {
  const item = uploadItem({
    reencode: {
      reencodeId: 'r',
      state: 'queued',
      source: 'original',
      requestedAt: '2026-10-12T15:00:00.000Z',
      taskArn: 'arn:aws:ecs:us-east-1:1:task/demo/abc',
      stage: 'upload',
    },
  });

  it('keeps the re-encode from members', () => {
    expect(serialiseVideo(item)).not.toHaveProperty('reencode');
  });

  it('shows it to creators without the task arn', () => {
    expect(serialiseVideo(item, true).reencode).toEqual({
      reencodeId: 'r',
      state: 'queued',
      source: 'original',
      requestedAt: '2026-10-12T15:00:00.000Z',
    });
  });
});

describe('publishedStreamKey', () => {
  it('reads the revision directory when the row names one', () => {
    expect(publishedStreamKey('video-1', 'r2')).toBe(
      'media/video-1/r2/stream.mp4',
    );
  });

  it('reads the top of the prefix for a first encode', () => {
    expect(publishedStreamKey('video-1')).toBe('media/video-1/stream.mp4');
  });
});
