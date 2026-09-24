/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import {
  Banner,
  clipLocalMs,
  ClipPlacement,
  CursorEffect,
  CursorPathPoint,
  fadeOpacityAt,
  NarrationClip,
  Point,
  sourceTimeAt,
  Zoom,
} from '@asap-hub/demo-timeline';
import {
  FC,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ProjectAsset } from '../../api/types';
import { rem } from '../../ui/theme';
import BannerLayer, { BannerLayerHandle } from './BannerLayer';
import { editorTheme } from './editorTheme';
import CursorLayer, { CursorLayerHandle } from './CursorLayer';
import { usePlaybackContext, usePlayheadEffect } from './usePlayback';
import {
  clampPoint,
  panFocus,
  pointInBox,
  unzoomedPoint,
  ZoomView,
  zoomedPoint,
  zoomViewAt,
} from './zoom';

// the size is measured and set by the editor, so the frame keeps its ratio
// whichever way the window is constrained
const stageStyles = css({
  containerType: 'inline-size',
  position: 'relative',
  backgroundColor: editorTheme.stage,
  borderRadius: rem(8),
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  touchAction: 'none',
});

const grabStyles = css({ cursor: 'grab', ':active': { cursor: 'grabbing' } });
const pinStyles = css({ cursor: 'crosshair' });

const videoStyles = css({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
});

// the incoming half of a crossfade sits over the outgoing picture and ramps
// its own opacity per frame; it must never catch a pointer meant for the stage
const incomingStyles = css(videoStyles, {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
});

const emptyStyles = css({
  color: editorTheme.onStage,
  textAlign: 'center',
  padding: rem(24),
});

// the title card is artwork, not chrome: these are the colours the renderer
// burns into the video, so they stay literal in both themes

const titleCardStyles = css({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: rem(12),
  backgroundColor: '#0b0d12',
  color: '#ffffff',
  padding: rem(48),
  textAlign: 'center',
});

const titleTextStyles = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: rem(12),
});

const headingStyles = css({
  fontSize: rem(40),
  fontWeight: 700,
  margin: 0,
  lineHeight: 1.15,
});

const subheadingStyles = css({
  fontSize: rem(22),
  margin: 0,
  color: '#d5d5de',
});

const hintStyles = css({
  position: 'absolute',
  left: rem(10),
  bottom: rem(10),
  padding: `${rem(4)} ${rem(10)}`,
  borderRadius: rem(6),
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  color: '#ffffff',
  fontSize: rem(12),
  pointerEvents: 'none',
});

// the handle that says where a click effect fires, shown whenever one is
// selected so it can be seen and moved without hunting for its 600ms window
const markerStyles = css({
  position: 'absolute',
  width: rem(28),
  height: rem(28),
  marginLeft: rem(-14),
  marginTop: rem(-14),
  borderRadius: '50%',
  border: '2px solid #ffffff',
  backgroundColor: 'rgba(255, 255, 255, 0.25)',
  boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.45)',
  cursor: 'grab',
  padding: 0,
  touchAction: 'none',
  ':active': { cursor: 'grabbing' },
});

export type StagePin = {
  point: Point;
  onChange: (point: Point) => void;
};

export type StageFocus = {
  point: Point;
  scale: number;
  onChange: (point: Point) => void;
};

type Props = {
  readonly box: { width: number; height: number };
  readonly placement?: ClipPlacement;
  // the placement after this one: when it opens with a crossfade, the stage
  // blends it in over the overlap the way the export's xfade does, instead of
  // holding the outgoing clip solid and hard cutting
  readonly next?: ClipPlacement;
  readonly banners: Banner[];
  readonly zooms: Zoom[];
  readonly cursorEffects: CursorEffect[];
  // the captured path the drawn pointer walks, and which pointer walks it
  readonly cursorPath?: CursorPathPoint[];
  readonly cursorPointer?: string;
  // the layer's own nudge, applied here exactly as the render applies it
  readonly cursorOffsetMs?: number;
  // the creator's pixel trim, already turned into fractions of the frame
  readonly cursorAlign?: Point;
  readonly playing: boolean;
  readonly volume: number;
  // the voice over lanes, heard here the way the export mixes them: they used
  // to be silent until the export, volume slider and all
  readonly narration?: NarrationClip[];
  readonly assets: Record<string, ProjectAsset>;
  readonly assetUrl: (asset: ProjectAsset) => string | undefined;
  // set while a zoom is selected: the stage holds that zoom so it can be aimed
  readonly focus?: StageFocus;
  // set while a click effect is selected: its marker can be dropped anywhere
  readonly pin?: StagePin;
  // a drag across the stage is one thing the creator did, not one edit per
  // pointer sample, so it collapses into a single undo step
  readonly onGestureStart?: () => void;
  readonly onGestureEnd?: () => void;
};

