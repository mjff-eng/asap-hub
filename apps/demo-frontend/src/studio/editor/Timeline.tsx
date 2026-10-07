/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import {
  Banner,
  ClipPlacement,
  CursorEffect,
  CursorLayer,
  limits,
  NarrationClip,
  Zoom,
} from '@asap-hub/demo-timeline';
import {
  FC,
  memo,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from 'react';
import { ProjectAsset } from '../../api/types';
import { useEdgeAutoScroll } from './autoScroll';
import ClipBlock from './ClipBlock';
import { useDragGhost } from './dragGhost';
import {
  DragKind,
  Span,
  SpanDrag,
  spanAfterDrag,
  TrimDrag,
  trimAfterDrag,
} from './dragging';
import { editorTheme, trackHeaders, trackHeights } from './editorTheme';
import {
  formatDuration,
  formatTimecode,
  lanePaddingPx,
  msToPx,
  pxToMs,
  tickIntervalMs,
} from './geometry';
import LaneBlock, { arrowDeltaMs } from './LaneBlock';
import { overlapAfterDrag, overlapHint } from './overlap';
import { isSelected, Selection } from './selection';
import { usePlaybackContext, usePlayheadEffect } from './usePlayback';
import { zoomDurationMs } from './zoom';

const panelStyles = css({
  backgroundColor: editorTheme.panel,
  borderTop: `1px solid ${editorTheme.line}`,
  color: editorTheme.text,
  display: 'flex',
  // a long demo makes the lane far wider than the window; without this the
  // flex item grows to fit it and drags the whole page sideways
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
});

// the track names stay put while the lanes scroll under them
const headerColumnStyles = css({
  flexShrink: 0,
  width: trackHeaders,
  borderRight: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.panel,
  zIndex: 1,
});

const headerCellStyles = css({
  display: 'flex',
  alignItems: 'center',
  padding: '0 10px',
  borderBottom: `1px solid ${editorTheme.line}`,
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: editorTheme.muted,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const scrollStyles = css({
  flex: 1,
  minWidth: 0,
  overflowX: 'auto',
  overflowY: 'hidden',
});

const laneStyles = css({ position: 'relative', minWidth: '100%' });

const rulerStyles = css({
  position: 'relative',
  height: trackHeights.ruler,
  borderBottom: `1px solid ${editorTheme.line}`,
  cursor: 'pointer',
  touchAction: 'none',
});

const tickStyles = css({
  position: 'absolute',
  top: 0,
  bottom: 0,
  borderLeft: `1px solid ${editorTheme.line}`,
  paddingLeft: 4,
  fontSize: 11,
  lineHeight: `${trackHeights.ruler}px`,
  color: editorTheme.muted,
  userSelect: 'none',
  fontVariantNumeric: 'tabular-nums',
});

const trackStyles = css({
  position: 'relative',
  height: trackHeights.clip,
  backgroundColor: editorTheme.track,
  borderBottom: `1px solid ${editorTheme.line}`,
});

const overlayTrackStyles = css({
  position: 'relative',
  height: trackHeights.lane,
  backgroundColor: editorTheme.panel,
  borderBottom: `1px solid ${editorTheme.line}`,
});

const effectMarkerStyles = css({
  position: 'absolute',
  top: 8,
  width: 12,
  height: 12,
  marginLeft: -6,
  borderRadius: '50%',
  border: `2px solid ${editorTheme.panel}`,
  backgroundColor: editorTheme.clipEdge,
  padding: 0,
  cursor: 'grab',
  touchAction: 'none',
  ':active': { cursor: 'grabbing' },
});

const selectedMarkerStyles = css({
  outline: `2px solid ${editorTheme.selected}`,
});

const emptyTrackStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: editorTheme.muted,
  fontSize: 13,
  height: '100%',
  margin: 0,
});

const playheadStyles = css({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  width: 2,
  marginLeft: -1,
  backgroundColor: editorTheme.playhead,
  pointerEvents: 'none',
  zIndex: 2,
});

const playheadKnobStyles = css({
  position: 'absolute',
  top: 0,
  left: -5,
  width: 12,
  height: 12,
  borderRadius: '0 0 6px 6px',
  backgroundColor: editorTheme.playhead,
});

// the crossed lines every editor draws over a blend, so the length two clips
// share is readable on the lane rather than only in the inspector
const crossfadeStyles = css({
  position: 'absolute',
  top: 6,
  bottom: 6,
  borderRadius: 6,
  pointerEvents: 'none',
  zIndex: 1,
  backgroundImage: [
    `linear-gradient(to top right, transparent calc(50% - 1px), ${editorTheme.selected} calc(50% - 1px), ${editorTheme.selected} calc(50% + 1px), transparent calc(50% + 1px))`,
    `linear-gradient(to bottom right, transparent calc(50% - 1px), ${editorTheme.selected} calc(50% - 1px), ${editorTheme.selected} calc(50% + 1px), transparent calc(50% + 1px))`,
  ].join(', '),
});

const ghostStyles = css({
  position: 'absolute',
  zIndex: 4,
  display: 'flex',
  alignItems: 'center',
  borderRadius: 6,
  border: `1px dashed ${editorTheme.selected}`,
  backgroundColor: editorTheme.raised,
  color: editorTheme.text,
  opacity: 0.7,
  padding: '0 8px',
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  pointerEvents: 'none',
  '&[hidden]': { display: 'none' },
});

const dropMarkerStyles = css({
  position: 'absolute',
  top: 4,
  bottom: 4,
  width: 3,
  marginLeft: -1,
  borderRadius: 2,
  backgroundColor: editorTheme.selected,
  pointerEvents: 'none',
  zIndex: 3,
});

type MsAt = (clientX: number) => number;

// A title card has no footage to trim, so both its edges just change how long
// it stays on screen; every other span sits on a lane of its own. A cursor
// effect is a point rather than a span, so it rides along as a span of no
// length whose only legal drag is a move.
export type SpanKind = 'banner' | 'zoom' | 'narration' | 'title' | 'effect';

type StartClipDrag = (
  placement: ClipPlacement,
  kind: DragKind,
  event: ReactPointerEvent<HTMLElement>,
) => void;

type NudgeClip = (
  placement: ClipPlacement,
  kind: DragKind,
  deltaMs: number,
) => void;

type NudgeSpan = (
  kind: SpanKind,
  id: string,
  span: Span,
  dragKind: DragKind,
  deltaMs: number,
  minMs?: number,
) => void;

type StartSpanDrag = (
  kind: SpanKind,
  id: string,
  span: Span,
  dragKind: DragKind,
  event: ReactPointerEvent<HTMLElement>,
  // a zoom cannot be shorter than its own ramps; everything else stops at the
  // shortest block the timeline allows
  minMs?: number,
) => void;

type SelectHandler = (kind: Selection['kind'], id: string) => void;

// Every lane below is memoised: the playhead moves on every animation frame,
// and redrawing the blocks underneath it sixty times a second buys nothing.

// the marker is the one thing on the lane that moves with the clock, so it
// subscribes on its own and slides with a transform rather than an offset
const PlayheadMarker = memo<{ readonly pixelsPerSecond: number }>(
  ({ pixelsPerSecond }) => {
    const markerRef = useRef<HTMLDivElement>(null);
    const playback = usePlaybackContext();

    usePlayheadEffect((ms) => {
      if (markerRef.current) {
        markerRef.current.style.transform = `translateX(${msToPx(
          ms,
          pixelsPerSecond,
        )}px)`;
      }
    });

    return (
      <div
        ref={markerRef}
        css={playheadStyles}
        style={{
          transform: `translateX(${msToPx(
            playback.getPlayheadMs(),
            pixelsPerSecond,
          )}px)`,
        }}
      >
        <span css={playheadKnobStyles} />
      </div>
    );
  },
);

const Ruler = memo<{
  readonly durationMs: number;
  readonly pixelsPerSecond: number;
  readonly msAt: MsAt;
  readonly onSeek: (ms: number) => void;
}>(({ durationMs, pixelsPerSecond, msAt, onSeek }) => {
  const interval = tickIntervalMs(pixelsPerSecond);
  const tickCount = Math.max(2, Math.ceil(durationMs / interval) + 1);

  return (
    <div
      css={rulerStyles}
      role="presentation"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onSeek(msAt(event.clientX));
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          onSeek(msAt(event.clientX));
        }
      }}
    >
      {Array.from({ length: tickCount }, (unused, index) => (
        <span
          key={index}
          css={tickStyles}
          style={{ left: msToPx(index * interval, pixelsPerSecond) }}
        >
          {formatDuration(index * interval)}
        </span>
      ))}
    </div>
  );
});

