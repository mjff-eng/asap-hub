import { ClipPlacement, limits } from '@asap-hub/demo-timeline';

export type OverlapDrop = { clipId: string; durationMs: number };

// how far a clip has to be dragged before it means to blend rather than to be
// put back where it was
export const overlapDeadZoneMs = 120;

// the same ceiling the layout applies: a transition plays over both clips, so
// it can never eat more than half of either, and the document caps it as well
export const maxOverlapMs = (
  before: ClipPlacement,
  after: ClipPlacement,
): number =>
  Math.min(
    limits.transitionMs,
    Math.floor(Math.min(before.durationMs, after.durationMs) / 2),
  );

// The video track is gapless and ordered, and a clip's only freedom is how far
// it sits over the one beside it. That distance is exactly the overlap the
// layout already derives from an incoming transition, so dragging a clip over
// its neighbour sets that transition rather than inventing a free position.
//
// Dragging left always blends with the clip before. Dragging right first gives
// back an existing blend, and only pushes into the clip after once there is
// none left to give, so one drag ever touches one join.
export const overlapAfterDrag = (
  placements: ClipPlacement[],
  index: number,
  deltaMs: number,
): OverlapDrop | undefined => {
  const dragged = placements[index];
  if (!dragged || Math.abs(deltaMs) < overlapDeadZoneMs) {
    return undefined;
  }

  const onPrevious = deltaMs < 0 || dragged.overlapMs > 0;
  const before = onPrevious ? placements[index - 1] : dragged;
  const after = onPrevious ? dragged : placements[index + 1];
  if (!before || !after) {
    return undefined;
  }

  const wanted = after.overlapMs + (onPrevious ? -deltaMs : deltaMs);
  const capped = Math.min(maxOverlapMs(before, after), Math.round(wanted));
  // anything shorter than the shortest clip the timeline allows reads as a cut
  const durationMs = capped < limits.minClipMs ? 0 : capped;

  return durationMs === after.overlapMs
    ? undefined
    : { clipId: after.clip.id, durationMs };
};

export const overlapHint = (durationMs: number): string =>
  durationMs === 0 ? 'Cut' : `Crossfade ${(durationMs / 1000).toFixed(1)}s`;
