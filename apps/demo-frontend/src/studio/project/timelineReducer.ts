import {
  Banner,
  Canvas,
  CaptureSurface,
  Clip,
  clipLocalMs,
  ClipPlacement,
  CursorEffect,
  CursorLayer,
  layoutClips,
  limits,
  NarrationClip,
  insertClipAt,
  moveClip,
  placementAt,
  RecordedPause,
  removeClip,
  SourceClip,
  splitAt,
  Timeline,
  Transition,
  trimClip,
  Zoom,
} from '@asap-hub/demo-timeline';

export type TimelineAction =
  | {
      type: 'addClip';
      assetId: string;
      durationMs: number;
      clipId: string;
      index?: number;
      // wall clock when this footage was recorded, for a take the studio made
      // itself; it seeds the clip's cursor layer so a capture applied later,
      // even in another session, is read against the right moment
      recordedAtEpochMs?: number;
      // how long that take ran, measured by the recorder: the asset itself has
      // no duration until the ingest probes it, and a clip trimmed before then
      // would otherwise cut the capture window to the trim
      recordedDurationMs?: number;
      // the wall clock spans that take stood paused for, which wrote no frames:
      // without them a capture applied later reads everything past a pause late
      // by the whole pause, and loses the tail past the footage's own length
      recordedPauses?: RecordedPause[];
      // what that take was a recording of: one capture session spans several
      // takes, so the newest take's surface is the wrong one for all the others
      surface?: CaptureSurface;
    }
  | { type: 'removeClip'; clipId: string }
  | { type: 'moveClip'; clipId: string; toIndex: number }
  | {
      type: 'trimClip';
      clipId: string;
      inMs?: number;
      outMs?: number;
      // absent until the ingest has probed the asset
      assetDurationMs?: number;
    }
  | { type: 'splitAt'; tMs: number; clipId: string }
  | { type: 'duplicateClip'; clipId: string; newClipId: string }
  | { type: 'toggleMute'; clipId: string }
  | { type: 'setClipVolume'; clipId: string; volume: number }
  | { type: 'setTransition'; clipId: string; transition?: Transition }
  | {
      type: 'addTitleCard';
      clipId: string;
      index: number;
      text: string;
      durationMs: number;
    }
  | {
      type: 'updateTitleCard';
      clipId: string;
      text?: string;
      subtitle?: string;
      durationMs?: number;
      fadeInMs?: number;
      fadeOutMs?: number;
    }
  | { type: 'addBanner'; banner: Banner }
  | { type: 'updateBanner'; bannerId: string; change: Partial<Banner> }
  | { type: 'removeBanner'; bannerId: string }
  | { type: 'addNarration'; narration: NarrationClip }
  | {
      type: 'updateNarration';
      narrationId: string;
      change: Partial<NarrationClip>;
    }
  | { type: 'removeNarration'; narrationId: string }
  | { type: 'addZoom'; zoom: Zoom }
  | { type: 'updateZoom'; zoomId: string; change: Partial<Zoom> }
  | { type: 'removeZoom'; zoomId: string }
  | { type: 'addCursorEffect'; clipId: string; effect: CursorEffect }
  | {
      type: 'updateCursorEffect';
      clipId: string;
      effectId: string;
      change: Partial<CursorEffect>;
    }
  | { type: 'removeCursorEffect'; clipId: string; effectId: string }
  | {
      type: 'moveCursorEffect';
      fromClipId: string;
      toClipId: string;
      effectId: string;
      tMs: number;
    }
  | {
      type: 'setCursorPointer';
      clipId: string;
      pointer: string;
    }
  | {
      // the creator's own trim in frame pixels, for the residue no mapping
      // heuristic can know; shifts every click and the drawn pointer together
      type: 'setCursorAlign';
      clipId: string;
      alignXPx: number;
      alignYPx: number;
    }
  | {
      // slides the whole capture against the footage: the safety valve for the
      // drift the derived origin cannot account for, and the only alignment an
      // imported video has at all
      type: 'setCursorOffset';
      clipId: string;
      offsetMs: number;
    }
  | {
      type: 'applyCapture';
      clipId: string;
      path: CursorLayer['path'];
      effects: CursorEffect[];
    }
  | {
      type: 'addChapter';
      id: string;
      clipId: string;
      offsetMs: number;
      title: string;
    }
  | {
      type: 'updateChapter';
      chapterId: string;
      title?: string;
      // retiming re-anchors the marker: it belongs to whichever clip is under
      // the new moment, so it survives that clip being moved or trimmed
      clipId?: string;
      offsetMs?: number;
    }
  | { type: 'removeChapter'; chapterId: string }
  | { type: 'setCanvas'; canvas: Canvas };

