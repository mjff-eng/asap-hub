/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { Chapter, VideoAccess } from '../api/types';
import { charcoal, fern, onDark, rem } from '../ui/theme';
import { formatDuration } from '../utils/time';
import ChaptersPanel from './ChaptersPanel';
import {
  ChaptersIcon,
  EnterFullscreenIcon,
  ExitFullscreenIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeMutedIcon,
} from './icons';
import { activeChapterIndex, clamp } from './playback';
import SeekBar from './SeekBar';
import SeekTooltip from './SeekTooltip';
import useThumbnails from './useThumbnails';

const IDLE_MS = 3000;
const SEEK_STEP = 5;

const wrapperStyles = css({
  position: 'relative',
  backgroundColor: charcoal.rgb,
  borderRadius: rem(8),
  overflow: 'hidden',
  outline: 'none',
  ':fullscreen': { borderRadius: 0, display: 'grid', alignContent: 'center' },
});

const videoStyles = css({
  display: 'block',
  width: '100%',
  aspectRatio: '16 / 9',
  backgroundColor: charcoal.rgb,
});

const hiddenCursorStyles = css({ cursor: 'none' });

const controlsStyles = css({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  padding: `${rem(28)} ${rem(12)} ${rem(8)}`,
  background:
    'linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.35) 55%, rgba(0, 0, 0, 0))',
  color: onDark.rgb,
  transition: 'opacity 200ms',
  display: 'grid',
  gap: rem(2),
});

const hiddenControlsStyles = css({ opacity: 0, pointerEvents: 'none' });

const rowStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(4),
  minWidth: 0,
});

const iconButtonStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: rem(36),
  height: rem(36),
  flexShrink: 0,
  padding: 0,
  border: 'none',
  borderRadius: rem(4),
  backgroundColor: 'transparent',
  color: onDark.rgb,
  cursor: 'pointer',
  ':hover, :focus-visible': { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
});

const activeIconButtonStyles = css({
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
});

const volumeWrapperStyles = css({
  display: 'flex',
  alignItems: 'center',
  ':hover input, :focus-within input': {
    width: rem(72),
    opacity: 1,
    marginLeft: rem(4),
  },
});

const volumeSliderStyles = css({
  width: 0,
  opacity: 0,
  marginLeft: 0,
  transition: 'width 150ms, opacity 150ms, margin 150ms',
  accentColor: fern.rgb,
  cursor: 'pointer',
});

const timeStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(6),
  minWidth: 0,
  paddingLeft: rem(6),
  fontSize: rem(13),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});

const chapterTitleStyles = css({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
  color: 'rgba(255, 255, 255, 0.85)',
});

const spacerStyles = css({ flexGrow: 1 });

const centerPlayStyles = css({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: rem(72),
  height: rem(72),
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  borderRadius: '50%',
  backgroundColor: 'rgba(0, 0, 0, 0.55)',
  color: onDark.rgb,
  cursor: 'pointer',
  ':hover, :focus-visible': { backgroundColor: 'rgba(0, 0, 0, 0.75)' },
});

const seekWrapperStyles = css({ position: 'relative' });

const failurePanelStyles = css({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'grid',
  justifyItems: 'center',
  gap: rem(8),
  maxWidth: 'calc(100% - 32px)',
  padding: `${rem(20)} ${rem(24)}`,
  borderRadius: rem(8),
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  // over the picture, like the rest of the player chrome, so the literals stay
  color: 'rgb(255, 255, 255)',
  textAlign: 'center',
});

const failureBodyStyles = css({
  fontSize: rem(14),
  color: 'rgba(255, 255, 255, 0.85)',
});

