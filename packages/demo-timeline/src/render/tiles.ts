import { ClipPlacement } from '../clips';
import { SourceClip, Zoom } from '../schema';
import { clipZooms } from '../zoom';
import { audioCodecArgs, containerArgs, startArgs } from './encoding';
import { filterSegment, graph, label } from './filters';
import { concatListContent } from './joinStep';
import { clipOutputPath, tileListPath } from './paths';
import { ConcatListFile, FfmpegStep, RenderAsset } from './types';
import { sameWindow, StillWindow, ZoomSpan, zoomSpans } from './zoomSegments';

// One clip is one ffmpeg process, so a single long take used to hold the whole
// pool hostage: fifty minutes of demo encoded one core-group at a time. Past
// this length a clip is cut into tiles, each encoded in the pool like a clip of
// its own, and stitched back with the same sample accurate join the programme
// itself uses. Every seam lands on a whole frame of the canvas: a tile is cut
// with -ss/-to and re-timed by its own fps filter, so a boundary inside a
// frame would round two ways and cost or repeat that frame at the seam.
export const tileThresholdMs = 90_000;
export const tileTargetMs = 60_000;
// a stub shorter than this rides with the tile before it instead
export const tileTailMs = 20_000;

// A clip with any zoom used to pay the per frame rescale for its whole
// length. Boundaries are therefore also cut where the zoom state changes:
// a quiet stretch carries no zoom chain at all, a held one cuts its fixed
// window straight out of the source, and only the ramps re-derive the
// window per frame. A stretch has to be worth a process of its own to earn
// a cut; the ramps buy their way in by eating into their neighbours, but a
// hold is the whole point of the cutting, so it is never eaten below the
// least a cheap tile is worth.
export const minZoomTileMs = 4000;
export const minStillTileMs = 2500;

const worthMs = (span: ZoomSpan): number =>
  span.kind === 'still' ? minStillTileMs : minZoomTileMs;

const lengthMs = (span: ZoomSpan): number => span.endMs - span.startMs;

// quiet donates time before still: a frame rendered by the wrong-but-exact
// moving chain costs more where the cheap chain would have been cheapest
const donorRank = (span?: ZoomSpan): number =>
  span === undefined || span.kind === 'moving'
    ? 2
    : span.kind === 'still'
      ? 1
      : 0;

// a ramp is far shorter than a tile is worth, so each moving span grows to
// tile size by taking time off its neighbours; the moving chain is exact at
// every instant, so the taken stretch is merely rendered the slower way
const grownMoving = (spans: ZoomSpan[]): ZoomSpan[] => {
  const out = spans.map((span) => ({ ...span }));
  for (let at = 0; at < out.length; at += 1) {
    const span = out[at];
    if (span && span.kind === 'moving') {
      let need = minZoomTileMs - lengthMs(span);
      [at - 1, at + 1]
        .sort((a, b) => donorRank(out[a]) - donorRank(out[b]))
        .forEach((side) => {
          const donor = out[side];
          if (!donor || need <= 0 || donor.kind === 'moving') {
            return;
          }
          const surplus =
            donor.kind === 'still'
              ? Math.max(0, lengthMs(donor) - minStillTileMs)
              : lengthMs(donor);
          const gift = Math.min(need, surplus);
          if (side < at) {
            donor.endMs -= gift;
            span.startMs -= gift;
          } else {
            donor.startMs += gift;
            span.endMs += gift;
          }
          need -= gift;
        });
    }
  }
  return out.filter((span) => lengthMs(span) > 0);
};

const mergedSpan = (a: ZoomSpan, b: ZoomSpan): ZoomSpan => {
  const alike =
    a.kind === b.kind && (a.kind !== 'still' || sameWindow(a.window, b.window));
  return {
    startMs: Math.min(a.startMs, b.startMs),
    endMs: Math.max(a.endMs, b.endMs),
    kind: alike ? a.kind : 'moving',
    ...(alike && a.kind === 'still' && a.window ? { window: a.window } : {}),
  };
};

