import React, { ComponentProps, useEffect } from 'react';
import { css } from '@emotion/react';

import { ExportButton, ListControls, PageControls } from '../molecules';
import { Headline3, Paragraph } from '../atoms';
import { rem, tabletScreen } from '../pixels';
import { colour } from '../colors';

const headerStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: rem(12),
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: rem(32),
});

const resultsHeaderStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  alignItems: 'center',

  [`@media (max-width: ${tabletScreen.min}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
});

const viewOptionsStyles = css({
  display: 'flex',
  gap: rem(33),
  [`@media (max-width: ${tabletScreen.min}px)`]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
    gap: 0,
  },
});

const mainStyles = css({
  justifySelf: 'stretch',
  display: 'flex',
  flexFlow: 'column',
  gap: rem(32),
  boxSizing: 'border-box',
  maxWidth: '100%',
  // clip only horizontally so upward-opening tooltips are not cropped
  overflowX: 'clip',
});
const pageControlsStyles = css({
  justifySelf: 'center',
});

const iconStyles = css({
  color: colour.foreground.primary,
  display: 'inline-flex',
  svg: {
    width: rem(48),
    height: rem(48),
  },
});

const resultsPaginatorSeparationStyles = css({
  display: 'flex',
  flexFlow: 'column',
  gap: rem(48),
});

type ResultListProps = ComponentProps<typeof PageControls> & {
  readonly icon?: React.ReactElement;
  readonly numberOfItems: number;
  readonly isListView?: boolean;
  readonly exportResults?: () => Promise<void>;
  readonly cardViewHref?: string;
  readonly listViewHref?: string;
  readonly noResultsComponent?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly algoliaIndexName?: string;
};
const ResultList: React.FC<ResultListProps> = ({
  icon,
  numberOfItems,
  isListView = false,
  exportResults,
  cardViewHref,
  listViewHref,
  children,
  noResultsComponent,
  algoliaIndexName,
  ...pageControlsProps
}) => {
  useEffect(() => {
    if (algoliaIndexName) {
      window.dataLayer?.push({ event: 'Hits Viewed' });
    }
  }, [algoliaIndexName, pageControlsProps.currentPageIndex]);
  return (
    <article data-insights-index={algoliaIndexName}>
      {numberOfItems > 0 && (
        <header css={[headerStyles]}>
          <div css={exportResults && resultsHeaderStyles}>
            <strong>
              {numberOfItems} result{numberOfItems === 1 || 's'} found
            </strong>

            <span css={viewOptionsStyles}>
              {cardViewHref && listViewHref && (
                <ListControls
                  isListView={isListView}
                  cardViewHref={cardViewHref}
                  listViewHref={listViewHref}
                />
              )}
              <ExportButton exportResults={exportResults} />
            </span>
          </div>
        </header>
      )}
      {numberOfItems > 0 ? (
        <div css={resultsPaginatorSeparationStyles}>
          <main css={mainStyles}>{children}</main>
          <section css={pageControlsStyles}>
            <PageControls {...pageControlsProps} />
          </section>
        </div>
      ) : (
        noResultsComponent ?? (
          <main css={{ textAlign: 'center' }}>
            {icon && <span css={iconStyles}>{icon}</span>}
            <Headline3>No results have been found.</Headline3>
            <Paragraph accent="neutral900">
              Please double-check your search for any typos or try a different
              search term.
            </Paragraph>
          </main>
        )
      )}
    </article>
  );
};
export default ResultList;
