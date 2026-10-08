import {
  ArticleItem,
  Milestone as MilestoneType,
  MilestoneStatus,
} from '@asap-hub/model';
import { css } from '@emotion/react';
import { ComponentProps, FC, useCallback, useState } from 'react';
import { Button, Link } from '../atoms';
import { rem, tabletScreen } from '../pixels';
import { colour } from '../colors';
import { article as articleIcon, minusRectIcon, plusRectIcon } from '../icons';
import { useTextTruncation } from '../hooks';
import { noop, ResearchOutputOption } from '../utils';
import {
  descriptionContainerStyles,
  mobileLabelStyles,
  clampedDescriptionStyles,
  readMoreButtonStyles,
  statusContainerStyles,
  getStatusAccent,
  articlesHeaderStyles,
  articlesSeparatorStyles,
  articlesIconButtonStyles,
  articlesIconStyles,
  articlesTitleStyles,
  articlesListWrapperStyles,
  articlesListStyles,
  articlesItemStyles,
  articlesItemIconStyles,
  articlesItemTextContainerStyles,
  articlesItemLinkStyles,
  articlesWrapperStyles,
  noArticlesTextStyles,
  editButtonStyles,
} from './shared-aim-milestones-styles';
import MilestoneArticlesModal from './MilestoneArticlesModal';
import MilestoneStatusConfirmationModal, {
  MilestoneStatusConfirmationStatus,
} from './MilestoneStatusConfirmationModal';
import { LabeledMultiSelect, MilestoneStatusDropdown } from '../molecules';

function parseAimsString(aims: string | undefined): number[] {
  if (!aims || typeof aims !== 'string') return [];
  return aims
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

const milestoneRowStyles = css({
  display: 'grid',
  gridColumn: '1 / -1',
  gridTemplateColumns: 'subgrid',
  paddingBottom: rem(20),
  borderBottom: `1px solid ${colour.border.tertiary}`,
  marginBottom: rem(20),
  alignItems: 'flex-start',
  [`@media (max-width: ${tabletScreen.min - 1}px)`]: {
    gridTemplateColumns: '1fr',
    gap: rem(12),
  },
  '&:last-child': {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottom: 'none',
  },
});

const aimsColumnStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(8),
  alignItems: 'center',
  paddingBlock: rem(4),
});

const aimBadgeStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colour.background.info,
  color: colour.foreground.info,
  fontSize: rem(14),
  padding: `${rem(2)} ${rem(6)}`,
  lineHeight: rem(16),
  borderRadius: rem(24),
  height: rem(24),
  width: rem(32),
  whiteSpace: 'nowrap',
});

export const getMilestoneStatusAccent = (
  status: MilestoneStatus,
): 'success' | 'info' | 'neutral' | 'warning' | 'error' | 'default' =>
  getStatusAccent(status);

type MilestoneProps = {
  milestone: MilestoneType;
  isLead: boolean;
  loadArticleOptions: NonNullable<
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
};

