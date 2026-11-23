import {
  createListEventResponse,
  createListResearchOutputResponse,
  createResearchOutputResponse,
  createUserResponse,
  createWorkingGroupResponse,
} from '@asap-hub/fixtures';
import { network, sharedResearch } from '@asap-hub/routing';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps, Suspense } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  ResearchOutputWorkingGroupResponse,
  WorkingGroupResponse,
} from '@asap-hub/model';
import { subDays } from 'date-fns';
import { Auth0Provider, WhenReady } from '../../../auth/test-utils';
import {
  getDraftResearchOutputs,
  getResearchOutput,
  getResearchOutputs,
} from '../../../shared-research/api';
import { getWorkingGroup } from '../api';
import WorkingGroupProfile from '../WorkingGroupProfile';
import { getEvents } from '../../../events/api';
import { createResearchOutputListAlgoliaResponse } from '../../../__fixtures__/algolia';
import { createResearchOutput } from '../../teams/api';

jest.mock('../api');
jest.mock('../../../events/api');
jest.mock('../../../shared-research/api');
jest.mock('../../teams/api');

const mockGetResearchOutputs = getResearchOutputs as jest.MockedFunction<
  typeof getResearchOutputs
>;
const mockGetResearchOutput = getResearchOutput as jest.MockedFunction<
  typeof getResearchOutput
>;
const mockCreateResearchOutput = createResearchOutput as jest.MockedFunction<
  typeof createResearchOutput
>;
const mockGetDraftResearchOutputs =
  getDraftResearchOutputs as jest.MockedFunction<
    typeof getDraftResearchOutputs
  >;

mockGetResearchOutputs.mockResolvedValue({
  ...createResearchOutputListAlgoliaResponse(0),
});
const mockGetWorkingGroup = getWorkingGroup as jest.MockedFunction<
  typeof getWorkingGroup
>;
const mockGetWorkingGroupEventsFromAlgolia = getEvents as jest.MockedFunction<
  typeof getEvents
>;

const response = createListEventResponse(7);
mockGetWorkingGroupEventsFromAlgolia.mockResolvedValue(response);

beforeEach(jest.clearAllMocks);

