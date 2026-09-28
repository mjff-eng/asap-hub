import { mockConsoleError } from '@asap-hub/dom-test-utils';
import {
  teamCollaborationPerformance,
  userCollaborationPerformance,
  preliminaryDataSharingResponse,
} from '@asap-hub/fixtures';
import {
  createCsvFileStream,
  createTestQueryClient,
} from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  ListTeamCollaborationResponse,
  ListUserCollaborationResponse,
  PreliminaryDataSharingDataObject,
  SortSharingPrelimFindings,
  SortTeamCollaboration,
  SortUserCollaboration,
} from '@asap-hub/model';
import { analytics } from '@asap-hub/routing';
import {
  render,
  screen,
  waitFor,
  within,
  renderHook,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { when } from 'jest-when';
import React, { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AnalyticsSearchOptionsWithFiltering } from '../../utils/analytics-options';
import { OpensearchClient } from '../../utils/opensearch';
import { Auth0Provider, WhenReady } from '../../../auth/test-utils';
import {
  useAnalyticsOpensearch,
  useOpensearchMetrics,
} from '../../../hooks/opensearch';
import {
  getTeamCollaboration,
  getTeamCollaborationPerformance,
  getUserCollaboration,
  getUserCollaborationPerformance,
  getPreliminaryDataSharing,
} from '../api';
import Collaboration from '../Collaboration';
import { useAnalyticsSharingPrelimFindings } from '../state';

jest.mock('@asap-hub/frontend-utils', () => {
  const original = jest.requireActual('@asap-hub/frontend-utils');
  return {
    ...original,
    createCsvFileStream: jest
      .fn()
      .mockImplementation(() => ({ write: jest.fn(), end: jest.fn() })),
  };
});
jest.mock('../api');
jest.mock('../../../hooks/opensearch', () => ({
  useAnalyticsOpensearch: jest.fn(),
  useOpensearchMetrics: jest.fn(),
}));

type SharingPreliminaryFindingsProps = React.ComponentProps<
  (typeof import('../SharingPrelimFindings'))['default']
>;

jest.mock('../SharingPrelimFindings', () => {
  const actual = jest.requireActual('../SharingPrelimFindings');
  return {
    ...actual,
    __esModule: true,
    default: (props: SharingPreliminaryFindingsProps) => {
      const { setSort, ...rest } = props;
      const wrappedSetSort: React.Dispatch<
        React.SetStateAction<SortSharingPrelimFindings>
      > = (value) => {
        if (typeof value === 'string') {
          setSort(() => value);
        } else {
          setSort(value);
        }
      };
      const Actual = actual.default;
      return <Actual {...rest} setSort={wrappedSetSort} />;
    },
  };
});
mockConsoleError();

afterEach(() => {
  jest.clearAllMocks();
});

const mockCreateCsvFileStream = createCsvFileStream as jest.MockedFunction<
  typeof createCsvFileStream
>;

const mockGetUserCollaboration = getUserCollaboration as jest.MockedFunction<
  typeof getUserCollaboration
>;
const mockGetTeamCollaboration = getTeamCollaboration as jest.MockedFunction<
  typeof getTeamCollaboration
>;

const mockGetTeamCollaborationPerformance =
  getTeamCollaborationPerformance as jest.MockedFunction<
    typeof getTeamCollaborationPerformance
  >;
mockGetTeamCollaborationPerformance.mockResolvedValue(
  teamCollaborationPerformance,
);

const mockGetUserCollaborationPerformance =
  getUserCollaborationPerformance as jest.MockedFunction<
    typeof getUserCollaborationPerformance
  >;
mockGetUserCollaborationPerformance.mockResolvedValue(
  userCollaborationPerformance,
);

const mockGetPreliminaryDataSharing =
  getPreliminaryDataSharing as jest.MockedFunction<
    typeof getPreliminaryDataSharing
  >;
mockGetPreliminaryDataSharing.mockResolvedValue(preliminaryDataSharingResponse);

const mockUseAnalyticsOpensearch =
  useAnalyticsOpensearch as jest.MockedFunction<typeof useAnalyticsOpensearch>;
const mockUseOpensearchMetrics = useOpensearchMetrics as jest.MockedFunction<
  typeof useOpensearchMetrics
>;

const userData: ListUserCollaborationResponse = {
  total: 2,
  items: [
    {
      id: '1',
      alumniSince: undefined,
      name: 'User',
      teams: [
        {
          id: '1',
          team: 'Team A',
          role: 'Key Personnel',
          teamInactiveSince: undefined,
          outputsCoAuthoredWithinTeam: 300,
          outputsCoAuthoredAcrossTeams: 400,
        },
      ],
      totalUniqueOutputsCoAuthoredAcrossTeams: 400,
      totalUniqueOutputsCoAuthoredWithinTeam: 300,
    },
    {
      id: '2',
      alumniSince: undefined,
      name: 'User',
      teams: [
        {
          id: '1',
          team: 'Team A',
          role: 'Key Personnel',
          teamInactiveSince: undefined,
          outputsCoAuthoredWithinTeam: 2,
          outputsCoAuthoredAcrossTeams: 3,
        },
      ],
      totalUniqueOutputsCoAuthoredAcrossTeams: 3,
      totalUniqueOutputsCoAuthoredWithinTeam: 2,
    },
  ],
};

const teamData: ListTeamCollaborationResponse = {
  total: 1,
  items: [
    {
      id: '1',
      inactiveSince: undefined,
      name: 'Team 1',
      outputsCoProducedWithin: {
        Article: 100,
        Bioinformatics: 0,
        Dataset: 0,
        'Lab Material': 0,
        Protocol: 1,
      },
      totalOutputs: {
        Article: 100,
        Bioinformatics: 0,
        Dataset: 0,
        'Lab Material': 0,
        Protocol: 1,
      },
      outputsCoProducedAcross: {
        byDocumentType: {
          Article: 1,
          Bioinformatics: 0,
          Dataset: 0,
          'Lab Material': 0,
          Protocol: 1,
        },
        byTeam: [
          {
            id: '2',
            name: 'Team 2',
            isInactive: false,
            Article: 1,
            Bioinformatics: 0,
            Dataset: 0,
            'Lab Material': 0,
            Protocol: 1,
          },
        ],
      },
    },
  ],
};

const renderPage = async (
  metric: string = 'user',
  type?: string,
  search?: string,
) => {
  const basePath = analytics({})
    .collaboration({})
    .collaborationPath(type !== undefined ? { metric, type } : { metric }).$;

  const path = search ? `${basePath}?${search}` : basePath;

  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route
                  path="/analytics/collaboration/:metric/:type?"
                  element={<Collaboration />}
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

const mockGetPreliminaryDataSharingTagSuggestions = jest
  .fn()
  .mockResolvedValue([]);

beforeEach(() => {
  mockGetPreliminaryDataSharingTagSuggestions.mockClear();
  const mockOpensearchClient = {
    request: jest.fn(),
    getTagSuggestions: mockGetPreliminaryDataSharingTagSuggestions,
  };

  mockUseAnalyticsOpensearch.mockReturnValue({
    client:
      mockOpensearchClient as unknown as OpensearchClient<PreliminaryDataSharingDataObject>,
  });

  mockUseOpensearchMetrics.mockReturnValue({
    getUserCollaboration: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getUserCollaborationTagSuggestions: jest.fn().mockResolvedValue([]),
    getUserCollaborationPerformance: jest.fn().mockResolvedValue(undefined),
    getTeamCollaboration: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getTeamCollaborationTagSuggestions: jest.fn().mockResolvedValue([]),
    getTeamCollaborationPerformance: jest.fn().mockResolvedValue(undefined),
    getPreliminaryDataSharing: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 }),
    getMeetingRepAttendance: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 }),
    getMeetingRepAttendanceTagSuggestions: jest.fn().mockResolvedValue([]),
    getPreprintCompliance: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getPublicationCompliance: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 }),
    getTeamProductivity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getTeamProductivityPerformance: jest.fn().mockResolvedValue(undefined),
    getTeamProductivityTagSuggestions: jest.fn().mockResolvedValue([]),
    getUserProductivity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getUserProductivityPerformance: jest.fn().mockResolvedValue(undefined),
    getUserProductivityTagSuggestions: jest.fn().mockResolvedValue([]),
    getAnalyticsOSChampion: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 }),
    getAnalyticsWorkingGroupLeadership: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 }),
    getAnalyticsWorkingGroupLeadershipTagSuggestions: jest
      .fn()
      .mockResolvedValue([]),
    getAnalyticsInterestGroupLeadership: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 }),
    getAnalyticsInterestGroupLeadershipTagSuggestions: jest
      .fn()
      .mockResolvedValue([]),
    getPresenterRepresentation: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0 }),
    getPresenterRepresentationPerformance: jest
      .fn()
      .mockResolvedValue(undefined),
    getPresenterRepresentationTagSuggestions: jest.fn().mockResolvedValue([]),
  });

  mockGetUserCollaboration.mockResolvedValue(userData);
  mockGetTeamCollaboration.mockResolvedValue(teamData);
});

