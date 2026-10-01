process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import {
  buildRenderPlan,
  createEmptyTimeline,
  Timeline,
} from '@asap-hub/demo-timeline';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import supertest from 'supertest';
import {
  AssetRow,
  clipConcurrency,
  scheduledSteps,
  sectionSpans,
  claimUploadArgs,
  conditionFailed,
  finishProgress,
  formatTimestamp,
  inPool,
  maxRasterisers,
  parseProgressMs,
  parseRenderEnv,
  renderProgress,
  renderTagging,
  tagObjectArgs,
  untagObjectArgs,
  spriteGrid,
  svgSourcePath,
  thumbnailsVtt,
  timelineAssetIds,
  toAssetRow,
  toRenderAssets,
  unmarshalItem,
  videoUpdateArgs,
} from '../encoder/render';
import { appFactory } from '../src/app';
import { assetEntity, userEntity, videoEntity } from '../src/data/entities';
import { setJobRunner } from '../src/jobs/runner';
import { isRenderActive, maxRenderAgeMs } from '../src/routes/render';
import * as storage from '../src/storage';
/* eslint-enable import/first */

jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  putObject: jest.fn(),
  getObjectText: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'generated-render-id' }));

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

const projectItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'project-1',
  title: 'Sprint 12 demo',
  status: 'draft',
  folderId: 'ROOT',
  recordedAt: '2026-08-01T10:00:00.000Z',
  durationMs: 0,
  chapters: [],
  s3Prefix: 'project-1',
  createdBy: { sub: 'auth0|creator', name: 'Ana' },
  version: 3,
  kind: 'studio',
  processingState: 'empty',
  lockedBy: 'auth0|creator',
  lockedByName: 'Ana',
  lockExpiresAt: Date.now() + 60_000,
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

