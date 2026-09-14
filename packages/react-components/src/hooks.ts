import {
  useState,
  useEffect,
  useCallback,
  DependencyList,
  useRef,
  RefObject,
  MutableRefObject,
} from 'react';

export const useGifReplay = (
  url: string,
  dependencies: DependencyList,
): string => {
  const [rand, setRand] = useState(Math.random());
  useEffect(() => {
    setRand(Math.random());
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
  return `${url}#${rand}`;
};

export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  // This hook must run on every render to keep the ref updated.
  // eslint-disable-next-line no-restricted-syntax
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export const useIsMounted = (): MutableRefObject<boolean> => {
  const isMounted = useRef(true);
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );
  return isMounted;
};

/**
 * Detects whether a text element is visually truncated
 * and provides expand/collapse state. Re-checks on window resize.
 *
 * @param text - The text content being measured (triggers re-check when it changes)
 */
export const useTextTruncation = (
  text: string,
): {
  ref: RefObject<HTMLDivElement>;
  isExpanded: boolean;
  needsExpansion: boolean;
  toggle: () => void;
} => {
  const ref = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);

  const toggle = useCallback(() => setIsExpanded((v) => !v), []);

  useEffect(() => {
    if (isExpanded) {
      return undefined;
    }

    const check = () => {
      if (!ref.current) return;
      setNeedsExpansion(ref.current.scrollHeight > ref.current.clientHeight);
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [text, isExpanded]);

  return { ref, isExpanded, needsExpansion, toggle };
};

/**
 * A declarative interval hook that always calls the latest callback.
 * Uses useRef to avoid stale closure issues with React 18's automatic batching.
 * Uses recursive setTimeout instead of setInterval for better Jest fake timer compatibility.
 *
 * @param callback - Function to call on each interval tick
 * @param delay - Interval delay in milliseconds, or null to pause the interval
 *
 * @see https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 */
export const useInterval = (
  callback: () => void,
  delay: number | null,
): void => {
  const savedCallback = useRef(callback);

  // Remember the latest callback - updates on every render
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval using recursive setTimeout
  // This pattern works better with Jest fake timers than setInterval
  useEffect(() => {
    if (delay === null) return undefined;

    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      savedCallback.current();
      timeoutId = setTimeout(tick, delay);
    };

    timeoutId = setTimeout(tick, delay);

    return () => clearTimeout(timeoutId);
  }, [delay]);
};

/**
 * Calls `onDismiss` when the user dismisses an open UI element — either by
 * pressing ESC or clicking outside every provided ref. Listeners are only
 * attached while `enabled` is true.
 */
export const useDismiss = (
  refs: ReadonlyArray<RefObject<HTMLElement>>,
  onDismiss: () => void,
  enabled: boolean,
): void => {
  useEffect(() => {
    if (!enabled) return undefined;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onDismiss, refs]);
};

const visibleRowsPerSection = 5;

/**
 * Collapses a section to its first rows and reports what a "Show more" control
 * needs. Expansion is derived, so a section that shrinks back under the
 * threshold loses the control rather than keeping a "Show less" that hides
 * nothing.
 */
export const useSectionExpansion = <T>(rows: readonly T[]) => {
  const [expanded, setExpanded] = useState(false);
  const canExpand = rows.length > visibleRowsPerSection;
  const showingAll = expanded && canExpand;
  const visibleRows = showingAll ? rows : rows.slice(0, visibleRowsPerSection);

  return {
    canExpand,
    showingAll,
    visibleRows,
    hiddenCount: rows.length - visibleRows.length,
    toggle: () => setExpanded(!showingAll),
  };
};
