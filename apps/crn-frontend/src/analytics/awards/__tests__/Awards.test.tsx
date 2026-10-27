import { analytics } from '@asap-hub/routing';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';

import Awards from '../Awards';

jest.mock('../../../hooks', () => ({
  useAnalytics: () => ({ timeRange: '30d' }),
  usePaginationParams: () => ({ currentPage: 0, pageSize: 10 }),
  useSearch: () => ({ tags: [], setTags: jest.fn() }),
}));

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>;

const renderPage = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={`${analytics.template}${analytics({}).awards.template}${
            analytics({}).awards({}).metric.template
          }`}
          element={<Awards />}
        />
        <Route
          path={`${analytics.template}${analytics({}).awards.template}`}
          element={<Awards />}
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNavigate.mockReturnValue(mockNavigate);
});

it('defaults to the Open Science Champion metric', () => {
  renderPage(analytics({}).awards({}).$);

  expect(
    screen.getByRole('heading', { name: 'Open Science Champion' }),
  ).toBeVisible();
  expect(
    screen.getByRole('columnheader', {
      name: /Total number of Open Science Champion awards/,
    }),
  ).toBeVisible();
});

it('renders the Network Spotlight metric from the url', () => {
  renderPage(
    analytics({}).awards({}).metric({ metric: 'network-spotlight' }).$,
  );

  expect(
    screen.getByRole('heading', { name: 'Network Spotlight' }),
  ).toBeVisible();
  expect(
    screen.getByRole('columnheader', {
      name: /Total number of Network Spotlight awards/,
    }),
  ).toBeVisible();
});

it('renders an empty table', () => {
  renderPage(analytics({}).awards({}).metric({ metric: 'os-champion' }).$);

  expect(screen.queryByTestId('awards-table-row')).not.toBeInTheDocument();
});

it('renders the export button', async () => {
  renderPage(analytics({}).awards({}).metric({ metric: 'os-champion' }).$);

  const exportButton = screen.getByRole('button', { name: /CSV/i });
  await userEvent.click(exportButton);

  await waitFor(() => expect(exportButton).toBeEnabled());
});

it('sorts by awards when the column header is clicked', async () => {
  renderPage(analytics({}).awards({}).metric({ metric: 'os-champion' }).$);

  const awardsHeader = screen.getByRole('columnheader', {
    name: /Total number of Open Science Champion awards/,
  });
  await userEvent.click(awardsHeader.querySelector('button')!);

  expect(mockNavigate).toHaveBeenCalledWith(
    { search: 'sort=awards_desc' },
    { replace: true },
  );
});

it('toggles the sort read from the url', async () => {
  renderPage(
    `${
      analytics({}).awards({}).metric({ metric: 'os-champion' }).$
    }?sort=team_desc`,
  );

  const teamHeader = screen.getByRole('columnheader', { name: /Team/ });
  await userEvent.click(teamHeader.querySelector('button')!);

  expect(mockNavigate).toHaveBeenCalledWith(
    { search: 'sort=team_asc' },
    { replace: true },
  );
});

it('navigates to the selected metric', async () => {
  renderPage(analytics({}).awards({}).metric({ metric: 'os-champion' }).$);

  const dropdownIndicators = screen.getAllByTitle('Chevron Down');
  await userEvent.click(dropdownIndicators[0]!);
  await userEvent.click(await screen.findByText('Network Spotlight'));

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith(
      analytics({}).awards({}).metric({ metric: 'network-spotlight' }).$,
    );
  });
});
