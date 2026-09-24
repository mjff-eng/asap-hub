import {
  ListTeamCollaborationResponse,
  teamCollaborationInitialSortingDirection,
} from '@asap-hub/model';
import { render, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { teamCollaborationPerformance } from '@asap-hub/fixtures';

import { getTeamCollaboration, getTeamCollaborationPerformance } from '../api';
import { Auth0Provider, WhenReady } from '../../../auth/test-utils';
import TeamCollaboration from '../TeamCollaboration';

jest.mock('../api');

afterEach(() => {
  jest.clearAllMocks();
});

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

const mockSetSort = jest.fn();
const mockSetSortingDirection = jest.fn();

const data: ListTeamCollaborationResponse = {
  total: 2,
  items: [
    {
      id: '1',
      name: 'Team One',
      inactiveSince: undefined,
      outputsCoProducedWithin: {
        Article: 4,
        Bioinformatics: 5,
        Dataset: 2,
        'Lab Material': 2,
        Protocol: 0,
      },
      totalOutputs: {
        Article: 4,
        Bioinformatics: 5,
        Dataset: 2,
        'Lab Material': 2,
        Protocol: 0,
      },
      outputsCoProducedAcross: {
        byDocumentType: {
          Article: 0,
          Bioinformatics: 0,
          Dataset: 0,
          'Lab Material': 0,
          Protocol: 0,
        },
        byTeam: [],
      },
    },
    {
      id: '2',
      name: 'Team Two',
      inactiveSince: undefined,
      outputsCoProducedWithin: {
        Article: 0,
        Bioinformatics: 0,
        Dataset: 0,
        'Lab Material': 0,
        Protocol: 0,
      },
      totalOutputs: {
        Article: 0,
        Bioinformatics: 0,
        Dataset: 0,
        'Lab Material': 0,
        Protocol: 0,
      },
      outputsCoProducedAcross: {
        byDocumentType: {
          Article: 0,
          Bioinformatics: 0,
          Dataset: 0,
          'Lab Material': 0,
          Protocol: 0,
        },
        byTeam: [],
      },
    },
  ],
};

const renderPage = async () => {
  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter initialEntries={['/analytics']}>
              <TeamCollaboration
                type="within-team"
                tags={[]}
                sort="team_asc"
                sortingDirection={teamCollaborationInitialSortingDirection}
                setSortingDirection={mockSetSortingDirection}
                setSort={mockSetSort}
              />
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

it('renders team collaboration data', async () => {
  mockGetTeamCollaboration.mockResolvedValue(data);

  const { container, getAllByText } = await renderPage();

  await waitFor(() => {
    expect(mockGetTeamCollaboration).toHaveBeenCalled();
  });

  await waitFor(() => {
    expect(container).toHaveTextContent('Team One');
    expect(container).toHaveTextContent('Team Two');
  });

  expect(getAllByText('0')).toHaveLength(6);
  expect(getAllByText('4')).toHaveLength(1);
  expect(getAllByText('5')).toHaveLength(1);
  expect(getAllByText('2')).toHaveLength(2);
});
