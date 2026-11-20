import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import {
  createResearchOutputResponse,
  createUserResponse,
} from '@asap-hub/fixtures';
import { BackendError, createTestQueryClient } from '@asap-hub/frontend-utils';
import {
  ManuscriptVersionResponse,
  ResearchOutputResponse,
  UserResponse,
  ValidationErrorResponse,
} from '@asap-hub/model';
import {
  network,
  OutputDocumentTypeParameter,
  projects,
} from '@asap-hub/routing';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { editorRef } from '@asap-hub/react-components';
import { ComponentProps, Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { getGeneratedShortDescription } from '../../../shared-api/content-generator';
import {
  createResearchOutput,
  getTeam,
  updateTeamResearchOutput,
} from '../../../network/teams/api';
import { getImpacts } from '../../../shared-api/impact';
import TeamOutput from '../../TeamBasedOutput';

jest.setTimeout(60000);
jest.mock('../../../network/teams/api');
jest.mock('../../../network/users/api');
jest.mock('../../../shared-api/impact');
jest.mock('../../../shared-research/api');
jest.mock('../../../shared-api/content-generator');

beforeEach(() => {
  window.scrollTo = jest.fn();
  // TODO: fix act error
  jest.spyOn(console, 'error').mockImplementation();
});

const baseUser = createUserResponse();
const baseResearchOutput: ResearchOutputResponse = {
  ...createResearchOutputResponse(),
  teams: [
    {
      id: '42',
      displayName: 'Jakobsson, J',
      teamType: 'Discovery Team',
    },
  ],
  labs: [{ id: 'l0', name: 'Example 1' }],
};

const findConfirmModalButton = async (name: RegExp) => {
  await screen.findByText(/for the whole hub\?/i);
  return screen.getByRole('button', { name });
};

const mandatoryFields = async (
  {
    link = 'http://example.com',
    title = 'example title',
    descriptionMD = 'example description',
    shortDescription = 'example short description',
    type = 'Preprint',
    doi = '10.1234',
  }: {
    link?: string;
    title?: string;
    descriptionMD?: string;
    shortDescription?: string;
    type?: string;
    doi?: string;
  },
  isLinkRequired: boolean = false,
  isEditMode: boolean = false,
  published: boolean = true,
  user = userEvent.setup({ delay: null }),
) => {
  const url = isLinkRequired ? /url \(required\)/i : /url \(optional\)/i;

  if (link) {
    fireEvent.change(screen.getByRole('textbox', { name: url }), {
      target: { value: link },
    });
  }
  if (title) {
    fireEvent.change(screen.getByRole('textbox', { name: /title/i }), {
      target: { value: title },
    });
  }

  await waitFor(() => expect(editorRef.current).not.toBeNull());

  if (descriptionMD) {
    editorRef.current?.focus();

    const descriptionEditor = screen.getByTestId('editor');
    await user.click(descriptionEditor);
    await user.keyboard('{Tab}');
    fireEvent.input(descriptionEditor, { data: descriptionMD });
    await user.keyboard('{Tab}');
  }

  if (shortDescription) {
    fireEvent.change(
      screen.getByRole('textbox', { name: /short description/i }),
      { target: { value: shortDescription } },
    );
  }

  const typeInput = screen.getByRole('combobox', { name: /Select the type/i });
  await user.type(typeInput, type);
  await user.keyboard('{Enter}');

  const identifier = screen.getByRole('combobox', { name: /identifier/i });
  await user.type(identifier, 'DOI');
  await user.keyboard('{Enter}');
  fireEvent.change(screen.getByPlaceholderText('e.g. 10.5555/YFRU1371'), {
    target: { value: doi },
  });
  return {
    publish: async () => {
      if (isEditMode && published) {
        const button = screen.getByRole('button', { name: /Save/i });
        await user.click(button);
        await waitFor(() => {
          expect(button).not.toBeInTheDocument(); // asserts navigation happened
        });
      } else {
        await user.click(screen.getByRole('button', { name: /Publish/i }));
        const button = await findConfirmModalButton(/Publish Output/i);
        await user.click(button);
        await waitFor(() => {
          expect(button).not.toBeInTheDocument();
        });
      }
    },
    saveDraft: async () => {
      const saveDraftButton = screen.queryByRole('button', {
        name: /Save Draft/i,
      });
      if (saveDraftButton) {
        await user.click(saveDraftButton);
        await waitFor(() => {
          expect(saveDraftButton).not.toBeInTheDocument(); // asserts navigation happened
        });
      }
    },
    // Confirms publish for forms with errors
    clickPublish: async () => {
      if (isEditMode && published) {
        const button = screen.getByRole('button', { name: /Save/i });
        await user.click(button);
        await waitFor(() => {
          expect(button).toBeEnabled();
        });
      } else {
        await user.click(screen.getByRole('button', { name: /Publish/i }));
        const button = await findConfirmModalButton(/Publish Output/i);
        await user.click(button);
        await waitFor(() => {
          expect(button).toBeEnabled(); // asserts user's still in the form
        });
      }
    },
  };
};

const mockCreateResearchOutput = createResearchOutput as jest.MockedFunction<
  typeof createResearchOutput
>;

const mockGetTeam = getTeam as jest.MockedFunction<typeof getTeam>;

const mockUpdateResearchOutput =
  updateTeamResearchOutput as jest.MockedFunction<
    typeof updateTeamResearchOutput
  >;

const mockGetGeneratedShortDescription =
  getGeneratedShortDescription as jest.MockedFunction<
    typeof getGeneratedShortDescription
  >;

const mockGetImpacts = getImpacts as jest.MockedFunction<typeof getImpacts>;

interface RenderPageOptions {
  user?: UserResponse;
  teamId: string;
  versionAction?: 'create' | 'edit';
  outputDocumentType?: OutputDocumentTypeParameter;
  researchOutputData?: ResearchOutputResponse;
  latestManuscriptVersion?: ManuscriptVersionResponse;
  isDuplicate?: boolean;
  project?: ComponentProps<typeof TeamOutput>['project'];
}

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation();
  mockGetImpacts.mockResolvedValue({
    total: 0,
    items: [],
  });
});

