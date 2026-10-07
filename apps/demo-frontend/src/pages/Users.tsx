/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { ApiError } from '../api/client';
import { useDeleteUser, useUpdateUser, useUsers } from '../api/hooks';
import type { ManagedUser, Role } from '../api/types';
import { useIsAdmin, useMeContext } from '../auth/MeContext';
import { PageHeading, SectionHeading } from '../layout/PageHeading';
import { Badge, Button, Card, Modal, Spinner } from '../ui/components';
import { TableFilters } from '../ui/TableFilters';
import {
  charcoal,
  ember,
  lead,
  paper,
  pine,
  rem,
  rose,
  silver,
  steel,
} from '../ui/theme';
import { formatRecordedAt } from '../utils/time';
import { useDebounced } from '../utils/useDebounced';

// the columns have a natural minimum, so the table scrolls inside its card
// rather than stretching the page and pushing the header off screen
const tableScrollStyles = css({ overflowX: 'auto', maxWidth: '100%' });

const tableStyles = css({
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: rem(15),
  'th, td': {
    textAlign: 'left' as const,
    padding: `${rem(12)} ${rem(24)}`,
    borderTop: `1px solid ${silver.rgb}`,
    verticalAlign: 'middle' as const,
  },
  th: {
    fontSize: rem(12),
    letterSpacing: rem(1.2),
    textTransform: 'uppercase' as const,
    color: lead.rgb,
    borderTop: 'none',
  },
});

const selectStyles = css({
  fontFamily: 'inherit',
  fontSize: rem(14),
  color: charcoal.rgb,
  padding: `${rem(6)} ${rem(8)}`,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(4),
  backgroundColor: paper.rgb,
  ':disabled': { color: lead.rgb, backgroundColor: silver.rgb },
});

const actionsStyles = css({ display: 'flex', gap: rem(8) });

const panelStyles = css({
  padding: rem(40),
  display: 'grid',
  gap: rem(8),
  justifyItems: 'start',
});

const pageHeaderStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: rem(12),
});

// the two pages answer one question between them, so each names the other
const crossLinkStyles = css({
  color: pine.rgb,
  fontSize: rem(14),
  fontWeight: 'bold',
});

const youStyles = css({ color: lead.rgb, fontSize: rem(14) });

const errorStyles = css({
  color: ember.rgb,
  fontSize: rem(14),
  margin: 0,
  padding: `0 ${rem(24)} ${rem(16)}`,
});

const dangerTitleStyles = css({
  margin: 0,
  fontSize: rem(18),
  fontWeight: 'bold',
  color: ember.rgb,
});

const modalTitleStyles = css({
  margin: 0,
  fontSize: rem(18),
  fontWeight: 'bold',
  color: charcoal.rgb,
});

const modalBodyStyles = css({
  margin: `${rem(12)} 0 0`,
  fontSize: rem(15),
  lineHeight: 1.5,
  color: charcoal.rgb,
});

const dangerNoticeStyles = css({
  marginTop: rem(16),
  padding: rem(12),
  borderRadius: rem(4),
  borderLeft: `${rem(3)} solid ${ember.rgb}`,
  backgroundColor: rose.rgb,
  fontSize: rem(14),
  color: charcoal.rgb,
});

const modalActionsStyles = css({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: rem(12),
  marginTop: rem(24),
});

const roleOptions = [
  { value: 'all', label: 'All roles' },
  { value: 'member', label: 'Member' },
  { value: 'creator', label: 'Creator' },
  { value: 'admin', label: 'Admin' },
];

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
];

