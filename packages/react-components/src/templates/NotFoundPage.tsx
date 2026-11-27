import { css } from '@emotion/react';

import { Display, Paragraph, Link } from '../atoms';
import { rem, remUnit } from '../pixels';
import { mediaBelow, mediaFrom, themedPageMarginStyles } from '../layout';

const styles = css({
  paddingTop: remUnit(36),
  paddingBottom: remUnit(36),

  display: 'grid',
  gridRowGap: rem(12),
  textAlign: 'center',

  [mediaFrom.tablet]: {
    paddingTop: remUnit(72),
    paddingBottom: remUnit(72),
    justifyItems: 'center',
  },
});

const tabletAndAbove = css({
  [mediaBelow.tablet]: {
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
