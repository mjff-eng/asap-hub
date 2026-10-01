import { useEffect, useState } from 'react';

// below this the folder tree stops being a column beside the grid and becomes a
// disclosure, so the first demo is not half a screen of chrome away
export const narrowQuery = '(max-width: 700px)';

const matchesNow = (query: string): boolean => {
  try {
    return window.matchMedia?.(query).matches ?? false;
  } catch {
    return false;
  }
};

export const useIsNarrow = (query: string = narrowQuery): boolean => {
  const [matches, setMatches] = useState(() => matchesNow(query));

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list?.addEventListener) return undefined;
    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};
