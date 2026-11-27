import { ComponentProps } from 'react';

import DiscoverPageHeader from './DiscoverPageHeader';
import PageConstraints from './PageConstraints';

type DashboardPageProps = ComponentProps<typeof DiscoverPageHeader> & {
  children?: React.ReactNode;
};

const Dashboard: React.FC<DashboardPageProps> = ({ children }) => (
  <article>
    <DiscoverPageHeader />
    <PageConstraints width="content" as="main">
      {children}
    </PageConstraints>
  </article>
);

export default Dashboard;
