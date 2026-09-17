import { z } from 'zod';
import { pointerVariantIds } from './cursor/pointerArt';

export const currentSchemaVersion = 2;

export const limits = {
  clips: 200,
  banners: 200,
  narration: 100,
  zooms: 200,
  cursorLayers: 200,
  cursorEffects: 500,
  cursorPathPoints: 20000,
  recordedPauses: 200,
  chapters: 500,
  textLength: 200,
  transitionMs: 3000,
  fadeMs: 5000,
  offsetMs: 60000,
  minClipMs: 100,
  maxTimelineMs: 4 * 60 * 60 * 1000,
} as const;

const idSchema = z.string().min(1).max(64);
const msSchema = z.number().int().min(0).max(limits.maxTimelineMs);
const unitSchema = z.number().min(0).max(1);
const textSchema = z.string().max(limits.textLength);
const volumeSchema = z.number().min(0).max(2);

export const pointSchema = z.object({ x: unitSchema, y: unitSchema });

export const transitionSchema = z.object({
  type: z.enum(['cut', 'crossfade', 'slide']),
  durationMs: z.number().int().min(0).max(limits.transitionMs),
});

export const titlePresets = ['centered'] as const;
export const bannerPresets = ['lowerThird'] as const;

export const sourceClipSchema = z.object({
  kind: z.literal('source'),
  id: idSchema,
  assetId: idSchema,
  inMs: msSchema,
  outMs: msSchema,
  volume: volumeSchema,
  transitionIn: transitionSchema.optional(),
});

// how long the text takes to appear and to leave; absent means the default
const fadeSchema = z.number().int().min(0).max(limits.fadeMs).optional();

// A card with no length at all becomes `-t 0.000` in the render and ffmpeg
// writes an empty file, so the export fails after the whole job has been paid
// for. minClipMs is the floor every edit path already clamps to, so no saved
// card can be under it.
const clipDurationSchema = z
  .number()
  .int()
  .min(limits.minClipMs)
  .max(limits.maxTimelineMs);

export const titleClipSchema = z.object({
  kind: z.literal('title'),
  id: idSchema,
  durationMs: clipDurationSchema,
  preset: z.enum(titlePresets),
  text: textSchema,
  subtitle: textSchema.optional(),
  fadeInMs: fadeSchema,
  fadeOutMs: fadeSchema,
  transitionIn: transitionSchema.optional(),
});

export const clipSchema = z.discriminatedUnion('kind', [
  sourceClipSchema,
  titleClipSchema,
]);

export const bannerSchema = z.object({
  id: idSchema,
  startMs: msSchema,
  durationMs: msSchema,
  preset: z.enum(bannerPresets),
  text: textSchema,
  subtitle: textSchema.optional(),
  position: z.enum(['top', 'bottom']),
  animation: z.enum(['fade', 'slide']),
  fadeInMs: fadeSchema,
  fadeOutMs: fadeSchema,
});

// the same invariant the source clips carry, stated once rather than left to
// every caller: a take that plays up to before it starts holds no audio at all
export const narrationClipSchema = z
  .object({
    id: idSchema,
    assetId: idSchema,
    startMs: msSchema,
    inMs: msSchema,
    outMs: msSchema,
    volume: volumeSchema,
  })
  .refine((take) => take.outMs > take.inMs, {
    message: 'outMs must be greater than inMs',
    path: ['outMs'],
  });

// clip-anchored, with clip-local times, so reordering and trimming carry it along
export const zoomSchema = z.object({
  id: idSchema,
  clipId: idSchema,
  startMs: msSchema,
  rampInMs: msSchema,
  holdMs: msSchema,
  rampOutMs: msSchema,
  focus: pointSchema,
  scale: z.number().min(1).max(4),
  easing: z.enum(['linear', 'easeInOut']),
});

export const chapterMarkerSchema = z.object({
  id: idSchema,
  clipId: idSchema,
  offsetMs: msSchema,
  title: textSchema,
});

export const cursorEffectSchema = z.object({
  id: idSchema,
  tMs: msSchema,
  type: z.enum(['ripple', 'spotlight', 'zoom']),
  point: pointSchema,
  origin: z.enum(['derived', 'derived-edited', 'manual']),
  // left out on everything derived before the picker existed, so the renderer
  // and the preview both fall back to the default rather than refusing to load
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  sourceEventId: idSchema.optional(),
});

export const cursorPathPointSchema = z.object({
  tMs: msSchema,
  x: unitSchema,
  y: unitSchema,
});

// What the creator handed the browser to record. It decides what the video
// frame actually shows, and so which of the capture's coordinates map onto it:
// a tab shows the page viewport, a window shows the browser window, a monitor
// shows the whole screen with the OS bar and the browser chrome in it.
export const captureSurfaces = ['browser', 'window', 'monitor'] as const;

export type CaptureSurface = (typeof captureSurfaces)[number];

// One span the recorder was paused for, in wall clock: a pause writes no frames,
// so the footage skips it whole. Named startMs and endMs to sit beside the other
// times on the layer, but read as epochs, the same clock the capture stamps.
export const recordedPauseSchema = z.object({
  startMs: z.number().int().positive(),
  endMs: z.number().int().positive(),
});