// whatever stayed too short after the growing joins a neighbour; mixed kinds
// come out moving, because that chain alone is right everywhere
const absorbed = (spans: ZoomSpan[]): ZoomSpan[] => {
  const out = spans.map((span) => ({ ...span }));
  for (;;) {
    if (out.length < 2) {
      return out;
    }
    const at = out.findIndex((span) => lengthMs(span) < worthMs(span));
    if (at < 0) {
      return out;
    }
    const left = at > 0 ? at - 1 : undefined;
    const right = at < out.length - 1 ? at + 1 : undefined;
    const partnerAt =
      left === undefined
        ? right ?? at
        : right === undefined
          ? left
          : donorRank(out[left]) >= donorRank(out[right])
            ? left
            : right;
    const from = Math.min(at, partnerAt);
    const first = out[from];
    const second = out[from + 1];
    if (!first || !second) {
      return out;
    }
    out.splice(from, 2, mergedSpan(first, second));
  }
};

// growing and absorbing can leave two alike stretches touching; they are
// one tile, not two
const joined = (spans: ZoomSpan[]): ZoomSpan[] =>
  spans.reduce<ZoomSpan[]>((out, span) => {
    const last = out[out.length - 1];
    if (
      last &&
      last.kind === span.kind &&
      (span.kind !== 'still' || sameWindow(last.window, span.window))
    ) {
      last.endMs = span.endMs;
      return out;
    }
    return [...out, { ...span }];
  }, []);

// a boundary inside a frame is a boundary two ffmpeg runs round differently;
// every seam is pulled back to the frame that contains it, and a stretch left
// with no frames at all disappears into its neighbour
const onFrames = (
  spans: ZoomSpan[],
  durationMs: number,
  fps?: number,
): ZoomSpan[] => {
  if (!fps) {
    return spans;
  }
  const frameMs = 1000 / fps;
  const snap = (ms: number): number =>
    Math.min(durationMs, Math.round(Math.round(ms / frameMs) * frameMs));
  return spans
    .map((span) => ({
      ...span,
      startMs: span.startMs === 0 ? 0 : snap(span.startMs),
      endMs: span.endMs >= durationMs ? durationMs : snap(span.endMs),
    }))
    .filter((span) => span.endMs > span.startMs)
    .map((span, at, all) => {
      const before = all[at - 1];
      return before ? { ...span, startMs: before.endMs } : span;
    });
};

// the run of quiet, still and moving stretches a clip's zooms make of it,
// each long enough to stand as a tile
export const zoomTileSpans = (
  zooms: Zoom[],
  clipId: string,
  durationMs: number,
  fps?: number,
): ZoomSpan[] =>
  onFrames(
    joined(
      absorbed(grownMoving(zoomSpans(clipZooms(zooms, clipId), durationMs))),
    ),
    durationMs,
    fps,
  );

export type TileSpan = { startMs: number; endMs: number };

const gridded = (from: number, to: number): TileSpan[] => {
  const spans: TileSpan[] = [];
  for (let at = from; at < to; at += tileTargetMs) {
    spans.push({ startMs: at, endMs: Math.min(at + tileTargetMs, to) });
  }
  const last = spans[spans.length - 1];
  const before = spans[spans.length - 2];
  if (last && before && last.endMs - last.startMs < tileTailMs) {
    before.endMs = last.endMs;
    spans.pop();
  }
  return spans;
};

export type ClipTile = {
  placement: ClipPlacement;
  // how far into the clip's own time this tile starts: what a zoom's clip
  // local start has to come down by to speak the tile's time
  shiftMs: number;
  // whether a zoom is in flight anywhere in this tile; a quiet tile skips
  // the whole per frame rescale chain
  zoomed: boolean;
  // the one constant window every zoom over this tile holds, when the tile
  // is a held stretch: the picture cuts it out of the source directly
  window?: StillWindow;
};

