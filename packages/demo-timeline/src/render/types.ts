import { Canvas } from '../schema';

export type RenderAsset = {
  assetId: string;
  path: string;
  durationMs: number;
  width?: number;
  height?: number;
  fps?: number;
  // left undefined by an asset the ingest job has not probed yet
  hasAudio?: boolean;
};

export type FfmpegStep = {
  label: string;
  args: string[];
  output: string;
  // steps with no flag run together in the encoder's pool; a serial step waits
  // for the pool and runs in order, because it reads what the pool wrote
  serial?: boolean;
  // how much of the programme this step is worth on the progress bar
  weightMs?: number;
};

// the art's own size, because a click ring is rasterised at its bounding box
// rather than over the whole canvas
export type SvgFile = {
  path: string;
  svg: string;
  width: number;
  height: number;
};

export type ConcatListFile = { path: string; content: string };

export type RenderPlan = {
  canvas: Canvas;
  durationMs: number;
  steps: FfmpegStep[];
  output: string;
  svgs: SvgFile[];
  listFile?: ConcatListFile;
  // one list per tiled clip, for the assemble steps that stitch tiles back
  listFiles?: ConcatListFile[];
};
