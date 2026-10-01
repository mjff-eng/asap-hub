import { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { sharedResearch } from '@asap-hub/routing';
import * as flags from '@asap-hub/flags';
import {
  createResearchOutputResponse,
  createTeamResponse,
  createTeamResponseMembers,
  createUserResponse,
} from '@asap-hub/fixtures';

import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import { User } from '@asap-hub/auth';

import type {
  ResearchOutputResponse,
  TeamMember,
  TeamResponse,
  TraineeProjectDetail,
} from '@asap-hub/model';
import ResearchOutput from '../ResearchOutput';
import { getResearchOutput } from '../api';
import {
  getManuscriptVersionByManuscriptId,
  getTeam,
  updateTeamResearchOutput,
} from '../../network/teams/api';
import { getProject } from '../../projects/api';
import { getImpacts } from '../../shared-api/impact';

jest.setTimeout(30000);
jest.mock('../../network/teams/api');
jest.mock('../../network/users/api');
jest.mock('../../network/working-groups/api');
jest.mock('../../projects/api');
jest.mock('../api');
jest.mock('../../shared-api/impact');

beforeEach(() => {
  window.scrollTo = jest.fn();
  // Suppress React Router 6 warnings about nested routes and unmatched routes
  jest.spyOn(console, 'warn').mockImplementation((message) => {
    if (
      typeof message === 'string' &&
      (message.includes('rendered descendant <Routes>') ||
        message.includes('No routes matched location'))
    ) {
      // Suppress React Router 6 warnings - do nothing
    }
  });
});

const id = '42';

const mockGetResearchOutput = getResearchOutput as jest.MockedFunction<
  typeof getResearchOutput
>;
const mockUpdateTeamResearchOutput =
  updateTeamResearchOutput as jest.MockedFunction<
    typeof updateTeamResearchOutput
  >;

const mockGetImpacts = getImpacts as jest.MockedFunction<typeof getImpacts>;

const mockGetManuscriptVersionByManuscriptId =
  getManuscriptVersionByManuscriptId as jest.MockedFunction<
    typeof getManuscriptVersionByManuscriptId
  >;

const mockGetProject = getProject as jest.MockedFunction<typeof getProject>;

const mockGetTeam = getTeam as jest.MockedFunction<typeof getTeam>;

const projectId = 'project-1';

const project: TraineeProjectDetail = {
  id: projectId,
  title: 'Example Project',
  status: 'Active',
  statusRank: 1,
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  duration: '5 mos',
  tags: [],
  projectType: 'Trainee Project',
  members: [
    {
      id: 'member-1',
      displayName: 'Taylor Trainer',
      firstName: 'Taylor',
      lastName: 'Trainer',
      email: 'contact@example.com',
      role: 'Independent Project - Mentor',
    },
  ],
  originalGrant: 'Original Grant',
  originalGrantProposalId: 'proposal-1',
  contactEmail: 'contact@example.com',
};

beforeEach(() => {
  mockGetImpacts.mockResolvedValue({
    total: 0,
    items: [],
  });
  mockGetProject.mockResolvedValue(project);
  mockGetResearchOutput.mockClear();
  mockGetResearchOutput.mockResolvedValue({
    ...createResearchOutputResponse(),
    documentType: 'Article',
    id,
  });
});

const teams: User['teams'] = [
  {
    id: 't0',
    displayName: 'Jakobsson, J',
    roles: ['Project Manager'],
  },
];

const workingGroups: User['workingGroups'] = [
  {
    id: 'wg0',
    name: 'Working Group',
    roles: ['Project Manager'],
    active: true,
  },
];

const defaultUser: User = {
  ...createUserResponse({}, 1),
  teams,
  workingGroups,
  algoliaApiKey: null,
};

const researchOutputRoute = sharedResearch({}).researchOutput({
  researchOutputId: id,
});

// Simulates a toast handed over while ResearchOutput is already mounted,
// e.g. the publish modal on the view page or the nested edit/version forms.
const TriggerToastNavigation = () => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() =>
        navigate(researchOutputRoute.$, { state: { toast: 'published' } })
      }
    >
      trigger toast navigation
    </button>
  );
};

