import {
  createCsvFileStream,
  createTestQueryClient,
} from '@asap-hub/frontend-utils';
import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import { disable, enable } from '@asap-hub/flags';
import { analytics } from '@asap-hub/routing';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { when } from 'jest-when';
import userEvent from '@testing-library/user-event';
import React, { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import {
  OSChampionOpensearchResponse,
  AnalyticsTeamLeadershipResponse,
} from '@asap-hub/model';
import { teamLeadershipResponse } from '@asap-hub/fixtures';
import Leadership from '../Leadership';
import { useAnalyticsOpensearch, useOpensearchMetrics } from '../../../hooks';
import { OpensearchClient } from '../../utils/opensearch';

jest.spyOn(console, 'error').mockImplementation();

// Shared ErrorBoundary component for tests
const createErrorBoundary = (onError: (error: Error) => void) => {
  class TestErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    state = { hasError: false };

    static getDerivedStateFromError(err: Error) {
      onError(err);
      return { hasError: true };
    }

    render() {
      if (this.state.hasError) {
        return <div data-testid="error">Error caught</div>;
      }
      return this.props.children;
    }
  }
  return TestErrorBoundary;
};

jest.mock('@asap-hub/frontend-utils', () => {
  const original = jest.requireActual('@asap-hub/frontend-utils');
  return {
    ...original,
    createCsvFileStream: jest
      .fn()
      .mockImplementation(() => ({ write: jest.fn(), end: jest.fn() })),
  };
});

jest.mock('../../../hooks/opensearch', () => ({
  useAnalyticsOpensearch: jest.fn(),
}));

jest.mock('../../../hooks', () => {
  const actual = jest.requireActual('../../../hooks');
  return {
    ...actual,
    useOpensearchMetrics: jest.fn(),
  };
});

const mockCreateCsvFileStream = createCsvFileStream as jest.MockedFunction<
  typeof createCsvFileStream
>;

const mockGetTagSuggestions = jest.fn() as jest.MockedFunction<
  OpensearchClient<OSChampionOpensearchResponse>['getTagSuggestions']
>;

const mockOSChampionSearch = jest.fn() as jest.MockedFunction<
  OpensearchClient<OSChampionOpensearchResponse>['search']
>;

const mockUseAnalyticsOpensearch =
  useAnalyticsOpensearch as jest.MockedFunction<typeof useAnalyticsOpensearch>;

const mockUseOpensearchMetrics = useOpensearchMetrics as jest.MockedFunction<
  typeof useOpensearchMetrics
>;

// Create actual OpensearchClient instances for testing
const wgLeadershipClient =
  new OpensearchClient<AnalyticsTeamLeadershipResponse>(
    'wg-leadership',
    'Bearer token',
  );
const igLeadershipClient =
  new OpensearchClient<AnalyticsTeamLeadershipResponse>(
    'ig-leadership',
    'Bearer token',
  );

beforeEach(() => {
  jest.clearAllMocks();
  disable('AWARDS_TAB');

  const mockOpensearchClient = {
    getTagSuggestions: mockGetTagSuggestions,
    search: mockOSChampionSearch,
  };

  mockGetTagSuggestions.mockResolvedValue(['Alessi', 'tag2']);

  // Mock useAnalyticsOpensearch to return different clients based on index
  mockUseAnalyticsOpensearch.mockImplementation((index: string) => {
    if (index === 'wg-leadership') {
      return { client: wgLeadershipClient };
    }
    if (index === 'ig-leadership') {
      return { client: igLeadershipClient };
    }
    return {
      client:
        mockOpensearchClient as unknown as OpensearchClient<OSChampionOpensearchResponse>,
    };
  });

  // Set up default search response for leadership clients
  jest
    .spyOn(wgLeadershipClient, 'search')
    .mockResolvedValue({ items: [], total: 0 });
  jest
    .spyOn(igLeadershipClient, 'search')
    .mockResolvedValue({ items: [], total: 0 });
  mockOpensearchClient.search.mockResolvedValue({ items: [], total: 0 });

  mockUseOpensearchMetrics.mockReturnValue({
    getAnalyticsWorkingGroupLeadership: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 }),
    getAnalyticsWorkingGroupLeadershipTagSuggestions: jest
      .fn()
      .mockResolvedValue(['Alessi', 'tag2']),
    getAnalyticsInterestGroupLeadership: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 }),
    getAnalyticsInterestGroupLeadershipTagSuggestions: jest
      .fn()
      .mockResolvedValue(['Alessi', 'tag2']),
  } as unknown as ReturnType<typeof useOpensearchMetrics>);
});

