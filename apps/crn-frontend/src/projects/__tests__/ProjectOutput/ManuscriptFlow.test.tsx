import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import {
  createManuscriptVersionResponse,
  createResearchOutputResponse,
  createUserResponse,
} from '@asap-hub/fixtures';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import {
  ManuscriptVersionResponse,
  ResearchOutputResponse,
  UserResponse,
} from '@asap-hub/model';
import {
  network,
  OutputDocumentTypeParameter,
  projects,
  sharedResearch,
} from '@asap-hub/routing';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense, useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import {
  createResearchOutput,
  getManuscriptVersions,
  updateTeamResearchOutput,
} from '../../../network/teams/api';
import { usePostPreprintResearchOutput } from '../../../network/teams/state';
import { getImpacts } from '../../../shared-api/impact';
import { getResearchOutputs } from '../../../shared-research/api';
import ProjectOutput from '../../TeamBasedOutput';

jest.mock('../../../network/teams/api');
jest.mock('../../../network/users/api');
jest.mock('../../../shared-api/impact');
jest.mock('../../../shared-research/api');
jest.mock('../../../shared-api/content-generator');
jest.mock('../../../network/teams/state', () => ({
  ...jest.requireActual('../../../network/teams/state'),
  usePostPreprintResearchOutput: jest.fn(),
}));

const mockGetImpacts = getImpacts as jest.MockedFunction<typeof getImpacts>;
const mockGetManuscriptVersions = getManuscriptVersions as jest.MockedFunction<
  typeof getManuscriptVersions
>;
const mockGetResearchOutputs = getResearchOutputs as jest.MockedFunction<
  typeof getResearchOutputs
>;
const mockCreateResearchOutput = createResearchOutput as jest.MockedFunction<
  typeof createResearchOutput
>;
const mockUpdateResearchOutput =
  updateTeamResearchOutput as jest.MockedFunction<
    typeof updateTeamResearchOutput
  >;
const mockUsePostPreprintResearchOutput =
  usePostPreprintResearchOutput as jest.MockedFunction<
    typeof usePostPreprintResearchOutput
  >;

const TEAM_ID = '42';
const MANUSCRIPT_PILL = 'DA1-000463-003-org-G-1';

let currentLocation: { pathname: string } | null = null;
const LocationCapture = () => {
  const location = useLocation();
  useEffect(() => {
    currentLocation = { pathname: location.pathname };
  }, [location]);
  return null;
};

const teamMember = (
  role: 'Project Manager' | 'Collaborating PI',
  id = TEAM_ID,
): UserResponse => {
  const base = createUserResponse();
  return { ...base, teams: [{ ...base.teams[0]!, id, role }] };
};

const preprintVersion = (
  overrides: Partial<ManuscriptVersionResponse> = {},
): ManuscriptVersionResponse =>
  createManuscriptVersionResponse({
    id: 'mv-manuscript-1',
    manuscriptId: MANUSCRIPT_PILL,
    versionId: 'version-id-1',
    title: 'Manuscript Title',
    lifecycle: 'Preprint',
    teams: [{ id: TEAM_ID, displayName: 'Jakobsson, J' }],
    labs: [{ id: 'lab-1', name: 'Lab One' }],
    publicationDate: '2024-01-01T00:00:00.000Z',
    layImpactStatement: 'Nice impact',
    description: 'Description',
    shortDescription: 'A very short one',
    categories: [{ id: 'cat-1', name: 'Category One' }],
    impact: { id: 'impact-1', name: 'Impact One' },
    ...overrides,
  });

const publicationVersion = (
  overrides: Partial<ManuscriptVersionResponse> = {},
): ManuscriptVersionResponse =>
  preprintVersion({ lifecycle: 'Publication', ...overrides });