const renderComponent = async (
  path: string | { pathname: string; state?: unknown },
  user = defaultUser,
) => {
  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Auth0Provider user={user}>
        <WhenReady>
          <Suspense fallback="Loading...">
            <MemoryRouter initialEntries={[path]}>
              <TriggerToastNavigation />
              <Routes>
                <Route path="/prev" element={<div>Previous Page</div>} />
                <Route
                  path={`${sharedResearch.template}${
                    sharedResearch({}).researchOutput.template
                  }/*`}
                  element={<ResearchOutput />}
                />
              </Routes>
            </MemoryRouter>
          </Suspense>
        </WhenReady>
      </Auth0Provider>
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(result.queryByText(/loading/i)).not.toBeInTheDocument(),
  );
  return result;
};

describe('a grant document research output', () => {
  it('renders with its teams', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      id,
      documentType: 'Grant Document',
      teams: [
        {
          displayName: 'Grant Document Team',
          id: teams[0]!.id,
          teamType: 'Discovery Team',
        },
      ],
      title: 'Grant Document title!',
    });
    await renderComponent(researchOutputRoute.$);

    expect(
      screen.getByRole('heading', { name: 'Grant Document title!' }),
    ).toBeVisible();
  });
  it('links to a teams', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      id,
      documentType: 'Grant Document',
      teams: [
        {
          id: teams[0]!.id,
          displayName: 'Sulzer, D',
          teamType: 'Discovery Team',
        },
      ],
    });

    const { getByText } = await renderComponent(researchOutputRoute.$);
    expect(getByText('Team Sulzer, D')).toHaveAttribute(
      'href',
      expect.stringMatching(teams[0]!.id),
    );
  });

  it('renders the edit page when you have permissions for teams', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      documentType: 'Bioinformatics',
      publishingEntity: 'Team',
      teams: [
        {
          id: 't0',
          displayName: 'Jakobsson, J',
          teamType: 'Discovery Team',
        },
      ],
      workingGroups: undefined,
      published: true,
    });

    await renderComponent(researchOutputRoute.editResearchOutput({}).$);

    expect(
      screen.getByRole('heading', { name: /Share Team Bioinformatics/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeVisible();
  });
});

describe('a grant document with grant data', () => {
  const grantDocumentOutput: ResearchOutputResponse = {
    ...createResearchOutputResponse(),
    id,
    documentType: 'Grant Document',
    grantDocument: {
      grantType: 'original',
      project: {
        id: 'project-1',
        title: 'Grant Project',
        projectType: 'Discovery Project',
      },
      original: {
        title: 'Original grant',
        endDate: '2020-01-01T00:00:00.000Z',
      },
    },
  };

  beforeEach(() => {
    mockGetResearchOutput.mockResolvedValue(grantDocumentOutput);
  });

  it('keeps the current layout while STAGING_MODE is disabled', async () => {
    flags.disable('STAGING_MODE');
    await renderComponent(researchOutputRoute.$);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: grantDocumentOutput.title,
      }),
    ).toBeVisible();
    expect(screen.queryByText('Project Output')).not.toBeInTheDocument();
    expect(
      screen.queryByText('The funding period for this grant has closed.'),
    ).not.toBeInTheDocument();
  });

  it('renders the grant layout and the closed toast when STAGING_MODE is enabled', async () => {
    flags.enable('STAGING_MODE');
    await renderComponent(researchOutputRoute.$);

    expect(screen.getByText('Project Output')).toBeVisible();
    expect(
      screen.getByText('The funding period for this grant has closed.'),
    ).toBeVisible();
  });
});

