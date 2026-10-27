// How much longer the export has to run, read off the render's own pace: the
// row's progress is sampled as it moves, and the recent velocity is carried
// forward. Measuring rather than assuming keeps the estimate honest on any
// machine the render happens to be on, a laptop or a sixteen-core task.

export type EtaSample = { atMs: number; progress: number };

const keptSamples = 50;

// only the moments progress actually moved carry information; the polls in
// between repeat the same number and would dilute the velocity
export const withSample = (
  samples: EtaSample[],
  progress: number,
  atMs: number,
): EtaSample[] => {
  const last = samples[samples.length - 1];
  if (last && last.progress === progress) {
    return samples;
  }
  return [...samples, { atMs, progress }].slice(-keptSamples);
};

// the window reaches at least this far back, so a run of quick little steps
// does not read as the pace of the whole export
const windowMs = 30_000;
// and the estimate says nothing until the pace has this much history: the
// first seconds of a render measure the queue, not the encode
const settleMs = 15_000;

export const etaMs = (
  samples: EtaSample[],
  nowMs: number,
): number | undefined => {
  const last = samples[samples.length - 1];
  if (!last || last.progress < 3 || last.progress >= 100) {
    return undefined;
  }
  const anchor =
    [...samples]
      .reverse()
      .find((sample) => last.atMs - sample.atMs >= windowMs) ?? samples[0];
  if (!anchor || anchor === last) {
    return undefined;
  }
  const spanMs = last.atMs - anchor.atMs;
  const gained = last.progress - anchor.progress;
  if (spanMs < settleMs || gained <= 0) {
    return undefined;
  }
  const msPerPoint = spanMs / gained;
  return Math.max(0, (100 - last.progress) * msPerPoint - (nowMs - last.atMs));
};

export const etaLabel = (ms: number): string => {
  if (ms < 60_000) {
    return 'under a minute left';
  }
  if (ms < 3_600_000) {
    return `about ${Math.max(1, Math.round(ms / 60_000))} min left`;
  }
  const rounded = Math.round(ms / 300_000) * 5;
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return minutes > 0
    ? `about ${hours} h ${minutes} min left`
    : `about ${hours} h left`;
};
