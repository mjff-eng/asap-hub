import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from '../../api/client';
import type { Invite } from '../../api/types';
import { adminMe, creatorMe, memberMe, renderApp } from '../../test-utils';
import Invites from '../Invites';

const items: Invite[] = [
  {
    email: 'jane@example.com',
    role: 'member',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    email: 'carl@example.com',
    role: 'creator',
    createdAt: '2026-02-01T00:00:00.000Z',
    claimedBy: 'auth0|9',
  },
];

const rowFor = async (email: string) =>
  (await screen.findByText(email)).closest('tr') as HTMLElement;

it('tells a non-creator that only creators can manage invites', async () => {
  renderApp(<Invites />, {
    me: memberMe,
    api: { listInvites: () => Promise.resolve(items) },
  });

  expect(
    await screen.findByRole('heading', {
      name: 'Only creators can manage invites',
      level: 1,
    }),
  ).toBeVisible();
  expect(screen.queryByRole('table')).toBeNull();
});

it('shows a creator the form and the invites with their status badges', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: { listInvites: () => Promise.resolve(items) },
  });

  expect(screen.getByLabelText('Email address')).toBeVisible();
  const pending = await rowFor('jane@example.com');
  expect(within(pending).getByText('Member')).toBeVisible();
  expect(within(pending).getByText('Pending')).toBeVisible();
  const claimed = await rowFor('carl@example.com');
  expect(within(claimed).getByText('Creator')).toBeVisible();
  expect(within(claimed).getByText('Claimed')).toBeVisible();
});

it('hides the admin role option and the actions column from a plain creator', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: { listInvites: () => Promise.resolve(items) },
  });

  await screen.findByText('jane@example.com');
  const role = screen.getByLabelText('Role');
  expect(within(role).queryByRole('option', { name: 'Admin' })).toBeNull();
  expect(screen.queryByText('Actions')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
});

it('gives an admin the admin role option and a cancel action on pending rows', async () => {
  renderApp(<Invites />, {
    me: adminMe,
    api: { listInvites: () => Promise.resolve(items) },
  });

  await screen.findByText('jane@example.com');
  const role = screen.getByLabelText('Role');
  expect(within(role).getByRole('option', { name: 'Admin' })).toBeVisible();
  expect(screen.getByText('Actions')).toBeVisible();

  const pending = await rowFor('jane@example.com');
  expect(within(pending).getByRole('button', { name: 'Cancel' })).toBeVisible();
  const claimed = await rowFor('carl@example.com');
  expect(within(claimed).queryByRole('button', { name: 'Cancel' })).toBeNull();
});

it('sends an invite with the chosen role and clears the email on success', async () => {
  const createInvite = jest.fn(() => Promise.resolve());
  renderApp(<Invites />, {
    me: creatorMe,
    api: { listInvites: () => Promise.resolve(items), createInvite },
  });

  await screen.findByText('jane@example.com');
  const email = screen.getByLabelText('Email address');
  await userEvent.type(email, 'new@example.com');
  await userEvent.selectOptions(screen.getByLabelText('Role'), 'creator');
  await userEvent.click(screen.getByRole('button', { name: 'Send invite' }));

  expect(createInvite).toHaveBeenCalledWith('new@example.com', 'creator');
  await waitFor(() => expect(email).toHaveValue(''));
});

it('does not send anything when the email is empty', async () => {
  const createInvite = jest.fn(() => Promise.resolve());
  renderApp(<Invites />, {
    me: creatorMe,
    api: { listInvites: () => Promise.resolve(items), createInvite },
  });

  await screen.findByText('jane@example.com');
  fireEvent.submit(
    screen
      .getByRole('button', { name: 'Send invite' })
      .closest('form') as HTMLFormElement,
  );

  expect(createInvite).not.toHaveBeenCalled();
});

it('disables the submit button while the invite is being sent', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: {
      listInvites: () => Promise.resolve(items),
      createInvite: () => new Promise<void>(() => {}),
    },
  });

  await screen.findByText('jane@example.com');
  await userEvent.type(
    screen.getByLabelText('Email address'),
    'new@example.com',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Send invite' }));

  expect(
    await screen.findByRole('button', { name: 'Inviting' }),
  ).toBeDisabled();
});

