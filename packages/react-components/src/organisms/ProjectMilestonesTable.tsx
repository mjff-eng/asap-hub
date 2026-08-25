import {
  ArticleItem,
  GrantType,
  Milestone as MilestoneType,
  MilestoneSortOption,
  MilestoneStatus,
} from '@asap-hub/model';
import { css } from '@emotion/react';
import { ComponentProps, FC, ReactNode, useMemo } from 'react';
import { Card, Headline3, Paragraph } from '../atoms';
import { rem, tabletScreen } from '../pixels';
import Milestone from './Milestone';
import { neutral1000, neutral200, neutral500 } from '../colors';
import type { ResearchOutputOption } from '../utils';
import { LabeledMultiSelect, PageControls } from '../molecules';
import { NumericalSortingIcon, searchIcon } from '../icons';

const WRAPPER_TOP_PADDING = 32;

const contentStyles = css({
  padding: `${rem(WRAPPER_TOP_PADDING)} ${rem(24)}`,
  paddingBottom: 0,
});

const containerStyles = css({
  display: 'grid',
  rowGap: rem(32),
});

const resultsRowStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(16),
  flexWrap: 'wrap',
});

const milestonesGridStyles = css({
  display: 'grid',
  gridTemplateColumns: '150px 1fr auto',
  columnGap: rem(24),
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    gridTemplateColumns: '1fr',
  },
});

const tableHeaderStyles = css({
  display: 'grid',
  gridColumn: '1 / -1',
  gridTemplateColumns: 'subgrid',
  marginBottom: rem(16),
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    display: 'none',
  },
});

const headerLabelStyles = css({
  fontSize: rem(17),
  fontWeight: 'bold',
  color: neutral1000.rgb,
});

const sortButtonStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: rem(4),
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  font: 'inherit',
  color: 'inherit',
});

const aimsHeaderStyles = css({
  flexShrink: 0,
});

const milestoneHeaderStyles = css({
  flex: 1,
  minWidth: 0,
});

const statusHeaderStyles = css({
  flexShrink: 0,
});

const milestonesListStyles = css({
  display: 'contents',
});

const milestoneRowWrapperStyles = (index: number, isLast: boolean) =>
  css({
    display: 'grid',
    gridColumn: '1 / -1',
    gridTemplateColumns: 'subgrid',
    backgroundColor: index % 2 === 0 ? '#FFFFFF' : neutral200.rgb,
    marginInline: rem(-24),
    paddingInline: rem(24),
    paddingTop: index === 0 ? 0 : rem(20),
    paddingBottom: rem(20),
    borderBottom: `1px solid ${neutral500.rgb}`,
    ...(isLast
      ? { paddingBottom: rem(WRAPPER_TOP_PADDING), borderBottom: 'none' }
      : {}),
  });

const noMilestonesTextStyles = css({
  fontSize: rem(17),
  lineHeight: rem(24),
  fontWeight: 700,
  color: neutral1000.rgb,
});

const pageControlsStyles = css({
  display: 'flex',
  justifyContent: 'center',
  paddingTop: rem(16),
  paddingBottom: rem(36),
});

const noResultsStyles = css({
  display: 'grid',
  justifyItems: 'center',
  textAlign: 'center',
  rowGap: rem(16),
  svg: {
    width: rem(48),
    height: rem(48),
    stroke: neutral1000.rgb,
  },
});

const noResultsIconStyles = css({
  display: 'inline-flex',
  svg: {
    width: rem(48),
    height: rem(48),
  },
});

