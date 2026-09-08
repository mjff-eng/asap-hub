import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import {
  createListEventResponse,
  createTeamResponse,
} from '@asap-hub/fixtures';
import { TeamResponse } from '@asap-hub/model';
import { disable, enable } from '@asap-hub/flags';
import { network } from '@asap-hub/routing';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps, Suspense } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { getEvents } from '../../../events/api';
import { getTeamLeadershipMetrics } from '../../../analytics/leadership/api';
import { getTeamHubResearchOutputs } from '../../../analytics/productivity/api';
import { getTeam } from '../api';
import TeamProfile from '../TeamProfile';

const algoliaManuscriptsResponse = {
  total: 1,
  items: [
    {
      id: 'manuscript-1',
      lastUpdated: '2020-09-23T20:45:22.000Z',
      team: {
        id: 'team-id-1',
        displayName: 'Team 1',
      },
      status: 'Compliant',
    },
  ],
};

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  getTeam: jest.fn(),
  getTeamAwardMetrics: jest.fn().mockResolvedValue({ total: 0, items: [] }),
  getManuscripts: jest.fn().mockResolvedValue(algoliaManuscriptsResponse),
}));

jest.mock('../interest-groups/api');
jest.mock('../../../shared-research/api');
jest.mock('../../../events/api');
jest.mock('../../../analytics/productivity/api');
jest.mock('../../../analytics/leadership/api');

const mockGetEventsFromAlgolia = getEvents as jest.MockedFunction<
  typeof getEvents
>;

