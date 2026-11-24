import { Suspense } from 'react';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createInterestGroupResponse,
  createListEventResponse,
} from '@asap-hub/fixtures';
import { network } from '@asap-hub/routing';

import InterestGroupProfile from '../InterestGroupProfile';
import { Auth0Provider, WhenReady } from '../../../auth/test-utils';
import { getInterestGroup } from '../api';
import { getEvents } from '../../../events/api';

jest.mock('../api');
jest.mock('../../../events/api');

const mockGetInterestGroup = getInterestGroup as jest.MockedFunction<
  typeof getInterestGroup
>;
const mockGetInterestGroupEventsFromAlgolia = getEvents as jest.MockedFunction<
  typeof getEvents
>;

beforeEach(jest.clearAllMocks);

const renderGroupProfile = async (
  interestGroupResponse = createInterestGroupResponse(),
  { interestGroupId = interestGroupResponse.id, subPath = '' } = {},
) => {
  mockGetInterestGroup.mockImplementation(async (id) =>
    id === interestGroupResponse.id ? interestGroupResponse : undefined,
  );

  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter
              initialEntries={[
                `${
                  network({})
                    .interestGroups({})
                    .interestGroup({ interestGroupId }).$
                }${subPath}`,
              ]}
            >
              <Routes>
                <Route
                  path={`${network.template}${
                    network({}).interestGroups.template
                  }${network({}).interestGroups({}).interestGroup.template}/*`}
                  element={<InterestGroupProfile currentTime={new Date()} />}
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

it('renders the about group information by default', async () => {
  const { findAllByText } = await renderGroupProfile(
    createInterestGroupResponse(),
  );
  expect(await findAllByText(/description/i)).not.toHaveLength(0);
});

it('deep links to the teams section', async () => {
  const { findByText, container } = await renderGroupProfile(
    createInterestGroupResponse({ teamsCount: 1 }),
  );

  const anchor = (await findByText(/1 team/i)).closest('a');
  expect(anchor).toBeVisible();
  const { hash } = new URL(anchor!.href, globalThis.location.href);

  await waitFor(() =>
    expect(container.querySelector(hash)).toHaveTextContent(/teams/i),
  );
});

it('does not count inactive teams in the count', async () => {
  const response = createInterestGroupResponse({ teamsCount: 1 });
  await renderGroupProfile({
    ...response,
    teams: [
      { ...response.teams[0]!, id: '1', inactiveSince: undefined },
      { ...response.teams[0]!, id: '2', inactiveSince: undefined },
      { ...response.teams[0]!, id: '3', inactiveSince: undefined },
    ],
  });
  expect(await screen.findByText(/3 team/i)).toBeVisible();

  await renderGroupProfile({
    ...response,
    teams: [
      { ...response.teams[0]!, id: '1', inactiveSince: undefined },
      { ...response.teams[0]!, id: '2', inactiveSince: undefined },
      {
        ...response.teams[0]!,
        id: '3',
        inactiveSince: new Date().toISOString(),
      },
    ],
  });

  expect(await screen.findByText(/2 team/i)).toBeVisible();
});

it('generates a different deep link every time to avoid conflicts', async () => {
  const result1 = await renderGroupProfile(
    createInterestGroupResponse({ teamsCount: 1 }),
  );
  const { href: href1 } = (await result1.findByText(/1 team/i)).closest('a')!;
  result1.unmount();

  const result2 = await renderGroupProfile(
    createInterestGroupResponse({ teamsCount: 1 }),
  );
  const { href: href2 } = (await result2.findByText(/1 team/i)).closest('a')!;

  expect(href2).not.toEqual(href1);
});

describe('the calendar tab', () => {
  it('is not shown', async () => {
    await renderGroupProfile(createInterestGroupResponse());
    expect(await screen.findByRole('link', { name: 'About' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Calendar' }),
    ).not.toBeInTheDocument();
  });

  it('redirects the old calendar url to the about tab', async () => {
    await renderGroupProfile(createInterestGroupResponse(), {
      subPath: '/calendar',
    });
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'About' })).toHaveClass('active'),
    );
    expect(await screen.findAllByText(/description/i)).not.toHaveLength(0);
  });
});

describe('the upcoming events tab', () => {
  it('can be switched to', async () => {
    const { findByText } = await renderGroupProfile();
    await userEvent.click(
      await findByText(/upcoming/i, { selector: 'nav a *' }),
    );
    expect(await findByText(/results/i)).toBeVisible();
  });
  it('cannot be switched to if the group is inactive', async () => {
    await renderGroupProfile({
      ...createInterestGroupResponse(),
      active: false,
    });
    expect(await screen.findByRole('link', { name: 'About' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: /upcoming events/i }),
    ).not.toBeInTheDocument();
  });
});

describe('the past events tab', () => {
  it('can be switched to', async () => {
    const { findByText } = await renderGroupProfile();
    await userEvent.click(await findByText(/past/i, { selector: 'nav a *' }));
    expect(await findByText(/results/i)).toBeVisible();
  });
});

describe('the event tabs', () => {
  it('renders number of upcoming events from algolia', async () => {
    const response = createListEventResponse(7);
    mockGetInterestGroupEventsFromAlgolia.mockResolvedValue(response);
    await renderGroupProfile();

    expect(await screen.findByText(/Upcoming Events \(7\)/i)).toBeVisible();
  });

  it('renders number of past events from algolia', async () => {
    const response = createListEventResponse(7, { isEventInThePast: true });
    mockGetInterestGroupEventsFromAlgolia.mockResolvedValue(response);
    await renderGroupProfile();

    expect(await screen.findByText(/Past Events \(7\)/i)).toBeVisible();
  });
});

it('renders the not-found page when the interest group is not found', async () => {
  const nonExistentId = 'non-existent-id';
  mockGetInterestGroup.mockResolvedValueOnce(undefined);

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{}}>
          <WhenReady>
            <MemoryRouter
              initialEntries={[
                network({})
                  .interestGroups({})
                  .interestGroup({ interestGroupId: nonExistentId }).$,
              ]}
            >
              <Routes>
                <Route
                  path={`${network.template}${
                    network({}).interestGroups.template
                  }${network({}).interestGroups({}).interestGroup.template}/*`}
                  element={<InterestGroupProfile currentTime={new Date()} />}
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

  expect(await screen.findByText(/sorry.+page/i)).toBeVisible();
});
