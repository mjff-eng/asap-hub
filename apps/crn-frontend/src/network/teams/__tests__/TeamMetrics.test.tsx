import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { TeamProductivityOpensearchDocument } from '@asap-hub/model';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { Suspense } from 'react';

import { Auth0Provider, WhenReady } from '../../../auth/test-utils';
import { getTeamLeadershipMetrics } from '../../../analytics/leadership/api';
import { getTeamHubResearchOutputs } from '../../../analytics/productivity/api';
import TeamMetrics from '../TeamMetrics';

jest.mock('../../../analytics/productivity/api');
jest.mock('../../../analytics/leadership/api');

const mockGetTeamHubResearchOutputs =
  getTeamHubResearchOutputs as jest.MockedFunction<
    typeof getTeamHubResearchOutputs
  >;
const mockGetTeamLeadershipMetrics =
  getTeamLeadershipMetrics as jest.MockedFunction<
    typeof getTeamLeadershipMetrics
  >;

const createDocument = (
  overrides: Partial<TeamProductivityOpensearchDocument> = {},
): TeamProductivityOpensearchDocument => ({
  id: 'team-id-1',
  name: 'Team 1',
  isInactive: false,
  Article: 0,
  Bioinformatics: 0,
  Dataset: 0,
  'Lab Material': 0,
  Protocol: 0,
  timeRange: 'all',
  outputType: 'all',
  ...overrides,
});

beforeEach(() => {
  mockGetTeamLeadershipMetrics.mockResolvedValue({
    workingGroupLead: false,
    interestGroupLead: false,
  });
});

afterEach(jest.clearAllMocks);

const renderTab = async (teamId = 'team-id-1') => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{ id: 'user-id' }}>
          <WhenReady>
            <TeamMetrics teamId={teamId} />
          </WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
  );
};

it('fetches the hub research outputs for the team', async () => {
  mockGetTeamHubResearchOutputs.mockResolvedValue({});

  await renderTab('t42');

  expect(mockGetTeamHubResearchOutputs).toHaveBeenCalledWith(
    expect.anything(),
    { teamId: 't42' },
  );
});

it('fetches the leadership metrics for the team', async () => {
  mockGetTeamHubResearchOutputs.mockResolvedValue({});

  await renderTab('t42');

  expect(mockGetTeamLeadershipMetrics).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    { teamId: 't42' },
  );
});

it('renders the metrics page', async () => {
  mockGetTeamHubResearchOutputs.mockResolvedValue({});

  await renderTab();

  expect(
    screen.getByRole('heading', { name: 'Metrics', level: 3 }),
  ).toBeVisible();
  expect(screen.getByText('Hub Research Outputs')).toBeVisible();
});

it('renders the counts and percentages', async () => {
  mockGetTeamHubResearchOutputs.mockResolvedValue({
    all: createDocument({ Article: 4 }),
    public: createDocument({ outputType: 'public', Article: 3 }),
  });

  await renderTab();

  const table = await screen.findByTestId('hub-research-outputs-table');
  const row = within(table).getByText('Article').closest('tr');

  expect(within(row!).getByText('4')).toBeVisible();
  expect(within(row!).getByText('75%')).toBeVisible();
});

it('renders N/A when the team has no outputs', async () => {
  mockGetTeamHubResearchOutputs.mockResolvedValue({});

  await renderTab();

  const table = await screen.findByTestId('hub-research-outputs-table');

  expect(within(table).getAllByText('N/A')).toHaveLength(5);
});

it('renders the leadership statuses', async () => {
  mockGetTeamHubResearchOutputs.mockResolvedValue({});
  mockGetTeamLeadershipMetrics.mockResolvedValue({
    workingGroupLead: true,
    interestGroupLead: false,
  });

  await renderTab();

  expect(screen.getByText('Leadership')).toBeVisible();
  const workingGroupRow = screen
    .getByText('Working Group(s) Lead')
    .closest('article');
  expect(within(workingGroupRow!).getByText('Y')).toBeVisible();
  const interestGroupRow = screen
    .getByText('Interest Group(s) Lead')
    .closest('article');
  expect(within(interestGroupRow!).getByText('N')).toBeVisible();
});
