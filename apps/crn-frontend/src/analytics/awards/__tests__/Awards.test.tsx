import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { ListAwardsResponse } from '@asap-hub/model';
import { ToastContext } from '@asap-hub/react-context';
import { analytics } from '@asap-hub/routing';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';

import { getAnalyticsAwards, getAwardTypes } from '../api';
import Awards from '../Awards';

const mockSetTags = jest.fn();
const mockGetTagSuggestions = jest.fn();
let mockTags: string[] = [];

jest.mock('../api', () => ({
  getAwardTypes: jest.fn(),
  getAnalyticsAwards: jest.fn(),
}));

jest.mock('../../../hooks', () => ({
  useAnalytics: () => ({ timeRange: '30d' }),
  usePaginationParams: () => ({ currentPage: 0, pageSize: 10 }),
  usePagination: () => ({ numberOfPages: 1, renderPageHref: jest.fn() }),
  useSearch: () => ({ tags: mockTags, setTags: mockSetTags }),
  useAnalyticsOpensearch: () => ({
    client: { getTagSuggestions: mockGetTagSuggestions },
  }),
}));

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
}));

const mockGetAwardTypes = getAwardTypes as jest.MockedFunction<
  typeof getAwardTypes
>;
const mockGetAnalyticsAwards = getAnalyticsAwards as jest.MockedFunction<
  typeof getAnalyticsAwards
>;
const mockNavigate = jest.fn();
const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>;

const awardTypes = [
  { value: 'network-spotlight', label: 'Network Spotlight' },
  { value: 'open-science-champion', label: 'Open Science Champion' },
];

const awards: ListAwardsResponse = {
  total: 1,
  items: [
    {
      id: 'team-id-1_open-science-champion_all',
      teamId: 'team-id-1',
      teamName: 'Team One',
      isTeamInactive: false,
      teamAwardsCount: 3,
      awardType: 'open-science-champion',
      awardTypeName: 'Open Science Champion',
      timeRange: 'all',
      users: [{ id: 'user-id-1', name: 'User One', awardsCount: 3 }],
    },
  ],
};

const awardsPath = `${analytics.template}${analytics({}).awards.template}`;
const metricPath = `${awardsPath}${analytics({}).awards({}).metric.template}`;

const mockToast = jest.fn();

const renderPage = (path: string) =>
  render(
    <ToastContext.Provider value={mockToast}>
      <QueryClientProvider client={createTestQueryClient()}>
        <Suspense fallback="loading">
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={metricPath} element={<Awards />} />
              <Route path={awardsPath} element={<Awards />} />
            </Routes>
          </MemoryRouter>
        </Suspense>
      </QueryClientProvider>
    </ToastContext.Provider>,
  );

const openScienceChampionPath = analytics({})
  .awards({})
  .metric({ metric: 'open-science-champion' }).$;

beforeEach(() => {
  jest.clearAllMocks();
  mockTags = [];
  mockUseNavigate.mockReturnValue(mockNavigate);
  mockGetAwardTypes.mockResolvedValue(awardTypes);
  mockGetAnalyticsAwards.mockResolvedValue(awards);
});

it('renders the selected award type from the url', async () => {
  renderPage(openScienceChampionPath);

  expect(
    await screen.findByRole('heading', { name: 'Open Science Champion' }),
  ).toBeVisible();
  expect(
    screen.getByText('Number of Open Science Champion awards by team.'),
  ).toBeVisible();
  expect(
    await screen.findByRole('columnheader', {
      name: /Total number of Open Science Champion awards/,
    }),
  ).toBeVisible();
});

it('renders the awards of the selected award type', async () => {
  renderPage(openScienceChampionPath);

  expect(await screen.findByText('Team One')).toBeVisible();
  expect(screen.getAllByTestId('awards-table-row')).toHaveLength(1);
  expect(mockGetAnalyticsAwards).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      awardType: 'open-science-champion',
      timeRange: '30d',
      sort: 'team_asc',
      tags: [],
    }),
  );
});

it('passes the search tags and sort to the awards query', async () => {
  mockTags = ['Team One'];
  renderPage(`${openScienceChampionPath}?sort=awards_desc`);

  await waitFor(() =>
    expect(mockGetAnalyticsAwards).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: ['Team One'],
        sort: 'awards_desc',
      }),
    ),
  );
});

it('redirects to the first award type when no metric is specified', async () => {
  renderPage(analytics({}).awards({}).$);

  expect(
    await screen.findByRole('heading', { name: 'Network Spotlight' }),
  ).toBeVisible();
});

it('redirects to the first award type when the metric is unknown', async () => {
  renderPage(analytics({}).awards({}).metric({ metric: 'unknown' }).$);

  expect(
    await screen.findByRole('heading', { name: 'Network Spotlight' }),
  ).toBeVisible();
});

it('renders an empty table when there are no award types', async () => {
  mockGetAwardTypes.mockResolvedValue([]);
  renderPage(analytics({}).awards({}).$);

  expect(
    await screen.findByRole('columnheader', { name: /Total number of awards/ }),
  ).toBeVisible();
  expect(screen.getByText('Number of awards by team.')).toBeVisible();
  expect(screen.queryByTestId('awards-table-row')).not.toBeInTheDocument();
  expect(mockGetAnalyticsAwards).not.toHaveBeenCalled();
});

it('lists all award types in the metric dropdown', async () => {
  renderPage(openScienceChampionPath);

  await screen.findByRole('heading', { name: 'Open Science Champion' });
  await userEvent.click(screen.getAllByTitle('Chevron Down')[0]!);

  expect(await screen.findByText('Network Spotlight')).toBeVisible();
});

it('navigates to the selected award type', async () => {
  renderPage(openScienceChampionPath);

  await screen.findByRole('heading', { name: 'Open Science Champion' });
  await userEvent.click(screen.getAllByTitle('Chevron Down')[0]!);
  await userEvent.click(await screen.findByText('Network Spotlight'));

  expect(mockNavigate).toHaveBeenCalledWith(
    analytics({}).awards({}).metric({ metric: 'network-spotlight' }).$,
  );
});

it('loads tag suggestions from the awards index', async () => {
  mockGetTagSuggestions.mockResolvedValue(['Team One']);
  renderPage(openScienceChampionPath);

  await screen.findByRole('heading', { name: 'Open Science Champion' });
  const searchBox = within(screen.getByRole('search')).getByRole('combobox');
  await userEvent.type(searchBox, 'Team');

  await waitFor(() =>
    expect(mockGetTagSuggestions).toHaveBeenCalledWith('Team'),
  );
});

it('sorts by awards when the column header is clicked', async () => {
  renderPage(openScienceChampionPath);

  const awardsHeader = await screen.findByRole('columnheader', {
    name: /Total number of Open Science Champion awards/,
  });
  await userEvent.click(awardsHeader.querySelector('button')!);

  expect(mockNavigate).toHaveBeenCalledWith(
    { search: 'sort=awards_desc' },
    { replace: true },
  );
});

it('renders the CSV export button and resolves without exporting', async () => {
  renderPage(openScienceChampionPath);

  await screen.findByRole('heading', { name: 'Open Science Champion' });
  const exportButton = screen.getByRole('button', { name: /csv/i });
  await userEvent.click(exportButton);

  await waitFor(() => expect(exportButton).toBeEnabled());
  expect(mockToast).not.toHaveBeenCalled();
});
