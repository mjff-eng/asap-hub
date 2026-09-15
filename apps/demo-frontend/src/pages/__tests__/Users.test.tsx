import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from '../../api/client';
import type { ManagedUser } from '../../api/types';
import { adminMe, memberMe, renderApp } from '../../test-utils';
import Users from '../Users';

const items: ManagedUser[] = [
  {
    sub: 'auth0|admin',
    name: 'Dana Admin',
    email: 'dana@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    sub: 'auth0|1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'member',
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

const rowFor = async (email: string) =>
  (await screen.findByText(email)).closest('tr') as HTMLElement;

// a silent redirect reads as a broken link; the invites page already explains
it('explains the refusal to a non-admin instead of redirecting', async () => {
  const listUsers = jest.fn(() => Promise.resolve(items));
  renderApp(<Users />, { me: memberMe, api: { listUsers } });

  expect(
    await screen.findByRole('heading', {
      name: 'Only admins can manage users',
      level: 1,
    }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Back to demos' })).toHaveAttribute(
    'href',
    '/',
  );
  expect(screen.queryByRole('table')).toBeNull();
  expect(listUsers).not.toHaveBeenCalled();
});

it('opens on one h1 and points at the invites', async () => {
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.resolve(items) },
  });

  expect(
    await screen.findByRole('heading', { name: 'Users', level: 1 }),
  ).toBeVisible();
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Invites' })).toHaveAttribute(
    'href',
    '/invites',
  );
});

it('locks the role select and hides the actions on your own row', async () => {
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.resolve(items) },
  });

  const self = await rowFor('dana@example.com');
  await waitFor(() => expect(within(self).getByText('(you)')).toBeVisible());
  expect(
    within(self).getByLabelText('Role for dana@example.com'),
  ).toBeDisabled();
  expect(within(self).queryByRole('button', { name: 'Revoke' })).toBeNull();
  expect(within(self).queryByRole('button', { name: 'Delete' })).toBeNull();

  const other = await rowFor('jane@example.com');
  expect(
    within(other).getByLabelText('Role for jane@example.com'),
  ).toBeEnabled();
  expect(within(other).getByRole('button', { name: 'Revoke' })).toBeVisible();
});

it('changes another user role', async () => {
  const updateUser = jest.fn(() => Promise.resolve(items[1] as ManagedUser));
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.resolve(items), updateUser },
  });

  const select = await screen.findByLabelText('Role for jane@example.com');
  await userEvent.selectOptions(select, 'creator');

  expect(updateUser).toHaveBeenCalledWith('auth0|1', { role: 'creator' });
});

it('revokes a user after confirming', async () => {
  const updateUser = jest.fn(() => Promise.resolve(items[1] as ManagedUser));
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.resolve(items), updateUser },
  });

  const row = await rowFor('jane@example.com');
  await userEvent.click(within(row).getByRole('button', { name: 'Revoke' }));

  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(/Revoke jane@example.com/)).toBeVisible();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

  expect(updateUser).toHaveBeenCalledWith('auth0|1', { status: 'revoked' });
});

it('re-enables a revoked user', async () => {
  const revoked: ManagedUser = {
    ...(items[1] as ManagedUser),
    status: 'revoked',
  };
  const updateUser = jest.fn(() => Promise.resolve(revoked));
  renderApp(<Users />, {
    me: adminMe,
    api: {
      listUsers: () => Promise.resolve([items[0] as ManagedUser, revoked]),
      updateUser,
    },
  });

  const row = await rowFor('jane@example.com');
  await userEvent.click(within(row).getByRole('button', { name: 'Re-enable' }));

  const dialog = screen.getByRole('dialog');
  expect(
    within(dialog).getByText(/sign in and use ASAP Demos again/),
  ).toBeVisible();
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Re-enable' }),
  );

  expect(updateUser).toHaveBeenCalledWith('auth0|1', { status: 'active' });
});

it('closes the revoke dialog on cancel without changing anything', async () => {
  const updateUser = jest.fn(() => Promise.resolve(items[1] as ManagedUser));
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.resolve(items), updateUser },
  });

  const row = await rowFor('jane@example.com');
  await userEvent.click(within(row).getByRole('button', { name: 'Revoke' }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }),
  );

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(updateUser).not.toHaveBeenCalled();
});