const Milestone: FC<MilestoneProps> = ({
  milestone,
  fetchLinkedArticles,
  isLead,
  loadArticleOptions,
  onSaveArticles,
  onChangeStatus,
}) => {
  const { ref, isExpanded, needsExpansion, toggle } = useTextTruncation(
    milestone.description,
  );
  const milestoneId = milestone.id;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [articles, setArticles] = useState<
    ReadonlyArray<ArticleItem> | undefined
  >(undefined);
  const [isArticlesExpanded, setIsArticlesExpanded] = useState(false);
  const [pendingFinalStatus, setPendingFinalStatus] =
    useState<MilestoneStatusConfirmationStatus | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const articleCount =
    articles !== undefined ? articles.length : milestone.articleCount;

  const fetchArticles = async () => {
    const result = await fetchLinkedArticles(milestoneId);
    setArticles(result);
  };

  const loadCurrentArticlesForModal = useCallback(async () => {
    const fetched = await fetchLinkedArticles(milestoneId);
    setArticles(fetched);
    return fetched;
  }, [fetchLinkedArticles, milestoneId]);

  const aimNumbers = parseAimsString(milestone.aims);

  return (
    <div css={milestoneRowStyles}>
      <div css={aimsColumnStyles}>
        <div css={mobileLabelStyles}>Aims</div>
        {aimNumbers.length > 0 &&
          aimNumbers.map((n) => (
            <span key={n} css={aimBadgeStyles}>
              #{n}
            </span>
          ))}
      </div>
      <div css={descriptionContainerStyles}>
        <div css={mobileLabelStyles}>Milestone</div>
        <div>
          <div ref={ref} css={clampedDescriptionStyles(isExpanded)}>
            {milestone.description}
          </div>
          {(needsExpansion || isExpanded) && (
            <button type="button" css={readMoreButtonStyles} onClick={toggle}>
              {isExpanded ? 'Read Less' : 'Read More'}
            </button>
          )}
        </div>
        <div css={articlesWrapperStyles}>
          {articleCount === 0 ? (
            <div css={articlesHeaderStyles}>
              <span css={noArticlesTextStyles}>No articles associated</span>
              {isLead && (
                <>
                  <span css={articlesSeparatorStyles}>•</span>
                  <Button
                    linkStyle
                    onClick={() => setIsModalOpen(true)}
                    overrideStyles={editButtonStyles}
                  >
                    Edit
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div>
              <div css={articlesHeaderStyles}>
                <Button
                  aria-label={
                    isArticlesExpanded ? 'Collapse articles' : 'Expand articles'
                  }
                  linkStyle
                  onClick={async () => {
                    if (!isArticlesExpanded && articles === undefined) {
                      await fetchArticles();
                    }
                    setIsArticlesExpanded((prev) => !prev);
                  }}
                  overrideStyles={articlesIconButtonStyles}
                >
                  <span css={articlesIconStyles}>
                    {isArticlesExpanded ? minusRectIcon : plusRectIcon}
                  </span>
                  <span css={articlesTitleStyles}>
                    Articles ({articleCount})
                  </span>
                </Button>
                {isLead && (
                  <>
                    <span css={articlesSeparatorStyles}>•</span>
                    <Button
                      linkStyle
                      onClick={async () => {
                        await fetchArticles();
                        setIsModalOpen(true);
                      }}
                      overrideStyles={editButtonStyles}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
              {isArticlesExpanded && (
                <div css={articlesListWrapperStyles(rem(240))}>
                  <ul css={articlesListStyles}>
                    {(articles ?? []).map(({ id, title, href }) => (
                      <li key={id} css={articlesItemStyles}>
                        <span css={articlesItemIconStyles} aria-hidden>
                          {articleIcon}
                        </span>
                        <span css={articlesItemTextContainerStyles}>
                          <Link href={href}>
                            <span css={articlesItemLinkStyles}>{title}</span>
                          </Link>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div css={[statusContainerStyles, { paddingLeft: 0 }]}>
        <div css={mobileLabelStyles}>Status</div>
        <MilestoneStatusDropdown
          status={milestone.status}
          canEdit={isLead && !!onChangeStatus}
          isPending={isUpdatingStatus}
          onChange={(next) => {
            if (next === milestone.status) return;
            if (next === 'Complete' || next === 'Terminated') {
              setPendingFinalStatus(next);
              return;
            }
            if (!onChangeStatus) return;
            setIsUpdatingStatus(true);
            void onChangeStatus(milestoneId, next)
              .catch(noop)
              .finally(() => setIsUpdatingStatus(false));
          }}
        />
      </div>
      {isModalOpen && (
        <MilestoneArticlesModal
          articles={articles ?? []}
          onClose={() => setIsModalOpen(false)}
          onConfirm={async (updated) => {
            await onSaveArticles(milestoneId, updated);
            setArticles(updated);
          }}
          loadOptions={loadArticleOptions}
        />
      )}
      {pendingFinalStatus && (
        <MilestoneStatusConfirmationModal
          status={pendingFinalStatus}
          loadCurrentArticles={loadCurrentArticlesForModal}
          onClose={() => setPendingFinalStatus(null)}
          onConfirm={async (updated) => {
            const next = pendingFinalStatus;
            if (!onChangeStatus) return;
            await onChangeStatus(milestoneId, next, updated);
            setArticles(updated);
          }}
          loadOptions={loadArticleOptions}
        />
      )}
    </div>
  );
};

export default Milestone;
