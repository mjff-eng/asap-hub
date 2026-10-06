import { projects } from '@asap-hub/routing';
import { render, waitFor, screen, act, within } from '@testing-library/react';
import { mockConsoleError } from '@asap-hub/dom-test-utils';
import {
  createListProjectMilestoneResponse,
  createProjectMilestoneResponse,
  createProjectAim,
} from '@asap-hub/fixtures';
import { ListProjectMilestonesResponse } from '@asap-hub/model';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';

import { Auth0Provider, WhenReady } from '../../auth/test-utils';
import ProjectMilestones from '../ProjectMilestones';
import { downloadProjectMilestonesXlsx } from '../export';
import {
  getProjectMilestones,
  getProjectMilestonesExport,
  getMilestoneArticles,
  createProjectMilestone,
  patchMilestone,
  putMilestoneArticles,
  waitForMilestonesSync,
} from '../api';
import { ManuscriptToastProvider } from '../../network/teams/ManuscriptToastProvider';

jest.mock('../api');
jest.mock('../export', () => ({
  __esModule: true,
  ...jest.requireActual('../export'),
  downloadProjectMilestonesXlsx: jest.fn(() => Promise.resolve()),
}));

afterEach(() => {
  jest.clearAllMocks();
});
mockConsoleError();

const mockGetProjectMilestones = getProjectMilestones as jest.MockedFunction<
  typeof getProjectMilestones
>;

const mockGetProjectMilestonesExport =
  getProjectMilestonesExport as jest.MockedFunction<
    typeof getProjectMilestonesExport
  >;

const mockGetMilestoneArticles = getMilestoneArticles as jest.MockedFunction<
  typeof getMilestoneArticles
>;

const mockCreateProjectMilestone =
  createProjectMilestone as jest.MockedFunction<typeof createProjectMilestone>;

const mockPutMilestoneArticles = putMilestoneArticles as jest.MockedFunction<
  typeof putMilestoneArticles
>;

const mockPatchMilestone = patchMilestone as jest.MockedFunction<
  typeof patchMilestone
>;

const mockWaitForMilestonesSync = waitForMilestonesSync as jest.MockedFunction<
  typeof waitForMilestonesSync
>;

const mockLoadArticleOptions = jest.fn(() =>
  Promise.resolve([
    {
      label: 'Project Article 1',
      value: 'article-1',
      documentType: 'Article',
      type: 'Preprint',
    },
  ]),
);

beforeEach(() => {
  mockGetProjectMilestones.mockResolvedValue(
    createListProjectMilestoneResponse(),
  );
  mockGetMilestoneArticles.mockResolvedValue([]);
  mockCreateProjectMilestone.mockResolvedValue({ id: 'milestone-1' });
  mockPutMilestoneArticles.mockResolvedValue(undefined);
  mockPatchMilestone.mockResolvedValue(undefined);
  mockGetProjectMilestonesExport.mockResolvedValue({
    aims: [],
    milestones: [],
  });
  mockWaitForMilestonesSync.mockResolvedValue(true);
});

const projectId = 'proj-1';
const renderPage = async (queryString = '', waitForLoad = true) => {
  const basePath = projects({})
    .discoveryProjects({})
    .discoveryProject({ projectId })
    .milestones({}).$;

  const path = queryString ? `${basePath}?${queryString}` : basePath;

  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter initialEntries={[path]}>
              <ManuscriptToastProvider>
                <Routes>
                  <Route
                    path="/projects/discovery/proj-1/milestones?"
                    element={
                      <ProjectMilestones
                        projectId={projectId}
                        projectName="Alessi Project"
                        isLead={true}
                        hasSupplementGrant={true}
                        aims={[
                          createProjectAim({ key: 1, order: 1 }),
                          createProjectAim({ key: 2, order: 2 }),
                        ]}
                        loadArticleOptions={mockLoadArticleOptions}
                      />
                    }
                  />
                </Routes>
              </ManuscriptToastProvider>
            </MemoryRouter>
          </WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>,
  );

  if (waitForLoad) {
    await waitFor(() =>
      expect(result.queryByText(/loading/i)).not.toBeInTheDocument(),
    );
  }

  return result;
};

