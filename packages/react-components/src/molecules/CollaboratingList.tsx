import { css } from '@emotion/react';
import { useState } from 'react';

import { Button } from '../atoms';
import { neutral900, colour } from '../colors';
import { rem, tabletScreen } from '../pixels';

export const nonMobileQuery = `@media (min-width: ${tabletScreen.min}px)`;

export const ARTICLES_BEFORE_SCROLL = 7;
export const ARTICLE_ROW_HEIGHT = 40;

export const articleTypeLabel = (type?: string): string | undefined => {
  if (!type) return undefined;
  if (type === 'Published') return 'Publication';
  return type;
};

export const listStyles = css({
  display: 'flex',
  flexDirection: 'column',
});

export const rowStyles = css({
  borderTop: `1px solid ${colour.border.tertiary}`,
  padding: `${rem(16)} 0`,
  ':first-of-type': {
    borderTop: 'none',
    paddingTop: 8,
  },
});

export const headerStyles = css({
  display: 'flex',
  // Mobile: chevron aligns to the bottom line (the article count).
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: rem(12),
  cursor: 'pointer',
  [nonMobileQuery]: {
    alignItems: 'center',
  },
});

export const chevronStyles = css({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
});

export const emptyStateStyles = css({
  color: neutral900.rgb,
  margin: 0,
  padding: `${rem(24)} 0`,
  textAlign: 'left',
});

export const viewMoreContainerStyles = css({
  display: 'flex',
  justifyContent: 'center',
  marginTop: rem(16),
  paddingTop: rem(14),
  // Negative horizontal margins cancel the parent card's 24px horizontal
  // padding so the divider spans the full card width.
  marginInline: `-${rem(24)}`,
  marginBottom: `-${rem(14)}`,
  borderTop: `1px solid ${colour.border.tertiary}`,
});

export const articleRowStyles = css({
  // Mobile: title row on top, pill flush-left underneath.
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 0,
  [nonMobileQuery]: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
});

type CollaboratingListProps<T extends { id: string }> = {
  items: ReadonlyArray<T> | undefined;
  initialCount: number;
  emptyStateMessage: string;
  renderRow: (item: T) => React.ReactNode;
};

function CollaboratingList<T extends { id: string }>({
  items,
  initialCount,
  emptyStateMessage,
  renderRow,
}: CollaboratingListProps<T>) {
  const [showAll, setShowAll] = useState(false);

  const count = items?.length ?? 0;
  if (count === 0) {
    return <p css={emptyStateStyles}>{emptyStateMessage}</p>;
  }

  const allItems = items ?? [];
  const visibleItems =
    showAll || count <= initialCount
      ? allItems
      : allItems.slice(0, initialCount);
  const hasMore = count > initialCount;

  return (
    <>
      <div css={listStyles}>{visibleItems.map(renderRow)}</div>
      {hasMore && (
        <div css={viewMoreContainerStyles}>
          <Button linkStyle onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'View Less Collaborators' : 'View More Collaborators'}
          </Button>
        </div>
      )}
    </>
  );
}

export default CollaboratingList;
