import { css } from '@emotion/react';

import { Display, Paragraph } from '../atoms';
import { mobileScreen, rem, smallDesktopScreen } from '../pixels';
import { noop } from '../utils';
import ResearchOutputsSearch from './ResearchOutputsSearch';
import PageInfoContainer from './PageInfoContainer';
import PageConstraints from './PageConstraints';

const textStyles = css({
  display: 'grid',
  columnGap: rem(39),
  rowGap: rem(9),
  [`@media (min-width: ${mobileScreen.max}px)`]: {
    gridTemplateColumns: `minmax(auto, ${smallDesktopScreen.width}px) auto`,
  },
});

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
    <PageInfoContainer>
      <Display styleAsHeading={2}>Shared Research</Display>
      <div css={textStyles}>
        <Paragraph accent="neutral900">
          This page contains all shared research outputs. As grantees begin to
          share more items, this library will grow. Grantees should be mindful
          to respect intellectual boundaries and not share private outputs
          outside of the Network.
        </Paragraph>
      </div>
    </PageInfoContainer>

    <PageConstraints noPaddingBottom>
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