const mockVideoGet = (data: Record<string, unknown> | null) => {
  jest.spyOn(videoEntity, 'get').mockReturnValue({
    go: async () => ({ data }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

// a cancel that loses the version race rereads the row, so the second read has
// to hand back what the container wrote in between
const mockVideoGets = (...items: Record<string, unknown>[]) => {
  let call = 0;
  jest.spyOn(videoEntity, 'get').mockReturnValue({
    go: async () => ({ data: items[Math.min(call++, items.length - 1)] }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const timelineWithClip = (): Timeline => ({
  ...createEmptyTimeline(),
  clips: [
    {
      kind: 'source',
      id: 'clip-1',
      assetId: 'asset-1',
      inMs: 0,
      outMs: 5000,
      volume: 1,
    },
  ],
});

const run = jest.fn();
const stop = jest.fn();

// the start gate refuses assets the ingest has not finished with, so the
// default harness owns one ready asset matching timelineWithClip
const mockOwnedAssets = (
  ...assetsOwned: { assetId: string; state: string }[]
) => {
  jest.spyOn(assetEntity.query, 'byVideo').mockReturnValue({
    go: async () => ({ data: assetsOwned }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const setValue = (call: number, name: string): unknown =>
  mockSend.mock.calls[call]?.[0].input.ExpressionAttributeValues[`:${name}`];

beforeEach(() => {
  jest.restoreAllMocks();
  mockSend.mockReset().mockResolvedValue({});
  (storage.putObject as jest.Mock).mockReset().mockResolvedValue(undefined);
  (storage.getObjectText as jest.Mock)
    .mockReset()
    .mockResolvedValue(JSON.stringify(timelineWithClip()));
  run.mockReset().mockResolvedValue({ jobId: 'task-arn-1' });
  stop.mockReset().mockResolvedValue(undefined);
  setJobRunner({ run, stop });
  mockOwnedAssets({ assetId: 'asset-1', state: 'ready' });
});

afterAll(() => {
  setJobRunner(undefined);
});

describe('POST /api/projects/:id/render', () => {
  const start = (body: Record<string, unknown> = { version: 3 }) =>
    api
      .post('/api/projects/project-1/render')
      .set('Authorization', creatorToken)
      .send(body);

  it('snapshots the timeline and queues the render', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    const response = await start();

    expect(response.status).toBe(200);
    expect(storage.putObject).toHaveBeenCalledWith(
      'projects/project-1/renders/generated-render-id/timeline.json',
      JSON.stringify(timelineWithClip()),
      'application/json',
      'lifecycle=render',
    );
    expect(setValue(0, 'render')).toMatchObject({
      renderId: 'generated-render-id',
      state: 'queued',
      timelineVersion: 4,
      progress: 0,
    });
    expect(setValue(0, 'expectedVersion')).toBe(3);
  });

  it('starts the render job and records the task it started', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ mediaPath: 'an-earlier-render' }));

    await start();

    // the output directory is the render id: a cancelled or failed run leaves
    // mediaPath where it was, so anything derived from the last success would
    // hand the next render a directory a task still running could overwrite
    expect(run).toHaveBeenCalledWith('render', {
      JOB: 'render',
      VIDEO_ID: 'project-1',
      RENDER_ID: 'generated-render-id',
      TIMELINE_KEY:
        'projects/project-1/renders/generated-render-id/timeline.json',
      MEDIA_PATH: 'generated-render-id',
    });
    // the render map this request built is already stale by now: the container
    // may have written progress into it, so only taskArn moves, and only while
    // the row still names this run
    const tracked = mockSend.mock.calls[1]![0].input;
    expect(tracked.UpdateExpression).toBe(
      'SET #render.#taskArn = :taskArn ADD #version :one',
    );
    expect(tracked.ConditionExpression).toBe(
      '#render.#renderId = :renderId AND #render.#state IN (:queued, :rendering)',
    );
    expect(tracked.ExpressionAttributeValues).toEqual({
      ':taskArn': 'task-arn-1',
      ':renderId': 'generated-render-id',
      ':queued': 'queued',
      ':rendering': 'rendering',
      ':one': 1,
    });
  });

  // a cancel strips the arn from the render it belonged to; re-attaching it
  // would hand the next cancel a task that is already being stopped
  it('will not re-attach the arn to a render the cancel already ended', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    await start();

    const tracked = mockSend.mock.calls[1]![0].input;
    expect(tracked.ExpressionAttributeNames['#state']).toBe('state');
    expect(tracked.ConditionExpression).toContain(
      '#render.#state IN (:queued, :rendering)',
    );
  });

  it('still answers when the row no longer names the render', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSend.mockResolvedValueOnce({}).mockRejectedValueOnce(
      new ConditionalCheckFailedException({
        message: 'The conditional request failed',
        $metadata: {},
      }),
    );

    const response = await start();

    expect(response.status).toBe(200);
  });

  // Chapters describe the media, so they land with it. Writing them when the
  // export was queued retitled a published demo before the render existed, and
  // left it retitled if that render then failed.
  it('leaves the published chapters alone until the render lands', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    const timeline = timelineWithClip();
    (storage.getObjectText as jest.Mock).mockResolvedValue(
      JSON.stringify({
        ...timeline,
        clips: [
          ...timeline.clips,
          {
            kind: 'title',
            id: 'title-1',
            preset: 'centered',
            text: 'Part two',
            durationMs: 2000,
          },
        ],
      }),
    );

    await start();

    expect(setValue(0, 'chapters')).toBeUndefined();
  });

  it('refuses a second render while one is active', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(
      projectItem({
        render: {
          renderId: 'render-0',
          state: 'rendering',
          timelineVersion: 4,
        },
      }),
    );

    const response = await start();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'render_active' });
    expect(run).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  // recordFailure only runs if the process survives, so a killed task leaves
  // 'rendering' behind for ever and every later export would 409 on it
  it('starts again once an active render is too old to still be running', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(
      projectItem({
        render: {
          renderId: 'render-0',
          state: 'rendering',
          timelineVersion: 4,
          requestedAt: new Date(
            Date.now() - maxRenderAgeMs - 1000,
          ).toISOString(),
        },
      }),
    );

    const response = await start();

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalled();
  });

  it('starts again once the last render finished', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(
      projectItem({
        render: { renderId: 'render-0', state: 'failed', timelineVersion: 4 },
      }),
    );

    const response = await start();

    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalled();
  });

  it('refuses to export while a clip is still being prepared', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    mockOwnedAssets({ assetId: 'asset-1', state: 'preparing' });

    const response = await start();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'asset_not_ready' });
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a timeline with no clips', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    (storage.getObjectText as jest.Mock).mockResolvedValue(
      JSON.stringify(createEmptyTimeline()),
    );

    const response = await start();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'empty_timeline' });
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a project that has no timeline revision at all', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ timeline: undefined }));

    const response = await start();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'empty_timeline' });
  });

  it('marks the render failed when the job cannot be started', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    run.mockRejectedValue(new Error('no capacity'));

    const response = await start();

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'render_start_failed' });
    expect(setValue(1, 'render')).toMatchObject({ state: 'failed' });
  });

  it('is not found for a plain upload', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem({ kind: 'upload' }));

    expect((await start()).status).toBe(404);
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .post('/api/projects/project-1/render')
      .set('Authorization', memberToken)
      .send({ version: 3 });

    expect(response.status).toBe(403);
    expect(run).not.toHaveBeenCalled();
  });
});

