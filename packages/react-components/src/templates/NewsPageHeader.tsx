import { css } from '@emotion/react';
import { ComponentProps } from 'react';
import { NewsFrequency, newsFrequency } from '@asap-hub/model';

import { Display, Paragraph } from '../atoms';
import { rem, smallDesktopScreen } from '../pixels';
import { SearchAndFilter } from '../organisms';
import { Option } from '../organisms/CheckboxGroup';
import PageInfoContainer from './PageInfoContainer';
import PageConstraints from './PageConstraints';

const textStyles = css({
  maxWidth: rem(smallDesktopScreen.width),
});

const newsFilters = [
  { title: 'TYPE OF NEWS' },
  ...newsFrequency.map(
    (frequency): Option<NewsFrequency> => ({
      label: frequency,
      value: frequency,
    }),
  ),
];

type NewsPageHeaderProps = Pick<
  ComponentProps<typeof SearchAndFilter>,
  'filters' | 'onChangeFilter' | 'onChangeSearch' | 'searchQuery'
>;

const NewsPageHeader: React.FC<NewsPageHeaderProps> = ({
  filters,
  onChangeFilter,
  onChangeSearch,
  searchQuery,
}) => (
  <header>
    <PageInfoContainer>
      <Display styleAsHeading={2}>News</Display>
      <div css={textStyles}>
        <Paragraph accent="neutral900">
          Stay up to date with all the latest activity from the CRN. You'll be
          able to access news and newsletters
        </Paragraph>
      </div>
    </PageInfoContainer>
    <PageConstraints noPaddingBottom>
      <SearchAndFilter
        onChangeSearch={onChangeSearch}
        searchPlaceholder="Enter news title, keyword, ..."
        searchQuery={searchQuery}
        onChangeFilter={onChangeFilter}
        filterOptions={newsFilters}
        filters={filters}
      />
    </PageConstraints>
  </header>
);

export default NewsPageHeader;
