import {
  buildRenderPlan,
  describePlan,
  layoutClips,
  parseTimeline,
  RenderAsset,
  RenderPlan,
  sectionSpans,
  Timeline,
  videoChapters,
} from '@asap-hub/demo-timeline';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { cpus } from 'os';

export type RenderEnv = {
  videoId: string;
  renderId: string;
  timelineKey: string;
  mediaPath: string;
  // a download renders a picked cut into its own directory: just the stream,
  // no preview artefacts, and the row's published media is never touched
  purpose: 'demo' | 'download';
  bucket: string;
  table: string;
  s3Endpoint?: string;
  dynamodbEndpoint?: string;
  workDir: string;
};

const requiredEnv = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

export const parseRenderEnv = (env: NodeJS.ProcessEnv): RenderEnv => ({
  videoId: requiredEnv(env, 'VIDEO_ID'),
  renderId: requiredEnv(env, 'RENDER_ID'),
  timelineKey: requiredEnv(env, 'TIMELINE_KEY'),
  mediaPath: requiredEnv(env, 'MEDIA_PATH'),
  purpose: env.PURPOSE === 'download' ? 'download' : 'demo',
  bucket: requiredEnv(env, 'BUCKET_NAME'),
  table: requiredEnv(env, 'TABLE_NAME'),
  s3Endpoint: env.S3_ENDPOINT || undefined,
  dynamodbEndpoint: env.DYNAMODB_ENDPOINT || undefined,
  workDir: env.WORK_DIR || '/scratch',
});

export const spriteTargetTiles = 100;
export const spriteTileWidth = 160;
export const spriteColumns = 10;

// A fixed interval gives a short demo a single tile, so the scrub preview shows
// one frame end to end. Aim for a tile count instead, floored at one second so
// a long demo does not grow an enormous sheet.
export const spriteIntervalSeconds = (durationMs: number): number =>
  Math.max(1, Math.ceil(durationMs / 1000 / spriteTargetTiles));

export const maxErrorLength = 500;

export const truncateError = (error: unknown): string =>
  String(error instanceof Error ? error.message : error).slice(
    0,
    maxErrorLength,
  );

/* progress */

// clips share the first 70%, the join takes 25% and the finishing stage, which
// reports no progress of its own, is the last 5%
export const stepWeights = { clips: 70, join: 25, finish: 5 } as const;

const clamped = (fraction: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));

export const renderProgress = (
  stepIndex: number,
  stepCount: number,
  fraction: number,
): number => {
  const clipCount = Math.max(stepCount - 1, 0);
  if (stepIndex >= clipCount) {
    return Math.round(stepWeights.clips + clamped(fraction) * stepWeights.join);
  }
  const share = stepWeights.clips / clipCount;
  return Math.round(stepIndex * share + clamped(fraction) * share);
};

export const finishProgress = (fraction: number): number =>
  Math.round(
    stepWeights.clips +
      stepWeights.join +
      clamped(fraction) * stepWeights.finish,
  );

// -progress writes key=value lines; out_time is the only unambiguous elapsed
// field, because out_time_ms is really microseconds in most ffmpeg builds
export const parseProgressMs = (chunk: string): number | undefined => {
  const matches = [
    ...chunk.matchAll(/^out_time=(\d+):(\d{2}):(\d{2})\.(\d{1,6})$/gm),
  ];
  const last = matches[matches.length - 1];
  if (!last) {
    return undefined;
  }
  const hours = Number(last[1] ?? 0);
  const minutes = Number(last[2] ?? 0);
  const seconds = Number(last[3] ?? 0);
  const micros = Number((last[4] ?? '0').padEnd(6, '0'));
  return (
    ((hours * 60 + minutes) * 60 + seconds) * 1000 + Math.floor(micros / 1000)
  );
};

/* the sprite sheet and its WebVTT track, ported from finish.sh */

