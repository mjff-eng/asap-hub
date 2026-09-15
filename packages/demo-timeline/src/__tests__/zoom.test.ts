import { Zoom } from '../schema';
import {
  clipZooms,
  restingZoom,
  unzoomedPoint,
  zoomDurationMs,
  zoomedPoint,
  zoomProgressAt,
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

const viewAt = (localMs: number, zooms: Zoom[] = [zoom()]) =>
  zoomViewAt(zooms, 'clip-1', localMs);

describe('zoomDurationMs', () => {
  it('is the ramps plus the hold', () => {
    expect(zoomDurationMs(zoom())).toBe(1800);
  });
});

describe('clipZooms', () => {
  it('keeps the zooms that belong to the clip', () => {
    expect(
      clipZooms(
        [zoom(), zoom({ id: 'zoom-2', clipId: 'clip-2' })],
        'clip-1',
      ).map(({ id }) => id),
    ).toEqual(['zoom-1']);
  });

  it.each([
    ['never leaves 1x', zoom({ scale: 1 })],
    ['has no time to ramp', zoom({ rampInMs: 0, holdMs: 0, rampOutMs: 0 })],
  ])('drops a zoom that %s', (_unused, dropped) => {
    expect(clipZooms([dropped], 'clip-1')).toEqual([]);
  });
});

describe('zoomProgressAt', () => {
  it('is nothing outside the zoom, and everything through the hold', () => {
    expect(zoomProgressAt(zoom(), 0)).toBe(0);
    expect(zoomProgressAt(zoom(), 3000)).toBe(0);
    expect(zoomProgressAt(zoom(), 2000)).toBe(1);
  });

  it('eases rather than stepping when asked to', () => {
    expect(zoomProgressAt(zoom({ easing: 'easeInOut' }), 1100)).toBeLessThan(
      zoomProgressAt(zoom(), 1100),
    );
  });
});

describe('the picture a zoom makes', () => {
  it('is at rest before it starts and after it ends', () => {
    expect(viewAt(0)).toEqual(restingZoom);
    expect(viewAt(3000)).toEqual(restingZoom);
  });

  it('is halfway through the ramp in, about its own focus', () => {
    const view = viewAt(1200);
    expect(view.scale).toBeCloseTo(1.5);
    expect(view.focus.x).toBeCloseTo(0.25);
    expect(view.focus.y).toBeCloseTo(0.75);
  });

  it('is fully in during the hold', () => {
    expect(viewAt(2000)).toEqual({ scale: 2, focus: { x: 0.25, y: 0.75 } });
  });

  it('ignores a zoom belonging to another clip', () => {
    expect(zoomViewAt([zoom()], 'clip-2', 2000)).toEqual(restingZoom);
  });

  // the render's zoompan adds the gains of two overlapping zooms and adds their
  // crop windows; the preview used to take only the strongest and frame something
  // else entirely
  it('adds two overlapping zooms the way the filtergraph adds them', () => {
    const view = viewAt(2000, [
      zoom(),
      zoom({ id: 'zoom-2', scale: 3, focus: { x: 0.9, y: 0.1 } }),
    ]);
    expect(view.scale).toBe(4);
    // the crop the render is given, read back as a fixed point
    const crop = 0.25 * (1 - 1 / 2) + 0.9 * (1 - 1 / 3);
    expect(view.focus.x).toBeCloseTo((crop * 4) / 3);
  });
});

describe('where an effect is drawn once the picture has moved', () => {
  it('leaves everything alone at rest', () => {
    expect(zoomedPoint({ x: 0.4, y: 0.6 }, restingZoom)).toEqual({
      x: 0.4,
      y: 0.6,
    });
  });

  it('holds the focus itself still, however far in the zoom is', () => {
    [1000, 1200, 2000, 2400, 2800].forEach((tMs) => {
      const view = viewAt(tMs);
      expect(zoomedPoint({ x: 0.25, y: 0.75 }, view).x).toBeCloseTo(0.25);
      expect(zoomedPoint({ x: 0.25, y: 0.75 }, view).y).toBeCloseTo(0.75);
    });
  });

  it('pushes a point away from the focus part way through the ramp', () => {
    // half of the way to 2x, so half again as far from the focus
    const drawn = zoomedPoint({ x: 0.45, y: 0.75 }, viewAt(1200));
    expect(drawn.x).toBeCloseTo(0.25 + 0.2 * 1.5);
  });

  it('doubles the distance from the focus at full zoom', () => {
    expect(zoomedPoint({ x: 0.45, y: 0.75 }, viewAt(2000)).x).toBeCloseTo(0.65);
  });

  // the pointer and the ring it is clicking read the same transform, so they
  // cannot drift apart part way through a ramp
  it('moves a click ring and the pointer over it by the same amount', () => {
    const at = { x: 0.6, y: 0.4 };
    [1000, 1150, 1399, 1400, 2000, 2600, 2799].forEach((tMs) => {
      const view = viewAt(tMs);
      expect(zoomedPoint(at, view)).toEqual(zoomedPoint({ ...at }, view));
    });
  });

  it('carries a point right off the frame when the zoom pushes it there', () => {
    expect(zoomedPoint({ x: 0.95, y: 0.5 }, viewAt(2000)).x).toBeGreaterThan(1);
  });

  it('reads a drop on the zoomed picture back to where it belongs', () => {
    [restingZoom, viewAt(1200), viewAt(2000)].forEach((view) => {
      const source = { x: 0.62, y: 0.31 };
      const back = unzoomedPoint(zoomedPoint(source, view), view);
      expect(back.x).toBeCloseTo(source.x);
      expect(back.y).toBeCloseTo(source.y);
    });
  });
});

// two zooms aimed at the same off centre point used to push the window past
// the frame edge: the picture clamps in ffmpeg, so the preview clamps too or
// it shows stage background where the export shows the frame edge
describe('overlapping zooms held inside the frame', () => {
  const pair = (scale: number, focus: number): Zoom[] => [
    zoom({ id: 'z1', scale, focus: { x: focus, y: focus } }),
    zoom({ id: 'z2', scale, focus: { x: focus, y: focus } }),
  ];
  // both zooms fully held at this moment
  const heldMs = 1800;

  it('clamps the summed window to the frame edge', () => {
    const view = zoomViewAt(pair(2, 1), 'clip-1', heldMs);

    expect(view.scale).toBe(3);
    // focus 1 keeps the window flush with the right edge: [2/3, 1]
    expect(view.focus.x).toBeCloseTo(1, 10);
    const window = view.focus.x * (1 - 1 / view.scale);
    expect(window + 1 / view.scale).toBeLessThanOrEqual(1.0000001);
  });

  it('clamps a milder off centre pair the same way', () => {
    const view = zoomViewAt(pair(1.5, 0.8), 'clip-1', heldMs);

    expect(view.scale).toBe(2);
    const crop = view.focus.x * (1 - 1 / view.scale);
    expect(crop).toBeCloseTo(0.5, 10);
  });
});