const getPath = (metric: string) =>
  analytics({}).leadership({}).metric({ metric }).$;
const renderPage = async (metric = 'working-group') => {
  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter initialEntries={[getPath(metric)]}>
              <Routes>
                <Route
                  path="/analytics/leadership/:metric"
                  element={<Leadership />}
                />
              </Routes>
            </MemoryRouter>
          </WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>,
  );

  await waitFor(() =>
    expect(result.queryByText(/loading/i)).not.toBeInTheDocument(),
  );

  return result;
};

it('renders with working group data', async () => {
  await renderPage();
  expect(
    screen.getAllByText('Working Group Leadership & Membership').length,
  ).toBe(2);
});

it('renders with interest group data', async () => {
  await renderPage('interest-group');
  expect(
    screen.getAllByText('Interest Group Leadership & Membership').length,
  ).toBe(2);
});

it('renders with open science data', async () => {
  await renderPage('os-champion');
  expect(screen.getAllByText('Open Science Champion').length).toBe(2);
});

it('switches to interest group data', async () => {
  jest.spyOn(console, 'error').mockImplementation();
  const label = /Interest Group Leadership & Membership/;

  await renderPage('working-group');
  const input = screen.getAllByRole('combobox', { hidden: false })[0]!;
  await userEvent.click(input);
  await userEvent.click(screen.getByText(label));

  // Wait for navigation and content to render with deferred transitions
  await waitFor(() => {
    expect(screen.getAllByText(label).length).toBe(2);
  });
});

it('switches to open science champion data', async () => {
  jest.spyOn(console, 'error').mockImplementation();
  const label = /Open Science Champion/;

  await renderPage();
  const input = screen.getAllByRole('combobox', { hidden: false })[0]!;
  await userEvent.click(input);
  await userEvent.click(screen.getByText(label));

  // After selecting "Open Science Champion", it should appear multiple times:
  // in the dropdown, heading, and other UI elements
  expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(2);
});

it('renders OS Champion page without redirect', async () => {
  await renderPage('os-champion');
  expect(screen.getAllByText('Open Science Champion').length).toBe(2);
});

it('hides the open science champion option when the Awards tab is enabled', async () => {
  enable('AWARDS_TAB');

  await renderPage('working-group');
  const input = screen.getAllByRole('combobox', { hidden: false })[0]!;
  await userEvent.click(input);

  expect(
    screen.getByText(/Interest Group Leadership & Membership/),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Open Science Champion/)).not.toBeInTheDocument();
});

