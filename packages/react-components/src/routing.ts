import { searchQueryParam } from '@asap-hub/routing';
import {
  useNavigate,
  useLocation,
  useNavigationType,
  NavigateFunction,
} from 'react-router';
import { useRef, useEffect } from 'react';

const GIVE_UP_AFTER_MS = 10000;
const FRAMES_STILL_BEFORE_SCROLL = 5;
const FRAMES_STILL_UNTIL_SETTLED = 10;
const SCROLL_ANYWAY_AFTER_MS = 1000;

const isMeasurable = (rect: DOMRect): boolean =>
  rect.width > 0 || rect.height > 0;

const isWithinViewport = (rect: DOMRect): boolean =>
  rect.bottom > 0 && rect.top < window.innerHeight;

type ScrollPhase = 'awaiting-settle' | 'animating-scroll' | 'holding-position';

export const useScrollToHash = (): void => {
  const { hash, pathname, state } = useLocation();
  const navigationType = useNavigationType();

  const scrollRequestedByState =
    (state as { scrollToHash?: boolean } | null)?.scrollToHash === true;

  useEffect(() => {
    if (!hash) {
      return undefined;
    }

    // Only scroll when the user actually arrives at this URL by
    // - opening a deep link (POP)
    // - following a link (PUSH)
    // The exception is when it is requested by the state (ManuscriptWorkspaceRedirect)
    if (navigationType === 'REPLACE' && !scrollRequestedByState) {
      return undefined;
    }

    const targetId = decodeURIComponent(hash.slice(1));
    const giveUpAt = performance.now() + GIVE_UP_AFTER_MS;
    let rafId = 0;
    let previousTop: number | undefined;
    let framesUnchanged = 0;
    let firstSeenAt: number | undefined;
    let phase: ScrollPhase = 'awaiting-settle';
    const stop = () => {
      window.cancelAnimationFrame(rafId);
    };
    const startSmoothScroll = (element: HTMLElement) => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      phase = 'animating-scroll';
      framesUnchanged = 0;
    };

    const scheduleNextFrame = () => {
      rafId = requestAnimationFrame(step);
    };

    const processFrame = (): boolean => {
      const element = document.getElementById(targetId);
      if (element) {
        const now = performance.now();
        firstSeenAt = firstSeenAt ?? now;
        const rect = element.getBoundingClientRect();
        framesUnchanged = rect.top === previousTop ? framesUnchanged + 1 : 0;
        previousTop = rect.top;

        const layoutHasQuieted = framesUnchanged >= FRAMES_STILL_BEFORE_SCROLL;
        const scrollAnimationFinished =
          framesUnchanged >= FRAMES_STILL_UNTIL_SETTLED;

        if (phase === 'animating-scroll') {
          if (scrollAnimationFinished) {
            phase = 'holding-position';
          }
        } else if (phase === 'awaiting-settle') {
          const waitedLongEnough = now - firstSeenAt > SCROLL_ANYWAY_AFTER_MS;

          if (layoutHasQuieted || waitedLongEnough) {
            startSmoothScroll(element);
          }
        } else if (isMeasurable(rect) && !isWithinViewport(rect)) {
          // holding-position: late-loading content pushed the target out of
          // view, so chase it back.
          startSmoothScroll(element);
        } else if (scrollAnimationFinished) {
          return false;
        }
      }
      return true;
    };

    const step = () => {
      const shouldContinue = processFrame();
      if (!shouldContinue) {
        stop();
        return;
      }

      if (performance.now() < giveUpAt) {
        scheduleNextFrame();
      } else {
        stop();
      }
    };

    scheduleNextFrame();

    return stop;
  }, [hash, pathname, navigationType, scrollRequestedByState]);
};

export const queryParamString = (searchQuery: string | undefined): string => {
  let searchQueryParamString = '';
  if (searchQuery) {
    searchQueryParamString = `?${new URLSearchParams({
      [searchQueryParam]: searchQuery,
    }).toString()}`;
  }
  return searchQueryParamString;
};

export const usePushFromPathname = (pathname: string): NavigateFunction => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  // Keep locationRef updated with current location
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Use useRef to create a stable function reference
  const fnRef = useRef<NavigateFunction>(
    (
      to:
        | string
        | number
        | { pathname?: string; search?: string; hash?: string },
      options?: { replace?: boolean; state?: unknown },
    ) => {
      // Check current location at call time via ref
      if (locationRef.current.pathname === pathname) {
        if (typeof to === 'number') {
          void navigate(to);
        } else if (typeof to === 'string') {
          void navigate(to, options);
        } else {
          const path = `${to.pathname || ''}${to.search || ''}${to.hash || ''}`;
          void navigate(path, options);
        }
      }
    },
  );

  return fnRef.current;
};
export const usePushFromHere = (): ReturnType<typeof usePushFromPathname> =>
  usePushFromPathname(useLocation().pathname);