export type SpriteGrid = {
  tileCount: number;
  columns: number;
  rows: number;
  // the sheet, the cue times and the ffmpeg sample rate all have to agree, so
  // the interval travels with the grid rather than being recomputed
  intervalSeconds: number;
};

export const spriteGrid = (durationMs: number): SpriteGrid => {
  const intervalSeconds = spriteIntervalSeconds(durationMs);
  const tileCount = Math.max(Math.ceil(durationMs / 1000 / intervalSeconds), 1);
  const columns = Math.min(spriteColumns, tileCount);
  return {
    tileCount,
    columns,
    rows: Math.ceil(tileCount / columns),
    intervalSeconds,
  };
};

const pad = (value: number, length: number): string =>
  String(value).padStart(length, '0');

export const formatTimestamp = (ms: number): string => {
  const whole = Math.floor(ms);
  const hours = pad(Math.floor(whole / 3600000), 2);
  const minutes = pad(Math.floor(whole / 60000) % 60, 2);
  const seconds = pad(Math.floor(whole / 1000) % 60, 2);
  return `${hours}:${minutes}:${seconds}.${pad(whole % 1000, 3)}`;
};

export type VttInput = SpriteGrid & { tileHeight: number; durationMs: number };

export const thumbnailsVtt = ({
  tileCount,
  columns,
  tileHeight,
  durationMs,
  intervalSeconds,
}: VttInput): string => {
  const cues = Array.from({ length: tileCount }, (_unused, index) => {
    const startMs = index * intervalSeconds * 1000;
    const endMs = Math.min((index + 1) * intervalSeconds * 1000, durationMs);
    const x = (index % columns) * spriteTileWidth;
    const y = Math.floor(index / columns) * tileHeight;
    return [
      `${formatTimestamp(startMs)} --> ${formatTimestamp(endMs)}`,
      `sprite.jpg#xywh=${x},${y},${spriteTileWidth},${tileHeight}`,
      '',
      '',
    ].join('\n');
  });
  return `WEBVTT\n\n${cues.join('')}`;
};

/* DynamoDB attribute values, as the aws cli hands them over */

export type AttributeValue = {
  S?: string;
  N?: string;
  BOOL?: boolean;
  L?: AttributeValue[];
  M?: Record<string, AttributeValue>;
};

export const unmarshalItem = (
  item: Record<string, AttributeValue>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(item).map(([name, value]) => [name, unmarshal(value)]),
  );

export const unmarshal = (value: AttributeValue): unknown => {
  if (value.S !== undefined) return value.S;
  if (value.N !== undefined) return Number(value.N);
  if (value.BOOL !== undefined) return value.BOOL;
  if (value.L) return value.L.map(unmarshal);
  if (value.M) return unmarshalItem(value.M);
  return undefined;
};

/* the assets a plan needs */

export type AssetRow = {
  assetId: string;
  key: string;
  durationMs?: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio?: boolean;
};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

export const toAssetRow = (
  item: Record<string, unknown>,
): AssetRow | undefined => {
  const assetId = asString(item.assetId);
  const key = asString(item.key);
  if (!assetId || !key) {
    return undefined;
  }
  return {
    assetId,
    key,
    durationMs: asNumber(item.durationMs),
    width: asNumber(item.width),
    height: asNumber(item.height),
    fps: asNumber(item.fps),
    hasAudio: asBoolean(item.hasAudio),
  };
};

export const timelineAssetIds = (timeline: Timeline): string[] => [
  ...new Set([
    ...timeline.clips.flatMap((clip) =>
      clip.kind === 'source' ? [clip.assetId] : [],
    ),
    ...timeline.narration.map((take) => take.assetId),
  ]),
];

