import { Point } from '../schema';

// The creator's own trim on top of everything the mapping worked out: a whole
// capture shifted by so many frame pixels, for the residue no heuristic can
// know. Stored in canvas pixels because that is what the creator is looking
// at, applied as a fraction so preview and export shift identically.
export type CursorAlignment = { alignXPx?: number; alignYPx?: number };

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

export const alignedPoint = (
  point: Point,
  layer: CursorAlignment,
  canvas: { width: number; height: number },
): Point => {
  const dx = (layer.alignXPx ?? 0) / canvas.width;
  const dy = (layer.alignYPx ?? 0) / canvas.height;
  if (dx === 0 && dy === 0) {
    return point;
  }
  return { x: clampUnit(point.x + dx), y: clampUnit(point.y + dy) };
};

export const alignedPath = <T extends Point>(
  points: T[],
  layer: CursorAlignment,
  canvas: { width: number; height: number },
): T[] =>
  (layer.alignXPx ?? 0) === 0 && (layer.alignYPx ?? 0) === 0
    ? points
    : points.map((point) => ({
        ...point,
        ...alignedPoint(point, layer, canvas),
      }));
