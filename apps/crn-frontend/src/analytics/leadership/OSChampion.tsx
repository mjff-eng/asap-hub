import {
  awardsInitialSortingDirection,
  AwardsSortingDirection,
  SortAwards,
} from '@asap-hub/model';
import {
  LoadingContentBodyTable,
  AwardsTable,
} from '@asap-hub/react-components';
import { FC, Suspense, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAnalytics, usePagination, usePaginationParams } from '../../hooks';
import { useAnalyticsOSChampion } from './state';

const SORT_PARAM = 'sort';

const validSortValues: SortAwards[] = [
  'team_asc',
  'team_desc',
  'awards_asc',
  'awards_desc',
];

export const getOSChampionSortFromSearch = (search: string): SortAwards => {
  const params = new URLSearchParams(search);
  const sort = params.get(SORT_PARAM);
  if (sort && validSortValues.includes(sort as SortAwards)) {
    return sort as SortAwards;
  }
  return 'team_asc';
};

const getSortingDirectionFromSort = (
  sort: SortAwards,
): AwardsSortingDirection => {
  const direction = sort.endsWith('_asc') ? 'asc' : 'desc';
  const field = sort.replace(
    /_(asc|desc)$/,
    '',
  ) as keyof AwardsSortingDirection;
  const fieldMap: Record<string, keyof AwardsSortingDirection> = {
    team: 'team',
    awards: 'awards',
  };
  const key = fieldMap[field] ?? 'team';
  return {
    ...awardsInitialSortingDirection,
    [key]: direction,
  };
};

interface OSChampionProps {
  tags: string[];
}

const OSChampionContent: React.FC<
  OSChampionProps & {
    sort: SortAwards;
    setSort: React.Dispatch<React.SetStateAction<SortAwards>>;
    sortingDirection: AwardsSortingDirection;
  }
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
  const { search } = useLocation();
  const navigate = useNavigate();
  const sort = getOSChampionSortFromSearch(search);
  const sortingDirection = getSortingDirectionFromSort(sort);

  const setSort = useCallback(
    (value: React.SetStateAction<SortAwards>) => {
      const newSort = typeof value === 'function' ? value(sort) : value;
      const params = new URLSearchParams(search);
      params.set(SORT_PARAM, newSort);
      params.delete('currentPage');
      void navigate({ search: params.toString() } as never, { replace: true });
    },
    [navigate, search, sort],
  );

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
