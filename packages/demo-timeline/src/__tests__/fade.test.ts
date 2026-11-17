import { defaultFadeMs, fadeOpacityAt, resolveFade } from '../fade';

const window = { startMs: 1000, durationMs: 4000 };

describe('resolveFade', () => {
  it('falls back to the default ramp on both sides', () => {
    expect(resolveFade({}, 4000)).toEqual({
      inMs: defaultFadeMs,
      outMs: defaultFadeMs,
    });
  });

  it('takes the ramps that were asked for', () => {
    expect(resolveFade({ fadeInMs: 1500, fadeOutMs: 100 }, 4000)).toEqual({
      inMs: 1500,
      outMs: 100,
    });
  });

  // scaling both keeps the shape the creator asked for; clamping one would let
  // a long fade in swallow the fade out entirely
  it('scales both ramps down together when they do not fit', () => {
    expect(resolveFade({ fadeInMs: 3000, fadeOutMs: 1000 }, 1000)).toEqual({
      inMs: 750,
      outMs: 250,
    });
  });

  it('allows an instant appearance', () => {
    expect(resolveFade({ fadeInMs: 0, fadeOutMs: 0 }, 4000)).toEqual({
      inMs: 0,
      outMs: 0,
    });
  });
});

describe('fadeOpacityAt', () => {
  it('shows nothing before it starts or after it ends', () => {
    expect(fadeOpacityAt({}, window, 999)).toBe(0);
    expect(fadeOpacityAt({}, window, 5001)).toBe(0);
  });

  it('ramps up over the fade in', () => {
    expect(fadeOpacityAt({ fadeInMs: 1000 }, window, 1500)).toBeCloseTo(0.5);
    expect(fadeOpacityAt({ fadeInMs: 1000 }, window, 2000)).toBe(1);
  });

  it('ramps back down over the fade out', () => {
    expect(fadeOpacityAt({ fadeOutMs: 1000 }, window, 4500)).toBeCloseTo(0.5);
  });

  it('is fully on the moment it starts when there is no fade in', () => {
    expect(fadeOpacityAt({ fadeInMs: 0 }, window, 1000)).toBe(1);
  });

  it('holds at full between the two ramps', () => {
    expect(fadeOpacityAt({ fadeInMs: 400, fadeOutMs: 400 }, window, 3000)).toBe(
      1,
    );
  });

  // a slower fade reaches the same point later, which is the whole control
  it('takes longer to arrive the slower the fade is', () => {
    const quick = fadeOpacityAt({ fadeInMs: 200 }, window, 1200);
    const slow = fadeOpacityAt({ fadeInMs: 2000 }, window, 1200);

    expect(slow).toBeLessThan(quick);
  });
});
