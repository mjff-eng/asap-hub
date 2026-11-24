import { Display, Paragraph } from '../atoms';
import { noop } from '../utils';
import ResearchOutputsSearch from './ResearchOutputsSearch';
import PageInfoContainer from './PageInfoContainer';
import PageConstraints from './PageConstraints';
import { pageHeaderTextStyles } from '../layout';

type SharedResearchPageHeaderProps = {
  onChangeSearch?: (newQuery: string) => void;
  searchQuery: string;
  onChangeFilter?: (filters: string) => void;
  filters: Set<string>;
};

const SharedResearchPageHeader: React.FC<SharedResearchPageHeaderProps> = ({
  onChangeSearch = noop,
  searchQuery,
  filters,
  onChangeFilter = noop,
}) => (
  <header>
    <PageInfoContainer width="content">
      <Display>Shared Research</Display>
      <div css={pageHeaderTextStyles}>
        <Paragraph accent="tertiary">
          This page contains all shared research outputs. As grantees begin to
          share more items, this library will grow. Grantees should be mindful
          to respect intellectual boundaries and not share private outputs
          outside of the Network.
        </Paragraph>
      </div>
    </PageInfoContainer>

    <PageConstraints width="content" noPaddingBottom>
      <ResearchOutputsSearch
        onChangeSearch={onChangeSearch}
        searchQuery={searchQuery}
        onChangeFilter={onChangeFilter}
        filters={filters}
      />
    </PageConstraints>
  </header>
);

export default SharedResearchPageHeader;
