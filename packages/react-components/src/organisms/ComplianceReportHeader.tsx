import React from 'react';
import { css } from '@emotion/react';

import { Display, Paragraph } from '../atoms';
import { rem } from '../pixels';
import { colour } from '../colors';
import { contentSidePaddingWithNavigation } from '../layout';

const headerStyles = css({
  padding: `${rem(36)} ${contentSidePaddingWithNavigation(8)} ${rem(60)} `,
  background: colour.neutral[0],
  boxShadow: `0 2px 4px -2px ${colour.neutral[100]}`,
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

const ComplianceReportHeader: React.FC = () => (
  <header css={headerStyles}>
    <div css={contentStyles}>
      <Display styleAsHeading={2}>Share a Compliance Report</Display>
      <div>
        <Paragraph noMargin accent="tertiary">
          Share the compliance report associated with this manuscript.
        </Paragraph>
      </div>
    </div>
  </header>
);

export default ComplianceReportHeader;
