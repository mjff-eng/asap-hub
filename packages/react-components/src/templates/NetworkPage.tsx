import { ComponentProps } from 'react';

import NetworkPageHeader from './NetworkPageHeader';
import PageConstraints from './PageConstraints';

const NetworkPage: React.FC<
  ComponentProps<typeof NetworkPageHeader> & { children?: React.ReactNode }
> = ({ children, ...props }) => (
  <article>
    <NetworkPageHeader {...props} />
    <PageConstraints width="content" as="main">
      {children}
    </PageConstraints>
  </article>
);

export default NetworkPage;
