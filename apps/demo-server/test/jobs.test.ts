process.env.SLS_STAGE = 'local';
process.env.TABLE_NAME = 'demo-hub-test-data';
process.env.BUCKET_NAME = 'demo-hub-test-storage';

/* eslint-disable import/first */
import { RunTaskCommand, StopTaskCommand } from '@aws-sdk/client-ecs';
import { EventEmitter } from 'events';
import { getBucketName, getRegion, getTableName, isLocal } from '../src/config';
import * as dockerRunner from '../src/jobs/docker-runner';
import * as ecsRunner from '../src/jobs/ecs-runner';
import { getJobRunner, JobRunner, setJobRunner } from '../src/jobs/runner';
/* eslint-enable import/first */

jest.mock('../src/config', () => ({
  ...jest.requireActual('../src/config'),
  isLocal: jest.fn(() => true),
}));

const mockIsLocal = isLocal as jest.MockedFunction<typeof isLocal>;

const taskArn =
  'arn:aws:ecs:us-east-1:111111111111:task/demo-hub-dev-encoder/abc';

const ecsOptions: ecsRunner.EcsJobOptions = {
  cluster: 'arn:aws:ecs:us-east-1:111111111111:cluster/demo-hub-dev-encoder',
  taskDefinition:
    'arn:aws:ecs:us-east-1:111111111111:task-definition/demo-hub-dev-encoder:7',
  containerName: 'encoder',
  subnets: ['subnet-a', 'subnet-b'],
  securityGroups: ['sg-1'],
};

const stubRunner = (): JobRunner => ({ run: jest.fn(), stop: jest.fn() });

// a docker child that emits what the real cli emits, without spawning anything
const fakeChild = ({
  stdout = '',
  stderr = '',
  code = 0,
}: {
  stdout?: string;
  stderr?: string;
  code?: number;
}): dockerRunner.JobProcess => {
  const stdoutEvents = new EventEmitter();
  const stderrEvents = new EventEmitter();
  const events = new EventEmitter();
  setImmediate(() => {
    if (stdout) {
      stdoutEvents.emit('data', Buffer.from(stdout));
    }
    if (stderr) {
      stderrEvents.emit('data', Buffer.from(stderr));
    }
    events.emit('close', code);
  });
  return {
    stdout: stdoutEvents,
    stderr: stderrEvents,
    on(event: string, listener: (...args: never[]) => void) {
      events.on(event, listener as (...args: unknown[]) => void);
    },
    unref() {
      return undefined;
    },
  };
};

const spawnReturning = (
  child: dockerRunner.JobProcess,
): jest.MockedFunction<dockerRunner.SpawnJobProcess> =>
  jest.fn().mockReturnValue(child);

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  setJobRunner(undefined);
  mockIsLocal.mockReturnValue(true);
});

afterAll(() => {
  setJobRunner(undefined);
});

