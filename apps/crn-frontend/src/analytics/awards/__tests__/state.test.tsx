import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode, Suspense } from 'react';

import { Auth0Provider, WhenReady } from '../../../auth/test-utils';
import { useAnalyticsOpensearch } from '../../../hooks/opensearch';
import { getAnalyticsAwards, getAwardTypes } from '../api';
import { useAnalyticsAwards, useAnalyticsAwardTypes } from '../state';

jest.mock('../api');
jest.mock('../../../hooks/opensearch', () => ({
  useAnalyticsOpensearch: jest.fn(),
}));

const mockUseAnalyticsOpensearch =
  useAnalyticsOpensearch as jest.MockedFunction<typeof useAnalyticsOpensearch>;

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="loading">
        <Auth0Provider user={{ id: 'user-id' }}>
          <WhenReady>{children}</WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>
  );

const renderStateHook = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: createWrapper(createTestQueryClient()) });

const options: Parameters<typeof useAnalyticsAwards>[0] = {
  awardType: 'open-science-champion',
  currentPage: 0,
  pageSize: 10,
  tags: [],
  timeRange: 'all',
  sort: 'team_asc',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAnalyticsOpensearch.mockReturnValue({ client: {} } as ReturnType<
    typeof useAnalyticsOpensearch
  >);
});

describe('useAnalyticsAwardTypes', () => {
  it('returns the award types from the awards index', async () => {
    const awardTypes = [
      { value: 'network-spotlight', label: 'Network Spotlight' },
    ];
    (getAwardTypes as jest.Mock).mockResolvedValue(awardTypes);

    const { result } = renderStateHook(() => useAnalyticsAwardTypes());

    await waitFor(() => expect(result.current).toEqual(awardTypes));
    expect(mockUseAnalyticsOpensearch).toHaveBeenCalledWith('awards');
  });
});

describe('useAnalyticsAwards', () => {
  it('returns the awards of the selected award type', async () => {
    const response = { total: 0, items: [] };
    (getAnalyticsAwards as jest.Mock).mockResolvedValue(response);

    const { result } = renderStateHook(() => useAnalyticsAwards(options));

    await waitFor(() => expect(result.current).toEqual(response));
    expect(getAnalyticsAwards).toHaveBeenCalledWith({}, options);
    expect(mockUseAnalyticsOpensearch).toHaveBeenCalledWith('awards');
  });

  it('maps a non-Error rejection to an empty list', async () => {
    (getAnalyticsAwards as jest.Mock).mockRejectedValue('nope');

    const { result } = renderStateHook(() => useAnalyticsAwards(options));

    await waitFor(() =>
      expect(result.current).toEqual({ total: 0, items: [] }),
    );
  });

  it('maps an undefined result to null', async () => {
    (getAnalyticsAwards as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderStateHook(() => useAnalyticsAwards(options));

    await waitFor(() => expect(getAnalyticsAwards).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
