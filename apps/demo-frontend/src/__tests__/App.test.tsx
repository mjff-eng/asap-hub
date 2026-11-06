import createAuth0Client from '@auth0/auth0-spa-js';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../App';
import { API_BASE_URL } from '../config';

jest.mock('@auth0/auth0-spa-js', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const createClient = createAuth0Client as unknown as jest.Mock;

const makeClient = (isAuthenticated: boolean) => ({
  isAuthenticated: jest.fn(() => Promise.resolve(isAuthenticated)),
  getUser: jest.fn(() => Promise.resolve({ email: 'jane@example.com' })),
  getTokenSilently: jest.fn(() => Promise.resolve('session-token')),
  loginWithRedirect: jest.fn(() => Promise.resolve()),
  logout: jest.fn(),
  handleRedirectCallback: jest.fn(),
});

const routes: Record<string, { status: number; body: unknown }> = {};

const fetchMock = jest.fn((url: string) => {
  const path = url.replace(`${API_BASE_URL}/api`, '');
  const { status, body } = routes[path] ?? { status: 404, body: {} };
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(routes).forEach((path) => delete routes[path]);
  window.fetch = fetchMock as unknown as typeof fetch;
  window.history.replaceState({}, '', '/');
});

it('asks an anonymous visitor to sign in and starts the redirect', async () => {
  const client = makeClient(false);
  createClient.mockResolvedValue(client);

  render(<App />);

  await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));

  expect(client.loginWithRedirect).toHaveBeenCalledWith(
    expect.objectContaining({ appState: { returnTo: '/' } }),
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

it('looks the account up with the session token', async () => {
  createClient.mockResolvedValue(makeClient(true));
  routes['/me'] = { status: 403, body: { error: 'not_invited' } };

  render(<App />);

  expect(await screen.findByText('You are not invited yet')).toBeVisible();
  expect(fetchMock).toHaveBeenCalledWith(
    `${API_BASE_URL}/api/me`,
    expect.objectContaining({
      headers: { Authorization: 'Bearer session-token' },
    }),
  );
});

it('opens the library inside the app shell for an invited member', async () => {
  createClient.mockResolvedValue(makeClient(true));
  routes['/me'] = {
    status: 200,
    body: {
      sub: 'auth0|1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'member',
    },
  };
  routes['/folders'] = { status: 200, body: { items: [] } };
  routes['/folders/counts'] = { status: 200, body: { counts: {} } };
  routes['/videos'] = { status: 200, body: { items: [] } };

  render(<App />);

  expect(
    await screen.findByRole('heading', { name: 'Home', level: 1 }),
  ).toBeVisible();
  expect(screen.getByRole('banner')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Jane Doe' })).toBeVisible();
  await waitFor(() =>
    expect(screen.getByText('No videos here yet.')).toBeVisible(),
  );
});