describe('a not-grant-document research output', () => {
  it('renders with keywords', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      id,
      documentType: 'Protocol',
      keywords: ['Example Keyword'],
      title: 'Not-Grant-Document title!',
      teams: [
        {
          id: teams[0]!.id,
          displayName: 'Sulzer, D',
          teamType: 'Discovery Team',
        },
      ],
    });
    const { getByRole, getByText } = await renderComponent(
      researchOutputRoute.$,
    );
    expect(getByText(/Example Keyword/i)).toBeVisible();
    expect(getByRole('heading', { level: 1 }).textContent).toEqual(
      'Not-Grant-Document title!',
    );
  });
});

describe('a working group research output', () => {
  it('renders a research output form for ASAP Staff', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      documentType: 'Article',
      workingGroups: [{ title: 'Example Working Group', id: 'wg0' }],
    });
    const { getByRole } = await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      {
        ...defaultUser,
        role: 'Staff',
        teams: [
          {
            id: 'any',
            roles: ['Key Personnel'],
          },
        ],
        workingGroups: [
          {
            id: 'wg1',
            name: 'Example Working Group',
            roles: ['Chair'],
            active: true,
          },
        ],
      },
    );
    expect(getByRole('heading', { level: 1 }).textContent).toEqual(
      'Share a Working Group Article',
    );
  });

  it('renders a research output form for a Project Manager', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      documentType: 'Article',
      workingGroups: [{ title: 'Example Working Group', id: 'wg0' }],
    });
    const { getByRole } = await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      {
        ...defaultUser,
        workingGroups: [
          {
            id: 'wg0',
            name: 'Example Working Group',
            roles: ['Project Manager'],
            active: true,
          },
        ],
      },
    );
    expect(getByRole('heading', { level: 1 }).textContent).toEqual(
      'Share a Working Group Article',
    );
  });

  it('renders the sorry page if you are not a member of the working group', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      documentType: 'Article',
      workingGroups: [{ title: 'Example Working Group', id: 'wg0' }],
    });
    const { getByText } = await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      {
        ...defaultUser,
        workingGroups: [
          {
            id: 'not-related-to-research-output',
            name: 'Example Working Group',
            roles: ['Project Manager'],
            active: true,
          },
        ],
      },
    );
    expect(getByText(/sorry.+page/i)).toBeVisible();
  });

  it('renders the sorry page if you do not belong to that working group', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      documentType: 'Article',
      workingGroups: [{ title: 'Example Working Group', id: 'wg0' }],
    });
    const { getByText } = await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      {
        ...defaultUser,
        workingGroups: [
          {
            id: 'wg1',
            name: 'Example Working Group',
            roles: ['Project Manager'],
            active: true,
          },
        ],
      },
    );
    expect(getByText(/sorry.+page/i)).toBeVisible();
  });

  it('renders the sorry page when the output has no working group id', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      documentType: 'Article',
      publishingEntity: 'Working Group',
      workingGroups: undefined,
    });

    const { getByText } = await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      {
        ...defaultUser,
        role: 'Staff',
      },
    );

    expect(getByText(/sorry.+page/i)).toBeVisible();
  });
});

