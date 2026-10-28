import { css } from '@emotion/react';

import { rem } from '../pixels';
import { Display } from '../atoms';
import PageConstraints from './PageConstraints';

const headerStyles = css({
  paddingBottom: rem(9),
});

type DashboardPageProps = {
  readonly firstName?: string;
  readonly children?: React.ReactNode;
};

const Dashboard: React.FC<DashboardPageProps> = ({ firstName, children }) => (
  <PageConstraints as="article">
    <div css={headerStyles}>
      <Display styleAsHeading={3}>{`Welcome to the Hub${
        firstName ? `, ${firstName}` : ''
      }!`}</Display>
    </div>
    {children}
  </PageConstraints>
);

export default Dashboard;
