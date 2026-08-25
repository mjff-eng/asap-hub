import { css } from '@emotion/react';

import { Display, Link, Paragraph } from '../atoms';
import { charcoal } from '../colors';
import { LockIcon } from '../icons';
import { contentSidePaddingWithNavigation } from '../layout';
import {
  largeDesktopScreen,
  mobileScreen,
  rem,
  vminLinearCalc,
} from '../pixels';

const styles = css({
  padding: `${vminLinearCalc(
    mobileScreen,
    36,
    largeDesktopScreen,
    72,
    'px',
  )} ${contentSidePaddingWithNavigation()}`,

  display: 'grid',
  gridRowGap: rem(12),
  textAlign: 'center',
  maxWidth: rem(664),
  margin: '0 auto',

  [`@media (min-width: ${mobileScreen.width + 1}px)`]: {
    justifyItems: 'center',
  },
});

const iconStyles = css({
  svg: { width: 48, height: 48 },
});

const ManuscriptWorkspaceUnavailablePage: React.FC<
  Record<string, never>
> = () => (
  <div css={styles}>
    <span css={iconStyles}>
      <LockIcon color={charcoal.rgb} />
    </span>
    <div>
      <Display styleAsHeading={2}>You can't access this manuscript.</Display>
      <Paragraph accent="neutral900" noMargin>
        Access to a manuscript comes from being part of the project that owns
        it, or from a project of yours that is collaborating on it. Neither
        applies to you right now, so it is not available.
      </Paragraph>
      <Paragraph accent="neutral900" noMargin>
        If you think this is wrong, contact your Project Manager.
      </Paragraph>
    </div>
    <Link buttonStyle primary href="/">
      Return to Dashboard
    </Link>
  </div>
);

export default ManuscriptWorkspaceUnavailablePage;