const Users: FC = () => {
  const isAdmin = useIsAdmin();
  const me = useMeContext();
  const users = useUsers(isAdmin);
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [statusTarget, setStatusTarget] = useState<ManagedUser | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | undefined>();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedQuery = useDebounced(query);

  const items = users.data;
  // a refetch after a failure never re-enters isLoading, so the spinner has to
  // cover the retry as well or the stale error just sits there
  const isLoadingList = users.isLoading || (users.isError && users.isFetching);
  const hasListError = users.isError && !users.isFetching;
  const isForbidden =
    users.error instanceof ApiError && users.error.status === 403;
  const visible = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    return (items ?? []).filter((user) => {
      if (
        needle &&
        !user.name.toLowerCase().includes(needle) &&
        !user.email.toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;
      return true;
    });
  }, [items, debouncedQuery, roleFilter, statusFilter]);

  // a silent redirect leaves you wondering whether the link was broken, so this
  // says the same thing the invites page says
  if (!isAdmin) {
    return (
      <Card overrideStyles={panelStyles}>
        <PageHeading size={3}>Only admins can manage users</PageHeading>
        <p css={{ color: lead.rgb, margin: 0 }}>
          Ask an admin to change someone&rsquo;s role or remove their account.
        </p>
        <Link to="/" css={{ color: pine.rgb }}>
          Back to demos
        </Link>
      </Card>
    );
  }

  const confirmStatus = () => {
    if (!statusTarget) return;
    updateUser.mutate(
      {
        sub: statusTarget.sub,
        status: statusTarget.status === 'revoked' ? 'active' : 'revoked',
      },
      { onSuccess: () => setStatusTarget(undefined) },
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.sub, {
      onSuccess: () => setDeleteTarget(undefined),
    });
  };

  return (
    <>
      <div css={pageHeaderStyles}>
        <PageHeading>Users</PageHeading>
        <Link to="/invites" css={crossLinkStyles}>
          Invites
        </Link>
      </div>
      <div css={{ height: rem(16) }} />

      <Card>
        {isLoadingList && <Spinner label="Loading users" />}
        {(updateUser.isError || deleteUser.isError) && (
          <p css={errorStyles}>
            We could not save that change. Try again in a moment.
          </p>
        )}
        {hasListError &&
          (isForbidden ? (
            <div css={panelStyles}>
              <SectionHeading>You can no longer manage users</SectionHeading>
              <p css={{ color: lead.rgb, margin: 0 }}>
                Your role changed since this page opened. Reload the page to
                pick up your new role.
              </p>
              <Link to="/" css={{ color: pine.rgb }}>
                Back to demos
              </Link>
            </div>
          ) : (
            <div css={panelStyles}>
              <SectionHeading>We could not load the users</SectionHeading>
              <p css={{ color: lead.rgb, margin: 0 }}>
                The list did not load, so this does not mean nobody has signed
                in. Try again in a moment.
              </p>
              <Button
                onClick={() => {
                  void users.refetch();
                }}
              >
                Retry
              </Button>
            </div>
          ))}
        {!isLoadingList && !hasListError && (
          <>
            <TableFilters
              searchLabel="Search users"
              query={query}
              onQueryChange={setQuery}
              selects={[
                {
                  label: 'Filter by role',
                  value: roleFilter,
                  options: roleOptions,
                  onChange: setRoleFilter,
                },
                {
                  label: 'Filter by status',
                  value: statusFilter,
                  options: statusOptions,
                  onChange: setStatusFilter,
                },
              ]}
            />
            <div css={tableScrollStyles}>
              <table css={tableStyles}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => {
                    const isSelf = user.sub === me.sub;
                    return (
                      <tr key={user.sub}>
                        <td>
                          {user.name}{' '}
                          {isSelf && <span css={youStyles}>(you)</span>}
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <select
                            css={selectStyles}
                            aria-label={`Role for ${user.email}`}
                            value={user.role}
                            disabled={isSelf || updateUser.isPending}
                            onChange={(event) =>
                              updateUser.mutate({
                                sub: user.sub,
                                role: event.currentTarget.value as Role,
                              })
                            }
                          >
                            <option value="member">Member</option>
                            <option value="creator">Creator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          {user.status === 'revoked' ? (
                            <Badge tone="error">Revoked</Badge>
                          ) : (
                            <Badge>Active</Badge>
                          )}
                        </td>
                        <td>{formatRecordedAt(user.createdAt)}</td>
                        <td>
                          {!isSelf && (
                            <div css={actionsStyles}>
                              <Button
                                small
                                onClick={() => setStatusTarget(user)}
                              >
                                {user.status === 'revoked'
                                  ? 'Re-enable'
                                  : 'Revoke'}
                              </Button>
                              <Button
                                small
                                danger
                                onClick={() => setDeleteTarget(user)}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={6} css={{ color: lead.rgb }}>
                        {(items ?? []).length === 0
                          ? 'Nobody has signed in yet.'
                          : 'No users match'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {statusTarget && (
        <Modal
          label={
            statusTarget.status === 'revoked'
              ? `Re-enable ${statusTarget.email}`
              : `Revoke ${statusTarget.email}`
          }
          onClose={() => setStatusTarget(undefined)}
        >
          <h2 css={modalTitleStyles}>
            {statusTarget.status === 'revoked' ? 'Re-enable' : 'Revoke'}{' '}
            {statusTarget.email}?
          </h2>
          <p css={modalBodyStyles}>
            {statusTarget.status === 'revoked'
              ? 'They will be able to sign in and use ASAP Demos again.'
              : 'They will be signed out of ASAP Demos and blocked from every page until you re-enable them.'}
          </p>
          <div css={modalActionsStyles}>
            <Button onClick={() => setStatusTarget(undefined)}>Cancel</Button>
            <Button
              primary={statusTarget.status === 'revoked'}
              danger={statusTarget.status !== 'revoked'}
              disabled={updateUser.isPending}
              onClick={confirmStatus}
            >
              {statusTarget.status === 'revoked' ? 'Re-enable' : 'Revoke'}
            </Button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          label={`Delete ${deleteTarget.email}`}
          onClose={() => setDeleteTarget(undefined)}
        >
          <h2 css={dangerTitleStyles}>Delete {deleteTarget.email}?</h2>
          <p css={modalBodyStyles}>
            Their account and their invite will be removed, so they will need a
            new invite to come back.
          </p>
          <div css={dangerNoticeStyles}>
            Videos they uploaded are not affected and stay in the library.
          </div>
          <div css={modalActionsStyles}>
            <Button onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
            <Button
              danger
              disabled={deleteUser.isPending}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Users;