describe('a project research output', () => {
  const projectOutput = {
    ...createResearchOutputResponse(),
    id,
    teams: [],
    documentType: 'Bioinformatics' as const,
    publishingEntity: 'Project' as const,
    workingGroups: undefined,
    published: false,
    project: {
      id: projectId,
      title: project.title,
      projectType: 'Trainee Project' as const,
      projectId: 'TP1',
    },
  };

  const projectMember: User = {
    ...defaultUser,
    projects: [
      {
        id: projectId,
        title: project.title,
        projectType: 'Trainee Project',
        status: 'Active',
      },
    ],
  };

  it('renders the user based output form for a member of the project', async () => {
    mockGetResearchOutput.mockResolvedValue(projectOutput);

    await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      projectMember,
    );

    expect(
      screen.getByRole('heading', { name: /Share Project Bioinformatics/i }),
    ).toBeInTheDocument();
  });

  it('does not render the form for non project members', async () => {
    mockGetResearchOutput.mockResolvedValue(projectOutput);

    const { getByText } = await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      {
        ...defaultUser,
        projects: [
          {
            id: 'another-project',
            title: 'Another Project',
            projectType: 'Trainee Project',
            status: 'Active',
          },
        ],
      },
    );

    expect(getByText(/sorry.+page/i)).toBeVisible();
  });

  it('renders the add version form for the project', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...projectOutput,
      published: true,
    });

    await renderComponent(researchOutputRoute.versionResearchOutput({}).$, {
      ...projectMember,
      role: 'Staff',
    });

    expect(
      screen.getByRole('heading', { name: /Share Project Bioinformatics/i }),
    ).toBeInTheDocument();
  });

  it('renders the sorry page when the output is not linked to a project', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...projectOutput,
      project: undefined,
    });

    const { getByText } = await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      {
        ...projectMember,
        role: 'Staff',
      },
    );

    expect(getByText(/sorry.+page/i)).toBeVisible();
  });

  it('lets a member publish a draft when the project has no lead', async () => {
    mockGetResearchOutput.mockResolvedValue(projectOutput);

    const { queryByText } = await renderComponent(
      researchOutputRoute.$,
      projectMember,
    );

    expect(queryByText('Publish')).toBeVisible();
  });

  it('lets the project lead publish a draft', async () => {
    mockGetProject.mockResolvedValue({
      ...project,
      members: [
        {
          id: projectMember.id,
          displayName: 'Lead Member',
          role: 'Independent Project - Lead',
        },
      ],
    });
    mockGetResearchOutput.mockResolvedValue(projectOutput);

    const { queryByText } = await renderComponent(
      researchOutputRoute.$,
      projectMember,
    );

    expect(queryByText('Publish')).toBeVisible();
  });

  it('lets a non-lead member request review but not publish a draft when the project has a lead', async () => {
    mockGetProject.mockResolvedValue({
      ...project,
      members: [
        {
          id: 'other-lead',
          displayName: 'Other Lead',
          role: 'Independent Project - Lead',
        },
        {
          id: projectMember.id,
          displayName: 'Member',
          role: 'Independent Project - Mentor',
        },
      ],
    });
    mockGetResearchOutput.mockResolvedValue(projectOutput);

    const { queryByText } = await renderComponent(
      researchOutputRoute.$,
      projectMember,
    );

    expect(queryByText('Publish')).not.toBeInTheDocument();
    expect(queryByText('Ready for Review')).toBeVisible();
  });
});