const ClipTrack = memo<{
  readonly placements: ClipPlacement[];
  readonly assets: Record<string, ProjectAsset>;
  readonly pixelsPerSecond: number;
  readonly durationMs: number;
  readonly selection?: Selection;
  readonly pickedIds: readonly string[];
  readonly canPick: boolean;
  readonly readOnly: boolean;
  readonly dropIndex?: number;
  readonly onSelect: SelectHandler;
  readonly onTogglePick: (clipId: string) => void;
  readonly onDragStart: StartClipDrag;
  readonly onNudge: NudgeClip;
  readonly onToggleMute: (clipId: string) => void;
}>(
  ({
    placements,
    assets,
    pixelsPerSecond,
    durationMs,
    selection,
    pickedIds,
    canPick,
    readOnly,
    dropIndex,
    onSelect,
    onTogglePick,
    onDragStart,
    onNudge,
    onToggleMute,
  }) => (
    <div css={trackStyles}>
      {placements.length === 0 ? (
        <p css={emptyTrackStyles}>
          Import a video, then add it here to start the demo.
        </p>
      ) : (
        placements.map((placement) => (
          <ClipBlock
            key={placement.clip.id}
            placement={placement}
            asset={
              placement.clip.kind === 'source'
                ? assets[placement.clip.assetId]
                : undefined
            }
            left={msToPx(placement.startMs, pixelsPerSecond)}
            width={msToPx(placement.durationMs, pixelsPerSecond)}
            selected={isSelected(selection, 'clip', placement.clip.id)}
            picked={pickedIds.includes(placement.clip.id)}
            canPick={canPick}
            readOnly={readOnly}
            onSelect={() => onSelect('clip', placement.clip.id)}
            onTogglePick={() => onTogglePick(placement.clip.id)}
            onDragStart={(kind, event) => onDragStart(placement, kind, event)}
            onNudge={(kind, deltaMs) => onNudge(placement, kind, deltaMs)}
            onToggleMute={() => onToggleMute(placement.clip.id)}
          />
        ))
      )}

      {placements
        .filter((placement) => placement.overlapMs > 0)
        .map((placement) => (
          <span
            key={`blend-${placement.clip.id}`}
            aria-hidden="true"
            css={crossfadeStyles}
            style={{
              left: msToPx(placement.startMs, pixelsPerSecond),
              width: msToPx(placement.overlapMs, pixelsPerSecond),
            }}
          />
        ))}

      {dropIndex === undefined ? null : (
        <div
          css={dropMarkerStyles}
          style={{
            left: msToPx(
              placements[dropIndex]?.startMs ?? durationMs,
              pixelsPerSecond,
            ),
          }}
        />
      )}
    </div>
  ),
);

