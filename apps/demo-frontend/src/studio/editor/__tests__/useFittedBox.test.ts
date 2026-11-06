import { act, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { fitBox, useFittedBox } from '../useFittedBox';

const wide = 16 / 9;

describe('fitBox', () => {
  it('fills the width when the space is taller than the frame', () => {
    expect(fitBox({ width: 1600, height: 1200 }, wide)).toEqual({
      width: 1600,
      height: 900,
    });
  });

  it('fills the height when the space is wider than the frame', () => {
    expect(fitBox({ width: 1600, height: 400 }, wide)).toEqual({
      width: 711,
      height: 400,
    });
  });

  it('matches exactly when the space already has the ratio', () => {
    expect(fitBox({ width: 1920, height: 1080 }, wide)).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('is empty before the container has been measured', () => {
    expect(fitBox({ width: 0, height: 0 }, wide)).toEqual({
      width: 0,
      height: 0,
    });
  });

  it('honours a taller frame than 16:9', () => {
    expect(fitBox({ width: 1000, height: 1000 }, 1)).toEqual({
      width: 1000,
      height: 1000,
    });
  });
});

describe('useFittedBox', () => {
  type Resized = (entries: Array<{ contentRect: DOMRectReadOnly }>) => void;
  const observers: Array<{
    resized: Resized;
    observed: Element[];
    disconnect: jest.Mock;
  }> = [];

  // jsdom has no layout, so the observer is stood in for and fed sizes by hand
  class TestResizeObserver {
    private readonly entry: (typeof observers)[number];

    constructor(resized: Resized) {
      this.entry = { resized, observed: [], disconnect: jest.fn() };
      observers.push(this.entry);
    }

    observe(element: Element) {
      this.entry.observed.push(element);
    }

    disconnect() {
      this.entry.disconnect();
    }
  }

  const Frame = ({ ratio }: { ratio: number }) => {
    const { ref, box } = useFittedBox(ratio);
    return createElement(
      'div',
      { ref, 'data-testid': 'space' },
      `${box.width}x${box.height}`,
    );
  };

  const resize = (width: number, height: number) =>
    act(
      () =>
        observers[0]?.resized([
          { contentRect: { width, height } as DOMRectReadOnly },
        ]),
    );

  const original = window.ResizeObserver;

  beforeEach(() => {
    observers.length = 0;
    window.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    window.ResizeObserver = original;
  });

  it('watches the element the frame has to fit inside', () => {
    render(createElement(Frame, { ratio: wide }));

    expect(observers[0]?.observed).toEqual([screen.getByTestId('space')]);
  });

  it('sizes the frame to the space it was measured in', () => {
    render(createElement(Frame, { ratio: wide }));
    expect(screen.getByText('0x0')).toBeInTheDocument();

    resize(1600, 400);
    expect(screen.getByText('711x400')).toBeInTheDocument();

    resize(1600, 1200);
    expect(screen.getByText('1600x900')).toBeInTheDocument();
  });

  it('collapses when the observer reports no size', () => {
    render(createElement(Frame, { ratio: wide }));
    resize(1600, 400);

    act(() => observers[0]?.resized([]));

    expect(screen.getByText('0x0')).toBeInTheDocument();
  });

  it('stops watching once the frame is gone', () => {
    const { unmount } = render(createElement(Frame, { ratio: wide }));

    unmount();

    expect(observers[0]?.disconnect).toHaveBeenCalledTimes(1);
  });
});