type ProjectMilestonesProps = {
  readonly milestones: ReadonlyArray<MilestoneType>;
  readonly total: number;
  readonly hasAppliedSearch: boolean;
  readonly pageControlsProps: ComponentProps<typeof PageControls>;
  readonly isLead: boolean;
  readonly loadArticleOptions: NonNullable<
    ComponentProps<
      typeof LabeledMultiSelect<ResearchOutputOption>
    >['loadOptions']
  >;
  readonly fetchLinkedArticles: (
    milestoneId: string,
  ) => Promise<ReadonlyArray<ArticleItem>>;
  readonly onSaveArticles: (
    milestoneId: string,
    articles: ReadonlyArray<ArticleItem>,
  ) => Promise<void>;
  readonly onChangeStatus?: (
    milestoneId: string,
    status: MilestoneStatus,
    articles?: ReadonlyArray<ArticleItem>,
  ) => Promise<void>;
  readonly selectedGrantType: GrantType;
  readonly sort: MilestoneSortOption;
  readonly onToggleSort: () => void;
  readonly downloadSection?: ReactNode;
};

const ProjectMilestonesTable: FC<ProjectMilestonesProps> = ({
  milestones,
  total,
  hasAppliedSearch,
  isLead,
  loadArticleOptions,
  fetchLinkedArticles,
  onSaveArticles,
  onChangeStatus,
  selectedGrantType,
  pageControlsProps,
  sort,
  onToggleSort,
  downloadSection,
}) => {
  const grantLabel =
    selectedGrantType === 'supplement' ? 'Supplement' : 'Original';

  const displayedMilestones = useMemo(
    () =>
      sort === 'aim_desc'
        ? milestones.map((milestone) =>
            milestone.aims
              ? {
                  ...milestone,
                  aims: milestone.aims.split(',').reverse().join(','),
                }
              : milestone,
          )
        : milestones,
    [milestones, sort],
  );

  const resultsFoundText =
    total === 1 ? `${total} result found` : `${total} results found`;

  if (!milestones.length) {
    if (!hasAppliedSearch) {
      return (
        <Paragraph accent="neutral900" noMargin styles={noMilestonesTextStyles}>
          No milestones related to the {grantLabel} Grant have been added to
          this project yet.
        </Paragraph>
      );
    }

    return (
      <div css={containerStyles}>
        <div css={resultsRowStyles}>
          <strong>{resultsFoundText}</strong>
          {downloadSection}
        </div>
        <div css={noResultsStyles}>
          <div css={noResultsIconStyles} aria-hidden>
            {searchIcon}
          </div>
          <div>
            <Headline3 noMargin>No results found.</Headline3>
          </div>
          <Paragraph noMargin accent="neutral900">
            Please double-check your search for any typos or try a different
            search term.
          </Paragraph>
        </div>
      </div>
    );
  }

  return (
    <div css={containerStyles}>
      <div css={resultsRowStyles}>
        <strong>{resultsFoundText}</strong>
        {downloadSection}
      </div>
      <Card padding={false}>
        <div css={contentStyles}>
          <div css={milestonesGridStyles}>
            <div css={tableHeaderStyles}>
              <div css={[headerLabelStyles, aimsHeaderStyles]}>
                <button
                  type="button"
                  css={sortButtonStyles}
                  onClick={onToggleSort}
                >
                  Aims
                  <NumericalSortingIcon
                    active
                    ascending={sort === 'aim_asc'}
                    description="Aims"
                  />
                </button>
              </div>
              <div css={[headerLabelStyles, milestoneHeaderStyles]}>
                Milestone
              </div>
              <div css={[headerLabelStyles, statusHeaderStyles]}>Status</div>
            </div>
            <div css={milestonesListStyles}>
              {displayedMilestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  css={milestoneRowWrapperStyles(
                    index,
                    index === displayedMilestones.length - 1,
                  )}
                >
                  <Milestone
                    milestone={milestone}
                    fetchLinkedArticles={fetchLinkedArticles}
                    isLead={isLead}
                    loadArticleOptions={loadArticleOptions}
                    onSaveArticles={onSaveArticles}
                    onChangeStatus={onChangeStatus}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      <section css={pageControlsStyles}>
        <PageControls {...pageControlsProps} />
      </section>
    </div>
  );
};

export default ProjectMilestonesTable;
