import { MemoryRouter, useNavigate, useLocation } from 'react-router';
import { renderHook, waitFor } from '@testing-library/react';
import { searchQueryParam } from '@asap-hub/routing';
import { ReactNode, useEffect, act } from 'react';

import {
  queryParamString,
  usePushFromHere,
  usePushFromPathname,
  useScrollToHash,
} from '../routing';

// Helper to capture location pathname in tests
let currentPathname: string | null = null;
let currentLocation: ReturnType<typeof useLocation> | null = null;
const LocationCapture = () => {
  const location = useLocation();
  useEffect(() => {
    currentPathname = location.pathname;
    currentLocation = location;
  }, [location]);
  return null;
};

// Helper to trigger navigation in tests
let navigateToPath: ReturnType<typeof useNavigate> | null = null;
const NavigationHelper = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigateToPath = navigate;
    return () => {
      navigateToPath = null;
    };
  }, [navigate]);
  return null;
};

describe('queryParamString', () => {
  it('appends the search query param', () => {
    expect(
      new URLSearchParams(queryParamString('searchterm')).get(searchQueryParam),
    ).toBe('searchterm');
  });

  it('returns an empty string if no query params needed', () => {
    expect(queryParamString(undefined)).toBe('');
  });
});

describe('usePushFromPathname', () => {
  it('pushes a history entry if currently on given page', async () => {
    currentPathname = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/current']}>
        <LocationCapture />
        {children}
      </MemoryRouter>
    );
    const {
      result: { current },
    } = renderHook(() => usePushFromPathname('/current'), {
      wrapper,
    });

    act(() => {
      void current('/new');
    });

    await waitFor(() => {
      expect(currentPathname).toBe('/new');
    });
  });

  it('does not push a history entry if currently on a different page', async () => {
    currentPathname = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/current']}>
        <LocationCapture />
        {children}
      </MemoryRouter>
    );
    const {
      result: { current },
    } = renderHook(() => usePushFromPathname('/wrong'), {
      wrapper,
    });

    act(() => {
      void current('/new');
    });

    // Should not navigate, so location should still be /current
    await waitFor(() => {
      expect(currentPathname).toBe('/current');
    });
  });

  it('navigates with a number (go back/forward)', async () => {
    currentPathname = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/page1', '/page2', '/current']}>
        <LocationCapture />
        {children}
      </MemoryRouter>
    );
    const {
      result: { current },
    } = renderHook(() => usePushFromPathname('/current'), {
      wrapper,
    });

    act(() => {
      void current(-1); // Go back
    });

    await waitFor(() => {
      expect(currentPathname).toBe('/page2');
    });
  });

  it('navigates with an object containing pathname, search, and hash', async () => {
    currentPathname = null;
    currentLocation = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/current']}>
        <LocationCapture />
        {children}
      </MemoryRouter>
    );
    const {
      result: { current },
    } = renderHook(() => usePushFromPathname('/current'), {
      wrapper,
    });

    act(() => {
      void current({
        pathname: '/new',
        search: '?query=test',
        hash: '#section',
      });
    });

    await waitFor(() => {
      expect(currentPathname).toBe('/new');
      expect(currentLocation?.search).toBe('?query=test');
      expect(currentLocation?.hash).toBe('#section');
    });
  });

  it('navigates with an object containing only pathname', async () => {
    currentPathname = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/current']}>
        <LocationCapture />
        {children}
      </MemoryRouter>
    );
    const {
      result: { current },
    } = renderHook(() => usePushFromPathname('/current'), {
      wrapper,
    });

    act(() => {
      void current({ pathname: '/new' });
    });

    await waitFor(() => {
      expect(currentPathname).toBe('/new');
    });
  });

  it('navigates with options parameter (replace)', async () => {
    currentPathname = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/current']}>
        <LocationCapture />
        {children}
      </MemoryRouter>
    );
    const {
      result: { current },
    } = renderHook(() => usePushFromPathname('/current'), {
      wrapper,
    });

    // Wait for initial location to be set
    await waitFor(() => {
      expect(currentPathname).toBe('/current');
    });

    act(() => {
      void current('/new', { replace: true });
    });

    await waitFor(() => {
      expect(currentPathname).toBe('/new');
    });
  });

  it('does not navigate with number if currently on a different page', async () => {
    currentPathname = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/current']}>
        <LocationCapture />
        {children}
      </MemoryRouter>
    );
    const {
      result: { current },
    } = renderHook(() => usePushFromPathname('/wrong'), {
      wrapper,
    });

    // Wait for initial location to be set
    await waitFor(() => {
      expect(currentPathname).toBe('/current');
    });

    act(() => {
      void current(-1);
    });

    // Should not navigate because we're on /current, not /wrong
    // So location should still be /current
    await waitFor(() => {
      expect(currentPathname).toBe('/current');
    });
  });

  it('does not navigate with object if currently on a different page', async () => {
    currentPathname = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/current']}>
        <LocationCapture />
        {children}
      </MemoryRouter>
    );
    const {
      result: { current },
    } = renderHook(() => usePushFromPathname('/wrong'), {
      wrapper,
    });

    act(() => {
      void current({ pathname: '/new', search: '?query=test' });
    });

    // Should not navigate, so location should still be /current
    await waitFor(() => {
      expect(currentPathname).toBe('/current');
    });
  });
});

