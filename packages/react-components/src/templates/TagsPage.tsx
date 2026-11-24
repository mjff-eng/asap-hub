import { ComponentProps } from 'react';

import TagsPageHeader from './TagsPageHeader';
import PageConstraints from './PageConstraints';

const TagsPage: React.FC<
  ComponentProps<typeof TagsPageHeader> & { children?: React.ReactNode }
> = ({ children, ...props }) => (
  <article>
    <TagsPageHeader {...props} />
    <PageConstraints width="content" as="main">
      {children}
    </PageConstraints>
  </article>
);

export default TagsPage;
