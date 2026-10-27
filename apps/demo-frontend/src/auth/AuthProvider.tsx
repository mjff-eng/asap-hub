import createAuth0Client, { Auth0Client, User } from '@auth0/auth0-spa-js';
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router';

import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from '../config';

export type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user?: User;
  getToken: () => Promise<string>;
  login: () => Promise<void>;
  logout: () => void;
};

const notReady = () => {
  throw new Error('Auth client is not ready');
};

export const AuthContext = createContext<AuthState>({
  isLoading: true,
  isAuthenticated: false,
  getToken: notReady,
  login: notReady,
  logout: notReady,
});

export const useAuth = (): AuthState => useContext(AuthContext);

type Session = {
  client: Auth0Client;
  isAuthenticated: boolean;
  user?: User;
  returnTo?: string;
};

// returnTo round trips through Auth0, so only same origin paths are honoured.
const toSafePath = (value: unknown): string =>
  typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : '/';

const initSession = async (): Promise<Session> => {
  const auth0 = await createAuth0Client({
    domain: AUTH0_DOMAIN,
    client_id: AUTH0_CLIENT_ID,
    audience: AUTH0_AUDIENCE,
    redirect_uri: window.location.origin,
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  });

  let returnTo: string | undefined;
  if (window.location.search.includes('code=')) {
    const { appState } = await auth0.handleRedirectCallback();
    returnTo = toSafePath(
      (appState as { returnTo?: string } | undefined)?.returnTo,
    );
  }

  const authenticated = await auth0.isAuthenticated();
  return {
    client: auth0,
    isAuthenticated: authenticated,
    user: authenticated ? await auth0.getUser<User>() : undefined,
    returnTo,
  };
};

const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<Auth0Client>();
  const [isLoading, setLoading] = useState(true);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User>();

  const session = useRef<Promise<Session>>();

  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    // Shared across a StrictMode double mount so the single-use code is redeemed once.
    if (!session.current) session.current = initSession();

    session.current
      .then((settled) => {
        if (cancelled) return;
        setClient(settled.client);
        setAuthenticated(settled.isAuthenticated);
        setUser(settled.user);
        setLoading(false);
        if (settled.returnTo)
          void navigateRef.current(settled.returnTo, { replace: true });
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getToken = useCallback(async () => {
    if (!client) throw new Error('Auth client is not ready');
    return client.getTokenSilently();
  }, [client]);

  const login = useCallback(async () => {
    if (!client) throw new Error('Auth client is not ready');
    await client.loginWithRedirect({
      redirect_uri: window.location.origin,
      appState: {
        returnTo: `${window.location.pathname}${window.location.search}`,
      },
    });
  }, [client]);

  const logout = useCallback(() => {
    void client?.logout({ returnTo: window.location.origin });
  }, [client]);

  const value = useMemo(
    () => ({ isLoading, isAuthenticated, user, getToken, login, logout }),
    [isLoading, isAuthenticated, user, getToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