describe('usePushFromHere', () => {
  it('pushes a history entry if still on the same page', async () => {
    currentPathname = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/current']}>
        <LocationCapture />
        {children}
      </MemoryRouter>
    );
    const {
      result: { current },
    } = renderHook(() => usePushFromHere(), {
      wrapper,
    });

    act(() => {
      void current('/new');
    });

    await waitFor(() => {
      expect(currentPathname).toBe('/new');
    });
  });

  it('does not push a history entry if no longer on the same page', async () => {
    currentPathname = null;
    navigateToPath = null;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/current']}>
        <LocationCapture />
        <NavigationHelper />
        {children}
      </MemoryRouter>
    );
    const { result } = renderHook(() => usePushFromHere(), {
      wrapper,
    });

    // Save the function returned when we were at /current
    const pushFromCurrent = result.current;

    act(() => {
      void navigateToPath?.('/elsewhere');
    });

    await waitFor(() => {
      expect(currentPathname).toBe('/elsewhere');
    });

    // Note that `pushFromCurrent` is still the hook result from before the push;
    // it's a function "bound" to `/current`, so calling it when we're at `/elsewhere`
    // should not navigate.
    act(() => {
      void pushFromCurrent('/new');
    });

    // Location should still be /elsewhere because the function was "bound" to /current
    await waitFor(() => {
      expect(currentPathname).toBe('/elsewhere');
    });
  });
});

