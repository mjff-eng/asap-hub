import { useRef } from 'react';
import { css } from '@emotion/react';

import { Display, Paragraph, Button } from '../atoms';
import { LabeledTextField } from '../molecules';
import { noop } from '../utils';
import {
  vminLinearCalc,
  mobileScreen,
  largeDesktopScreen,
  formTargetWidth,
  rem,
} from '../pixels';
import { contentSidePaddingWithoutNavigation } from '../layout';
import { neutral900 } from '../colors';

const styles = css({
  width: 'max-content',
  maxWidth: '100%',

  boxSizing: 'border-box',
  padding: `${vminLinearCalc(
    mobileScreen,
    36,
    largeDesktopScreen,
    72,
    'px',
  )} ${contentSidePaddingWithoutNavigation()}`,

  display: 'grid',
  gridTemplateColumns: '100%',
  gridRowGap: `${vminLinearCalc(
    mobileScreen,
    12,
    largeDesktopScreen,
    24,
    'px',
  )}`,

  textAlign: 'center',
});

const textStyles = css({
  maxWidth: rem(640),
});

const formStyles = css({
  width: rem(formTargetWidth),
  maxWidth: '100%',
  display: 'grid',
  justifySelf: 'center',
});

interface ForgotPasswordPageProps {
  email: string;
  onChangeEmail?: (newEmail: string) => void;

  onSubmit?: () => void;
  customValidationMessage?: string;

  onGoBack?: () => void;
}
const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  email,
  onChangeEmail = noop,

  onSubmit = noop,
  customValidationMessage,

  onGoBack = noop,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div css={styles}>
      <div css={textStyles}>
        <Display styleAsHeading={2}>Forgot Password</Display>
        <Paragraph primary>
          <strong>We’ll send you a password reset link</strong>
          <br />
          <span css={{ color: neutral900.rgb }}>
            You might have set up your account with Google or Orcid. Please
            check if you are able to log in with any of those log in methods
            before resetting your password.
          </span>
        </Paragraph>
      </div>
      <form autoComplete="on" ref={formRef} css={formStyles}>
        <LabeledTextField
          type="email"
          title="Email"
          value={email}
          onChange={onChangeEmail}
          customValidationMessage={customValidationMessage}
        />
        <Button
          primary
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            if (formRef.current!.reportValidity()) {
              onSubmit();
            }
          }}
        >
          Send reset link
        </Button>
        <Button onClick={onGoBack}>Back</Button>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
