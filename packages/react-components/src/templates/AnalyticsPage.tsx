import { ComponentProps } from 'react';
import { css } from '@emotion/react';

import AnalyticsPageHeader from './AnalyticsPageHeader';
import AnalyticsMobilePage from './AnalyticsMobilePage';
import { mediaBelow, mediaFrom } from '../layout';
import PageConstraints from './PageConstraints';

const pageMobileStyles = css({
  [mediaFrom.tablet]: {
    display: 'none',
  },
});
const pageDesktopStyles = css({
  [mediaBelow.tablet]: {
    display: 'none',
  },
});

type AnalyticsPageProps = ComponentProps<typeof AnalyticsPageHeader>;

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  children,
  onExportAnalytics,
}) => (
  <article>
    <div css={pageDesktopStyles}>
      <AnalyticsPageHeader onExportAnalytics={onExportAnalytics} />
      <PageConstraints as="main">{children}</PageConstraints>
    </div>
    <div css={pageMobileStyles}>
      <AnalyticsMobilePage />
    </div>
  </article>
);

export default AnalyticsPage;
