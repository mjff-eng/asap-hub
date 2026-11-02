import { FetchResearchOutputsFilter, FetchTeamsFilter } from '@asap-hub/model';
import { searchQueryParam } from '@asap-hub/routing';
import { useLocation, useNavigate } from 'react-router';
import { useDebounce } from 'use-debounce';
import { usePaginationParams } from './pagination';

type Filter = {
  filter?: string[];
} & FetchTeamsFilter &
  FetchResearchOutputsFilter;

export const useSearch = (filterNames: (keyof Filter)[] = ['filter']) => {
  const location = useLocation();
  const currentUrlParams = new URLSearchParams(location.search);
  const navigate = useNavigate();

  const { resetPagination } = usePaginationParams();

  const filtersMap = filterNames.reduce(
    (filterObject, filterName) => ({
      ...filterObject,
      [filterName]: currentUrlParams.getAll(filterName),
    }),
    {} as Filter,
  );

  const filters = new Set<string>(
    Object.values(filtersMap).flatMap((value) => value),
  );

  const tags = currentUrlParams.getAll('tag');
  const searchQuery = currentUrlParams.get(searchQueryParam) || '';

  const replaceArrayParams = (paramName: string, values: string[]) => {
    const newUrlParams = new URLSearchParams(location.search);
    resetPagination(newUrlParams);
    newUrlParams.delete(paramName);
    values.forEach((v) => newUrlParams.append(paramName, v));
    void navigate({ search: newUrlParams.toString() } as never, {
      replace: true,
    });
  };

  const toggleFilter = (filter: string, filterName = 'filter') => {
    const currentFilters = currentUrlParams.getAll(filterName);
    const filterIndex = currentFilters.indexOf(filter);
    filterIndex > -1
      ? currentFilters.splice(filterIndex, 1)
      : currentFilters.push(filter);
    replaceArrayParams(filterName, currentFilters);
  };

  const setFilters = (newFilters: string[], filterName = 'filter') => {
    replaceArrayParams(filterName, newFilters);
  };

  const setTags = (newTags: string[]) => {
    replaceArrayParams('tag', newTags);
  };

  const setSearchQuery = (newSearchQuery: string) => {
    const newUrlParams = new URLSearchParams(location.search);
    resetPagination(newUrlParams);
    newSearchQuery
      ? newUrlParams.set(searchQueryParam, newSearchQuery)
      : newUrlParams.delete(searchQueryParam);

    void navigate({ search: newUrlParams.toString() } as never, {
      replace: true,
    });
  };

  const [debouncedSearchQuery] = useDebounce(searchQuery, 400);

  return {
    searchQuery,
    debouncedSearchQuery,
    setSearchQuery,
    filters,
    filtersMap,
    toggleFilter,
    setFilters,
    tags,
    setTags,
  };
};
