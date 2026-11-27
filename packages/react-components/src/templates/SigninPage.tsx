import { ComponentProps } from 'react';

import SigninForm from './SigninForm';
import { AgreeToTerms } from '../molecules';
import { remUnit } from '../pixels';
import { mediaFrom, themedPageMarginStyles } from '../layout';

type SigninPageProps = ComponentProps<typeof SigninForm> &
  ComponentProps<typeof AgreeToTerms>;
const SigninPage: React.FC<SigninPageProps> = ({ appOrigin, ...props }) => (
  <div
    css={(theme) => [
      themedPageMarginStyles(theme),
      {
        boxSizing: 'border-box',
        width: 'max-content',
        maxWidth: '100%',
        paddingTop: remUnit(36),
        paddingBottom: remUnit(36),
        margin: 'auto',
        [mediaFrom.tablet]: {
          paddingTop: remUnit(72),
          paddingBottom: remUnit(72),
        },
      },
    ]}
  >
    <div css={{ width: 'max-content', maxWidth: '100%' }}>
      <SigninForm {...props} />
    </div>
    {props.signup && (
      <footer css={{ width: 0, minWidth: '100%' }}>
        <AgreeToTerms appOrigin={appOrigin} />
      </footer>
    )}
  </div>
);

export default SigninPage;