describe('search', () => {
  const getSearchBox = () => {
    const searchContainer = screen.getByRole('search') as HTMLElement;
    return within(searchContainer).getByRole('combobox') as HTMLInputElement;
  };
  describe('working-group search', () => {
    it('allows typing in search queries', async () => {
      const localMockGetTagSuggestions = jest
        .fn()
        .mockResolvedValue(['Alessi', 'tag2']);
      mockUseOpensearchMetrics.mockReturnValue({
        getAnalyticsWorkingGroupLeadership: jest
          .fn()
          .mockResolvedValue({ items: [], total: 0 }),
        getAnalyticsWorkingGroupLeadershipTagSuggestions:
          localMockGetTagSuggestions,
        getAnalyticsInterestGroupLeadership: jest
          .fn()
          .mockResolvedValue({ items: [], total: 0 }),
        getAnalyticsInterestGroupLeadershipTagSuggestions: jest
          .fn()
          .mockResolvedValue([]),
      } as unknown as ReturnType<typeof useOpensearchMetrics>);

      await renderPage();
      const searchBox = getSearchBox();

      await userEvent.type(searchBox, 'test123');
      expect(searchBox.value).toEqual('test123');
      await waitFor(() =>
        expect(localMockGetTagSuggestions).toHaveBeenCalledWith('test123'),
      );
    });
    it('Will search using selected team tag', async () => {
      const localMockGetTagSuggestions = jest
        .fn()
        .mockResolvedValue(['Alessi']);

      mockUseOpensearchMetrics.mockReturnValue({
        getAnalyticsWorkingGroupLeadership: jest
          .fn()
          .mockResolvedValue({ items: [], total: 0 }),
        getAnalyticsWorkingGroupLeadershipTagSuggestions:
          localMockGetTagSuggestions,
        getAnalyticsInterestGroupLeadership: jest
          .fn()
          .mockResolvedValue({ items: [], total: 0 }),
        getAnalyticsInterestGroupLeadershipTagSuggestions: jest
          .fn()
          .mockResolvedValue([]),
      } as unknown as ReturnType<typeof useOpensearchMetrics>);

      await renderPage();
      const searchBox = getSearchBox();

      await userEvent.click(searchBox);
      await waitFor(() => {
        expect(screen.getByText('Alessi')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('Alessi'));
      await waitFor(() =>
        expect(wgLeadershipClient.search).toHaveBeenCalledWith(
          expect.objectContaining({ searchTags: ['Alessi'] }),
        ),
      );
    });
  });

  describe('opensearch', () => {
    it('allows typing in search queries', async () => {
      await renderPage('os-champion');
      const searchBox = getSearchBox();

      await userEvent.type(searchBox, 'test123');
      expect(searchBox.value).toEqual('test123');
      await waitFor(() =>
        expect(mockGetTagSuggestions).toHaveBeenCalledWith('test123'),
      );
    });
    it('Will search opensearch using selected team', async () => {
      mockGetTagSuggestions.mockResolvedValue(['Alessi']);

      await renderPage('os-champion');
      const searchBox = getSearchBox();

      await userEvent.click(searchBox);
      await waitFor(() => {
        expect(screen.getByText('Alessi')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('Alessi'));
      await waitFor(() =>
        expect(mockOSChampionSearch).toHaveBeenCalledWith({
          searchTags: ['Alessi'],
          currentPage: 0,
          pageSize: 10,
          timeRange: 'all',
          searchScope: 'extended',
          sort: [{ 'teamName.keyword': { order: 'asc' } }],
        }),
      );
    });
  });
});

describe('csv export', () => {
  it('exports analytics for working groups', async () => {
    await renderPage();
    await userEvent.click(screen.getByText(/csv/i));
    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/leadership_working-group_\d+\.csv/),
      expect.anything(),
    );
  });

  it('exports analytics for interest groups', async () => {
    await renderPage('interest-group');
    await userEvent.click(screen.getByText(/csv/i));
    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/leadership_interest-group_\d+\.csv/),
      expect.anything(),
    );
  });

  it('exports analytics for os champion', async () => {
    await renderPage('os-champion');
    await userEvent.click(screen.getByText(/csv/i));
    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/leadership_os-champion_\d+\.csv/),
      expect.anything(),
    );
  });
});

