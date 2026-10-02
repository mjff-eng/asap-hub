import { staticPages } from '@asap-hub/routing';

import { Paragraph, Link } from '../atoms';

interface AgreeToTermsProps {
  readonly appOrigin: string;
}
const AgreeToTerms: React.FC<AgreeToTermsProps> = ({ appOrigin }) => (
  <Paragraph accent="tertiary">
    By proceeding, you are agreeing to the{' '}
    <Link href={new URL(staticPages({}).terms({}).$, appOrigin).toString()}>
      Terms and Conditions
    </Link>{' '}
    and confirm that you have read our{' '}
    <Link
      href={new URL(staticPages({}).privacyPolicy({}).$, appOrigin).toString()}
    >
      Privacy Notice
    </Link>
    .
  </Paragraph>
);

export default AgreeToTerms;
