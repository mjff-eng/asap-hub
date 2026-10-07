import createAuth0Client from '@auth0/auth0-spa-js';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import {
  BrowserRouter,
  MemoryRouter,
  useLocation,
  useNavigationType,
} from 'react-router';

import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from '../../config';
import AuthProvider, { useAuth } from '../AuthProvider';

jest.mock('@auth0/auth0-spa-js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const createClient = createAuth0Client as unknown as jest.Mock;

const makeClient = (overrides: Record<string, unknown> = {}) => ({
  isAuthenticated: jest.fn(() => Promise.resolve(true)),
  getUser: jest.fn(() => Promise.resolve({ email: 'jane@example.com' })),
  getTokenSilently: jest.fn(() => Promise.resolve('a-token')),
  loginWithRedirect: jest.fn(() => Promise.resolve()),
  logout: jest.fn(),
  handleRedirectCallback: jest.fn(() => Promise.resolve({ appState: {} })),
  ...overrides,
});

const Probe = () => {
  const { isLoading, isAuthenticated, user, getToken, login, logout } =
    useAuth();
  return (
    <div>
      <span data-testid="state">
        {isLoading ? 'loading' : isAuthenticated ? 'in' : 'out'}
      </span>
      <span data-testid="user">{(user?.email as string) ?? 'none'}</span>
      <button
        type="button"
        onClick={() => {
          getToken()
            .then((token) => {
              document.title = token;
            })
            .catch(() => undefined);
        }}
      >
        token
      </button>
      <button
        type="button"
        onClick={() => {
          login().catch(() => undefined);
        }}
      >
        login
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </div>
  );
};

const locationKeys = new Set<string>();

const LocationProbe = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  locationKeys.add(location.key);
  return (
    <div>
      <span data-testid="path">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="navigation-type">{navigationType}</span>
    </div>
  );
};

const currentEntry = () =>
  `${window.location.pathname}${window.location.search}`;

const renderProvider = (entry = currentEntry()) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <Probe />
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>,
  );

const renderProviderInStrictMode = (entry = currentEntry()) =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[entry]}>
        <AuthProvider>
          <Probe />
          <LocationProbe />
        </AuthProvider>
      </MemoryRouter>
    </StrictMode>,
  );

const renderProviderInBrowserRouter = () =>
  render(
    <BrowserRouter>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </BrowserRouter>,
  );

const setLocation = (search: string, pathname = '/videos/video-1') => {
  window.history.replaceState({}, '', `${pathname}${search}`);
};

beforeEach(() => {
  jest.clearAllMocks();
  locationKeys.clear();
  setLocation('', '/');
});

it('configures the client with the app audience and origin', async () => {
  createClient.mockResolvedValue(makeClient());
  renderProvider();

  await waitFor(() =>
    expect(screen.getByTestId('state')).toHaveTextContent(/^in$/),
  );
  expect(createClient).toHaveBeenCalledWith({
    domain: AUTH0_DOMAIN,
    client_id: AUTH0_CLIENT_ID,
    audience: AUTH0_AUDIENCE,
    redirect_uri: window.location.origin,
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  });
});

it('reflects an authenticated session and its user', async () => {
  createClient.mockResolvedValue(makeClient());
  renderProvider();

  await waitFor(() =>
    expect(screen.getByTestId('state')).toHaveTextContent(/^in$/),
  );
  expect(screen.getByTestId('user')).toHaveTextContent('jane@example.com');
});

it('reflects an anonymous session without asking for a user', async () => {
  const client = makeClient({
    isAuthenticated: jest.fn(() => Promise.resolve(false)),
  });
  createClient.mockResolvedValue(client);
  renderProvider();

  await waitFor(() =>
    expect(screen.getByTestId('state')).toHaveTextContent(/^out$/),
  );
  expect(client.getUser).not.toHaveBeenCalled();
  expect(screen.getByTestId('user')).toHaveTextContent('none');
});

it('stops loading when the client cannot be created', async () => {
  createClient.mockRejectedValue(new Error('offline'));
  renderProvider();

  await waitFor(() =>
    expect(screen.getByTestId('state')).toHaveTextContent(/^out$/),
  );
});

