import { ComponentProps } from 'react';

import SharedResearchPageHeader from './SharedResearchPageHeader';
import PageConstraints from './PageConstraints';

type SharedResearchPageProps = ComponentProps<
  typeof SharedResearchPageHeader
> & {
  children?: React.ReactNode;
};
const SharedResearchPage: React.FC<SharedResearchPageProps> = ({
  onChangeSearch,
  searchQuery,
  children,
  onChangeFilter,
  filters,
}) => (
  <article>
    <SharedResearchPageHeader
      onChangeSearch={onChangeSearch}
      searchQuery={searchQuery}
      onChangeFilter={onChangeFilter}
      filters={filters}
    />
    <PageConstraints width="content" as="main">
      {children}
    </PageConstraints>
  </article>
);

export default SharedResearchPage;