// The tile is a source clip in its own right: banners clip to its programme
// span, capture times shift through its own inMs, and the held tail lands on
// whichever tile the footage runs out in. Everything the clip step already
// does is right for a tile, so the tile IS a placement.
export const tilePlacements = (
  placement: ClipPlacement,
  assets: Map<string, RenderAsset>,
  indexOf: () => number,
  zooms: Zoom[] = [],
  fps?: number,
): ClipTile[] => {
  const { clip } = placement;
  const footageMs =
    clip.kind === 'source' ? assets.get(clip.assetId)?.durationMs : undefined;

  // a tile that starts past the end of the footage would be an empty input,
  // so the boundaries stop at the footage and the last tile holds the rest
  const boundMs =
    clip.kind === 'source' && footageMs !== undefined
      ? Math.min(
          placement.durationMs,
          Math.max(1, Math.round(footageMs) - clip.inMs),
        )
      : placement.durationMs;
  const states =
    clip.kind === 'source' ? zoomTileSpans(zooms, clip.id, boundMs, fps) : [];

  const only = states.length === 1 ? states[0] : undefined;
  const whole: ClipTile[] = [
    {
      placement,
      shiftMs: 0,
      zoomed: states.some((state) => state.kind !== 'quiet'),
      ...(only?.kind === 'still' && only.window ? { window: only.window } : {}),
    },
  ];
  // a long clip tiles for the pool; a shorter one tiles as soon as the zoom
  // states cut it into stretches each worth a process of its own
  const worthIt = placement.durationMs > tileThresholdMs || states.length > 1;
  if (clip.kind !== 'source' || !worthIt || footageMs === undefined) {
    return whole;
  }

  const spans = states.flatMap((state) =>
    gridded(state.startMs, state.endMs).map((span) => ({
      ...span,
      kind: state.kind,
      ...(state.window ? { window: state.window } : {}),
    })),
  );
  const lastSpan = spans[spans.length - 1];
  if (lastSpan) {
    lastSpan.endMs = placement.durationMs;
  }
  if (spans.length < 2) {
    return whole;
  }

  return spans.map((span) => {
    const tileClip: SourceClip = {
      ...clip,
      inMs: clip.inMs + span.startMs,
      outMs: clip.inMs + span.endMs,
    };
    return {
      placement: {
        clip: tileClip,
        index: indexOf(),
        startMs: placement.startMs + span.startMs,
        endMs: placement.startMs + span.endMs,
        durationMs: span.endMs - span.startMs,
        overlapMs: 0,
      },
      shiftMs: span.startMs,
      zoomed: span.kind === 'moving',
      ...(span.kind === 'still' && span.window ? { window: span.window } : {}),
    };
  });
};

// a zoom's startMs speaks the clip's own time; inside a tile the clock starts
// at the tile, so the zoom comes down by the tile's shift. The expressions are
// pure functions of t, so a zoom already mid ramp at a tile's first frame
// still draws the exact window it would have in one piece.
export const shiftZoomsForTile = (
  zooms: Zoom[],
  clipId: string,
  shiftMs: number,
): Zoom[] =>
  shiftMs === 0
    ? zooms
    : zooms.map((zoom) =>
        zoom.clipId === clipId
          ? { ...zoom, startMs: zoom.startMs - shiftMs }
          : zoom,
      );

export type AssembleStep = { step: FfmpegStep; listFile: ConcatListFile };

// the tiles come back together exactly the way the cut only join works: video
// copied off the concat demuxer under -copyts, audio rebuilt through the
// concat filter so no per tile AAC priming leaks into the middle of a clip
export const buildAssembleStep = (
  clipIndex: number,
  tiles: ClipTile[],
  workDir: string,
): AssembleStep => {
  const listPath = tileListPath(workDir, clipIndex);
  const tilePaths = tiles.map((tile) =>
    clipOutputPath(workDir, tile.placement.index),
  );
  const audioInputs = tiles.map((_unused, position) => `${position + 1}:a`);
  const durationMs = tiles.reduce(
    (total, tile) => total + tile.placement.durationMs,
    0,
  );

  return {
    listFile: { path: listPath, content: concatListContent(tilePaths) },
    step: {
      label: `assemble clip ${clipIndex} from ${tiles.length} tiles`,
      output: clipOutputPath(workDir, clipIndex),
      serial: true,
      // a stream copy is far cheaper than an encode, whatever the length
      weightMs: Math.round(durationMs / 20),
      args: [
        ...startArgs,
        '-copyts',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        ...tilePaths.flatMap((path) => ['-i', path]),
        '-filter_complex',
        graph([
          filterSegment(
            audioInputs,
            [`concat=n=${audioInputs.length}:v=0:a=1`],
            'ta',
          ),
        ]),
        '-map',
        '0:v',
        '-map',
        label('ta'),
        '-c:v',
        'copy',
        ...audioCodecArgs,
        ...containerArgs,
        clipOutputPath(workDir, clipIndex),
      ],
    },
  };
};