describe('user collaboration', () => {
  it('renders with user data', async () => {
    await renderPage('user', 'within-team');

    expect(screen.getByText('User Co-Production')).toBeVisible();
    expect(screen.queryByText('Team Co-Production')).not.toBeInTheDocument();

    expect(screen.getByText('Co-Production Within Team by User')).toBeVisible();
    expect(
      screen.queryByText('Co-Production Across Teams by User'),
    ).not.toBeInTheDocument();

    const input = screen.getAllByRole('combobox', { hidden: false });

    await userEvent.click(input[1]!);
    await userEvent.click(screen.getByText('Across Teams'));

    expect(
      screen.getByText('Co-Production Across Teams by User'),
    ).toBeVisible();
    expect(
      screen.queryByText('Co-Production Within Team by User'),
    ).not.toBeInTheDocument();
  });

  it('renders data for different document categories', async () => {
    const defaultUserOptions: AnalyticsSearchOptionsWithFiltering<SortUserCollaboration> =
      {
        sort: 'user_asc',
        pageSize: 10,
        currentPage: 0,
        timeRange: 'all',
        documentCategory: 'all',
        tags: [],
      };

    when(mockGetUserCollaboration)
      .calledWith(expect.anything(), {
        ...defaultUserOptions,
        documentCategory: 'article',
      })
      .mockResolvedValue({
        items: [
          {
            ...userData.items[0]!,
            id: '1-user-collaboration-all-article',
            teams: [
              {
                ...userData.items[0]!.teams[0]!,
                outputsCoAuthoredWithinTeam: 100,
              },
            ],
          },
        ],
        total: 1,
      });
    await renderPage('user', 'within-team');

    await waitFor(() => expect(screen.getByText('300')).toBeVisible());
    expect(screen.queryByText('100')).not.toBeInTheDocument();

    const categoryButton = screen.getByRole('button', {
      name: /all chevron down/i,
    });
    await userEvent.click(categoryButton);
    await userEvent.click(screen.getByText(/Article/));
    await waitFor(() =>
      expect(screen.getAllByText(/Co-Production/)).toHaveLength(2),
    );

    await waitFor(() => expect(screen.getByText('100')).toBeVisible());
    expect(screen.queryByText('300')).not.toBeInTheDocument();
  });
});

