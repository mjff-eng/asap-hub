import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, waitFor } from '@testing-library/react';
import { Component, ReactNode, Suspense } from 'react';

import { Auth0Provider, WhenReady } from '../../../auth/test-utils';
import { useAnalyticsOpensearch } from '../../../hooks/opensearch';
import {
  getAnalyticsLeadership,
  getAnalyticsOSChampion,
  getTeamLeadershipMetrics,
} from '../api';
import {
  useAnalyticsLeadership,
  useAnalyticsOSChampion,
  useTeamLeadershipMetrics,
} from '../state';

jest.mock('../api');
jest.mock('../../../hooks/opensearch', () => ({
  useAnalyticsOpensearch: jest.fn(),
}));

const mockUseAnalyticsOpensearch =
  useAnalyticsOpensearch as jest.MockedFunction<typeof useAnalyticsOpensearch>;

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? 'errored' : this.props.children;
  }
}

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

const renderStateHook = <T,>(hook: () => T) => {
  const queryClient = createTestQueryClient();
  const utils = renderHook(hook, { wrapper: createWrapper(queryClient) });
  return { ...utils, queryClient };
};

const options = {
  currentPage: 0,
  pageSize: 10,
  tags: [],
  timeRange: 'all',
  sort: 'team_asc',
  metric: 'interest-group',
} as unknown as Parameters<typeof useAnalyticsLeadership>[0];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAnalyticsOpensearch.mockReturnValue({ client: {} } as ReturnType<
    typeof useAnalyticsOpensearch
  >);
});

describe('useAnalyticsLeadership', () => {
  it('maps a non-Error rejection to an empty list', async () => {
    (getAnalyticsLeadership as jest.Mock).mockRejectedValue('nope');

    const { result } = renderStateHook(() => useAnalyticsLeadership(options));

    await waitFor(() =>
      expect(result.current).toEqual({ total: 0, items: [] }),
    );
  });

  it('maps an undefined result to null via the ?? null branch', async () => {
    (getAnalyticsLeadership as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderStateHook(() => useAnalyticsLeadership(options));

    await waitFor(() => expect(getAnalyticsLeadership).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('selects the wg-leadership index for non-interest-group metrics', async () => {
    (getAnalyticsLeadership as jest.Mock).mockResolvedValue({
      total: 0,
      items: [],
    });

    renderStateHook(() =>
      useAnalyticsLeadership({ ...options, metric: 'working-group' }),
    );

    await waitFor(() =>
      expect(mockUseAnalyticsOpensearch).toHaveBeenCalledWith('wg-leadership'),
    );
  });
});

describe('useAnalyticsOSChampion', () => {
  it('maps a non-Error rejection to an empty list', async () => {
    (getAnalyticsOSChampion as jest.Mock).mockRejectedValue('nope');

    const { result } = renderStateHook(() =>
      useAnalyticsOSChampion(
        options as Parameters<typeof useAnalyticsOSChampion>[0],
      ),
    );

    await waitFor(() =>
      expect(result.current).toEqual({ total: 0, items: [] }),
    );
  });

  it('maps an undefined result to null via the ?? null branch', async () => {
    (getAnalyticsOSChampion as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderStateHook(() =>
      useAnalyticsOSChampion(
        options as Parameters<typeof useAnalyticsOSChampion>[0],
      ),
    );

    await waitFor(() => expect(getAnalyticsOSChampion).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});

describe('Error rejections propagate to the error boundary', () => {
  it.each([
    ['leadership', getAnalyticsLeadership, useAnalyticsLeadership],
    ['os-champion', getAnalyticsOSChampion, useAnalyticsOSChampion],
  ])('re-throws Error rejections for %s', async (_name, getter, hook) => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    (getter as jest.Mock).mockRejectedValue(new Error('boom'));

    const Probe = () => {
      (hook as (o: typeof options) => unknown)(options);
      return <>rendered</>;
    };
    const { getByText } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ErrorBoundary>
          <Suspense fallback="loading">
            <Auth0Provider user={{ id: 'user-id' }}>
              <WhenReady>
                <Probe />
              </WhenReady>
            </Auth0Provider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(getByText('errored')).toBeInTheDocument());
    consoleErrorSpy.mockRestore();
  });
});

describe('useTeamLeadershipMetrics', () => {
  it('fetches the metrics for the team from both leadership indices', async () => {
    const metrics = { workingGroupLead: true, interestGroupLead: false };
    (getTeamLeadershipMetrics as jest.Mock).mockResolvedValue(metrics);
    const workingGroupClient = { index: 'wg-leadership' };
    const interestGroupClient = { index: 'ig-leadership' };
    mockUseAnalyticsOpensearch.mockImplementation(
      (index) =>
        ({
          client:
            index === 'wg-leadership'
              ? workingGroupClient
              : interestGroupClient,
        }) as unknown as ReturnType<typeof useAnalyticsOpensearch>,
    );

    const { result } = renderStateHook(() =>
      useTeamLeadershipMetrics({ teamId: 'team-id-1' }),
    );

    await waitFor(() => expect(result.current).toEqual(metrics));
    expect(getTeamLeadershipMetrics).toHaveBeenCalledWith(
      workingGroupClient,
      interestGroupClient,
      { teamId: 'team-id-1' },
    );
  });
});
