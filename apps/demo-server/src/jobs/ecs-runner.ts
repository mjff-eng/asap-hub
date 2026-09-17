import {
  ECSClient,
  RunTaskCommand,
  StopTaskCommand,
} from '@aws-sdk/client-ecs';
import { getRegion } from '../config';
import type { JobName, JobRunner } from './runner';

export type EcsClientLike = Pick<ECSClient, 'send'>;

export type EcsJobOptions = {
  cluster: string;
  taskDefinition: string;
  containerName: string;
  subnets: string[];
  securityGroups: string[];
};

// serverless.ts puts all of this on the api handler
export const ecsOptionsFromEnv = (): EcsJobOptions => ({
  cluster: process.env.ENCODER_CLUSTER || '',
  taskDefinition: process.env.ENCODER_TASK_DEFINITION || '',
  containerName: process.env.ENCODER_CONTAINER_NAME || 'encoder',
  subnets: (process.env.ENCODER_SUBNET_IDS || '')
    .split(',')
    .map((subnet) => subnet.trim())
    .filter(Boolean),
  securityGroups: [process.env.ENCODER_SECURITY_GROUP_ID].filter(
    (group): group is string => Boolean(group),
  ),
});

const runTaskInput = (
  options: EcsJobOptions,
  job: JobName,
  env: Record<string, string>,
) => ({
  cluster: options.cluster,
  taskDefinition: options.taskDefinition,
  launchType: 'FARGATE' as const,
  count: 1,
  platformVersion: 'LATEST',
  networkConfiguration: {
    awsvpcConfiguration: {
      // the task pulls its image from ECR over the internet, there is no NAT
      assignPublicIp: 'ENABLED' as const,
      subnets: options.subnets,
      securityGroups: options.securityGroups,
    },
  },
  overrides: {
    containerOverrides: [
      {
        name: options.containerName,
        environment: [
          { name: 'JOB', value: job },
          ...Object.entries(env).map(([name, value]) => ({ name, value })),
        ],
      },
    ],
  },
});

export const createEcsJobRunner = (
  client: EcsClientLike = new ECSClient({ region: getRegion() }),
  options: EcsJobOptions = ecsOptionsFromEnv(),
): JobRunner => ({
  run: async (job, env) => {
    const { tasks, failures } = await client.send(
      new RunTaskCommand(runTaskInput(options, job, env)),
    );
    const jobId = tasks?.[0]?.taskArn;
    if (!jobId) {
      throw new Error(
        `RunTask started no ${job} task: ${JSON.stringify(failures ?? [])}`,
      );
    }
    return { jobId };
  },
  stop: async (jobId) => {
    await client.send(
      new StopTaskCommand({
        cluster: options.cluster,
        task: jobId,
        reason: 'stopped by the demo hub',
      }),
    );
  },
});