describe('working-group', () => {
  it('uses opensearch for tag suggestions', async () => {
    const localMockGetTagSuggestions = jest
      .fn()
      .mockResolvedValue(['Alessi', 'tag2']);
    const mockGetAnalyticsWorkingGroupLeadership = jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 });

    mockUseOpensearchMetrics.mockReturnValue({
      getAnalyticsWorkingGroupLeadership:
        mockGetAnalyticsWorkingGroupLeadership,
      getAnalyticsWorkingGroupLeadershipTagSuggestions:
        localMockGetTagSuggestions,
      getAnalyticsInterestGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsInterestGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
    } as unknown as ReturnType<typeof useOpensearchMetrics>);

    await renderPage('working-group');

    const searchContainer = screen.getByRole('search') as HTMLElement;
    const searchBox = within(searchContainer).getByRole(
      'combobox',
    ) as HTMLInputElement;

    await userEvent.type(searchBox, 'test123');

    await waitFor(() => {
      expect(localMockGetTagSuggestions).toHaveBeenCalledWith('test123');
    });
  });

  it('uses opensearch for CSV export', async () => {
    const mockGetAnalyticsWorkingGroupLeadership = jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 });
    const localMockGetTagSuggestions = jest
      .fn()
      .mockResolvedValue(['Alessi', 'tag2']);

    mockUseOpensearchMetrics.mockReturnValue({
      getAnalyticsWorkingGroupLeadership:
        mockGetAnalyticsWorkingGroupLeadership,
      getAnalyticsWorkingGroupLeadershipTagSuggestions:
        localMockGetTagSuggestions,
      getAnalyticsInterestGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsInterestGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
    } as unknown as ReturnType<typeof useOpensearchMetrics>);

    await renderPage('working-group');

    await userEvent.click(screen.getByText(/csv/i));

    expect(mockGetAnalyticsWorkingGroupLeadership).toHaveBeenCalled();

    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/leadership_working-group_\d+\.csv/),
      expect.anything(),
    );
  });
});

describe('interest-group', () => {
  it('uses opensearch for tag suggestions', async () => {
    const localMockGetTagSuggestions = jest
      .fn()
      .mockResolvedValue(['Alessi', 'tag2']);
    const mockGetAnalyticsInterestGroupLeadership = jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 });

    mockUseOpensearchMetrics.mockReturnValue({
      getAnalyticsWorkingGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsWorkingGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
      getAnalyticsInterestGroupLeadership:
        mockGetAnalyticsInterestGroupLeadership,
      getAnalyticsInterestGroupLeadershipTagSuggestions:
        localMockGetTagSuggestions,
    } as unknown as ReturnType<typeof useOpensearchMetrics>);

    await renderPage('interest-group');

    const searchContainer = screen.getByRole('search') as HTMLElement;
    const searchBox = within(searchContainer).getByRole(
      'combobox',
    ) as HTMLInputElement;

    await userEvent.type(searchBox, 'test123');

    await waitFor(() => {
      expect(localMockGetTagSuggestions).toHaveBeenCalledWith('test123');
    });
  });

  it('uses opensearch for CSV export', async () => {
    const mockGetAnalyticsInterestGroupLeadership = jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 });
    const localMockGetTagSuggestions = jest
      .fn()
      .mockResolvedValue(['Alessi', 'tag2']);

    mockUseOpensearchMetrics.mockReturnValue({
      getAnalyticsWorkingGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsWorkingGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
      getAnalyticsInterestGroupLeadership:
        mockGetAnalyticsInterestGroupLeadership,
      getAnalyticsInterestGroupLeadershipTagSuggestions:
        localMockGetTagSuggestions,
    } as unknown as ReturnType<typeof useOpensearchMetrics>);

    await renderPage('interest-group');

    await userEvent.click(screen.getByText(/csv/i));

    expect(mockGetAnalyticsInterestGroupLeadership).toHaveBeenCalled();

    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/leadership_interest-group_\d+\.csv/),
      expect.anything(),
    );
  });
});