it('surfaces a failed invite', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: {
      listInvites: () => Promise.resolve(items),
      createInvite: () => Promise.reject(new Error('nope')),
    },
  });

  await screen.findByText('jane@example.com');
  await userEvent.type(
    screen.getByLabelText('Email address'),
    'new@example.com',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Send invite' }));

  expect(
    await screen.findByText(
      'We could not send that invite. Check the address and try again.',
    ),
  ).toBeVisible();
});

it('says the person already has an account rather than blaming the address', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: {
      listInvites: () => Promise.resolve(items),
      createInvite: () =>
        Promise.reject(new ApiError(409, 'conflict', 'already_invited')),
    },
  });

  await screen.findByText('jane@example.com');
  await userEvent.type(
    screen.getByLabelText('Email address'),
    'taken@example.com',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Send invite' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    /already accepted an invite/i,
  );
});

it('clears a failed invite once the address is edited again', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: {
      listInvites: () => Promise.resolve(items),
      createInvite: () => Promise.reject(new Error('nope')),
    },
  });

  await screen.findByText('jane@example.com');
  const email = screen.getByLabelText('Email address');
  await userEvent.type(email, 'new@example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Send invite' }));
  await screen.findByRole('alert');

  await userEvent.type(email, 'x');

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('narrows the table by email search', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: { listInvites: () => Promise.resolve(items) },
  });

  await screen.findByText('jane@example.com');
  await userEvent.type(screen.getByLabelText('Search invites'), 'carl');

  await waitFor(
    () => expect(screen.queryByText('jane@example.com')).toBeNull(),
    { timeout: 4000 },
  );
  expect(screen.getByText('carl@example.com')).toBeVisible();
});

it('filters the table by role and reports when nothing matches', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: { listInvites: () => Promise.resolve(items) },
  });

  await screen.findByText('jane@example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Filter by role' }));
  await userEvent.click(
    within(screen.getByRole('listbox', { name: 'Filter by role' })).getByRole(
      'option',
      { name: 'Admin' },
    ),
  );

  expect(await screen.findByText('No invites match')).toBeVisible();
  expect(screen.queryByText('jane@example.com')).toBeNull();
});

it('filters the table by status', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: { listInvites: () => Promise.resolve(items) },
  });

  await screen.findByText('jane@example.com');
  await userEvent.click(
    screen.getByRole('button', { name: 'Filter by status' }),
  );
  await userEvent.click(screen.getByRole('option', { name: 'Claimed' }));

  await waitFor(() =>
    expect(screen.queryByText('jane@example.com')).toBeNull(),
  );
  expect(screen.getByText('carl@example.com')).toBeVisible();
});

it('says nobody has been invited when the list is empty', async () => {
  renderApp(<Invites />, {
    me: adminMe,
    api: { listInvites: () => Promise.resolve([]) },
  });

  expect(await screen.findByText('Nobody has been invited yet.')).toBeVisible();
});

it('says the invites failed to load rather than that nobody has been invited', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: { listInvites: () => Promise.reject(new Error('boom')) },
  });

  expect(
    await screen.findByRole(
      'heading',
      { name: 'We could not load the invites', level: 2 },
      { timeout: 6000 },
    ),
  ).toBeVisible();
  expect(
    screen.getByText(/does not mean nobody has been invited/),
  ).toBeVisible();
  expect(screen.queryByText('Nobody has been invited yet.')).toBeNull();
}, 15000);

it('hides the filters and the table while the invites are unavailable', async () => {
  renderApp(<Invites />, {
    me: adminMe,
    api: { listInvites: () => Promise.reject(new ApiError(429, 'slow down')) },
  });

  await screen.findByRole('heading', { name: 'We could not load the invites' });
  expect(screen.queryByLabelText('Search invites')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Filter by role' })).toBeNull();
  expect(screen.queryByRole('table')).toBeNull();
});

it('reloads the invites on retry and clears the failure', async () => {
  let attempt = 0;
  const listInvites = jest.fn(() => {
    attempt += 1;
    return attempt === 1
      ? Promise.reject(new ApiError(429, 'slow down'))
      : Promise.resolve(items);
  });
  renderApp(<Invites />, { me: creatorMe, api: { listInvites } });

  await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('jane@example.com')).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'We could not load the invites' }),
  ).toBeNull();
  expect(screen.getByLabelText('Search invites')).toBeVisible();
});