describe('a team-based project research output', () => {
  const [baseTeamMember] = createTeamResponseMembers({
    teamMembers: 1,
  }) as [TeamMember];

  const teamBasedProjectOutput: ResearchOutputResponse = {
    ...createResearchOutputResponse(),
    id,
    documentType: 'Article',
    publishingEntity: 'Team',
    workingGroups: undefined,
    published: false,
    project: undefined,
    teams: [
      {
        id: 't0',
        displayName: 'Team ASAP',
        teamType: 'Discovery Team',
        project: {
          id: projectId,
          title: project.title,
          projectType: 'Trainee Project',
          projectId: 'TP1',
        },
      },
    ],
  };

  const teamMemberUser: User = {
    ...defaultUser,
    teams: [{ id: 't0', displayName: 'Team ASAP', roles: ['Key Personnel'] }],
  };

  const teamWithActiveProjectManager: TeamResponse = {
    ...createTeamResponse(),
    id: 't0',
    members: [
      {
        ...baseTeamMember,
        role: 'Project Manager',
        alumniSinceDate: undefined,
        inactiveSinceDate: undefined,
      },
    ],
  };

  const teamWithoutActiveProjectManager: TeamResponse = {
    ...createTeamResponse(),
    id: 't0',
    members: [{ ...baseTeamMember, role: 'Key Personnel' }],
  };

  it('lets a member publish a draft when the team has no active project manager', async () => {
    mockGetResearchOutput.mockResolvedValue(teamBasedProjectOutput);
    mockGetTeam.mockResolvedValue(teamWithoutActiveProjectManager);

    const { queryByText } = await renderComponent(
      researchOutputRoute.$,
      teamMemberUser,
    );

    expect(queryByText('Publish')).toBeVisible();
    expect(
      queryByText(/Any project member can publish this output\./i),
    ).toBeVisible();
  });

  it('lets a non-manager member request review but not publish when the team has an active project manager', async () => {
    mockGetResearchOutput.mockResolvedValue(teamBasedProjectOutput);
    mockGetTeam.mockResolvedValue(teamWithActiveProjectManager);

    const { queryByText } = await renderComponent(
      researchOutputRoute.$,
      teamMemberUser,
    );

    expect(queryByText('Publish')).not.toBeInTheDocument();
    expect(queryByText('Ready for Review')).toBeVisible();
    expect(
      queryByText(/Only the project manager can publish this output\./i),
    ).toBeVisible();
  });

  it('requires authors when editing a team-based project Article output', async () => {
    mockGetResearchOutput.mockResolvedValue(teamBasedProjectOutput);
    mockGetTeam.mockResolvedValue(teamWithoutActiveProjectManager);

    await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      defaultUser,
    );

    expect(await screen.findByLabelText(/Authors\(required\)/i)).toBeVisible();
    expect(
      screen.queryByLabelText(/Authors\(optional\)/i),
    ).not.toBeInTheDocument();
  });

  it('shows a Project header when editing a team-based project output', async () => {
    mockGetResearchOutput.mockResolvedValue(teamBasedProjectOutput);
    mockGetTeam.mockResolvedValue(teamWithoutActiveProjectManager);

    await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      defaultUser,
    );

    expect(
      await screen.findByRole('heading', { name: /Share a Project Article/i }),
    ).toBeVisible();
  });
});

describe('edit form with missing association data', () => {
  it('renders the sorry page when a team output has no teams', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      documentType: 'Article',
      publishingEntity: 'Team',
      teams: [],
      workingGroups: undefined,
    });

    const { getByText } = await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      {
        ...defaultUser,
        role: 'Staff',
      },
    );

    expect(getByText(/sorry.+page/i)).toBeVisible();
  });

  it('renders the sorry page for an unknown entity type', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      documentType: 'Article',
      publishingEntity: 'Unknown' as ResearchOutputResponse['publishingEntity'],
    });

    const { getByText } = await renderComponent(
      researchOutputRoute.editResearchOutput({}).$,
      {
        ...defaultUser,
        role: 'Staff',
      },
    );

    expect(getByText(/sorry.+page/i)).toBeVisible();
  });
});

it('renders the 404 page for a missing research output', async () => {
  mockGetResearchOutput.mockResolvedValue(undefined);
  const { getByText } = await renderComponent(researchOutputRoute.$);
  expect(getByText(/sorry.+page/i)).toBeVisible();
});

it('switches a draft research output to in review', async () => {
  const researchOutput = createResearchOutputResponse();
  mockGetResearchOutput.mockResolvedValue({
    ...researchOutput,
    documentType: 'Article',
    publishingEntity: 'Team',
    published: false,
    workingGroups: undefined,
  });

  const { queryByText, getAllByText } = await renderComponent(
    researchOutputRoute.$,
    {
      ...defaultUser,
      teams: [
        {
          id: researchOutput.teams[0]!.id,
          roles: ['Key Personnel'],
          displayName: researchOutput.teams[0]!.displayName,
        },
      ],
    },
  );

  const showModalButton = queryByText('Ready for PM Review');

  expect(showModalButton).toBeVisible();

  await userEvent.click(showModalButton as HTMLElement);
  const saveButton = getAllByText('Ready for PM Review')[1];

  await userEvent.click(saveButton as HTMLElement);
  await waitFor(() => {
    expect(saveButton).toBeEnabled();
  });

  expect(mockUpdateTeamResearchOutput).toHaveBeenCalledWith(
    researchOutput.id,
    expect.objectContaining({
      statusChangedById: defaultUser.id,
    }),
    expect.anything(),
  );
});

