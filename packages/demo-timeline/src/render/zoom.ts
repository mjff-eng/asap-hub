import { Canvas, Zoom } from '../schema';
import { PictureBox, secondsFromMs } from './filters';

const gain = (value: number): string => value.toFixed(3);

const unit = (value: number): string => value.toFixed(4);

// the preview's easeInOut, with (-2u+2)^2/2 written as 2(1-u)^2
const easeExpression = (zoom: Zoom, ramp: string): string =>
  zoom.easing === 'linear'
    ? ramp
    : `if(lt(${ramp},0.5),2*${ramp}*${ramp},1-2*(1-${ramp})*(1-${ramp}))`;

const rampExpression = (
  zoom: Zoom,
  time: string,
  fromMs: number,
  spanMs: number,
): string =>
  easeExpression(
    zoom,
    `((${time}-${secondsFromMs(fromMs)})/${secondsFromMs(spanMs)})`,
  );

// 0 at rest and 1 fully in, exactly as the preview's progressAt: nothing outside
// the zoom's own window, eased over each ramp, held in between
const progressExpression = (zoom: Zoom, time: string): string => {
  const holdStartMs = zoom.startMs + zoom.rampInMs;
  const holdEndMs = holdStartMs + zoom.holdMs;
  const endMs = holdEndMs + zoom.rampOutMs;
  const rampIn =
    zoom.rampInMs === 0
      ? '1'
      : rampExpression(zoom, time, zoom.startMs, zoom.rampInMs);
  const rampOut =
    zoom.rampOutMs === 0
      ? '0'
      : `1-${rampExpression(zoom, time, holdEndMs, zoom.rampOutMs)}`;

  return `if(between(${time},${secondsFromMs(zoom.startMs)},${secondsFromMs(
    endMs,
  )}),if(lt(${time},${secondsFromMs(
    holdStartMs,
  )}),${rampIn},if(lt(${time},${secondsFromMs(holdEndMs)}),1,${rampOut})),0)`;
};

const gainExpression = (zoom: Zoom, time: string): string =>
  `${gain(zoom.scale - 1)}*${progressExpression(zoom, time)}`;

const scaleExpression = (gains: string[]): string => `1+${gains.join('+')}`;

// the window the picture is cropped to, which the overlays read as well
export type ZoomExpressions = { scale: string; cropX: string; cropY: string };

// The crop window's own edge as a share of the frame. Held inside the frame the
// same way the preview's zoomViewAt holds it, or two overlapping zooms aimed off
// centre push the window past the edge and the rings detach from the picture.
const cropExpression = (
  gains: string[],
  focus: number[],
  scale: string,
): string =>
  `clip(${gains
    .map((each, position) => `${unit(focus[position] ?? 0)}*(1-1/(1+${each}))`)
    .join('+')},0,1-1/(${scale}))`;

// The same window the picture is cropped to, written against `t`, so the crop
// and every overlay riding it are read off one clock.
export const zoomExpressions = (
  clip: Zoom[],
  time = 't',
): ZoomExpressions | undefined => {
  if (clip.length === 0) {
    return undefined;
  }
  const gains = clip.map((zoom) => gainExpression(zoom, time));
  const scale = scaleExpression(gains);
  return {
    scale,
    cropX: cropExpression(
      gains,
      clip.map((zoom) => zoom.focus.x),
      scale,
    ),
    cropY: cropExpression(
      gains,
      clip.map((zoom) => zoom.focus.y),
      scale,
    ),
  };
};

// Where a point of the source frame is drawn once the zoom has moved the
// picture under it, in output pixels: the preview's zoomedPoint, as an ffmpeg
// expression, so the two place an effect at the same address on every frame.
export const onZoomedFrame = (
  sourcePx: string,
  size: number,
  crop: string,
  scale: string,
): string => `((${sourcePx})-(${crop})*${size})*(${scale})`;