describe('getJobRunner', () => {
  it('runs jobs in docker locally', () => {
    const runner = stubRunner();
    const create = jest
      .spyOn(dockerRunner, 'createDockerJobRunner')
      .mockReturnValue(runner);

    expect(getJobRunner()).toBe(runner);
    expect(create).toHaveBeenCalled();
  });

  it('runs jobs on ECS when it is not local', () => {
    mockIsLocal.mockReturnValue(false);
    const runner = stubRunner();
    const create = jest
      .spyOn(ecsRunner, 'createEcsJobRunner')
      .mockReturnValue(runner);

    expect(getJobRunner()).toBe(runner);
    expect(create).toHaveBeenCalled();
  });

  it('builds the runner once', () => {
    const create = jest
      .spyOn(dockerRunner, 'createDockerJobRunner')
      .mockReturnValue(stubRunner());

    expect(getJobRunner()).toBe(getJobRunner());
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('takes an injected runner', () => {
    const runner = stubRunner();
    setJobRunner(runner);

    expect(getJobRunner()).toBe(runner);
  });
});

describe('the docker runner', () => {
  it('runs the encoder image against MinIO and DynamoDB Local', async () => {
    const spawn = spawnReturning(fakeChild({ stdout: 'container-1\n' }));

    const { jobId } = await dockerRunner
      .createDockerJobRunner(spawn)
      .run('ingest', {
        VIDEO_ID: 'video-1',
        ASSET_ID: 'asset-1',
        ASSET_KEY: 'projects/video-1/assets/asset-1/original.webm',
      });

    expect(jobId).toEqual('container-1');
    expect(spawn).toHaveBeenCalledWith('docker', [
      'run',
      '--rm',
      '--detach',
      '--network',
      'host',
      '--pull',
      'never',
      '-e',
      'JOB=ingest',
      '-e',
      `BUCKET_NAME=${getBucketName()}`,
      '-e',
      `TABLE_NAME=${getTableName()}`,
      '-e',
      'S3_ENDPOINT=http://localhost:9010',
      '-e',
      'DYNAMODB_ENDPOINT=http://localhost:8000',
      '-e',
      'AWS_ACCESS_KEY_ID=minioadmin',
      '-e',
      'AWS_SECRET_ACCESS_KEY=minioadmin',
      '-e',
      `AWS_DEFAULT_REGION=${getRegion()}`,
      '-e',
      'VIDEO_ID=video-1',
      '-e',
      'ASSET_ID=asset-1',
      '-e',
      'ASSET_KEY=projects/video-1/assets/asset-1/original.webm',
      'demo-hub-encoder:local',
    ]);
  });

  it('stops a job by removing its container', async () => {
    const spawn = spawnReturning(fakeChild({ stdout: 'container-1\n' }));

    await dockerRunner.createDockerJobRunner(spawn).stop('container-1');

    expect(spawn).toHaveBeenCalledWith('docker', ['rm', '-f', 'container-1']);
  });

  it('rejects when docker exits non zero', async () => {
    const spawn = spawnReturning(
      fakeChild({ code: 125, stderr: 'no such image' }),
    );

    await expect(
      dockerRunner.createDockerJobRunner(spawn).run('encode', {}),
    ).rejects.toThrow('no such image');
  });
});

describe('the ECS runner', () => {
  const send = jest.fn();
  const client = { send } as unknown as ecsRunner.EcsClientLike;
  const runner = () => ecsRunner.createEcsJobRunner(client, ecsOptions);

  it('runs a task with the job in the container overrides', async () => {
    send.mockResolvedValue({ tasks: [{ taskArn }] });

    const { jobId } = await runner().run('ingest', {
      VIDEO_ID: 'video-1',
      ASSET_ID: 'asset-1',
    });

    expect(jobId).toEqual(taskArn);
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(RunTaskCommand);
    expect(command.input).toEqual({
      cluster: ecsOptions.cluster,
      taskDefinition: ecsOptions.taskDefinition,
      launchType: 'FARGATE',
      count: 1,
      platformVersion: 'LATEST',
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: 'ENABLED',
          subnets: ['subnet-a', 'subnet-b'],
          securityGroups: ['sg-1'],
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: 'encoder',
            environment: [
              { name: 'JOB', value: 'ingest' },
              { name: 'VIDEO_ID', value: 'video-1' },
              { name: 'ASSET_ID', value: 'asset-1' },
            ],
          },
        ],
      },
    });
  });

  it('throws when no task started', async () => {
    send.mockResolvedValue({
      tasks: [],
      failures: [{ reason: 'RESOURCE:CPU' }],
    });

    await expect(runner().run('render', {})).rejects.toThrow('RESOURCE:CPU');
  });

  it('stops a job by stopping its task', async () => {
    send.mockResolvedValue({});

    await runner().stop(taskArn);

    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(StopTaskCommand);
    expect(command.input).toEqual({
      cluster: ecsOptions.cluster,
      task: taskArn,
      reason: 'stopped by the demo hub',
    });
  });
});
