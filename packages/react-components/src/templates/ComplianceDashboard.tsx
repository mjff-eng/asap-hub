import { css } from '@emotion/react';
import { ComponentProps } from 'react';

import { article, PageControls, TeamIcon } from '..';
import { Headline3, Paragraph } from '../atoms';
import { ComplianceTable } from '../organisms';
import { rem } from '../pixels';
import { neutral1000 } from '../colors';

const pageControlsStyles = css({
  justifySelf: 'center',
  paddingTop: rem(36),
  paddingBottom: rem(36),
});

const noResultsIconStyles = css({
  display: 'inline-flex',
  svg: {
    width: rem(48),
    height: rem(48),
    stroke: neutral1000.hex,
  },
});

const iconStyles = css({
  display: 'inline-flex',
  svg: {
    width: rem(48),
    height: rem(48),
    path: {
      fill: neutral1000.hex,
    },
  },
});

type ComplianceDashboardProps = ComponentProps<typeof PageControls> &
  Pick<
    ComponentProps<typeof ComplianceTable>,
    | 'onUpdateManuscript'
    | 'getAssignedUsersSuggestions'
    | 'isComplianceReviewer'
    | 'data'
    | 'sort'
    | 'sortingDirection'
    | 'setSort'
    | 'setSortingDirection'
  > & {
    hasAppliedFilters: boolean;
  };

const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  hasAppliedFilters,
  isComplianceReviewer,
  data,
  sort,
  sortingDirection,
  setSort,
  setSortingDirection,
  onUpdateManuscript,
  getAssignedUsersSuggestions,
  ...pageControlsProps
}) => (
  <article>
    {data.length > 0 ? (
      <main css={{ paddingTop: rem(32) }}>
        <ComplianceTable
          isComplianceReviewer={isComplianceReviewer}
          data={data}
          sort={sort}
          sortingDirection={sortingDirection}
          setSort={setSort}
          setSortingDirection={setSortingDirection}
          onUpdateManuscript={onUpdateManuscript}
          getAssignedUsersSuggestions={getAssignedUsersSuggestions}
        />
        <section css={pageControlsStyles}>
          <PageControls {...pageControlsProps} />
        </section>
      </main>
    ) : hasAppliedFilters ? (
      <main css={{ textAlign: 'center', paddingTop: rem(48) }}>
        <span css={noResultsIconStyles}>
          <TeamIcon />
        </span>
        <Headline3>No results found.</Headline3>
        <Paragraph accent="lead">
          Please double-check your search for any typos or try a different
          search term.
        </Paragraph>
      </main>
    ) : (
      <main css={{ textAlign: 'center', paddingTop: rem(48) }}>
        <span css={iconStyles}>{article}</span>
        <Headline3>No manuscripts available.</Headline3>
        <Paragraph accent="lead">
          When a team shares a manuscript for a compliance review, it will be
          listed here.
        </Paragraph>
      </main>
    )}
  </article>
);

export default ComplianceDashboard;