const autoCreatedPreprint = (
  overrides: Partial<ResearchOutputResponse> = {},
): ResearchOutputResponse => ({
  ...createResearchOutputResponse(),
  id: 'preprint-output-1',
  title: 'Auto Created Preprint',
  documentType: 'Article',
  teams: [
    { id: TEAM_ID, displayName: 'Jakobsson, J', teamType: 'Discovery Team' },
  ],
  published: true,
  versions: [],
  ...overrides,
});

const manuscriptOutput = (
  overrides: Partial<ResearchOutputResponse> = {},
): ResearchOutputResponse => ({
  ...createResearchOutputResponse(),
  id: 'ro-1',
  title: 'Original Output Title',
  documentType: 'Article',
  relatedManuscript: 'manuscript-1',
  relatedManuscriptVersion: 'version-id-0',
  published: true,
  versions: [],
  teams: [
    { id: TEAM_ID, displayName: 'Jakobsson, J', teamType: 'Discovery Team' },
  ],

  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
  jest.spyOn(console, 'error').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
  currentLocation = null;

  mockGetImpacts.mockResolvedValue({ total: 0, items: [] });
  mockGetManuscriptVersions.mockResolvedValue({
    total: 1,
    items: [preprintVersion()],
  });
  mockUsePostPreprintResearchOutput.mockReturnValue(
    jest.fn().mockResolvedValue(autoCreatedPreprint()),
  );
});

