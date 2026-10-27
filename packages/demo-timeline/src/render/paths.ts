const inWorkDir = (workDir: string, name: string): string =>
  `${workDir.replace(/\/+$/, '')}/${name}`;

export const clipOutputPath = (workDir: string, index: number): string =>
  inWorkDir(workDir, `clip-${index}.mp4`);

export const titlePngPath = (workDir: string, clipIndex: number): string =>
  inWorkDir(workDir, `title-${clipIndex}.png`);

export const bannerPngPath = (workDir: string, bannerIndex: number): string =>
  inWorkDir(workDir, `banner-${bannerIndex}.png`);

export const cursorPngPath = (
  workDir: string,
  clipIndex: number,
  effectIndex: number,
): string => inWorkDir(workDir, `cursor-${clipIndex}-${effectIndex}.png`);

export const pointerPngPath = (
  workDir: string,
  clipIndex: number,
  layerIndex: number,
): string => inWorkDir(workDir, `pointer-${clipIndex}-${layerIndex}.png`);

export const concatListPath = (workDir: string): string =>
  inWorkDir(workDir, 'concat.txt');

// the stretch of a clip no transition touches, cut out of it for the join to
// copy; there is at most one per clip, so the clip's own index names it
export const copyPiecePath = (workDir: string, clipIndex: number): string =>
  inWorkDir(workDir, `piece-${clipIndex}.mp4`);

// the blend into the clip at this index, the only stretch the join re-encodes
export const blendPiecePath = (workDir: string, clipIndex: number): string =>
  inWorkDir(workDir, `blend-${clipIndex}.mp4`);

export const tileListPath = (workDir: string, clipIndex: number): string =>
  inWorkDir(workDir, `tiles-${clipIndex}.txt`);
