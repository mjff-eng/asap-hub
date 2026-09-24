import { Canvas } from './schema';

export const minCanvasHeight = 1080;
export const maxCanvasHeight = 2160;

export type SourceFormat = {
  width?: number;
  height?: number;
  fps?: number;
  // A take the studio recorded rather than a file the creator brought. The
  // recorder deliberately films above the canvas so a zoom crops real pixels
  // instead of magnifying a fit, and following that oversample would hand the
  // zoom back the very upscale the extra pixels were captured to avoid.
  recorded?: boolean;
};

const evenly = (value: number): number => Math.round(value / 2) * 2;

// 60 is kept only when the footage really is 60, because doubling the frame
// rate of 30fps sources doubles the render cost and adds nothing
const chooseFps = (sources: SourceFormat[]): Canvas['fps'] =>
  sources.length > 0 && sources.every((source) => (source.fps ?? 30) >= 60)
    ? 60
    : 30;

// never below 1080p, even from a small source, and never above the largest
// source brought to it, because upscaling past that only invents pixels. A
// recorded take is not one of those: its height is headroom for the zoom, not
// a format anybody asked to deliver, so a demo made only of takes stays 1080p.
const chooseHeight = (sources: SourceFormat[]): number => {
  const tallest = Math.max(
    minCanvasHeight,
    ...sources.map((source) => (source.recorded ? 0 : source.height ?? 0)),
  );
  return evenly(Math.min(tallest, maxCanvasHeight));
};

export const chooseCanvas = (sources: SourceFormat[]): Canvas => {
  const height = chooseHeight(sources);
  return {
    width: evenly((height * 16) / 9),
    height,
    fps: chooseFps(sources),
  };
};
