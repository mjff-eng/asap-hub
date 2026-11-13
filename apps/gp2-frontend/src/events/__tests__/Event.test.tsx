import { Suspense } from 'react';
import { Route, Routes, StaticRouter } from 'react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { gp2 } from '@asap-hub/fixtures';
import { events } from '@asap-hub/routing';

import Event from '../Event';
import { getEvent } from '../api';
import { Auth0Provider, WhenReady } from '../../auth/test-utils';

jest.mock('../api');

const id = '42';

const mockGetEvent = getEvent as jest.MockedFunction<typeof getEvent>;
beforeEach(jest.resetAllMocks);

const renderEvent = async () => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Auth0Provider user={{}}>
        <WhenReady>
          <Suspense fallback="Loading...">
            <StaticRouter location={events({}).event({ eventId: id }).$}>
              <Routes>
                <Route
                  path={events.template + events({}).event.template}
                  element={<Event />}
                />
              </Routes>
            </StaticRouter>
          </Suspense>
        </WhenReady>
      </Auth0Provider>
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
  );
};

it('displays the event with given id', async () => {
  mockGetEvent.mockResolvedValue({
    ...gp2.createEventResponse(),
    id,
    title: 'Kool Event',
    tags: [
      { id: 'tag-1', name: '10X Genomics' },
      { id: 'tag-1', name: '2D cultures' },
    ],
  });
  await renderEvent();
  expect(screen.getByText('Kool Event', { exact: false })).toBeVisible();
  expect(screen.getByText('10X Genomics', { exact: false })).toBeVisible();
  expect(screen.getByText('2D cultures', { exact: false })).toBeVisible();
  expect(mockGetEvent.mock.calls).toEqual([[id, expect.anything()]]);
});

it('links to the GP2 tech support email', async () => {
  mockGetEvent.mockResolvedValue({ ...gp2.createEventResponse(), id });
  await renderEvent();
  expect(
    screen.getByRole('link', { name: 'Contact tech support' }),
  ).toHaveAttribute('href', 'mailto:techsupport@gp2.org');
});

it('falls back to the not found page for a missing event', async () => {
  mockGetEvent.mockResolvedValue(undefined);
  await renderEvent();
  expect(await screen.findByText(/sorry.+page/i)).toBeVisible();
});
describe('Event Speakers', () => {
  it('displays the speakers section when there are speakers', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse({
        numberOfInternalSpeakers: 1,
        numberOfExternalSpeakers: 0,
        numberOfSpeakersToBeAnnounced: 0,
      }),
      id,
    });
    await renderEvent();
    expect(screen.getAllByText(/Speaker/i)).not.toHaveLength(0);
  });
  it('does not display the speakers section when there are non available', async () => {
    mockGetEvent.mockResolvedValue({
      ...gp2.createEventResponse({
        numberOfInternalSpeakers: 0,
        numberOfExternalSpeakers: 0,
        numberOfSpeakersToBeAnnounced: 0,
      }),
      id,
      title: 'Kool Event',
    });
    await renderEvent();

    expect(screen.queryByText(/Speaker/i)).not.toBeInTheDocument();
  });
});
