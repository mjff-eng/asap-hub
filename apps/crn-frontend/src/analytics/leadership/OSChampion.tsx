import {
  AwardsTable,
  LoadingContentBodyTable,
} from '@asap-hub/react-components';
import { FC, Suspense } from 'react';
import { useAnalytics, usePagination, usePaginationParams } from '../../hooks';
import { useAwardsSort } from '../utils/awards-sort';
import { useAnalyticsOSChampion } from './state';

interface OSChampionProps {
  tags: string[];
}

const OSChampionContent: React.FC<
  OSChampionProps & Omit<ReturnType<typeof useAwardsSort>, 'search'>
> = ({ tags, sort, setSort, sortingDirection }) => {
  const { currentPage, pageSize } = usePaginationParams();
  const { timeRange } = useAnalytics();

  const { items, total } = useAnalyticsOSChampion({
    tags,
    sort,
    currentPage,
    pageSize,
    timeRange,
  });

  const { numberOfPages, renderPageHref } = usePagination(total, pageSize);

  return (
    <AwardsTable
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

const OSChampion: FC<OSChampionProps> = ({ tags }) => {
  const { search, sort, setSort, sortingDirection } = useAwardsSort();

  return (
    <Suspense key={search} fallback={<LoadingContentBodyTable />}>
      <OSChampionContent
        tags={tags}
        sort={sort}
        setSort={setSort}
        sortingDirection={sortingDirection}
      />
    </Suspense>
  );
};

export default OSChampion;
