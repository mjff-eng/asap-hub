import { ComponentProps } from 'react';

import SigninForm from './SigninForm';
import { AgreeToTerms } from '../molecules';
import { vminLinearCalc, mobileScreen, largeDesktopScreen } from '../pixels';
import { pageMarginStyles } from '../layout';

const verticalPadding = vminLinearCalc(
  mobileScreen,
  36,
  largeDesktopScreen,
  72,
  'px',
);

type SigninPageProps = ComponentProps<typeof SigninForm> &
  ComponentProps<typeof AgreeToTerms>;
const SigninPage: React.FC<SigninPageProps> = ({ appOrigin, ...props }) => (
  <div
    css={[
      pageMarginStyles.crn,
      {
        boxSizing: 'border-box',
        width: 'max-content',
        maxWidth: '100%',
        paddingTop: verticalPadding,
        paddingBottom: verticalPadding,
        margin: 'auto',
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
