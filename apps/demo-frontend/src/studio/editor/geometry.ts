export const minPixelsPerSecond = 4;
export const maxPixelsPerSecond = 160;
export const defaultPixelsPerSecond = 24;

// room left after the last clip so it does not sit flush against the edge, and
// the same room the fit-to-window zoom leaves itself
export const lanePaddingPx = 48;

export const clampZoom = (pixelsPerSecond: number): number =>
  Math.min(maxPixelsPerSecond, Math.max(minPixelsPerSecond, pixelsPerSecond));

export const msToPx = (ms: number, pixelsPerSecond: number): number =>
  (ms / 1000) * pixelsPerSecond;

export const pxToMs = (px: number, pixelsPerSecond: number): number =>
  (px / pixelsPerSecond) * 1000;

const widestTickStep = 600;
const tickSteps = [1, 2, 5, 10, 15, 30, 60, 120, 300, widestTickStep];

// a ruler tick every 1, 2, 5, 10 … seconds, whichever first clears the label
export const tickIntervalMs = (pixelsPerSecond: number): number => {
  const targetPx = 80;
  const seconds =
    tickSteps.find((step) => step * pixelsPerSecond >= targetPx) ??
    widestTickStep;
  return seconds * 1000;
};

export const formatTimecode = (ms: number): string => {
  const safe = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((safe % 1000) / 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(
    hundredths,
  ).padStart(2, '0')}`;
};

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
