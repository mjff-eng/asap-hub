import { css } from '@emotion/react';

import { BannerCard } from '../molecules';
import { Display, Paragraph, Link } from '../atoms';
import { rem } from '../pixels';
import { contentSidePaddingWithoutNavigation } from '../layout';

const styles = css({
  height: '100%',
  padding: `${rem(24)} ${contentSidePaddingWithoutNavigation()}`,
  maxWidth: rem(480),

  display: 'grid',
  alignItems: 'center',
});

const UnsupportedBrowserPage: React.FC<Record<string, never>> = () => (
  <div css={styles}>
    <BannerCard type="warning">
      <Display styleAsHeading={2}>Browser not supported</Display>
      <Paragraph accent="tertiary">
        Unfortunately, ASAP Hub is not available on the browser you are using.
        Please ensure you are using the latest version of a supported browser (
        <Link href="https://www.google.com/chrome/">Google Chrome</Link>,{' '}
        <Link href="https://www.apple.com/safari/">Safari</Link>,{' '}
        <Link href="https://www.microsoft.com/edge">Edge</Link> or{' '}
        <Link href="https://www.mozilla.org/firefox">Firefox</Link>)
      </Paragraph>
    </BannerCard>
  </div>
);

export default UnsupportedBrowserPage;