const BannerTrack = memo<{
  readonly banners: Banner[];
  readonly pixelsPerSecond: number;
  readonly selection?: Selection;
  readonly readOnly: boolean;
  readonly onSelect: SelectHandler;
  readonly onDragStart: StartSpanDrag;
  readonly onNudge: NudgeSpan;
}>(
  ({
    banners,
    pixelsPerSecond,
    selection,
    readOnly,
    onSelect,
    onDragStart,
    onNudge,
  }) => (
    <div css={overlayTrackStyles}>
      {banners.map((banner) => (
        <LaneBlock
          key={banner.id}
          tone="banner"
          label={banner.text || 'Banner'}
          name={`Banner ${banner.text || 'Untitled'}`}
          left={msToPx(banner.startMs, pixelsPerSecond)}
          width={msToPx(banner.durationMs, pixelsPerSecond)}
          selected={isSelected(selection, 'banner', banner.id)}
          readOnly={readOnly}
          onSelect={() => onSelect('banner', banner.id)}
          onDragStart={(kind, event) =>
            onDragStart('banner', banner.id, banner, kind, event)
          }
          onNudge={(kind, deltaMs) =>
            onNudge('banner', banner.id, banner, kind, deltaMs)
          }
        />
      ))}
    </div>
  ),
);