// a download renders the picked cut into its own directory and must never
// touch the published media, so the container is told what it is making
describe('POST /api/projects/:id/render with picked clips', () => {
  const twoClips = (): Timeline => ({
    ...createEmptyTimeline(),
    clips: [
      {
        kind: 'source',
        id: 'clip-1',
        assetId: 'asset-1',
        inMs: 0,
        outMs: 5000,
        volume: 1,
      },
      {
        kind: 'source',
        id: 'clip-2',
        assetId: 'asset-1',
        inMs: 1000,
        outMs: 4000,
        volume: 1,
        transitionIn: { type: 'crossfade', durationMs: 500 },
      },
    ],
  });

  const start = (body: Record<string, unknown>) =>
    api
      .post('/api/projects/project-1/render')
      .set('Authorization', creatorToken)
      .send(body);

  beforeEach(() => {
    (storage.getObjectText as jest.Mock)
      .mockReset()
      .mockResolvedValue(JSON.stringify(twoClips()));
  });

  it('snapshots only the picked cut and marks the render a download', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    const response = await start({ version: 3, clipIds: ['clip-2'] });

    expect(response.status).toBe(200);
    const snapshot = JSON.parse(
      (storage.putObject as jest.Mock).mock.calls[0]![1] as string,
    ) as Timeline;
    expect(snapshot.clips).toHaveLength(1);
    expect(snapshot.clips[0]).toMatchObject({ id: 'clip-2' });
    // a blend with a clip that is not in the cut has nothing to blend with
    expect(snapshot.clips[0]).not.toHaveProperty('transitionIn');
    expect(setValue(0, 'render')).toMatchObject({
      renderId: 'generated-render-id',
      state: 'queued',
      purpose: 'download',
    });
    expect(run).toHaveBeenCalledWith('render', {
      JOB: 'render',
      VIDEO_ID: 'project-1',
      RENDER_ID: 'generated-render-id',
      TIMELINE_KEY:
        'projects/project-1/renders/generated-render-id/timeline.json',
      MEDIA_PATH: 'downloads/generated-render-id',
      PURPOSE: 'download',
    });
  });

  // 200 banners is legal whole, but splitting each at the pick gap makes 400
  it('refuses a cut that splitting pushed over the document limits', async () => {
    const overfull: Timeline = {
      ...twoClips(),
      clips: [
        ...twoClips().clips.map((clip, at) =>
          at === 1 ? { ...clip, transitionIn: undefined } : clip,
        ),
        {
          kind: 'source',
          id: 'clip-3',
          assetId: 'asset-1',
          inMs: 0,
          outMs: 2000,
          volume: 1,
        },
      ],
      banners: Array.from({ length: 200 }, (unused, at) => ({
        id: `banner-${at}`,
        startMs: 0,
        durationMs: 9000,
        preset: 'lowerThird' as const,
        text: 'Spans everything',
        position: 'bottom' as const,
        animation: 'fade' as const,
      })),
    };
    (storage.getObjectText as jest.Mock)
      .mockReset()
      .mockResolvedValue(JSON.stringify(overfull));
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    const response = await start({ version: 3, clipIds: ['clip-1', 'clip-3'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'invalid_cut' });
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a pick naming a clip the timeline does not have', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(projectItem());

    const response = await start({ version: 3, clipIds: ['clip-gone'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'unknown_clip' });
    expect(run).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/projects/:id/render', () => {
  const cancel = () =>
    api
      .delete('/api/projects/project-1/render')
      .set('Authorization', creatorToken)
      .send({ version: 3 });

  const rendering = (
    overrides: Record<string, unknown> = {},
    projectOverrides: Record<string, unknown> = {},
  ) =>
    projectItem({
      render: {
        renderId: 'render-0',
        state: 'rendering',
        timelineVersion: 4,
        taskArn: 'task-arn-1',
        ...overrides,
      },
      ...projectOverrides,
    });

  const conditionFailure = (item: Record<string, unknown>) =>
    new ConditionalCheckFailedException({
      message: 'The conditional request failed',
      $metadata: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Item: item as any,
    });

  it('stops the job and cancels the render', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(rendering());

    const response = await cancel();

    expect(response.status).toBe(200);
    expect(stop).toHaveBeenCalledWith('task-arn-1');
    expect(setValue(0, 'render')).toMatchObject({
      renderId: 'render-0',
      state: 'cancelled',
    });
  });

  // stopping first left the task dead and the row still 'rendering' whenever
  // the guarded write lost the version race, and every later export then
  // answered render_active until the row aged out
  it('records the cancellation before it stops the task', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(rendering());

    await cancel();

    expect(mockSend.mock.invocationCallOrder[0]!).toBeLessThan(
      stop.mock.invocationCallOrder[0]!,
    );
  });

  it('keeps cancelling against the version the container moved to', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGets(rendering(), rendering({ progress: 40 }, { version: 5 }));
    mockSend
      .mockRejectedValueOnce(
        conditionFailure({
          lockedBy: 'auth0|creator',
          lockedByName: 'Ana',
          lockExpiresAt: Date.now() + 60_000,
        }),
      )
      .mockResolvedValue({});

    const response = await cancel();

    expect(response.status).toBe(200);
    expect(setValue(0, 'expectedVersion')).toBe(3);
    expect(setValue(1, 'expectedVersion')).toBe(5);
    expect(setValue(1, 'render')).toMatchObject({ state: 'cancelled' });
    expect(stop).toHaveBeenCalledWith('task-arn-1');
  });

  it('leaves the task alone when the cancellation cannot be recorded', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(rendering());
    mockSend.mockRejectedValue(
      conditionFailure({
        lockedBy: 'auth0|other',
        lockedByName: 'Bob',
        lockExpiresAt: Date.now() + 60_000,
      }),
    );

    const response = await cancel();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'locked', holderName: 'Bob' });
    expect(stop).not.toHaveBeenCalled();
  });

  // nothing is left to stop, and a stop against a reused arn would be someone
  // else's task
  it('drops the task it cancelled from the row', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(rendering());

    await cancel();

    expect(setValue(0, 'render')).not.toHaveProperty('taskArn');
  });

  it('cancels even when the task can no longer be stopped', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(rendering());
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    stop.mockRejectedValue(new Error('task already stopped'));

    const response = await cancel();

    expect(response.status).toBe(200);
    expect(setValue(0, 'render')).toMatchObject({ state: 'cancelled' });
  });

  it('refuses to cancel a render that is not running', async () => {
    mockUser('creator', 'auth0|creator');
    mockVideoGet(rendering({ state: 'done' }));

    const response = await cancel();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'render_inactive' });
    expect(stop).not.toHaveBeenCalled();
  });

  it('refuses a member', async () => {
    mockUser('member', 'auth0|member');

    const response = await api
      .delete('/api/projects/project-1/render')
      .set('Authorization', memberToken)
      .send({ version: 3 });

    expect(response.status).toBe(403);
    expect(stop).not.toHaveBeenCalled();
  });
});

