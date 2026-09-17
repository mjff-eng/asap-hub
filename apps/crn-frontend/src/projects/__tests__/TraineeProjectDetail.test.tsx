import { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { projects } from '@asap-hub/routing';
import type {
  DiscoveryProject,
  TraineeProjectDetail as TraineeProjectDetailType,
} from '@asap-hub/model';
import { Auth0Provider, WhenReady } from '../../auth/test-utils';
import TraineeProjectDetail from '../TraineeProjectDetail';

const mockTraineeProject: TraineeProjectDetailType = {
  id: 'trainee-1',
  title: 'Trainee Project 1',
  status: 'Active',
  statusRank: 1,
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  duration: '5 mos',
  tags: [],
  projectType: 'Trainee Project',
  members: [
    {
      id: 'trainer-1',
      displayName: 'Taylor Trainer',
      firstName: 'Taylor',
      lastName: 'Trainer',
      role: 'Independent Project - Mentor',
    },
  ],
  originalGrant: 'Original Grant',
  originalGrantProposalId: 'proposal-1',
  contactEmail: 'contact@example.com',
};

const mockDiscoveryProject: DiscoveryProject = {
  id: 'discovery-1',
  title: 'Discovery Project 1',
  status: 'Active',
  statusRank: 1,
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  duration: '5 mos',
  tags: [],
  projectType: 'Discovery Project',
  researchTheme: 'Theme One',
  teamName: 'Discovery Team',
  teamId: 'team-1',
};

jest.mock('../state', () => {
  const useProjectById = jest.fn((id: string) => {
    if (id === 'trainee-1') {
      return mockTraineeProject;
    }
    if (id === 'discovery-1') {
      return mockDiscoveryProject;
    }
    return undefined;
  });

  return {
    __esModule: true,
    useProjectById,
    useProjectMilestones: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
    }),
    useProjectArticlesSuggestions: jest.fn().mockResolvedValue([]),
    useCreateProjectMilestone: jest.fn().mockReturnValue(jest.fn()),
  };
});

const renderTraineeProjectDetail = async (projectId: string) => {
  const path = `${projects.template}/trainee/${projectId}/about`;

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route
                  path={`${projects.template}/trainee/:projectId/*`}
                  element={<TraineeProjectDetail />}
                />
              </Routes>
            </MemoryRouter>
          </WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

describe('TraineeProjectDetail', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders Trainee Project detail page when project type matches', async () => {
    await renderTraineeProjectDetail('trainee-1');
    expect(await screen.findByText('Overview')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Trainee Project 1' }),
    ).toBeVisible();
  });

  it('renders NotFoundPage when project type is not Trainee Project', async () => {
    await renderTraineeProjectDetail('discovery-1');
    // NotFoundPage shows "Sorry! We can't seem to find that page."
    // This test specifically covers line 27: if (project.projectType !== 'Trainee Project')
    const headings = await screen.findAllByRole('heading');
    expect(
      headings.some((h) =>
        (h.textContent || '').match(/Sorry! We can.+t seem to find that page/),
      ),
    ).toBe(true);
  });

  it('renders NotFoundPage when project is undefined', async () => {
    await renderTraineeProjectDetail('non-existent');
    // This test covers line 21-22: if (!project) return <NotFoundPage />
    const headings = await screen.findAllByRole('heading');
    expect(
      headings.some((h) =>
        (h.textContent || '').match(/Sorry! We can.+t seem to find that page/),
      ),
    ).toBe(true);
  });

  it('allows accessing milestones route', async () => {
    const path = `${projects.template}/trainee/trainee-1/milestones`;

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <Suspense fallback="loading">
          <Auth0Provider user={{}}>
            <WhenReady>
              <MemoryRouter initialEntries={[path]}>
                <Routes>
                  <Route
                    path={`${projects.template}/trainee/:projectId/*`}
                    element={<TraineeProjectDetail />}
                  />
                </Routes>
              </MemoryRouter>
            </WhenReady>
          </Auth0Provider>
        </Suspense>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getAllByText('Milestones').length).toBeGreaterThanOrEqual(1);
  });
});