it('switches a in review research output back to draft', async () => {
  const researchOutput = createResearchOutputResponse();
  mockGetResearchOutput.mockResolvedValue({
    ...researchOutput,
    documentType: 'Article',
    publishingEntity: 'Team',
    published: false,
    workingGroups: undefined,
    statusChangedBy: { ...defaultUser },
    isInReview: true,
  });

  const { queryByText, getAllByText } = await renderComponent(
    researchOutputRoute.$,
    {
      ...defaultUser,
      teams: [
        {
          id: researchOutput.teams[0]!.id,
          roles: ['Project Manager'],
          displayName: researchOutput.teams[0]!.displayName,
        },
      ],
    },
  );

  const showModalButton = queryByText('Switch to Draft');

  expect(showModalButton).toBeVisible();

  await userEvent.click(showModalButton as HTMLElement);
  const saveButton = getAllByText('Switch to Draft')[1];

  await userEvent.click(saveButton as HTMLElement);
  await waitFor(() => {
    expect(saveButton).toBeEnabled();
  });

  expect(mockUpdateTeamResearchOutput).toHaveBeenCalledWith(
    researchOutput.id,
    expect.objectContaining({
      statusChangedById: defaultUser.id,
      hasStatusChanged: true,
      isInReview: false,
    }),
    expect.anything(),
  );
});

it('publishes a research output', async () => {
  const researchOutput = createResearchOutputResponse();
  mockGetResearchOutput.mockResolvedValue({
    ...researchOutput,
    documentType: 'Article',
    publishingEntity: 'Team',
    published: false,
    workingGroups: undefined,
    statusChangedBy: { ...defaultUser },
  });

  const { queryByText, getByText } = await renderComponent(
    researchOutputRoute.$,
    {
      ...defaultUser,
      teams: [
        {
          id: researchOutput.teams[0]!.id,
          roles: ['Project Manager'],
          displayName: researchOutput.teams[0]!.displayName,
        },
      ],
    },
  );

  const showPublishModalButton = queryByText('Publish');

  expect(showPublishModalButton).toBeVisible();

  await userEvent.click(showPublishModalButton as HTMLElement);
  const publishButton = getByText('Publish Output');

  await userEvent.click(publishButton);
  await waitFor(() => {
    expect(publishButton).toBeEnabled();
  });

  expect(mockUpdateTeamResearchOutput).toHaveBeenCalledWith(
    researchOutput.id,
    expect.objectContaining({
      published: true,
    }),
    expect.anything(),
  );
});

