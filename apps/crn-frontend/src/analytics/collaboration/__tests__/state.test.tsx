import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, waitFor } from '@testing-library/react';
import { Component, ReactNode, Suspense } from 'react';

import { Auth0Provider, WhenReady } from '../../../auth/test-utils';
import { useAnalyticsOpensearch } from '../../../hooks/opensearch';
import {
  getPreliminaryDataSharing,
  getTeamCollaboration,
  getTeamCoProduction,
  getUserCollaboration,
} from '../api';
import {
  prelimDataSharingQueryKeys,
  useAnalyticsSharingPrelimFindings,
  useAnalyticsTeamCollaboration,
  useAnalyticsUserCollaboration,
  useTeamCoProduction,
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
  teamId: 'team-id-1',
} as unknown as Parameters<typeof useAnalyticsUserCollaboration>[0];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAnalyticsOpensearch.mockReturnValue({ client: {} } as ReturnType<
    typeof useAnalyticsOpensearch
  >);
});

describe('useAnalyticsUserCollaboration', () => {
  it('maps a non-Error rejection to an empty list', async () => {
    (getUserCollaboration as jest.Mock).mockRejectedValue('nope');

    const { result } = renderStateHook(() =>
      useAnalyticsUserCollaboration(options),
    );

    await waitFor(() =>
      expect(result.current).toEqual({ total: 0, items: [] }),
    );
  });
});

describe('useAnalyticsTeamCollaboration', () => {
  it('maps a non-Error rejection to an empty list', async () => {
    (getTeamCollaboration as jest.Mock).mockRejectedValue('nope');

    const { result } = renderStateHook(() =>
      useAnalyticsTeamCollaboration(
        options as Parameters<typeof useAnalyticsTeamCollaboration>[0],
      ),
    );

    await waitFor(() =>
      expect(result.current).toEqual({ total: 0, items: [] }),
    );
  });
});

describe('useAnalyticsSharingPrelimFindings', () => {
  it('maps a non-Error rejection to an empty list', async () => {
    (getPreliminaryDataSharing as jest.Mock).mockRejectedValue('nope');

    const { result } = renderStateHook(() =>
      useAnalyticsSharingPrelimFindings(
        options as Parameters<typeof useAnalyticsSharingPrelimFindings>[0],
      ),
    );

    await waitFor(() =>
      expect(result.current).toEqual({ total: 0, items: [] }),
    );
  });

  it('caches null when the fetcher resolves undefined', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    (getPreliminaryDataSharing as jest.Mock).mockResolvedValue(undefined);

    const queryClient = createTestQueryClient();
    const key = prelimDataSharingQueryKeys.list({
      currentPage: options.currentPage,
      pageSize: options.pageSize,
      tags: options.tags,
      timeRange: options.timeRange,
      sort: options.sort,
    } as Parameters<typeof prelimDataSharingQueryKeys.list>[0]);

    const Probe = () => {
      useAnalyticsSharingPrelimFindings(
        options as Parameters<typeof useAnalyticsSharingPrelimFindings>[0],
      );
      return <>rendered</>;
    };
    render(
      <QueryClientProvider client={queryClient}>
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

    // null is cached before the null-mapping render throws to the boundary
    await waitFor(() => expect(queryClient.getQueryData(key)).toBeNull());
    consoleErrorSpy.mockRestore();
  });
});

describe('Error rejections propagate to the error boundary', () => {
  it.each([
    ['user', getUserCollaboration, useAnalyticsUserCollaboration],
    ['team', getTeamCollaboration, useAnalyticsTeamCollaboration],
    ['prelim', getPreliminaryDataSharing, useAnalyticsSharingPrelimFindings],
    ['co-production', getTeamCoProduction, useTeamCoProduction],
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

describe('useTeamCoProduction', () => {
  const mockGetTeamCoProduction = getTeamCoProduction as jest.MockedFunction<
    typeof getTeamCoProduction
  >;

  it('Should return the team co-production figure', async () => {
    mockGetTeamCoProduction.mockResolvedValue({ coProducedArticles: 4 });

    const { result } = renderStateHook(() =>
      useTeamCoProduction({ teamId: 'team-id-1' }),
    );

    await waitFor(() =>
      expect(result.current).toEqual({ coProducedArticles: 4 }),
    );
    expect(mockGetTeamCoProduction).toHaveBeenCalledWith(expect.anything(), {
      teamId: 'team-id-1',
    });
  });
});
