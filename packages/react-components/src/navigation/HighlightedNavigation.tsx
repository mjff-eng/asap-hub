import { createContext, useContext, useEffect } from 'react';

type HighlightedNavigationContextType = {
  highlightedHref?: string;
  setHighlightedHref: (href: string | undefined) => void;
};

// Pages whose URL isn't under their section, like a project draft at
// /shared-research/:id, tell the navigation which section to highlight.
export const HighlightedNavigationContext =
  createContext<HighlightedNavigationContextType>({
    setHighlightedHref: () => {
      /* noop - nothing to highlight without a layout */
    },
  });

export const useHighlightedNavigation = (href: string | undefined) => {
  const { setHighlightedHref } = useContext(HighlightedNavigationContext);
  useEffect(() => {
    setHighlightedHref(href);
    return () => setHighlightedHref(undefined);
  }, [href, setHighlightedHref]);
};