describe('isRenderActive', () => {
  const now = Date.parse('2026-08-01T12:00:00.000Z');
  const at = (offsetMs: number) => new Date(now - offsetMs).toISOString();

  it('counts a render the container is still plausibly running', () => {
    expect(
      isRenderActive(
        {
          renderId: 'render-0',
          state: 'rendering',
          timelineVersion: 4,
          requestedAt: at(60_000),
        },
        now,
      ),
    ).toBe(true);
  });

  // a task killed before it could report leaves 'rendering' on the row for
  // ever, and every later export would answer render_active off it
  it('counts one older than the longest render could be as over', () => {
    expect(
      isRenderActive(
        {
          renderId: 'render-0',
          state: 'rendering',
          timelineVersion: 4,
          requestedAt: at(maxRenderAgeMs + 1000),
        },
        now,
      ),
    ).toBe(false);
  });

  it('leaves a render with no requestedAt alone', () => {
    expect(
      isRenderActive(
        { renderId: 'render-0', state: 'queued', timelineVersion: 4 },
        now,
      ),
    ).toBe(true);
  });

  it('is false for a render that finished and for no render at all', () => {
    expect(
      isRenderActive(
        {
          renderId: 'render-0',
          state: 'done',
          timelineVersion: 4,
          requestedAt: at(0),
        },
        now,
      ),
    ).toBe(false);
    expect(isRenderActive(undefined, now)).toBe(false);
  });
});

