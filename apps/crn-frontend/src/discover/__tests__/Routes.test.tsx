import { Suspense } from 'react';
import { MemoryRouter, Route, Routes as RouterRoutes } from 'react-router';
import { render, waitFor, screen } from '@testing-library/react';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import { createListTutorialsResponse } from '@asap-hub/fixtures';
import { TutorialsResponse } from '@asap-hub/model';
import { discover } from '@asap-hub/routing';
import userEvent from '@testing-library/user-event';

import Routes from '../Routes';

import { getTutorials, getTutorialById } from '../tutorials/api';

jest.mock('../../guides/api');
jest.mock('../tutorials/api');

const mockGetTutorials = getTutorials as jest.MockedFunction<
  typeof getTutorials
>;

const mockGetTutorialById = getTutorialById as jest.MockedFunction<
  typeof getTutorialById
>;

const renderDiscoverPage = (pathname: string, query = '') => {
  const { container } = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter initialEntries={[{ pathname, search: query }]}>
              <RouterRoutes>
                <Route path={`${discover.template}/*`} element={<Routes />} />
              </RouterRoutes>
            </MemoryRouter>
          </WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>,
  );

  return container;
};

it('redirects to the guides page when the index page accessed', async () => {
  renderDiscoverPage(discover({}).$);
  expect(
    await screen.findByText(/Guides/i, {
      selector: 'h2',
    }),
  ).toBeVisible();
});

it('renders tutorials list page when the tutorials tab is selected', async () => {
  mockGetTutorials.mockResolvedValue(createListTutorialsResponse(1));

  renderDiscoverPage(discover({}).$);

  const tutorialsAnchorTab = await screen.findByRole('link', {
    name: /Tutorials/i,
  });

  expect(tutorialsAnchorTab).toBeVisible();
  expect(screen.queryByText(/Explore our tutorials/i)).not.toBeInTheDocument();

  await userEvent.click(tutorialsAnchorTab);

  expect(
    await screen.findByText(/Explore our tutorials/i, { selector: 'p' }),
  ).toBeVisible();
});

it('allows search on tutorials list', async () => {
  const tutorialsResponse = createListTutorialsResponse(1);
  mockGetTutorials.mockResolvedValue({
    ...tutorialsResponse,
    items: tutorialsResponse.items.map((tutorial) => ({
      ...tutorial,
      title: 'Tutorial 1',
    })),
  });

  renderDiscoverPage(discover({}).tutorials({}).$);

  await userEvent.type(await screen.findByRole('searchbox'), 'Tutorial 1');

  await waitFor(() =>
    expect(mockGetTutorials).toHaveBeenCalledWith(
      expect.objectContaining({
        searchQuery: 'Tutorial 1',
      }),
      expect.anything(),
    ),
  );

  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(
      /Tutorial 1/i,
    ),
  );
});

it('renders tutorial page when user clicks tutorial card title', async () => {
  const tutorialsResponse = createListTutorialsResponse(1);
  const tutorial: TutorialsResponse = {
    id: 'uuid-first-tutorial',
    created: '2020-09-07T17:36:54Z',
    title: 'First Tutorial Title',
    authors: [],
    tags: [],
    teams: [],
    relatedEvents: [],
    relatedTutorials: [],
  };
  mockGetTutorials.mockResolvedValue({
    ...tutorialsResponse,
    items: tutorialsResponse.items.map((tutorialItem) => ({
      ...tutorialItem,
      id: 'uuid-first-tutorial',
      title: 'First Tutorial Title',
    })),
  });
  mockGetTutorialById.mockResolvedValue(tutorial);
  renderDiscoverPage(discover({}).tutorials({}).$);
  const tutorialCardTitle = (await screen.findByText(/First Tutorial Title/i, {
    selector: 'a',
  })) as HTMLAnchorElement;
  expect(tutorialCardTitle).toBeVisible();
  expect(tutorialCardTitle.href).toContain('/tutorials/');
  await userEvent.click(tutorialCardTitle);

  // Wait for loading states to clear
  await waitFor(
    () => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    },
    { timeout: 5000 },
  );

  expect(
    await screen.findByText(/First Tutorial Title/i, { selector: 'h1' }),
  ).toBeVisible();
});