it('replaces the failure with the spinner while a retry is in flight', async () => {
  let attempt = 0;
  const listInvites = jest.fn(() => {
    attempt += 1;
    return attempt === 1
      ? Promise.reject(new ApiError(429, 'slow down'))
      : new Promise<Invite[]>(() => {});
  });
  renderApp(<Invites />, { me: creatorMe, api: { listInvites } });

  await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('Loading invites')).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'We could not load the invites' }),
  ).toBeNull();
});

it('reads a refused invite list as a role change and offers no retry', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: { listInvites: () => Promise.reject(new ApiError(403, 'forbidden')) },
  });

  expect(
    await screen.findByRole('heading', {
      name: 'You can no longer manage invites',
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

it('cancels a pending invite after confirming', async () => {
  const cancelInvite = jest.fn(() => Promise.resolve());
  renderApp(<Invites />, {
    me: adminMe,
    api: { listInvites: () => Promise.resolve(items), cancelInvite },
  });

  const row = await rowFor('jane@example.com');
  await userEvent.click(within(row).getByRole('button', { name: 'Cancel' }));

  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Cancel jane@example.com?')).toBeVisible();
  expect(within(dialog).getByText(/will stop granting access/)).toBeVisible();
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Cancel invite' }),
  );

  expect(cancelInvite).toHaveBeenCalledWith('jane@example.com');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('closes the cancel dialog on keep without cancelling anything', async () => {
  const cancelInvite = jest.fn(() => Promise.resolve());
  renderApp(<Invites />, {
    me: adminMe,
    api: { listInvites: () => Promise.resolve(items), cancelInvite },
  });

  const row = await rowFor('jane@example.com');
  await userEvent.click(within(row).getByRole('button', { name: 'Cancel' }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep' }),
  );

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(cancelInvite).not.toHaveBeenCalled();
});

it('closes the cancel dialog on escape', async () => {
  const cancelInvite = jest.fn(() => Promise.resolve());
  renderApp(<Invites />, {
    me: adminMe,
    api: { listInvites: () => Promise.resolve(items), cancelInvite },
  });

  const row = await rowFor('jane@example.com');
  await userEvent.click(within(row).getByRole('button', { name: 'Cancel' }));
  await userEvent.keyboard('{Escape}');

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(cancelInvite).not.toHaveBeenCalled();
});

it('surfaces a failed cancellation', async () => {
  renderApp(<Invites />, {
    me: adminMe,
    api: {
      listInvites: () => Promise.resolve(items),
      cancelInvite: () => Promise.reject(new Error('nope')),
    },
  });

  const row = await rowFor('jane@example.com');
  await userEvent.click(within(row).getByRole('button', { name: 'Cancel' }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Cancel invite',
    }),
  );

  expect(
    await screen.findByText(
      'We could not cancel that invite. Try again in a moment.',
    ),
  ).toBeVisible();
});

it('opens on one h1 and points an admin at the users', async () => {
  renderApp(<Invites />, {
    me: adminMe,
    api: { listInvites: () => Promise.resolve(items) },
  });

  expect(
    await screen.findByRole('heading', { name: 'Invites', level: 1 }),
  ).toBeVisible();
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Manage users' })).toHaveAttribute(
    'href',
    '/users',
  );
});

it('lists the newest invite first', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: { listInvites: () => Promise.resolve(items) },
  });

  await screen.findByText('jane@example.com');
  const emails = screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.firstElementChild?.textContent);

  expect(emails).toEqual(['carl@example.com', 'jane@example.com']);
});

it('confirms that the invite went out', async () => {
  renderApp(<Invites />, {
    me: creatorMe,
    api: {
      listInvites: () => Promise.resolve(items),
      createInvite: () => Promise.resolve(),
    },
  });

  await screen.findByText('jane@example.com');
  await userEvent.type(
    screen.getByLabelText('Email address'),
    'new@example.com',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Send invite' }));

  expect(await screen.findByRole('status')).toHaveTextContent(
    'Invite sent to new@example.com.',
  );
});

it('confirms that the invitation was withdrawn', async () => {
  renderApp(<Invites />, {
    me: adminMe,
    api: {
      listInvites: () => Promise.resolve(items),
      cancelInvite: () => Promise.resolve(),
    },
  });

  const row = await rowFor('jane@example.com');
  await userEvent.click(within(row).getByRole('button', { name: 'Cancel' }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Cancel invite',
    }),
  );

  expect(await screen.findByRole('status')).toHaveTextContent(
    'The invitation to jane@example.com was cancelled.',
  );
});