// the render reads the original the browser uploaded, never proxyKey: the proxy
// is an editing convenience and may be a lower quality transcode of the source
export const toRenderAssets = (
  rows: AssetRow[],
  assetIds: string[],
  localPath: (assetId: string) => string,
): RenderAsset[] =>
  rows
    .filter((row) => assetIds.includes(row.assetId))
    .map((row) => ({
      assetId: row.assetId,
      path: localPath(row.assetId),
      durationMs: row.durationMs ?? 0,
      width: row.width,
      height: row.height,
      fps: row.fps,
      hasAudio: row.hasAudio,
    }));

export const svgSourcePath = (pngPath: string): string =>
  `${pngPath.replace(/\.png$/, '')}.svg`;

// every clip step renders one placement, the last step is the join, so the
// programme duration is what the join is measured against
export const stepDurationsMs = (
  timeline: Timeline,
  plan: RenderPlan,
): number[] => [
  ...layoutClips(timeline.clips).map((placement) => placement.durationMs),
  plan.durationMs,
];

/* everything below talks to the outside world */

const log = (message: string): void => {
  process.stdout.write(`${new Date().toISOString()} ${message}\n`);
};

const maxStderrLength = 4000;

const run = (
  command: string,
  args: string[],
  onStdout?: (chunk: string) => void,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (onStdout) {
        onStdout(text);
      } else {
        stdout += text;
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-maxStderrLength);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`${command} exited ${code}: ${stderr.trim()}`));
    });
  });

const aws = (
  endpoint: string | undefined,
  args: string[],
  onStdout?: (chunk: string) => void,
): Promise<string> =>
  run('aws', endpoint ? ['--endpoint-url', endpoint, ...args] : args, onStdout);

const s3 = (env: RenderEnv, args: string[]): Promise<string> =>
  aws(env.s3Endpoint, ['s3', ...args]);

const s3api = (env: RenderEnv, args: string[]): Promise<string> =>
  aws(env.s3Endpoint, ['s3api', ...args]);

const dynamodb = (env: RenderEnv, args: string[]): Promise<string> =>
  aws(env.dynamodbEndpoint, ['dynamodb', ...args]);

const objectUri = (env: RenderEnv, key: string): string =>
  `s3://${env.bucket}/${key}`;

const download = (env: RenderEnv, key: string, path: string): Promise<string> =>
  s3(env, ['cp', objectUri(env, key), path]);

// the same lifecycle the timeline snapshot is written under, so the bucket's
// own rule clears anything a cancelled render managed to write
export const renderTagging = 'TagSet=[{Key=lifecycle,Value=render}]';

export const tagObjectArgs = (env: RenderEnv, key: string): string[] => [
  'put-object-tagging',
  '--bucket',
  env.bucket,
  '--key',
  key,
  '--tagging',
  renderTagging,
];

export const untagObjectArgs = (env: RenderEnv, key: string): string[] => [
  'delete-object-tagging',
  '--bucket',
  env.bucket,
  '--key',
  key,
];

// `aws s3 cp` carries no tagging option, so the tag follows the object rather
// than travelling with it; the gap is one request wide
const upload = async (
  env: RenderEnv,
  path: string,
  key: string,
  contentType: string,
): Promise<void> => {
  await s3(env, [
    'cp',
    path,
    objectUri(env, key),
    '--content-type',
    contentType,
  ]);
  await s3api(env, tagObjectArgs(env, key));
};

// The published media must not keep that tag: the rule filters on the tag alone,
// with no prefix, so a demo still carrying it would be deleted thirty days
// later. It is stripped before the row accepts the render, which leaves a
// failure here on the safe side, with the media still set to age out.
const releaseMedia = async (env: RenderEnv, keys: string[]): Promise<void> => {
  for (const key of keys) {
    await s3api(env, untagObjectArgs(env, key));
  }
};

const videoKeyJson = (env: RenderEnv): string =>
  JSON.stringify({ PK: { S: `VIDEO#${env.videoId}` }, SK: { S: 'META' } });