const noNarration: NarrationClip[] = [];

// one video element, re-pointed as the playhead crosses a clip boundary. The
// timeline clock owns the time; the element is told where to be, never asked.
const PreviewStage: FC<Props> = ({
  box,
  placement,
  next,
  banners,
  zooms,
  cursorEffects,
  cursorPath,
  cursorPointer,
  cursorOffsetMs,
  cursorAlign,
  playing,
  volume,
  narration = noNarration,
  assets,
  assetUrl,
  focus,
  pin,
  onGestureStart,
  onGestureEnd,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const incomingRef = useRef<HTMLVideoElement>(null);
  const narrationRef = useRef(new Map<string, HTMLAudioElement>());
  const titleTextRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<CursorLayerHandle>(null);
  const bannerRef = useRef<BannerLayerHandle>(null);
  const panRef = useRef<{ x: number; y: number; from: Point }>();
  const [panning, setPanning] = useState(false);
  const clip = placement?.clip;
  const asset = clip?.kind === 'source' ? assets[clip.assetId] : undefined;
  const url = asset ? assetUrl(asset) : undefined;

  const playhead = usePlaybackContext();
  const startMs = playhead.getPlayheadMs();
  const localMs = placement ? clipLocalMs(placement, startMs) : 0;

  const viewAt = (atMs: number): ZoomView =>
    // aiming a zoom means seeing it, whatever the playhead is over
    focus
      ? { scale: focus.scale, focus: focus.point }
      : zoomViewAt(zooms, clip?.id ?? '', atMs);

  const zoom = viewAt(localMs);
  // the render pans by moving the crop window; the preview does the same by
  // scaling around the focus point, so the two frame the same thing
  const zoomStyle = {
    transform: `scale(${zoom.scale})`,
    transformOrigin: `${zoom.focus.x * 100}% ${zoom.focus.y * 100}%`,
  };

  // every frame of playback is written straight to the DOM: re-rendering the
  // stage sixty times a second is what used to leave the editor no headroom
  usePlayheadEffect((ms) => {
    const atMs = placement ? clipLocalMs(placement, ms) : 0;
    const element = videoRef.current;
    if (element) {
      const frame = viewAt(atMs);
      element.style.transform = `scale(${frame.scale})`;
      element.style.transformOrigin = `${frame.focus.x * 100}% ${
        frame.focus.y * 100
      }%`;

      // written every frame: the blend below fades this element down, and a
      // fade left standing muted every clip after the crossfade until the
      // volume effect happened to run again
      const mainVolume =
        clip?.kind === 'source'
          ? Math.min(1, Math.max(0, volume * clip.volume))
          : 0;
      element.volume = mainVolume;

      const sourceMs =
        placement && clip?.kind === 'source'
          ? sourceTimeAt(placement, ms)
          : undefined;
      // during playback only real drift is corrected, otherwise every frame
      // fights the element's own clock and the picture stutters; paused, the
      // element moves only when we move it, so scrubbing follows the playhead
      // to the frame rather than trailing it by a quarter second
      const slackS = playing ? 0.25 : 0.01;
      if (
        sourceMs !== undefined &&
        Math.abs(element.currentTime - sourceMs / 1000) > slackS
      ) {
        element.currentTime = sourceMs / 1000;
      }
    }

    // the incoming clip of a crossfade ramps in over the overlap while the
    // outgoing one ramps down, picture and sound both, like the export's
    // xfade and acrossfade
    const incoming = incomingRef.current;
    if (incoming && next && next.clip.kind === 'source' && element) {
      const blendMs = ms - next.startMs;
      const progress =
        next.overlapMs > 0
          ? Math.min(1, Math.max(0, blendMs / next.overlapMs))
          : 0;
      incoming.style.opacity = blendMs >= 0 ? String(progress) : '0';

      const src = sourceTimeAt(next, ms);
      // seeked a moment ahead of its entrance so the first blended frame is
      // already decoded
      if (src !== undefined && blendMs > -1500) {
        const targetS = Math.max(0, src) / 1000;
        const slackS = playing ? 0.25 : 0.01;
        if (Math.abs(incoming.currentTime - targetS) > slackS) {
          incoming.currentTime = targetS;
        }
      }

      const base = Math.min(1, Math.max(0, volume * next.clip.volume));
      incoming.volume = base * progress;
      const outgoing =
        clip?.kind === 'source'
          ? Math.min(1, Math.max(0, volume * clip.volume))
          : 0;
      element.volume = outgoing * (1 - progress);

      const audible = playing && blendMs >= 0;
      if (audible && incoming.paused) {
        void incoming.play().catch(() => undefined);
      }
      if (!audible && !incoming.paused) {
        incoming.pause();
      }
    }

    const text = titleTextRef.current;
    if (text && clip?.kind === 'title') {
      text.style.opacity = `${fadeOpacityAt(
        clip,
        { startMs: 0, durationMs: clip.durationMs },
        atMs,
      )}`;
    }

    cursorRef.current?.setTime(atMs);

    // the takes live in programme time; each element is told where to be the
    // way the clip video is, and plays only while the playhead is inside it
    narration.forEach((take) => {
      const voice = narrationRef.current.get(take.id);
      if (!voice) {
        return;
      }
      const localMsOfTake = ms - take.startMs;
      const within =
        localMsOfTake >= 0 && localMsOfTake < take.outMs - take.inMs;
      voice.volume = Math.min(1, take.volume * volume);
      if (!within || !playing) {
        if (!voice.paused) {
          voice.pause();
        }
      }
      if (!within) {
        return;
      }
      const targetS = (take.inMs + Math.max(0, localMsOfTake)) / 1000;
      const voiceSlackS = playing ? 0.25 : 0.01;
      if (Math.abs(voice.currentTime - targetS) > voiceSlackS) {
        voice.currentTime = targetS;
      }
      if (playing && voice.paused) {
        void voice.play().catch(() => undefined);
      }
    });
    bannerRef.current?.setTime(ms);
  });

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }
    if (playing && url) {
      void element.play().catch(() => undefined);
    } else {
      element.pause();
    }
  }, [playing, url]);

  // the clip's own level and the preview slider both apply, the way the render
  // applies the clip's. An element can only be turned down, so a clip pushed
  // above 1 sounds like 1 here and louder in the export.
  const clipVolume = clip?.kind === 'source' ? clip.volume : 1;
  useEffect(() => {
    const element = videoRef.current;
    if (element) {
      element.volume = Math.min(1, Math.max(0, volume * clipVolume));
    }
  }, [clipVolume, volume]);

  const incomingAsset =
    next?.clip.kind === 'source' && next.overlapMs > 0
      ? assets[next.clip.assetId]
      : undefined;
  const incomingUrl = incomingAsset ? assetUrl(incomingAsset) : undefined;

  const size = { width: box.width, height: box.height };

  const holdNarration = (id: string) => (node: HTMLAudioElement | null) => {
    if (node) {
      narrationRef.current.set(id, node);
    } else {
      narrationRef.current.delete(id);
    }
  };

  // the voice over is heard on every branch of the stage, title cards included
  const narrationAudio = narration.map((take) => {
    const voiceAsset = assets[take.assetId];
    const voiceUrl = voiceAsset ? assetUrl(voiceAsset) : undefined;
    return voiceUrl ? (
      <audio
        key={take.id}
        data-testid="narration-audio"
        ref={holdNarration(take.id)}
        src={voiceUrl}
        preload="auto"
      />
    ) : null;
  });

  if (!clip) {
    return (
      <div css={stageStyles} style={size}>
        <p css={emptyStyles}>Add a clip to the timeline to see it here.</p>
        {narrationAudio}
      </div>
    );
  }

  if (clip.kind === 'title') {
    // only the words fade; the card itself is the clip's picture, and the
    // render draws exactly this curve
    const textOpacity = fadeOpacityAt(
      clip,
      { startMs: 0, durationMs: clip.durationMs },
      localMs,
    );
    return (
      <div css={stageStyles} style={size}>
        <div css={titleCardStyles}>
          <div
            ref={titleTextRef}
            css={titleTextStyles}
            style={{ opacity: textOpacity }}
          >
            <h2 css={headingStyles}>{clip.text}</h2>
            {clip.subtitle ? (
              <p css={subheadingStyles}>{clip.subtitle}</p>
            ) : null}
          </div>
        </div>
        <BannerLayer ref={bannerRef} banners={banners} tMs={startMs} />
        {narrationAudio}
      </div>
    );
  }

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!focus) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { x: event.clientX, y: event.clientY, from: focus.point };
    setPanning(true);
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || !focus) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    focus.onChange(
      panFocus(
        pan.from,
        { dx: event.clientX - pan.x, dy: event.clientY - pan.y },
        bounds,
        focus.scale,
      ),
    );
  };

  const endDrag = () => {
    if (panRef.current || pin) {
      onGestureEnd?.();
    }
    panRef.current = undefined;
    setPanning(false);
  };

  // the marker is dropped on the picture the creator can see, and a zoom has
  // moved that picture, so the click is read back through the same transform
  const dropPin = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pin) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const on = pointInBox(event.clientX, event.clientY, bounds);
    pin.onChange(clampPoint(unzoomedPoint(on, viewAt(localMs))));
  };

  return (
    <div
      css={[stageStyles, focus && grabStyles, pin && pinStyles]}
      style={size}
      onPointerDown={(event) => {
        if (focus) {
          onGestureStart?.();
          startPan(event);
        } else if (pin) {
          onGestureStart?.();
          event.currentTarget.setPointerCapture(event.pointerId);
          dropPin(event);
        }
      }}
      onPointerMove={(event) => {
        if (panRef.current) {
          movePan(event);
        } else if (
          pin &&
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          dropPin(event);
        }
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {url ? (
        <video
          ref={videoRef}
          css={videoStyles}
          style={zoomStyle}
          src={url}
          preload="auto"
          muted={clip.volume === 0}
          playsInline
        />
      ) : (
        <p css={emptyStyles}>
          {asset?.state === 'preparing'
            ? 'This clip is still being prepared.'
            : 'This clip has no playable source yet.'}
        </p>
      )}
      {incomingUrl && next ? (
        <video
          key={next.clip.id}
          ref={incomingRef}
          data-testid="incoming-video"
          css={incomingStyles}
          style={{ opacity: 0 }}
          src={incomingUrl}
          preload="auto"
          playsInline
        />
      ) : null}
      <CursorLayer
        ref={cursorRef}
        effects={cursorEffects}
        path={cursorPath}
        pointer={cursorPointer}
        tMs={localMs}
        offsetMs={cursorOffsetMs}
        alignX={cursorAlign?.x}
        alignY={cursorAlign?.y}
        inMs={clip?.kind === 'source' ? clip.inMs : 0}
        playing={playing}
        zoomAt={viewAt}
      />
      <BannerLayer ref={bannerRef} banners={banners} tMs={startMs} />
      {narrationAudio}

      {pin ? (
        <span
          css={markerStyles}
          style={{
            left: `${zoomedPoint(pin.point, zoom).x * 100}%`,
            top: `${zoomedPoint(pin.point, zoom).y * 100}%`,
          }}
          aria-hidden="true"
        />
      ) : null}

      {focus && !panning ? (
        <span css={hintStyles}>Drag the picture to aim the zoom</span>
      ) : null}
      {pin ? (
        <span css={hintStyles}>Click or drag to place the click</span>
      ) : null}
    </div>
  );
};

export default PreviewStage;
