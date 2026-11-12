import { CaptureSurface, Point } from '../schema';
import { CaptureGeometry } from './types';

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

// four decimals is about a fifth of a pixel on a 4K frame, and keeps a long
// path from dominating the timeline document
export const quantise = (value: number): number =>
  Math.round(clampUnit(value) * 10000) / 10000;

export type Frame = { width: number; height: number };

type Rect = { x: number; y: number; width: number; height: number };

// what one captured event was pointing at: the rectangle the recording shows,
// and the pointer, both in the same CSS pixels
export type SharedView = { rect: Rect; at: Point };

// what a mapping needs off an event: the pointer in the page and on the screen,
// and the boxes those two are measured against
export type CapturePlacement = CaptureGeometry & {
  x: number;
  y: number;
  viewportW: number;
  viewportH: number;
  devicePixelRatio?: number;
  platform?: string;
};

export type SourceSize = { width: number; height: number };

const positive = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const finite = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

// A tab share shows the page and nothing else, so the page's own coordinates
// are already the whole picture.
const tabView = (event: CapturePlacement): SharedView | undefined =>
  positive(event.viewportW) && positive(event.viewportH)
    ? {
        rect: { x: 0, y: 0, width: event.viewportW, height: event.viewportH },
        at: { x: event.x, y: event.y },
      }
    : undefined;

// Where the recorded display starts on the virtual desktop that screenX counts
// from. The browser will not say: availLeft and availTop are the corner of the
// display's WORK AREA, which a macOS menu bar, a Linux top bar or a Windows
// taskbar insets by tens of pixels, and the recording holds the whole display
// rather than the work area.
//
// A bar's inset is tens of pixels; a second display's corner is hundreds or
// thousands. Reading the big one as an inset put every pointer in the band
// between a wide external display's origin and its own width back on the
// primary, a 1512px error on a MacBook driving a 1920 wide screen. So a large
// offset is the display's origin outright, and only a small one falls back to
// the rule that a pointer already on the primary display starts at 0.
const workAreaInsetPx = 100;

const displayOrigin = (at: number, size: number, workArea: number): number => {
  if (Math.abs(workArea) >= workAreaInsetPx) {
    return workArea;
  }
  return at >= 0 && at < size ? 0 : workArea;
};

// Wayland never tells the browser where its window sits: the window reports
// the desktop corner and every screen coordinate is fabricated from the page
// as if that were true, while the footage shows the window sitting under the
// compositor's bar and inside its gaps. The space left over between window and
// screen is the only trace of the real arrangement the events carry, so when
// an axis has little enough left over to be gaps and bars it is dealt back:
// the same gap on either side, and whatever remains above, where bars live. A
// window sharing its screen with another leaves far more over than any gap,
// and an axis like that is left alone rather than guessed at.
const fabricatedLeeway = 0.1;

// The shape Wayland fabricates, a window at the desktop corner on a screen whose
// own origin is 0, is exactly the shape a maximised Windows or X11 window with a
// 40px taskbar reports, and no geometry tells the two apart: dealing the spare
// back there pushed every event down by the taskbar's height. So the platform
// decides. Absent, it is read as Linux, because every stream captured before the
// snippet reported the platform came from the creator's own Linux box.
const fabricatesPlacement = (platform: string | undefined): boolean =>
  platform === undefined ||
  platform.includes('Linux') ||
  platform.includes('X11');

const fabricatedShift = (event: CapturePlacement): Point => {
  if (
    !fabricatesPlacement(event.platform) ||
    event.winX !== 0 ||
    event.winY !== 0 ||
    finite(event.screenLeft) !== 0 ||
    finite(event.screenTop) !== 0 ||
    !positive(event.winW) ||
    !positive(event.winH) ||
    !positive(event.screenW) ||
    !positive(event.screenH)
  ) {
    return { x: 0, y: 0 };
  }
  const spareW = event.screenW - event.winW;
  const spareH = event.screenH - event.winH;
  const dx =
    spareW > 0 && spareW <= event.screenW * fabricatedLeeway ? spareW / 2 : 0;
  const dy =
    spareH > 0 && spareH <= event.screenH * fabricatedLeeway
      ? Math.max(0, spareH - dx)
      : 0;
  return { x: dx, y: dy };
};

// A whole screen share shows one display, so the pointer is placed on that
// display. Both the display and the pointer are recorded per event, so a window
// dragged to another monitor mid take keeps mapping correctly from the moment
// it moved.
const monitorView = (event: CapturePlacement): SharedView | undefined => {
  if (!positive(event.screenW) || !positive(event.screenH)) {
    return undefined;
  }
  const shift = fabricatedShift(event);
  const at = {
    x: finite(event.screenX) + shift.x,
    y: finite(event.screenY) + shift.y,
  };
  return {
    rect: {
      x: displayOrigin(at.x, event.screenW, finite(event.screenLeft)),
      y: displayOrigin(at.y, event.screenH, finite(event.screenTop)),
      width: event.screenW,
      height: event.screenH,
    },
    at,
  };
};

