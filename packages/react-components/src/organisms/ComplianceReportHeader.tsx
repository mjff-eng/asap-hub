import React from 'react';
import { css } from '@emotion/react';
import { dashboard } from '@asap-hub/routing';

import { Display, Paragraph } from '../atoms';
import { rem } from '../pixels';
import { paper, steel } from '../colors';
import { contentSidePaddingWithNavigation } from '../layout';
import { Breadcrumbs, BreadcrumbItem } from '../molecules';

const headerStyles = css({
  padding: `${rem(36)} ${contentSidePaddingWithNavigation(8)} ${rem(60)} `,
  background: paper.rgb,
  boxShadow: `0 2px 4px -2px ${steel.rgb}`,
  marginBottom: rem(30),
  display: 'flex',
  justifyContent: 'center',
});

const contentStyles = css({
  display: 'flex',
  flexDirection: 'column',
  maxWidth: rem(800),
  width: '100%',
  justifyContent: 'center',
});

const breadcrumbsStyles = css({
  marginBottom: rem(36),
});

const title = 'Share a Compliance Report';

type ComplianceReportHeaderProps = {
  breadcrumbs?: ReadonlyArray<BreadcrumbItem>;
};

const ComplianceReportHeader: React.FC<ComplianceReportHeaderProps> = ({
  breadcrumbs = [],
}) => (
  <header css={headerStyles}>
    <div css={contentStyles}>
      {breadcrumbs.length > 0 && (
        <div css={breadcrumbsStyles}>
          <Breadcrumbs
            homeHref={dashboard({}).$}
            items={[...breadcrumbs, { label: title }]}
          />
        </div>
      )}
      <Display styleAsHeading={2}>{title}</Display>
      <div>
        <Paragraph noMargin accent="lead">
          Share the compliance report associated with this manuscript.
        </Paragraph>
      </div>
    </div>
  </header>
);

export default ComplianceReportHeader;