// A banner or a voice over lives in programme time, but what the creator hung
// it on is the content underneath. Every programme time is read against the
// old layout and spoken again in the new one, so an inserted title card pushes
// what follows, a removal pulls it up, and a reorder carries the items along
// with the content they sat over. During a crossfade two placements share
// programme time; the instant belongs to the later clip, the one it blends in.
const remapProgrammeMs = (
  before: ClipPlacement[],
  after: ClipPlacement[],
): ((tMs: number) => number) => {
  const now = new Map(after.map((placement) => [placement.clip.id, placement]));
  const beforeEndMs = before[before.length - 1]?.endMs ?? 0;
  const afterEndMs = after[after.length - 1]?.endMs ?? 0;

  return (tMs: number): number => {
    const at = before.findIndex((holder, index) => {
      const nextStartMs = before[index + 1]?.startMs ?? holder.endMs;
      return (
        tMs < Math.max(holder.startMs, Math.min(holder.endMs, nextStartMs))
      );
    });
    const holder = at >= 0 ? before[at] : undefined;
    if (!holder) {
      return tMs + (afterEndMs - beforeEndMs);
    }
    const landed = now.get(holder.clip.id);
    if (landed) {
      return landed.startMs + (tMs - holder.startMs);
    }
    // the clip underneath is gone: park at the seam its successor now makes
    const successor = before
      .slice(at + 1)
      .map((later) => now.get(later.clip.id))
      .find((placement) => placement !== undefined);
    return successor ? successor.startMs : afterEndMs;
  };
};

const boundProgrammeMs = (tMs: number): number =>
  Math.max(0, Math.min(limits.maxTimelineMs, Math.round(tMs)));

const withClips = (timeline: Timeline, clips: Clip[]): Timeline => {
  const clipIds = new Set(clips.map((clip) => clip.id));
  const survives = <T extends { clipId: string }>(item: T) =>
    clipIds.has(item.clipId);

  const remap = remapProgrammeMs(
    layoutClips(timeline.clips),
    layoutClips(clips),
  );

  // a clip promoted to the front has nothing to blend with, and a transition
  // left on it silently reappeared if another clip was later moved before it
  const settled = clips.map((clip, at) =>
    at === 0 && clip.transitionIn !== undefined
      ? { ...clip, transitionIn: undefined }
      : clip,
  );

  // clip-anchored tracks cannot outlive their clip, so removing one takes its
  // zooms, cursor data and chapter markers with it
  return {
    ...timeline,
    clips: settled,
    zooms: timeline.zooms.filter(survives),
    cursor: timeline.cursor.filter(survives),
    chapters: timeline.chapters.filter(survives),
    banners: timeline.banners.map((banner) => ({
      ...banner,
      startMs: boundProgrammeMs(remap(banner.startMs)),
    })),
    narration: timeline.narration.map((take) => ({
      ...take,
      startMs: boundProgrammeMs(remap(take.startMs)),
    })),
  };
};

// Cursor times are moments in the footage, so a second clip showing the same
// footage shows the same capture: splitting or duplicating a clip carries the
// layer to the new piece whole, take start and all, and each piece draws only
// the span its own trim shows.
const copyCursorLayer = (
  timeline: Timeline,
  fromClipId: string,
  toClipId: string,
): Timeline['cursor'] => {
  const from = timeline.cursor.find((layer) => layer.clipId === fromClipId);
  if (!from || timeline.cursor.some((layer) => layer.clipId === toClipId)) {
    return timeline.cursor;
  }
  return [...timeline.cursor, { ...from, clipId: toClipId }];
};

const hasClip = (timeline: Timeline, clipId: string): boolean =>
  timeline.clips.some((clip) => clip.id === clipId);