const workingGroupResponse: WorkingGroupResponse = {
  ...createWorkingGroupResponse({}),
  lastModifiedDate: subDays(new Date(), 2).toISOString(),
};
const workingGroupId = workingGroupResponse.id;
const renderWorkingGroupProfile = async (
  user: ComponentProps<typeof Auth0Provider>['user'] = {},
  initialPath = network({}).workingGroups({}).workingGroup({ workingGroupId })
    .$,
  workingGroupOverrides = {},
) => {
  mockGetWorkingGroup.mockImplementation(async (id) =>
    id === workingGroupResponse.id
      ? { ...workingGroupResponse, ...workingGroupOverrides }
      : undefined,
  );

  const router = createMemoryRouter(
    [
      {
        path: `${network.template}${network({}).workingGroups.template}${
          network({}).workingGroups({}).workingGroup.template
        }/*`,
        element: <WorkingGroupProfile currentTime={new Date()} />,
      },
      {
        path: '*',
        element: <div>Navigated</div>,
      },
    ],
    {
      initialEntries: [initialPath],
    },
  );

  render(
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
  return router;
};

it('renders the about working-group information by default', async () => {
  await renderWorkingGroupProfile(createWorkingGroupResponse({}));

  expect(await screen.findByText(/Working Group Description/i)).toBeVisible();
  expect(await screen.findByRole('link', { name: 'About' })).toHaveClass(
    'active',
  );
});

it('renders the not-found page when the working-group is not found', async () => {
  mockGetWorkingGroup.mockResolvedValueOnce(undefined);
  await renderWorkingGroupProfile();

  expect(
    await screen.findByText(/can’t seem to find that page/i),
  ).toBeVisible();
});

describe('the share outputs page', () => {
  it('is rendered when user clicks share an output and chooses an option', async () => {
    jest.useRealTimers();

    const router = await renderWorkingGroupProfile(
      {
        ...createUserResponse({}, 1),
        workingGroups: [
          {
            id: workingGroupId,
            role: 'Project Manager',
            active: true,
            name: 'test',
          },
        ],
      },
      network({}).workingGroups({}).workingGroup({ workingGroupId }).$,
    );
    expect(screen.queryByText('About')).toBeInTheDocument();
    await userEvent.click(await screen.findByText(/share an output/i));
    expect(screen.getByText(/dataset/i, { selector: 'span' })).toBeVisible();
    await userEvent.click(screen.getByText(/dataset/i, { selector: 'span' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toEqual(
        '/network/working-groups/working-group-id-0/create-output/dataset',
      );
    });
    expect(screen.queryByText('About')).not.toBeInTheDocument();
    await waitFor(
      () => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
      { timeout: 30_000 },
    );

    jest.useFakeTimers();
  });

  it('does not render the share button when a user does not have permission', async () => {
    await renderWorkingGroupProfile(
      {
        ...createUserResponse({}, 1),
        workingGroups: [],
      },
      network({}).workingGroups({}).workingGroup({ workingGroupId }).$,
    );
    expect(screen.queryByText('About')).toBeInTheDocument();
    expect(screen.queryByText(/share an output/i)).toBeNull();
  });
});

describe('collaboration card', () => {
  it('is not rendered when user is the pm of the team', async () => {
    await renderWorkingGroupProfile(
      {
        ...createUserResponse({}, 1),
        workingGroups: [
          {
            id: workingGroupId,
            role: 'Project Manager',
            active: true,
            name: 'test',
          },
        ],
      },
      network({}).workingGroups({}).workingGroup({ workingGroupId }).$,
    );
    expect(
      screen.queryByText(
        'Would you like to collaborate with this Working Group?',
      ),
    ).not.toBeInTheDocument();
  });

  it('is not rendered when user is not the pm of the team but the working group is complete', async () => {
    await renderWorkingGroupProfile(
      {
        ...createUserResponse({}, 1),
        workingGroups: [],
      },
      network({}).workingGroups({}).workingGroup({ workingGroupId }).$,
      { complete: true },
    );
    expect(
      screen.queryByText(
        'Would you like to collaborate with this Working Group?',
      ),
    ).not.toBeInTheDocument();
  });

  it('is rendered when user is not the pm of the team', async () => {
    await renderWorkingGroupProfile(
      {
        ...createUserResponse({}, 1),
        workingGroups: [],
      },
      network({}).workingGroups({}).workingGroup({ workingGroupId }).$,
    );
    expect(
      screen.getByText(
        'Would you like to collaborate with this Working Group?',
      ),
    ).toBeVisible();
  });
});

describe('Duplicate Output', () => {
  it('allows a user who is a member of the working group duplicate the output', async () => {
    const wgResponse = createWorkingGroupResponse();
    const userResponse = createUserResponse({}, 1);
    const researchOutput: ResearchOutputWorkingGroupResponse = {
      ...createResearchOutputResponse(),
      id: '123',
      teams: [],
      workingGroups: [{ title: wgResponse.title, id: wgResponse.id }],
      title: 'Example',
      link: 'http://example.com',
    };
    mockGetResearchOutput.mockResolvedValue(researchOutput);
    mockGetWorkingGroup.mockResolvedValue(wgResponse);

    const router = await renderWorkingGroupProfile(
      {
        ...userResponse,
        workingGroups: [
          {
            id: wgResponse.id,
            active: true,
            name: wgResponse.title,
            role: 'Member',
          },
        ],
      },
      network({})
        .workingGroups({})
        .workingGroup({ workingGroupId: wgResponse.id })
        .duplicateOutput({ id: researchOutput.id }).$,
    );
    expect(screen.getByLabelText(/Title/i)).toHaveValue('Copy of Example');
    expect(screen.getByLabelText(/URL/i)).toHaveValue('');
    expect(router.state.location.pathname).toEqual(
      `/network/working-groups/${wgResponse.id}/duplicate/${researchOutput.id}`,
    );
  });
  it('will create a new research output when saved', async () => {
    jest.useRealTimers();
    const user = userEvent.setup({ delay: null });

    const wgResponse = createWorkingGroupResponse();
    const userResponse = createUserResponse({}, 1);
    const researchOutput: ResearchOutputWorkingGroupResponse = {
      ...createResearchOutputResponse(),
      id: '123',
      workingGroups: [{ title: wgResponse.title, id: wgResponse.id }],
      labs: [{ id: 'l0', name: 'Example 1' }],
      title: 'Example',
      link: 'http://example.com',
    };
    mockGetResearchOutput.mockResolvedValue(researchOutput);
    mockCreateResearchOutput.mockResolvedValue(researchOutput);

    mockGetWorkingGroup.mockResolvedValue(wgResponse);

    const router = await renderWorkingGroupProfile(
      {
        ...userResponse,
        workingGroups: [
          {
            name: wgResponse.title,
            active: true,
            id: wgResponse.id,
            role: 'Member',
          },
        ],
      },
      network({})
        .workingGroups({})
        .workingGroup({ workingGroupId: wgResponse.id })
        .duplicateOutput({ id: researchOutput.id }).$,
    );
    expect(await screen.findByLabelText(/Title/i)).toHaveValue(
      'Copy of Example',
    );
    await user.type(screen.getByLabelText(/URL/i), 'http://example.com');
    await user.click(screen.getByText(/save draft/i));
    await user.click(await screen.findByText(/keep and/i));

    await waitFor(() => {
      expect(mockCreateResearchOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Copy of Example',
          link: 'http://example.com',
        }),
        expect.anything(),
      );
    });

    await waitFor(
      () => {
        expect(
          router.state.location.pathname ===
            sharedResearch({}).researchOutput({
              researchOutputId: researchOutput.id,
            }).$ || screen.queryByText(/Navigated/i),
        ).toBeTruthy();
      },
      { timeout: 15000 },
    );

    jest.useFakeTimers();
  }, 30000);

  it('will show a page not found if research output does not exist', async () => {
    const wgResponse = createWorkingGroupResponse();
    const userResponse = createUserResponse({}, 1);

    mockGetResearchOutput.mockResolvedValueOnce(undefined);
    mockGetWorkingGroup.mockResolvedValue(wgResponse);

    await renderWorkingGroupProfile(
      {
        ...userResponse,
        workingGroups: [
          {
            id: wgResponse.id,
            role: 'Member',
            active: true,
            name: wgResponse.title,
          },
        ],
      },
      network({})
        .workingGroups({})
        .workingGroup({ workingGroupId: wgResponse.id })
        .duplicateOutput({ id: 'fake' }).$,
    );
    expect(screen.getByText(/sorry.+page/i)).toBeVisible();
  });
});