// A cursor effect has no length to resize, so its dot answers to the one drag
// that means anything to it: sliding it along the lane to the moment it should
// fire. Typing into the inspector used to be the only way to retime one.
const EffectMarker: FC<{
  readonly effect: CursorEffect;
  readonly atMs: number;
  readonly pixelsPerSecond: number;
  readonly selected: boolean;
  readonly readOnly: boolean;
  readonly onSelect: () => void;
  readonly onDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly onNudge: (deltaMs: number) => void;
}> = ({
  effect,
  atMs,
  pixelsPerSecond,
  selected,
  readOnly,
  onSelect,
  onDragStart,
  onNudge,
}) => (
  <button
    type="button"
    aria-label={`${
      effect.type === 'ripple' ? 'Click highlight' : 'Spotlight'
    } at ${formatTimecode(atMs)}`}
    aria-pressed={selected}
    css={[effectMarkerStyles, selected && selectedMarkerStyles]}
    style={{ left: msToPx(atMs, pixelsPerSecond) }}
    onPointerDown={(event) => {
      onSelect();
      if (!readOnly) {
        onDragStart(event);
      }
    }}
    // the press already selected it, so Enter and Space must not let a click
    // through as well
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect();
        return;
      }
      const delta = arrowDeltaMs(event);
      if (delta === undefined || readOnly) return;
      event.preventDefault();
      onNudge(delta);
    }}
  />
);

// zooms and cursor effects share a lane: both are things done to the clip they
// sit over, rather than clips of their own
const EffectTrack = memo<{
  readonly zooms: Zoom[];
  readonly cursorLayers: CursorLayer[];
  readonly placements: ClipPlacement[];
  readonly pixelsPerSecond: number;
  readonly selection?: Selection;
  readonly readOnly: boolean;
  readonly onSelect: SelectHandler;
  readonly onDragStart: StartSpanDrag;
  readonly onNudge: NudgeSpan;
}>(
  ({
    zooms,
    cursorLayers,
    placements,
    pixelsPerSecond,
    selection,
    readOnly,
    onSelect,
    onDragStart,
    onNudge,
  }) => {
    // one pass instead of a find per zoom and per cursor layer on every render
    const byClipId = new Map(
      placements.map((each) => [each.clip.id, each] as const),
    );
    const startOf = (clipId: string): number | undefined =>
      byClipId.get(clipId)?.startMs;

    const trimOf = (clipId: string): number => {
      const clip = byClipId.get(clipId)?.clip;
      return clip?.kind === 'source' ? clip.inMs : 0;
    };

    return (
      <div css={overlayTrackStyles}>
        {zooms.map((zoom) => {
          const clipStartMs = startOf(zoom.clipId);
          if (clipStartMs === undefined) {
            return null;
          }
          const span = {
            startMs: clipStartMs + zoom.startMs,
            durationMs: zoomDurationMs(zoom),
          };
          const shortestZoom = Math.max(
            limits.minClipMs,
            zoom.rampInMs + zoom.rampOutMs,
          );
          return (
            <LaneBlock
              key={zoom.id}
              tone="zoom"
              label={`Zoom ${zoom.scale}x`}
              name={`Zoom ${zoom.scale}x`}
              left={msToPx(span.startMs, pixelsPerSecond)}
              width={msToPx(span.durationMs, pixelsPerSecond)}
              selected={isSelected(selection, 'zoom', zoom.id)}
              readOnly={readOnly}
              onSelect={() => onSelect('zoom', zoom.id)}
              onDragStart={(kind, event) =>
                onDragStart('zoom', zoom.id, span, kind, event, shortestZoom)
              }
              onNudge={(kind, deltaMs) =>
                onNudge('zoom', zoom.id, span, kind, deltaMs, shortestZoom)
              }
            />
          );
        })}

        {cursorLayers.flatMap((layer) => {
          const placement = byClipId.get(layer.clipId);
          if (!placement) {
            return [];
          }
          const clipStartMs = placement.startMs;
          const trimMs = trimOf(layer.clipId);
          return layer.effects.flatMap((effect) => {
            // the lane speaks programme time; the effect is stored against the
            // footage, so the clip's own trim comes off on the way out and the
            // editor puts it back when a drag lands. A moment the trim cut out
            // is not on the programme at all, so it gets no marker.
            const localMs = effect.tMs - trimMs;
            if (localMs < 0 || localMs > placement.durationMs) {
              return [];
            }
            const atMs = clipStartMs + localMs;
            const point = { startMs: atMs, durationMs: 0 };
            return [
              <EffectMarker
                key={effect.id}
                effect={effect}
                atMs={atMs}
                pixelsPerSecond={pixelsPerSecond}
                selected={isSelected(selection, 'effect', effect.id)}
                readOnly={readOnly}
                onSelect={() => onSelect('effect', effect.id)}
                onDragStart={(event) =>
                  onDragStart('effect', effect.id, point, 'move', event)
                }
                onNudge={(deltaMs) =>
                  onNudge('effect', effect.id, point, 'move', deltaMs)
                }
              />,
            ];
          });
        })}
      </div>
    );
  },
);

