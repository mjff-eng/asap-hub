import {
  AwardsTable,
  LoadingContentBodyTable,
} from '@asap-hub/react-components';
import { FC, Suspense } from 'react';
import { useAnalytics, usePagination, usePaginationParams } from '../../hooks';
import { useAwardsSort } from '../utils/awards-sort';
import { useAnalyticsAwards } from './state';

interface AwardsListProps {
  awardType: string;
  awardLabel: string;
  tags: string[];
}

const AwardsListContent: React.FC<
  AwardsListProps & Omit<ReturnType<typeof useAwardsSort>, 'search'>
> = ({ awardType, awardLabel, tags, sort, setSort, sortingDirection }) => {
  const { currentPage, pageSize } = usePaginationParams();
  const { timeRange } = useAnalytics();

  const { items, total } = useAnalyticsAwards({
    awardType,
    tags,
    sort,
    currentPage,
    pageSize,
    timeRange,
  });

  const { numberOfPages, renderPageHref } = usePagination(total, pageSize);

  return (
    <AwardsTable
      awardLabel={awardLabel}
      data={items}
      sort={sort}
      setSort={setSort}
      sortingDirection={sortingDirection}
      numberOfPages={numberOfPages}
      renderPageHref={renderPageHref}
      currentPageIndex={currentPage}
    />
  );
};

const AwardsList: FC<AwardsListProps> = ({ awardType, awardLabel, tags }) => {
  const { search, sort, setSort, sortingDirection } = useAwardsSort();

  return (
    <Suspense
      key={`${awardType}${search}`}
      fallback={<LoadingContentBodyTable />}
    >
      <AwardsListContent
        awardType={awardType}
        awardLabel={awardLabel}
        tags={tags}
        sort={sort}
        setSort={setSort}
        sortingDirection={sortingDirection}
      />
    </Suspense>
  );
};

export default AwardsList;