describe('redirect callback', () => {
  const clientReturning = (returnTo: unknown) =>
    makeClient({
      handleRedirectCallback: jest.fn(() =>
        Promise.resolve({ appState: { returnTo } }),
      ),
    });

  it('moves the router to the deep linked returnTo path', async () => {
    setLocation('?code=abc&state=xyz');
    const client = clientReturning('/studio/videos/abc');
    createClient.mockResolvedValue(client);

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent(
        /^\/studio\/videos\/abc$/,
      ),
    );
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
    expect(screen.getByTestId('navigation-type')).toHaveTextContent(
      /^REPLACE$/,
    );
    expect(client.handleRedirectCallback).toHaveBeenCalledTimes(1);
  });

  it('keeps the returnTo search parameters that are not the auth code', async () => {
    setLocation('?code=abc&state=xyz');
    createClient.mockResolvedValue(clientReturning('/users?q=1'));

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent(/^\/users$/),
    );
    expect(screen.getByTestId('search')).toHaveTextContent(/^\?q=1$/);
  });

  it('falls back to the root and drops the code when there is no returnTo', async () => {
    setLocation('?code=abc&state=xyz', '/');
    createClient.mockResolvedValue(makeClient());

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('search')).toBeEmptyDOMElement(),
    );
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/);
    expect(screen.getByTestId('navigation-type')).toHaveTextContent(
      /^REPLACE$/,
    );
  });

  it.each([
    ['an absolute url', 'https://evil.example.com/steal'],
    ['a protocol relative url', '//evil.example.com/steal'],
    ['a backslash escaped url', '/\\evil.example.com/steal'],
    ['a non string', 42],
  ])('refuses %s as a returnTo and lands on the root', async (_name, value) => {
    setLocation('?code=abc&state=xyz');
    createClient.mockResolvedValue(clientReturning(value));

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/),
    );
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('strips the code from the address bar under a browser router', async () => {
    setLocation('?code=abc&state=xyz', '/');
    createClient.mockResolvedValue(clientReturning('/studio/videos/abc'));
    const entries = window.history.length;

    renderProviderInBrowserRouter();

    await waitFor(() =>
      expect(window.location.pathname).toBe('/studio/videos/abc'),
    );
    expect(window.location.search).toBe('');
    expect(window.history.length).toBe(entries);
  });

  it('leaves the url alone when there is no code', async () => {
    const client = makeClient();
    createClient.mockResolvedValue(client);

    renderProvider('/videos/video-1');

    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent(/^in$/),
    );
    expect(client.handleRedirectCallback).not.toHaveBeenCalled();
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/videos\/video-1$/);
    expect(locationKeys.size).toBe(1);
  });
});

describe('strict mode double mount', () => {
  it('redeems the authorization code once and ends up signed in', async () => {
    setLocation('?code=abc&state=xyz');
    let redeemed = false;
    const client = makeClient({
      handleRedirectCallback: jest.fn(() => {
        if (redeemed) return Promise.reject(new Error('invalid_grant'));
        redeemed = true;
        return Promise.resolve({ appState: { returnTo: '/videos/video-1' } });
      }),
    });
    createClient.mockResolvedValue(client);

    renderProviderInStrictMode();

    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent(/^in$/),
    );
    expect(client.handleRedirectCallback).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('user')).toHaveTextContent('jane@example.com');
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/videos\/video-1$/);
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
    expect(locationKeys.size).toBe(2);
  });

  it('stops loading when redeeming the authorization code fails', async () => {
    setLocation('?code=abc&state=xyz');
    const client = makeClient({
      handleRedirectCallback: jest.fn(() =>
        Promise.reject(new Error('invalid_grant')),
      ),
    });
    createClient.mockResolvedValue(client);

    renderProviderInStrictMode();

    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent(/^out$/),
    );
    expect(client.handleRedirectCallback).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when the provider really unmounts mid flight', async () => {
    setLocation('?code=abc&state=xyz', '/');
    const client = makeClient({
      handleRedirectCallback: jest.fn(() =>
        Promise.resolve({ appState: { returnTo: '/studio/videos/abc' } }),
      ),
    });
    createClient.mockResolvedValue(client);

    const { unmount } = renderProviderInBrowserRouter();
    unmount();

    await waitFor(() => expect(client.getUser).toHaveBeenCalled());
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?code=abc&state=xyz');
  });
});

describe('actions', () => {
  it('delegates getToken to the client', async () => {
    const client = makeClient();
    createClient.mockResolvedValue(client);
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent(/^in$/),
    );
    await userEvent.click(screen.getByRole('button', { name: 'token' }));

    await waitFor(() => expect(document.title).toBe('a-token'));
    expect(client.getTokenSilently).toHaveBeenCalled();
  });

  it('logs in with the current location as the returnTo', async () => {
    setLocation('?q=1', '/users');
    const client = makeClient();
    createClient.mockResolvedValue(client);
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent(/^in$/),
    );
    await userEvent.click(screen.getByRole('button', { name: 'login' }));

    expect(client.loginWithRedirect).toHaveBeenCalledWith({
      redirect_uri: window.location.origin,
      appState: { returnTo: '/users?q=1' },
    });
  });

  it('logs out back to the origin', async () => {
    const client = makeClient();
    createClient.mockResolvedValue(client);
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent(/^in$/),
    );
    await userEvent.click(screen.getByRole('button', { name: 'logout' }));

    expect(client.logout).toHaveBeenCalledWith({
      returnTo: window.location.origin,
    });
  });
});
