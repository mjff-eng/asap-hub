import { isLocal } from '../config';
import { createDockerJobRunner } from './docker-runner';
import { createEcsJobRunner } from './ecs-runner';

export type JobName = 'encode' | 'ingest' | 'render';

export type JobRunner = {
  run(job: JobName, env: Record<string, string>): Promise<{ jobId: string }>;
  stop(jobId: string): Promise<void>;
};

let runner: JobRunner | undefined;

export const getJobRunner = (): JobRunner => {
  if (!runner) {
    runner = isLocal() ? createDockerJobRunner() : createEcsJobRunner();
  }
  return runner;
};

export const setJobRunner = (next: JobRunner | undefined): void => {
  runner = next;
};