describe('the writes the container makes', () => {
  const env = {
    videoId: 'project-1',
    renderId: 'render-1',
    timelineKey: 'projects/project-1/renders/render-1/timeline.json',
    mediaPath: 'r1',
    purpose: 'demo' as const,
    bucket: 'bucket',
    table: 'table',
    s3Endpoint: undefined,
    dynamodbEndpoint: undefined,
    workDir: '/scratch',
  };

  // the row changes materially on every one of these, and version is what the
  // editor reads to decide whether its copy is still current
  it('bumps the version alongside whatever it is writing', () => {
    const args = videoUpdateArgs(
      env,
      'SET #render.#state = :state',
      { '#state': 'state' },
      { ':state': { S: 'rendering' } },
    );

    const expression = args[args.indexOf('--update-expression') + 1];
    expect(expression).toBe('SET #render.#state = :state ADD #version :one');
    expect(
      JSON.parse(args[args.indexOf('--expression-attribute-names') + 1]!),
    ).toMatchObject({ '#version': 'version' });
    expect(
      JSON.parse(args[args.indexOf('--expression-attribute-values') + 1]!),
    ).toMatchObject({ ':one': { N: '1' } });
  });

  it('stays conditional on the item naming this run', () => {
    const args = videoUpdateArgs(env, 'SET durationMs = :d', {}, {});
    expect(args[args.indexOf('--condition-expression') + 1]).toBe(
      '#render.#renderId = :renderId AND #render.#state IN (:queued, :rendering)',
    );
  });

  // a task the cancel could not stop keeps rendering, and the completion write
  // would otherwise publish the export the creator called off
  it('refuses to write once the render is no longer waiting on it', () => {
    const args = videoUpdateArgs(
      env,
      'SET mediaPath = :mediaPath',
      {},
      { ':mediaPath': { S: 'r2' } },
    );

    expect(
      JSON.parse(args[args.indexOf('--expression-attribute-names') + 1]!),
    ).toMatchObject({ '#state': 'state' });
    expect(
      JSON.parse(args[args.indexOf('--expression-attribute-values') + 1]!),
    ).toMatchObject({
      ':queued': { S: 'queued' },
      ':rendering': { S: 'rendering' },
    });
  });
});

describe('parseRenderEnv', () => {
  const complete = {
    VIDEO_ID: 'project-1',
    RENDER_ID: 'render-1',
    TIMELINE_KEY: 'projects/project-1/renders/render-1/timeline.json',
    MEDIA_PATH: 'r1',
    BUCKET_NAME: 'bucket',
    TABLE_NAME: 'table',
  };

  it('defaults the work directory and leaves the endpoints unset', () => {
    expect(parseRenderEnv(complete)).toEqual({
      videoId: 'project-1',
      renderId: 'render-1',
      timelineKey: 'projects/project-1/renders/render-1/timeline.json',
      mediaPath: 'r1',
      purpose: 'demo',
      bucket: 'bucket',
      table: 'table',
      s3Endpoint: undefined,
      dynamodbEndpoint: undefined,
      workDir: '/scratch',
    });
  });

  it('reads a download purpose off the environment', () => {
    expect(parseRenderEnv({ ...complete, PURPOSE: 'download' }).purpose).toBe(
      'download',
    );
  });

  it('takes the local endpoint overrides', () => {
    expect(
      parseRenderEnv({
        ...complete,
        S3_ENDPOINT: 'http://localhost:9010',
        DYNAMODB_ENDPOINT: 'http://localhost:8000',
        WORK_DIR: '/out',
      }),
    ).toMatchObject({
      s3Endpoint: 'http://localhost:9010',
      dynamodbEndpoint: 'http://localhost:8000',
      workDir: '/out',
    });
  });

  it.each(Object.keys(complete))('requires %s', (name) => {
    expect(() => parseRenderEnv({ ...complete, [name]: undefined })).toThrow(
      name,
    );
  });
});

