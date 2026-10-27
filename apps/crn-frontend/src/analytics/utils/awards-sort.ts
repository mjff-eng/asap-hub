import {
  awardsInitialSortingDirection,
  AwardsSortingDirection,
  SortAwards,
} from '@asap-hub/model';
import { SetStateAction, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

const SORT_PARAM = 'sort';

const validSortValues: SortAwards[] = [
  'team_asc',
  'team_desc',
  'awards_asc',
  'awards_desc',
];

export const getAwardsSortFromSearch = (search: string): SortAwards => {
  const sort = new URLSearchParams(search).get(SORT_PARAM);
  if (sort && validSortValues.includes(sort as SortAwards)) {
    return sort as SortAwards;
  }
  return 'team_asc';
};

export const getAwardsSortingDirection = (
  sort: SortAwards,
): AwardsSortingDirection => {
  const direction = sort.endsWith('_asc') ? 'asc' : 'desc';
  const field = sort.replace(/_(asc|desc)$/, '');
  const key: keyof AwardsSortingDirection =
    field === 'awards' ? 'awards' : 'team';
  return {
    ...awardsInitialSortingDirection,
    [key]: direction,
  };
};

export const useAwardsSort = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const sort = getAwardsSortFromSearch(search);
  const sortingDirection = getAwardsSortingDirection(sort);

  const setSort = useCallback(
    (value: SetStateAction<SortAwards>) => {
      const newSort = typeof value === 'function' ? value(sort) : value;
      const params = new URLSearchParams(search);
      params.set(SORT_PARAM, newSort);
      params.delete('currentPage');
      void navigate({ search: params.toString() } as never, { replace: true });
    },
    [navigate, search, sort],
  );

  return { search, sort, setSort, sortingDirection };
};
