import { ComponentProps } from 'react';
import { css } from '@emotion/react';
import { CRNTagSearchEntities } from '@asap-hub/algolia';

import { Display, MultiSelect, Paragraph } from '../atoms';
import { rem, smallDesktopScreen } from '../pixels';
import { Filter } from '../organisms';
import { searchIcon } from '../icons';
import { noop } from '../utils';
import PageConstraints from './PageConstraints';
import PageInfoContainer from './PageInfoContainer';

const textStyles = css({
  maxWidth: rem(smallDesktopScreen.width),
});

const styles = css({
  display: 'grid',
  gridTemplateColumns: 'auto min-content',
  gridColumnGap: rem(18),
  alignItems: 'center',
  justifySelf: 'center',
  width: '100%',
});

type TagsPageHeaderProps = {
  tags: string[];
  loadTags?: ComponentProps<typeof MultiSelect>['loadOptions'];
  setTags: (tags: string[]) => void;
} & Pick<
  ComponentProps<typeof Filter<CRNTagSearchEntities>>,
  'filters' | 'onChangeFilter' | 'filterOptions'
>;

const TagsPageHeader: React.FC<TagsPageHeaderProps> = ({
  tags,
  setTags,
  filters,
  filterOptions,
  onChangeFilter,
  loadTags = noop,
}) => (
  <header>
    <PageInfoContainer>
      <Display styleAsHeading={2}>Tags Search</Display>
      <div css={textStyles}>
        <Paragraph accent="tertiary">
          Search for all CRN Hub areas that include selected tags (research
          outputs, events, people, projects, teams, tutorials, interest groups,
          working groups and news).
        </Paragraph>
      </div>
    </PageInfoContainer>
    <PageConstraints noPaddingBottom>
      <div role="search" css={styles}>
        <MultiSelect
          noMargin
          leftIndicator={searchIcon}
          noOptionsMessage={() => 'No results found'}
          loadOptions={loadTags}
          onChange={(items) => setTags(items.map(({ value }) => value))}
          values={tags.map((tag) => ({
            label: tag,
            value: tag,
          }))}
          key={`${tags.join('')},${
            filters ? Array.from(filters) : [].join('')
          }`} // Force re-render to refresh default options. (https://github.com/JedWatson/react-select/discussions/5389)
          placeholder="Search for any tags..."
        />
        <Filter
          filters={filters}
          onChangeFilter={onChangeFilter}
          filterOptions={filterOptions}
        />
      </div>
    </PageConstraints>
  </header>
);

export default TagsPageHeader;
