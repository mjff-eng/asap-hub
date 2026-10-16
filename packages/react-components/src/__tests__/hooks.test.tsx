import { act, render, renderHook, screen } from '@testing-library/react';

import {
  useGifReplay,
  useInView,
  useInterval,
  useIsMounted,
  usePrevious,
} from '../hooks';

describe('useGifReplay', () => {
  it('returns the same GIF URL apart from the fragment', () => {
    const {
      result: { current },
    } = renderHook(() => useGifReplay('/meme.gif', []));
    expect(new URL(current, window.location.href).pathname).toEqual(
      '/meme.gif',
    );
  });

  it('changes the fragment when the dependencies change', () => {
    const { result, rerender } = renderHook(
      ({ counter }) => useGifReplay('/meme.gif', [counter]),
      { initialProps: { counter: 1 } },
    );
    const oldFragment = new URL(result.current, window.location.href).hash;

    rerender({ counter: 2 });
    const newFragment = new URL(result.current, window.location.href).hash;

    expect(newFragment).not.toEqual(oldFragment);
  });

  it('does not change fragment when the dependencies remain unchanged', () => {
    const { result, rerender } = renderHook(
      ({ counter }) => useGifReplay('/meme.gif', [counter]),
      { initialProps: { counter: 1 } },
    );
    const oldFragment = new URL(result.current, window.location.href).hash;

    rerender({ counter: 1 });
    const newFragment = new URL(result.current, window.location.href).hash;

    expect(newFragment).toEqual(oldFragment);
  });
});

describe('usePrevious', () => {
  it('initially returns undefined', () => {
    const { result } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 1 },
    });
    expect(result.current).toEqual(undefined);
  });

  it('returns previous result', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 1 },
    });
    rerender({ value: 2 });
    expect(result.current).toEqual(1);
    rerender({ value: 3 });
    expect(result.current).toEqual(2);
  });
});

describe('useIsMounted', () => {
  it('initially returns true in a ref', () => {
    const { result } = renderHook(useIsMounted);
    expect(result.current.current).toBe(true);
  });

  it('return false in a ref once unmounted', () => {
    const { result, unmount } = renderHook(useIsMounted);
    unmount();
    expect(result.current.current).toBe(false);
  });
});

describe('useInterval', () => {
  // Helper to wait for a specified time using real timers
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });

  it('calls the callback after the specified delay', async () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, 50));

    // Initially not called
    expect(callback).not.toHaveBeenCalled();

    // Wait for the interval to fire
    await act(async () => {
      await wait(60);
    });

    expect(callback).toHaveBeenCalled();
  });

  it('does not call the callback when delay is null', async () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, null));

    await act(async () => {
      await wait(50);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('stops calling the callback after unmount', async () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() => useInterval(callback, 50));

    // Wait for at least one call
    await act(async () => {
      await wait(60);
    });

    const callCountBeforeUnmount = callback.mock.calls.length;
    expect(callCountBeforeUnmount).toBeGreaterThan(0);

    // Unmount and wait
    unmount();

    await act(async () => {
      await wait(100);
    });

    // Should not have been called again after unmount
    expect(callback.mock.calls.length).toBe(callCountBeforeUnmount);
  });

  it('uses the latest callback when it changes', async () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const { rerender } = renderHook(({ cb }) => useInterval(cb, 50), {
      initialProps: { cb: callback1 },
    });

    // Wait a bit then change callback before interval fires
    await act(async () => {
      await wait(20);
    });

    // Update the callback
    rerender({ cb: callback2 });

    // Wait for the interval to fire
    await act(async () => {
      await wait(60);
    });

    // The new callback should have been called, not the old one
    // (or at minimum, callback2 should have more recent calls)
    expect(callback2).toHaveBeenCalled();
  });

  it('resets the interval when delay changes', async () => {
    const callback = jest.fn();

    const { rerender } = renderHook(
      ({ delay }) => useInterval(callback, delay),
      {
        initialProps: { delay: 200 },
      },
    );

    // Wait less than 200ms
    await act(async () => {
      await wait(50);
    });

    // Change delay to 50ms - this should reset the interval
    rerender({ delay: 50 });

    // Clear previous calls to track new behavior
    callback.mockClear();

    // Wait for the new shorter interval
    await act(async () => {
      await wait(60);
    });

    // Callback should have been called with the new delay
    expect(callback).toHaveBeenCalled();
  });

  it('calls callback repeatedly like setInterval', async () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, 30));

    // Wait enough time for multiple calls
    await act(async () => {
      await wait(100);
    });

    // Should have been called multiple times
    expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

const TestComponent = () => {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="target">
      {inView ? 'in view' : 'hidden'}
    </div>
  );
};

// Calls the hook but never attaches the ref to an element.
const DetachedComponent = () => {
  const [, inView] = useInView<HTMLDivElement>();
  return <span data-testid="detached">{inView ? 'in view' : 'hidden'}</span>;
};

describe('useInView', () => {
  const originalIO = global.IntersectionObserver;
  let observerCallback: ObserverCallback;
  let disconnect: jest.Mock;

  beforeEach(() => {
    disconnect = jest.fn();
    observerCallback = () => {};
    global.IntersectionObserver = jest
      .fn()
      .mockImplementation((cb: ObserverCallback) => {
        observerCallback = cb;
        return { observe: jest.fn(), disconnect, unobserve: jest.fn() };
      }) as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    global.IntersectionObserver = originalIO;
  });

  it('starts hidden until the element intersects', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('target')).toHaveTextContent('hidden');
  });

  it('latches to in view on intersection and disconnects', () => {
    render(<TestComponent />);
    act(() => {
      observerCallback([{ isIntersecting: true }]);
    });
    expect(screen.getByTestId('target')).toHaveTextContent('in view');
    expect(disconnect).toHaveBeenCalled();
  });

  it('stays in view after scrolling away again', () => {
    render(<TestComponent />);
    act(() => {
      observerCallback([{ isIntersecting: true }]);
    });
    act(() => {
      observerCallback([{ isIntersecting: false }]);
    });
    expect(screen.getByTestId('target')).toHaveTextContent('in view');
  });

  it('defaults to in view when IntersectionObserver is unavailable', () => {
    global.IntersectionObserver =
      undefined as unknown as typeof IntersectionObserver;
    render(<TestComponent />);
    expect(screen.getByTestId('target')).toHaveTextContent('in view');
  });

  it('stays hidden when the ref is never attached to an element', () => {
    render(<DetachedComponent />);
    expect(screen.getByTestId('detached')).toHaveTextContent('hidden');
  });
});