// the intermediate the zoom magnifies to, kept even because the chain runs in
// yuv420p; the crop is placed against this rather than crop's own in_w, which
// goes stale as soon as the scale in front of it starts resizing per frame
const magnified = (size: number, scale: string): string =>
  `2*floor(${size}*(${scale})/2)`;

type Axis = 'in_w' | 'in_h';

// the picture at the magnification the whole canvas would have had, kept even
// the way the fit's own force_divisible_by=2 keeps it
const magnifiedPicture = (
  size: number,
  canvasSize: number,
  frame: string,
): string => `2*round(${size}*(${frame})/${canvasSize}/2)`;

// pad has no t and no n, so the bar is written against in_w, the one variable
// it is given that carries the scale the filter before it just applied
const barOffset = (offset: number, size: number, axis: Axis): string =>
  `2*floor(${offset}*${axis}/${size}/2)`;

// the +2 of slack guarantees the padded frame is never a pixel short of the
// magnified canvas, which would let the crop below clamp itself off the window;
// the slack is black and the window never reaches it
const paddedSize = (canvasSize: number, size: number, axis: Axis): string =>
  `2*floor(${canvasSize}*${axis}/${size}/2)+2`;

// pad leaves in_w as the padded width, slack and all, so the window is held
// inside the magnified canvas by name and floored here rather than by crop
const windowAt = (crop: string, frame: string, canvasSize: number): string =>
  `min(2*floor((${crop})*(${frame})/2),(${frame})-${canvasSize})`;

// The zoom is a window of the picture magnified back up to the canvas. zoompan
// did that by cropping whole input pixels out of the canvas sized frame and
// rescaling them with its own hardwired bicubic, which on a 2560x1440 capture
// zoomed 2x measured 38.6dB against cropping that source directly. A per-frame
// lanczos scale to `scale` times the canvas, cropped back to the canvas, gives
// 62.4dB and moves the window a whole output pixel at a time rather than a whole
// source pixel.
// A source whose aspect is not the canvas's is letterboxed, and its `picture`
// says where the fit draws it. The zoom then magnifies the picture alone and
// pads the bars back around it, so the pixels come off the source at its own
// resolution instead of out of a frame already resampled down to the canvas:
// on a 3024x1964 capture that measured 10.23 CPU seconds against 20.85 for a
// held 2x, and 2.78x fewer pixels thrown away.
export const zoomFilters = (
  clip: Zoom[],
  canvas: Canvas,
  picture?: PictureBox,
): string[] => {
  const written = zoomExpressions(clip);
  if (!written) {
    return [];
  }
  const width = magnified(canvas.width, written.scale);
  const height = magnified(canvas.height, written.scale);

  if (!picture) {
    return [
      `fps=${canvas.fps}`,
      `scale=w='${width}':h='${height}':eval=frame:flags=lanczos:out_color_matrix=bt709`,
      `crop=${canvas.width}:${canvas.height}:x='(${written.cropX})*(${width})':y='(${written.cropY})*(${height})'`,
    ];
  }

  return [
    `fps=${canvas.fps}`,
    `scale=w='${magnifiedPicture(
      picture.pw,
      canvas.width,
      width,
    )}':h='${magnifiedPicture(
      picture.ph,
      canvas.height,
      height,
    )}':eval=frame:flags=lanczos:out_color_matrix=bt709`,
    `pad=w='${paddedSize(canvas.width, picture.pw, 'in_w')}':h='${paddedSize(
      canvas.height,
      picture.ph,
      'in_h',
    )}':x='${barOffset(picture.ox, picture.pw, 'in_w')}':y='${barOffset(
      picture.oy,
      picture.ph,
      'in_h',
    )}':color=black:eval=frame`,
    `crop=${canvas.width}:${canvas.height}:x='${windowAt(
      written.cropX,
      width,
      canvas.width,
    )}':y='${windowAt(written.cropY, height, canvas.height)}'`,
  ];
};
