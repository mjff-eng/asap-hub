import {
  edgeScrollVelocity,
  edgeZonePx,
  maxEdgeScrollPxPerSecond,
  scrollLeftAfter,
} from '../autoScroll';

const bounds = { left: 100, right: 1100 };

describe('edgeScrollVelocity', () => {
  it('stays still while the pointer is away from both ends', () => {
    expect(edgeScrollVelocity(600, bounds)).toBe(0);
  });

  it('runs backwards inside the left zone', () => {
    expect(edgeScrollVelocity(bounds.left + 10, bounds)).toBeLessThan(0);
  });

  it('runs forwards inside the right zone', () => {
    expect(edgeScrollVelocity(bounds.right - 10, bounds)).toBeGreaterThan(0);
  });

  // a drag that has only just reached the edge should creep, not bolt
  it('speeds up the deeper into the zone the pointer goes', () => {
    const shallow = edgeScrollVelocity(bounds.right - edgeZonePx + 5, bounds);
    const deep = edgeScrollVelocity(bounds.right - 5, bounds);

    expect(deep).toBeGreaterThan(shallow);
  });

  it('is held at full speed once the pointer has left the lane', () => {
    expect(edgeScrollVelocity(bounds.right + 5000, bounds)).toBe(
      maxEdgeScrollPxPerSecond,
    );
    expect(edgeScrollVelocity(bounds.left - 5000, bounds)).toBe(
      -maxEdgeScrollPxPerSecond,
    );
  });

  // two zones meeting in the middle would scroll under a pointer sitting still
  it('does nothing at all on a lane narrower than its own zones', () => {
    expect(edgeScrollVelocity(50, { left: 40, right: 100 })).toBe(0);
  });
});

describe('scrollLeftAfter', () => {
  it('moves by the step it is given', () => {
    expect(scrollLeftAfter(100, 40, 2000)).toBe(140);
  });

  it('never goes back past the start', () => {
    expect(scrollLeftAfter(20, -500, 2000)).toBe(0);
  });

  it('never goes on past the end', () => {
    expect(scrollLeftAfter(1900, 500, 2000)).toBe(2000);
  });

  it('stays put on a lane with nothing to scroll', () => {
    expect(scrollLeftAfter(0, 500, -20)).toBe(0);
  });
});
