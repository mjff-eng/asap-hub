/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, PointerEvent as ReactPointerEvent, memo, useRef } from 'react';
import EditorButton from './EditorButton';
import { editorTheme } from './editorTheme';
import { formatTimecode } from './geometry';
import { usePlaybackContext, usePlayheadEffect } from './usePlayback';
import {
  CollapseIcon,
  ExpandIcon,
  MuteIcon,
  PauseIcon,
  PlayIcon,
  SkipEndIcon,
  SkipStartIcon,
  SoundIcon,
} from './icons';

const barStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  maxWidth: '100%',
  padding: '6px 4px',
  boxSizing: 'border-box',
  color: editorTheme.text,
});

const seekStyles = css({
  position: 'relative',
  flex: 1,
  minWidth: 60,
  height: 18,
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  touchAction: 'none',
  border: 0,
  background: 'transparent',
  padding: 0,
});

const trackStyles = css({
  position: 'relative',
  width: '100%',
  height: 5,
  borderRadius: 3,
  backgroundColor: editorTheme.line,
  overflow: 'hidden',
});

const fillStyles = css({
  position: 'absolute',
  inset: 0,
  transformOrigin: 'left center',
  backgroundColor: editorTheme.playhead,
});

// the knob rides a full width rail it can be translated along, so the playhead
// never writes a property the browser has to lay the bar out again for
const knobRailStyles = css({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
});

const knobStyles = css({
  position: 'absolute',
  top: '50%',
  left: 0,
  width: 11,
  height: 11,
  marginLeft: -5,
  marginTop: -5,
  borderRadius: '50%',
  backgroundColor: editorTheme.playhead,
  pointerEvents: 'none',
});

const timeStyles = css({
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
  color: editorTheme.muted,
  whiteSpace: 'nowrap',
});

const volumeStyles = css({ width: 80, accentColor: editorTheme.playhead });

type Props = {
  readonly playing: boolean;
  readonly canPlay: boolean;
  readonly durationMs: number;
  readonly volume: number;
  readonly fullscreen?: { active: boolean; toggle: () => void };
  readonly onToggle: () => void;
  readonly onSeek: (ms: number) => void;
  readonly onSkipStart: () => void;
  readonly onSkipEnd: () => void;
  readonly onVolume: (volume: number) => void;
};

// the transport that belongs to the picture: scrubbing, sound and fullscreen
// sit under the stage where a viewer expects them, not in the editor chrome
const StageControls: FC<Props> = ({
  playing,
  canPlay,
  durationMs,
  volume,
  fullscreen,
  onToggle,
  onSeek,
  onSkipStart,
  onSkipEnd,
  onVolume,
}) => {
  const seekRef = useRef<HTMLDivElement>(null);
  const mutedFromRef = useRef(1);
  const fillRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const playback = usePlaybackContext();
  const progressAt = (ms: number) => (durationMs > 0 ? ms / durationMs : 0);
  const progress = progressAt(playback.getPlayheadMs());

  usePlayheadEffect((ms) => {
    const ratio = progressAt(ms);
    if (fillRef.current) {
      fillRef.current.style.transform = `scaleX(${ratio})`;
    }
    if (railRef.current) {
      railRef.current.style.transform = `translateX(${ratio * 100}%)`;
    }
    // the span is React's, so it is left alone on the frames it already reads
    // the way it should
    const at = `${formatTimecode(ms)} / ${formatTimecode(durationMs)}`;
    if (timeRef.current && timeRef.current.textContent !== at) {
      timeRef.current.textContent = at;
    }
    seekRef.current?.setAttribute('aria-valuenow', `${Math.round(ms)}`);
  });

  const seekTo = (clientX: number) => {
    const bounds = seekRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;
    const ratio = Math.min(
      1,
      Math.max(0, (clientX - bounds.left) / bounds.width),
    );
    onSeek(ratio * durationMs);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      seekTo(event.clientX);
    }
  };

  return (
    <div css={barStyles}>
      <EditorButton
        aria-label="Jump to the start"
        icon={<SkipStartIcon size={15} />}
        onClick={onSkipStart}
      />
      <EditorButton
        aria-label={playing ? 'Pause' : 'Play'}
        icon={playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        primary
        disabled={!canPlay}
        onClick={onToggle}
      />
      <EditorButton
        aria-label="Jump to the end"
        icon={<SkipEndIcon size={15} />}
        onClick={onSkipEnd}
      />

      <div
        ref={seekRef}
        css={seekStyles}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(durationMs)}
        aria-valuenow={Math.round(playback.getPlayheadMs())}
        aria-valuetext={formatTimecode(playback.getPlayheadMs())}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          seekTo(event.clientX);
        }}
        onPointerMove={onPointerMove}
        onKeyDown={(event) => {
          // without this the page scrolls sideways as well as the playhead
          // moving, because the arrow keeps its default on a plain div
          const at = playback.getPlayheadMs();
          const seeks: Record<string, number> = {
            ArrowLeft: at - 1000,
            ArrowRight: at + 1000,
            Home: 0,
            End: durationMs,
          };
          const target = seeks[event.key];
          if (target === undefined) return;
          event.preventDefault();
          onSeek(Math.min(durationMs, Math.max(0, target)));
        }}
      >
        <span css={trackStyles}>
          <span
            ref={fillRef}
            css={fillStyles}
            style={{ transform: `scaleX(${progress})` }}
          />
        </span>
        <span
          ref={railRef}
          css={knobRailStyles}
          style={{ transform: `translateX(${progress * 100}%)` }}
        >
          <span css={knobStyles} />
        </span>
      </div>

      <span css={timeStyles} ref={timeRef}>
        {`${formatTimecode(playback.getPlayheadMs())} / ${formatTimecode(
          durationMs,
        )}`}
      </span>

      <EditorButton
        aria-label={volume === 0 ? 'Unmute the preview' : 'Mute the preview'}
        icon={volume === 0 ? <MuteIcon size={15} /> : <SoundIcon size={15} />}
        onClick={() => {
          if (volume === 0) {
            onVolume(mutedFromRef.current || 1);
            return;
          }
          // remembered so unmuting comes back at the level it left, not 100%
          mutedFromRef.current = volume;
          onVolume(0);
        }}
      />
      <input
        css={volumeStyles}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        aria-label="Preview volume"
        onChange={(event) => onVolume(Number(event.target.value))}
      />

      {fullscreen ? (
        <EditorButton
          aria-label={fullscreen.active ? 'Leave fullscreen' : 'Fullscreen'}
          icon={
            fullscreen.active ? (
              <CollapseIcon size={15} />
            ) : (
              <ExpandIcon size={15} />
            )
          }
          onClick={fullscreen.toggle}
        />
      ) : null}
    </div>
  );
};

// the playhead re-renders the editor on every frame; these panels only ever
// change when the document or the selection does
export default memo(StageControls);