it('renders data for different time ranges', async () => {
  const osChampionResponse: OSChampionOpensearchResponse = {
    objectID: 'object-id-1',
    teamId: 'team-id-1',
    teamName: 'Team One',
    isTeamInactive: false,
    teamAwardsCount: 20,
    timeRange: 'all',
    users: [
      {
        id: 'user-id-1',
        name: 'Test User One',
        awardsCount: 1,
      },
      {
        id: 'user-id-2',
        name: 'Test User Two',
        awardsCount: 1,
      },
    ],
  };
  const defaultSort = [{ 'teamName.keyword': { order: 'asc' as const } }];
  when(mockOSChampionSearch)
    .calledWith({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      searchScope: 'extended',
      sort: defaultSort,
    })
    .mockResolvedValue({ items: [osChampionResponse], total: 1 });
  when(mockOSChampionSearch)
    .calledWith({
      searchTags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: '30d',
      searchScope: 'extended',
      sort: defaultSort,
    })
    .mockResolvedValue({
      items: [
        {
          ...osChampionResponse,
          objectID: 'object-id-2',
          timeRange: '30d',
          teamAwardsCount: 10,
        },
      ],
      total: 1,
    });
  await renderPage('os-champion');

  await waitFor(() => {
    expect(screen.getByText('20')).toBeVisible();
  });
  expect(screen.queryByText('10')).not.toBeInTheDocument();

  const rangeButton = screen.getByRole('button', {
    name: /Since Hub Launch \(2020\) Chevron Down/i,
  });
  await userEvent.click(rangeButton);
  await userEvent.click(screen.getByText(/Last 30 days/));
  await waitFor(() =>
    expect(screen.getAllByText('Open Science Champion')).toHaveLength(2),
  );

  await waitFor(() => {
    expect(screen.getByText('10')).toBeVisible();
  });
  expect(screen.queryByText('20')).not.toBeInTheDocument();
});

describe('error handling', () => {
  it('handles API errors when fetching leadership data', async () => {
    const error = new Error('Failed to fetch leadership data');
    jest.spyOn(wgLeadershipClient, 'search').mockRejectedValueOnce(error);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    let caughtError: Error | null = null;
    const ErrorBoundary = createErrorBoundary((err) => {
      caughtError = err;
    });

    const result = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ErrorBoundary>
          <Suspense fallback="loading">
            <Auth0Provider user={{}}>
              <WhenReady>
                <MemoryRouter initialEntries={[getPath('working-group')]}>
                  <Routes>
                    <Route
                      path="/analytics/leadership/:metric"
                      element={<Leadership />}
                    />
                  </Routes>
                </MemoryRouter>
              </WhenReady>
            </Auth0Provider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    // The error should be caught and the component should handle it
    // (covers the queryFn's Error re-throw to the error boundary)
    await waitFor(() => {
      expect(caughtError?.message).toBe('Failed to fetch leadership data');
    });

    expect(result.getByTestId('error')).toBeInTheDocument();
  });

  it('handles errors when the fetch rejects', async () => {
    const error = new Error('Test error');
    jest.spyOn(wgLeadershipClient, 'search').mockRejectedValueOnce(error);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    let caughtError: Error | null = null;
    const ErrorBoundary = createErrorBoundary((err) => {
      caughtError = err;
    });

    const result = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ErrorBoundary>
          <Suspense fallback="loading">
            <Auth0Provider user={{}}>
              <WhenReady>
                <MemoryRouter initialEntries={[getPath('working-group')]}>
                  <Routes>
                    <Route
                      path="/analytics/leadership/:metric"
                      element={<Leadership />}
                    />
                  </Routes>
                </MemoryRouter>
              </WhenReady>
            </Auth0Provider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(caughtError?.message).toBe('Test error');
    });

    expect(result.getByTestId('error')).toBeInTheDocument();
  });

  it('renders when the fetch resolves valid leadership data', async () => {
    const mockTeam1 = {
      ...teamLeadershipResponse,
      id: 'team-1',
    };
    const mockTeam2 = {
      ...teamLeadershipResponse,
      id: 'team-2',
    };

    jest.spyOn(wgLeadershipClient, 'search').mockResolvedValueOnce({
      items: [mockTeam1, mockTeam2],
      total: 2,
    });

    const result = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <Suspense fallback="loading">
          <Auth0Provider user={{}}>
            <WhenReady>
              <MemoryRouter initialEntries={[getPath('working-group')]}>
                <Routes>
                  <Route
                    path="/analytics/leadership/:metric"
                    element={<Leadership />}
                  />
                </Routes>
              </MemoryRouter>
            </WhenReady>
          </Auth0Provider>
        </Suspense>
      </QueryClientProvider>,
    );

    // Wait for data to load - this verifies that the selector properly
    // sets team list states (line 83) when valid data is provided
    await waitFor(() => {
      expect(result.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Verify the data was loaded correctly
    expect(wgLeadershipClient.search).toHaveBeenCalled();
  });
});