describe('team collaboration', () => {
  it('renders with team data', async () => {
    await renderPage('team', 'within-team');

    expect(screen.getByText('Team Co-Production')).toBeVisible();
    expect(screen.queryByText('User Co-Production')).not.toBeInTheDocument();

    expect(
      screen.getByText('Co-Production Within Teams by Team'),
    ).toBeVisible();
    expect(
      screen.queryByText('Co-Production Across Teams by Team'),
    ).not.toBeInTheDocument();

    const input = screen.getAllByRole('combobox', { hidden: false });

    await userEvent.click(input[1]!);
    await userEvent.click(screen.getByText('Across Teams'));

    expect(
      screen.getByText('Co-Production Across Teams by Team'),
    ).toBeVisible();
    expect(
      screen.queryByText('Co-Production Within Teams by Team'),
    ).not.toBeInTheDocument();
  });

  it('renders data for different output types', async () => {
    const defaultTeamOptions: AnalyticsSearchOptionsWithFiltering<SortTeamCollaboration> =
      {
        pageSize: 10,
        currentPage: 0,
        timeRange: 'all',
        outputType: 'all',
        sort: 'team_asc',
        tags: [],
      };

    when(mockGetTeamCollaboration)
      .calledWith(expect.anything(), {
        ...defaultTeamOptions,
        outputType: 'public',
      })
      .mockResolvedValue({
        items: [
          {
            ...teamData.items[0]!,
            id: '1-team-collaboration-all-public',
            outputsCoProducedWithin: {
              Article: 50,
              Bioinformatics: 0,
              Dataset: 0,
              'Lab Material': 0,
              Protocol: 1,
            },
            totalOutputs: {
              Article: 50,
              Bioinformatics: 0,
              Dataset: 0,
              'Lab Material': 0,
              Protocol: 1,
            },
          },
        ],
        total: 1,
      });
    await renderPage('team', 'within-team');

    await waitFor(() => expect(screen.getByText('100')).toBeVisible());
    expect(screen.queryByText('50')).not.toBeInTheDocument();

    const outputTypeButton = screen.getByRole('button', {
      name: /ASAP Output chevron down/i,
    });
    await userEvent.click(outputTypeButton);
    await userEvent.click(screen.getByText(/ASAP Public Output/i));
    await waitFor(() =>
      expect(screen.getAllByText(/Co-Production/)).toHaveLength(2),
    );

    await waitFor(() => expect(screen.getByText('50')).toBeVisible());
    expect(screen.queryByText('100')).not.toBeInTheDocument();
  });
});

