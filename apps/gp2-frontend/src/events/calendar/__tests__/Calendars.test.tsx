import { gp2 } from '@asap-hub/fixtures';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  waitFor,
  screen,
  within,
} from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router';
import { Auth0Provider, WhenReady } from '../../../auth/test-utils';
import { getCalendars } from '../api';
import Calendars from '../Calendars';

jest.mock('../api');

const mockGetCalendars = getCalendars as jest.MockedFunction<
  typeof getCalendars
>;

const renderCalendars = async () => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter initialEntries={['/events/calendar']}>
              <Calendars />
            </MemoryRouter>
          </WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>,
  );
  return waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
  );
};

const getSection = (name: string) =>
  screen.getByRole('heading', { name }).parentElement
    ?.parentElement as HTMLElement;

describe('Calendars', () => {
  beforeEach(jest.resetAllMocks);

  it('shows the first GP2 calendar in the GP2 Hub Updates section', async () => {
    mockGetCalendars.mockResolvedValue({
      total: 3,
      items: [
        gp2.createCalendarResponse(0, { name: 'Other' }),
        gp2.createCalendarResponse(1, {
          id: 'hub-1@gp2.org',
          name: 'GP2 Hub',
          gp2Calendar: true,
        }),
        gp2.createCalendarResponse(2, {
          id: 'hub-2@gp2.org',
          name: 'GP2 Hub 2',
          gp2Calendar: true,
        }),
      ],
    });
    await renderCalendars();

    const hubSection = screen.getByRole('heading', { name: 'GP2 Hub Updates' })
      .parentElement as HTMLElement;
    fireEvent.click(
      within(hubSection).getByRole('button', { name: /subscribe/i }),
    );
    expect(
      within(hubSection).getByRole('link', {
        name: /Add to Google Calendar/i,
      }),
    ).toHaveAttribute(
      'href',
      'https://calendar.google.com/calendar/r?cid=hub-1%40gp2.org',
    );
  });

  it('hides the GP2 Hub Updates section without a GP2 calendar', async () => {
    mockGetCalendars.mockResolvedValue(gp2.createListCalendarResponse(2));
    await renderCalendars();

    expect(
      screen.queryByRole('heading', { name: 'GP2 Hub Updates' }),
    ).not.toBeInTheDocument();
  });

  it('lists working group calendars linked to the working group upcoming events', async () => {
    mockGetCalendars.mockResolvedValue({
      total: 2,
      items: [
        gp2.createCalendarResponse(0, {
          name: 'Working group calendar',
          workingGroups: [{ id: 'wg-1', title: 'Working Group 1' }],
        }),
        gp2.createCalendarResponse(1, { name: 'Unlinked calendar' }),
      ],
    });
    await renderCalendars();

    const workingGroupSection = getSection('Working Groups');
    expect(
      within(workingGroupSection).getByRole('link', {
        name: 'Working group calendar',
      }),
    ).toHaveAttribute('href', '/working-groups/wg-1/upcoming');
    expect(
      within(workingGroupSection).queryByText('Unlinked calendar'),
    ).not.toBeInTheDocument();
  });

  it('shows an empty message without working group calendars', async () => {
    mockGetCalendars.mockResolvedValue(gp2.createListCalendarResponse(1));
    await renderCalendars();

    expect(
      screen.getByText(/No Working Groups are scheduled to present yet/i),
    ).toBeVisible();
  });

  it('does not show the projects section or the embedded calendar', async () => {
    mockGetCalendars.mockResolvedValue(
      gp2.createListCalendarResponse(1, {
        projects: [{ id: '42', title: 'a', status: 'Active' }],
      }),
    );
    await renderCalendars();

    expect(
      screen.queryByRole('heading', { name: /Projects/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTitle('Calendar')).not.toBeInTheDocument();
  });

  it('links to the GP2 tech support email', async () => {
    mockGetCalendars.mockResolvedValue(gp2.createListCalendarResponse(1));
    await renderCalendars();

    expect(
      screen.getByRole('link', { name: 'Contact tech support' }),
    ).toHaveAttribute('href', 'mailto:techsupport@gp2.org');
  });
});