// A window share shows the browser window, chrome and all, and the window's own
// corner on the desktop is what the pointer is measured from. Recorded per
// event, so moving or resizing the window mid take is followed.
const windowView = (event: CapturePlacement): SharedView | undefined =>
  positive(event.winW) && positive(event.winH)
    ? {
        rect: {
          x: finite(event.winX),
          y: finite(event.winY),
          width: event.winW,
          height: event.winH,
        },
        at: { x: finite(event.screenX), y: finite(event.screenY) },
      }
    : undefined;

const views: Record<
  CaptureSurface,
  (event: CapturePlacement) => SharedView | undefined
> = {
  browser: tabView,
  monitor: monitorView,
  window: windowView,
};

// The rectangle the recording shows and where the pointer sat inside it. A
// stream captured before the snippet reported the screen carries none of the
// numbers the other two mappings need, so it falls back to the page, which is
// the mapping it was recorded under.
export const sharedView = (
  event: CapturePlacement,
  surface: CaptureSurface = 'browser',
): SharedView | undefined => views[surface](event) ?? tabView(event);

// The share of the recorded rectangle the pointer stands at. This is where the
// scale independence lives: both numbers are CSS pixels of one coordinate
// space, so a Retina Mac reporting a 1512 wide screen and a 1920 wide Linux
// screen give the same ratio for the same place, whatever the video's own
// resolution, the device pixel ratio or the browser's zoom.
export const viewRatio = ({ rect, at }: SharedView): Point => ({
  x: clampUnit((at.x - rect.x) / rect.width),
  y: clampUnit((at.y - rect.y) / rect.height),
});

// The renderer fits the recording inside the frame rather than stretching it,
// so a ratio has to be fitted the same way or every effect drifts towards the
// letterbox. The recording is a picture of the shared rectangle, so that
// rectangle's shape is the one being fitted.
export const fitToFrame = (
  ratio: Point,
  source: Frame,
  frame: Frame,
): Point | undefined => {
  if (
    source.width <= 0 ||
    source.height <= 0 ||
    frame.width <= 0 ||
    frame.height <= 0
  ) {
    return undefined;
  }

  const scale = Math.min(
    frame.width / source.width,
    frame.height / source.height,
  );
  const drawnWidth = (source.width * scale) / frame.width;
  const drawnHeight = (source.height * scale) / frame.height;

  return {
    x: quantise((1 - drawnWidth) / 2 + clampUnit(ratio.x) * drawnWidth),
    y: quantise((1 - drawnHeight) / 2 + clampUnit(ratio.y) * drawnHeight),
  };
};

const shapeTolerancePx = 8;

// A decoration is a title bar's worth of rows: the creator's own takes measured
// 41 and 48 of them. Capping it both outright and as a share of the window
// leaves footage that is dramatically shorter than the window alone, as
// something this reading cannot explain, rather than cutting it by a wild
// amount.
const decorationMaxPx = 120;
const decorationMaxShare = 0.15;

// The footage's own pixel size is the ground truth about what was shared: on
// Wayland the portal picks the surface itself, and it can hand back the
// browser window, minus its decoration rows, while the browser believes the
// whole screen was asked for and says so. The browser also scales a capture
// down to the size the studio asks for, so both readings are taken in
// proportion: the footage either has the claimed box's shape, or the window's
// width over a short enough height to be the window cut at the top.
const reconciledView = (
  event: CapturePlacement,
  surface: CaptureSurface,
  source: SourceSize,
): SharedView | undefined => {
  const view = sharedView(event, surface);
  if (!view) {
    return undefined;
  }
  if (!positive(source.width) || !positive(source.height)) {
    return view;
  }
  const claimedScale = source.width / view.rect.width;
  const claimed =
    Math.abs(source.height / claimedScale - view.rect.height) <=
    shapeTolerancePx;
  if (claimed || !positive(event.winW) || !positive(event.winH)) {
    return view;
  }
  const dpr =
    event.devicePixelRatio && event.devicePixelRatio > 0
      ? event.devicePixelRatio
      : 1;
  // footage handed back at native size is read at the ratio the browser
  // reported, so the few pixels of border the portal shaves off the width stay
  // border instead of being spread down the height as scale
  const scale =
    Math.abs(source.width - event.winW * dpr) <= shapeTolerancePx * dpr
      ? dpr
      : source.width / event.winW;
  const cutTop = event.winH - source.height / scale;
  const decorationMax = Math.min(
    decorationMaxPx,
    event.winH * decorationMaxShare,
  );
  if (cutTop <= 0 || cutTop > decorationMax) {
    return view;
  }
  return {
    rect: {
      x: finite(event.winX),
      y: finite(event.winY) + cutTop,
      width: source.width / scale,
      height: source.height / scale,
    },
    at: { x: finite(event.screenX), y: finite(event.screenY) },
  };
};

// Where a captured event lands on the rendered frame: read the pointer against
// whatever the creator actually shared, as a ratio, then fit that ratio into
// the frame the way the renderer fits the picture.
export const toFramePoint = (
  event: CapturePlacement,
  frame: Frame,
  surface: CaptureSurface = 'browser',
  source?: SourceSize,
): Point | undefined => {
  const view = source
    ? reconciledView(event, surface, source)
    : sharedView(event, surface);
  return view ? fitToFrame(viewRatio(view), view.rect, frame) : undefined;
};