async function renderPage({
  user = teamMember('Project Manager'),
  teamId = TEAM_ID,
  outputDocumentType = 'article' as OutputDocumentTypeParameter,
  researchOutputData,
  versionAction,
  latestManuscriptVersion,
  isDuplicate,
  waitUntilReady = true,
}: {
  user?: UserResponse;
  teamId?: string;
  outputDocumentType?: OutputDocumentTypeParameter;
  researchOutputData?: ResearchOutputResponse;
  versionAction?: 'create' | 'edit';
  latestManuscriptVersion?: ManuscriptVersionResponse;
  isDuplicate?: boolean;
  waitUntilReady?: boolean;
} = {}) {
  const path =
    network.template +
    network({}).teams.template +
    network({}).teams({}).team.template +
    network({}).teams({}).team({ teamId }).createOutput.template;

  const initialPath = network({})
    .teams({})
    .team({ teamId })
    .createOutput({ outputDocumentType }).$;

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={user}>
          <WhenReady>
            <MemoryRouter initialEntries={[initialPath]}>
              <LocationCapture />
              <Routes>
                <Route
                  path={path}
                  element={
                    <ProjectOutput
                      teamId={teamId}
                      researchOutputData={researchOutputData}
                      versionAction={versionAction}
                      latestManuscriptVersion={latestManuscriptVersion}
                      isDuplicate={isDuplicate}
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

  if (waitUntilReady) {
    await waitFor(
      () => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
      { timeout: 10_000 },
    );
  }
}

const clickImport = async (pill = MANUSCRIPT_PILL) => {
  const user = userEvent.setup({ delay: null });
  await user.click(screen.getByLabelText('Import from compliance'));
  await user.type(screen.getByRole('combobox'), 'Manuscript');
  await user.click(await screen.findByText(pill));
  await user.click(screen.getByRole('button', { name: /import/i }));
};

const onTheForm = () => screen.findByText('What are you sharing?');

const findConfirmModalButton = async (name: RegExp) => {
  await screen.findByText(/for the whole hub\?/i);
  return screen.getByRole('button', { name });
};

const versionHistory = () => screen.queryByText('#1');

const fillPublishableFields = async (doi = '10.1234/5678') => {
  fireEvent.change(screen.getByPlaceholderText('e.g. 10.5555/YFRU1371'), {
    target: { value: doi },
  });
};

describe('output selection', () => {
  it('offers importing or creating manually when starting a new article', async () => {
    await renderPage();

    expect(
      screen.getByText('How would you like to create your output?'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Create manually')).toBeInTheDocument();
    expect(screen.getByLabelText('Import from compliance')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'What are you sharing?' }),
    ).not.toBeInTheDocument();
  });

  it.each(['bioinformatics', 'dataset', 'lab-material', 'protocol', 'report'])(
    'skips manuscript selection for %s outputs',
    async (outputDocumentType) => {
      await renderPage({
        outputDocumentType: outputDocumentType as OutputDocumentTypeParameter,
      });

      expect(
        screen.queryByText('How would you like to create your output?'),
      ).not.toBeInTheDocument();
      expect(await onTheForm()).toBeInTheDocument();
    },
  );

  it('skips manuscript selection when editing an existing output', async () => {
    await renderPage({
      researchOutputData: {
        ...autoCreatedPreprint(),
        id: 'ro-1',
      },
    });

    expect(
      screen.queryByText('How would you like to create your output?'),
    ).not.toBeInTheDocument();
    expect(await onTheForm()).toBeInTheDocument();
  });

  it('skips manuscript selection when duplicating an existing output', async () => {
    await renderPage({
      researchOutputData: {
        ...autoCreatedPreprint(),
        id: 'ro-1',
      },
      isDuplicate: true,
    });

    expect(
      screen.queryByText('How would you like to create your output?'),
    ).not.toBeInTheDocument();
    expect(await onTheForm()).toBeInTheDocument();
  });

  it('skips manuscript selection when creating a plain new version', async () => {
    await renderPage({
      researchOutputData: {
        ...autoCreatedPreprint(),
        id: 'ro-1',
      },
      versionAction: 'create',
    });

    expect(
      screen.queryByText('How would you like to create your output?'),
    ).not.toBeInTheDocument();
    expect(await onTheForm()).toBeInTheDocument();
  });

  it('switches from import to manual creation when the user chooses create manually', async () => {
    await renderPage();

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByLabelText('Create manually'));

    const createButton = screen.getByRole('button', { name: /Create/i });
    expect(createButton).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Import/i }),
    ).not.toBeInTheDocument();

    await user.click(createButton);

    expect(await onTheForm()).toBeInTheDocument();
  });

  it('shows the import action only after selecting manuscript import', async () => {
    await renderPage();

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByLabelText('Import from compliance'));

    expect(screen.getByRole('button', { name: /Import/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Create/i }),
    ).not.toBeInTheDocument();
  });

  it('lets the user search and select a manuscript version before importing', async () => {
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [preprintVersion({ id: 'mv-version-one', title: 'Version One' })],
    });

    await renderPage();

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByLabelText('Import from compliance'));
    await user.type(screen.getByRole('combobox'), 'Version One');
    await user.click(await screen.findByText('Version One'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Import/i })).toBeEnabled(),
    );
  });

  it('routes to the existing output instead of creating a second one for the same manuscript', async () => {
    const createPreprint = jest.fn();
    mockUsePostPreprintResearchOutput.mockReturnValue(createPreprint);
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [publicationVersion({ researchOutputId: 'ro-existing' })],
    });

    await renderPage();
    await clickImport();

    await waitFor(() =>
      expect(currentLocation?.pathname).toBe(
        sharedResearch({})
          .researchOutput({ researchOutputId: 'ro-existing' })
          .versionResearchOutput({}).$,
      ),
    );
    expect(createPreprint).not.toHaveBeenCalled();
    expect(mockCreateResearchOutput).not.toHaveBeenCalled();
  });

  it('takes a preprint straight to the form without asking the backend for anything', async () => {
    const createPreprint = jest.fn();
    mockUsePostPreprintResearchOutput.mockReturnValue(createPreprint);
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [preprintVersion()],
    });

    await renderPage();
    await clickImport();

    expect(await onTheForm()).toBeInTheDocument();
    expect(createPreprint).not.toHaveBeenCalled();
    expect(versionHistory()).not.toBeInTheDocument();
  });

  it('strips the record prefix from the manuscript id before asking the backend to create the preprint', async () => {
    const createPreprint = jest.fn().mockResolvedValue(autoCreatedPreprint());
    mockUsePostPreprintResearchOutput.mockReturnValue(createPreprint);
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [publicationVersion({ id: 'mv-manuscript-1' })],
    });

    await renderPage();
    await clickImport();

    await waitFor(() =>
      expect(createPreprint).toHaveBeenCalledWith('manuscript-1'),
    );
  });

  it('shows the auto created preprint as the first version when a publication is imported', async () => {
    mockUsePostPreprintResearchOutput.mockReturnValue(
      jest
        .fn()
        .mockResolvedValue(
          autoCreatedPreprint({ title: 'Auto Created Preprint' }),
        ),
    );
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [publicationVersion()],
    });

    await renderPage();
    await clickImport();

    expect(await onTheForm()).toBeInTheDocument();
    expect(versionHistory()).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /Imported Manuscript Version/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Auto Created Preprint')).toBeInTheDocument();
  });

  it('keeps the user on the selection screen so the import can be retried when the backend fails', async () => {
    mockUsePostPreprintResearchOutput.mockReturnValue(
      jest.fn().mockRejectedValue(new Error('boom')),
    );
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [publicationVersion()],
    });

    await renderPage();
    await clickImport();

    expect(
      await screen.findByText('An error has occurred. Please try again later.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /import/i })).toBeEnabled();
    expect(
      screen.queryByRole('heading', { name: 'What are you sharing?' }),
    ).not.toBeInTheDocument();
  });
});