describe('sharing prelim findings', () => {
  it('renders sharing prelim findings page', async () => {
    await renderPage('sharing-prelim-findings', undefined);

    expect(
      screen.getByRole('heading', { name: /Sharing Preliminary Findings/i }),
    ).toBeVisible();
    expect(screen.queryByText('User Co-Production')).not.toBeInTheDocument();

    expect(screen.queryByText('Type')).not.toBeInTheDocument();
  });

  it('uses team_asc as the default sort when no sort query param is set', async () => {
    await renderPage('sharing-prelim-findings', undefined);

    await waitFor(() => {
      expect(mockGetPreliminaryDataSharing).toHaveBeenCalled();
    });

    const [, options] = mockGetPreliminaryDataSharing.mock.calls[0]!;
    expect(options.sort).toBe('team_asc');
  });

  it('uses the sort value from the URL query param when provided', async () => {
    await renderPage(
      'sharing-prelim-findings',
      undefined,
      'sort=percent_shared_desc',
    );

    await waitFor(() => {
      expect(mockGetPreliminaryDataSharing).toHaveBeenCalled();
    });

    const [, options] = mockGetPreliminaryDataSharing.mock.calls[0]!;
    expect(options.sort).toBe('percent_shared_desc');
  });

  it('falls back to team_asc when the URL sort value is invalid', async () => {
    await renderPage(
      'sharing-prelim-findings',
      undefined,
      'sort=invalid_sort_value',
    );

    await waitFor(() => {
      expect(mockGetPreliminaryDataSharing).toHaveBeenCalled();
    });

    const [, options] = mockGetPreliminaryDataSharing.mock.calls[0]!;
    expect(options.sort).toBe('team_asc');
  });

  it('resets pagination to the first page when changing sort', async () => {
    await renderPage(
      'sharing-prelim-findings',
      undefined,
      'currentPage=2&sort=team_asc',
    );

    // Wait for BOTH the initial load (page 2) AND the usePagination
    // auto-correction (page 0) to settle before clearing
    await waitFor(() => {
      const { calls } = mockGetPreliminaryDataSharing.mock;
      expect(calls.some(([, opts]) => opts.currentPage === 0)).toBe(true);
    });

    mockGetPreliminaryDataSharing.mockClear();

    await screen.findByText('Percent Shared');

    const button = await screen.findByRole('button', {
      name: /sort by percent shared/i,
    });
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockGetPreliminaryDataSharing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentPage: 0,
          sort: 'percent_shared_desc',
        }),
      );
    });

    const call = mockGetPreliminaryDataSharing.mock.calls.find(
      ([, opts]) => opts.sort === 'percent_shared_desc',
    )!;
    const [, options] = call;
    expect(options.sort).toBe('percent_shared_desc');
    expect(options.currentPage).toBe(0);
  });

  it('updates the sort param in the URL when a sort button is clicked', async () => {
    await renderPage('sharing-prelim-findings', undefined, 'sort=team_asc');

    await waitFor(() => {
      expect(mockGetPreliminaryDataSharing).toHaveBeenCalled();
    });

    mockGetPreliminaryDataSharing.mockClear();

    const button = await screen.findByRole('button', {
      name: /sort by percent shared/i,
    });
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockGetPreliminaryDataSharing).toHaveBeenCalled();
    });

    const [, options] = mockGetPreliminaryDataSharing.mock.calls[0]!;
    expect(options.sort).toBe('percent_shared_desc');
  });

  it('toggles percent shared sort from desc to asc when clicked again', async () => {
    await renderPage(
      'sharing-prelim-findings',
      undefined,
      'sort=percent_shared_desc',
    );

    await waitFor(() => {
      expect(mockGetPreliminaryDataSharing).toHaveBeenCalled();
    });

    mockGetPreliminaryDataSharing.mockClear();

    const button = await screen.findByRole('button', {
      name: /sort by percent shared/i,
    });
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockGetPreliminaryDataSharing).toHaveBeenCalled();
    });

    const [, options] = mockGetPreliminaryDataSharing.mock.calls[0]!;
    expect(options.sort).toBe('percent_shared_asc');
  });

  it('sets default time range to last 12 months', async () => {
    await renderPage('sharing-prelim-findings', undefined);

    expect(
      screen.getByRole('heading', { name: /Sharing Preliminary Findings/i }),
    ).toBeVisible();

    expect(
      screen.queryByRole('button', {
        name: /Since Hub Launch \(2020\)/i,
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /Last 12 months/i }),
    ).toBeVisible();
  });

  it('can navigate to sharing preliminary findings page', async () => {
    await renderPage('user', 'within-team');
    const input = screen.getAllByRole('combobox', { hidden: false });

    await userEvent.click(input[0]!);
    await userEvent.click(screen.getByText('Sharing Preliminary Findings'));

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('heading', { name: /Sharing Preliminary Findings/i }),
    ).toBeVisible();
    expect(screen.queryByText('User Co-Production')).not.toBeInTheDocument();
    expect(screen.queryByText('Type')).not.toBeInTheDocument();
  });

  it('exports analytics for sharing preliminary findings', async () => {
    await renderPage('sharing-prelim-findings', undefined);
    await userEvent.click(screen.getByText(/csv/i));
    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/collaboration_sharing-prelim-findings_\d+\.csv/),
      expect.anything(),
    );
  });

  it('exports sharing preliminary findings with the current sort applied', async () => {
    await renderPage(
      'sharing-prelim-findings',
      undefined,
      'sort=percent_shared_desc',
    );
    mockGetPreliminaryDataSharing.mockClear();
    await userEvent.click(screen.getByText(/csv/i));
    await waitFor(() => {
      expect(mockGetPreliminaryDataSharing).toHaveBeenCalled();
    });
    const [, options] = mockGetPreliminaryDataSharing.mock.calls[0]!;
    expect(options.sort).toBe('percent_shared_desc');
  });

  it('throws error when preliminary data sharing fails', async () => {
    const error = new Error('API Error');
    mockGetPreliminaryDataSharing.mockRejectedValue(error);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    let caughtError: Error | null = null;

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      state = { hasError: false };

      static getDerivedStateFromError(err: Error) {
        caughtError = err;
        return { hasError: true };
      }

      render() {
        if (this.state.hasError) {
          return <div>Error caught</div>;
        }
        return this.props.children;
      }
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={createTestQueryClient()}>
        <ErrorBoundary>
          <Suspense fallback="loading">{children}</Suspense>
        </ErrorBoundary>
      </QueryClientProvider>
    );

    renderHook(
      () =>
        useAnalyticsSharingPrelimFindings({
          currentPage: 0,
          pageSize: 10,
          sort: 'team_asc',
          tags: [],
          timeRange: 'all',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(caughtError?.message).toBe('API Error');
    });
  });
});