const NarrationTrack = memo<{
  readonly narration: NarrationClip[];
  readonly assets: Record<string, ProjectAsset>;
  readonly pixelsPerSecond: number;
  readonly selection?: Selection;
  readonly readOnly: boolean;
  readonly onSelect: SelectHandler;
  readonly onDragStart: StartSpanDrag;
  readonly onNudge: NudgeSpan;
}>(
  ({
    narration,
    assets,
    pixelsPerSecond,
    selection,
    readOnly,
    onSelect,
    onDragStart,
    onNudge,
  }) => (
    <div css={overlayTrackStyles}>
      {narration.length === 0 ? (
        <p css={emptyTrackStyles}>
          Record a voice over or import an audio file to add one here.
        </p>
      ) : (
        narration.map((take) => {
          const label = assets[take.assetId]?.label ?? 'Voice over';
          const span = {
            startMs: take.startMs,
            durationMs: take.outMs - take.inMs,
          };
          return (
            <LaneBlock
              key={take.id}
              tone="audio"
              label={label}
              name={`Voice over ${label}`}
              left={msToPx(span.startMs, pixelsPerSecond)}
              width={msToPx(span.durationMs, pixelsPerSecond)}
              selected={isSelected(selection, 'narration', take.id)}
              readOnly={readOnly}
              onSelect={() => onSelect('narration', take.id)}
              onDragStart={(kind, event) =>
                onDragStart('narration', take.id, span, kind, event)
              }
              onNudge={(kind, deltaMs) =>
                onNudge('narration', take.id, span, kind, deltaMs)
              }
            />
          );
        })
      )}
    </div>
  ),
);

type Drag =
  | { target: 'reorder'; clipId: string; index: number; originMs: number }
  | ({ target: 'clip'; clipId: string } & TrimDrag)
  | ({
      target: 'span';
      spanKind: SpanKind;
      id: string;
      minMs?: number;
    } & SpanDrag);

type Props = {
  readonly placements: ClipPlacement[];
  readonly durationMs: number;
  readonly pixelsPerSecond: number;
  readonly banners: Banner[];
  readonly narration: NarrationClip[];
  readonly zooms: Zoom[];
  readonly cursorLayers: CursorLayer[];
  readonly selection?: Selection;
  // the clips picked into the cut a download renders
  readonly pickedIds: readonly string[];
  // whether picking means anything here; false leaves the toggle inert
  readonly canPick: boolean;
  readonly readOnly: boolean;
  readonly assets: Record<string, ProjectAsset>;
  readonly onSelect: SelectHandler;
  readonly onTogglePick: (clipId: string) => void;
  readonly onSeek: (ms: number) => void;
  // always in programme time; the editor converts for the clip-anchored tracks.
  // The drag kind travels with it because moving a block and resizing it mean
  // different things to the audio underneath it.
  readonly onSpanChange: (
    kind: SpanKind,
    id: string,
    span: Span,
    drag: DragKind,
  ) => void;
  readonly onMove: (clipId: string, toIndex: number) => void;
  // a clip dropped over its neighbour blends into it: the overlap is the length
  // of the transition, because that is the only way the track lets two clips
  // share time
  readonly onOverlap: (clipId: string, durationMs: number) => void;
  readonly onTrim: (
    clipId: string,
    change: { inMs?: number; outMs?: number },
  ) => void;
  readonly onToggleMute: (clipId: string) => void;
  // one drag is one undoable step, however many pointer moves it takes
  readonly onGestureStart: () => void;
  readonly onGestureEnd: () => void;
};

