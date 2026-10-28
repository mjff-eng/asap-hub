import { createListEventResponse } from '@asap-hub/fixtures';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { Auth0Provider, WhenReady } from '../../auth/test-utils';
import { getEvents } from '../api';
import EventList from '../EventList';

jest.mock('../api');

const renderEventsListPage = async (
  searchQuery = '',
  currentTime = new Date(),
  past?: boolean,
) => {
  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter initialEntries={[{ pathname: '/' }]}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <EventList
                      searchQuery={searchQuery}
                      currentTime={currentTime}
                      past={past}
                    />
                  }
                />
              </Routes>
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

const mockGetEvents = getEvents as jest.MockedFunction<typeof getEvents>;
afterEach(() => {
  mockGetEvents.mockClear().mockResolvedValue(createListEventResponse(1));
});

it('can search for events', async () => {
  await renderEventsListPage('searchterm');
  expect(mockGetEvents).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      searchQuery: 'searchterm',
    }),
  );
});

it('sets after to an hour before date provided for upcoming events', async () => {
  await renderEventsListPage('', new Date('2020-01-01T12:00:00Z'));
  expect(mockGetEvents).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      after: new Date('2020-01-01T11:00:00Z').toISOString(),
    }),
  );
});

it('sets before to an hour before date provided for past events', async () => {
  await renderEventsListPage('', new Date('2020-01-01T12:00:00Z'), true);
  expect(mockGetEvents).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      before: new Date('2020-01-01T11:00:00Z').toISOString(),
    }),
  );
});

it('renders an algolia tagged result list and hit', async () => {
  const events = createListEventResponse(1);
  mockGetEvents.mockClear().mockResolvedValue({
    ...events,
    items: events.items.map((item) => ({ ...item, id: 'hitId' })),
    algoliaIndexName: 'index',
    algoliaQueryId: 'queryId',
  });

  const { container } = await renderEventsListPage(
    '',
    new Date('2020-01-01T12:00:00Z'),
    true,
  );
  const resultListHtml = container.querySelector('*[data-insights-index]');
  expect(resultListHtml?.getAttribute('data-insights-index')).toEqual('index');
  const hitHtml = resultListHtml?.querySelector('*[data-insights-object-id]');
  expect(hitHtml?.attributes).toMatchInlineSnapshot(`
    NamedNodeMap {
      "data-insights-object-id": "hitId",
      "data-insights-position": "1",
      "data-insights-query-id": "queryId",
    }
  `);
});

it('shows the online events notice for upcoming events only', async () => {
  const { getByText, unmount } = await renderEventsListPage();
  expect(getByText(/Events are online by default/)).toBeVisible();
  unmount();

  const { queryByText } = await renderEventsListPage('', new Date(), true);
  expect(queryByText(/Events are online by default/)).not.toBeInTheDocument();
});
