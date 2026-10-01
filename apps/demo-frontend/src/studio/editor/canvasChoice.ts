import {
  Canvas,
  chooseCanvas,
  Clip,
  CursorLayer,
  SourceFormat,
} from '@asap-hub/demo-timeline';
import { ProjectAsset } from '../../api/types';

export type TimelineSource = ProjectAsset & { recorded?: boolean };

// A source the ingest is still preparing carries no format at all, and handing
// one to the chooser answered 1080p30 for footage that turned out to be 4K60.
const probed = (assets: (TimelineSource | undefined)[]): TimelineSource[] =>
  assets.filter((asset): asset is TimelineSource => Boolean(asset?.height));

export const canvasForAssets = (
  assets: (TimelineSource | undefined)[],
): Canvas | undefined => {
  const known: SourceFormat[] = probed(assets);
  return known.length === 0 ? undefined : chooseCanvas(known);
};

// A clip the studio recorded carries the moment its take began; an imported one
// never does. That is what tells an oversampled capture from footage a creator
// brought at the size they want it delivered at.
const recordedClipIds = (cursor: CursorLayer[]): Set<string> =>
  new Set(
    cursor.flatMap((layer) => (layer.recordedAtEpochMs ? [layer.clipId] : [])),
  );

// the cursor layers rather than the whole timeline, so a caller memoising on
// what this reads cannot go stale on a take whose layer lands after its clip
export const assetsOnTimeline = (
  clips: Clip[],
  assets: Record<string, ProjectAsset>,
  cursor?: CursorLayer[],
): (TimelineSource | undefined)[] => {
  const recorded = cursor ? recordedClipIds(cursor) : undefined;
  return clips.flatMap((clip) => {
    if (clip.kind !== 'source') {
      return [];
    }
    const asset = assets[clip.assetId];
    if (!asset) {
      return [undefined];
    }
    return [recorded?.has(clip.id) ? { ...asset, recorded: true } : asset];
  });
};

export const sameCanvas = (one: Canvas, other: Canvas): boolean =>
  one.width === other.width &&
  one.height === other.height &&
  one.fps === other.fps;

// The probe lands long after the clip was added, so the choice has to be made
// again. It only ever raises: dropping a 4K project to 1080p because one small
// source was probed last would throw away picture nobody asked to lose.
export const raiseCanvas = (current: Canvas, wanted: Canvas): Canvas => {
  const fps = (
    wanted.fps > current.fps ? wanted.fps : current.fps
  ) as Canvas['fps'];
  return wanted.height > current.height
    ? { width: wanted.width, height: wanted.height, fps }
    : { ...current, fps };
};
