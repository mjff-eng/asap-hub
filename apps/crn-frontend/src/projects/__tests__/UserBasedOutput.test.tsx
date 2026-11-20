import { mockActWarningsInConsole } from '@asap-hub/dom-test-utils';
import {
  createManuscriptVersionResponse,
  createResearchOutputResponse,
  createUserResponse,
} from '@asap-hub/fixtures';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import type {
  DiscoveryProjectDetail as DiscoveryProjectDetailType,
  ManuscriptVersionResponse,
  ResearchOutputResponse,
  TraineeProjectDetail as TraineeProjectDetailType,
} from '@asap-hub/model';
import { OutputDocumentTypeParameter, projects } from '@asap-hub/routing';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense, useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { Auth0Provider, WhenReady } from '../../auth/test-utils';
import { getProject } from '../api';
import UserBasedOutput from '../UserBasedOutput';

jest.mock('../api');

const mockGetManuscriptVersionSuggestions = jest.fn().mockResolvedValue([]);
jest.mock('../../network/teams/state', () => ({
  usePostPreprintResearchOutput: jest.fn(() => jest.fn()),
  useManuscriptVersionSuggestions: () => mockGetManuscriptVersionSuggestions,
}));
const mockGetAuthorSuggestions = jest.fn();
const mockCreateResearchOutput = jest.fn();
const mockUpdateResearchOutput = jest.fn();
const mockUseResearchTags = jest.fn(() => [
  { category: 'Keyword', name: 'keyword-tag' },
  { category: 'Method', name: 'method-tag' },
]);

jest.mock('../../shared-state', () => {
  const actual = jest.requireActual('../../shared-state');
  return {
    ...actual,
    useResearchTags: () => mockUseResearchTags(),
    useAuthorSuggestions: () => mockGetAuthorSuggestions,
    useGeneratedContent: jest.fn(() => jest.fn().mockResolvedValue('')),
    useImpactSuggestions: jest.fn(() => jest.fn().mockResolvedValue([])),
    useCategorySuggestions: jest.fn(() => jest.fn().mockResolvedValue([])),
    useRelatedEventsSuggestions: jest.fn(() => jest.fn().mockResolvedValue([])),
    useRelatedResearchSuggestions: jest.fn(() =>
      jest.fn().mockResolvedValue([]),
    ),
    usePostResearchOutput: () => mockCreateResearchOutput,
    usePutResearchOutput: () => mockUpdateResearchOutput,
  };
});

const mockGetProject = getProject as jest.MockedFunction<typeof getProject>;

let currentLocation: {
  pathname: string;
  search: string;
  state: unknown;
} | null = null;

const LocationCapture = () => {
  const location = useLocation();
  useEffect(() => {
    currentLocation = {
      pathname: location.pathname,
      search: location.search,
      state: location.state,
    };
  }, [location]);
  return null;
};

const projectId = 'trainee-1';
const memberId = 'member-1';

