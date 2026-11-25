import { useCallback, useEffect, useRef } from 'react';
import { NavigateFunction, useNavigate, NavigateOptions } from 'react-router';
import { useNavigationBlocker } from './NavigationBlockerContext';

type UseNavigationWarningOptions = {
  shouldBlock: boolean;
  message?: string;
};

type UseNavigationWarningResult = {
  blockedNavigate: NavigateFunction;
};

const defaultMessage =
  'Are you sure you want to leave? Unsaved changes will be lost.';

export const useNavigationWarning = ({
  shouldBlock,
  message = defaultMessage,
}: UseNavigationWarningOptions): UseNavigationWarningResult => {
  const navigate = useNavigate();
  const { register, requestNavigation, consumeAllowedNavigation } =
    useNavigationBlocker();

  const intentionalNavigationRef = useRef(false);

  const hasDummyEntryRef = useRef(false);

  const dummyEntryHrefRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldBlock) {
      return undefined;
    }
    const cleanup = register(message);
    return cleanup;
  }, [shouldBlock, message, register]);

  useEffect(() => {
    if (!shouldBlock) {
      return undefined;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock, message]);

  useEffect(() => {
    if (!shouldBlock) {
      return undefined;
    }

    const handlePopstate = () => {
      if (intentionalNavigationRef.current) {
        intentionalNavigationRef.current = false;
        return;
      }

      window.history.pushState(null, '', window.location.href);

      if (!consumeAllowedNavigation() && !window.confirm(message)) {
        return;
      }

      intentionalNavigationRef.current = true;
      window.history.go(-2);
    };

    if (!hasDummyEntryRef.current) {
      window.history.pushState(null, '', window.location.href);
      hasDummyEntryRef.current = true;
      dummyEntryHrefRef.current = window.location.href;
    }

    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, [shouldBlock, message, consumeAllowedNavigation]);

  useEffect(() => {
    if (!shouldBlock && hasDummyEntryRef.current) {
      if (window.location.href === dummyEntryHrefRef.current) {
        window.history.back();
      }
      hasDummyEntryRef.current = false;
      dummyEntryHrefRef.current = null;
    }
  }, [shouldBlock]);

  const blockedNavigate: NavigateFunction = useCallback(
    (to, options?) => {
      if (!requestNavigation()) {
        return;
      }
      if (typeof to === 'number') {
        intentionalNavigationRef.current = true;

        if (hasDummyEntryRef.current) {
          window.history.go(to - 1);
        } else {
          void navigate(to);
        }
      } else {
        void navigate(to, options as NavigateOptions);
      }
    },
    [navigate, requestNavigation],
  );

  return { blockedNavigate };
};

export default useNavigationWarning;