describe('useScrollToHash', () => {
  const createTargetElement = ({
    id = 'section',
    append = true,
    scrollIntoView = jest.fn(),
    getBoundingClientRect,
  }: {
    id?: string;
    append?: boolean;
    scrollIntoView?: HTMLElement['scrollIntoView'];
    getBoundingClientRect?: HTMLElement['getBoundingClientRect'];
  } = {}) => {
    const element = document.createElement('div');
    element.id = id;
    element.scrollIntoView = scrollIntoView;
    if (getBoundingClientRect) {
      element.getBoundingClientRect = getBoundingClientRect;
    }
    if (append) {
      document.body.appendChild(element);
    }
    return element;
  };

  const renderScrollToHash = (route: string) => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    );
    return renderHook(() => useScrollToHash(), { wrapper });
  };

  it('scrolls to element when hash is present in URL', async () => {
    const targetElement = createTargetElement();

    renderScrollToHash('/page#section');

    await waitFor(() => {
      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    document.body.removeChild(targetElement);
  });

  it('scrolls once the target eventually renders', async () => {
    renderScrollToHash('/page#late-section');

    // simulate the target only appearing after data has loaded
    const targetElement = createTargetElement({
      id: 'late-section',
      append: false,
    });
    expect(targetElement.scrollIntoView).not.toHaveBeenCalled();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });
    document.body.appendChild(targetElement);

    await waitFor(() => {
      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    document.body.removeChild(targetElement);
  });

  it('re-scrolls when late-loading content pushes the target out of view', async () => {
    let top = 900;
    let reads = 0;
    const targetElement = createTargetElement({
      scrollIntoView: jest.fn(() => {
        top = 0;
      }),
      getBoundingClientRect: jest.fn(() => {
        reads += 1;
        // Simulate late-loading content above the target pushing it
        // below the viewport (jsdom window.innerHeight is 768)
        if (reads === 10) {
          top = 800;
        }
        return { top, bottom: top + 50, width: 100, height: 50 } as DOMRect;
      }),
    });

    renderScrollToHash('/page#section');

    await waitFor(
      () => {
        expect(targetElement.scrollIntoView).toHaveBeenCalledTimes(2);
      },
      { timeout: 3000 },
    );

    document.body.removeChild(targetElement);
  });

  it('does not scroll when no hash is present', async () => {
    // Create element just to verify scrollIntoView is NOT called
    const targetElement = createTargetElement();

    renderScrollToHash('/page');

    // Wait a bit and verify it was NOT called
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 150);
    });

    expect(targetElement.scrollIntoView).not.toHaveBeenCalled();

    document.body.removeChild(targetElement);
  });

  it('does not scroll when the hash changes via a replace navigation', async () => {
    navigateToPath = null;
    const targetElement = createTargetElement();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/page']}>
        <NavigationHelper />
        {children}
      </MemoryRouter>
    );

    renderHook(() => useScrollToHash(), { wrapper });

    await waitFor(() => {
      expect(navigateToPath).not.toBeNull();
    });

    act(() => {
      void navigateToPath?.('/page#section', { replace: true });
    });

    // Give the hook time to (not) scroll
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 150);
    });

    expect(targetElement.scrollIntoView).not.toHaveBeenCalled();

    document.body.removeChild(targetElement);
  });

  it('scrolls on a replace navigation that requests it via state', async () => {
    navigateToPath = null;
    const targetElement = createTargetElement();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/page']}>
        <NavigationHelper />
        {children}
      </MemoryRouter>
    );

    renderHook(() => useScrollToHash(), { wrapper });

    await waitFor(() => {
      expect(navigateToPath).not.toBeNull();
    });

    act(() => {
      void navigateToPath?.('/page#section', {
        replace: true,
        state: { scrollToHash: true },
      });
    });

    await waitFor(() => {
      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    document.body.removeChild(targetElement);
  });

  it('scrolls when navigating to a hash via a push', async () => {
    navigateToPath = null;
    const targetElement = createTargetElement();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/page']}>
        <NavigationHelper />
        {children}
      </MemoryRouter>
    );

    renderHook(() => useScrollToHash(), { wrapper });

    await waitFor(() => {
      expect(navigateToPath).not.toBeNull();
    });

    act(() => {
      void navigateToPath?.('/page#section');
    });

    await waitFor(() => {
      expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    document.body.removeChild(targetElement);
  });

  it('does not throw if element does not exist', async () => {
    // This should not throw even if element doesn't exist
    const { result } = renderScrollToHash('/page#nonexistent');

    // Wait for the timeout to complete
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 150);
    });

    // Verify hook completed without throwing (result should be undefined as hook returns void)
    expect(result.current).toBeUndefined();
  });

  describe('animation frame lifecycle', () => {
    let rafCallbacks: FrameRequestCallback[];
    let rafId: number;
    let now: number;

    const flushFrames = (count: number) => {
      act(() => {
        for (let i = 0; i < count; i += 1) {
          const callbacks = [...rafCallbacks];
          rafCallbacks = [];
          const frameTime = now;
          callbacks.forEach((cb) => {
            cb(frameTime);
          });
        }
      });
    };

    const settleLayout = () => flushFrames(6);
    const finishSmoothScroll = () => flushFrames(10);
    const settleHoldingPosition = () => flushFrames(1);

    beforeEach(() => {
      rafCallbacks = [];
      rafId = 0;
      now = 0;

      jest.spyOn(performance, 'now').mockImplementation(() => now);
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafId += 1;
        rafCallbacks.push(cb);
        return rafId;
      });
      jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
        rafCallbacks = [];
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('stops polling once the scroll animation has settled in view', () => {
      const top = 0;
      const targetElement = createTargetElement({
        getBoundingClientRect: jest.fn(
          () =>
            ({
              top,
              bottom: top + 50,
              width: 100,
              height: 50,
            }) as DOMRect,
        ),
      });

      const cancelAnimationFrameSpy = jest.spyOn(
        window,
        'cancelAnimationFrame',
      );

      renderScrollToHash('/page#section');

      // once the layout has been still long enough, it scrolls exactly once
      settleLayout();
      expect(targetElement.scrollIntoView).toHaveBeenCalledTimes(1);

      // the scroll animation finishes and one more settled frame stops polling
      finishSmoothScroll();
      settleHoldingPosition();

      expect(cancelAnimationFrameSpy).toHaveBeenCalled();
      expect(rafCallbacks).toHaveLength(0);
      expect(targetElement.scrollIntoView).toHaveBeenCalledTimes(1);

      document.body.removeChild(targetElement);
    });

    it('stops polling after the give-up timeout', () => {
      const cancelAnimationFrameSpy = jest.spyOn(
        window,
        'cancelAnimationFrame',
      );

      renderScrollToHash('/page#missing');

      flushFrames(1);

      now = 10001;
      flushFrames(1);

      expect(cancelAnimationFrameSpy).toHaveBeenCalled();
      expect(rafCallbacks).toHaveLength(0);
    });
  });
});
