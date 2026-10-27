import { Clip, limits, Transition } from './schema';

export type ClipPlacement = {
  clip: Clip;
  index: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  overlapMs: number;
};

export const clipDurationMs = (clip: Clip): number =>
  clip.kind === 'source'
    ? Math.max(0, clip.outMs - clip.inMs)
    : clip.durationMs;

const isVisualTransition = (
  transition: Transition | undefined,
): transition is Transition =>
  transition !== undefined && transition.type !== 'cut';

// a transition plays over both neighbours, so it can never eat more than half of either
export const transitionOverlapMs = (
  clip: Clip,
  previous: Clip | undefined,
): number => {
  const { transitionIn } = clip;
  if (!previous || !isVisualTransition(transitionIn)) {
    return 0;
  }
  const shortest = Math.min(clipDurationMs(clip), clipDurationMs(previous));
  return Math.min(transitionIn.durationMs, Math.floor(shortest / 2));
};

export const layoutClips = (clips: Clip[]): ClipPlacement[] => {
  const placements: ClipPlacement[] = [];

  clips.forEach((clip, index) => {
    const previous = placements[index - 1];
    const overlapMs = transitionOverlapMs(clip, clips[index - 1]);
    const durationMs = clipDurationMs(clip);
    const startMs = previous ? previous.endMs - overlapMs : 0;

    placements.push({
      clip,
      index,
      startMs,
      endMs: startMs + durationMs,
      durationMs,
      overlapMs,
    });
  });

  return placements;
};

// a clip only ever overlaps its immediate neighbour, so the last placement ends
// last even when transitions have pulled the ones before it backwards
export const placementsDurationMs = (placements: ClipPlacement[]): number =>
  placements.at(-1)?.endMs ?? 0;

export const timelineDurationMs = (clips: Clip[]): number =>
  placementsDurationMs(layoutClips(clips));

export const placementAt = (
  placements: ClipPlacement[],
  tMs: number,
): ClipPlacement | undefined =>
  placements.find(
    (placement, index) =>
      tMs >= placement.startMs &&
      (tMs < placement.endMs || index === placements.length - 1),
  );

export const sourceTimeAt = (
  placement: ClipPlacement,
  tMs: number,
): number | undefined =>
  placement.clip.kind === 'source'
    ? placement.clip.inMs + (tMs - placement.startMs)
    : undefined;

export const clipLocalMs = (placement: ClipPlacement, tMs: number): number =>
  tMs - placement.startMs;

export const findClip = (clips: Clip[], clipId: string): Clip | undefined =>
  clips.find((clip) => clip.id === clipId);

export const insertClipAt = (
  clips: Clip[],
  clip: Clip,
  index: number,
): Clip[] => {
  const target = Math.max(0, Math.min(index, clips.length));
  return [...clips.slice(0, target), clip, ...clips.slice(target)];
};

// the first clip can never have an incoming transition, there is nothing to blend with
const dropLeadingTransition = (clips: Clip[]): Clip[] =>
  clips.map((clip, index) =>
    index === 0 && clip.transitionIn
      ? { ...clip, transitionIn: undefined }
      : clip,
  );

export const removeClip = (clips: Clip[], clipId: string): Clip[] =>
  dropLeadingTransition(clips.filter((clip) => clip.id !== clipId));

export const moveClip = (
  clips: Clip[],
  clipId: string,
  toIndex: number,
): Clip[] => {
  const from = clips.findIndex((clip) => clip.id === clipId);
  const clip = clips[from];
  if (!clip) {
    return clips;
  }
  const without = clips.filter((_, index) => index !== from);
  return dropLeadingTransition(
    insertClipAt(without, clip, Math.max(0, Math.min(toIndex, without.length))),
  );
};

export type TrimChange = { inMs?: number; outMs?: number };

// The upper bound is the footage the asset actually holds. Until the ingest has
// probed it that length is unknown, and pinning the bound to the clip's own out
// point would mean a trim could only ever be taken further, never given back.
export const trimClip = (
  clips: Clip[],
  clipId: string,
  change: TrimChange,
  assetDurationMs?: number,
): Clip[] =>
  clips.map((clip) => {
    if (clip.id !== clipId || clip.kind !== 'source') {
      return clip;
    }

    const inMs = Math.max(0, Math.round(change.inMs ?? clip.inMs));
    // the bound rounds too: a fractional probed duration won whenever the out
    // point was dragged to the asset end, and one fraction fails every save
    const outMs = Math.min(
      Math.round(assetDurationMs ?? limits.maxTimelineMs),
      Math.round(change.outMs ?? clip.outMs),
    );

    return outMs - inMs < limits.minClipMs ? clip : { ...clip, inMs, outMs };
  });

const splitPieces = (clip: Clip, localMs: number): [Clip, Clip] | undefined => {
  // the playhead carries fractional milliseconds once playback has run, and a
  // document with a fractional time is rejected whole by the server
  const leftMs = Math.round(localMs);
  const rightMs = clipDurationMs(clip) - leftMs;
  if (leftMs < limits.minClipMs || rightMs < limits.minClipMs) {
    return undefined;
  }

  if (clip.kind === 'source') {
    const at = clip.inMs + leftMs;
    return [
      { ...clip, outMs: at },
      { ...clip, inMs: at, transitionIn: undefined },
    ];
  }

  return [
    { ...clip, durationMs: leftMs },
    { ...clip, durationMs: rightMs, transitionIn: undefined },
  ];
};

export const splitAt = (
  clips: Clip[],
  tMs: number,
  newClipId: string,
): Clip[] => {
  const placement = placementAt(layoutClips(clips), tMs);
  if (!placement) {
    return clips;
  }

  const pieces = splitPieces(placement.clip, clipLocalMs(placement, tMs));
  if (!pieces) {
    return clips;
  }

  const [left, right] = pieces;
  return [
    ...clips.slice(0, placement.index),
    left,
    { ...right, id: newClipId },
    ...clips.slice(placement.index + 1),
  ];
};