it('Renders the research output', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'bioinformatics',
  });

  expect(
    screen.getByRole('heading', { name: /Share Team Bioinformatics/i }),
  ).toBeInTheDocument();
});

it('does not render breadcrumbs for a team output without a project', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'bioinformatics',
  });

  expect(
    screen.queryByRole('navigation', { name: 'breadcrumbs' }),
  ).not.toBeInTheDocument();
});

it('renders the breadcrumbs to the project the output is shared from', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'article',
    project: {
      id: 'project-1',
      title: 'Workspace Project',
      projectType: 'Discovery Project',
    },
  });

  expect(
    screen.getByRole('heading', { name: /Share a Project Article/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Discovery Projects' }),
  ).toHaveAttribute('href', projects({}).discoveryProjects({}).$);
  expect(
    screen.getByRole('link', { name: 'Workspace Project' }),
  ).toHaveAttribute(
    'href',
    projects({})
      .discoveryProjects({})
      .discoveryProject({ projectId: 'project-1' })
      .about({}).$,
  );
  expect(screen.getByText('Share an Article')).toHaveAttribute(
    'aria-current',
    'page',
  );
});

it("renders the breadcrumbs to the output team's project when editing", async () => {
  await renderPage({
    teamId: '42',
    researchOutputData: {
      ...baseResearchOutput,
      documentType: 'Protocol',
      teams: [
        {
          id: '42',
          displayName: 'Jakobsson, J',
          teamType: 'Discovery Team',
          project: {
            id: 'project-2',
            title: 'Team Project',
            projectType: 'Resource Project',
            projectId: 'RP2',
          },
        },
      ],
    },
    versionAction: 'edit',
  });

  expect(
    screen.getByRole('link', { name: 'Resource Projects' }),
  ).toHaveAttribute('href', projects({}).resourceProjects({}).$);
  expect(screen.getByRole('link', { name: 'Team Project' })).toHaveAttribute(
    'href',
    projects({})
      .resourceProjects({})
      .resourceProject({ projectId: 'project-2' })
      .about({}).$,
  );
  expect(screen.getByText('Share a Protocol')).toHaveAttribute(
    'aria-current',
    'page',
  );
});

