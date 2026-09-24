import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type Options = {
  durationMs: number;
  onEnd?: () => void;
};

export type Playback = {
  playing: boolean;
  // the playhead is read, not rendered: a subscriber is told the new time and
  // writes it wherever it belongs, so a frame costs no React work at all
  subscribe: (listener: (ms: number) => void) => () => void;
  getPlayheadMs: () => number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  nudge: (deltaMs: number) => void;
};

// the playhead is driven by the clock rather than by any one video element, so
// it keeps running across a clip boundary and over a title card with no media
export const usePlayback = ({ durationMs, onEnd }: Options): Playback => {
  const [playing, setPlaying] = useState(false);
  const playheadRef = useRef(0);
  const listenersRef = useRef(new Set<(ms: number) => void>());
  const frameRef = useRef<number>();
  const lastTickRef = useRef<number>();
  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const move = useCallback((ms: number) => {
    const next = Math.min(durationRef.current, Math.max(0, ms));
    if (next === playheadRef.current) {
      return;
    }
    playheadRef.current = next;
    listenersRef.current.forEach((listener) => listener(next));
  }, []);

  const subscribe = useCallback((listener: (ms: number) => void) => {
    const listeners = listenersRef.current;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const getPlayheadMs = useCallback(() => playheadRef.current, []);

  const pause = useCallback(() => setPlaying(false), []);
  const play = useCallback(() => {
    if (durationRef.current > 0) {
      setPlaying(true);
    }
  }, []);
  const toggle = useCallback(
    () => setPlaying((current) => (current ? false : durationRef.current > 0)),
    [],
  );

  const seek = useCallback((ms: number) => move(Math.round(ms)), [move]);

  const nudge = useCallback(
    (deltaMs: number) => move(Math.round(playheadRef.current + deltaMs)),
    [move],
  );

  useEffect(() => {
    if (!playing) {
      lastTickRef.current = undefined;
      return undefined;
    }

    const tick = (now: number) => {
      const last = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const next = playheadRef.current + (now - last);
      if (next >= durationRef.current) {
        move(durationRef.current);
        setPlaying(false);
        onEndRef.current?.();
        return;
      }
      move(next);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [move, playing]);

  useEffect(() => {
    if (playheadRef.current > durationMs) {
      move(durationMs);
    }
  }, [durationMs, move]);

  return useMemo(
    () => ({
      playing,
      subscribe,
      getPlayheadMs,
      play,
      pause,
      toggle,
      seek,
      nudge,
    }),
    [getPlayheadMs, nudge, pause, play, playing, seek, subscribe, toggle],
  );
};

// a stage or a lane rendered on its own has a playhead that never moves, which
// is what every test wants and what the studio starts from
const stopped: Playback = {
  playing: false,
  subscribe: () => () => undefined,
  getPlayheadMs: () => 0,
  play: () => undefined,
  pause: () => undefined,
  toggle: () => undefined,
  seek: () => undefined,
  nudge: () => undefined,
};

const PlaybackContext = createContext<Playback>(stopped);

export const PlaybackProvider = PlaybackContext.Provider;

export const usePlaybackContext = (): Playback => useContext(PlaybackContext);

// runs whenever the playhead moves, and again after every render so that what
// is drawn keeps up with the document as well as with the clock
export const usePlayheadEffect = (apply: (ms: number) => void): void => {
  const playback = usePlaybackContext();
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => playback.subscribe((ms) => applyRef.current(ms)), [playback]);

  // the callback is a new closure whenever what it draws has changed, so this
  // keeps the DOM in step with the document as well as with the clock
  useEffect(() => {
    apply(playback.getPlayheadMs());
  }, [apply, playback]);
};