// a superseded render must never clobber a newer one, and a cancelled one must
// never land at all, so every write this container makes is conditional on the
// item still naming this run and still waiting on it. A task the cancel could
// not stop keeps going, and this is what keeps its output off the demo. The
// version is bumped alongside, because it is what the editor reads to decide
// whether its copy of the row is still current, and these writes change the row
// materially
export const videoUpdateArgs = (
  env: RenderEnv,
  expression: string,
  names: Record<string, string>,
  values: Record<string, AttributeValue>,
): string[] => [
  'update-item',
  '--table-name',
  env.table,
  '--key',
  videoKeyJson(env),
  '--update-expression',
  `${expression} ADD #version :one`,
  '--condition-expression',
  '#render.#renderId = :renderId AND #render.#state IN (:queued, :rendering)',
  '--expression-attribute-names',
  JSON.stringify({
    '#render': 'render',
    '#renderId': 'renderId',
    '#state': 'state',
    '#version': 'version',
    ...names,
  }),
  '--expression-attribute-values',
  JSON.stringify({
    ':renderId': { S: env.renderId },
    ':queued': { S: 'queued' },
    ':rendering': { S: 'rendering' },
    ':one': { N: '1' },
    ...values,
  }),
];

const updateVideo = (
  env: RenderEnv,
  expression: string,
  names: Record<string, string>,
  values: Record<string, AttributeValue>,
): Promise<string> =>
  dynamodb(env, videoUpdateArgs(env, expression, names, values));

export const conditionFailed = (error: unknown): boolean =>
  truncateError(error).includes('ConditionalCheckFailedException');

// The media set runs to tens of megabytes and used to be written before anything
// asked the row about it, so a cancelled task left permanent orphans in the
// bucket. This is a marker write on the same condition every other write makes:
// it only passes while the row still names this render and is still waiting on
// it, so nothing is uploaded for a run nobody wants.
export const claimUploadArgs = (env: RenderEnv): string[] =>
  videoUpdateArgs(
    env,
    'SET #render.#stage = :stage',
    { '#stage': 'stage' },
    { ':stage': { S: 'upload' } },
  );

const claimUpload = async (env: RenderEnv): Promise<void> => {
  try {
    await dynamodb(env, claimUploadArgs(env));
  } catch (error) {
    if (!conditionFailed(error)) {
      throw error;
    }
    throw new Error('the render was cancelled or superseded before its upload');
  }
};

const queryAssetRows = async (env: RenderEnv): Promise<AssetRow[]> => {
  const response = await dynamodb(env, [
    'query',
    '--table-name',
    env.table,
    '--key-condition-expression',
    '#pk = :pk AND begins_with(#sk, :sk)',
    '--expression-attribute-names',
    JSON.stringify({ '#pk': 'PK', '#sk': 'SK' }),
    '--expression-attribute-values',
    JSON.stringify({
      ':pk': { S: `VIDEO#${env.videoId}` },
      ':sk': { S: 'ASSET#' },
    }),
    '--output',
    'json',
  ]);
  const { Items = [] } = JSON.parse(response) as {
    Items?: Record<string, AttributeValue>[];
  };
  return Items.map(unmarshalItem)
    .map(toAssetRow)
    .filter((row): row is AssetRow => Boolean(row));
};

const progressIntervalMs = 5000;

// progress is advisory: a write that loses the condition, or fails outright,
// must not end a render that is otherwise going fine
const createReporter = (env: RenderEnv) => {
  let reportedAt = 0;

  return (stage: string, progress: number): void => {
    const now = Date.now();
    if (now - reportedAt < progressIntervalMs) {
      return;
    }
    reportedAt = now;
    void updateVideo(
      env,
      'SET #render.#state = :state, #render.#stage = :stage, #render.#progress = :progress',
      { '#state': 'state', '#stage': 'stage', '#progress': 'progress' },
      {
        ':state': { S: 'rendering' },
        ':stage': { S: stage },
        ':progress': { N: String(progress) },
      },
    ).catch((error: unknown) => {
      log(`WARN could not report progress: ${truncateError(error)}`);
    });
  };
};