// the assemble step reads the tiles the pool writes, the cuts and blends read
// the assembled clip and the join reads them, so pooling any of them alongside
// its inputs fails the render
describe('scheduledSteps', () => {
  it('keeps the assemble and the join out of the pool, in plan order', () => {
    const plan = buildRenderPlan({
      timeline: {
        ...createEmptyTimeline(),
        clips: [
          {
            kind: 'source',
            id: 'clip-long',
            assetId: 'asset-long',
            inMs: 0,
            outMs: 200_000,
            volume: 1,
          },
          {
            kind: 'source',
            id: 'clip-next',
            assetId: 'asset-long',
            inMs: 0,
            outMs: 30_000,
            volume: 1,
            transitionIn: { type: 'crossfade', durationMs: 1000 },
          },
        ],
      },
      assets: [
        {
          assetId: 'asset-long',
          path: '/media/long.mp4',
          durationMs: 200_000,
          hasAudio: true,
        },
      ],
      workDir: '/work',
      output: '/work/out.mp4',
    });

    const { pooled, serial } = scheduledSteps(plan.steps);
    expect(pooled.every(({ step }) => step.label.startsWith('clip'))).toBe(
      true,
    );
    expect(serial.map(({ step }) => step.label)).toEqual([
      'assemble clip 0 from 4 tiles',
      'cut clip 0 for the join',
      'blend clip 0 into clip 1',
      'cut clip 1 for the join',
      'join 2 clips (segments)',
    ]);
    expect(serial.map(({ index }) => index)).toEqual(
      [...serial.map(({ index }) => index)].sort((a, b) => a - b),
    );
  });
});

describe('renderProgress', () => {
  it('shares the first 70% between the clips', () => {
    expect(renderProgress(0, 3, 0)).toBe(0);
    expect(renderProgress(0, 3, 1)).toBe(35);
    expect(renderProgress(1, 3, 0.5)).toBe(53);
    expect(renderProgress(1, 3, 1)).toBe(70);
  });

  it('gives the join 25% and the finishing stage the last 5%', () => {
    expect(renderProgress(2, 3, 0)).toBe(70);
    expect(renderProgress(2, 3, 1)).toBe(95);
    expect(finishProgress(0)).toBe(95);
    expect(finishProgress(1)).toBe(100);
  });

  it('never leaves the range a percentage lives in', () => {
    expect(renderProgress(0, 2, -1)).toBe(0);
    expect(renderProgress(1, 2, 4)).toBe(95);
    expect(renderProgress(0, 2, Number.NaN)).toBe(0);
  });
});

describe('parseProgressMs', () => {
  it('reads the last out_time of a chunk', () => {
    expect(
      parseProgressMs(
        [
          'out_time=00:00:01.500000',
          'progress=continue',
          'out_time=00:01:02.250000',
          'progress=continue',
        ].join('\n'),
      ),
    ).toBe(62250);
  });

  it('ignores a chunk that carries no out_time', () => {
    expect(parseProgressMs('frame=12\nfps=30\nprogress=continue')).toBe(
      undefined,
    );
  });
});

