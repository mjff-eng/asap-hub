import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { searchQueryParam } from '@asap-hub/routing';
import React, { ComponentProps } from 'react';

import { useSearch } from '../search';
import { usePagination, usePaginationParams } from '../pagination';

const createWrapper =
  (initialEntries: string[] = ['/']) =>
  ({ children }: ComponentProps<typeof MemoryRouter>) =>
    React.createElement(
      MemoryRouter,
      {
        initialEntries,
      },
      children,
    );

describe('useSearch', () => {
  describe('property searchQuery', () => {
    it('defaults to empty', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });
      expect(result.current.searchQuery).toEqual('');
    });

    it('is taken from the query param', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper([`/test?${searchQueryParam}=test123`]),
      });
      expect(result.current.searchQuery).toEqual('test123');
    });

    it('can be changed', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });
      act(() => {
        result.current.setSearchQuery('test123');
      });
      expect(result.current.searchQuery).toEqual('test123');
    });

    it('can be removed', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test?searchQuery=test123']),
      });
      act(() => {
        result.current.setSearchQuery('');
      });
      expect(result.current.searchQuery).toEqual('');
    });

    it('resets pagination when changed', () => {
      const { result } = renderHook(
        () => ({
          useSearch: useSearch(),
          usePaginationParams: usePaginationParams(),
          usePagination: usePagination(50, 1),
        }),
        {
          wrapper: createWrapper(['/test?currentPage=2']),
        },
      );
      expect(result.current.usePaginationParams.currentPage).toBe(2);
      act(() => {
        result.current.useSearch.setSearchQuery('test123');
      });
      // After setSearchQuery, the URL is updated and currentPage should be reset
      // The pagination reset happens via navigate() which updates the URL
      expect(result.current.usePaginationParams.currentPage).toBe(0);
    });
  });

  describe('property filters', () => {
    it('defaults to empty', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });
      expect(result.current.filters).toEqual(new Set());
    });

    it('is taken from the query param', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test?filter=test123']),
      });
      expect(result.current.filters).toEqual(new Set(['test123']));
    });

    it('can handle multiple filters', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test?filter=test123&filter=test456']),
      });
      expect(result.current.filters).toEqual(new Set(['test123', 'test456']));
    });

    it('can add a filter', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });
      act(() => {
        result.current.toggleFilter('test123');
      });
      expect(result.current.filters).toEqual(new Set(['test123']));
    });

    it('can add multiple filters', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });
      act(() => {
        result.current.toggleFilter('test123');
      });
      act(() => {
        result.current.toggleFilter('test456');
      });
      expect(result.current.filters).toEqual(new Set(['test123', 'test456']));
    });

    it('can remove a filter', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test?filter=test123']),
      });
      act(() => {
        result.current.toggleFilter('test123');
      });
      expect(result.current.filters).toEqual(new Set());
    });

    it('can replace all filters', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test?filter=test123']),
      });
      act(() => {
        result.current.setFilters(['2026', '2025-04']);
      });
      expect(result.current.filters).toEqual(new Set(['2026', '2025-04']));
    });

    it('resets the pagination when changed', () => {
      const { result } = renderHook(
        () => ({
          useSearch: useSearch(),
          usePaginationParams: usePaginationParams(),
          usePagination: usePagination(50, 1),
        }),
        {
          wrapper: createWrapper(['/test?filter=test123&currentPage=2']),
        },
      );
      expect(result.current.usePaginationParams.currentPage).toBe(2);
      act(() => {
        result.current.useSearch.toggleFilter('test123');
      });
      expect(result.current.usePaginationParams.currentPage).toBe(0);
    });

    it('toggles the given query param when filterName is passed', () => {
      const { result } = renderHook(
        () => {
          const search = useSearch();
          const { search: locationSearch } = useLocation();
          return { search, locationSearch };
        },
        {
          wrapper: createWrapper(['/test?resourceType=Data']),
        },
      );
      act(() => {
        result.current.search.toggleFilter('Infrastructure', 'resourceType');
      });
      expect(result.current.search.filters).toEqual(new Set());
      expect(
        new URLSearchParams(result.current.locationSearch).getAll(
          'resourceType',
        ),
      ).toEqual(['Data', 'Infrastructure']);
    });
  });

  describe('property debouncedSearchQuery', () => {
    it('is the same as the search query initially', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });
      expect(result.current.debouncedSearchQuery).toEqual(
        result.current.searchQuery,
      );
    });

    it('remains unchanged immediately after the search query is changed', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });
      const { searchQuery } = result.current;

      act(() => {
        result.current.setSearchQuery('searchterm');
      });
      expect(result.current.searchQuery).not.toEqual(searchQuery);
      expect(result.current.debouncedSearchQuery).toEqual(searchQuery);
    });
    it('updates to a changed search query after a while', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });

      act(() => {
        result.current.setSearchQuery('searchterm');
      });

      // Verify the search query was set
      expect(result.current.searchQuery).toEqual('searchterm');

      // Advance timers to trigger the debounce (400ms per the hook)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Run all pending timers and microtasks
      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.debouncedSearchQuery).toEqual('searchterm');
      jest.useRealTimers();
    });
  });

  /* jscpd:ignore-start */
  describe('Tag Filters', () => {
    it('defaults to empty', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });
      expect(result.current.tags).toEqual([]);
    });

    it('loads tags from the query param', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test?tag=tag']),
      });
      expect(result.current.tags).toEqual(['tag']);
    });

    it('can handle multiple tags', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test?tag=tag1&tag=tag2']),
      });
      expect(result.current.tags).toEqual(['tag1', 'tag2']);
    });

    it('can add a tag', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });
      act(() => {
        result.current.setTags(['tag']);
      });
      expect(result.current.tags).toEqual(['tag']);
    });

    it('can add multiple tags', () => {
      const { result } = renderHook(() => useSearch(), {
        wrapper: createWrapper(['/test']),
      });
      act(() => {
        result.current.setTags(['Tag1', 'Tag2']);
      });
      expect(result.current.tags).toEqual(['Tag1', 'Tag2']);
    });

    it('resets the pagination when changed', () => {
      const { result } = renderHook(
        () => ({
          useSearch: useSearch(),
          usePaginationParams: usePaginationParams(),
          usePagination: usePagination(50, 1),
        }),
        {
          wrapper: createWrapper(['/test?tag=test&currentPage=2']),
        },
      );
      expect(result.current.usePaginationParams.currentPage).toBe(2);
      act(() => {
        result.current.useSearch.setTags([]);
      });
      expect(result.current.usePaginationParams.currentPage).toBe(0);
    });
  });
  /* jscpd:ignore-end */
});
