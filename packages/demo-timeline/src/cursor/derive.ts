import { CursorEffect, CursorPathPoint, limits, Point } from '../schema';
import { toFramePoint } from './geometry';
import { dedupeCaptureEvents } from './parse';
import { resamplePath } from './path';
import { sourceTimeMs } from './slice';
import {
  CaptureEvent,
  CaptureEventType,
  DeriveOptions,
  DerivedCursor,
} from './types';

export const defaultDedupeWindowMs = 250;

type PlacedEvent = {
  event: CaptureEvent;
  tMs: number;
  point: Point;
};

// the events that say where the pointer actually was; a scroll or a resize
// carries the last known position and would flatten the path
const pathEventTypes: readonly CaptureEventType[] = ['move', 'down', 'click'];

// What names the click an effect came from. Two tabs, or one page reloaded
// mid session, both number their events from e1, so the tab that reported it is
// part of the name; a stream written before the snippet sent one keeps exactly
// the names it has always had, and a re-apply still recognises its own effects.
const sourceEventKey = (event: CaptureEvent): string =>
  (event.client ? `${event.client}-${event.id}` : event.id).slice(0, 64);

// the document caps an id at 64 characters
const effectId = (type: CursorEffect['type'], eventId: string): string =>
  `${type}-${eventId}`.slice(0, 64);

// The video's t=0 is the instant the take started, so that is the origin the
// capture has to be read against. The creator switches to the tab they are
// demoing and clicks the bookmark seconds later, so the capture's own first
// event is only the origin when the take's start is not known at all: an
// imported video, or a clip recorded before the studio kept it.
export const captureOriginMs = (
  events: CaptureEvent[],
  startedAtEpochMs?: number,
): number =>
  startedAtEpochMs ??
  events.reduce(
    (earliest, event) => Math.min(earliest, event.t),
    Number.POSITIVE_INFINITY,
  );

const place = (
  events: CaptureEvent[],
  options: DeriveOptions,
): PlacedEvent[] => {
  const offsetMs = options.offsetMs ?? 0;
  const origin = captureOriginMs(events, options.startedAtEpochMs);
  return events
    .flatMap((event) => {
      // wall clock to clip-local, with every pause the footage skipped taken
      // out: anything captured during a pause was never filmed, and anything
      // before the take started, or past the longest timeline the document
      // allows, cannot be represented
      const source = sourceTimeMs(event.t, origin, options.pauses);
      if (source === undefined) {
        return [];
      }
      const tMs = Math.round(source + offsetMs);
      if (tMs < 0 || tMs > limits.maxTimelineMs) {
        return [];
      }
      const point = toFramePoint(
        event,
        options.frame,
        options.surface,
        options.source,
      );
      return point ? [{ event, tMs, point }] : [];
    })
    .sort((a, b) => a.tMs - b.tMs);
};

const never = (): boolean => false;

// drops an event that lands within gapMs of the one before it, or that repeats
// whatever the caller counts as the same subject; comparing against the last
// kept event rather than the last seen one keeps a long burst collapsed to one
const collapseRepeats = (
  placed: PlacedEvent[],
  gapMs: number,
  sameSubject: (previous: PlacedEvent, current: PlacedEvent) => boolean = never,
): PlacedEvent[] => {
  const kept: PlacedEvent[] = [];
  placed.forEach((current) => {
    const previous = kept[kept.length - 1];
    if (
      previous &&
      (sameSubject(previous, current) || current.tMs - previous.tMs < gapMs)
    ) {
      return;
    }
    kept.push(current);
  });
  return kept;
};

const toEffect = (
  type: CursorEffect['type'],
  placed: PlacedEvent,
  tMs: number = placed.tMs,
): CursorEffect => {
  const key = sourceEventKey(placed.event);
  return {
    id: effectId(type, key),
    tMs,
    type,
    point: placed.point,
    origin: 'derived',
    sourceEventId: key,
  };
};

const autoZoomEffects = (
  clicks: PlacedEvent[],
  options: DeriveOptions,
): CursorEffect[] => {
  const { autoZoom } = options;
  // a zoom to 1 is a no-op, and the effect record carries no scale of its own:
  // the editor applies the configured scale when it materialises the zoom
  if (!autoZoom || !autoZoom.enabled || autoZoom.scale <= 1) {
    return [];
  }

  // a zoom may not start before the previous one has finished holding, or the
  // render stutters through a burst of clicks on the same control
  const gapMs = Math.max(autoZoom.minGapMs, autoZoom.holdMs);
  const effects: CursorEffect[] = [];
  let previousTMs = -Infinity;

  clicks.forEach((click) => {
    const tMs = Math.max(0, click.tMs - autoZoom.leadMs);
    if (tMs - previousTMs < gapMs) {
      return;
    }
    previousTMs = tMs;
    effects.push(toEffect('zoom', click, tMs));
  });

  return effects;
};

export const deriveCursorEffects = (
  events: CaptureEvent[],
  options: DeriveOptions,
): DerivedCursor => {
  // a stream polluted by a stacked snippet carries every event several times,
  // and a tripled click must still come out as one ripple
  const placed = place(dedupeCaptureEvents(events), options);
  const dedupeWindowMs = options.dedupeWindowMs ?? defaultDedupeWindowMs;

  const path: CursorPathPoint[] = resamplePath(
    placed
      .filter(({ event }) => pathEventTypes.includes(event.type))
      .map(({ tMs, point }) => ({ tMs, x: point.x, y: point.y })),
    limits.cursorPathPoints,
  );

  const clicks = collapseRepeats(
    placed.filter(({ event }) => event.type === 'click'),
    dedupeWindowMs,
  );

  // a hover spotlight repeats while the pointer wanders inside one element, so
  // the same target in a row is collapsed as well as a rapid repeat
  const hovers = collapseRepeats(
    placed.filter(({ event }) => event.type === 'over'),
    dedupeWindowMs,
    (previous, current) =>
      previous.event.target !== undefined &&
      previous.event.target === current.event.target,
  );

  // ripples are what a viewer expects from a click; the rest are opt-in
  const ripples =
    options.ripples === false
      ? []
      : clicks.map((click) => toEffect('ripple', click));
  const spotlights = options.spotlight
    ? hovers.map((hover) => toEffect('spotlight', hover))
    : [];

  const effects = [
    ...ripples,
    ...spotlights,
    ...autoZoomEffects(clicks, options),
  ]
    .sort((a, b) => a.tMs - b.tMs)
    .slice(0, limits.cursorEffects);

  return { path, effects };
};
