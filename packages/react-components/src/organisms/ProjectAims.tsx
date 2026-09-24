import { ArticleItem, Aim as AimType } from '@asap-hub/model';
import { css } from '@emotion/react';
import { FC, useState } from 'react';
import { Headline3, Card, Button, TabButton, Link, Paragraph } from '../atoms';
import { TabNav } from '../molecules';
import { rem, tabletScreen } from '../pixels';
import { neutral1000, neutral500 } from '../colors';
import Aim from './Aim';

const contentStyles = css({
  padding: `${rem(32)} ${rem(24)} ${rem(16)} ${rem(24)}`,
});

const tabContainerStyles = css({
  marginBottom: rem(24),
  borderBottom: `1px solid ${neutral500.rgb}`,
});

const aimsGridStyles = css({
  display: 'grid',
  gridTemplateColumns: `${rem(33)} 1fr auto`,
  columnGap: rem(24),
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    gridTemplateColumns: '1fr',
  },
});

const headerRowStyles = css({
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

const viewMoreContainerStyles = (hasMore: boolean) =>
  css({
    marginTop: hasMore ? rem(32) : 0,
    paddingTop: rem(16),
    borderTop: hasMore ? `1px solid ${neutral500.rgb}` : 'none',
    textAlign: 'center',
  });

type ProjectAimsProps = {
  originalGrantAims: ReadonlyArray<AimType>;
  supplementGrantAims: ReadonlyArray<AimType>;
  initialDisplayCount?: number;
  fetchArticles: (aimId: string) => Promise<ReadonlyArray<ArticleItem>>;
  seeMilestonesHref?: string;
};

const AimsList: FC<{
  aims: ReadonlyArray<AimType>;
  initialDisplayCount: number;
  showAll: boolean;
  onToggleShowAll: () => void;
  fetchArticles: (aimId: string) => Promise<ReadonlyArray<ArticleItem>>;
}> = ({
  aims,
  initialDisplayCount,
  showAll,
  onToggleShowAll,
  fetchArticles,
}) => {
  const displayedAims = showAll ? aims : aims.slice(0, initialDisplayCount);
  const hasMore = aims.length > initialDisplayCount;

  return (
    <>
      <div css={aimsGridStyles}>
        <div css={headerRowStyles}>
          <div css={headerLabelStyles}>Aim</div>
          <div css={headerLabelStyles}>Description</div>
          <div css={[headerLabelStyles, { paddingLeft: rem(8) }]}>Status</div>
        </div>
        {displayedAims.map((aim) => (
          <Aim key={aim.id} aim={aim} fetchArticles={fetchArticles} />
        ))}
      </div>
      <div css={viewMoreContainerStyles(hasMore)}>
        {hasMore && (
          <Button
            id="project-aims-toggle-show-all"
            linkStyle
            onClick={onToggleShowAll}
          >
            {showAll ? 'View Less Aims' : 'View More Aims'}
          </Button>
        )}
      </div>
    </>
  );
};

// The `TabNav` component comes with padding and margin in its inner components,
// so we use a smaller margin when we render it.
const MULTI_TAB_MARGIN = 12;

// If we don't render the `TabNav`, this is the margin we want to use, both cases should have the
// same bottom spacing with the next component.
const SINGLE_TAB_MARGIN = 32;

const ProjectAims: FC<ProjectAimsProps> = ({
  originalGrantAims,
  supplementGrantAims,
  initialDisplayCount = 4,
  fetchArticles,
  seeMilestonesHref,
}) => {
  const [activeTab, setActiveTab] = useState<
    'supplementGrant' | 'originalGrant' | 'no-tabs'
  >(supplementGrantAims.length > 0 ? 'supplementGrant' : 'no-tabs');

  const [showAllByTab, setShowAllByTab] = useState<Record<string, boolean>>({});

  if (originalGrantAims.length === 0 && supplementGrantAims.length === 0) {
    return null;
  }

  const currentList =
    activeTab === 'supplementGrant' ? supplementGrantAims : originalGrantAims;

  const isTabbedView = activeTab !== 'no-tabs';

  return (
    <Card padding={false} title="Aims">
      <div css={contentStyles}>
        <Headline3 noMargin>Aims</Headline3>
        <Paragraph
          noMargin
          accent="neutral900"
          styles={css({
            marginTop: rem(24),
            marginBottom: rem(
              isTabbedView ? MULTI_TAB_MARGIN : SINGLE_TAB_MARGIN,
            ),
          })}
        >
          View the core research objectives of this project. Progress toward
          each aim is tracked through related milestones, and associated
          articles are displayed as they are linked through those milestones.{' '}
          <Link href={seeMilestonesHref ?? '#'}>See milestones</Link>
        </Paragraph>

        {isTabbedView && (
          <div css={tabContainerStyles}>
            <TabNav>
              <TabButton
                active={activeTab === 'supplementGrant'}
                onClick={() => setActiveTab('supplementGrant')}
              >
                Supplement Grant ({supplementGrantAims.length})
              </TabButton>
              <TabButton
                active={activeTab === 'originalGrant'}
                onClick={() => setActiveTab('originalGrant')}
              >
                Original Grant ({originalGrantAims.length})
              </TabButton>
            </TabNav>
          </div>
        )}

        <AimsList
          aims={currentList}
          initialDisplayCount={initialDisplayCount}
          showAll={!!showAllByTab[activeTab]}
          onToggleShowAll={() =>
            setShowAllByTab((prev) => ({
              ...prev,
              [activeTab]: !prev[activeTab],
            }))
          }
          fetchArticles={fetchArticles}
        />
      </div>
    </Card>
  );
};

export default ProjectAims;
