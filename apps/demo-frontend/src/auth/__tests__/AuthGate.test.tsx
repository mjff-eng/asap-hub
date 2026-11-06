import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from '../../api/client';
import {
  anonymousState,
  authenticatedState,
  renderApp,
} from '../../test-utils';
import AuthGate from '../AuthGate';

afterEach(() => {
  jest.restoreAllMocks();
});

it('shows the sign in screen when logged out', () => {
  renderApp(<AuthGate>secret</AuthGate>, { auth: anonymousState });

  expect(screen.getByText('ASAP Demos')).toBeVisible();
  expect(screen.getByRole('button', { name: /sign in/i })).toBeVisible();
  expect(screen.queryByText('secret')).not.toBeInTheDocument();
});

it('waits for the session check before deciding what to show', () => {
  renderApp(<AuthGate>secret</AuthGate>, {
    auth: { ...anonymousState, isLoading: true },
  });

  expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
  expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull();
  expect(screen.queryByText('secret')).not.toBeInTheDocument();
});

it('starts the login redirect when the sign in button is clicked', async () => {
  const login = jest.spyOn(anonymousState, 'login');
  renderApp(<AuthGate>secret</AuthGate>, { auth: anonymousState });

  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(login).toHaveBeenCalled();
});

it('shows the not invited screen when the api returns not_invited', async () => {
  const getMe = jest.fn(() =>
    Promise.reject(new ApiError(403, 'forbidden', 'not_invited')),
  );

  renderApp(<AuthGate>secret</AuthGate>, {
    auth: authenticatedState,
    api: { getMe },
  });

  expect(await screen.findByText('You are not invited yet')).toBeVisible();
  expect(screen.getByText('jane@example.com')).toBeVisible();
  expect(screen.getByRole('button', { name: /sign out/i })).toBeVisible();
  expect(screen.queryByText('secret')).not.toBeInTheDocument();
});

it('signs a user who was never invited out again', async () => {
  const logout = jest.spyOn(authenticatedState, 'logout');
  renderApp(<AuthGate>secret</AuthGate>, {
    auth: authenticatedState,
    api: {
      getMe: () =>
        Promise.reject(new ApiError(403, 'forbidden', 'not_invited')),
    },
  });

  await userEvent.click(
    await screen.findByRole('button', { name: /sign out/i }),
  );

  expect(logout).toHaveBeenCalledTimes(1);
});

it('shows the disabled account screen when the api returns revoked', async () => {
  const getMe = jest.fn(() =>
    Promise.reject(new ApiError(403, 'forbidden', 'revoked')),
  );

  renderApp(<AuthGate>secret</AuthGate>, {
    auth: authenticatedState,
    api: { getMe },
  });

  expect(await screen.findByText('Your account is disabled')).toBeVisible();
  expect(screen.getByRole('button', { name: /sign out/i })).toBeVisible();
  expect(screen.queryByText('secret')).not.toBeInTheDocument();
});

it('offers a retry when the account cannot be loaded, then lets the user in', async () => {
  const getMe = jest
    .fn()
    .mockRejectedValueOnce(new ApiError(401, 'unauthorised'))
    .mockResolvedValueOnce({
      sub: 'auth0|1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'member',
    });

  renderApp(<AuthGate>secret</AuthGate>, {
    auth: authenticatedState,
    api: { getMe },
  });

  expect(await screen.findByText('Something went wrong')).toBeVisible();
  expect(screen.queryByText('secret')).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('secret')).toBeVisible();
  expect(getMe).toHaveBeenCalledTimes(2);
});

it('renders its children once the account is loaded', async () => {
  const getMe = jest.fn(() =>
    Promise.resolve({
      sub: 'auth0|1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'member' as const,
    }),
  );

  renderApp(<AuthGate>secret</AuthGate>, {
    auth: authenticatedState,
    api: { getMe },
  });

  await waitFor(() => expect(screen.getByText('secret')).toBeVisible());
});