describe('what reaches the API', () => {
  it('publishes an imported preprint using the manuscript metadata in the payload', async () => {
    const title = 'Version One';
    const versionId = 'version-id-1';
    const doi = '10.1234/5678';
    const authors = [
      {
        displayName: 'First Author',
        email: 'first.author@gmail.com',
        firstName: 'First',
        id: 'first-author-id-1',
        lastName: 'Author',
      },
    ];

    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [
        preprintVersion({
          id: 'mv-manuscript-id-1',
          title,
          type: 'Original Research',
          versionId,
          manuscriptId: 'DA1-000463-002-org-G-1',
          url: 'http://example.com',
          authors,
          categories: [{ id: 'category-id-1', name: 'Methods' }],
          description: 'example42 description',
          shortDescription: 'example42 short description',
          impact: {
            id: 'impact-id-1',
            name: 'New method/model to explore PD mechanism',
          },
          layImpactStatement: 'lay impact statement',
          teams: [{ id: TEAM_ID, displayName: 'Team One' }],
          labs: [{ id: 'l0', name: 'Example 1' }],
          preprintDate: '2024-01-01T00:00:00.000Z',
        }),
      ],
    });

    await renderPage();

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByLabelText('Import from compliance'));
    await user.type(screen.getByRole('combobox'), 'Version');
    await user.click(await screen.findByText('Version One'));
    await user.click(screen.getByRole('button', { name: /Import/i }));

    expect(
      screen.getByRole('heading', { name: /Imported Manuscript Version/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('e.g. 10.5555/YFRU1371'), {
      target: { value: doi },
    });

    await user.click(screen.getByRole('button', { name: /Publish/i }));
    await user.click(await findConfirmModalButton(/Publish Output/i));

    await waitFor(() =>
      expect(mockCreateResearchOutput).toHaveBeenCalledWith(
        {
          documentType: 'Article',
          sharingStatus: 'Public',
          teams: [TEAM_ID],
          link: 'http://example.com',
          title,
          descriptionMD: 'example42 description',
          description: '',
          shortDescription: 'example42 short description',
          changelog: '',
          subtype: 'Original Research',
          type: 'Preprint',
          authors: [{ userId: authors[0]!.id }],
          methods: [],
          labs: ['l0'],
          organisms: [],
          environments: [],
          keywords: [],
          workingGroups: [],
          relatedResearch: [],
          relatedEvents: [],
          labCatalogNumber: undefined,
          publishDate: '2024-01-01T00:00:00.000Z',
          usageNotes: '',
          asapFunded: true,
          usedInPublication: true,
          published: true,
          categories: ['category-id-1'],
          impact: 'impact-id-1',
          layImpactStatement: 'lay impact statement',
          relatedManuscript: 'manuscript-id-1',
          relatedManuscriptVersion: versionId,
          doi,
        },
        expect.anything(),
      ),
    );
  });

  it('publishes an imported publication as a new version of the auto created preprint', async () => {
    mockUsePostPreprintResearchOutput.mockReturnValue(
      jest.fn().mockResolvedValue(autoCreatedPreprint()),
    );
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [publicationVersion({ versionId: 'version-id-1' })],
    });

    await renderPage();
    await clickImport();
    await onTheForm();

    const user = userEvent.setup({ delay: null });
    fireEvent.change(screen.getByRole('textbox', { name: /changelog/i }), {
      target: { value: 'imported the publication' },
    });
    await fillPublishableFields();
    await user.click(screen.getByRole('button', { name: /Publish/i }));
    await user.click(await findConfirmModalButton(/Publish new version/i));

    await waitFor(() =>
      expect(mockUpdateResearchOutput).toHaveBeenCalledWith(
        'preprint-output-1',
        expect.objectContaining({
          published: true,
          createVersion: true,
          relatedManuscriptVersion: 'version-id-1',
        }),
        expect.anything(),
      ),
    );
  });

  it('publishes an imported preprint as a brand new output carrying its manuscript links', async () => {
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [
        preprintVersion({ id: 'mv-manuscript-1', versionId: 'version-id-1' }),
      ],
    });

    await renderPage();
    await clickImport();
    await onTheForm();

    const user = userEvent.setup({ delay: null });
    await fillPublishableFields();
    fireEvent.change(screen.getByLabelText(/date made public/i), {
      target: { value: '2022-03-24' },
    });
    await user.click(screen.getByRole('button', { name: /Publish/i }));
    await user.click(await findConfirmModalButton(/Publish Output/i));

    await waitFor(() =>
      expect(mockCreateResearchOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          published: true,
          relatedManuscript: 'manuscript-1',
          relatedManuscriptVersion: 'version-id-1',
        }),
        expect.anything(),
      ),
    );
    expect(mockUpdateResearchOutput).not.toHaveBeenCalled();
  });

  it('keeps the user on the form when the server rejects the payload', async () => {
    mockCreateResearchOutput.mockRejectedValueOnce(new Error('server said no'));
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      // Preprints take their date made public from preprintDate, which is
      // required to publish: without it the form never reaches the server.
      items: [preprintVersion({ preprintDate: '2024-01-01T00:00:00.000Z' })],
    });

    await renderPage();
    await clickImport();
    await onTheForm();
    await fillPublishableFields();
    const user = userEvent.setup({ delay: null });

    await user.click(screen.getByRole('button', { name: /Publish/i }));
    await user.click(await findConfirmModalButton(/Publish Output/i));

    expect(
      screen.getByRole('heading', { name: 'What are you sharing?' }),
    ).toBeInTheDocument();
  });
});

