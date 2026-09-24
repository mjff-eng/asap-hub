import { ReactNode } from 'react';
import { css } from '@emotion/react';

import { colour, neutral500 } from '../colors';
import PageConstraints from './PageConstraints';
import { rem } from '../pixels';

type PageInfoContainerProps = {
  children: ReactNode;
  nav?: ReactNode;
  breadcrumbs?: ReactNode;
};

const containerStyles = css({
  background: colour.neutral[0],
  boxShadow: `0 2px 4px -2px ${neutral500.rgb}`,
});

const navContainerStyles = css({
  marginTop: rem(40),
});

// the 48px top padding from PageConstraints is replaced by the design's
// 12px above the breadcrumbs and 48px between them and the page title
const breadcrumbsContainerStyles = css({
  paddingTop: rem(12),
  paddingBottom: rem(48),
});

const PageInfoContainer: React.FC<PageInfoContainerProps> = ({
  children,
  nav,
  breadcrumbs,
}) => (
  <PageConstraints
    unconstrainedStyles={containerStyles}
    as="div"
    noPaddingBottom={!!nav}
    noPaddingTop={!!breadcrumbs}
  >
    {breadcrumbs && <div css={breadcrumbsContainerStyles}>{breadcrumbs}</div>}
    {children}
    <div css={navContainerStyles}>{nav}</div>
  </PageConstraints>
);

export default PageInfoContainer;