it('Shows the not found page if the team does not exist', async () => {
  mockGetTeam.mockResolvedValueOnce(undefined);
  await renderPage({
    teamId: '42',
    outputDocumentType: 'bioinformatics',
  });
  expect(screen.getByText(/Sorry.+page/i)).toBeVisible();
});

it('displays the publish button for new research outputs', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'bioinformatics',
  });

  expect(screen.getByRole('button', { name: /Publish/i })).toBeInTheDocument();
});

it('displays the save button for existing research outputs', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'bioinformatics',
    researchOutputData: baseResearchOutput,
    versionAction: 'edit',
  });

  expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
});

it('displays the research output with one version in create mode', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'bioinformatics',
    researchOutputData: baseResearchOutput,
    versionAction: 'create',
  });

  expect(screen.getByText(/#1/i)).toBeInTheDocument();
});

it('displays the research output with no version in edit mode', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'bioinformatics',
    researchOutputData: baseResearchOutput,
    versionAction: 'edit',
  });

  expect(screen.queryByText(/#1/i)).not.toBeInTheDocument();
});

it('switches research output type based on parameter', async () => {
  await renderPage({ teamId: '42', outputDocumentType: 'article' });

  expect(
    screen.getByRole('heading', { name: /Share a Team Article/i }),
  ).toBeInTheDocument();
});

it('generates the short description based on the current description', async () => {
  mockGetGeneratedShortDescription.mockResolvedValueOnce({
    shortDescription: 'test generated short description 1',
  });

  await renderPage({
    teamId: '42',
    outputDocumentType: 'bioinformatics',
    researchOutputData: {
      ...baseResearchOutput,
      descriptionMD: 'output description',
    },
  });

  const user = userEvent.setup({ delay: null });
  await user.click(screen.getByRole('button', { name: /Generate/i }));

  await waitFor(() => {
    expect(
      screen.getByRole('textbox', { name: /short description/i }),
    ).toHaveValue('test generated short description 1');
  });
});