it('filters the table by role and reports when nothing matches', async () => {
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.resolve(items) },
  });

  await screen.findByText('jane@example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Filter by role' }));
  await userEvent.click(
    within(screen.getByRole('listbox', { name: 'Filter by role' })).getByRole(
      'option',
      { name: 'Creator' },
    ),
  );

  expect(await screen.findByText('No users match')).toBeVisible();
  expect(screen.queryByText('jane@example.com')).toBeNull();
});

it('filters the table by status', async () => {
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.resolve(items) },
  });

  await screen.findByText('jane@example.com');
  await userEvent.click(
    screen.getByRole('button', { name: 'Filter by status' }),
  );
  await userEvent.click(screen.getByRole('option', { name: 'Revoked' }));

  expect(await screen.findByText('No users match')).toBeVisible();
});

it('says nobody has signed in when the list is empty', async () => {
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.resolve([]) },
  });

  expect(await screen.findByText('Nobody has signed in yet.')).toBeVisible();
});

it('says the users failed to load rather than that nobody has signed in', async () => {
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.reject(new Error('boom')) },
  });

  expect(
    await screen.findByRole(
      'heading',
      { name: 'We could not load the users', level: 2 },
      { timeout: 6000 },
    ),
  ).toBeVisible();
  expect(screen.getByText(/does not mean nobody has signed in/)).toBeVisible();
  expect(screen.queryByText('Nobody has signed in yet.')).toBeNull();
}, 15000);

it('hides the filters and the table while the users are unavailable', async () => {
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.reject(new ApiError(429, 'slow down')) },
  });

  await screen.findByRole('heading', { name: 'We could not load the users' });
  expect(screen.queryByLabelText('Search users')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Filter by role' })).toBeNull();
  expect(screen.queryByRole('table')).toBeNull();
});

it('reloads the users on retry and clears the failure', async () => {
  let attempt = 0;
  const listUsers = jest.fn(() => {
    attempt += 1;
    return attempt === 1
      ? Promise.reject(new ApiError(429, 'slow down'))
      : Promise.resolve(items);
  });
  renderApp(<Users />, { me: adminMe, api: { listUsers } });

  await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('jane@example.com')).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'We could not load the users' }),
  ).toBeNull();
  expect(screen.getByLabelText('Search users')).toBeVisible();
});

it('replaces the failure with the spinner while a retry is in flight', async () => {
  let attempt = 0;
  const listUsers = jest.fn(() => {
    attempt += 1;
    return attempt === 1
      ? Promise.reject(new ApiError(429, 'slow down'))
      : new Promise<ManagedUser[]>(() => {});
  });
  renderApp(<Users />, { me: adminMe, api: { listUsers } });

  await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('Loading users')).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'We could not load the users' }),
  ).toBeNull();
});

it('reads a refused user list as a role change and offers no retry', async () => {
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.reject(new ApiError(403, 'forbidden')) },
  });

  expect(
    await screen.findByRole('heading', {
      name: 'You can no longer manage users',
      level: 2,
    }),
  ).toBeVisible();
  expect(
    screen.getByText(/Your role changed since this page opened/),
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Back to demos' })).toHaveAttribute(
    'href',
    '/',
  );
});

it('surfaces a failed save', async () => {
  renderApp(<Users />, {
    me: adminMe,
    api: {
      listUsers: () => Promise.resolve(items),
      updateUser: () => Promise.reject(new Error('nope')),
    },
  });

  const select = await screen.findByLabelText('Role for jane@example.com');
  await userEvent.selectOptions(select, 'creator');

  expect(
    await screen.findByText(
      'We could not save that change. Try again in a moment.',
    ),
  ).toBeVisible();
});

it('deletes a user after confirming and names the email', async () => {
  const deleteUser = jest.fn(() => Promise.resolve());
  renderApp(<Users />, {
    me: adminMe,
    api: { listUsers: () => Promise.resolve(items), deleteUser },
  });

  const row = await rowFor('jane@example.com');
  await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));

  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Delete jane@example.com?')).toBeVisible();
  expect(within(dialog).getByText(/new invite to come back/)).toBeVisible();
  expect(within(dialog).getByText(/Videos they uploaded/)).toBeVisible();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

  expect(deleteUser).toHaveBeenCalledWith('auth0|1');
});