describe('the sprite sheet', () => {
  it('lays one tile per interval out in rows of ten', () => {
    expect(spriteGrid(95_000)).toEqual({
      tileCount: 95,
      columns: 10,
      rows: 10,
      intervalSeconds: 1,
    });
    expect(spriteGrid(0)).toEqual({
      tileCount: 1,
      columns: 1,
      rows: 1,
      intervalSeconds: 1,
    });
  });

  // a fixed ten second interval left a ten second demo with a single tile, so
  // the scrub preview showed one frame from end to end
  it('samples a short demo closely and a long one sparsely', () => {
    expect(spriteGrid(10_000).intervalSeconds).toBe(1);
    expect(spriteGrid(4 * 60 * 60 * 1000)).toMatchObject({
      tileCount: 100,
      intervalSeconds: 144,
    });
  });

  it('formats a timestamp the way WebVTT wants it', () => {
    expect(formatTimestamp(0)).toBe('00:00:00.000');
    expect(formatTimestamp(3_723_456)).toBe('01:02:03.456');
  });

  it('maps each cue to its tile, clipped to the real duration', () => {
    expect(
      thumbnailsVtt({
        tileCount: 2,
        columns: 10,
        rows: 1,
        tileHeight: 90,
        durationMs: 15_000,
        intervalSeconds: 10,
      }),
    ).toBe(
      [
        'WEBVTT',
        '',
        '00:00:00.000 --> 00:00:10.000',
        'sprite.jpg#xywh=0,0,160,90',
        '',
        '00:00:10.000 --> 00:00:15.000',
        'sprite.jpg#xywh=160,0,160,90',
        '',
        '',
      ].join('\n'),
    );
  });
});

describe('the assets a plan needs', () => {
  const item = {
    assetId: { S: 'asset-1' },
    key: { S: 'projects/project-1/assets/asset-1/original.webm' },
    proxyKey: { S: 'projects/project-1/assets/asset-1/proxy.mp4' },
    durationMs: { N: '5000' },
    width: { N: '1920' },
    height: { N: '1080' },
    fps: { N: '30' },
    hasAudio: { BOOL: false },
  };

  it('unmarshals what the aws cli hands back', () => {
    expect(unmarshalItem(item)).toMatchObject({
      assetId: 'asset-1',
      durationMs: 5000,
      hasAudio: false,
    });
  });

  it('needs an id and a key to make a row', () => {
    expect(toAssetRow(unmarshalItem(item))).toEqual({
      assetId: 'asset-1',
      key: 'projects/project-1/assets/asset-1/original.webm',
      durationMs: 5000,
      width: 1920,
      height: 1080,
      fps: 30,
      hasAudio: false,
    });
    expect(toAssetRow({ assetId: 'asset-1' })).toBe(undefined);
  });

  it('collects every asset the timeline references, once', () => {
    const timeline = timelineWithClip();
    expect(
      timelineAssetIds({
        ...timeline,
        clips: [...timeline.clips, ...timeline.clips],
        narration: [
          {
            id: 'take-1',
            assetId: 'asset-2',
            startMs: 0,
            inMs: 0,
            outMs: 1000,
            volume: 1,
          },
        ],
      }),
    ).toEqual(['asset-1', 'asset-2']);
  });

  it('renders the original, not the proxy, and drops what nothing references', () => {
    const rows: AssetRow[] = [
      { assetId: 'asset-1', key: 'a/original.webm', durationMs: 5000 },
      { assetId: 'asset-2', key: 'b/original.webm' },
    ];

    expect(
      toRenderAssets(rows, ['asset-1'], (assetId) => `/scratch/${assetId}`),
    ).toEqual([
      {
        assetId: 'asset-1',
        path: '/scratch/asset-1',
        durationMs: 5000,
        width: undefined,
        height: undefined,
        fps: undefined,
        hasAudio: undefined,
      },
    ]);
  });

  it('writes each overlay svg next to the png it rasterises to', () => {
    expect(svgSourcePath('/scratch/title-0.png')).toBe('/scratch/title-0.svg');
  });
});