it('navigates between user and team collaboration pages', async () => {
  await renderPage('user', 'within-team');
  const input = screen.getAllByRole('combobox', { hidden: false });

  await userEvent.click(input[0]!);
  await userEvent.click(screen.getByText('Team Co-Production'));

  await waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
  );
  expect(screen.getByText('Team Co-Production')).toBeVisible();
  expect(screen.queryByText('User Co-Production')).not.toBeInTheDocument();
});

describe('search', () => {
  const getSearchBox = () => {
    const searchContainer = screen.getByRole('search') as HTMLElement;
    return within(searchContainer).getByRole('combobox') as HTMLInputElement;
  };
  it('uses OpenSearch for tag suggestions', async () => {
    const mockGetUserCollaborationTagSuggestionsOS = jest
      .fn()
      .mockResolvedValue(['tag-os-1']);

    mockUseOpensearchMetrics.mockReturnValue({
      getUserCollaboration: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getUserCollaborationTagSuggestions:
        mockGetUserCollaborationTagSuggestionsOS,
      getUserCollaborationPerformance: jest.fn().mockResolvedValue(undefined),
      getTeamCollaboration: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getTeamCollaborationTagSuggestions: jest.fn().mockResolvedValue([]),
      getTeamCollaborationPerformance: jest.fn().mockResolvedValue(undefined),
      getPreliminaryDataSharing: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getMeetingRepAttendance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getMeetingRepAttendanceTagSuggestions: jest.fn().mockResolvedValue([]),
      getPreprintCompliance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getPublicationCompliance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getTeamProductivity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getTeamProductivityPerformance: jest.fn().mockResolvedValue(undefined),
      getTeamProductivityTagSuggestions: jest.fn().mockResolvedValue([]),
      getUserProductivity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getUserProductivityPerformance: jest.fn().mockResolvedValue(undefined),
      getUserProductivityTagSuggestions: jest.fn().mockResolvedValue([]),
      getAnalyticsOSChampion: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsWorkingGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsWorkingGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
      getAnalyticsInterestGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsInterestGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
      getPresenterRepresentation: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getPresenterRepresentationPerformance: jest
        .fn()
        .mockResolvedValue(undefined),
      getPresenterRepresentationTagSuggestions: jest.fn().mockResolvedValue([]),
    });

    await renderPage('user', 'within-team');
    const searchBox = getSearchBox();

    await userEvent.type(searchBox, 'tag');
    await waitFor(() =>
      expect(mockGetUserCollaborationTagSuggestionsOS).toHaveBeenCalledWith(
        'tag',
      ),
    );
  });

  it('uses OpenSearch for team tag suggestions', async () => {
    const mockGetTeamCollaborationTagSuggestionsOS = jest
      .fn()
      .mockResolvedValue(['team-tag-os-1']);

    mockUseOpensearchMetrics.mockReturnValue({
      getUserCollaboration: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getUserCollaborationTagSuggestions: jest.fn().mockResolvedValue([]),
      getUserCollaborationPerformance: jest.fn().mockResolvedValue(undefined),
      getTeamCollaboration: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getTeamCollaborationTagSuggestions:
        mockGetTeamCollaborationTagSuggestionsOS,
      getTeamCollaborationPerformance: jest.fn().mockResolvedValue(undefined),
      getPreliminaryDataSharing: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getMeetingRepAttendance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getMeetingRepAttendanceTagSuggestions: jest.fn().mockResolvedValue([]),
      getPreprintCompliance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getPublicationCompliance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getTeamProductivity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getTeamProductivityPerformance: jest.fn().mockResolvedValue(undefined),
      getTeamProductivityTagSuggestions: jest.fn().mockResolvedValue([]),
      getUserProductivity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getUserProductivityPerformance: jest.fn().mockResolvedValue(undefined),
      getUserProductivityTagSuggestions: jest.fn().mockResolvedValue([]),
      getAnalyticsOSChampion: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsWorkingGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsWorkingGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
      getAnalyticsInterestGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsInterestGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
      getPresenterRepresentation: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getPresenterRepresentationPerformance: jest
        .fn()
        .mockResolvedValue(undefined),
      getPresenterRepresentationTagSuggestions: jest.fn().mockResolvedValue([]),
    });

    await renderPage('team', 'within-team');
    const searchBox = getSearchBox();

    await userEvent.type(searchBox, 'team-tag');
    await waitFor(() =>
      expect(mockGetTeamCollaborationTagSuggestionsOS).toHaveBeenCalledWith(
        'team-tag',
      ),
    );
  });

  it('loads tag suggestions from preliminary data sharing index for sharing preliminary findings', async () => {
    mockGetPreliminaryDataSharing.mockResolvedValue(
      preliminaryDataSharingResponse,
    );
    mockGetPreliminaryDataSharingTagSuggestions.mockResolvedValue([
      'Team Alessi',
    ]);

    await renderPage('sharing-prelim-findings', undefined);
    const searchContainer = screen.getByRole('search') as HTMLElement;
    const searchBox = within(searchContainer).getByRole(
      'combobox',
    ) as HTMLInputElement;

    await userEvent.type(searchBox, 'Alessi');
    await waitFor(() =>
      expect(mockGetPreliminaryDataSharingTagSuggestions).toHaveBeenCalledWith(
        'Alessi',
        'flat',
      ),
    );
    // sharing-prelim-findings must not call user or team tag APIs
    const metricsReturnValue = mockUseOpensearchMetrics.mock.results[0]?.value;
    expect(
      metricsReturnValue?.getUserCollaborationTagSuggestions,
    ).not.toHaveBeenCalled();
    expect(
      metricsReturnValue?.getTeamCollaborationTagSuggestions,
    ).not.toHaveBeenCalled();
  });
});

