import { css } from '@emotion/react';

import { Display, Paragraph, Link } from '../atoms';
import {
  vminLinearCalc,
  mobileScreen,
  largeDesktopScreen,
  rem,
  tabletScreen,
} from '../pixels';
import { themedPageMarginStyles } from '../layout';

const verticalPadding = vminLinearCalc(
  mobileScreen,
  36,
  largeDesktopScreen,
  72,
  'px',
);

const styles = css({
  paddingTop: verticalPadding,
  paddingBottom: verticalPadding,

  display: 'grid',
  gridRowGap: rem(12),
  textAlign: 'center',

  [`@media (min-width: ${mobileScreen.width + 1}px)`]: {
    justifyItems: 'center',
  },
});

const tabletAndAbove = css({
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    display: 'none',
  },
});

const NotFoundPage: React.FC<Record<string, never>> = () => (
  <div css={(theme) => [themedPageMarginStyles(theme), styles]}>
    <div>
      <Display styleAsHeading={4}>
        Sorry! We can’t seem to find that page.
      </Display>
      <Paragraph>
        Either something went wrong or that page doesn’t exist anymore.{' '}
        <br css={tabletAndAbove} />
        You can always find the latest info on the Dashboard.
      </Paragraph>
    </div>
    <Link buttonStyle primary href="/">
      Dashboard
    </Link>
  </div>
);

export default NotFoundPage;
