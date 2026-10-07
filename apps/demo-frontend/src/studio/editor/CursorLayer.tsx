/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import {
  CursorEffect,
  CursorPathPoint,
  cursorPointerTrack,
  defaultCursorColor,
  edgeFor,
  isCursorColor,
  pointerBox,
  pointerLayers,
  pointerPositionAt,
  pointerVariant,
  Point,
  restingZoom,
  zoomedPoint,
  ZoomView,
} from '@asap-hub/demo-timeline';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

const layerStyles = css({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
});

const ripple = keyframes({
  from: { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0.85 },
  to: { transform: 'translate(-50%, -50%) scale(2.2)', opacity: 0 },
});

const rippleStyles = css({
  position: 'absolute',
  width: '9%',
  aspectRatio: '1',
  borderRadius: '50%',
  borderStyle: 'solid',
  borderWidth: 2,
  transform: 'translate(-50%, -50%)',
});

const inkOf = (effect: CursorEffect): string =>
  effect.color && isCursorColor(effect.color)
    ? effect.color
    : defaultCursorColor;

// the same edge the render draws just outside the ring, so a white click stays
// readable on the white page it usually sits on, and a black one on a dark app
const edgeShadow = (ink: string): string => {
  const edge = edgeFor(ink);
  const rgb = edge.color === '#ffffff' ? '255, 255, 255' : '0, 0, 0';
  return `0 0 0 2px rgba(${rgb}, ${edge.opacity})`;
};

// The animation is wall clock, and it ends on opacity 0. Parked on an effect to
// place it, the creator saw it flash once and then nothing at all, which is the
// whole time they are actually looking at it. So it only animates while the
// demo is playing; paused, it holds the ring the export burns in.
const playingRippleStyles = css({
  animation: `${ripple} 600ms ease-out forwards`,
});

const spotlightStyles = css({
  position: 'absolute',
  inset: 0,
});

// The holder fills the layer, so a translate in percent of its own size is a
// translate in percent of the frame: the pointer is placed by writing one
// transform, with nothing to measure and no layout to read.
const pointerHolderStyles = css({
  position: 'absolute',
  inset: 0,
  transformOrigin: '0 0',
  willChange: 'transform',
});

// hung off its own hotspot, so the part that points lands on the captured
// position rather than the middle of the sprite
const pointerArtStyles = css({
  position: 'absolute',
  left: 0,
  top: 0,
  overflow: 'visible',
});

// how long a ripple stays on screen; the render burns the same window
export const rippleMs = 600;
export const spotlightMs = 1200;

// the layer's nudge is what lines a capture up with the footage, and the
// render applies it when it places every effect, so the preview has to as well.
// A derived capture routinely carries hundreds of effects and this runs every
// frame, so the effects are laid out once, sorted, and each frame only looks
// at the slice that can possibly be on screen.
type ShownWindow = { effect: CursorEffect; atMs: number; endMs: number };

const windowsOf = (effects: CursorEffect[], shiftMs: number): ShownWindow[] =>
  effects
    .map((effect) => {
      const atMs = effect.tMs + shiftMs;
      return {
        effect,
        atMs,
        endMs: atMs + (effect.type === 'spotlight' ? spotlightMs : rippleMs),
      };
    })
    .sort((a, b) => a.atMs - b.atMs);

const shownAt = (windows: ShownWindow[], tMs: number): CursorEffect[] => {
  // the first window that could still be running: none starts earlier than
  // the longest window before tMs
  let low = 0;
  let high = windows.length;
  const earliest = tMs - spotlightMs;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((windows[mid]?.atMs ?? 0) < earliest) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  const shown: CursorEffect[] = [];
  for (let at = low; at < windows.length; at += 1) {
    const candidate = windows[at];
    if (!candidate || candidate.atMs > tMs) {
      break;
    }
    if (candidate.endMs >= tMs) {
      shown.push(candidate.effect);
    }
  }
  return shown;
};

// nothing on this layer changes while an effect is on screen: a ripple is a CSS
// animation and a spotlight stands still, so the only moments worth a render
// are the ones where the set of effects on screen changes
const keyOf = (shown: CursorEffect[]): string =>
  shown.map((effect) => effect.id).join(' ');