const mockProject: TraineeProjectDetailType = {
  id: projectId,
  title: 'Trainee Project 1',
  status: 'Active',
  statusRank: 1,
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  duration: '5 mos',
  tags: [],
  projectType: 'Trainee Project',
  members: [
    {
      id: memberId,
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

// A Discovery project has no `members` field, so the component cannot build a
// list of project member ids from it.
const mockProjectWithoutMembers: DiscoveryProjectDetailType = {
  id: projectId,
  title: 'Discovery Project 1',
  status: 'Active',
  statusRank: 1,
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  duration: '5 mos',
  tags: [],
  projectType: 'Discovery Project',
  researchTheme: 'Theme One',
  teamName: 'Discovery Team',
  teamId: 'team-1',
  originalGrant: 'Original Grant',
  originalGrantProposalId: 'proposal-1',
  contactEmail: 'contact@example.com',
  fundedTeam: {
    id: 'team-1',
    displayName: 'Discovery Team',
    teamType: 'Discovery Team',
    researchTheme: 'Theme One',
    teamDescription: 'Team description',
  },
};

const projectMembership = {
  id: projectId,
  title: mockProject.title,
  projectType: 'Trainee Project' as const,
  status: 'Active',
};

const existingOutput: ResearchOutputResponse = {
  ...createResearchOutputResponse(),
  id: 'output-1',
  documentType: 'Bioinformatics',
  publishingEntity: 'Project',
  published: true,
  workingGroups: undefined,
  project: {
    id: projectId,
    title: mockProject.title,
    projectType: 'Trainee Project',
    projectId: 'TP1',
  },
};

const teamsField = /Add other teams that contributed to this output/;
const labsField = /Add ASAP labs that contributed to this output/;
const addVersionBanner =
  /previous output page will be replaced with a summarised version history/i;

const nonMember = {
  ...createUserResponse(),
  id: 'outsider-1',
  displayName: 'Olivia Outsider',
};

beforeEach(() => {
  currentLocation = null;
  window.scrollTo = jest.fn();
  // Submitting the form runs async validation whose final state update lands
  // after the assertions; only act() warnings are suppressed, everything else
  // still fails the test.
  mockActWarningsInConsole('error');
  mockGetProject.mockResolvedValue(mockProject);
  mockGetAuthorSuggestions.mockResolvedValue([nonMember]);
  mockCreateResearchOutput.mockResolvedValue({
    ...createResearchOutputResponse(),
    id: 'research-output-id',
  });
  mockUpdateResearchOutput.mockResolvedValue({
    ...createResearchOutputResponse(),
    id: 'research-output-id',
  });
  mockGetManuscriptVersionSuggestions.mockResolvedValue([]);
  mockUseResearchTags.mockReturnValue([
    { category: 'Keyword', name: 'keyword-tag' },
    { category: 'Method', name: 'method-tag' },
  ]);
});

// Picks the one suggested author and submits, so that the authors field is
// validated for real rather than only inspected for its description.
const selectAuthorAndSaveDraft = async () => {
  await userEvent.click(screen.getByLabelText(/Authors/i));
  await waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
  );
  await userEvent.click(screen.getByText(nonMember.displayName));

  const saveDraft = screen.getByRole('button', { name: /Save Draft/i });
  await userEvent.click(saveDraft);
  // The form disables its buttons while submitting; waiting for them to come
  // back flushes the trailing state update inside act.
  await waitFor(() => expect(saveDraft).toBeEnabled());
};

const nonMemberAuthorError = /are not members of this project/i;

afterEach(() => {
  jest.clearAllMocks();
});

type RenderOptions = {
  outputDocumentType?: OutputDocumentTypeParameter;
  researchOutputData?: ResearchOutputResponse;
  latestManuscriptVersion?: ManuscriptVersionResponse;
  versionAction?: 'create' | 'edit';
  isDuplicate?: boolean;
  role?: 'Grantee' | 'Staff';
  waitForLoad?: boolean;
};

const projectMemberAuthor = {
  id: memberId,
  displayName: 'Taylor Trainer',
  firstName: 'Taylor',
  lastName: 'Trainer',
  email: 'contact@example.com',
};

const editableOutput: ResearchOutputResponse = {
  ...existingOutput,
  published: false,
  type: 'Software',
  link: 'https://example.com/output',
  title: 'Editable Output',
  descriptionMD: 'Description',
  shortDescription: 'Short description',
  authors: [projectMemberAuthor],
  statusChangedBy: {
    id: 'status-user',
    firstName: 'Status',
    lastName: 'User',
  },
  isInReview: false,
};

const renderPage = async ({
  outputDocumentType = 'bioinformatics',
  researchOutputData,
  latestManuscriptVersion,
  versionAction,
  isDuplicate,
  role = 'Grantee',
  waitForLoad = true,
}: RenderOptions = {}) => {
  const projectRoute = projects({})
    .traineeProjects({})
    .traineeProject({ projectId });

  const path =
    projects.template +
    projects({}).traineeProjects.template +
    projects({}).traineeProjects({}).traineeProject.template +
    projectRoute.createOutput.template;

  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{ role, projects: [projectMembership] }}>
          <WhenReady>
            <MemoryRouter
              initialEntries={[
                projectRoute.createOutput({ outputDocumentType }).$,
              ]}
            >
              <LocationCapture />
              <Routes>
                <Route
                  path={path}
                  element={
                    <UserBasedOutput
                      projectId={projectId}
                      researchOutputData={researchOutputData}
                      latestManuscriptVersion={latestManuscriptVersion}
                      versionAction={versionAction}
                      isDuplicate={isDuplicate}
                    />
                  }
                />
                <Route path="*" element={<div>Redirected</div>} />
              </Routes>
            </MemoryRouter>
          </WhenReady>
        </Auth0Provider>
      </Suspense>
    </QueryClientProvider>,
  );

  if (waitForLoad) {
    await waitFor(
      () => expect(result.queryByText(/loading/i)).not.toBeInTheDocument(),
      { timeout: 30_000 },
    );
  }

  return result;
};

