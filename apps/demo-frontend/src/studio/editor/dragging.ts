import { limits } from '@asap-hub/demo-timeline';

export type DragKind = 'move' | 'trimStart' | 'trimEnd';

export type Span = { startMs: number; durationMs: number };

// A drag is measured from where it started, against the values the item had
// then. Reading the item back on every pointer move feeds its own movement into
// the next frame, so the edge accelerates away from the pointer instead of
// following it.
export type SpanDrag = Span & { kind: DragKind; originMs: number };

export type TrimDrag = {
  kind: 'trimStart' | 'trimEnd';
  originMs: number;
  inMs: number;
  outMs: number;
};

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

// banners, zooms and voice over all sit on their own lane at an absolute time,
// so one function moves and resizes every one of them
export const spanAfterDrag = (
  drag: SpanDrag,
  tMs: number,
  minMs: number = limits.minClipMs,
): Span => {
  const delta = tMs - drag.originMs;
  const endMs = drag.startMs + drag.durationMs;

  if (drag.kind === 'move') {
    return {
      startMs: Math.max(0, drag.startMs + delta),
      durationMs: drag.durationMs,
    };
  }

  if (drag.kind === 'trimStart') {
    const startMs = clamp(drag.startMs + delta, 0, endMs - minMs);
    return { startMs, durationMs: endMs - startMs };
  }

  return {
    startMs: drag.startMs,
    durationMs: Math.max(minMs, drag.durationMs + delta),
  };
};

// A source clip keeps its place on a gapless track, so trimming it moves the
// window into the footage rather than the block's left edge. The upper bound is
// the asset's real length, which only the reducer knows, so it clamps there.
export const trimAfterDrag = (
  drag: TrimDrag,
  tMs: number,
): { inMs?: number; outMs?: number } => {
  const delta = tMs - drag.originMs;
  return drag.kind === 'trimStart'
    ? { inMs: clamp(drag.inMs + delta, 0, drag.outMs - limits.minClipMs) }
    : { outMs: Math.max(drag.inMs + limits.minClipMs, drag.outMs + delta) };
};
