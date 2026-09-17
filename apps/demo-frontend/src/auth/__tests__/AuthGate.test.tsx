import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from '../../api/client';
import {
  anonymousState,
  authenticatedState,
  renderApp,
} from '../../test-utils';
import AuthGate from '../AuthGate';

it('shows the sign in screen when logged out', () => {
  renderApp(<AuthGate>secret</AuthGate>, { auth: anonymousState });

  expect(screen.getByText('ASAP Demos')).toBeVisible();
  expect(screen.getByRole('button', { name: /sign in/i })).toBeVisible();
  expect(screen.queryByText('secret')).not.toBeInTheDocument();
});

it('starts the login redirect when the sign in button is clicked', async () => {
  const login = jest.fn(() => Promise.resolve());
  renderApp(<AuthGate>secret</AuthGate>, {
    auth: { ...anonymousState, login },
  });

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