describe('the outputs tab', () => {
  it('can be switched to', async () => {
    jest.useRealTimers();

    const router = await renderWorkingGroupProfile();
    await waitFor(() => {
      expect(
        screen.getByText(/outputs/i, { selector: 'nav a *' }),
      ).toBeVisible();
    });

    const outputTab = await screen.findByText(/outputs/i, {
      selector: 'nav a *',
    });
    expect(outputTab).toBeVisible();

    await act(async () => {
      await userEvent.click(outputTab);
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toContain('/outputs');
    });

    const text = await screen.findByText(
      /This working group hasn’t shared any research yet!/i,
    );

    await waitFor(() => {
      expect(text).toBeVisible();
    });

    jest.useFakeTimers();
  });
});

describe('the calendar tab', () => {
  it('is not shown', async () => {
    await renderWorkingGroupProfile();

    expect(await screen.findByRole('link', { name: 'About' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Calendar' }),
    ).not.toBeInTheDocument();
  });

  it('redirects the old calendar url to the about tab', async () => {
    const router = await renderWorkingGroupProfile(
      {},
      `${
        network({}).workingGroups({}).workingGroup({ workingGroupId }).$
      }/calendar`,
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        network({}).workingGroups({}).workingGroup({ workingGroupId }).about({})
          .$,
      );
      expect(screen.getByRole('link', { name: 'About' })).toHaveClass('active');
    });
  });
});