export const cursorLayerSchema = z.object({
  clipId: idSchema,
  offsetMs: z.number().int().min(-limits.offsetMs).max(limits.offsetMs),
  path: z.array(cursorPathPointSchema).max(limits.cursorPathPoints),
  effects: z.array(cursorEffectSchema).max(limits.cursorEffects),
  // which drawn pointer walks the path; the whole capture shares one, and a
  // layer saved before the picker existed falls back to the default
  pointer: z.enum(pointerVariantIds).optional(),
  // what the take in this clip was a recording of, written when the clip is
  // added and never again: only the take itself knows, and a capture applied
  // later has nothing but the newest take to go on. A clip recorded before the
  // studio asked the browser, or by a browser that would not say, carries none
  // and the live recorder answers for it.
  surface: z.enum(captureSurfaces).optional(),
  // Wall clock when the take in this clip started, which is the instant the
  // footage shows at t=0. A capture is clicked on a few seconds into the take,
  // so reading its origin from its own first event drew every click late by
  // exactly that delay. Absent on an imported clip and on anything recorded
  // before this was kept, and then the first event is the origin again.
  recordedAtEpochMs: z.number().int().positive().optional(),
  // How long the take in this clip ran, which the recorder knows the moment it
  // stops. A fresh webm has no duration the browser will report for about a
  // minute, so a clip trimmed down before then had nothing left saying how much
  // footage there was, and a capture applied in that window was cut to the trim
  // and lost everything after it.
  recordedDurationMs: z.number().int().positive().optional(),
  // the creator's own trim in frame pixels, for whatever residue is left after
  // every mapping correction; applied to every click and the drawn pointer
  alignXPx: z.number().int().min(-500).max(500).optional(),
  alignYPx: z.number().int().min(-500).max(500).optional(),
  // The spans that take ran paused for. Capture events are stamped in wall
  // clock, which runs on through a pause the footage never shows, so without
  // these every click after one landed late by the whole pause and the tail
  // past the take's own length was cut off entirely.
  recordedPauses: z
    .array(recordedPauseSchema)
    .max(limits.recordedPauses)
    .optional(),
});

export const canvasSchema = z.object({
  width: z.number().int().min(640).max(3840),
  height: z.number().int().min(360).max(2160),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
});

const timelineShape = z.object({
  schemaVersion: z.literal(currentSchemaVersion),
  canvas: canvasSchema,
  clips: z.array(clipSchema).max(limits.clips),
  banners: z.array(bannerSchema).max(limits.banners),
  narration: z.array(narrationClipSchema).max(limits.narration),
  zooms: z.array(zoomSchema).max(limits.zooms),
  cursor: z.array(cursorLayerSchema).max(limits.cursorLayers),
  chapters: z.array(chapterMarkerSchema).max(limits.chapters),
});

type TrackedId = { id: string; path: (string | number)[] };

const trackIds = <T extends { id: string }>(
  entries: T[],
  track: string,
): TrackedId[] =>
  entries.map((entry, index) => ({ id: entry.id, path: [track, index, 'id'] }));

// the second and later occurrences: the first one is the id's rightful owner
const repeats = (tracked: TrackedId[]): TrackedId[] => {
  const seen = new Set<string>();
  return tracked.filter(({ id }) => {
    const repeat = seen.has(id);
    seen.add(id);
    return repeat;
  });
};

// structural rules live in the schemas; these are the rules that need the whole document
export const timelineSchema = timelineShape.superRefine((timeline, context) => {
  timeline.clips.forEach((clip, index) => {
    if (clip.kind === 'source' && clip.outMs <= clip.inMs) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clips', index, 'outMs'],
        message: 'outMs must be greater than inMs',
      });
    }
  });

  const ids = [
    ...trackIds(timeline.clips, 'clips'),
    ...trackIds(timeline.banners, 'banners'),
    ...trackIds(timeline.narration, 'narration'),
    ...trackIds(timeline.zooms, 'zooms'),
  ];
  repeats(ids).forEach(({ id, path }) => {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: `duplicate id ${id}`,
    });
  });

  const clipIds = new Set(timeline.clips.map((clip) => clip.id));
  const requireKnownClip = (
    clipId: string,
    path: (string | number)[],
  ): void => {
    if (!clipIds.has(clipId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `references unknown clip ${clipId}`,
      });
    }
  };

  timeline.cursor.forEach((layer, index) =>
    requireKnownClip(layer.clipId, ['cursor', index, 'clipId']),
  );
  timeline.zooms.forEach((zoom, index) =>
    requireKnownClip(zoom.clipId, ['zooms', index, 'clipId']),
  );
  timeline.chapters.forEach((chapter, index) =>
    requireKnownClip(chapter.clipId, ['chapters', index, 'clipId']),
  );
});

export type Point = z.infer<typeof pointSchema>;
export type Transition = z.infer<typeof transitionSchema>;
export type TitlePreset = (typeof titlePresets)[number];
export type BannerPreset = (typeof bannerPresets)[number];
export type SourceClip = z.infer<typeof sourceClipSchema>;
export type TitleClip = z.infer<typeof titleClipSchema>;
export type Clip = z.infer<typeof clipSchema>;
export type Banner = z.infer<typeof bannerSchema>;
export type NarrationClip = z.infer<typeof narrationClipSchema>;
export type Zoom = z.infer<typeof zoomSchema>;
export type ChapterMarker = z.infer<typeof chapterMarkerSchema>;
export type CursorEffect = z.infer<typeof cursorEffectSchema>;
export type CursorPathPoint = z.infer<typeof cursorPathPointSchema>;
export type RecordedPause = z.infer<typeof recordedPauseSchema>;
export type CursorLayer = z.infer<typeof cursorLayerSchema>;
export type Canvas = z.infer<typeof canvasSchema>;
export type Timeline = z.infer<typeof timelineShape>;
