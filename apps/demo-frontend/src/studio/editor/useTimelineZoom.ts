import {
  RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { trackHeaders } from './editorTheme';
import { clampZoom, defaultPixelsPerSecond, lanePaddingPx } from './geometry';

export type TimelineZoom = {
  // goes on the editor shell: the lane can only be sized once that is laid out
  shellRef: RefObject<HTMLDivElement>;
  pixelsPerSecond: number;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
};

const laneWidthOf = (shellWidth: number): number =>
  shellWidth - trackHeaders - lanePaddingPx;

export const useTimelineZoom = (durationMs: number): TimelineZoom => {
  const [pixelsPerSecond, setPixelsPerSecond] = useState(
    defaultPixelsPerSecond,
  );
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellWidth, setShellWidth] = useState(0);

  const zoomToFit = useCallback(() => {
    const lane = laneWidthOf(shellRef.current?.clientWidth ?? shellWidth);
    if (lane <= 0 || durationMs === 0) {
      setPixelsPerSecond(defaultPixelsPerSecond);
      return;
    }
    setPixelsPerSecond(clampZoom((lane / durationMs) * 1000));
  }, [durationMs, shellWidth]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      setShellWidth(entry?.contentRect.width ?? 0);
    });
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  // the whole demo should be visible without hunting for the right zoom first,
  // and the width is only known once the panels have laid out
  const fitted = useRef(false);
  useLayoutEffect(() => {
    if (!fitted.current && durationMs > 0 && laneWidthOf(shellWidth) > 0) {
      fitted.current = true;
      zoomToFit();
    }
  }, [durationMs, shellWidth, zoomToFit]);

  return {
    shellRef,
    pixelsPerSecond,
    zoomIn: useCallback(
      () => setPixelsPerSecond((value) => clampZoom(value * 1.5)),
      [],
    ),
    zoomOut: useCallback(
      () => setPixelsPerSecond((value) => clampZoom(value / 1.5)),
      [],
    ),
    zoomToFit,
  };
};
