/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { ApiError } from '../api/client';
import { useCancelInvite, useCreateInvite, useInvites } from '../api/hooks';
import type { Invite, Role } from '../api/types';
import { useIsAdmin, useIsCreator } from '../auth/MeContext';
import { PageHeading, SectionHeading } from '../layout/PageHeading';
import { Badge, Button, Card, Modal, Spinner } from '../ui/components';
import { TableFilters } from '../ui/TableFilters';
import {
  charcoal,
  ember,
  fern,
  lead,
  paper,
  pine,
  rem,
  silver,
  steel,
} from '../ui/theme';
import { roleLabel } from '../utils/format';
import { formatRecordedAt } from '../utils/time';
import { useDebounced } from '../utils/useDebounced';

const formStyles = css({
  padding: rem(24),
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: rem(12),
});

const fieldStyles = css({
  display: 'grid',
  gap: rem(4),
  flexGrow: 1,
  minWidth: rem(200),
});

const labelStyles = css({
  fontSize: rem(13),
  fontWeight: 'bold',
  color: lead.rgb,
});

const controlStyles = css({
  fontFamily: 'inherit',
  fontSize: rem(15),
  color: charcoal.rgb,
  padding: `${rem(10)} ${rem(12)}`,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(4),
  backgroundColor: paper.rgb,
});

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
  },
  th: {
    fontSize: rem(12),
    letterSpacing: rem(1.2),
    textTransform: 'uppercase' as const,
    color: lead.rgb,
    borderTop: 'none',
  },
});

const errorStyles = css({ color: ember.rgb, fontSize: rem(14), margin: 0 });

const successStyles = css({ color: fern.rgb, fontSize: rem(14), margin: 0 });

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
  { value: 'pending', label: 'Pending' },
  { value: 'claimed', label: 'Claimed' },
];