describe('a research output linked to a manuscript', () => {
  beforeEach(() => {
    jest.spyOn(flags, 'isEnabled').mockReturnValue(true);
  });
  it('renders add version form on clicking Import Manuscript Version if manuscript output has new manuscript version', async () => {
    const researchOutput = createResearchOutputResponse();
    mockGetResearchOutput.mockResolvedValue({
      ...researchOutput,
      documentType: 'Article',
      publishingEntity: 'Team',
      published: true,
      workingGroups: undefined,
      statusChangedBy: { ...defaultUser },
      relatedManuscript: 'manuscript-id-1',
      relatedManuscriptVersion: 'version-id-1',
    });

    const { queryByText, getByText } = await renderComponent(
      researchOutputRoute.$,
      {
        ...defaultUser,
        teams: [
          {
            id: researchOutput.teams[0]!.id,
            roles: ['Project Manager'],
            displayName: researchOutput.teams[0]!.displayName,
          },
        ],
      },
    );

    const importVersionButton = queryByText('Import Manuscript Version');
    expect(importVersionButton).toBeVisible();

    await userEvent.click(importVersionButton as HTMLElement);
    await waitFor(() => {
      expect(getByText('Imported Manuscript Version')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { name: /Share a Team Article/i }),
    ).toBeInTheDocument();
  });

  it('renders no new version modal on clicking Import Manuscript Version if manuscript output does not have a new manuscript version', async () => {
    const researchOutput = createResearchOutputResponse();
    const recentVersionId = 'version-id-2';
    mockGetResearchOutput.mockResolvedValue({
      ...researchOutput,
      documentType: 'Article',
      publishingEntity: 'Team',
      published: true,
      workingGroups: undefined,
      statusChangedBy: { ...defaultUser },
      relatedManuscript: 'manuscript-id-1',
      relatedManuscriptVersion: recentVersionId,
    });

    const { queryByText, getByText } = await renderComponent(
      researchOutputRoute.$,
      {
        ...defaultUser,
        teams: [
          {
            id: researchOutput.teams[0]!.id,
            roles: ['Project Manager'],
            displayName: researchOutput.teams[0]!.displayName,
          },
        ],
      },
    );

    const importVersionButton = queryByText('Import Manuscript Version');
    expect(importVersionButton).toBeVisible();

    await userEvent.click(importVersionButton as HTMLElement);
    await waitFor(() => {
      expect(getByText('No new manuscript versions available')).toBeVisible();
    });
  });

  it('renders no new version modal on clicking Import Manuscript Version if unable to fetch manuscript version', async () => {
    const researchOutput = createResearchOutputResponse();

    mockGetResearchOutput.mockResolvedValue({
      ...researchOutput,
      documentType: 'Article',
      publishingEntity: 'Team',
      published: true,
      workingGroups: undefined,
      statusChangedBy: { ...defaultUser },
      relatedManuscript: 'manuscript-id-1',
      relatedManuscriptVersion: 'version-id-1',
    });
    mockGetManuscriptVersionByManuscriptId.mockRejectedValue(
      new Error('error'),
    );

    const { queryByText, getByText } = await renderComponent(
      researchOutputRoute.$,
      {
        ...defaultUser,
        teams: [
          {
            id: researchOutput.teams[0]!.id,
            roles: ['Project Manager'],
            displayName: researchOutput.teams[0]!.displayName,
          },
        ],
      },
    );

    const importVersionButton = queryByText('Import Manuscript Version');
    expect(importVersionButton).toBeVisible();

    await userEvent.click(importVersionButton as HTMLElement);
    await waitFor(() => {
      expect(getByText('No new manuscript versions available')).toBeVisible();
    });
  });
});

describe('success toast', () => {
  it('shows the published toast when arriving with toast navigation state', async () => {
    await renderComponent({
      pathname: researchOutputRoute.$,
      state: { toast: 'published' },
    });

    expect(await screen.findByText(/published successfully/i)).toBeVisible();
  });

  it('shows the draft created toast when arriving with toast navigation state', async () => {
    mockGetResearchOutput.mockResolvedValue({
      ...createResearchOutputResponse(),
      documentType: 'Article',
      id,
      published: false,
    });
    await renderComponent({
      pathname: researchOutputRoute.$,
      state: { toast: 'draftCreated' },
    });

    expect(await screen.findByText(/created successfully/i)).toBeVisible();
  });

  it('shows no toast without navigation state', async () => {
    await renderComponent(researchOutputRoute.$);

    expect(screen.queryByText(/published successfully/i)).toBeNull();
  });

  it('shows the toast when it arrives while the page is already mounted', async () => {
    await renderComponent(researchOutputRoute.$);
    expect(screen.queryByText(/published successfully/i)).toBeNull();

    await userEvent.click(
      screen.getByRole('button', { name: 'trigger toast navigation' }),
    );

    expect(await screen.findByText(/published successfully/i)).toBeVisible();
  });
});
