import { ClipPlacement } from '../clips';
import { Canvas } from '../schema';
import {
  containerArgs,
  gopFrames,
  startArgs,
  videoEncodeArgs,
} from './encoding';
import {
  filterSegment,
  graph,
  label,
  secondsFromMs,
  timebaseFilter,
  xfadeTransition,
} from './filters';
import { blendPiecePath, clipOutputPath, copyPiecePath } from './paths';
import { FfmpegStep } from './types';

// A transition blends half a second and xfade re-encodes the whole programme to
// do it. Only the frames that actually blend have to be re-encoded: the rest of
// the programme is already the picture the export wants, so it is cut out and
// copied. Everything here works in frames, because the cuts have to land on
// whole frames of the canvas and a millisecond does not.
const frameAt = (ms: number, fps: number): number =>
  Math.round((ms * fps) / 1000);

const msFromFrames = (frames: number, fps: number): number =>
  (frames * 1000) / fps;

// A copied span can only open on a keyframe, and every clip carries one every
// gopFrames by construction (see encoding.ts). ffmpeg cuts a copy in decode
// order, so the end has to land on the grid too: a prefix that stops mid GOP
// holds the frames the encoder still needed, not the ones the picture shows.
// A clip assembled from tiles restarts that count at every tile, because each
// tile was an encode of its own, so the grid is read from where they began.
type Keyframes = {
  // the first frame of each tile, ascending and starting at zero
  tileStarts: number[];
  totalFrames: number;
};

const tileStartAt = (grid: Keyframes, frame: number): number =>
  grid.tileStarts.reduce((start, at) => (at <= frame ? at : start), 0);

const tileEndAt = (grid: Keyframes, start: number): number =>
  grid.tileStarts.find((at) => at > start) ?? grid.totalFrames;

const keyframeAtOrBefore = (grid: Keyframes, frame: number): number => {
  const start = tileStartAt(grid, frame);
  return start + Math.floor((frame - start) / gopFrames) * gopFrames;
};

const keyframeAtOrAfter = (grid: Keyframes, frame: number): number => {
  const start = tileStartAt(grid, frame);
  const at = start + Math.ceil((frame - start) / gopFrames) * gopFrames;
  const end = tileEndAt(grid, start);
  // past the tile's last GOP the next keyframe is wherever the next tile began
  return at < end ? at : end;
};

export type ClipCut = {
  totalFrames: number;
  // the first frame the join copies: the blend playing into this clip owns
  // everything before it
  fromFrame: number;
  // one past the last frame the join copies: the blend out of this clip owns
  // the rest
  toFrame: number;
};

// how a clip was encoded: one pass unless the plan tiled it, and then the
// offsets, in the clip's own time, each tile started at
export type TileStarts = Map<number, number[]>;

export const clipCuts = (
  placements: ClipPlacement[],
  fps: number,
  tileStarts: TileStarts = new Map(),
): ClipCut[] =>
  placements.map((placement, index) => {
    const totalFrames = frameAt(placement.durationMs, fps);
    const outgoingMs = placements[index + 1]?.overlapMs ?? 0;
    const grid: Keyframes = {
      totalFrames,
      tileStarts: (tileStarts.get(placement.index) ?? [0]).map((ms) =>
        frameAt(ms, fps),
      ),
    };
    return {
      totalFrames,
      fromFrame:
        placement.overlapMs > 0
          ? keyframeAtOrAfter(grid, frameAt(placement.overlapMs, fps))
          : 0,
      toFrame:
        outgoingMs > 0
          ? keyframeAtOrBefore(grid, totalFrames - frameAt(outgoingMs, fps))
          : totalFrames,
    };
  });

// A clip whose two blends meet, or cross, has no stretch left to copy and no
// way to hand the same frames to both: too short to segment at this GOP, and
// the join falls back to re-encoding the programme whole.
const cutsAreSound = (cuts: ClipCut[]): boolean =>
  cuts.every((cut) => cut.fromFrame <= cut.toFrame);

const wholeClip = (cut: ClipCut): boolean =>
  cut.fromFrame === 0 && cut.toFrame === cut.totalFrames;

// a copy is far cheaper than an encode, whatever the length: the same fraction
// the tile assembly bills itself at
const copyWeightMs = (durationMs: number): number =>
  Math.round(durationMs / 20);