describe('csv export', () => {
  it('exports analytics for user', async () => {
    await renderPage('user', 'within-team');
    await userEvent.click(screen.getByText(/csv/i));
    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/collaboration_user_\d+\.csv/),
      expect.anything(),
    );
  });

  it.each(['within-team', 'across-teams'])(
    'exports analytics for teams (%s)',
    async (type) => {
      await renderPage('team', type);
      const input = screen.getAllByRole('combobox', { hidden: false })[0];

      input && (await userEvent.click(input));
      await userEvent.click(screen.getByText(/csv/i));
      expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
        expect.stringMatching(/collaboration_team_\d+\.csv/),
        expect.anything(),
      );
    },
  );

  it('exports user collaboration analytics via OpenSearch', async () => {
    const mockGetUserCollaborationOS = jest.fn().mockResolvedValue(userData);
    const mockGetUserCollaborationPerformanceOS = jest
      .fn()
      .mockResolvedValue(userCollaborationPerformance);

    mockUseOpensearchMetrics.mockReturnValue({
      getUserCollaboration: mockGetUserCollaborationOS,
      getUserCollaborationTagSuggestions: jest.fn().mockResolvedValue([]),
      getUserCollaborationPerformance: mockGetUserCollaborationPerformanceOS,
      getTeamCollaboration: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getTeamCollaborationTagSuggestions: jest.fn().mockResolvedValue([]),
      getTeamCollaborationPerformance: jest.fn().mockResolvedValue(undefined),
      getPreliminaryDataSharing: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getMeetingRepAttendance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getMeetingRepAttendanceTagSuggestions: jest.fn().mockResolvedValue([]),
      getPreprintCompliance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getPublicationCompliance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getTeamProductivity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getTeamProductivityPerformance: jest.fn().mockResolvedValue(undefined),
      getTeamProductivityTagSuggestions: jest.fn().mockResolvedValue([]),
      getUserProductivity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getUserProductivityPerformance: jest.fn().mockResolvedValue(undefined),
      getUserProductivityTagSuggestions: jest.fn().mockResolvedValue([]),
      getAnalyticsOSChampion: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsWorkingGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsWorkingGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
      getAnalyticsInterestGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsInterestGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
      getPresenterRepresentation: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getPresenterRepresentationPerformance: jest
        .fn()
        .mockResolvedValue(undefined),
      getPresenterRepresentationTagSuggestions: jest.fn().mockResolvedValue([]),
    });

    await renderPage('user', 'within-team');

    // Clear only the Algolia mock after initial render
    mockGetUserCollaboration.mockClear();

    await userEvent.click(screen.getByText(/csv/i));

    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/collaboration_user_\d+\.csv/),
      expect.anything(),
    );

    expect(mockGetUserCollaborationOS).toHaveBeenCalledWith({
      documentCategory: 'all',
      sort: 'user_asc',
      tags: [],
      timeRange: 'all',
      currentPage: expect.any(Number),
      pageSize: 200,
    });

    expect(mockGetUserCollaboration).not.toHaveBeenCalled();
  });

  it('exports team collaboration analytics via OpenSearch', async () => {
    const mockGetTeamCollaborationOS = jest.fn().mockResolvedValue(teamData);
    const mockGetTeamCollaborationPerformanceOS = jest
      .fn()
      .mockResolvedValue(teamCollaborationPerformance);

    mockUseOpensearchMetrics.mockReturnValue({
      getUserCollaboration: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getUserCollaborationTagSuggestions: jest.fn().mockResolvedValue([]),
      getUserCollaborationPerformance: jest.fn().mockResolvedValue(undefined),
      getTeamCollaboration: mockGetTeamCollaborationOS,
      getTeamCollaborationTagSuggestions: jest.fn().mockResolvedValue([]),
      getTeamCollaborationPerformance: mockGetTeamCollaborationPerformanceOS,
      getPreliminaryDataSharing: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getMeetingRepAttendance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getMeetingRepAttendanceTagSuggestions: jest.fn().mockResolvedValue([]),
      getPreprintCompliance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getPublicationCompliance: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getTeamProductivity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getTeamProductivityPerformance: jest.fn().mockResolvedValue(undefined),
      getTeamProductivityTagSuggestions: jest.fn().mockResolvedValue([]),
      getUserProductivity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getUserProductivityPerformance: jest.fn().mockResolvedValue(undefined),
      getUserProductivityTagSuggestions: jest.fn().mockResolvedValue([]),
      getAnalyticsOSChampion: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsWorkingGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsWorkingGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
      getAnalyticsInterestGroupLeadership: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getAnalyticsInterestGroupLeadershipTagSuggestions: jest
        .fn()
        .mockResolvedValue([]),
      getPresenterRepresentation: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0 }),
      getPresenterRepresentationPerformance: jest
        .fn()
        .mockResolvedValue(undefined),
      getPresenterRepresentationTagSuggestions: jest.fn().mockResolvedValue([]),
    });

    await renderPage('team', 'within-team');

    // Clear only the Algolia mock after initial render
    mockGetTeamCollaboration.mockClear();

    await userEvent.click(screen.getByText(/csv/i));

    expect(mockCreateCsvFileStream).toHaveBeenCalledWith(
      expect.stringMatching(/collaboration_team_\d+\.csv/),
      expect.anything(),
    );

    expect(mockGetTeamCollaborationOS).toHaveBeenCalledWith({
      outputType: 'all',
      sort: 'team_asc',
      tags: [],
      timeRange: 'all',
      currentPage: expect.any(Number),
      pageSize: 200,
    });

    expect(mockGetTeamCollaboration).not.toHaveBeenCalled();
  });
});