it('will show server side validation error for link', async () => {
  const validationResponse: ValidationErrorResponse = {
    message: 'Validation error',
    error: 'Bad Request',
    statusCode: 400,
    data: [
      { instancePath: '/link', keyword: '', params: {}, schemaPath: 'link' },
    ],
  };

  mockCreateResearchOutput.mockRejectedValue(
    new BackendError('example', validationResponse, 400),
  );

  await renderPage({
    teamId: '42',
    outputDocumentType: 'bioinformatics',
  });
  const user = userEvent.setup({ delay: null });
  const { publish } = await mandatoryFields(
    { type: 'Code' },
    true,
    false,
    true,
    user,
  );

  await user.click(screen.getByRole('combobox', { name: /Labs/i }));
  await user.click(
    await screen.findByText('Example 1 Lab', {}, { timeout: 5000 }),
  );

  await publish();

  expect(mockCreateResearchOutput).toHaveBeenCalled();
  await waitFor(() => {
    expect(
      screen.queryAllByText(
        'A Research Output with this URL already exists. Please enter a different URL.',
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  const url = screen.getByRole('textbox', { name: /URL \(required\)/i });
  await user.clear(url);
  await user.type(url, 'a');
  await user.keyboard('{Tab}');

  await waitFor(
    () => {
      expect(
        screen.queryByText(
          'A Research Output with this URL already exists. Please enter a different URL.',
        ),
      ).toBeNull();
    },
    { timeout: 3000 },
  );
}, 100000);

it('will toast server side errors for unknown errors', async () => {
  mockCreateResearchOutput.mockRejectedValue(new Error('Something went wrong'));

  await renderPage({
    teamId: '42',
    outputDocumentType: 'bioinformatics',
  });
  const user = userEvent.setup({ delay: null });
  const { publish } = await mandatoryFields(
    { type: 'Code' },
    true,
    false,
    true,
    user,
  );

  await user.click(screen.getByRole('combobox', { name: /Labs/i }));
  await user.click(
    await screen.findByText('Example 1 Lab', {}, { timeout: 5000 }),
  );

  await publish();

  expect(mockCreateResearchOutput).toHaveBeenCalled();
  expect(
    screen.queryByText(
      'There was an error and we were unable to save your changes. Please try again.',
    ),
  ).toBeInTheDocument();
  expect(window.scrollTo).toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: /Close/i }));

  expect(
    screen.queryByText(
      'There was an error and we were unable to save your changes. Please try again.',
    ),
  ).not.toBeInTheDocument();
}, 100000);

it('will toast server side errors for unknown errors in edit mode', async () => {
  const link = 'https://example42.com';
  const title = 'example42 title';
  const descriptionMD = 'example42 description';
  const type = 'Animal Model';
  const doi = '10.0777';
  mockUpdateResearchOutput.mockRejectedValue(new Error('Something went wrong'));

  await renderPage({
    teamId: '42',
    outputDocumentType: 'article',
    researchOutputData: { ...baseResearchOutput, doi },
    versionAction: 'edit',
  });

  const user = userEvent.setup({ delay: null });
  const { clickPublish } = await mandatoryFields(
    {
      link,
      title,
      descriptionMD,
      type,
      doi,
    },
    true,
    true,
    true,
    user,
  );
  await clickPublish();

  expect(mockUpdateResearchOutput).toHaveBeenCalled();
  expect(
    screen.queryByText(
      'There was an error and we were unable to save your changes. Please try again.',
    ),
  ).toBeInTheDocument();
  expect(window.scrollTo).toHaveBeenCalled();
}, 100000);

it('display a toast warning when creating a new version', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'article',
    researchOutputData: baseResearchOutput,
    versionAction: 'create',
  });

  expect(
    screen.queryByText(
      'The previous output page will be replaced with a summarised version history section.',
    ),
  ).toBeInTheDocument();
});

it('renders an empty changelog input field when creating a new version of a research output', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'article',
    researchOutputData: baseResearchOutput,
    versionAction: 'create',
  });

  expect(screen.getByRole('textbox', { name: /changelog/i })).toHaveValue('');
});

it('shows changelog input with existing data when editing a versioned research output', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'article',
    researchOutputData: {
      ...baseResearchOutput,
      changelog: 'example changelog',
      versions: [
        {
          documentType: 'Article',
          title: 'test title',
          id: '1',
        },
      ],
    },
    versionAction: 'edit',
  });

  expect(screen.getByRole('textbox', { name: /changelog/i })).toHaveValue(
    'example changelog',
  );
});

it('hides changelog input when editing a research output with no version history', async () => {
  await renderPage({
    teamId: '42',
    outputDocumentType: 'article',
    researchOutputData: {
      ...baseResearchOutput,
      versions: [],
    },
    versionAction: 'edit',
  });

  expect(
    screen.queryByRole('textbox', { name: /changelog/i }),
  ).not.toBeInTheDocument();
});

async function renderPage({
  user = {
    ...baseUser,
    teams: [{ ...baseUser.teams[0]!, id: '42', role: 'Project Manager' }],
  },
  teamId,
  outputDocumentType = 'bioinformatics',
  researchOutputData,
  versionAction,
  latestManuscriptVersion,
  isDuplicate,
  project,
}: RenderPageOptions) {
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
              <Routes>
                <Route
                  path={path}
                  element={
                    <TeamOutput
                      teamId={teamId}
                      researchOutputData={researchOutputData}
                      versionAction={versionAction}
                      latestManuscriptVersion={latestManuscriptVersion}
                      isDuplicate={isDuplicate}
                      project={project}
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
  await waitFor(
    () => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
    { timeout: 30_000 },
  );
}
