import {
  layoutClips,
  placementsDurationMs,
  timelineDurationMs,
} from '../clips';
import { Timeline } from '../schema';
import { assetIndex } from './assets';
import { buildClipStep } from './clipSteps';
import { TileStarts } from './joinPieces';
import { buildJoinStep } from './joinStep';
import { buildAssembleStep, shiftZoomsForTile, tilePlacements } from './tiles';
import {
  ConcatListFile,
  FfmpegStep,
  RenderAsset,
  RenderPlan,
  SvgFile,
} from './types';

export const renderDurationMs = (timeline: Timeline): number =>
  timelineDurationMs(timeline.clips);

// a banner spanning a transition is overlaid on every clip it reaches, and each
// of those clips asks for the same file, so the caller rasterises it once
const uniqueByPath = (svgs: SvgFile[]): SvgFile[] => [
  ...new Map(svgs.map((svg) => [svg.path, svg])).values(),
];

export type RenderPlanInput = {
  timeline: Timeline;
  assets: RenderAsset[];
  workDir: string;
  output: string;
};

export const buildRenderPlan = ({
  timeline,
  assets,
  workDir,
  output,
}: RenderPlanInput): RenderPlan => {
  const { canvas, banners, narration, cursor, zooms } = timeline;
  const placements = layoutClips(timeline.clips);
  const durationMs = placementsDurationMs(placements);
  const index = assetIndex(assets);

  if (placements.length === 0) {
    return { canvas, durationMs, steps: [], output, svgs: [] };
  }

  // a long clip encodes as tiles so the pool can chew it in parallel; tile
  // indices continue past the real clips so no output or art path collides
  let nextTileIndex = placements.length;
  const takeIndex = () => {
    const at = nextTileIndex;
    nextTileIndex += 1;
    return at;
  };

  // with nothing but cuts, the join can read the tiles straight off the list
  // and the per clip reassembly disappears: one less pass over the whole
  // programme and one less generation of its audio
  const cutOnly = placements.every((placement) => placement.overlapMs === 0);

  const encodeSteps: FfmpegStep[] = [];
  const assembleSteps: FfmpegStep[] = [];
  const listFiles: ConcatListFile[] = [];
  const svgs: SvgFile[] = [];
  const joinPieces: typeof placements = [];
  const tileStarts: TileStarts = new Map();

  placements.forEach((placement) => {
    const tiles = tilePlacements(
      placement,
      index,
      takeIndex,
      zooms,
      canvas.fps,
    );
    const whole = tiles.length === 1;
    tiles.forEach((tile) => {
      const built = buildClipStep({
        placement: whole ? placement : tile.placement,
        canvas,
        banners,
        cursor,
        // a quiet tile carries no zoom at all, and with it goes the whole
        // per frame rescale chain; a held tile keeps its zooms for the
        // overlays riding the window, but the picture cuts the window out
        // of the source directly
        zooms:
          tile.zoomed || tile.window
            ? shiftZoomsForTile(zooms, placement.clip.id, tile.shiftMs)
            : zooms.filter((zoom) => zoom.clipId !== placement.clip.id),
        assets: index,
        workDir,
        ...(tile.window ? { stillWindow: tile.window } : {}),
      });
      encodeSteps.push({
        ...built.step,
        weightMs: whole ? placement.durationMs : tile.placement.durationMs,
      });
      svgs.push(...built.svgs);
      joinPieces.push(whole ? placement : tile.placement);
    });
    if (!whole && !cutOnly) {
      const assembled = buildAssembleStep(placement.index, tiles, workDir);
      assembleSteps.push(assembled.step);
      listFiles.push(assembled.listFile);
      // the assembled clip carries a keyframe at every tile it was stitched
      // from, which is the only grid the join can cut it on
      tileStarts.set(
        placement.index,
        tiles.map((tile) => tile.shiftMs),
      );
    }
  });

  const join = buildJoinStep({
    placements: cutOnly ? joinPieces : placements,
    canvas,
    narration,
    assets: index,
    durationMs,
    workDir,
    output,
    tileStarts,
  });

  return {
    canvas,
    durationMs,
    steps: [
      ...encodeSteps,
      ...assembleSteps,
      ...(join.pieces ?? []),
      {
        ...join.step,
        serial: true,
        // a join that reads pieces copies the picture, and the encoding it
        // still owes the programme is billed to the blends that do it
        weightMs: join.pieces ? Math.round(durationMs / 20) : durationMs,
      },
    ],
    output,
    svgs: uniqueByPath(svgs),
    ...(join.listFile ? { listFile: join.listFile } : {}),
    ...(listFiles.length > 0 ? { listFiles } : {}),
  };
};

export const describePlan = (plan: RenderPlan): string[] =>
  plan.steps.map(
    (step, position) =>
      `${position + 1}/${plan.steps.length} ${step.label} -> ${step.output}`,
  );