describe('data wired into the page', () => {
  it('derives permissions from the teams on the imported manuscript, not only from the team in the url', async () => {
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [
        preprintVersion({
          teams: [
            { id: TEAM_ID, displayName: 'Team From URL' },
            {
              id: 'not-the-team-from-url',
              displayName: 'Not the Team From URL',
            },
          ],
        }),
      ],
    });

    await renderPage({
      user: teamMember('Collaborating PI', 'not-the-team-from-url'),
    });
    await clickImport();
    await onTheForm();

    expect(
      screen.getByRole('button', { name: /Publish/i }),
    ).toBeInTheDocument();
  });

  it('does not offer the newly created output as related research for itself', async () => {
    mockUsePostPreprintResearchOutput.mockReturnValue(
      jest
        .fn()
        .mockResolvedValue(autoCreatedPreprint({ id: 'preprint-output-1' })),
    );
    mockGetManuscriptVersions.mockResolvedValue({
      total: 1,
      items: [publicationVersion()],
    });
    mockGetResearchOutputs.mockResolvedValue({
      hits: [
        {
          id: 'preprint-output-1',
          title: 'Auto Created Preprint',
          type: 'Preprint',
          documentType: 'Article',
        },
        {
          id: 'some-other-output',
          title: 'An Unrelated Output',
          type: 'Preprint',
          documentType: 'Article',
        },
      ],
    } as never);

    await renderPage();
    await clickImport();
    await onTheForm();

    const user = userEvent.setup({ delay: null });
    await user.click(
      screen.getByRole('combobox', { name: /Related Outputs/i }),
    );

    await screen.findByText(/An Unrelated Output/i);
    expect(
      screen.getByRole('option', { name: /An Unrelated Output/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /Auto Created Preprint/i }),
    ).not.toBeInTheDocument();
  }, 60_000);
});

