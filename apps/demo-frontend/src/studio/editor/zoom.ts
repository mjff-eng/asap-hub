import { Point } from '@asap-hub/demo-timeline';

// The picture a zoom makes, and where an effect drawn on it lands, both come
// from the timeline package: the export reads the very same functions, and the
// two used to drift apart every time one of them was touched.
export {
  restingZoom,
  unzoomedPoint,
  zoomDurationMs,
  zoomedPoint,
  zoomProgressAt,
  zoomViewAt,
} from '@asap-hub/demo-timeline';
export type { ZoomView } from '@asap-hub/demo-timeline';

const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export const clampPoint = (point: Point): Point => ({
  x: clamp01(point.x),
  y: clamp01(point.y),
});

// Dragging the picture is the natural way to aim a zoom, so the focus follows
// the grab: a point of the frame under the pointer stays under it. Scaling
// about the focus puts a source point u at f + s(u - f) on screen, and holding
// that fixed while the pointer moves by d gives f' = f - d / (s - 1).
export const panFocus = (
  focus: Point,
  delta: { dx: number; dy: number },
  box: { width: number; height: number },
  scale: number,
): Point =>
  scale <= 1 || box.width <= 0 || box.height <= 0
    ? focus
    : {
        x: clamp01(focus.x - delta.dx / box.width / (scale - 1)),
        y: clamp01(focus.y - delta.dy / box.height / (scale - 1)),
      };

export const pointInBox = (
  clientX: number,
  clientY: number,
  bounds: { left: number; top: number; width: number; height: number },
): Point =>
  bounds.width <= 0 || bounds.height <= 0
    ? { x: 0.5, y: 0.5 }
    : {
        x: clamp01((clientX - bounds.left) / bounds.width),
        y: clamp01((clientY - bounds.top) / bounds.height),
      };
