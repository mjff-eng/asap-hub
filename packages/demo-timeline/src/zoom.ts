import { Point, Zoom } from './schema';

export const zoomDurationMs = (zoom: Zoom): number =>
  zoom.rampInMs + zoom.holdMs + zoom.rampOutMs;

// a zoom that never leaves 1x, or that has no time to ramp, would only cost a
// rescale of every frame
const changesTheFrame = (zoom: Zoom): boolean =>
  zoom.scale > 1 && zoomDurationMs(zoom) > 0;

export const clipZooms = (zooms: Zoom[], clipId: string): Zoom[] =>
  zooms.filter((zoom) => zoom.clipId === clipId && changesTheFrame(zoom));

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

const ease = (zoom: Zoom, t: number): number =>
  zoom.easing === 'linear' ? t : easeInOut(t);

// how far into the zoom we are, from 0 at rest to 1 fully in
export const zoomProgressAt = (zoom: Zoom, localMs: number): number => {
  const since = localMs - zoom.startMs;
  if (since < 0 || since > zoomDurationMs(zoom)) {
    return 0;
  }
  if (since < zoom.rampInMs) {
    return zoom.rampInMs === 0 ? 1 : ease(zoom, since / zoom.rampInMs);
  }
  if (since < zoom.rampInMs + zoom.holdMs) {
    return 1;
  }
  const out = since - zoom.rampInMs - zoom.holdMs;
  return zoom.rampOutMs === 0 ? 0 : 1 - ease(zoom, out / zoom.rampOutMs);
};

// What the picture is doing at one moment, as a scale about a point: the point
// of the source frame that stays where it is while everything else moves away
// from it. The preview writes it as a CSS transform and the render crops the
// same window out of the frame, so it is the one description of a zoom both
// sides work from.
export type ZoomView = { scale: number; focus: Point };

export const restingZoom: ZoomView = { scale: 1, focus: { x: 0.5, y: 0.5 } };

const axisFocus = (
  zooms: Zoom[],
  gains: number[],
  scale: number,
  axis: 'x' | 'y',
): number => {
  // the left or top edge of the window that stays visible, as a share of the
  // frame, exactly as the render's zoompan is told to crop it. Two overlapping
  // zooms aimed off centre can push the sum past the frame edge; zoompan clips
  // its crop into range, so the window is held inside the frame here too or
  // the preview shows stage background where the picture shows the edge.
  const summed = zooms.reduce((total, zoom, index) => {
    const gain = gains[index] ?? 0;
    return total + zoom.focus[axis] * (1 - 1 / (1 + gain));
  }, 0);
  const crop = Math.min(Math.max(summed, 0), 1 - 1 / scale);
  // a source point u shows at (u - crop) * scale, and the fixed point of that
  // is where a single zoom's own focus sits
  return (crop * scale) / (scale - 1);
};

// The picture at a clip-local moment. Overlapping zooms add their gains and
// their windows, which is what the render's filtergraph does frame by frame, so
// the preview and the export frame the same thing however they overlap.
export const zoomViewAt = (
  zooms: Zoom[],
  clipId: string,
  localMs: number,
): ZoomView => {
  const clip = clipZooms(zooms, clipId);
  const gains = clip.map(
    (zoom) => (zoom.scale - 1) * zoomProgressAt(zoom, localMs),
  );
  const scale = gains.reduce((total, gain) => total + gain, 1);
  if (scale <= 1) {
    return restingZoom;
  }
  return {
    scale,
    focus: {
      x: axisFocus(clip, gains, scale, 'x'),
      y: axisFocus(clip, gains, scale, 'y'),
    },
  };
};

// Where a point of the source frame ends up once the zoom has moved the picture
// under it. Both sides draw the pointer and the click rings through this, so an
// effect rides the zoomed picture instead of sitting at the address it had
// before the zoom started.
export const zoomedPoint = (point: Point, view: ZoomView): Point => ({
  x: view.focus.x + (point.x - view.focus.x) * view.scale,
  y: view.focus.y + (point.y - view.focus.y) * view.scale,
});

// the way back, for a creator dropping a marker on the zoomed picture
export const unzoomedPoint = (point: Point, view: ZoomView): Point =>
  view.scale <= 0
    ? point
    : {
        x: view.focus.x + (point.x - view.focus.x) / view.scale,
        y: view.focus.y + (point.y - view.focus.y) / view.scale,
      };
