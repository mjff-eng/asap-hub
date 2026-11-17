import { CursorEffect, NarrationClip, Zoom } from '@asap-hub/demo-timeline';
import { DragKind, Span } from './dragging';

// Moving a block carries the same audio to a new time; only trimming its start
// moves the point the recording is played from. Treating the two the same threw
// away the beginning of a take every time it was slid along the lane.
export const narrationChange = (
  take: NarrationClip,
  span: Span,
  drag: DragKind,
  assetDurationMs?: number,
): Partial<NarrationClip> => {
  const startMs = Math.round(span.startMs);
  const inMs =
    drag === 'trimStart'
      ? Math.max(0, Math.round(take.inMs + startMs - take.startMs))
      : take.inMs;
  const wanted = inMs + Math.round(span.durationMs);
  return {
    startMs,
    inMs,
    outMs:
      assetDurationMs === undefined
        ? wanted
        : Math.min(assetDurationMs, wanted),
  };
};

// A zoom is anchored to its clip, so the lane speaks programme time and this is
// where it converts. The ramps keep their shape; the hold is what a drag
// lengthens, and it can never go below nothing.
export const zoomChange = (
  zoom: Zoom,
  span: Span,
  clipStartMs: number,
): Partial<Zoom> => ({
  startMs: Math.max(0, Math.round(span.startMs) - clipStartMs),
  holdMs: Math.max(
    0,
    Math.round(span.durationMs) - zoom.rampInMs - zoom.rampOutMs,
  ),
});

// A cursor effect is a point on its clip rather than a block on the lane, so a
// drag comes back as one whole millisecond inside that clip. A fraction, or a
// moment outside the clip, is a document the server refuses in full.
export const effectChange = (
  span: Span,
  clipStartMs: number,
  clipDurationMs: number,
): Partial<CursorEffect> => ({
  tMs: Math.min(
    Math.max(0, Math.round(span.startMs - clipStartMs)),
    Math.max(0, Math.round(clipDurationMs)),
  ),
});
