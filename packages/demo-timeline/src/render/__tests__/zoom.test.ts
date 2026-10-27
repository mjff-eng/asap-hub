import { Canvas, Zoom } from '../../schema';
import { clipZooms, zoomDurationMs, zoomViewAt } from '../../zoom';
import { onZoomedFrame, zoomExpressions, zoomFilters } from '../zoom';

const canvas: Canvas = { width: 1920, height: 1080, fps: 30 };

const zoom = (overrides: Partial<Zoom> = {}): Zoom => ({
  id: 'zoom-1',
  clipId: 'clip-1',
  startMs: 1000,
  rampInMs: 400,
  holdMs: 1500,
  rampOutMs: 400,
  focus: { x: 0.5, y: 0.5 },
  scale: 2,
  easing: 'easeInOut',
  ...overrides,
});

const graphOf = (zooms: Zoom[]): string => zoomFilters(zooms, canvas).join(',');

describe('zoomDurationMs', () => {
  it('is the two ramps and the hold between them', () => {
    expect(zoomDurationMs(zoom())).toBe(2300);
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
  ])('drops a zoom that %s', (_, unused) => {
    expect(clipZooms([unused], 'clip-1')).toEqual([]);
  });
});

describe('zoomFilters', () => {
  it('leaves a clip with no zoom untouched', () => {
    expect(zoomFilters([], canvas)).toEqual([]);
  });

  // Measured on ffmpeg 9.0.1 with a 2560x1440 capture on a 1920x1080 canvas
  // held at 2x, against cropping that source directly with the same colour
  // conversion: fitting to the canvas and magnifying with zoompan gave PSNR
  // y 38.55 / average 36.64dB, and this pair gives y 55.25 / average 56.22dB.
  it('scales the picture per frame and crops the canvas back out of it', () => {
    const written = zoomExpressions([zoom()]);
    const filters = zoomFilters([zoom()], canvas);

    expect(filters[0]).toBe('fps=30');
    expect(filters[1]).toBe(
      `scale=w='2*floor(1920*(${written?.scale})/2)':h='2*floor(1080*(${written?.scale})/2)':eval=frame:flags=lanczos:out_color_matrix=bt709`,
    );
    expect(filters[2]).toBe(
      `crop=1920:1080:x='(${written?.cropX})*(2*floor(1920*(${written?.scale})/2))':y='(${written?.cropY})*(2*floor(1080*(${written?.scale})/2))'`,
    );
  });

  // crop reads its own in_w once and keeps it, so a scale that resizes every
  // frame in front of it leaves the window parked where the first frame put it
  it('places the crop against the size it asked for, never crop own in_w', () => {
    expect(graphOf([zoom()])).not.toContain('in_w');
  });

  it('holds the full scale between the ramps', () => {
    expect(graphOf([zoom()])).toContain('if(lt(t,2.900),1,');
  });

  it('ramps linearly when the zoom asks for it', () => {
    const graph = graphOf([zoom({ easing: 'linear' })]);

    expect(graph).toContain(
      '1+1.000*if(between(t,1.000,3.300),if(lt(t,1.400),((t-1.000)/0.400)',
    );
    expect(graph).not.toContain('0.5)');
  });

  it('snaps straight to the full scale when there is no ramp in', () => {
    expect(graphOf([zoom({ rampInMs: 0 })])).toContain(
      'if(lt(t,1.000),1,if(lt(t,2.500),1,',
    );
  });

  it('stays in when there is no ramp out', () => {
    expect(graphOf([zoom({ rampOutMs: 0 })])).toContain('if(lt(t,2.900),1,0)');
  });

  it('takes the crop from the focus the preview scales around', () => {
    expect(graphOf([zoom({ focus: { x: 0.2, y: 0.9 } })])).toContain(
      "crop=1920:1080:x='(clip(0.2000*(1-1/(1+1.000*",
    );
  });
});