describe('adding a version to an output that tracks a manuscript', () => {
  it("shows the breadcrumbs to the original output team's project", async () => {
    await renderPage({
      researchOutputData: manuscriptOutput({
        teams: [
          {
            id: TEAM_ID,
            displayName: 'Jakobsson, J',
            teamType: 'Discovery Team',
            project: {
              id: 'project-1',
              title: 'Team Project',
              projectType: 'Discovery Project',
              projectId: 'DP1',
            },
          },
        ],
      }),
      versionAction: 'create',
      latestManuscriptVersion: preprintVersion({ lifecycle: 'Publication' }),
    });

    await onTheForm();

    expect(screen.getByRole('link', { name: 'Team Project' })).toHaveAttribute(
      'href',
      projects({})
        .discoveryProjects({})
        .discoveryProject({ projectId: 'project-1' })
        .about({}).$,
    );
  });

  it('waits for the manuscript version before rendering the form', async () => {
    await renderPage({
      researchOutputData: manuscriptOutput(),
      versionAction: 'create',
      latestManuscriptVersion: undefined,
      waitUntilReady: false,
    });

    expect(await screen.findByText('Loading...')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'What are you sharing?' }),
    ).not.toBeInTheDocument();
  });

  it('describes the newest history entry with the current output, not with the manuscript replacing it', async () => {
    await renderPage({
      researchOutputData: manuscriptOutput({ title: 'Original Output Title' }),
      versionAction: 'create',
      latestManuscriptVersion: preprintVersion({
        title: 'Manuscript Title',
        lifecycle: 'Publication',
      }),
    });

    await onTheForm();

    expect(screen.getByText('Original Output Title')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue(
      'Manuscript Title',
    );
  });

  it('publishes the latest manuscript version as a new version of the existing output', async () => {
    await renderPage({
      researchOutputData: manuscriptOutput(),
      versionAction: 'create',
      latestManuscriptVersion: preprintVersion({
        versionId: 'version-id-1',
        lifecycle: 'Publication',
        publicationDate: '2024-01-01T00:00:00.000Z',
        impact: { id: 'impact-id-1', name: 'Impact 1' },
        layImpactStatement: 'version impact statement',
        categories: [{ id: 'category-id-1', name: 'Category 1' }],
        description: 'version description',
        shortDescription: 'version short description',
        doi: '10.0777',
        teams: [{ id: TEAM_ID, displayName: 'Test Team' }],
        labs: [{ id: 'l0', name: 'Example 1' }],
      }),
    });

    const user = userEvent.setup({ delay: null });
    fireEvent.change(screen.getByRole('textbox', { name: /changelog/i }), {
      target: { value: 'importing new version' },
    });
    await user.click(screen.getByRole('button', { name: /Save/i }));
    await user.click(await findConfirmModalButton(/Publish new version/i));

    await waitFor(() =>
      expect(mockUpdateResearchOutput).toHaveBeenCalledWith(
        'ro-1',
        expect.objectContaining({
          changelog: 'importing new version',
          relatedManuscriptVersion: 'version-id-1',
          createVersion: true,
          type: 'Published',
          documentType: 'Article',
        }),
        expect.anything(),
      ),
    );
  });
});