// a clip may ask for sixty click rings at once, and one rsvg-convert per ring
// at once put a two core task into swap
describe('the rasteriser pool', () => {
  const settle = () => new Promise((resolve) => setImmediate(resolve));

  it('never runs more than the cap at once', async () => {
    let running = 0;
    let most = 0;
    await inPool(maxRasterisers, [...Array(20).keys()], async () => {
      running += 1;
      most = Math.max(most, running);
      await settle();
      running -= 1;
    });

    expect(most).toBe(maxRasterisers);
  });

  it('runs every item exactly once', async () => {
    const seen: number[] = [];
    await inPool(3, [...Array(10).keys()], async (item) => {
      await settle();
      seen.push(item);
    });

    expect([...seen].sort((a, b) => a - b)).toEqual([...Array(10).keys()]);
  });

  it('opens no workers for an empty list', async () => {
    const work = jest.fn();
    await inPool(4, [], work);

    expect(work).not.toHaveBeenCalled();
  });

  it('reports the first failure', async () => {
    await expect(
      inPool(2, [1, 2, 3], async (item) => {
        if (item === 2) {
          throw new Error('no such file');
        }
      }),
    ).rejects.toThrow('no such file');
  });
});

/* a cancelled render leaving nothing behind */

describe('the media a render uploads', () => {
  const env = parseRenderEnv({
    VIDEO_ID: 'video-1',
    RENDER_ID: 'render-1',
    TIMELINE_KEY: 'projects/video-1/renders/render-1/timeline.json',
    MEDIA_PATH: 'render-1',
    BUCKET_NAME: 'demo-hub-storage',
    TABLE_NAME: 'demo-hub-data',
  });

  // the media set runs to tens of megabytes, and it used to be written before
  // anything asked the row whether the render was still wanted
  it('claims the row on the same condition every other write makes', () => {
    const args = claimUploadArgs(env);

    expect(args.join(' ')).toContain(
      '#render.#renderId = :renderId AND #render.#state IN (:queued, :rendering)',
    );
    expect(args.join(' ')).toContain('SET #render.#stage = :stage');
    expect(args.join(' ')).toContain('"#stage":"stage"');
    expect(args.join(' ')).toContain('":renderId":{"S":"render-1"}');
  });

  it('reads a lost condition apart from a write that simply failed', () => {
    expect(
      conditionFailed(
        new Error(
          'aws exited 254: An error occurred (ConditionalCheckFailedException) when calling the UpdateItem operation',
        ),
      ),
    ).toBe(true);
    expect(conditionFailed(new Error('aws exited 1: Connection refused'))).toBe(
      false,
    );
  });

  it('tags each object with the lifecycle the timeline snapshot carries', () => {
    expect(tagObjectArgs(env, 'media/video-1/render-1/stream.mp4')).toEqual([
      'put-object-tagging',
      '--bucket',
      'demo-hub-storage',
      '--key',
      'media/video-1/render-1/stream.mp4',
      '--tagging',
      renderTagging,
    ]);
    expect(renderTagging).toContain('Key=lifecycle,Value=render');
  });

  // the bucket rule filters on that tag with no prefix at all, so media left
  // carrying it would be deleted thirty days after it was published
  it('strips the tag again once the media is the one being published', () => {
    expect(untagObjectArgs(env, 'media/video-1/render-1/stream.mp4')).toEqual([
      'delete-object-tagging',
      '--bucket',
      'demo-hub-storage',
      '--key',
      'media/video-1/render-1/stream.mp4',
    ]);
  });
});

// one file per chapter, cut from the finished stream: the spans meet at the
// chapter starts and the last runs to the end of the demo
describe('sectionSpans', () => {
  it('cuts one span per chapter, meeting at the starts', () => {
    expect(
      sectionSpans(
        [{ startMs: 0 }, { startMs: 20950 }, { startMs: 40000 }],
        53700,
      ),
    ).toEqual([
      { startMs: 0, endMs: 20950 },
      { startMs: 20950, endMs: 40000 },
      { startMs: 40000, endMs: 53700 },
    ]);
  });

  it('drops a chapter past the end and clamps the last span', () => {
    expect(sectionSpans([{ startMs: 0 }, { startMs: 60000 }], 53700)).toEqual([
      { startMs: 0, endMs: 53700 },
    ]);
  });

  it('cuts nothing for a demo without chapters', () => {
    expect(sectionSpans([], 53700)).toEqual([]);
  });
});

describe('clipConcurrency', () => {
  it('scales with the cores and floors at one', () => {
    expect(clipConcurrency(2)).toBe(1);
    expect(clipConcurrency(12)).toBe(4);
    expect(clipConcurrency(48)).toBe(4);
  });
});
