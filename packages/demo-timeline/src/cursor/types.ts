import {
  CaptureSurface,
  CursorEffect,
  CursorPathPoint,
  RecordedPause,
} from '../schema';

export const captureEventTypes = [
  'move',
  'down',
  'click',
  'over',
  'scroll',
  'resize',
] as const;

export type CaptureEventType = (typeof captureEventTypes)[number];

// Where the page and the pointer sat on the screen when an event was recorded,
// all in CSS pixels of the screen coordinate space, so a ratio taken inside it
// is free of the display's resolution, its pixel ratio and the browser's zoom.
// Every field is optional: a stream captured before the snippet sent them still
// loads, and falls back to the viewport mapping it was derived under.
export type CaptureGeometry = {
  // the pointer on the virtual desktop, which spans every display: negative or
  // past the primary width when the window is on another monitor
  screenX?: number;
  screenY?: number;
  // the display this window is on, and where its own origin sits on that desktop
  screenW?: number;
  screenH?: number;
  screenLeft?: number;
  screenTop?: number;
  // the browser window's box on the desktop, chrome included
  winX?: number;
  winY?: number;
  winW?: number;
  winH?: number;
};

// one line of the immutable NDJSON stream the capture snippet wrote to S3; the
// stream carries more fields than this (the pixel ratio), and the derivation
// only reads the ones it needs
export type CaptureEvent = CaptureGeometry & {
  id: string;
  // which tab reported it: every copy of the snippet numbers its events from
  // e1, so the id alone is only unique inside one page. Absent on a stream
  // written before the snippet sent it, and then the id stands on its own.
  client?: string;
  type: CaptureEventType;
  t: number;
  x: number;
  y: number;
  viewportW: number;
  viewportH: number;
  // CSS px to device px, for reading the footage's own size against the boxes
  devicePixelRatio?: number;
  target?: string;
  // navigator.platform, which is the only thing separating a Wayland window
  // reporting a fabricated origin from a maximised Windows one
  platform?: string;
};

export type AutoZoomOptions = {
  enabled: boolean;
  scale: number;
  leadMs: number;
  holdMs: number;
  minGapMs: number;
};

export type DeriveOptions = {
  // when the take this capture belongs to started, in wall clock, which is what
  // the footage shows at t=0. Left out, the capture's own first event is the
  // origin, which is late by however long the creator took to click the
  // bookmark, and only stands when nothing better is known
  startedAtEpochMs?: number;
  // shifts every derived time, for a take whose capture and whose clip did not
  // start together; anything pushed before the clip start is dropped
  offsetMs?: number;
  // the wall clock spans the recorder stood paused for, which the footage never
  // shows: an event inside one is dropped and everything after it moves up by
  // the whole pause
  pauses?: RecordedPause[];
  frame: { width: number; height: number };
  // the footage's own pixel size, the ground truth about what was shared: the
  // portal on Wayland picks the surface itself, and what arrives can disagree
  // with what the browser believes it asked for
  source?: { width: number; height: number };
  // what the recording shows, which decides which of the capture's coordinates
  // land on the frame; a capture applied before the studio asked the browser is
  // read as a tab, the way it was read then
  surface?: CaptureSurface;
  ripples?: boolean;
  spotlight?: boolean;
  autoZoom?: AutoZoomOptions;
  dedupeWindowMs?: number;
};

export type DerivedCursor = {
  path: CursorPathPoint[];
  effects: CursorEffect[];
};

export type MergedCursorEffects = {
  effects: CursorEffect[];
  added: number;
  removed: number;
  keptEdits: number;
};