afterEach(jest.clearAllMocks);
beforeEach(() => {
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
const renderPage = async (
  teamResponse: TeamResponse = createTeamResponse(),
  { teamId = teamResponse.id, currentTime = new Date() } = {},
  user: ComponentProps<typeof Auth0Provider>['user'] = {},
  initialPath?: string,
) => {
  const mockGetTeam = getTeam as jest.MockedFunction<typeof getTeam>;
  mockGetTeam.mockImplementation(async (id) =>
    id === teamResponse.id ? teamResponse : undefined,
  );

  const defaultInitialPath = network({}).teams({}).team({ teamId }).$;

  const router = createMemoryRouter(
    [
      {
        path: `${network.template}${network({}).teams.template}${
          network({}).teams({}).team.template
        }/*`,
        element: <TeamProfile currentTime={currentTime} />,
      },
    ],
    {
      initialEntries: [initialPath ?? defaultInitialPath],
    },
  );

  const { container } = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={user}>
          <WhenReady>
            <RouterProvider router={router} />
          </WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>,
  );
  await waitFor(
    () => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
    { timeout: 30_000 },
  );
  return { container };
};

it('renders the header info', async () => {
  await renderPage({
    ...createTeamResponse(),
    displayName: 'Bla',
  });
  const header = await screen.findByText(/Team.+Bla/i, {}, { timeout: 5000 });
  expect(header).toBeVisible();
});

it('renders the about info', async () => {
  await renderPage({
    ...createTeamResponse(),
    teamDescription: 'This is the team description',
  });
  const description = await screen.findByText(
    'This is the team description',
    {},
    { timeout: 5000 },
  );
  expect(description).toBeVisible();
});

it('renders the 404 page for a missing team', async () => {
  await renderPage({ ...createTeamResponse(), id: '42' }, { teamId: '1337' });
  const notFound = await screen.findByText(
    /sorry.+page/i,
    {},
    { timeout: 5000 },
  );
  expect(notFound).toBeVisible();
});

it('deep links to the teams list', async () => {
  const { container } = await renderPage({
    ...createTeamResponse({ teamMembers: 10 }),
    id: '42',
  });

  expect(
    await screen.findByRole('heading', { name: 'Team Members' }),
  ).toBeVisible();

  const anchor = screen.getByLabelText(/\+\d/i).closest('a');
  expect(anchor).toBeVisible();
  const { hash } = new URL(anchor!.href, globalThis.location.href);

  expect(container.querySelector(hash)).toHaveTextContent(/team members/i);
});
it('renders number of upcoming events for active teams', async () => {
  const response = createListEventResponse(7);
  mockGetEventsFromAlgolia.mockResolvedValue(response);
  await renderPage(createTeamResponse());

  expect(await screen.findByText(/Upcoming Events \(7\)/i)).toBeVisible();
});

it('does not allow navigating to the upcoming events tab when team is inactive', async () => {
  await renderPage({
    ...createTeamResponse(),
    inactiveSince: '2022-09-30T09:00:00Z',
    teamStatus: 'Inactive',
  });

  expect(
    screen.queryByText(/Upcoming Events/i, { selector: 'nav *' }),
  ).not.toBeInTheDocument();
});

it('renders number of past events', async () => {
  const response = createListEventResponse(7, { isEventInThePast: true });
  mockGetEventsFromAlgolia.mockResolvedValue(response);
  await renderPage(createTeamResponse());

  expect(await screen.findByText(/Past Events \(7\)/i)).toBeVisible();
});

it.each`
  name
  ${'upcoming events'}
  ${'past events'}
`('navigates to the $name events tab', async ({ name }) => {
  jest.useRealTimers();
  const currentTime = new Date('2021-12-28T14:00:00.000Z');
  const response = createListEventResponse(1);
  mockGetEventsFromAlgolia.mockResolvedValue(response);

  const teamResponse = createTeamResponse();
  await renderPage(teamResponse, { currentTime });

  const nameRegex = new RegExp(name, 'i');

  const tab = screen.getByRole('link', { name: nameRegex });
  await userEvent.click(tab);
  expect(await screen.findByRole('searchbox')).toHaveAttribute(
    'placeholder',
    'Search by topic, presenting team, …',
  );
  expect(await screen.findByText(/Event 0/i)).toBeVisible();
  expect(mockGetEventsFromAlgolia).toHaveBeenCalledTimes(2);

  expect(mockGetEventsFromAlgolia).toHaveBeenCalledWith(expect.anything(), {
    before: '2021-12-28T13:00:00.000Z',
    currentPage: 0,
    filters: new Set(),
    pageSize: 10,
    searchQuery: '',
    constraint: {
      teamId: 't0',
    },
  });
  jest.useFakeTimers();
});

describe('The compliance tab', () => {
  it('does not show a compliance tab on Team ASAP when the user is Staff', async () => {
    await renderPage(
      {
        ...createTeamResponse(),
        displayName: 'ASAP',
      },
      {},
      {
        role: 'Staff',
      },
    );

    expect(await screen.findByText(/Team.+ASAP/i)).toBeVisible();
    expect(
      screen.queryByText(/Compliance/i, { selector: 'nav *' }),
    ).not.toBeInTheDocument();
  });

  it('does not render the compliance dashboard on the team compliance path', async () => {
    const manuscriptTeamName =
      algoliaManuscriptsResponse.items[0]!.team.displayName;
    const teamResponse = { ...createTeamResponse(), displayName: 'ASAP' };

    await renderPage(
      teamResponse,
      {},
      { role: 'Staff' },
      `${network({}).teams({}).team({ teamId: teamResponse.id }).$}/compliance`,
    );

    expect(await screen.findByText(/Team.+ASAP/i)).toBeVisible();
    expect(screen.queryByText(manuscriptTeamName)).not.toBeInTheDocument();
  });
});

describe('The lab count', () => {
  it('is displayed on a team that is not Team ASAP', async () => {
    await renderPage({
      ...createTeamResponse(),
      displayName: 'Not ASAP',
      labCount: 5,
    });

    expect(await screen.findByText(/5 Labs/i)).toBeVisible();
  });

  it('is not displayed on Team ASAP', async () => {
    await renderPage({
      ...createTeamResponse(),
      displayName: 'ASAP',
      labCount: 5,
    });

    expect(screen.queryByText(/5 Labs/i)).not.toBeInTheDocument();
  });
});

describe('The project banner', () => {
  const bannerText = /The workspace and outputs have moved/i;
  const dismissedKey = 'crn-team-project-banner-dismissed';
  const teamWithProject = {
    ...createTeamResponse(),
    linkedProjectId: 'project-1',
    projectType: 'Discovery Project' as const,
    projectTitle: 'Project Alpha',
  };

  beforeEach(() => {
    localStorage.removeItem(dismissedKey);
  });
  afterEach(() => {
    localStorage.removeItem(dismissedKey);
  });

  it('shows the banner when the team has a linked project', async () => {
    await renderPage(teamWithProject);
    expect(screen.getByText(bannerText)).toBeVisible();
  });

  it('hides the banner and persists the dismissal when the close button is clicked', async () => {
    jest.useRealTimers();
    await renderPage(teamWithProject);

    await userEvent.click(screen.getByLabelText('Close'));

    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
    expect(localStorage.getItem(dismissedKey)).toBe('true');
    jest.useFakeTimers();
  });

  it('does not show the banner when it was previously dismissed', async () => {
    localStorage.setItem(dismissedKey, 'true');
    await renderPage(teamWithProject);
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
  });
});

describe('the metrics tab', () => {
  const mockGetTeamHubResearchOutputs =
    getTeamHubResearchOutputs as jest.MockedFunction<
      typeof getTeamHubResearchOutputs
    >;
  const mockGetTeamLeadershipMetrics =
    getTeamLeadershipMetrics as jest.MockedFunction<
      typeof getTeamLeadershipMetrics
    >;
  const team = createTeamResponse();
  const teamMember = {
    teams: [{ id: team.id, role: 'Project Manager' as const }],
  };

  beforeEach(() => {
    enable('TEAM_METRICS_TAB');
    mockGetTeamHubResearchOutputs.mockResolvedValue({});
    mockGetTeamLeadershipMetrics.mockResolvedValue({
      workingGroupLead: false,
      interestGroupLead: false,
    });
  });

  it('is shown to a member of the team', async () => {
    await renderPage(team, {}, teamMember);

    expect(screen.getByText('Metrics')).toBeVisible();
  });

  it('is shown to staff who are not on the team', async () => {
    await renderPage(team, {}, { role: 'Staff' });

    expect(screen.getByText('Metrics')).toBeVisible();
  });

  it('is hidden from a user who is neither staff nor on the team', async () => {
    await renderPage(
      team,
      {},
      { teams: [{ id: 'another-team', role: 'Project Manager' }] },
    );

    expect(screen.queryByText('Metrics')).not.toBeInTheDocument();
  });

  it('is hidden when the flag is disabled', async () => {
    disable('TEAM_METRICS_TAB');

    await renderPage(team, {}, teamMember);

    expect(screen.queryByText('Metrics')).not.toBeInTheDocument();
  });

  it('renders the hub research outputs of the team', async () => {
    await renderPage(
      team,
      {},
      teamMember,
      network({}).teams({}).team({ teamId: team.id }).metrics({}).$,
    );

    expect(
      await screen.findByTestId('hub-research-outputs-table'),
    ).toBeVisible();
    expect(mockGetTeamHubResearchOutputs).toHaveBeenCalledWith(
      expect.anything(),
      { teamId: team.id },
    );
    expect(mockGetTeamLeadershipMetrics).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { teamId: team.id },
    );
  });

  it('does not render the metrics route when the flag is disabled', async () => {
    disable('TEAM_METRICS_TAB');

    await renderPage(
      team,
      {},
      teamMember,
      network({}).teams({}).team({ teamId: team.id }).metrics({}).$,
    );

    expect(
      screen.queryByTestId('hub-research-outputs-table'),
    ).not.toBeInTheDocument();
    expect(mockGetTeamHubResearchOutputs).not.toHaveBeenCalled();
    expect(mockGetTeamLeadershipMetrics).not.toHaveBeenCalled();
  });
});
