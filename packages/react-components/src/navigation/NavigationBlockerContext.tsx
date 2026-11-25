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
   * Whether the blocking form is saving, so controls outside it can wait
   */
  isSaving: boolean;
  setSaving: (isSaving: boolean) => void;
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
  isSaving: false,
  setSaving: () => {
    /* noop - no controls to tell without a provider */
  },
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
  const [isSaving, setSaving] = useState(false);

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

  const value: NavigationBlockerContextType = {
    register,
    isBlocked: blockerMessage !== null,
    message: blockerMessage ?? defaultMessage,
    requestNavigation,
    allowNextNavigation,
    consumeAllowedNavigation,
    isSaving,
    setSaving,
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
