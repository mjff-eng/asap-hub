/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, ReactNode } from 'react';

import { useMe } from '../api/hooks';
import { isNotInvited, isRevoked } from '../api/client';
import { Button, Card, Headline, Spinner } from '../ui/components';
import { charcoal, lead, pearl, rem, steel } from '../ui/theme';
import { useAuth } from './AuthProvider';
import { MeContext } from './MeContext';

const screenStyles = css({
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: rem(24),
  backgroundColor: pearl.rgb,
});

const panelStyles = css({
  width: '100%',
  maxWidth: rem(440),
  padding: rem(40),
  display: 'grid',
  gap: rem(16),
  justifyItems: 'start',
});

const markStyles = css({
  display: 'inline-block',
  fontSize: rem(12),
  fontWeight: 'bold',
  letterSpacing: rem(1.5),
  textTransform: 'uppercase',
  color: lead.rgb,
  paddingBottom: rem(8),
  borderBottom: `2px solid ${steel.rgb}`,
});

const bodyStyles = css({ color: lead.rgb, margin: 0 });

const emailStyles = css({ color: charcoal.rgb, fontWeight: 'bold' });

const AuthGate: FC<{ readonly children: ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated, user, login, logout } = useAuth();
  const me = useMe(isAuthenticated);

  if (isLoading) {
    return (
      <div css={screenStyles}>
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div css={screenStyles}>
        <Card overrideStyles={panelStyles}>
          <span css={markStyles}>ASAP</span>
          <Headline level={2}>ASAP Demos</Headline>
          <p css={bodyStyles}>
            Sprint demo recordings, chaptered so you can jump straight to what
            you care about.
          </p>
          <Button
            primary
            onClick={() => {
              void login();
            }}
          >
            Sign in
          </Button>
        </Card>
      </div>
    );
  }

  if (me.isLoading) {
    return (
      <div css={screenStyles}>
        <Spinner label="Loading your account" />
      </div>
    );
  }

  if (me.isError && isRevoked(me.error)) {
    return (
      <div css={screenStyles}>
        <Card overrideStyles={panelStyles}>
          <span css={markStyles}>ASAP</span>
          <Headline level={2}>Your account is disabled</Headline>
          <p css={bodyStyles}>
            Access for{' '}
            <span css={emailStyles}>{user?.email ?? 'your account'}</span> has
            been turned off. Contact an admin if you think this is a mistake.
          </p>
          <Button onClick={logout}>Sign out</Button>
        </Card>
      </div>
    );
  }

  if (me.isError && isNotInvited(me.error)) {
    return (
      <div css={screenStyles}>
        <Card overrideStyles={panelStyles}>
          <span css={markStyles}>ASAP</span>
          <Headline level={2}>You are not invited yet</Headline>
          <p css={bodyStyles}>
            You are signed in as{' '}
            <span css={emailStyles}>{user?.email ?? 'an unknown account'}</span>
            , but that address has not been invited to ASAP Demos. Ask a creator
            to invite it, then sign in again.
          </p>
          <Button onClick={logout}>Sign out</Button>
        </Card>
      </div>
    );
  }

  if (me.isError || !me.data) {
    return (
      <div css={screenStyles}>
        <Card overrideStyles={panelStyles}>
          <Headline level={2}>Something went wrong</Headline>
          <p css={bodyStyles}>
            We could not load your account. Try again in a moment.
          </p>
          <Button
            onClick={() => {
              void me.refetch();
            }}
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return <MeContext.Provider value={me.data}>{children}</MeContext.Provider>;
};

export default AuthGate;