describe('the upcoming events tab', () => {
  it('can be switched to', async () => {
    jest.useRealTimers();

    await renderWorkingGroupProfile();
    await userEvent.click(
      await screen.findByText(/upcoming/i, { selector: 'nav a *' }),
    );
    expect(await screen.findByText(/results/i)).toBeVisible();

    jest.useFakeTimers();
  });
  it('cannot be switched to if the group is inactive', async () => {
    await renderWorkingGroupProfile({}, undefined, { complete: true });

    expect(await screen.findByRole('link', { name: 'About' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: /upcoming events/i }),
    ).not.toBeInTheDocument();
  });
});

describe('the past events tab', () => {
  it('can be switched to', async () => {
    jest.useRealTimers();

    await renderWorkingGroupProfile();
    await userEvent.click(
      await screen.findByText(/past/i, { selector: 'nav a *' }),
    );
    expect(await screen.findByText(/results/i)).toBeVisible();

    jest.useFakeTimers();
  });
});

describe('the event tabs', () => {
  it('renders number of upcoming events from algolia', async () => {
    mockGetWorkingGroupEventsFromAlgolia.mockResolvedValue(response);
    await renderWorkingGroupProfile();

    expect(await screen.findByText(/Upcoming Events \(7\)/i)).toBeVisible();
  });

  it('renders number of past events from algolia', async () => {
    mockGetWorkingGroupEventsFromAlgolia.mockResolvedValue(response);
    await renderWorkingGroupProfile();

    expect(await screen.findByText(/Past Events \(7\)/i)).toBeVisible();
  });
});

describe('The draft output tab', () => {
  it('renders the draft outputs tab for a working group member', async () => {
    jest.useRealTimers();

    mockGetDraftResearchOutputs.mockResolvedValue({
      ...createListResearchOutputResponse(10),
      items: createListResearchOutputResponse(10).items.map(
        (output, index) => ({ ...output, title: `Draft Output${index}` }),
      ),
    });
    await renderWorkingGroupProfile({
      ...createUserResponse(),
      workingGroups: [
        {
          active: true,
          id: workingGroupId,
          name: 'test',
          role: 'Member',
        },
      ],
    });
    await userEvent.click(screen.getByText('Draft Outputs (10)'));
    await waitFor(() => expect(mockGetDraftResearchOutputs).toHaveBeenCalled());
    expect(await screen.findByText('Draft Output0')).toBeVisible();

    jest.useFakeTimers();
  });
  it('does not render the draft outputs tab for a complete working group', async () => {
    mockGetDraftResearchOutputs.mockResolvedValue({
      ...createListResearchOutputResponse(10),
      items: createListResearchOutputResponse(10).items.map(
        (output, index) => ({ ...output, title: `Draft Output${index}` }),
      ),
    });
    await renderWorkingGroupProfile({
      ...createUserResponse(),
      workingGroups: [
        {
          active: false,
          id: workingGroupId,
          name: 'test',
          role: 'Member',
        },
      ],
    });
    expect(screen.queryByText('Draft Outputs (10)')).not.toBeInTheDocument();
  });
  it('renders the draft outputs tab for a working group member when there are zero results', async () => {
    mockGetDraftResearchOutputs.mockResolvedValue(
      createListResearchOutputResponse(0),
    );
    await renderWorkingGroupProfile({
      ...createUserResponse(),
      workingGroups: [
        {
          active: true,
          id: workingGroupId,
          name: 'test',
          role: 'Member',
        },
      ],
    });
    expect(screen.getByText('Draft Outputs (0)')).toBeVisible();
  });
  it('does not renders the draft outputs tab when user is not a member of the working group', async () => {
    mockGetDraftResearchOutputs.mockResolvedValue(
      createListResearchOutputResponse(10),
    );
    await renderWorkingGroupProfile({
      ...createUserResponse(),
      workingGroups: [],
    });
    expect(screen.queryByText('Draft Outputs')).toBeNull();
  });
});
