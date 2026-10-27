import { createCalendarResponse } from '@asap-hub/fixtures';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { CalendarResponse } from '@asap-hub/model';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router';

import { Auth0Provider, WhenReady } from '../../../auth/test-utils';
import { getCalendars } from '../api';
import Calendars from '../Calendars';

jest.mock('../api');
jest.mock('../../api');

const mockGetCalendars = getCalendars as jest.MockedFunction<
  typeof getCalendars
>;

const calendar = (
  overrides: Partial<CalendarResponse> & Pick<CalendarResponse, 'id' | 'name'>,
): CalendarResponse => ({
  ...createCalendarResponse(),
  interestGroups: [],
  workingGroups: [],
  ...overrides,
});

const renderCalendars = async (items: CalendarResponse[]) => {
  mockGetCalendars.mockResolvedValue({ total: items.length, items });
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Auth0Provider user={{}}>
        <WhenReady>
          <Suspense fallback="loading">
            <MemoryRouter>
              <Calendars currentTime={new Date('2026-10-20T10:00:00Z')} />
            </MemoryRouter>
          </Suspense>
        </WhenReady>
      </Auth0Provider>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'Interest Groups' });
};

const getSection = (title: string) =>
  screen.getByRole('heading', { name: title }).parentElement!.parentElement!;

beforeEach(() => {
  jest.clearAllMocks();
});

it('lets the user subscribe to the CRN calendar from the CRN Hub Updates section', async () => {
  await renderCalendars([
    calendar({ id: 'hub@asap.science', name: 'ASAP Hub', crnCalendar: true }),
  ]);

  const section = getSection('CRN Hub Updates');
  fireEvent.click(within(section).getByRole('button', { name: /subscribe/i }));

  expect(
    within(section).getByRole('link', { name: /Add to Google Calendar/i }),
  ).toHaveAttribute(
    'href',
    'https://calendar.google.com/calendar/r?cid=hub%40asap.science',
  );
});

it('shows only the first CRN calendar in the CRN Hub Updates section', async () => {
  await renderCalendars([
    calendar({ id: 'hub@asap.science', name: 'ASAP Hub', crnCalendar: true }),
    calendar({ id: 'other@asap.science', name: 'Other', crnCalendar: true }),
  ]);

  const section = getSection('CRN Hub Updates');
  const buttons = within(section).getAllByRole('button', {
    name: /subscribe/i,
  });
  expect(buttons).toHaveLength(1);

  fireEvent.click(buttons[0]!);
  expect(
    within(section).getByRole('link', { name: /Add to Google Calendar/i }),
  ).toHaveAttribute(
    'href',
    'https://calendar.google.com/calendar/r?cid=hub%40asap.science',
  );
});

it('does not render the CRN Hub Updates section when no calendar is a CRN calendar', async () => {
  await renderCalendars([calendar({ id: 'other', name: 'Other' })]);

  expect(
    screen.queryByRole('heading', { name: 'CRN Hub Updates' }),
  ).not.toBeInTheDocument();
});

it('shows calendars of active interest groups and incomplete working groups in their sections', async () => {
  await renderCalendars([
    calendar({
      id: 'ig-active',
      name: 'Active IG',
      interestGroups: [{ id: 'ig-1', active: true }],
    }),
    calendar({
      id: 'ig-inactive',
      name: 'Inactive IG',
      interestGroups: [{ id: 'ig-2', active: false }],
    }),
    calendar({
      id: 'wg-incomplete',
      name: 'Incomplete WG',
      workingGroups: [{ id: 'wg-1', complete: false }],
    }),
    calendar({
      id: 'wg-complete',
      name: 'Complete WG',
      workingGroups: [{ id: 'wg-2', complete: true }],
    }),
  ]);

  const interestGroups = getSection('Interest Groups');
  const workingGroups = getSection('Working Groups');

  expect(within(interestGroups).getByText('Active IG')).toBeVisible();
  expect(within(workingGroups).getByText('Incomplete WG')).toBeVisible();
  expect(screen.queryByText('Inactive IG')).not.toBeInTheDocument();
  expect(screen.queryByText('Complete WG')).not.toBeInTheDocument();
});

it('links calendars to the upcoming events of their active group', async () => {
  await renderCalendars([
    calendar({
      id: 'ig-calendar',
      name: 'IG Calendar',
      interestGroups: [
        { id: 'ig-inactive', active: false },
        { id: 'ig-active', active: true },
      ],
    }),
    calendar({
      id: 'wg-calendar',
      name: 'WG Calendar',
      workingGroups: [{ id: 'wg-1', complete: false }],
    }),
  ]);

  expect(
    within(getSection('Interest Groups')).getByRole('link', {
      name: 'IG Calendar',
    }),
  ).toHaveAttribute('href', '/network/interest-groups/ig-active/upcoming');
  expect(
    within(getSection('Working Groups')).getByRole('link', {
      name: 'WG Calendar',
    }),
  ).toHaveAttribute('href', '/network/working-groups/wg-1/upcoming');
});

it('shows seminar series calendars in the Seminar Series section', async () => {
  await renderCalendars([
    calendar({
      id: 'seminar',
      name: 'Seminar Series: Genetics',
      seminarSeries: true,
    }),
  ]);

  expect(
    within(getSection('Seminar Series')).getByText('Seminar Series: Genetics'),
  ).toBeVisible();
  expect(
    within(getSection('Interest Groups')).queryByText(
      'Seminar Series: Genetics',
    ),
  ).not.toBeInTheDocument();
});

it('does not show calendars without a group in the interest groups section', async () => {
  await renderCalendars([
    calendar({ id: 'hub@asap.science', name: 'ASAP Hub', crnCalendar: true }),
  ]);

  expect(
    within(getSection('Interest Groups')).queryByText('ASAP Hub'),
  ).not.toBeInTheDocument();
});