const copyStep = (
  placement: ClipPlacement,
  cut: ClipCut,
  fps: number,
  workDir: string,
): FfmpegStep => {
  const output = copyPiecePath(workDir, placement.index);
  return {
    label: `cut clip ${placement.index} for the join`,
    output,
    serial: true,
    weightMs: copyWeightMs(msFromFrames(cut.toFrame - cut.fromFrame, fps)),
    args: [
      ...startArgs,
      // both ends sit on the keyframe grid, so the seek is exact and the frame
      // count is the presentation order the picture is in
      ...(cut.fromFrame > 0
        ? ['-ss', secondsFromMs(msFromFrames(cut.fromFrame, fps))]
        : []),
      '-i',
      clipOutputPath(workDir, placement.index),
      // mapping the picture alone leaves the piece with no audio to keep in
      // step: the join rebuilds the programme's audio from the clips
      '-map',
      '0:v',
      ...(cut.toFrame < cut.totalFrames
        ? ['-frames:v', String(cut.toFrame - cut.fromFrame)]
        : []),
      '-c',
      'copy',
      ...containerArgs,
      output,
    ],
  };
};

const blendStep = (
  left: ClipPlacement,
  leftCut: ClipCut,
  right: ClipPlacement,
  rightCut: ClipCut,
  canvas: Canvas,
  workDir: string,
): FfmpegStep => {
  const { fps } = canvas;
  const output = blendPiecePath(workDir, right.index);
  const leadFrames = leftCut.totalFrames - leftCut.toFrame;
  const overlapFrames = frameAt(right.overlapMs, fps);
  const pieceFrames = leadFrames + rightCut.fromFrame - overlapFrames;

  return {
    label: `blend clip ${left.index} into clip ${right.index}`,
    output,
    serial: true,
    weightMs: Math.round(msFromFrames(pieceFrames, fps)),
    args: [
      ...startArgs,
      '-accurate_seek',
      '-ss',
      secondsFromMs(msFromFrames(leftCut.toFrame, fps)),
      '-i',
      clipOutputPath(workDir, left.index),
      '-t',
      secondsFromMs(msFromFrames(rightCut.fromFrame, fps)),
      '-i',
      clipOutputPath(workDir, right.index),
      '-filter_complex',
      graph([
        filterSegment(['0:v'], [timebaseFilter], 'bl'),
        filterSegment(['1:v'], [timebaseFilter], 'br'),
        filterSegment(
          ['bl', 'br'],
          [
            `xfade=transition=${xfadeTransition(
              right.clip.transitionIn,
            )}:duration=${secondsFromMs(
              right.overlapMs,
            )}:offset=${secondsFromMs(
              // the blend lands at the end of the lead in, which is however
              // much of the outgoing clip the keyframe grid pulled in
              msFromFrames(leadFrames - overlapFrames, fps),
            )}`,
          ],
          'bv',
        ),
      ]),
      '-map',
      label('bv'),
      ...videoEncodeArgs(canvas),
      ...containerArgs,
      output,
    ],
  };
};

export type JoinPieces = {
  // what the join's concat demuxer reads, in programme order
  paths: string[];
  // the cuts and blends that write them, in the order they have to run
  steps: FfmpegStep[];
};

// undefined when the programme cannot be segmented, and the caller re-encodes
export const joinPieces = (
  placements: ClipPlacement[],
  canvas: Canvas,
  workDir: string,
  tileStarts?: TileStarts,
): JoinPieces | undefined => {
  const cuts = clipCuts(placements, canvas.fps, tileStarts);
  if (!cutsAreSound(cuts)) {
    return undefined;
  }

  const paths: string[] = [];
  const steps: FfmpegStep[] = [];

  placements.forEach((placement, index) => {
    const cut = cuts[index] as ClipCut;
    const previous = placements[index - 1];
    const previousCut = cuts[index - 1];
    if (previous && previousCut && placement.overlapMs > 0) {
      const step = blendStep(
        previous,
        previousCut,
        placement,
        cut,
        canvas,
        workDir,
      );
      steps.push(step);
      paths.push(step.output);
    }
    if (wholeClip(cut)) {
      paths.push(clipOutputPath(workDir, placement.index));
    } else if (cut.toFrame > cut.fromFrame) {
      const step = copyStep(placement, cut, canvas.fps, workDir);
      steps.push(step);
      paths.push(step.output);
    }
  });

  return { paths, steps };
};
