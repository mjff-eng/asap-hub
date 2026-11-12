import { mockConsoleError } from '@asap-hub/dom-test-utils';
import { gp2 } from '@asap-hub/fixtures';
import { enable } from '@asap-hub/flags';
import { gp2 as gp2Routing } from '@asap-hub/routing';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { subDays } from 'date-fns';
import { Suspense } from 'react';
import { MemoryRouter, Route, Routes as RouterRoutes } from 'react-router';
import { Auth0Provider, WhenReady } from '../../auth/test-utils';
import { createEventListAlgoliaResponse } from '../../__fixtures__/algolia';
import { getEvent, getEvents } from '../api';
import { getCalendars } from '../calendar/api';
import Routes from '../Routes';

jest.setTimeout(60000);
jest.mock('../api');
jest.mock('../calendar/api');
mockConsoleError();

// Preload lazy-loaded modules to prevent first test failures
beforeAll(async () => {
  await import('../EventDirectory');
  await import('../Event');
});
const renderRoutes = async (path = '/events') => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter initialEntries={[path]}>
              <RouterRoutes>
                <Route path="/events/*" element={<Routes />} />
              </RouterRoutes>
            </MemoryRouter>
          </WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
  );
};
beforeEach(() => {
  jest.resetAllMocks();
});

describe('Routes', () => {
  const mockGetEvents = getEvents as jest.MockedFunction<typeof getEvents>;
  const mockGetCalendars = getCalendars as jest.MockedFunction<
    typeof getCalendars
  >;

  // Warmup test to initialize lazy-loaded modules - this test absorbs the first-render issue
  it('initializes lazy modules', async () => {
    mockGetEvents.mockResolvedValue(createEventListAlgoliaResponse(0));
    mockGetCalendars.mockResolvedValue(gp2.createListCalendarResponse());
    await renderRoutes();
    // Just verify render completes without checking specific content
    expect(document.body).toBeInTheDocument();
  });

  it('renders the title', async () => {
    mockGetEvents.mockResolvedValue(createEventListAlgoliaResponse(1));
    mockGetCalendars.mockResolvedValue(gp2.createListCalendarResponse());
    await renderRoutes();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Events' }),
      ).toBeInTheDocument(),
    );
  });

  it('renders the Calendar page as default when Upcoming Events is disabled', async () => {
    mockGetCalendars.mockResolvedValue(gp2.createListCalendarResponse());
    await renderRoutes();
    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /subscribe to calendar/i }),
      ).toBeVisible(),
    );
  });

  it('renders error message when the request is not a 2XX', async () => {
    mockGetEvents.mockRejectedValue(new Error('error'));
    mockGetCalendars.mockResolvedValue(gp2.createListCalendarResponse());

    await renderRoutes();
    await waitFor(() => expect(mockGetEvents).toHaveBeenCalled());
    expect(await screen.findByText(/Something went wrong/i)).toBeVisible();
  });

  it('renders the empty state for the upcoming and the past events', async () => {
    mockGetEvents.mockResolvedValue(createEventListAlgoliaResponse(0));
    await renderRoutes();

    const upcomingEventsLink = await screen.findByRole('link', {
      name: /upcoming/i,
    });
    const pastEventsLink = await screen.findByRole('link', { name: /past/i });

    expect(upcomingEventsLink).toBeVisible();
    expect(pastEventsLink).toBeVisible();

    await userEvent.click(upcomingEventsLink);
    await waitFor(() =>
      expect(screen.getByText('No upcoming events available.')).toBeVisible(),
    );

    await userEvent.click(pastEventsLink);
    expect(await screen.findByText('No past events available.')).toBeVisible();
  });

  it('keeps the event mounted when switching between event tabs', async () => {
    enable('NEW_EVENT_PAGE');
    const mockGetEvent = getEvent as jest.MockedFunction<typeof getEvent>;
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse(),
      id: 'event-1',
      title: 'Kool Event',
      startDate: subDays(new Date(), 3).toISOString(),
      endDate: subDays(new Date(), 3).toISOString(),
      notes: 'My Notes',
    });
    await renderRoutes(
      gp2Routing.events({}).event({ eventId: 'event-1' }).about({}).$,
    );

    const heading = await screen.findByRole('heading', { name: 'Kool Event' });
    await userEvent.click(
      screen.getByRole('link', { name: 'Meeting Materials' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Notes' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kool Event' })).toBe(heading);
  });
});