export type CursorLayerHandle = {
  setTime: (ms: number) => void;
};

const noPath: CursorPathPoint[] = [];

// a stage with no zooms at all, and every test that renders the layer on its own
const atRest = (): ZoomView => restingZoom;

const pointerTransform = (x: number, y: number): string =>
  `translate(${x * 100}%, ${y * 100}%)`;

type Props = {
  readonly effects: CursorEffect[];
  // the captured path the pointer walks, in the footage's own time: a moment
  // in the source, however the clip showing it is trimmed
  readonly path?: CursorPathPoint[];
  // which drawn pointer walks it; the whole capture shares one
  readonly pointer?: string;
  // where the layer starts; the stage drives it from there
  readonly tMs?: number;
  readonly offsetMs?: number;
  // how far into the footage the clip starts: capture times are footage times,
  // and the stage drives this layer in the clip's own time, so trimming the
  // start of a clip must not slide its clicks late by the trim
  readonly inMs?: number;
  // the creator's own trim, in fractions of the frame: every click and the
  // pointer shift together, exactly as the export shifts them
  readonly alignX?: number;
  readonly alignY?: number;
  readonly playing?: boolean;
  // what the zoom is doing to the picture at a moment. The pointer and the
  // rings ride the zoomed picture rather than the frame it is drawn on, and the
  // export moves them through the very same transform.
  readonly zoomAt?: (tMs: number) => ZoomView;
};

