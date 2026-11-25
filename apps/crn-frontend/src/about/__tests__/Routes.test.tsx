import { disable, enable } from '@asap-hub/flags';
import { Suspense } from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { mockConsoleError } from '@asap-hub/dom-test-utils';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createUserResponse } from '@asap-hub/fixtures';
import { DiscoverResponse } from '@asap-hub/model';
import { about } from '@asap-hub/routing';

import About from '../Routes';
import { Auth0Provider, WhenReady } from '../../auth/test-utils';
import { getDiscover } from '../api';

jest.mock('../api');
mockConsoleError();
beforeEach(() => {
  disable('ABOUT_ASAP_TABS');
});
afterEach(() => {
  jest.clearAllMocks();
});

const mockGetDiscover = getDiscover as jest.MockedFunction<typeof getDiscover>;

const props: DiscoverResponse = {
  aboutUs: '',
  members: [],
  scientificAdvisoryBoard: [],
  asapAreas: [],
};

const renderPage = async (initialEntry = '/about') => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter initialEntries={[initialEntry]}>
              <Routes>
                <Route path={`${about.template}/*`} element={<About />} />
              </Routes>
            </MemoryRouter>
          </WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>,
  );
  await waitFor(
    () => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
    { timeout: 30_000 },
  );
};

describe('the About page', () => {
  it('renders the About Page successfully', async () => {
    mockGetDiscover.mockResolvedValue({
      ...props,
      members: [
        {
          ...createUserResponse(),
          id: 'uuid',
          displayName: 'John Doe',
          jobTitle: 'CEO',
          institution: 'ASAP',
        },
      ],
      scientificAdvisoryBoard: [],
    });

    await renderPage();
    expect(
      await screen.findByText(/About ASAP/i, {
        selector: 'h1',
      }),
    ).toBeVisible();
  });

  it('renders error message when the response is not a 2XX', async () => {
    mockGetDiscover.mockRejectedValue(new Error('error'));

    await renderPage();
    expect(mockGetDiscover).toHaveBeenCalled();
    expect(await screen.findByText(/Something went wrong/i)).toBeVisible();
  });
});

describe('the About page with tabs', () => {
  beforeEach(() => {
    enable('ABOUT_ASAP_TABS');
  });

  it('does not render the tabs when the flag is disabled', async () => {
    disable('ABOUT_ASAP_TABS');
    mockGetDiscover.mockResolvedValue(props);

    await renderPage();
    expect(
      screen.queryByRole('link', { name: 'The initiative' }),
    ).not.toBeInTheDocument();
  });

  it('redirects to the initiative tab by default', async () => {
    await renderPage();
    expect(
      await screen.findByRole('heading', {
        name: 'Changing the way science is typically done',
      }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'The initiative' })).toBeVisible();
    expect(screen.getByRole('link', { name: "Who's involved" })).toBeVisible();
  });

  it("renders the who's involved tab without the initiative content", async () => {
    await renderPage(about({}).whosInvolved({}).$);
    expect(
      await screen.findByRole('link', { name: "Who's involved" }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', {
        name: 'Changing the way science is typically done',
      }),
    ).not.toBeInTheDocument();
  });

  it("renders the ASAP areas on the who's involved tab", async () => {
    mockGetDiscover.mockResolvedValue({
      ...props,
      asapAreas: [
        {
          id: 'area-1',
          name: 'Events',
          objective: 'Plan scientific meetings.',
          primaryEmail: 'meetings@example.com',
          members: [
            {
              id: 'user-1',
              firstName: 'Sarah',
              lastName: 'Jones',
              displayName: 'Sarah Jones',
            },
          ],
        },
      ],
    });

    await renderPage(about({}).whosInvolved({}).$);
    expect(
      await screen.findByRole('heading', { name: 'Meet the ASAP team' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Events' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Sarah Jones' })).toBeVisible();
  });
});