describe('UserBasedOutput', () => {
  it('renders the form under a project heading', async () => {
    await renderPage();

    expect(
      screen.getByRole('heading', { name: /Share Project Bioinformatics/i }),
    ).toBeInTheDocument();
  });

  it('renders the breadcrumbs back to the project', async () => {
    await renderPage();

    expect(
      screen.getByRole('link', { name: 'Trainee Projects' }),
    ).toHaveAttribute('href', projects({}).traineeProjects({}).$);
    expect(
      screen.getByRole('link', { name: mockProject.title }),
    ).toHaveAttribute(
      'href',
      projects({}).traineeProjects({}).traineeProject({ projectId }).about({})
        .$,
    );
    expect(screen.getByText('Share Bioinformatics')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('switches the document type based on the route parameter', async () => {
    await renderPage({
      outputDocumentType: 'dataset',
    });

    expect(
      screen.getByRole('heading', { name: /Share a Project Dataset/i }),
    ).toBeInTheDocument();
  });

  describe('contributors', () => {
    it('does not ask for teams and labs, which project outputs do not have', async () => {
      await renderPage();

      expect(screen.queryByText(teamsField)).not.toBeInTheDocument();
      expect(screen.queryByText(labsField)).not.toBeInTheDocument();
    });

    it('tells the user that only project members can be named as authors', async () => {
      await renderPage();

      expect(
        screen.getByText(/Only members of this project can be named/i),
      ).toBeVisible();
      expect(
        screen.queryByText(/must have one of their teams listed/i),
      ).not.toBeInTheDocument();
    });

    it('rejects an author who is not a member of the project', async () => {
      await renderPage();

      await selectAuthorAndSaveDraft();

      const error = await screen.findByText(nonMemberAuthorError);
      expect(error).toBeVisible();
      expect(error.textContent).toContain(nonMember.displayName);
    });

    // This should never happen, it is here to reach code coverage
    it('does not restrict authors to project members when the project carries no member list', async () => {
      mockGetProject.mockResolvedValue(mockProjectWithoutMembers);

      await renderPage();

      expect(
        screen.queryByText(/Only members of this project can be named/i),
      ).not.toBeInTheDocument();

      await selectAuthorAndSaveDraft();

      expect(screen.queryByText(nonMemberAuthorError)).not.toBeInTheDocument();
    });

    it('rejects every author when the project has no members yet', async () => {
      mockGetProject.mockResolvedValue({ ...mockProject, members: [] });

      await renderPage();

      expect(
        screen.getByText(/Only members of this project can be named/i),
      ).toBeVisible();

      await selectAuthorAndSaveDraft();

      expect(await screen.findByText(nonMemberAuthorError)).toBeVisible();
    });
  });

  describe('adding a version', () => {
    it('warns that the current output page will be replaced', async () => {
      await renderPage({
        researchOutputData: existingOutput,
        versionAction: 'create',
      });

      expect(screen.getByText(addVersionBanner)).toBeVisible();
    });

    it('shows the existing versions', async () => {
      await renderPage({
        researchOutputData: existingOutput,
        versionAction: 'create',
      });

      expect(screen.getByText(/#1/)).toBeInTheDocument();
    });

    it('does not warn about replacing the page when editing', async () => {
      await renderPage({
        researchOutputData: existingOutput,
        versionAction: 'edit',
      });

      expect(screen.queryByText(addVersionBanner)).not.toBeInTheDocument();
    });

    it('does not warn about replacing the page when creating a new output', async () => {
      await renderPage();

      expect(screen.queryByText(addVersionBanner)).not.toBeInTheDocument();
    });

    it('waits for the manuscript version before rendering the form', async () => {
      await renderPage({
        researchOutputData: {
          ...existingOutput,
          relatedManuscript: 'manuscript-1',
        },
        versionAction: 'create',
        waitForLoad: false,
      });

      await waitFor(() =>
        expect(screen.getByText('Loading...')).toBeInTheDocument(),
      );
      expect(screen.queryByText(/Share a Project/i)).not.toBeInTheDocument();
    });

    it('shows versions from the existing manuscript output when adding a version', async () => {
      const latestManuscriptVersion = createManuscriptVersionResponse();
      await renderPage({
        researchOutputData: {
          ...existingOutput,
          relatedManuscript: 'manuscript-1',
          versions: [
            {
              id: 'version-0',
              title: 'Previous Version',
              documentType: 'Article',
              type: 'Published',
              addedDate: '2024-01-01',
              link: 'http://example.com/v0',
            },
          ],
        },
        versionAction: 'create',
        latestManuscriptVersion,
      });

      expect(screen.getByText(/#1/)).toBeInTheDocument();
      expect(screen.getByText(/#2/)).toBeInTheDocument();
    });
  });

  describe('articles', () => {
    it('asks how to create the output before showing the form', async () => {
      await renderPage({ outputDocumentType: 'article' });

      expect(
        screen.getByText(/How would you like to create your output\?/i),
      ).toBeVisible();
      expect(screen.queryByRole('textbox', { name: /title/i })).toBeNull();
    });

    it('shows the form once the user chooses to create it manually', async () => {
      await renderPage({ outputDocumentType: 'article' });

      await userEvent.click(screen.getByLabelText(/Create manually/i));
      await userEvent.click(screen.getByRole('button', { name: /Create/i }));

      expect(
        screen.getByRole('textbox', { name: /title/i }),
      ).toBeInTheDocument();
    });

    it('goes straight to the form when duplicating', async () => {
      await renderPage({
        outputDocumentType: 'article',
        researchOutputData: { ...existingOutput, documentType: 'Article' },
        isDuplicate: true,
      });

      expect(
        screen.queryByText(/How would you like to create your output\?/i),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('textbox', { name: /title/i }),
      ).toBeInTheDocument();
    });

    it('imports a manuscript and shows the form', async () => {
      mockGetManuscriptVersionSuggestions.mockResolvedValue([
        createManuscriptVersionResponse({
          title: 'Imported Manuscript Version',
          lifecycle: 'Preprint',
        }),
      ]);

      await renderPage({
        outputDocumentType: 'article',
      });

      await userEvent.click(screen.getByLabelText(/Import from compliance/i));
      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'Imported');
      await userEvent.click(
        await screen.findByText('Imported Manuscript Version'),
      );
      await userEvent.click(screen.getByRole('button', { name: /import/i }));

      expect(
        await screen.findByRole('textbox', { name: /title/i }),
      ).toBeInTheDocument();
    });
  });

  describe('permissions', () => {
    const projectWithOtherLead: TraineeProjectDetailType = {
      ...mockProject,
      members: [
        {
          id: 'lead-1',
          displayName: 'Lena Lead',
          role: 'Independent Project - Lead',
        },
        ...(mockProject.members ?? []),
      ],
    };
    const projectWhereUserIsLead: TraineeProjectDetailType = {
      ...mockProject,
      members: [
        {
          id: 'testuserid',
          displayName: 'John Doe',
          role: 'Independent Project - Lead',
        },
      ],
    };

    it('lets a member save a draft and publish when the project has no lead', async () => {
      await renderPage();

      expect(
        screen.getByRole('button', { name: /Save Draft/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^Publish/i }),
      ).toBeInTheDocument();
    });

    it('lets a non-lead member only save a draft when the project has a lead', async () => {
      mockGetProject.mockResolvedValue(projectWithOtherLead);

      await renderPage();

      expect(
        screen.getByRole('button', { name: /Save Draft/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Publish/i })).toBeNull();
    });

    it('lets the project lead publish', async () => {
      mockGetProject.mockResolvedValue(projectWhereUserIsLead);

      await renderPage();

      expect(
        screen.getByRole('button', { name: /^Publish/i }),
      ).toBeInTheDocument();
    });

    it('lets staff publish the output', async () => {
      mockGetProject.mockResolvedValue(projectWithOtherLead);

      await renderPage({ role: 'Staff' });

      expect(
        screen.getByRole('button', { name: /Publish/i }),
      ).toBeInTheDocument();
    });

    it('resolves permissions against the project owning the output', async () => {
      await renderPage();

      expect(mockGetProject).toHaveBeenCalledWith(
        projectId,
        'Bearer access_token',
      );
    });
  });

  describe('form callbacks', () => {
    it('creates a draft when saving a new output', async () => {
      await renderPage({
        researchOutputData: {
          ...editableOutput,
          id: '',
        },
        isDuplicate: true,
      });

      await userEvent.click(
        screen.getByRole('button', { name: /Save Draft/i }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: /Keep and Save/i }),
      );

      await waitFor(() => {
        expect(currentLocation?.pathname).toBe(
          '/shared-research/research-output-id',
        );
      });
      expect(mockCreateResearchOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          teams: [],
          published: false,
        }),
      );
    });

    it('updates a draft when saving an existing output', async () => {
      await renderPage({
        researchOutputData: {
          ...editableOutput,
          isInReview: true,
        },
        versionAction: 'edit',
      });

      await userEvent.click(
        screen.getByRole('button', { name: /Save Draft/i }),
      );

      await waitFor(() => {
        expect(currentLocation?.pathname).toBe(
          '/shared-research/research-output-id',
        );
      });
      expect(mockUpdateResearchOutput).toHaveBeenCalledWith(
        editableOutput.id,
        expect.objectContaining({
          projectId,
          teams: [],
          published: false,
          statusChangedById: 'status-user',
          isInReview: true,
        }),
      );
    });

    it('creates a published output when publishing a new output', async () => {
      await renderPage({
        researchOutputData: {
          ...editableOutput,
          id: '',
          relatedManuscript: 'manuscript-1',
          relatedManuscriptVersion: 'version-1',
          doi: '10.5555/YFRU1371.121212',
        },
        isDuplicate: true,
        role: 'Staff',
      });

      await userEvent.click(screen.getByRole('button', { name: /Publish/i }));
      await userEvent.click(
        screen.getByRole('button', { name: /Keep and publish/i }),
      );

      await waitFor(() => {
        expect(currentLocation?.pathname).toBe(
          '/shared-research/research-output-id',
        );
      });
      expect(mockCreateResearchOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          teams: [],
          published: true,
          relatedManuscript: 'manuscript-1',
          relatedManuscriptVersion: 'version-1',
        }),
      );
    });

    it('keeps the existing related manuscript version when publishing an edit', async () => {
      await renderPage({
        researchOutputData: {
          ...editableOutput,
          relatedManuscript: 'manuscript-1',
          relatedManuscriptVersion: 'existing-version-1',
          doi: '10.5555/YFRU1371.121212',
        },
        versionAction: 'edit',
        role: 'Staff',
      });

      await userEvent.click(screen.getByRole('button', { name: /Publish/i }));
      await userEvent.click(
        await screen.findByRole('button', { name: /Publish Output/i }),
      );

      await waitFor(() => {
        expect(currentLocation?.pathname).toBe(
          '/shared-research/research-output-id',
        );
      });
      expect(mockUpdateResearchOutput).toHaveBeenCalledWith(
        editableOutput.id,
        expect.objectContaining({
          published: true,
          createVersion: false,
          relatedManuscriptVersion: 'existing-version-1',
          statusChangedById: 'status-user',
          isInReview: false,
        }),
      );
    });

    it('creates a version from an imported manuscript version', async () => {
      const latestManuscriptVersion = createManuscriptVersionResponse({
        versionId: 'imported-version-id',
        doi: '10.5555',
        impact: {
          id: 'impact 1',
          name: 'Impact 1',
        },
        categories: [
          {
            id: 'cat-1',
            name: 'Category 1',
          },
        ],
        layImpactStatement: 'Big Impact',
        shortDescription: 'Descript.',
        preprintDate: '2026-08-12',
        publicationDate: '2026-08-13',
        authors: [projectMemberAuthor],
      });
      await renderPage({
        researchOutputData: {
          ...editableOutput,
          documentType: 'Article',
          relatedManuscript: 'manuscript-1',
          authors: [projectMemberAuthor],
        },
        versionAction: 'create',
        latestManuscriptVersion,
        role: 'Staff',
      });

      fireEvent.change(screen.getByRole('textbox', { name: /changelog/i }), {
        target: { value: 'new version' },
      });

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await userEvent.click(
        await screen.findByRole('button', {
          name: /Publish new version/i,
        }),
      );

      await waitFor(() => {
        expect(currentLocation?.pathname).toBe(
          '/shared-research/research-output-id',
        );
      });
      expect(mockUpdateResearchOutput).toHaveBeenCalledWith(
        editableOutput.id,
        expect.objectContaining({
          createVersion: true,
          relatedManuscriptVersion: 'imported-version-id',
          published: true,
        }),
      );
    });
  });
});
