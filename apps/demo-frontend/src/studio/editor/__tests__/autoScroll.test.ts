import { act, renderHook } from '@testing-library/react';
import {
  edgeScrollVelocity,
  edgeZonePx,
  maxEdgeScrollPxPerSecond,
  scrollLeftAfter,
  useEdgeAutoScroll,
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

describe('useEdgeAutoScroll', () => {
  const scheduled = new Map<number, FrameRequestCallback>();

  beforeEach(() => {
    let nextId = 0;
    scheduled.clear();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((run) => {
      nextId += 1;
      scheduled.set(nextId, run);
      return nextId;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      scheduled.delete(id);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const runFrame = (now: number): boolean => {
    const pending = Array.from(scheduled.entries()).pop();
    if (!pending) return false;
    scheduled.delete(pending[0]);
    act(() => pending[1](now));
    return true;
  };

  // jsdom has no layout, so the scroll box is described to it by hand
  const scroller = () => {
    const element = document.createElement('div');
    jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      ...bounds,
      top: 0,
      bottom: 100,
      width: bounds.right - bounds.left,
      height: 100,
      x: bounds.left,
      y: 0,
      toJSON: () => ({}),
    });
    Object.defineProperty(element, 'clientWidth', { value: 1000 });
    Object.defineProperty(element, 'scrollWidth', { value: 3000 });
    return element;
  };

  it('parks itself once the pointer has left the edge zone', () => {
    const element = scroller();
    const onScrolled = jest.fn();
    const { result } = renderHook(() =>
      useEdgeAutoScroll({ current: element }, onScrolled),
    );

    result.current.track(bounds.right - 5);
    result.current.start();
    result.current.track(600);

    expect(runFrame(0)).toBe(true);
    expect(runFrame(100)).toBe(false);
    expect(element.scrollLeft).toBe(0);
    expect(onScrolled).not.toHaveBeenCalled();
  });

  it('wakes again when the pointer goes back to the edge', () => {
    const element = scroller();
    const onScrolled = jest.fn();
    const { result } = renderHook(() =>
      useEdgeAutoScroll({ current: element }, onScrolled),
    );
    result.current.track(bounds.right - 5);
    result.current.start();
    result.current.track(600);
    runFrame(0);

    result.current.track(bounds.right - 5);
    runFrame(1000);
    runFrame(1100);

    expect(element.scrollLeft).toBeGreaterThan(0);
    expect(onScrolled).toHaveBeenCalled();
  });
});
