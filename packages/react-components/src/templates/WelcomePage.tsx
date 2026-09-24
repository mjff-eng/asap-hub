import { css, Global } from '@emotion/react';
import { ComponentProps } from 'react';

import { Anchor, Link, Paragraph } from '../atoms';
import { backgroundNeuronsImage } from '../images';
import { mailToSupport } from '../mail';
import { Toast, WelcomeCard } from '../organisms';
import { rem } from '../pixels';
import { themes } from '../theme';
import { noop } from '../utils';

const defaultValues = {
  signup: {
    title: 'Join the CRN Hub',
    content: 'Activate your account and start exploring the ASAP CRN Network.',
    buttonText: 'Activate account',
    footer: () => (
      <Paragraph accent="neutral900">
        By proceeding you are agreeing to our{' '}
        <Link href="/terms-and-conditions">Terms and Conditions</Link> and{' '}
        <Link href="/privacy-notice">Privacy Notice</Link>.
      </Paragraph>
    ),
  },
  welcome: {
    title: 'Welcome to the CRN Hub',
    content:
      'A private, invite-only network where the ASAP CRN community collaborates.',
    buttonText: 'Sign in',
    footer: () => (
      <Paragraph accent="neutral900">
        By signing in you are agreeing to our{' '}
        <Link href="/terms-and-conditions">Terms and Conditions</Link> and{' '}
        <Link href="/privacy-notice">Privacy Notice</Link>.
      </Paragraph>
    ),
  },
};

const rootStyles = {
  'html, body, #root': {
    height: '100%',
  },
} as const;

const containerStyles = css({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',

  backgroundImage: `url(${backgroundNeuronsImage})`,
  backgroundPosition: 'center',
  backgroundSize: 'cover',
});
const bodyStyles = css({
  flexGrow: 1,

  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignContent: 'center',
  alignItems: 'center',
});

const welcomeStyles = css({
  flexBasis: '100%',
  order: 2,

  margin: rem(12),
  display: 'flex',
  justifyContent: 'center',
});

const placeholderStyles = css({
  order: 4,
});

type WelcomeCopy = {
  title: string;
  content: string;
  buttonText: string;
  footer?: () => JSX.Element;
};

type WelcomePageProps = Pick<ComponentProps<typeof WelcomeCard>, 'onClick'> & {
  readonly allowSignup?: boolean;
  readonly authFailed?: 'alumni' | 'invalid';
  readonly supportEmail?: string;
  readonly onCloseAuthFailedToast?: () => void;
  readonly values?: { signup: WelcomeCopy; welcome: WelcomeCopy };
};

const WelcomePage: React.FC<WelcomePageProps> = ({
  allowSignup = false,
  authFailed,
  onCloseAuthFailedToast = noop,
  values = defaultValues,
  supportEmail,
  ...props
}) => {
  const copy = allowSignup ? values.signup : values.welcome;

  return (
    <div css={[themes.dark, containerStyles]}>
      <Global styles={rootStyles} />
      {authFailed && (
        <Toast onClose={onCloseAuthFailedToast}>
          {authFailed === 'alumni'
            ? 'As an Alumni user, you no longer have access to this account. Please contact '
            : 'There was a problem with your account. If this issue persists, please contact '}
          <Anchor
            href={mailToSupport({
              email: supportEmail,
            })}
          >
            <span css={{ textDecoration: 'underline' }}>ASAP Support</span>
          </Anchor>
          {authFailed === 'alumni' ? ' for further assistance.' : '.'}
        </Toast>
      )}
      <div css={bodyStyles}>
        <main css={welcomeStyles}>
          <WelcomeCard
            title={copy.title}
            content={copy.content}
            buttonText={copy.buttonText}
            {...props}
          >
            {copy.footer && copy.footer()}
          </WelcomeCard>
        </main>
        <div css={placeholderStyles} />
      </div>
    </div>
  );
};

export default WelcomePage;