type Reporter = ReturnType<typeof createReporter>;

const probe = async (args: string[]): Promise<string> =>
  (await run('ffprobe', args)).trim();

const probeDurationMs = async (path: string): Promise<number> => {
  const seconds = await probe([
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    path,
  ]);
  const ms = Math.round(Number(seconds) * 1000);
  return Number.isFinite(ms) ? ms : 0;
};

// a clip may ask for sixty click rings at once, and starting sixty rsvg-convert
// processes on a two core task put them all into swap for no throughput
export const maxRasterisers = 4;

// runs the work a few at a time, keeping the first failure
export const inPool = async <T>(
  size: number,
  items: T[],
  work: (item: T) => Promise<void>,
): Promise<void> => {
  let next = 0;
  const take = async (): Promise<void> => {
    for (let index = next; index < items.length; index = next) {
      next = index + 1;
      const item = items[index];
      if (item !== undefined) {
        await work(item);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, () => take()),
  );
};

const rasterise = (plan: RenderPlan): Promise<void> =>
  inPool(maxRasterisers, plan.svgs, async ({ path, svg, width, height }) => {
    const source = svgSourcePath(path);
    await fs.writeFile(source, svg, 'utf8');
    await run('rsvg-convert', [
      '-w',
      String(width),
      '-h',
      String(height),
      '-o',
      path,
      source,
    ]);
  });

// each clip encode holds two to three cores, so the pool is sized to leave
// the machine breathing room; a two vCPU task comes out at one, sequential
export const clipConcurrency = (cores: number): number =>
  Math.max(1, Math.min(4, Math.floor(cores / 3)));

const runStep = async (
  step: RenderPlan['steps'][number],
  durationMs: number,
  onFraction: (fraction: number) => void,
): Promise<void> => {
  // the progress options are global, so they go ahead of the planned args
  await run(
    'ffmpeg',
    ['-progress', 'pipe:1', '-nostats', ...step.args],
    (chunk) => {
      const elapsedMs = parseProgressMs(chunk);
      if (elapsedMs !== undefined) {
        onFraction(elapsedMs / durationMs);
      }
    },
  );
  onFraction(1);
};

// The clips are independent of one another, so they encode in parallel and
// the wall clock drops towards the longest clip instead of the sum of them
// all. A step marked serial reads what the pool writes, so those run after
// it, one at a time, in plan order: an assemble before the join.
export const scheduledSteps = (
  steps: RenderPlan['steps'],
): {
  pooled: { step: RenderPlan['steps'][number]; index: number }[];
  serial: { step: RenderPlan['steps'][number]; index: number }[];
} => {
  const indexed = steps.map((step, index) => ({ step, index }));
  return {
    pooled: indexed.filter(({ step }) => !step.serial),
    serial: indexed.filter(({ step }) => step.serial),
  };
};

const runPlan = async (
  plan: RenderPlan,
  durations: number[],
  report: Reporter,
): Promise<void> => {
  const weightOf = (index: number) =>
    plan.steps[index]?.weightMs ?? durations[index] ?? plan.durationMs;
  const { pooled, serial } = scheduledSteps(plan.steps);

  const totalPooledMs =
    pooled.reduce((total, { index }) => total + weightOf(index), 0) || 1;
  const doneFractions = new Map<number, number>();
  const reportPooled = (label: string) => {
    const weighted = pooled.reduce(
      (total, { index }) =>
        total + (doneFractions.get(index) ?? 0) * weightOf(index),
      0,
    );
    report(
      label,
      Math.round(Math.min(1, weighted / totalPooledMs) * stepWeights.clips),
    );
  };

  const pool = clipConcurrency(cpus().length);
  log(`encoding ${pooled.length} clips, ${pool} at a time`);
  await inPool(pool, pooled, async ({ step, index }) => {
    log(`${index + 1}/${plan.steps.length} ${step.label}`);
    await runStep(step, durations[index] ?? plan.durationMs, (fraction) => {
      doneFractions.set(index, Math.min(1, fraction));
      reportPooled(step.label);
    });
  });

  const totalSerialMs =
    serial.reduce((total, { index }) => total + weightOf(index), 0) || 1;
  let serialDoneMs = 0;
  await serial.reduce(
    (previous, { step, index }) =>
      previous.then(async () => {
        log(`${index + 1}/${plan.steps.length} ${step.label}`);
        const at = (fraction: number) =>
          report(
            step.label,
            stepWeights.clips +
              Math.round(
                (Math.min(1, serialDoneMs / totalSerialMs) +
                  Math.min(1, Math.max(0, fraction)) *
                    (weightOf(index) / totalSerialMs)) *
                  stepWeights.join,
              ),
          );
        at(0);
        await runStep(step, durations[index] ?? plan.durationMs, at);
        serialDoneMs += weightOf(index);
      }),
    Promise.resolve(),
  );
};

// the spans are cut here and mapped back to chapters on the watch page, so the
// one definition lives in the package both sides read
export { sectionSpans };

// the upload path's finishing stage, ported from finish.sh: the same four
// artefacts under the same names, and the same ready flip. It is ported rather
// than sourced because a render writes under media/{id}/{mediaPath}/, which
// finish.sh has no revision directory for, and because the ready flip has to
// carry render.state and mediaPath in the one conditional write
const finishMedia = async (
  env: RenderEnv,
  streamFile: string,
  chapters: { startMs: number; title: string }[],
  report: Reporter,
): Promise<{ durationMs: number; sectionCount: number }> => {
  const { workDir } = env;
  const spriteFile = `${workDir}/sprite.jpg`;
  const vttFile = `${workDir}/thumbnails.vtt`;
  const thumbFile = `${workDir}/thumb.jpg`;

  const durationMs = await probeDurationMs(streamFile);
  if (durationMs <= 0) {
    throw new Error('the rendered output reports no duration');
  }

  const grid = spriteGrid(durationMs);
  log(
    `sprite ${grid.tileCount} tiles, ${grid.columns}x${grid.rows} grid at ${spriteTileWidth}px wide`,
  );
  report('sprite', finishProgress(0.2));
  await run('ffmpeg', [
    '-nostdin',
    '-y',
    '-i',
    streamFile,
    '-frames:v',
    '1',
    '-vf',
    `fps=1/${grid.intervalSeconds},scale=${spriteTileWidth}:-2,tile=${grid.columns}x${grid.rows}`,
    '-q:v',
    '4',
    spriteFile,
  ]);

  // a missing poster frame must never fail a render that is otherwise done
  const posterSeconds = ((durationMs / 1000) * 0.25).toFixed(3);
  const poster = await run('ffmpeg', [
    '-nostdin',
    '-y',
    '-ss',
    posterSeconds,
    '-i',
    streamFile,
    '-frames:v',
    '1',
    '-vf',
    'scale=640:-2',
    '-q:v',
    '4',
    thumbFile,
  ]).then(
    () => true,
    (error: unknown) => {
      log(`WARN could not build thumb.jpg: ${truncateError(error)}`);
      return false;
    },
  );

  const spriteHeight = Number(
    await probe([
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=height',
      '-of',
      'csv=p=0',
      spriteFile,
    ]),
  );
  const tileHeight = Math.floor(spriteHeight / grid.rows);
  await fs.writeFile(
    vttFile,
    thumbnailsVtt({ ...grid, tileHeight, durationMs }),
    'utf8',
  );

  const prefix = `media/${env.videoId}/${env.mediaPath}`;
  await claimUpload(env);
  report('upload', finishProgress(0.6));

  const written = [
    `${prefix}/stream.mp4`,
    `${prefix}/sprite.jpg`,
    `${prefix}/thumbnails.vtt`,
  ];
  await upload(env, streamFile, `${prefix}/stream.mp4`, 'video/mp4');
  await upload(env, spriteFile, `${prefix}/sprite.jpg`, 'image/jpeg');
  await upload(env, vttFile, `${prefix}/thumbnails.vtt`, 'text/vtt');

  // one file per chapter, cut without re-encoding so a watcher can take just
  // the section they need; chapter starts land on clip boundaries, which the
  // join keeps as keyframes, so the copy cuts cleanly there.
  // The watch page maps a chapter back to its file by counting spans, so the
  // files have to stay the first sectionCount spans in order: a failed cut ends
  // the run rather than leaving a hole for every later chapter to fall into.
  const spans = sectionSpans(chapters, durationMs);
  let sectionCount = 0;
  for (const [index, span] of spans.entries()) {
    const sectionFile = `${workDir}/section-${index}.mp4`;
    try {
      await run('ffmpeg', [
        '-nostdin',
        '-y',
        '-ss',
        (span.startMs / 1000).toFixed(3),
        '-to',
        (span.endMs / 1000).toFixed(3),
        '-i',
        streamFile,
        '-c',
        'copy',
        '-movflags',
        '+faststart',
        sectionFile,
      ]);
      await upload(
        env,
        sectionFile,
        `${prefix}/sections/${index}.mp4`,
        'video/mp4',
      );
      written.push(`${prefix}/sections/${index}.mp4`);
      sectionCount += 1;
    } catch (error) {
      // a section is a convenience; losing one must not fail the render
      log(`WARN could not cut section ${index}: ${truncateError(error)}`);
      break;
    }
  }
  if (poster) {
    await upload(env, thumbFile, `${prefix}/thumb.jpg`, 'image/jpeg').then(
      () => written.push(`${prefix}/thumb.jpg`),
      (error: unknown) => {
        log(`WARN could not upload thumb.jpg: ${truncateError(error)}`);
      },
    );
  }

  await releaseMedia(env, written);

  return { durationMs, sectionCount };
};

// a download is just the stream: no sprite, no sections, no ready flip, and
// the lifecycle tag stays on so a cut nobody saves ages out on its own
const finishDownload = async (
  env: RenderEnv,
  streamFile: string,
  report: Reporter,
): Promise<void> => {
  const durationMs = await probeDurationMs(streamFile);
  if (durationMs <= 0) {
    throw new Error('the rendered output reports no duration');
  }
  await claimUpload(env);
  report('upload', finishProgress(0.6));
  await upload(
    env,
    streamFile,
    `media/${env.videoId}/${env.mediaPath}/stream.mp4`,
    'video/mp4',
  );
  await updateVideo(
    env,
    [
      'SET #render.#state = :state, #render.#stage = :stage,',
      '#render.#progress = :progress, #render.#finishedAt = :finishedAt,',
      '#render.#downloadPath = :downloadPath',
      'REMOVE #render.#error',
    ].join(' '),
    {
      '#state': 'state',
      '#stage': 'stage',
      '#progress': 'progress',
      '#finishedAt': 'finishedAt',
      '#downloadPath': 'downloadPath',
      '#error': 'error',
    },
    {
      ':state': { S: 'done' },
      ':stage': { S: 'done' },
      ':progress': { N: '100' },
      ':finishedAt': { S: new Date().toISOString() },
      ':downloadPath': { S: env.mediaPath },
    },
  );
};

const render = async (env: RenderEnv): Promise<void> => {
  const { workDir } = env;
  const report = createReporter(env);
  log(
    `start videoId=${env.videoId} renderId=${env.renderId} mediaPath=${env.mediaPath}`,
  );

  await fs.mkdir(`${workDir}/assets`, { recursive: true });
  const timelineFile = `${workDir}/timeline.json`;
  await download(env, env.timelineKey, timelineFile);
  const timeline = parseTimeline(
    JSON.parse(await fs.readFile(timelineFile, 'utf8')),
  );

  const assetIds = timelineAssetIds(timeline);
  const localPath = (assetId: string): string => `${workDir}/assets/${assetId}`;
  const sources = (await queryAssetRows(env)).filter(({ assetId }) =>
    assetIds.includes(assetId),
  );
  const assets = toRenderAssets(sources, assetIds, localPath);

  report('sources', 0);
  for (const source of sources) {
    log(`download ${source.key}`);
    await download(env, source.key, localPath(source.assetId));
  }

  const output = `${workDir}/stream.mp4`;
  const plan = buildRenderPlan({ timeline, assets, workDir, output });
  if (plan.steps.length === 0) {
    throw new Error('the timeline has no clips');
  }
  describePlan(plan).forEach(log);

  await rasterise(plan);
  for (const list of [plan.listFile, ...(plan.listFiles ?? [])]) {
    if (list) {
      await fs.writeFile(list.path, list.content, 'utf8');
    }
  }

  await runPlan(plan, stepDurationsMs(timeline, plan), report);
  if (env.purpose === 'download') {
    await finishDownload(env, output, report);
    log(`done videoId=${env.videoId} download=${env.mediaPath}`);
    return;
  }
  const { durationMs, sectionCount } = await finishMedia(
    env,
    output,
    videoChapters(timeline),
    report,
  );

  // the chapters travel with the media they describe, so a watcher never sees
  // a chapter list for an export that has not landed
  await updateVideo(
    env,
    [
      'SET durationMs = :durationMs, processingState = :processingState,',
      'mediaPath = :mediaPath, chapters = :chapters,',
      'sectionCount = :sectionCount, #render.#state = :state,',
      '#render.#stage = :stage, #render.#progress = :progress,',
      '#render.#finishedAt = :finishedAt',
      'REMOVE processingError, #render.#error',
    ].join(' '),
    {
      '#state': 'state',
      '#stage': 'stage',
      '#progress': 'progress',
      '#finishedAt': 'finishedAt',
      '#error': 'error',
    },
    {
      ':durationMs': { N: String(durationMs) },
      ':processingState': { S: 'ready' },
      ':mediaPath': { S: env.mediaPath },
      ':sectionCount': { N: String(sectionCount) },
      ':chapters': {
        L: videoChapters(timeline).map((chapter) => ({
          M: {
            startMs: { N: String(chapter.startMs) },
            title: { S: chapter.title },
          },
        })),
      },
      ':state': { S: 'done' },
      ':stage': { S: 'done' },
      ':progress': { N: '100' },
      ':finishedAt': { S: new Date().toISOString() },
    },
  );

  log(`done videoId=${env.videoId} durationMs=${durationMs}`);
};

// the media already published stays untouched: only the render map moves, so a
// failed re-render leaves the watch page on the output it had
const recordFailure = async (env: RenderEnv, error: unknown): Promise<void> => {
  await updateVideo(
    env,
    'SET #render.#state = :state, #render.#error = :error, #render.#finishedAt = :finishedAt',
    { '#state': 'state', '#error': 'error', '#finishedAt': 'finishedAt' },
    {
      ':state': { S: 'failed' },
      ':error': { S: truncateError(error) },
      ':finishedAt': { S: new Date().toISOString() },
    },
  ).catch((writeError: unknown) => {
    log(`WARN could not record the failure: ${truncateError(writeError)}`);
  });
};

export const main = async (): Promise<void> => {
  const env = parseRenderEnv(process.env);
  try {
    await render(env);
  } catch (error) {
    await recordFailure(env, error);
    throw error;
  }
};

if (require.main === module) {
  main().catch((error: unknown) => {
    log(`FAILED ${truncateError(error)}`);
    process.exitCode = 1;
  });
}
