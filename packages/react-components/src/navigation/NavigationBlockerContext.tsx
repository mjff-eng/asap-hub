import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

type NavigationBlockerContextType = {
  /**
   * Returns the cleanup function
   */
  register: (message?: string) => () => void;
  isBlocked: boolean;
  message: string;
  /**
   * Shows the confirm window (window.confirm) and returns user choice
   */
  requestNavigation: () => boolean;
  /**
   * Lets the next browser back go through without the confirm window,
   * for callers that already asked the user with their own dialog
   */
  allowNextNavigation: () => void;
  consumeAllowedNavigation: () => boolean;
  /**
   * Lets a page show its own discard dialog on browser back, instead of the
   * confirm window
   */
  setDiscardDialog: (open: (() => void) | null) => void;
  openDiscardDialog: () => boolean;
};

const defaultMessage =
  'Are you sure you want to leave? Unsaved changes will be lost.';

/**
 * Default context that's safe to use without provider (passthrough behavior)
 */
const defaultContext: NavigationBlockerContextType = {
  register: () => () => {
    /* noop - default cleanup function */
  },
  isBlocked: false,
  message: defaultMessage,
  requestNavigation: () => true,
  allowNextNavigation: () => {
    /* noop - nothing to bypass without a provider */
  },
  consumeAllowedNavigation: () => false,
  setDiscardDialog: () => {
    /* noop - no dialog to show without a provider */
  },
  openDiscardDialog: () => false,
};

const NavigationBlockerContext =
  createContext<NavigationBlockerContextType>(defaultContext);

type NavigationBlockerProviderProps = {
  children: React.ReactNode;
};

export const NavigationBlockerProvider: React.FC<
  NavigationBlockerProviderProps
> = ({ children }) => {
  const [blockerMessage, setBlockerMessage] = useState<string | null>(null);

  const register = useCallback((message: string = defaultMessage) => {
    setBlockerMessage(message);
    return () => {
      setBlockerMessage(null);
    };
  }, []);

  const requestNavigation = useCallback(() => {
    if (!blockerMessage) {
      return true;
    }
    return window.confirm(blockerMessage);
  }, [blockerMessage]);

  const allowedNavigationRef = useRef(false);
  const allowNextNavigation = useCallback(() => {
    allowedNavigationRef.current = true;
  }, []);
  const consumeAllowedNavigation = useCallback(() => {
    const allowed = allowedNavigationRef.current;
    allowedNavigationRef.current = false;
    return allowed;
  }, []);

  const discardDialogRef = useRef<(() => void) | null>(null);
  const setDiscardDialog = useCallback((open: (() => void) | null) => {
    discardDialogRef.current = open;
  }, []);
  const openDiscardDialog = useCallback(() => {
    if (!discardDialogRef.current) return false;
    discardDialogRef.current();
    return true;
  }, []);

  const value: NavigationBlockerContextType = {
    register,
    isBlocked: blockerMessage !== null,
    message: blockerMessage ?? defaultMessage,
    requestNavigation,
    allowNextNavigation,
    consumeAllowedNavigation,
    setDiscardDialog,
    openDiscardDialog,
  };

  return (
    <NavigationBlockerContext.Provider value={value}>
      {children}
    </NavigationBlockerContext.Provider>
  );
};

export const useNavigationBlocker = (): NavigationBlockerContextType =>
  useContext(NavigationBlockerContext);

export default NavigationBlockerContext;
