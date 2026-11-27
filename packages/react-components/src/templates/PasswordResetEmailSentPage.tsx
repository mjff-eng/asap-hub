import { css } from '@emotion/react';

import { mediaFrom, themedPageMarginStyles } from '../layout';
import { Display, Link, Paragraph } from '../atoms';
import { rem, remUnit } from '../pixels';
import { BannerCard } from '../molecules';

const layoutStyles = css({
  flexGrow: 1,
  alignSelf: 'stretch',
  paddingTop: rem(24),
  paddingBottom: rem(24),

  display: 'grid',
  justifyContent: 'center',
  alignContent: 'center',
  gridTemplateColumns: `min(${remUnit(384)}, 100%)`,
  [mediaFrom.laptop]: {
    gridTemplateColumns: `min(${remUnit(415)}, 100%)`,
  },
});

interface PasswordResetEmailSentPageProps {
  signInHref: string;
}
const PasswordResetEmailSentPage: React.FC<PasswordResetEmailSentPageProps> = ({
  signInHref,
}) => (
  <div css={(theme) => [themedPageMarginStyles(theme), layoutStyles]}>
    <BannerCard type="success">
      <Display styleAsHeading={4}>Email sent!</Display>
      <Paragraph accent="tertiary">
        Check your inbox for an email link
      </Paragraph>
      <Link href={signInHref} buttonStyle primary>
        Back to sign in
      </Link>
    </BannerCard>
  </div>
);

export default PasswordResetEmailSentPage;
