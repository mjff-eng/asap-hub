import { ComponentProps } from 'react';

import NewsPageHeader from './NewsPageHeader';
import PageConstraints from './PageConstraints';

type NewsPageProps = ComponentProps<typeof NewsPageHeader> & {
  children?: React.ReactNode;
};

const NewsPage: React.FC<NewsPageProps> = ({ children, ...props }) => (
  <article>
    <NewsPageHeader {...props} />
    <PageConstraints width="content" as="main">
      {children}
    </PageConstraints>
  </article>
);

export default NewsPage;