// a clip gains its cursor layer the first time something is put on it
const withCursorLayer = (
  timeline: Timeline,
  clipId: string,
  change: (layer: Timeline['cursor'][number]) => Timeline['cursor'][number],
): Timeline['cursor'] => {
  // a layer on a clip that is gone is a document the server rejects for good
  if (!hasClip(timeline, clipId)) {
    return timeline.cursor;
  }
  const existing = timeline.cursor.find((layer) => layer.clipId === clipId);
  if (!existing) {
    return [
      ...timeline.cursor,
      change({ clipId, offsetMs: 0, path: [], effects: [] }),
    ];
  }
  return timeline.cursor.map((layer) =>
    layer.clipId === clipId ? change(layer) : layer,
  );
};

// A clip the render would be given no time to draw fails the whole export, and
// an asset the ingest reported as empty used to make one nothing could save
const atLeastMinimum = (durationMs: number): number =>
  Math.max(limits.minClipMs, Math.round(durationMs));

// The same guard trimClip applies to a source clip: a take whose in point has
// been pushed past its out point holds no audio, and the document it would make
// is one the server rejects outright, so the change is refused instead.
const withNarrationBounds = (
  take: NarrationClip,
  next: NarrationClip,
): NarrationClip => {
  const inMs = Math.max(0, Math.round(next.inMs));
  const outMs = Math.round(next.outMs);
  return outMs <= inMs ? take : { ...next, inMs, outMs };
};

// the clip's own anchors are read from `origin` and everything else is kept as
// it stands now, so a track the gesture never touched follows the timeline
const carryAnchors = <T extends { id: string; clipId: string }>(
  current: T[],
  origin: T[],
  clipId: string,
  rebase: (item: T) => T[],
): T[] => {
  const now = new Map(current.map((item) => [item.id, item]));
  const known = new Set(origin.map((item) => item.id));
  return [
    ...origin.flatMap((item) => {
      if (item.clipId === clipId) {
        return rebase(item);
      }
      const held = now.get(item.id);
      return held ? [held] : [];
    }),
    ...current.filter((item) => !known.has(item.id)),
  ];
};

// Zooms and chapters are clip-local, so a trim that slides the clip's window
// slides them with it, and whatever the trim cut away goes the way removing a
// clip takes its tracks: clamping a chapter would name footage that is gone.
//
// Which is why the anchors are rebased from `origin`, the timeline the gesture
// opened on, rather than from the frame before: a drag reports every pointer
// move as its own trim, so a handle passing an anchor deleted it halfway
// through the gesture and dragging back had nothing left to bring with it.
const rebaseClipAnchors = (
  timeline: Timeline,
  origin: Timeline,
  clipId: string,
  deltaMs: number,
  lengthMs: number,
): Timeline => {
  const inside = (atMs: number): boolean => atMs >= 0 && atMs < lengthMs;
  return {
    ...timeline,
    zooms: carryAnchors(timeline.zooms, origin.zooms, clipId, (zoom) => {
      const startMs = zoom.startMs - deltaMs;
      return inside(startMs) ? [{ ...zoom, startMs }] : [];
    }),
    chapters: carryAnchors(
      timeline.chapters,
      origin.chapters,
      clipId,
      (chapter) => {
        const offsetMs = chapter.offsetMs - deltaMs;
        return inside(offsetMs) ? [{ ...chapter, offsetMs }] : [];
      },
    ),
  };
};

const mapClip = (
  timeline: Timeline,
  clipId: string,
  change: (clip: SourceClip) => SourceClip,
): Timeline =>
  withClips(
    timeline,
    timeline.clips.map((clip) =>
      clip.id === clipId && clip.kind === 'source' ? change(clip) : clip,
    ),
  );