const Invites: FC = () => {
  const isCreator = useIsCreator();
  const isAdmin = useIsAdmin();
  const invites = useInvites();
  const createInvite = useCreateInvite();
  const cancelInvite = useCancelInvite();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState<Invite | undefined>();
  const [sent, setSent] = useState<string>();
  const [cancelled, setCancelled] = useState<string>();
  const debouncedQuery = useDebounced(query);

  const items = invites.data;
  // a refetch after a failure never re-enters isLoading, so the spinner has to
  // cover the retry as well or the stale error just sits there
  const isLoadingList =
    invites.isLoading || (invites.isError && invites.isFetching);
  const hasListError = invites.isError && !invites.isFetching;
  const isForbidden =
    invites.error instanceof ApiError && invites.error.status === 403;
  // the one you just sent is the one you came to look at, so it goes on top
  const visible = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    return (items ?? [])
      .filter((invite) => {
        if (needle && !invite.email.toLowerCase().includes(needle))
          return false;
        if (roleFilter !== 'all' && invite.role !== roleFilter) return false;
        const status = invite.claimedBy ? 'claimed' : 'pending';
        if (statusFilter !== 'all' && status !== statusFilter) return false;
        return true;
      })
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) ||
          a.email.localeCompare(b.email),
      );
  }, [items, debouncedQuery, roleFilter, statusFilter]);

  if (!isCreator) {
    return (
      <Card overrideStyles={panelStyles}>
        <PageHeading size={3}>Only creators can manage invites</PageHeading>
        <p css={{ color: lead.rgb, margin: 0 }}>
          Ask a creator to invite somebody for you.
        </p>
        <Link to="/" css={{ color: pine.rgb }}>
          Back to demos
        </Link>
      </Card>
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email) return;
    createInvite.mutate(
      { email, role },
      {
        onSuccess: () => {
          setEmail('');
          setCancelled(undefined);
          setSent(email);
        },
      },
    );
  };

  // a failure that stays on screen while the admin goes on to do something else
  // reads as though that other thing failed
  const changeEmail = (next: string) => {
    if (createInvite.isError) {
      createInvite.reset();
    }
    setSent(undefined);
    setEmail(next);
  };

  return (
    <>
      <div css={pageHeaderStyles}>
        <PageHeading>Invites</PageHeading>
        {isAdmin && (
          <Link to="/users" css={crossLinkStyles}>
            Manage users
          </Link>
        )}
      </div>
      <div css={{ height: rem(16) }} />

      <Card>
        <form css={formStyles} onSubmit={onSubmit}>
          <label css={fieldStyles}>
            <span css={labelStyles}>Email address</span>
            <input
              css={controlStyles}
              type="email"
              required
              value={email}
              onChange={(event) => changeEmail(event.currentTarget.value)}
            />
          </label>
          <label css={fieldStyles}>
            <span css={labelStyles}>Role</span>
            <select
              css={controlStyles}
              value={role}
              onChange={(event) => setRole(event.currentTarget.value as Role)}
            >
              <option value="member">Member</option>
              <option value="creator">Creator</option>
              {isAdmin && <option value="admin">Admin</option>}
            </select>
          </label>
          <Button primary type="submit" disabled={createInvite.isPending}>
            {createInvite.isPending ? 'Inviting' : 'Send invite'}
          </Button>
        </form>
        {sent && !createInvite.isError && (
          <p
            role="status"
            css={[successStyles, { padding: `0 ${rem(24)} ${rem(24)}` }]}
          >
            Invite sent to {sent}.
          </p>
        )}
        {createInvite.isError && (
          <p
            role="alert"
            css={[errorStyles, { padding: `0 ${rem(24)} ${rem(24)}` }]}
          >
            {createInvite.error instanceof ApiError &&
            createInvite.error.code === 'already_invited'
              ? 'That person has already accepted an invite, so they have an account already. Change their role from the users page.'
              : 'We could not send that invite. Check the address and try again.'}
          </p>
        )}
      </Card>

      <div css={{ height: rem(24) }} />

      <Card>
        {isLoadingList && <Spinner label="Loading invites" />}
        {hasListError &&
          (isForbidden ? (
            <div css={panelStyles}>
              <SectionHeading>You can no longer manage invites</SectionHeading>
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
              <SectionHeading>We could not load the invites</SectionHeading>
              <p css={{ color: lead.rgb, margin: 0 }}>
                The list did not load, so this does not mean nobody has been
                invited. Try again in a moment.
              </p>
              <Button
                onClick={() => {
                  void invites.refetch();
                }}
              >
                Retry
              </Button>
            </div>
          ))}
        {!isLoadingList && !hasListError && (
          <>
            <TableFilters
              searchLabel="Search invites"
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
            {cancelled && !cancelInvite.isError && (
              <p
                role="status"
                css={[successStyles, { padding: `0 ${rem(24)} ${rem(16)}` }]}
              >
                The invitation to {cancelled} was cancelled.
              </p>
            )}
            {cancelInvite.isError && (
              <p css={[errorStyles, { padding: `0 ${rem(24)} ${rem(16)}` }]}>
                We could not cancel that invite. Try again in a moment.
              </p>
            )}
            <div css={tableScrollStyles}>
              <table css={tableStyles}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Invited</th>
                    <th>Status</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((invite) => (
                    <tr key={invite.email}>
                      <td>{invite.email}</td>
                      <td>{roleLabel(invite.role)}</td>
                      <td>{formatRecordedAt(invite.createdAt)}</td>
                      <td>
                        {invite.claimedBy ? (
                          <Badge>Claimed</Badge>
                        ) : (
                          <Badge tone="warning">Pending</Badge>
                        )}
                      </td>
                      {isAdmin && (
                        <td>
                          {!invite.claimedBy && (
                            <Button
                              small
                              onClick={() => setCancelTarget(invite)}
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} css={{ color: lead.rgb }}>
                        {(items ?? []).length === 0
                          ? 'Nobody has been invited yet.'
                          : 'No invites match'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {cancelTarget && (
        <Modal
          label={`Cancel the invitation to ${cancelTarget.email}`}
          onClose={() => setCancelTarget(undefined)}
        >
          <h2 css={modalTitleStyles}>Cancel {cancelTarget.email}?</h2>
          <p css={modalBodyStyles}>
            The invitation to {cancelTarget.email} will be withdrawn; the link
            in their email will stop granting access.
          </p>
          <div css={modalActionsStyles}>
            <Button onClick={() => setCancelTarget(undefined)}>Keep</Button>
            <Button
              danger
              disabled={cancelInvite.isPending}
              onClick={() =>
                cancelInvite.mutate(cancelTarget.email, {
                  onSuccess: () => {
                    setSent(undefined);
                    setCancelled(cancelTarget.email);
                    setCancelTarget(undefined);
                  },
                })
              }
            >
              Cancel invite
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Invites;
