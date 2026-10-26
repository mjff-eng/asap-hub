import { createListCalendarResponse } from '@asap-hub/fixtures';
import { events } from '@asap-hub/routing';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';

import { Auth0Provider, WhenReady } from '../../auth/test-utils';
import { getEvents } from '../api';
import { getCalendars } from '../calendar/api';
import Events from '../Events';

jest.mock('../calendar/api');
jest.mock('../api');

const mockGetCalendars = getCalendars as jest.MockedFunction<
  typeof getCalendars
>;
const mockGetEventsFromAlgolia = getEvents as jest.MockedFunction<
  typeof getEvents
>;

const renderEventsPage = (pathname = events({}).$, search?: string) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Auth0Provider user={{}}>
        <WhenReady>
          <MemoryRouter initialEntries={[{ pathname, search }]}>
            <Routes>
              <Route path={`${events.template}/*`} element={<Events />} />
            </Routes>
          </MemoryRouter>
        </WhenReady>
      </Auth0Provider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Events', () => {
  it('Renders the events page header', async () => {
    mockGetCalendars.mockResolvedValue(createListCalendarResponse(0));
    renderEventsPage();

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading.textContent).toEqual('Calendar & Events');
  });

  describe.each`
    eventProperty | route                        | expected
    ${'after'}    | ${events({}).past({}).$}     | ${'past'}
    ${'before'}   | ${events({}).upcoming({}).$} | ${'upcoming'}
  `('the events $expected page', ({ eventProperty, route, expected }) => {
    it('renders search box even without searchQuery parameter', async () => {
      // Search box is always visible for past/upcoming events pages
      renderEventsPage(route);

      const searchBox = await screen.findByRole('searchbox');
      expect(searchBox).toBeInTheDocument();
    });

    it('can search for events', async () => {
      renderEventsPage(route);

      const searchBox = await screen.findByRole('searchbox');
      // Select all existing text and replace it with new text
      await userEvent.type(searchBox, '{selectall}searchterm');

      await waitFor(() =>
        expect(mockGetEventsFromAlgolia).toHaveBeenLastCalledWith(
          expect.anything(),
          expect.objectContaining({ searchQuery: 'searchterm' }),
        ),
      );
    });
  });

  describe('the events calendar page', () => {
    it('does not render a google calendar iframe', async () => {
      mockGetCalendars.mockResolvedValue(createListCalendarResponse(0));
      renderEventsPage(events({}).calendar({}).$);

      expect(
        await screen.findByRole('heading', { name: 'Interest Groups' }),
      ).toBeVisible();
      expect(screen.queryByTitle('Calendar')).not.toBeInTheDocument();
    });

    it('Displays a list of calendars', async () => {
      mockGetCalendars.mockResolvedValue({
        ...createListCalendarResponse(2, { activeGroups: true }),
        items: createListCalendarResponse(2, {
          activeGroups: true,
        }).items.map((item, index) => ({
          ...item,
          name: `Calendar title ${index}`,
        })),
      });
      renderEventsPage(events({}).calendar({}).$);

      const calendar0 = await screen.findByText(/calendar title 0/i);
      const calendar1 = await screen.findByText(/calendar title 1/i);
      expect(calendar0).toBeVisible();
      expect(calendar1).toBeVisible();
    });
  });
});
