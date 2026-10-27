import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router';

import {
  getAwardsSortFromSearch,
  getAwardsSortingDirection,
  useAwardsSort,
} from '../awards-sort';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNavigate.mockReturnValue(mockNavigate);
});

describe('getAwardsSortFromSearch', () => {
  it.each(['team_asc', 'team_desc', 'awards_asc', 'awards_desc'] as const)(
    'returns %s from the url',
    (sort) => {
      expect(getAwardsSortFromSearch(`?sort=${sort}`)).toBe(sort);
    },
  );

  it('falls back to team_asc when the sort is missing or invalid', () => {
    expect(getAwardsSortFromSearch('')).toBe('team_asc');
    expect(getAwardsSortFromSearch('?sort=unknown')).toBe('team_asc');
  });
});

describe('getAwardsSortingDirection', () => {
  it('sets the direction of the sorted column only', () => {
    expect(getAwardsSortingDirection('team_desc')).toEqual({
      team: 'desc',
      awards: 'desc',
    });
    expect(getAwardsSortingDirection('awards_asc')).toEqual({
      team: 'asc',
      awards: 'asc',
    });
  });
});

describe('useAwardsSort', () => {
  const renderSortHook = (search = '') =>
    renderHook(() => useAwardsSort(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[`/analytics${search}`]}>
          {children}
        </MemoryRouter>
      ),
    });

  it('reads the sort from the url', () => {
    const { result } = renderSortHook('?sort=awards_desc');

    expect(result.current.sort).toBe('awards_desc');
    expect(result.current.sortingDirection.awards).toBe('desc');
  });

  it('replaces the sort in the url and resets the page', () => {
    const { result } = renderSortHook('?sort=team_asc&currentPage=2');

    act(() => result.current.setSort('awards_desc'));

    expect(mockNavigate).toHaveBeenCalledWith(
      { search: 'sort=awards_desc' },
      { replace: true },
    );
  });

  it('accepts an updater function', () => {
    const { result } = renderSortHook('?sort=team_asc');

    act(() =>
      result.current.setSort((current) =>
        current === 'team_asc' ? 'team_desc' : 'team_asc',
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      { search: 'sort=team_desc' },
      { replace: true },
    );
  });
});