const CursorLayer = forwardRef<CursorLayerHandle, Props>(
  (
    {
      effects,
      path = noPath,
      pointer: pointerId,
      tMs = 0,
      offsetMs = 0,
      inMs = 0,
      alignX = 0,
      alignY = 0,
      playing = false,
      zoomAt = atRest,
    },
    ref,
  ) => {
    // one shift takes a footage time to this clip's own: the creator's nudge,
    // less however much of the footage the trim cut off the front
    const shiftMs = offsetMs - inMs;
    const aligned = useCallback(
      (point: Point): Point =>
        alignX === 0 && alignY === 0
          ? point
          : {
              x: Math.min(1, Math.max(0, point.x + alignX)),
              y: Math.min(1, Math.max(0, point.y + alignY)),
            },
      [alignX, alignY],
    );
    const [timeMs, setTimeMs] = useState(tMs);
    const windows = useMemo(
      () => windowsOf(effects, shiftMs),
      [effects, shiftMs],
    );
    const shown = shownAt(windows, timeMs);
    const shownKey = keyOf(shown);
    const shownKeyRef = useRef(shownKey);
    const pointerRef = useRef<HTMLDivElement>(null);
    const latestMsRef = useRef(tMs);
    // read at the moment a frame is drawn rather than closed over, so a zoom
    // edited while the playhead is parked moves what is already on screen
    const zoomAtRef = useRef(zoomAt);
    zoomAtRef.current = zoomAt;
    const ringsRef = useRef(new Map<string, HTMLElement>());
    const effectsRef = useRef(effects);
    effectsRef.current = effects;

    // the same simplified track the render walks, so the two draw one path.
    // The smoothing and simplification depend on the path alone, so a trim
    // drag or a nudge slider step only pays for the cheap shift below.
    const smoothed = useMemo(
      () => cursorPointerTrack({ path, offsetMs: 0 }),
      [path],
    );
    const track = useMemo(
      () =>
        smoothed.map((point) => ({
          ...point,
          ...aligned(point),
          tMs: point.tMs + shiftMs,
        })),
      [aligned, shiftMs, smoothed],
    );
    const pointer = pointerPositionAt(track, timeMs);
    const variant = useMemo(() => pointerVariant(pointerId), [pointerId]);
    const box = useMemo(() => pointerBox(variant), [variant]);

    useEffect(() => {
      shownKeyRef.current = shownKey;
    }, [shownKey]);

    // the pointer moves every frame, which is exactly what a render sixty times
    // a second used to cost, so its position is written straight to the node.
    // A ring moves with it: during a zoom's ramp the picture is still moving,
    // and a ring left behind would be somewhere the pointer no longer is.
    const place = useCallback(
      (ms: number) => {
        const view = zoomAtRef.current(ms);
        const node = pointerRef.current;
        if (node) {
          const at = pointerPositionAt(track, ms);
          node.style.display = at ? '' : 'none';
          if (at) {
            const drawn = zoomedPoint(at, view);
            node.style.transform = pointerTransform(drawn.x, drawn.y);
          }
        }
        ringsRef.current.forEach((_unused, id) => {
          const ring = ringsRef.current.get(id);
          const effect = effectsRef.current.find((each) => each.id === id);
          if (!ring || !effect) {
            return;
          }
          const drawn = zoomedPoint(aligned(effect.point), view);
          ring.style.left = `${drawn.x * 100}%`;
          ring.style.top = `${drawn.y * 100}%`;
        });
      },
      [aligned, track],
    );

    // after every render as well as every frame, so a zoom or an effect the
    // creator has just moved is drawn where it now belongs
    useEffect(() => {
      place(latestMsRef.current);
    }, [effects, place, timeMs, zoomAt]);

    useImperativeHandle(
      ref,
      () => ({
        setTime: (ms: number) => {
          latestMsRef.current = ms;
          place(ms);
          const key = keyOf(shownAt(windows, ms));
          if (key === shownKeyRef.current) {
            return;
          }
          shownKeyRef.current = key;
          setTimeMs(ms);
        },
      }),
      [place, windows],
    );

    const spotlight = shown.find((effect) => effect.type === 'spotlight');
    const view = zoomAt(latestMsRef.current);

    const holdRing = (id: string) => (node: HTMLElement | null) => {
      if (node) {
        ringsRef.current.set(id, node);
      } else {
        ringsRef.current.delete(id);
      }
    };

    const drawnAt = (point: Point): Point => zoomedPoint(aligned(point), view);

    return (
      <div css={layerStyles}>
        {spotlight ? (
          <div
            css={spotlightStyles}
            style={{
              background: `radial-gradient(circle at ${
                aligned(spotlight.point).x * 100
              }% ${
                aligned(spotlight.point).y * 100
              }%, rgba(0, 0, 0, 0) 8%, rgba(0, 0, 0, 0.55) 26%)`,
            }}
          />
        ) : null}

        {shown
          .filter((effect) => effect.type === 'ripple')
          .map((effect) => (
            <span
              key={`${effect.id}-${Math.round(effect.tMs)}-${
                playing ? 'playing' : 'held'
              }`}
              data-testid="cursor-ripple"
              ref={holdRing(effect.id)}
              css={[rippleStyles, playing && playingRippleStyles]}
              style={{
                left: `${drawnAt(effect.point).x * 100}%`,
                top: `${drawnAt(effect.point).y * 100}%`,
                borderColor: inkOf(effect),
                backgroundColor: `${inkOf(effect)}2e`,
                boxShadow: edgeShadow(inkOf(effect)),
              }}
            />
          ))}

        {track.length > 0 ? (
          <div
            ref={pointerRef}
            data-testid="cursor-pointer"
            css={pointerHolderStyles}
            style={{
              display: pointer ? undefined : 'none',
              transform: pointer
                ? pointerTransform(drawnAt(pointer).x, drawnAt(pointer).y)
                : undefined,
            }}
          >
            <svg
              css={pointerArtStyles}
              style={{
                height: `${box.heightRatio * 100}%`,
                aspectRatio: `${box.aspectRatio}`,
                transform: `translate(${box.hotspotX * -100}%, ${
                  box.hotspotY * -100
                }%)`,
              }}
              viewBox={box.viewBox}
              preserveAspectRatio="xMinYMin meet"
              aria-hidden="true"
            >
              {pointerLayers(variant).map((layer, index) => (
                <path
                  key={`${index === 0 ? 'edge' : 'ink'}-${layer.d}`}
                  d={layer.d}
                  fillRule={layer.fillRule}
                  fill={layer.fill}
                  fillOpacity={layer.fillOpacity}
                  stroke={layer.stroke}
                  strokeOpacity={layer.strokeOpacity}
                  strokeWidth={layer.strokeWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
            </svg>
          </div>
        ) : null}
      </div>
    );
  },
);

export default CursorLayer;