describe('zoomExpressions', () => {
  it('has nothing to say about a clip with no zoom', () => {
    expect(zoomExpressions([])).toBeUndefined();
  });

  // zoompan counts its own frames, which an overlay cannot see, so the same
  // window is written against the overlay's clock
  it('reads the window on the same clock the crop and the overlays read', () => {
    const written = zoomExpressions([zoom()]);
    expect(written?.scale).toContain('between(t,1.000,3.300)');
    expect(written?.scale).not.toContain('on/30');
    expect(zoomFilters([zoom()], canvas).join(',')).toContain(
      written?.scale ?? '',
    );
  });

  it('writes the crop as a share of the frame, not in input pixels', () => {
    expect(
      zoomExpressions([zoom({ focus: { x: 0.2, y: 0.9 } })])?.cropX,
    ).toMatch(/^clip\(0\.2000\*\(1-1\/\(1\+/);
  });

  it('adds the windows of two overlapping zooms, as the picture does', () => {
    const written = zoomExpressions([
      zoom(),
      zoom({ id: 'zoom-2', focus: { x: 0.2, y: 0.8 } }),
    ]);
    expect(written?.cropX.split('+0.2000*')).toHaveLength(2);
    expect(written?.scale.startsWith('1+')).toBe(true);
  });
});

describe('onZoomedFrame', () => {
  it('crops then magnifies, the way zoompan does', () => {
    expect(onZoomedFrame('960', 1920, '0.5000*(1-1/2)', '2')).toBe(
      '((960)-(0.5000*(1-1/2))*1920)*(2)',
    );
  });
});

/* the preview and the export framing one window */

const clipped = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

// ffmpeg's own expression language, as much of it as the zoom uses
const ffmpeg = (expression: string, tMs: number): number =>
  Function(
    't',
    'clip',
    'iff',
    'between',
    'lt',
    `return ${expression.replace(/\bif\(/g, 'iff(')};`,
  )(
    tMs / 1000,
    clipped,
    (condition: number, whenTrue: number, whenFalse: number) =>
      condition !== 0 ? whenTrue : whenFalse,
    (value: number, low: number, high: number) =>
      value >= low && value <= high ? 1 : 0,
    (left: number, right: number) => (left < right ? 1 : 0),
  ) as number;

describe('the window the render crops', () => {
  // two overlapping zooms aimed off centre, which is the case that pushes the
  // summed window past the frame edge and needs the clamp
  const overlapping = [
    zoom({ focus: { x: 0.85, y: 0.15 }, scale: 2.5 }),
    zoom({
      id: 'zoom-2',
      startMs: 1800,
      rampInMs: 300,
      holdMs: 900,
      rampOutMs: 600,
      focus: { x: 0.9, y: 0.05 },
      scale: 1.8,
    }),
  ];

  it.each([[[zoom()]], [overlapping]])(
    'frames what the preview frames, sample for sample',
    (zooms) => {
      const written = zoomExpressions(zooms);
      const worst = Array.from({ length: 400 }, (_unused, index) => {
        const tMs = Math.round((index * 5000) / 400);
        const view = zoomViewAt(zooms, 'clip-1', tMs);
        // the preview's focus is the fixed point of the window; its own left
        // edge, as a share of the frame, is what the crop is written against
        const edge = view.focus.x * (1 - 1 / view.scale);
        const top = view.focus.y * (1 - 1 / view.scale);
        return Math.max(
          Math.abs(ffmpeg(written?.scale ?? '1', tMs) - view.scale),
          Math.abs(ffmpeg(written?.cropX ?? '0', tMs) - edge),
          Math.abs(ffmpeg(written?.cropY ?? '0', tMs) - top),
        );
      }).reduce((furthest, gap) => Math.max(furthest, gap), 0);

      // the focus is written to four decimals and the gain to three
      expect(worst).toBeLessThan(0.001);
    },
  );

  // Measured on ffmpeg 9.0.1: a linear creep to 1.03x over 3s aimed at 0.7/0.3
  // on a 2560x1440 still. zoompan repeated 13 of 88 frames because it moved its
  // window a whole input pixel at a time; this pair repeats 4, because the
  // window moves a whole pixel of the magnified frame instead. The pair costs
  // 2.48s of wall against zoompan's 0.63s for 90 frames zoomed to 2x.
  it('moves the window in pixels of the magnified frame, not of the source', () => {
    const filters = zoomFilters([zoom()], canvas);
    expect(filters[2]).toContain('*(2*floor(1920*(');
    expect(filters[1]).toContain('eval=frame');
  });
});