export const timelineReducer = (
  timeline: Timeline,
  action: TimelineAction,
  // the timeline the open gesture started on, for the actions a drag restates
  // from scratch on every pointer move; with no gesture open an edit is
  // committed on its own and reads the timeline it is given
  origin: Timeline = timeline,
): Timeline => {
  switch (action.type) {
    case 'addClip': {
      const clip: SourceClip = {
        kind: 'source',
        id: action.clipId,
        assetId: action.assetId,
        inMs: 0,
        outMs: atLeastMinimum(action.durationMs),
        volume: 1,
      };
      const added = withClips(
        timeline,
        insertClipAt(
          timeline.clips,
          clip,
          action.index ?? timeline.clips.length,
        ),
      );
      const { recordedAtEpochMs, recordedDurationMs, recordedPauses, surface } =
        action;
      if (recordedAtEpochMs === undefined || recordedAtEpochMs <= 0) {
        return added;
      }
      return {
        ...added,
        cursor: withCursorLayer(added, action.clipId, (layer) => ({
          ...layer,
          recordedAtEpochMs: Math.round(recordedAtEpochMs),
          ...(surface ? { surface } : {}),
          ...(recordedDurationMs && recordedDurationMs > 0
            ? { recordedDurationMs: Math.round(recordedDurationMs) }
            : {}),
          ...(recordedPauses?.length
            ? {
                recordedPauses: recordedPauses.map(({ startMs, endMs }) => ({
                  startMs: Math.round(startMs),
                  endMs: Math.round(endMs),
                })),
              }
            : {}),
        })),
      };
    }

    case 'removeClip':
      return withClips(timeline, removeClip(timeline.clips, action.clipId));

    case 'moveClip':
      return withClips(
        timeline,
        moveClip(timeline.clips, action.clipId, action.toIndex),
      );

    case 'trimClip': {
      const before = timeline.clips.find((clip) => clip.id === action.clipId);
      const clips = trimClip(
        timeline.clips,
        action.clipId,
        { inMs: action.inMs, outMs: action.outMs },
        action.assetDurationMs,
      );
      const after = clips.find((clip) => clip.id === action.clipId);
      // trimClip refuses a trim that would leave too little to render, so the
      // shift is read off what came back rather than off what was asked for
      if (
        before?.kind !== 'source' ||
        after?.kind !== 'source' ||
        (before.inMs === after.inMs && before.outMs === after.outMs)
      ) {
        return withClips(timeline, clips);
      }
      // a clip the gesture did not open with has no earlier anchors to read
      const started = origin.clips.find((clip) => clip.id === action.clipId);
      const opened = started?.kind === 'source' ? started : before;
      return withClips(
        rebaseClipAnchors(
          timeline,
          started?.kind === 'source' ? origin : timeline,
          action.clipId,
          after.inMs - opened.inMs,
          after.outMs - after.inMs,
        ),
        clips,
      );
    }

    case 'splitAt': {
      const parent = placementAt(layoutClips(timeline.clips), action.tMs);
      const clips = splitAt(timeline.clips, action.tMs, action.clipId);
      if (!parent || clips.length === timeline.clips.length) {
        return withClips(timeline, clips);
      }
      // everything the parent carried is dealt to the piece whose moment it
      // is: cursor times are footage times so both pieces share the layer,
      // while zooms and chapters are clip-local and are rebased to the right
      // piece when they belong past the cut
      const cutMs = Math.round(clipLocalMs(parent, action.tMs));
      const rightOf = (clipId: string, atMs: number): boolean =>
        clipId === parent.clip.id && atMs >= cutMs;
      const carried = {
        ...timeline,
        cursor: copyCursorLayer(timeline, parent.clip.id, action.clipId),
        zooms: timeline.zooms.map((zoom) =>
          rightOf(zoom.clipId, zoom.startMs)
            ? { ...zoom, clipId: action.clipId, startMs: zoom.startMs - cutMs }
            : zoom,
        ),
        chapters: timeline.chapters.map((chapter) =>
          rightOf(chapter.clipId, chapter.offsetMs)
            ? {
                ...chapter,
                clipId: action.clipId,
                offsetMs: chapter.offsetMs - cutMs,
              }
            : chapter,
        ),
      };
      return withClips(carried, clips);
    }

    case 'duplicateClip': {
      const index = timeline.clips.findIndex(
        (clip) => clip.id === action.clipId,
      );
      const original = timeline.clips[index];
      if (!original) {
        return timeline;
      }
      // the copy follows the original and starts on a cut, whatever the
      // original blended into
      const copy = {
        ...original,
        id: action.newClipId,
        transitionIn: undefined,
      };
      return withClips(
        {
          ...timeline,
          cursor: copyCursorLayer(timeline, action.clipId, action.newClipId),
        },
        insertClipAt(timeline.clips, copy, index + 1),
      );
    }

    case 'toggleMute':
      return mapClip(timeline, action.clipId, (clip) => ({
        ...clip,
        volume: clip.volume === 0 ? 1 : 0,
      }));

    case 'setClipVolume':
      return mapClip(timeline, action.clipId, (clip) => ({
        ...clip,
        volume: action.volume,
      }));

    case 'setTransition': {
      // the schema caps a transition, and a typed value must not produce a
      // document the server then refuses whole
      const transition = action.transition && {
        ...action.transition,
        durationMs: Math.max(
          0,
          Math.min(
            limits.transitionMs,
            Math.round(action.transition.durationMs),
          ),
        ),
      };
      return withClips(
        timeline,
        timeline.clips.map((clip, index) =>
          clip.id === action.clipId && index > 0
            ? { ...clip, transitionIn: transition }
            : clip,
        ),
      );
    }

    case 'addTitleCard':
      return withClips(
        timeline,
        insertClipAt(
          timeline.clips,
          {
            kind: 'title',
            id: action.clipId,
            durationMs: atLeastMinimum(action.durationMs),
            preset: 'centered',
            text: action.text,
          },
          action.index,
        ),
      );

    case 'updateTitleCard':
      return withClips(
        timeline,
        timeline.clips.map((clip) =>
          clip.id === action.clipId && clip.kind === 'title'
            ? {
                ...clip,
                text: action.text ?? clip.text,
                subtitle: action.subtitle ?? clip.subtitle,
                durationMs:
                  action.durationMs === undefined
                    ? clip.durationMs
                    : atLeastMinimum(action.durationMs),
                fadeInMs: action.fadeInMs ?? clip.fadeInMs,
                fadeOutMs: action.fadeOutMs ?? clip.fadeOutMs,
              }
            : clip,
        ),
      );

    case 'addBanner':
      return { ...timeline, banners: [...timeline.banners, action.banner] };

    case 'updateBanner':
      return {
        ...timeline,
        banners: timeline.banners.map((banner) =>
          banner.id === action.bannerId
            ? { ...banner, ...action.change, id: banner.id }
            : banner,
        ),
      };

    case 'removeBanner':
      return {
        ...timeline,
        banners: timeline.banners.filter(
          (banner) => banner.id !== action.bannerId,
        ),
      };

    case 'addNarration':
      return {
        ...timeline,
        narration: [...timeline.narration, action.narration],
      };

    case 'updateNarration':
      return {
        ...timeline,
        narration: timeline.narration.map((take) =>
          take.id === action.narrationId
            ? withNarrationBounds(take, {
                ...take,
                ...action.change,
                id: take.id,
                assetId: take.assetId,
              })
            : take,
        ),
      };

    case 'removeNarration':
      return {
        ...timeline,
        narration: timeline.narration.filter(
          (take) => take.id !== action.narrationId,
        ),
      };

    case 'addZoom':
      return { ...timeline, zooms: [...timeline.zooms, action.zoom] };

    case 'updateZoom':
      return {
        ...timeline,
        zooms: timeline.zooms.map((zoom) =>
          zoom.id === action.zoomId
            ? { ...zoom, ...action.change, id: zoom.id, clipId: zoom.clipId }
            : zoom,
        ),
      };

    case 'removeZoom':
      return {
        ...timeline,
        zooms: timeline.zooms.filter((zoom) => zoom.id !== action.zoomId),
      };

    case 'addCursorEffect':
      return {
        ...timeline,
        cursor: withCursorLayer(timeline, action.clipId, (layer) => ({
          ...layer,
          effects: [...layer.effects, action.effect],
        })),
      };

    case 'updateCursorEffect':
      return {
        ...timeline,
        cursor: withCursorLayer(timeline, action.clipId, (layer) => ({
          ...layer,
          effects: layer.effects.map((effect) =>
            effect.id === action.effectId
              ? {
                  ...effect,
                  ...action.change,
                  id: effect.id,
                  // a hand edit protects the effect from the next re-derive
                  origin:
                    effect.origin === 'derived'
                      ? 'derived-edited'
                      : effect.origin,
                }
              : effect,
          ),
        })),
      };

    // a click dragged past the end of its clip belongs to the clip it landed on:
    // clamping it to the one it started on pinned it in place instead
    case 'moveCursorEffect': {
      const from = timeline.cursor.find(
        (layer) => layer.clipId === action.fromClipId,
      );
      const moving = from?.effects.find(
        (effect) => effect.id === action.effectId,
      );
      if (!from || !moving || !hasClip(timeline, action.toClipId)) {
        return timeline;
      }

      const moved: CursorEffect = {
        ...moving,
        tMs: action.tMs,
        origin: moving.origin === 'derived' ? 'derived-edited' : moving.origin,
      };
      const byTime = (a: CursorEffect, b: CursorEffect) => a.tMs - b.tMs;

      if (action.fromClipId === action.toClipId) {
        return {
          ...timeline,
          cursor: withCursorLayer(timeline, action.toClipId, (layer) => ({
            ...layer,
            effects: layer.effects
              .map((effect) => (effect.id === action.effectId ? moved : effect))
              .sort(byTime),
          })),
        };
      }

      const without = timeline.cursor.map((layer) =>
        layer.clipId === action.fromClipId
          ? {
              ...layer,
              effects: layer.effects.filter(
                (effect) => effect.id !== action.effectId,
              ),
            }
          : layer,
      );

      return {
        ...timeline,
        cursor: without.some((layer) => layer.clipId === action.toClipId)
          ? without.map((layer) =>
              layer.clipId === action.toClipId
                ? { ...layer, effects: [...layer.effects, moved].sort(byTime) }
                : layer,
            )
          : [
              ...without,
              {
                clipId: action.toClipId,
                offsetMs: 0,
                path: [],
                effects: [moved],
              },
            ],
      };
    }

    case 'removeCursorEffect':
      return {
        ...timeline,
        cursor: withCursorLayer(timeline, action.clipId, (layer) => ({
          ...layer,
          effects: layer.effects.filter(
            (effect) => effect.id !== action.effectId,
          ),
        })),
      };

    case 'setCursorPointer':
      return {
        ...timeline,
        cursor: withCursorLayer(timeline, action.clipId, (layer) => ({
          ...layer,
          pointer: action.pointer,
        })),
      };

    case 'setCursorAlign': {
      const boundPx = (value: number): number =>
        Math.max(-500, Math.min(500, Math.round(value)));
      const alignXPx = boundPx(action.alignXPx);
      const alignYPx = boundPx(action.alignYPx);
      return {
        ...timeline,
        cursor: withCursorLayer(timeline, action.clipId, (layer) => {
          const { alignXPx: oldX, alignYPx: oldY, ...bare } = layer;
          return {
            ...bare,
            ...(alignXPx !== 0 ? { alignXPx } : {}),
            ...(alignYPx !== 0 ? { alignYPx } : {}),
          };
        }),
      };
    }

    case 'setCursorOffset':
      return {
        ...timeline,
        cursor: withCursorLayer(timeline, action.clipId, (layer) => ({
          ...layer,
          offsetMs: Math.max(
            -limits.offsetMs,
            Math.min(limits.offsetMs, Math.round(action.offsetMs)),
          ),
        })),
      };

    // the surface stays whatever the take wrote when the clip was added: an
    // apply only knows the surface it resolved, and stamping that would make a
    // clip it guessed wrong about impossible to put right
    case 'applyCapture':
      return {
        ...timeline,
        cursor: withCursorLayer(timeline, action.clipId, (layer) => ({
          ...layer,
          path: action.path,
          effects: action.effects,
        })),
      };

    case 'addChapter':
      return {
        ...timeline,
        chapters: [
          ...timeline.chapters,
          {
            id: action.id,
            clipId: action.clipId,
            offsetMs: action.offsetMs,
            title: action.title,
          },
        ],
      };

    case 'updateChapter':
      return {
        ...timeline,
        chapters: timeline.chapters.map((chapter) =>
          chapter.id === action.chapterId
            ? {
                ...chapter,
                title: action.title ?? chapter.title,
                clipId: action.clipId ?? chapter.clipId,
                offsetMs: action.offsetMs ?? chapter.offsetMs,
              }
            : chapter,
        ),
      };

    case 'removeChapter':
      return {
        ...timeline,
        chapters: timeline.chapters.filter(
          (chapter) => chapter.id !== action.chapterId,
        ),
      };

    case 'setCanvas':
      return timeline.canvas.width === action.canvas.width &&
        timeline.canvas.height === action.canvas.height &&
        timeline.canvas.fps === action.canvas.fps
        ? timeline
        : { ...timeline, canvas: action.canvas };

    default:
      return timeline;
  }
};