const retryButtonStyles = css({
  padding: `${rem(8)} ${rem(18)}`,
  border: '1px solid rgba(255, 255, 255, 0.35)',
  borderRadius: rem(4),
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  color: 'rgb(255, 255, 255)',
  font: 'inherit',
  fontSize: rem(14),
  fontWeight: 'bold',
  cursor: 'pointer',
  ':hover, :focus-visible': { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  ':disabled': { cursor: 'progress', opacity: 0.7 },
});

type Hover = { seconds: number; left: number } | null;

const Player: FC<{
  readonly access: VideoAccess;
  readonly chapters: Chapter[];
  readonly durationMs: number;
  readonly initialSeconds?: number;
  readonly currentSeconds: number;
  readonly onTimeChange: (seconds: number) => void;
  readonly registerSeek?: (seek: (seconds: number) => void) => void;
  readonly onRequestAccess?: () => void | Promise<unknown>;
}> = ({
  access,
  chapters,
  durationMs,
  initialSeconds,
  currentSeconds,
  onTimeChange,
  registerSeek,
  onRequestAccess,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chaptersButtonRef = useRef<HTMLButtonElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const [idle, setIdle] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [hover, setHover] = useState<Hover>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [playerWidth, setPlayerWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryingRef = useRef(false);
  const mountedRef = useRef(true);

  const thumbnails = useThumbnails(access.thumbnailsVttUrl);
  const durationSeconds = durationMs / 1000;
  const hasChapters = chapters.length > 0;
  const activeIndex = activeChapterIndex(chapters, currentSeconds);
  const currentChapter = chapters[activeIndex];

  // reasserted on every mount so a StrictMode remount does not leave it false
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // fresh credentials arrive as cookies on the access response, so the reload
  // has to wait for it to settle or it goes out with the expired ones again
  const retryPlayback = useCallback(() => {
    if (retryingRef.current) return;
    retryingRef.current = true;
    setRetrying(true);

    const settle = (refreshed: boolean) => {
      retryingRef.current = false;
      if (!mountedRef.current) return;
      setRetrying(false);
      if (!refreshed) return;
      setFailed(false);
      videoRef.current?.load();
    };

    void (async () => onRequestAccess?.())().then(
      () => settle(true),
      () => settle(false),
    );
  }, [onRequestAccess]);

  const seekTo = useCallback(
    (seconds: number) => {
      const element = videoRef.current;
      const next = clamp(seconds, 0, durationSeconds || seconds);
      if (element) element.currentTime = next;
      onTimeChange(next);
    },
    [durationSeconds, onTimeChange],
  );

  useEffect(() => {
    registerSeek?.(seekTo);
  }, [registerSeek, seekTo]);

  // a fresh url means fresh credentials, so the failure panel steps aside
  useEffect(() => setFailed(false), [access.streamUrl]);

  useEffect(() => {
    if (!initialSeconds || !Number.isFinite(initialSeconds)) return;
    const element = videoRef.current;
    if (!element) return;
    element.currentTime = initialSeconds;
    onTimeChange(initialSeconds);
    // Applied once, when the player mounts with a `?t=` deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeconds]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;
    const measure = () => setPlayerWidth(wrapper.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  }, []);

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  const togglePlay = useCallback(() => {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) void element.play()?.catch(() => undefined);
    else element.pause();
    wake();
  }, [wake]);

  const toggleFullscreen = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (document.fullscreenElement === wrapper) {
      void document.exitFullscreen?.()?.catch(() => undefined);
      return;
    }
    void wrapper.requestFullscreen?.()?.catch(() => undefined);
  }, []);

  const toggleMute = useCallback(() => {
    const element = videoRef.current;
    if (!element) return;
    element.muted = !element.muted;
    setMuted(element.muted);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable === true;
      if (typing) return;

      const wrapper = wrapperRef.current;
      const engaged =
        Boolean(wrapper) &&
        (fullscreen ||
          wrapper?.contains(document.activeElement) === true ||
          wrapper?.matches(':hover') === true);

      if (event.key === 'Escape' && panelOpen) {
        setPanelOpen(false);
        return;
      }
      if (!engaged) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seekTo(currentSeconds - SEEK_STEP);
          wake();
          break;
        case 'ArrowRight':
          event.preventDefault();
          seekTo(currentSeconds + SEEK_STEP);
          wake();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          event.preventDefault();
          toggleMute();
          break;
        default:
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentSeconds,
    fullscreen,
    panelOpen,
    seekTo,
    toggleFullscreen,
    toggleMute,
    togglePlay,
    wake,
  ]);

  useEffect(() => {
    if (!panelOpen) return undefined;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (chaptersButtonRef.current?.contains(target)) return;
      if (
        wrapperRef.current
          ?.querySelector('[data-testid="chapters-panel"]')
          ?.contains(target)
      ) {
        return;
      }
      setPanelOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [panelOpen]);

  const controlsHidden = playing && idle && !scrubbing && !panelOpen;

  return (
    <div
      ref={wrapperRef}
      css={[wrapperStyles, controlsHidden && hiddenCursorStyles]}
      tabIndex={-1}
      onMouseMove={wake}
      onMouseLeave={() => {
        clearTimeout(idleTimer.current);
        if (playing) setIdle(true);
      }}
    >
      <video
        ref={videoRef}
        css={videoStyles}
        preload="metadata"
        src={access.streamUrl}
        data-testid="demo-video"
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          wake();
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setFailed(true);
        }}
        onLoadedData={() => setFailed(false)}
        onVolumeChange={(event) => {
          setMuted(event.currentTarget.muted);
          setVolume(event.currentTarget.volume);
        }}
        onProgress={(event) => {
          const ranges = event.currentTarget.buffered;
          setBuffered(ranges.length > 0 ? ranges.end(ranges.length - 1) : 0);
        }}
        onTimeUpdate={(event) => {
          if (scrubbing) return;
          onTimeChange(event.currentTarget.currentTime);
        }}
      />

      {!started && !failed && (
        <button
          type="button"
          css={centerPlayStyles}
          aria-label="Play"
          onClick={togglePlay}
        >
          <PlayIcon />
        </button>
      )}

      {failed && (
        <div css={failurePanelStyles} role="alert">
          <strong>Playback stopped</strong>
          <span css={failureBodyStyles}>
            The stream stopped responding. Your access may have expired.
          </span>
          <button
            type="button"
            css={retryButtonStyles}
            onClick={retryPlayback}
            disabled={retrying}
          >
            {retrying ? 'Retrying' : 'Retry'}
          </button>
        </div>
      )}

      <div css={[controlsStyles, controlsHidden && hiddenControlsStyles]}>
        <div css={seekWrapperStyles}>
          <SeekBar
            chapters={chapters}
            durationSeconds={durationSeconds}
            currentSeconds={currentSeconds}
            bufferedSeconds={buffered}
            onSeek={seekTo}
            onScrubbingChange={setScrubbing}
            onHover={setHover}
          />
          {hover && (
            <SeekTooltip
              spriteUrl={access.spriteUrl}
              cues={thumbnails}
              chapters={chapters}
              seconds={hover.seconds}
              left={hover.left}
              playerWidth={playerWidth}
            />
          )}
        </div>

        <div css={rowStyles}>
          <button
            type="button"
            css={iconButtonStyles}
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={togglePlay}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div css={volumeWrapperStyles}>
            <button
              type="button"
              css={iconButtonStyles}
              aria-label={muted ? 'Unmute' : 'Mute'}
              onClick={toggleMute}
            >
              {muted || volume === 0 ? <VolumeMutedIcon /> : <VolumeHighIcon />}
            </button>
            <input
              css={volumeSliderStyles}
              type="range"
              min={0}
              max={1}
              step={0.05}
              aria-label="Volume"
              value={muted ? 0 : volume}
              onChange={(event) => {
                const element = videoRef.current;
                if (!element) return;
                const next = Number(event.currentTarget.value);
                element.volume = next;
                element.muted = next === 0;
                setVolume(next);
                setMuted(next === 0);
              }}
            />
          </div>

          <div css={timeStyles}>
            <span>
              {formatDuration(currentSeconds * 1000)} /{' '}
              {formatDuration(durationMs)}
            </span>
            {currentChapter && (
              <>
                <span aria-hidden>&middot;</span>
                <span css={chapterTitleStyles}>{currentChapter.title}</span>
              </>
            )}
          </div>

          <div css={spacerStyles} />

          {hasChapters && (
            <button
              ref={chaptersButtonRef}
              type="button"
              css={[iconButtonStyles, panelOpen && activeIconButtonStyles]}
              aria-label="Chapters"
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen((open) => !open)}
            >
              <ChaptersIcon />
            </button>
          )}

          <button
            type="button"
            css={iconButtonStyles}
            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={toggleFullscreen}
          >
            {fullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
          </button>
        </div>
      </div>

      {panelOpen && hasChapters && (
        <ChaptersPanel
          chapters={chapters}
          durationMs={durationMs}
          activeIndex={activeIndex}
          onSelect={(chapter) => {
            seekTo(chapter.startMs / 1000);
            setPanelOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Player;
