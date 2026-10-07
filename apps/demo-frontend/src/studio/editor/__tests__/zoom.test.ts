import { Zoom } from '@asap-hub/demo-timeline';
import {
  clampPoint,
  panFocus,
  pointInBox,
  restingZoom,
  zoomDurationMs,
  zoomViewAt,
} from '../zoom';

const zoom = (overrides: Partial<Zoom> = {}): Zoom => ({
  id: 'zoom-1',
  clipId: 'clip-1',
  startMs: 1000,
  rampInMs: 400,
  holdMs: 1000,
  rampOutMs: 400,
  focus: { x: 0.25, y: 0.75 },
  scale: 2,
  easing: 'linear',
  ...overrides,
});

describe('zoomDurationMs', () => {
  it('is the ramps plus the hold', () => {
    expect(zoomDurationMs(zoom())).toBe(1800);
  });
});

// the picture itself is described in the timeline package now, so the preview
// and the export cannot frame two different things; this is the stage reading it
describe('the picture the stage shows', () => {
  it('is at rest before the zoom starts and after it ends', () => {
    expect(zoomViewAt([zoom()], 'clip-1', 0)).toEqual(restingZoom);
    expect(zoomViewAt([zoom()], 'clip-1', 3000)).toEqual(restingZoom);
  });

  it('is halfway in the middle of the ramp', () => {
    expect(zoomViewAt([zoom()], 'clip-1', 1200).scale).toBeCloseTo(1.5);
  });

  it('is fully in during the hold, about the focus point', () => {
    expect(zoomViewAt([zoom()], 'clip-1', 2000)).toEqual({
      scale: 2,
      focus: { x: 0.25, y: 0.75 },
    });
  });

  it('ignores a zoom belonging to another clip', () => {
    expect(zoomViewAt([zoom()], 'clip-2', 2000)).toEqual(restingZoom);
  });

  it('eases rather than stepping when asked to', () => {
    expect(
      zoomViewAt([zoom({ easing: 'easeInOut' })], 'clip-1', 1100).scale,
    ).toBeLessThan(zoomViewAt([zoom()], 'clip-1', 1100).scale);
  });
});

describe('clampPoint', () => {
  it('keeps a point the document can hold', () => {
    expect(clampPoint({ x: 1.4, y: -0.2 })).toEqual({ x: 1, y: 0 });
  });
});

describe('panFocus', () => {
  const box = { width: 800, height: 450 };
  const centre = { x: 0.5, y: 0.5 };

  it('leaves the focus alone when there is nothing to pan', () => {
    expect(panFocus(centre, { dx: 100, dy: 0 }, box, 1)).toEqual(centre);
  });

  // grabbing the picture and pulling it right shows what was off to the left
  it('moves the focus against the drag', () => {
    expect(panFocus(centre, { dx: 80, dy: 0 }, box, 2)).toEqual({
      x: 0.4,
      y: 0.5,
    });
  });

  it('pans further at a gentler zoom, because less is hidden', () => {
    const gentle = panFocus(centre, { dx: 80, dy: 0 }, box, 1.5).x;
    const strong = panFocus(centre, { dx: 80, dy: 0 }, box, 3).x;

    expect(gentle).toBeLessThan(strong);
  });

  it('keeps the window inside the frame', () => {
    expect(panFocus(centre, { dx: -4000, dy: 4000 }, box, 2)).toEqual({
      x: 1,
      y: 0,
    });
  });

  it('survives a stage that has not been measured yet', () => {
    expect(
      panFocus(centre, { dx: 40, dy: 40 }, { width: 0, height: 0 }, 2),
    ).toEqual(centre);
  });
});

describe('pointInBox', () => {
  const bounds = { left: 100, top: 50, width: 800, height: 400 };

  it('reads a click as a share of the frame', () => {
    expect(pointInBox(500, 150, bounds)).toEqual({ x: 0.5, y: 0.25 });
  });

  it('clamps a drag that left the frame', () => {
    expect(pointInBox(-100, 5000, bounds)).toEqual({ x: 0, y: 1 });
  });
});
