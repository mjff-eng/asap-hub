import { cursorEdge, defaultCursorColor } from '../../cursorColors';
import { CursorEffect } from '../../schema';
import {
  cursorArt,
  rippleBox,
  rippleDurationMs,
  rippleSvg,
  spotlightDurationMs,
  spotlightSvg,
} from '../cursorArt';

const canvas = { width: 1920, height: 1080 };

const effect = (overrides: Partial<CursorEffect> = {}): CursorEffect => ({
  id: 'effect-1',
  tMs: 1000,
  type: 'ripple',
  point: { x: 0.25, y: 0.75 },
  origin: 'manual',
  ...overrides,
});

describe('rippleSvg', () => {
  it('draws a ring on the click point', () => {
    expect(
      rippleSvg({ point: { x: 0.25, y: 0.75 }, canvas }),
    ).toMatchSnapshot();
  });

  it('keeps the ring the same fraction of the frame at any canvas size', () => {
    expect(
      rippleSvg({
        point: { x: 0.5, y: 0.5 },
        canvas: { width: 3840, height: 2160 },
      }),
    ).toContain('r="381"');
  });
});

describe('rippleBox', () => {
  // the box holds the animation's largest ring, still a fraction of the frame
  // the full canvas composite used to cost on every visible frame
  it('is the grown ring and its edge, aimed at the click point', () => {
    expect(rippleBox({ point: { x: 0.25, y: 0.75 }, canvas })).toEqual({
      x: 273,
      y: 603,
      width: 414,
      height: 414,
    });
  });

  it('lets the box run off the frame rather than pulling the ring in', () => {
    expect(rippleBox({ point: { x: 0, y: 0 }, canvas })).toMatchObject({
      x: -207,
      y: -207,
    });
  });
});

describe('spotlightSvg', () => {
  it('darkens the frame around the point', () => {
    expect(
      spotlightSvg({ point: { x: 0.25, y: 0.75 }, canvas }),
    ).toMatchSnapshot();
  });

  // the browser measures a radial-gradient's stops against the farthest corner,
  // so the svg gradient has to be given that same radius
  it('reaches the farthest corner from the point', () => {
    expect(spotlightSvg({ point: { x: 0, y: 0 }, canvas })).toContain(
      `r="${Math.round(Math.hypot(1920, 1080))}"`,
    );
  });
});

describe('cursorArt', () => {
  it('carries the ripple box the overlay composites at', () => {
    expect(cursorArt(effect(), canvas)).toMatchObject({
      x: 273,
      y: 603,
      width: 414,
      height: 414,
    });
  });

  // the scrim darkens everything outside the click, so it is the whole frame
  it('carries the whole frame for a spotlight', () => {
    expect(cursorArt(effect({ type: 'spotlight' }), canvas)).toMatchObject({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    });
  });

  it('decays a ripple over its whole window', () => {
    expect(cursorArt(effect(), canvas)).toEqual(
      expect.objectContaining({
        durationMs: rippleDurationMs,
        fadeInMs: 0,
        fadeOutMs: rippleDurationMs,
      }),
    );
  });

  it('ramps a spotlight in and out', () => {
    expect(cursorArt(effect({ type: 'spotlight' }), canvas)).toEqual(
      expect.objectContaining({
        durationMs: spotlightDurationMs,
        fadeInMs: 200,
      }),
    );
  });

  it('draws nothing for the zoom marker the editor materialises', () => {
    expect(cursorArt(effect({ type: 'zoom' }), canvas)).toBeUndefined();
  });
});

describe('the colour of a click', () => {
  const frame = { width: 1920, height: 1080, fps: 30 } as const;
  const point = { x: 0.5, y: 0.5 };

  it('draws the ring in the colour the creator picked', () => {
    expect(rippleSvg({ point, canvas: frame, color: '#ff3b30' })).toContain(
      'stroke="#ff3b30"',
    );
  });

  it('falls back to the default for an effect saved before the picker', () => {
    expect(rippleSvg({ point, canvas: frame })).toContain(
      `stroke="${defaultCursorColor}"`,
    );
  });

  it('ignores something that is not a colour', () => {
    expect(rippleSvg({ point, canvas: frame, color: 'url(#evil)' })).toContain(
      `stroke="${defaultCursorColor}"`,
    );
  });

  // a white ring on a white page is invisible without it
  it('always carries a dark edge, whatever the colour', () => {
    expect(rippleSvg({ point, canvas: frame, color: '#ffffff' })).toContain(
      `stroke="${cursorEdge}"`,
    );
  });
});
