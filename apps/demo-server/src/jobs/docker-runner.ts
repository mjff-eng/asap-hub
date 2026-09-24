import { spawn } from 'child_process';
import {
  getBucketName,
  getRegion,
  getTableName,
  localDynamodbEndpoint,
  localS3Endpoint,
} from '../config';
import type { JobName, JobRunner } from './runner';

type OutputStream = {
  on(event: 'data', listener: (chunk: Buffer | string) => void): void;
};

export type JobProcess = {
  stdout: OutputStream | null;
  stderr: OutputStream | null;
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: 'close', listener: (code: number | null) => void): void;
  unref(): void;
};

export type SpawnJobProcess = (command: string, args: string[]) => JobProcess;

const defaultSpawn: SpawnJobProcess = (command, args) =>
  spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

export const encoderImage = (): string =>
  process.env.ENCODER_IMAGE || 'demo-hub-encoder:local';

// the container talks to MinIO and DynamoDB Local through the same endpoint
// overrides the deployed image leaves unset, so one image covers both
const localEnvironment = (): Record<string, string> => ({
  BUCKET_NAME: getBucketName(),
  TABLE_NAME: getTableName(),
  S3_ENDPOINT: localS3Endpoint(),
  DYNAMODB_ENDPOINT: localDynamodbEndpoint(),
  AWS_ACCESS_KEY_ID: 'minioadmin',
  AWS_SECRET_ACCESS_KEY: 'minioadmin',
  AWS_DEFAULT_REGION: getRegion(),
});

export const dockerRunArgs = (
  job: JobName,
  env: Record<string, string>,
): string[] => [
  'run',
  '--rm',
  '--detach',
  '--network',
  'host',
  // the image is built by `docker compose build encoder`, never pulled
  '--pull',
  'never',
  ...Object.entries({ JOB: job, ...localEnvironment(), ...env }).flatMap(
    ([name, value]) => ['-e', `${name}=${value}`],
  ),
  encoderImage(),
];

const runDocker = (
  spawnProcess: SpawnJobProcess,
  args: string[],
): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawnProcess('docker', args);
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`docker ${args[0]} exited ${code}: ${stderr.trim()}`));
      }
    });
    child.unref();
  });

export const createDockerJobRunner = (
  spawnProcess: SpawnJobProcess = defaultSpawn,
): JobRunner => ({
  run: async (job, env) => ({
    jobId: await runDocker(spawnProcess, dockerRunArgs(job, env)),
  }),
  stop: async (jobId) => {
    await runDocker(spawnProcess, ['rm', '-f', jobId]);
  },
});