const Timeline: FC<Props> = ({
  placements,
  durationMs,
  pixelsPerSecond,
  pickedIds,
  canPick,
  onTogglePick,
  banners,
  narration,
  zooms,
  cursorLayers,
  selection,
  readOnly,
  assets,
  onSelect,
  onSeek,
  onMove,
  onOverlap,
  onTrim,
  onSpanChange,
  onToggleMute,
  onGestureStart,
  onGestureEnd,
}) => {
  const laneRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag>();
  const pointerXRef = useRef(0);
  // the drop marker is drawn by React, but the drag has to read its own answer
  // back on the same frame it was worked out
  const dropIndexRef = useRef<number>();
  const [dropIndex, setDropIndex] = useState<number>();
  const ghost = useDragGhost();

  // The lane's origin in viewport space is fixed for the length of a drag
  // apart from its own scrolling, so it is measured once when the drag takes
  // the pointer: reading getBoundingClientRect on every pointer sample forced
  // a synchronous layout right after React committed the previous sample's
  // styles, which is the most expensive possible moment to ask.
  const laneOriginRef = useRef<number>();

  const msAt = useCallback(
    (clientX: number): number => {
      const lane = laneRef.current;
      if (!lane) return 0;
      const scroll = scrollRef.current;
      const origin =
        laneOriginRef.current !== undefined && scroll
          ? laneOriginRef.current - scroll.scrollLeft
          : lane.getBoundingClientRect().left;
      return pxToMs(clientX - origin, pixelsPerSecond);
    },
    [pixelsPerSecond],
  );

  // the drop lands before the first clip whose midpoint the pointer has not passed
  const indexAt = useCallback(
    (tMs: number): number =>
      placements.filter(
        (placement) => tMs > placement.startMs + placement.durationMs / 2,
      ).length,
    [placements],
  );

  const applyDrag = useCallback(
    (clientX: number) => {
      const drag = dragRef.current;
      if (!drag || readOnly) return;
      const tMs = msAt(clientX);
      const offsetPx = msToPx(tMs - drag.originMs, pixelsPerSecond);

      switch (drag.target) {
        case 'reorder': {
          const landing = indexAt(tMs);
          const toIndex = landing > drag.index ? landing - 1 : landing;
          const reorders = toIndex !== drag.index;
          dropIndexRef.current = reorders ? landing : undefined;
          setDropIndex(dropIndexRef.current);

          if (reorders) {
            ghost.move(offsetPx, 'Move here');
            return;
          }
          const blend = overlapAfterDrag(
            placements,
            drag.index,
            tMs - drag.originMs,
          );
          ghost.move(
            offsetPx,
            blend === undefined ? undefined : overlapHint(blend.durationMs),
          );
          return;
        }

        case 'clip':
          onTrim(drag.clipId, trimAfterDrag(drag, tMs));
          return;

        default: {
          const span = spanAfterDrag(drag, tMs, drag.minMs);
          onSpanChange(drag.spanKind, drag.id, span, drag.kind);
          if (drag.kind === 'move') {
            ghost.move(offsetPx, formatTimecode(span.startMs));
          }
        }
      }
    },
    [
      ghost,
      indexAt,
      msAt,
      onSpanChange,
      onTrim,
      pixelsPerSecond,
      placements,
      readOnly,
    ],
  );

  // the lane keeps sliding while the pointer is held at either end of it, and
  // every step of that slide moves the drag along with it
  const followPointer = useCallback(
    () => applyDrag(pointerXRef.current),
    [applyDrag],
  );
  const autoScroll = useEdgeAutoScroll(scrollRef, followPointer);

  const onLanePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    // a capture can be lost without a pointerup ever reaching the lane, and a
    // stale drag would then keep editing on plain hover
    if (!drag || readOnly || event.buttons === 0) return;
    pointerXRef.current = event.clientX;
    autoScroll.track(event.clientX);
    applyDrag(event.clientX);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = undefined;
    autoScroll.stop();
    ghost.hide();

    if (drag?.target === 'reorder') {
      const landing = dropIndexRef.current;
      if (landing === undefined) {
        // it was not dropped past a neighbour, so it was dropped over one
        const blend = overlapAfterDrag(
          placements,
          drag.index,
          msAt(pointerXRef.current) - drag.originMs,
        );
        if (blend) {
          onOverlap(blend.clipId, blend.durationMs);
        }
      } else {
        const toIndex = landing > drag.index ? landing - 1 : landing;
        if (toIndex !== drag.index) {
          onMove(drag.clipId, toIndex);
        }
      }
    }

    // the drop is part of the drag, so it belongs inside the one undo step the
    // whole gesture makes rather than becoming an entry of its own
    if (drag) {
      onGestureEnd();
    }

    dropIndexRef.current = undefined;
    setDropIndex(undefined);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // the lane owns the pointer for the whole drag, so it keeps receiving moves
  // even once the pointer has left the block it started on
  const capture = useCallback(
    (event: ReactPointerEvent<HTMLElement>): boolean => {
      const lane = laneRef.current;
      if (!lane) return false;
      lane.setPointerCapture(event.pointerId);
      pointerXRef.current = event.clientX;
      // one measurement for the whole drag; scrolling is added back per sample
      laneOriginRef.current =
        lane.getBoundingClientRect().left +
        (scrollRef.current?.scrollLeft ?? 0);
      autoScroll.track(event.clientX);
      autoScroll.start();
      return true;
    },
    [autoScroll],
  );

  // only a move carries the block somewhere else; a trim already redraws the
  // block itself as it goes, and a second copy of it would say nothing
  const raiseGhost = useCallback(
    (kind: DragKind, event: ReactPointerEvent<HTMLElement>) => {
      const lane = laneRef.current;
      if (kind !== 'move' || !lane) return;
      ghost.show(event.currentTarget, lane);
    },
    [ghost],
  );

  const startClipDrag = useCallback<StartClipDrag>(
    (placement, kind, event) => {
      if (!capture(event)) return;
      onGestureStart();
      raiseGhost(kind, event);
      const { clip } = placement;

      if (kind === 'move') {
        dragRef.current = {
          target: 'reorder',
          clipId: clip.id,
          index: placement.index,
          originMs: msAt(event.clientX),
        };
        return;
      }

      dragRef.current =
        clip.kind === 'source'
          ? {
              target: 'clip',
              clipId: clip.id,
              kind,
              originMs: msAt(event.clientX),
              inMs: clip.inMs,
              outMs: clip.outMs,
            }
          : {
              target: 'span',
              spanKind: 'title',
              id: clip.id,
              kind,
              originMs: msAt(event.clientX),
              startMs: placement.startMs,
              durationMs: placement.durationMs,
            };
    },
    [capture, msAt, onGestureStart, raiseGhost],
  );

  const startSpanDrag = useCallback<StartSpanDrag>(
    (spanKind, id, span, kind, event, minMs) => {
      if (!capture(event)) return;
      onGestureStart();
      raiseGhost(kind, event);
      dragRef.current = {
        target: 'span',
        spanKind,
        id,
        kind,
        minMs,
        originMs: msAt(event.clientX),
        ...span,
      };
    },
    [capture, msAt, onGestureStart, raiseGhost],
  );

  // A keyboard makes the same edits the pointer does, by handing the drag
  // helpers an origin of zero and the step as the position moved to.
  const nudgeClip = useCallback<NudgeClip>(
    (placement, kind, deltaMs) => {
      const { clip } = placement;
      if (kind === 'move') {
        const toIndex = placement.index + (deltaMs > 0 ? 1 : -1);
        if (toIndex >= 0 && toIndex < placements.length) {
          onMove(clip.id, toIndex);
        }
        return;
      }
      if (clip.kind === 'source') {
        onTrim(
          clip.id,
          trimAfterDrag(
            { kind, originMs: 0, inMs: clip.inMs, outMs: clip.outMs },
            deltaMs,
          ),
        );
        return;
      }
      onSpanChange(
        'title',
        clip.id,
        spanAfterDrag(
          {
            kind,
            originMs: 0,
            startMs: placement.startMs,
            durationMs: placement.durationMs,
          },
          deltaMs,
        ),
        kind,
      );
    },
    [onMove, onSpanChange, onTrim, placements.length],
  );

  const nudgeSpan = useCallback<NudgeSpan>(
    (spanKind, id, span, kind, deltaMs, minMs) =>
      onSpanChange(
        spanKind,
        id,
        spanAfterDrag({ kind, originMs: 0, ...span }, deltaMs, minMs),
        kind,
      ),
    [onSpanChange],
  );

  const laneWidth = Math.max(
    msToPx(durationMs, pixelsPerSecond) + lanePaddingPx,
    480,
  );

  return (
    <div css={panelStyles}>
      <div css={headerColumnStyles} aria-hidden="true">
        <div css={headerCellStyles} style={{ height: trackHeights.ruler }} />
        <div css={headerCellStyles} style={{ height: trackHeights.clip }}>
          Clips
        </div>
        <div css={headerCellStyles} style={{ height: trackHeights.lane }}>
          Banners
        </div>
        <div css={headerCellStyles} style={{ height: trackHeights.lane }}>
          Zoom, cursor
        </div>
        <div css={headerCellStyles} style={{ height: trackHeights.lane }}>
          Voice over
        </div>
      </div>

      <div
        css={scrollStyles}
        ref={scrollRef}
        role="region"
        aria-label="Timeline lanes"
      >
        <div
          css={laneStyles}
          style={{ width: laneWidth }}
          ref={laneRef}
          onPointerMove={onLanePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        >
          <Ruler
            durationMs={durationMs}
            pixelsPerSecond={pixelsPerSecond}
            msAt={msAt}
            onSeek={onSeek}
          />

          <ClipTrack
            placements={placements}
            assets={assets}
            pixelsPerSecond={pixelsPerSecond}
            durationMs={durationMs}
            selection={selection}
            pickedIds={pickedIds}
            canPick={canPick}
            readOnly={readOnly}
            dropIndex={dropIndex}
            onSelect={onSelect}
            onTogglePick={onTogglePick}
            onDragStart={startClipDrag}
            onNudge={nudgeClip}
            onToggleMute={onToggleMute}
          />

          <BannerTrack
            banners={banners}
            pixelsPerSecond={pixelsPerSecond}
            selection={selection}
            readOnly={readOnly}
            onSelect={onSelect}
            onDragStart={startSpanDrag}
            onNudge={nudgeSpan}
          />

          <EffectTrack
            zooms={zooms}
            cursorLayers={cursorLayers}
            placements={placements}
            pixelsPerSecond={pixelsPerSecond}
            selection={selection}
            readOnly={readOnly}
            onSelect={onSelect}
            onDragStart={startSpanDrag}
            onNudge={nudgeSpan}
          />

          <NarrationTrack
            narration={narration}
            assets={assets}
            pixelsPerSecond={pixelsPerSecond}
            selection={selection}
            readOnly={readOnly}
            onSelect={onSelect}
            onDragStart={startSpanDrag}
            onNudge={nudgeSpan}
          />

          <PlayheadMarker pixelsPerSecond={pixelsPerSecond} />

          <div
            ref={ghost.ref}
            css={ghostStyles}
            data-testid="drag-ghost"
            aria-hidden="true"
            hidden
          />
        </div>
      </div>
    </div>
  );
};

// the marker moves on its own now, so nothing on the lane has to be redrawn
// while the clock runs
export default memo(Timeline);
