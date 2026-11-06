const token = (name: string): string => `var(--demo-editor-${name})`;

// The studio follows the app theme like every other page; the values live with
// the rest of the tokens in GlobalStyles. Only the stage stays a dark matte in
// both themes, the way every editor frames footage.
export const editorTheme = {
  surface: token('surface'),
  panel: token('panel'),
  raised: token('raised'),
  track: token('track'),
  line: token('line'),
  text: token('text'),
  muted: token('muted'),
  stage: token('stage'),
  clip: token('clip'),
  clipEdge: token('clip-edge'),
  clipText: token('clip-text'),
  title: token('title'),
  zoom: token('zoom'),
  audio: token('audio'),
  banner: token('banner'),
  record: token('record'),
  playhead: token('playhead'),
  selected: token('selected'),
  // text sitting on an accent, which flips as the accent lightens or darkens
  onAccent: token('on-accent'),
  // text on the accents that keep their hue in both themes
  onStage: token('on-stage'),
  onZoom: token('on-zoom'),
  onAudio: token('on-audio'),
  onBanner: token('on-banner'),
  onRecord: token('on-record'),
} as const;

export const trackHeights = {
  ruler: 26,
  clip: 68,
  lane: 40,
  header: 132,
} as const;

// the fixed track name column beside the scrolling lanes
export const trackHeaders = 116;