describe('ProjectMilestones', () => {
  it('renders project milestones page', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Milestones' })).toBeVisible();
    expect(screen.getByRole('searchbox')).toBeVisible();
    expect(screen.getByRole('button', { name: /filter/i })).toBeVisible();
  });

  it('keeps the search controls visible while milestones are loading', async () => {
    mockGetProjectMilestones.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ total: 0, items: [] }), 10);
        }),
    );

    await renderPage('searchQuery=alpha', false);

    expect(
      await screen.findByRole('heading', { name: 'Milestones' }),
    ).toBeVisible();
    expect(screen.getByRole('searchbox')).toBeVisible();
    expect(screen.getByRole('button', { name: /filter/i })).toBeVisible();
  });

  it('fetches milestones depending on the grant type selected', async () => {
    await renderPage();

    const grantTypeDropdown = screen.getByRole('combobox');
    await userEvent.click(grantTypeDropdown);

    await act(async () => {
      await userEvent.click(screen.getByText('Original'));
    });

    await waitFor(() => {
      expect(mockGetProjectMilestones).toHaveBeenCalledWith(
        expect.objectContaining({
          grantType: 'original',
        }),
        expect.anything(),
      );
    });

    await userEvent.click(grantTypeDropdown);

    await act(async () => {
      await userEvent.click(screen.getByText('Supplement'));
    });

    await waitFor(() => {
      expect(mockGetProjectMilestones).toHaveBeenCalledWith(
        expect.objectContaining({
          grantType: 'supplement',
        }),
        expect.anything(),
      );
    });
  });

  it('applies sort from URL on initial render', async () => {
    await renderPage('sort=aim_desc');

    await waitFor(() => {
      expect(mockGetProjectMilestones).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'aim_desc' }),
        expect.anything(),
      );
    });
  });

  it('falls back to aim_asc when URL sort is not a recognised value', async () => {
    await renderPage('sort=foo');

    await waitFor(() => {
      expect(mockGetProjectMilestones).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'aim_asc' }),
        expect.anything(),
      );
    });
  });

  it('toggles sort by Aim # and refetches with the new sort', async () => {
    await renderPage();

    await waitFor(() => {
      expect(mockGetProjectMilestones).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'aim_asc' }),
        expect.anything(),
      );
    });

    const sortButton = await screen.findByRole('button', { name: /Aims/ });
    mockGetProjectMilestones.mockClear();

    await userEvent.click(sortButton);

    await waitFor(() => {
      expect(mockGetProjectMilestones).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'aim_desc' }),
        expect.anything(),
      );
    });
  });

  it('passes search query and status filters to the milestones fetch', async () => {
    await renderPage('grantType=original&searchQuery=alpha&filter=Complete');

    await waitFor(() => {
      expect(mockGetProjectMilestones).toHaveBeenCalledWith(
        expect.objectContaining({
          grantType: 'original',
          searchQuery: 'alpha',
        }),
        expect.anything(),
      );
    });

    expect(mockGetProjectMilestones.mock.calls[0]?.[0]?.filters).toEqual(
      new Set(['Complete']),
    );
  });

  it('fetches articles for a milestone when expanded', async () => {
    const projectMilestone = createProjectMilestoneResponse({
      articleCount: 1,
      key: 1,
      status: 'In Progress',
    });
    const milestones: ListProjectMilestonesResponse = {
      total: 1,
      items: [projectMilestone],
    };

    mockGetProjectMilestones.mockResolvedValue(milestones);
    mockGetMilestoneArticles.mockResolvedValue([
      { id: 'a1', title: 'Article 1', href: '/a1', type: 'Preprint' },
    ]);

    await renderPage();

    expect(await screen.findByText('Articles (1)')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /expand articles/i }),
    );

    expect(screen.getByText('Article 1')).toBeInTheDocument();
  });

  it('downloads the table data with the current filters, search and sort applied', async () => {
    await renderPage(
      'grantType=original&searchQuery=alpha&filter=Complete&sort=aim_desc',
    );

    await userEvent.click(
      await screen.findByRole('button', { name: /Data in Table/i }),
    );

    await waitFor(() =>
      expect(downloadProjectMilestonesXlsx).toHaveBeenCalledWith(
        'Alessi Project',
        expect.any(Function),
        {
          grantType: 'original',
          search: 'alpha',
          filter: ['Complete'],
          sort: 'aim_desc',
        },
      ),
    );
  });

  it('downloads the full dataset across both grant types without filters or sort applied', async () => {
    await renderPage(
      'grantType=original&searchQuery=alpha&filter=Complete&sort=aim_desc',
    );

    await userEvent.click(
      await screen.findByRole('button', { name: /Full Dataset/i }),
    );

    await waitFor(() =>
      expect(downloadProjectMilestonesXlsx).toHaveBeenCalledWith(
        'Alessi Project',
        expect.any(Function),
        {},
      ),
    );
  });

  it('throws error when fetching project milestones fails', async () => {
    const error = new Error('API Error');
    mockGetProjectMilestones.mockRejectedValue(error);

    const { getByText } = await renderPage();
    await waitFor(() => expect(mockGetProjectMilestones).toHaveBeenCalled());
    await waitFor(() =>
      expect(getByText(/Something went wrong/i)).toBeVisible(),
    );
  });

  it('displays Add New Milestone button if on supplement grant milestones page and user is lead', async () => {
    await renderPage();

    expect(
      await screen.findByRole('button', {
        name: /Add New Milestone/i,
      }),
    ).toBeInTheDocument();
  });

  it('can create a milestone when the data is valid', async () => {
    await renderPage();

    const addNewMilestoneButton = await screen.findByRole('button', {
      name: /Add New Milestone/i,
    });

    await userEvent.click(addNewMilestoneButton);

    const createModal = within(screen.getByRole('dialog'));

    await userEvent.type(
      createModal.getByRole('textbox', { name: /Description/i }),
      'Some description',
    );

    await userEvent.click(createModal.getByText('#1'));

    const relatedArticlesLabel = createModal
      .getByText('Related Articles')
      .closest('div')!;

    const articlesInput = within(relatedArticlesLabel!).getByRole('combobox');
    await userEvent.click(articlesInput);

    const option = await createModal.findByText(/Project Article 1/i);
    await userEvent.click(option);

    await userEvent.click(createModal.getByText('Confirm'));

    const confirmModal = within(await screen.findByRole('dialog'));
    await userEvent.click(confirmModal.getByText(/confirm and notify/i));

    await waitFor(() => {
      expect(mockCreateProjectMilestone).toHaveBeenCalledWith(
        projectId,
        {
          description: 'Some description',
          status: 'Pending',
          grantType: 'supplement',
          relatedArticleIds: ['article-1'],
          aimIds: ['uuid-1'],
        },
        'Bearer access_token',
      );
    });

    await waitFor(() => {
      expect(screen.queryByText(/confirm and notify/i)).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(/Milestone added successfully./i),
    ).toBeInTheDocument();
  });

  it('displays error toast when there is an error creating a manuscript', async () => {
    mockCreateProjectMilestone.mockRejectedValueOnce(new Error('error'));
    await renderPage();

    const addNewMilestoneButton = await screen.findByRole('button', {
      name: /Add New Milestone/i,
    });

    await userEvent.click(addNewMilestoneButton);

    const createModal = within(screen.getByRole('dialog'));

    await userEvent.type(
      createModal.getByRole('textbox', { name: /Description/i }),
      'Some description',
    );

    await userEvent.click(createModal.getByText('#1'));

    const relatedArticlesLabel = createModal
      .getByText('Related Articles')
      .closest('div')!;

    const articlesInput = within(relatedArticlesLabel!).getByRole('combobox');
    await userEvent.click(articlesInput);

    const option = await createModal.findByText(/Project Article 1/i);
    await userEvent.click(option);

    await userEvent.click(createModal.getByText('Confirm'));

    const confirmModal = within(await screen.findByRole('dialog'));
    await userEvent.click(confirmModal.getByText(/confirm and notify/i));

    await waitFor(() => {
      expect(
        screen.getByText('An error has occurred. Please try again later.'),
      ).toBeInTheDocument();
    });
  });

  it('updates milestone status via the inline dropdown', async () => {
    await renderPage();

    const triggers = await screen.findAllByRole('button', {
      name: /Change status/i,
    });
    await userEvent.click(triggers[0]!);
    const options = await screen.findAllByRole('option', {
      name: /Pending/i,
    });
    await userEvent.click(options[0]!);

    await waitFor(() =>
      expect(mockPatchMilestone).toHaveBeenCalledWith(
        'uuid-1',
        { status: 'Pending' },
        expect.any(String),
      ),
    );
  });

  it('displays error toast when updating milestone status fails', async () => {
    mockPatchMilestone.mockRejectedValueOnce(new Error('status save failed'));

    await renderPage();

    const triggers = await screen.findAllByRole('button', {
      name: /Change status/i,
    });
    await userEvent.click(triggers[0]!);
    const options = await screen.findAllByRole('option', {
      name: /Pending/i,
    });
    await userEvent.click(options[0]!);

    await waitFor(() => {
      expect(
        screen.getByText('An error has occurred. Please try again later.'),
      ).toBeInTheDocument();
    });
  });

  it('displays error toast when saving articles fails', async () => {
    mockPutMilestoneArticles.mockRejectedValueOnce(new Error('save failed'));

    await renderPage();

    const [editButton] = await screen.findAllByRole('button', {
      name: /edit/i,
    });
    await userEvent.click(editButton!);

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(
        screen.getByText('An error has occurred. Please try again later.'),
      ).toBeInTheDocument();
    });
  });
});
