import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import {
  createResearchOutputResponse,
  createUserResponse,
  createWorkingGroupResponse,
} from '@asap-hub/fixtures';
import { BackendError, createTestQueryClient } from '@asap-hub/frontend-utils';
import {
  ResearchOutputResponse,
  UserResponse,
  ValidationErrorResponse,
} from '@asap-hub/model';
import { editorRef } from '@asap-hub/react-components';
import { network, OutputDocumentTypeParameter } from '@asap-hub/routing';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense, useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createResearchOutput,
  updateTeamResearchOutput,
} from '../../teams/api';
import { getWorkingGroup } from '../api';
import { getImpacts } from '../../../shared-api/impact';
import WorkingGroupOutput from '../WorkingGroupOutput';

jest.setTimeout(30000);
jest.mock('../api');
jest.mock('../../teams/api');
jest.mock('../../users/api');
jest.mock('../../../shared-research/api');
jest.mock('../../../shared-api/impact');

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

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  currentLocation = null;
  window.scrollTo = jest.fn();
  // TODO: fix act error
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  jest.clearAllTimers();
});

const mockCreateResearchOutput = createResearchOutput as jest.MockedFunction<
  typeof createResearchOutput
>;

const mockUpdateResearchOutput =
  updateTeamResearchOutput as jest.MockedFunction<
    typeof updateTeamResearchOutput
  >;

const mockGetWorkingGroup = getWorkingGroup as jest.MockedFunction<
  typeof getWorkingGroup
>;

const mockGetImpacts = getImpacts as jest.MockedFunction<typeof getImpacts>;

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
  isLinkRequired: boolean = true,
  user = userEvent.setup({ delay: null }),
) => {
  const url = isLinkRequired ? /url \(required\)/i : /url \(optional\)/i;

  fireEvent.change(screen.getByRole('textbox', { name: url }), {
    target: { value: link },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /title/i }), {
    target: { value: title },
  });

  await waitFor(() => expect(editorRef.current).not.toBeNull());
  editorRef.current?.focus();

  const descriptionEditor = screen.getByTestId('editor');
  await user.click(descriptionEditor);
  await user.keyboard('{Tab}');
  fireEvent.input(descriptionEditor, { data: descriptionMD });
  await user.keyboard('{Tab}');

  fireEvent.change(
    screen.getByRole('textbox', { name: /short description/i }),
    { target: { value: shortDescription } },
  );

  const typeInput = screen.getByRole('combobox', {
    name: /Select the type/i,
  });
  await user.click(typeInput);
  await user.click(screen.getByText(type));

  const identifier = screen.getByRole('combobox', { name: /identifier/i });
  await user.click(identifier);
  await user.click(screen.getByText('DOI'));
  fireEvent.change(screen.getByPlaceholderText('e.g. 10.5555/YFRU1371'), {
    target: { value: doi },
  });
  await user.click(screen.getByRole('combobox', { name: /Authors/i }));
  await user.click(
    await screen.findByText('Person A 3', {}, { timeout: 5000 }),
  );

  await user.click(
    screen.getByRole('combobox', { name: /Teams \(required\) /i }),
  );
  await user.click(
    await screen.findByText('Abu-Remaileh, M 1', {}, { timeout: 5000 }),
  );

  await user.click(screen.getByRole('combobox', { name: /Labs/i }));
  await user.click(
    await screen.findByText('Example 1 Lab', {}, { timeout: 5000 }),
  );

  return {
    publish: async () => {
      const button = screen.getByRole('button', { name: /Publish/i });
      await user.click(button);
      await user.click(await findConfirmModalButton(/Publish Output/i));
      await waitFor(
        () => {
          expect(button).not.toBeInTheDocument(); // asserts navigation happened
        },
        { interval: 50 },
      );
    },
    saveDraft: async () => {
      const saveDraftButton = screen.getByRole('button', {
        name: /Save Draft/i,
      });
      await user.click(saveDraftButton);
      await waitFor(
        () => {
          expect(saveDraftButton).not.toBeInTheDocument(); // asserts navigation happened
        },
        { interval: 50 },
      );
    },
    updatePublished: async () => {
      const updatePublishedButton = screen.getByRole('button', {
        name: /Save/i,
      });
      await user.click(updatePublishedButton);
      await waitFor(
        () => {
          expect(updatePublishedButton).not.toBeInTheDocument(); // asserts navigation happened
        },
        { interval: 50 },
      );
    },
    // For forms with errors: confirm publication but wait for Publish button to be re-enabled.
    clickPublish: async () => {
      const button = screen.getByRole('button', { name: /Publish/i });
      await user.click(button);
      await user.click(await findConfirmModalButton(/Publish Output/i));
      await waitFor(
        () => {
          expect(button).toBeEnabled();
        },
        { interval: 50 },
      );
    },
  };
};

const baseUser = createUserResponse();
const renderPage = async ({
  user = {
    ...baseUser,
    workingGroups: [
      {
        ...baseUser.workingGroups[0]!,
        id: 'wg1',
        role: 'Project Manager',
        active: true,
      },
    ],
  },
  workingGroupId = 'wg1',
  versionAction = undefined,
  outputDocumentType = 'article',
  researchOutputData,
  initialEntries = [
    network({})
      .workingGroups({})
      .workingGroup({ workingGroupId })
      .createOutput({ outputDocumentType }).$,
  ],
}: {
  user?: UserResponse;
  workingGroupId?: string;
  outputDocumentType?: OutputDocumentTypeParameter;
  canEditResearchOutput?: boolean;
  researchOutputData?: ResearchOutputResponse;
  initialEntries?: string[];
  versionAction?: 'create' | 'edit';
} = {}) => {
  const path =
    network.template +
    network({}).workingGroups.template +
    network({}).workingGroups({}).workingGroup.template +
    network({}).workingGroups({}).workingGroup({ workingGroupId }).createOutput
      .template;

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={user}>
          <WhenReady>
            <MemoryRouter initialEntries={initialEntries}>
              <LocationCapture />
              <Routes>
                <Route
                  path={path}
                  element={
                    <WorkingGroupOutput
                      workingGroupId={workingGroupId}
                      researchOutputData={researchOutputData}
                      versionAction={versionAction}
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
  await waitFor(
    () => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
    { timeout: 30_000 },
  );
};

beforeEach(() => {
  currentLocation = null;
  mockGetImpacts.mockResolvedValue({
    total: 0,
    items: [],
  });
});

it('Renders the working group research output form with relevant fields', async () => {
  await renderPage({
    outputDocumentType: 'article',
  });

  expect(
    screen.getByRole('heading', { name: /Share a Working Group Article/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('combobox', { name: /Authors \(required\)/i }),
  ).toBeVisible();
  expect(
    screen.getByText(/Add an abstract or a summary that describes this work./i),
  ).toBeVisible();
});

it('renders the breadcrumbs back to the working group', async () => {
  mockGetWorkingGroup.mockResolvedValueOnce({
    ...createWorkingGroupResponse({}),
    id: 'wg1',
    title: 'Example Working Group',
  });
  await renderPage({ outputDocumentType: 'report' });

  expect(screen.getByRole('link', { name: 'Working Groups' })).toHaveAttribute(
    'href',
    network({}).workingGroups({}).$,
  );
  expect(
    screen.getByRole('link', { name: 'Example Working Group' }),
  ).toHaveAttribute(
    'href',
    network({})
      .workingGroups({})
      .workingGroup({ workingGroupId: 'wg1' })
      .about({}).$,
  );
  expect(screen.getByText('Share a CRN Report')).toHaveAttribute(
    'aria-current',
    'page',
  );
});

it('displays the research output with one version in create mode', async () => {
  await renderPage({
    outputDocumentType: 'article',
    versionAction: 'create',
    researchOutputData: createResearchOutputResponse(),
  });

  expect(screen.getByText(/#1/i)).toBeInTheDocument();
});

it('displays the research output with no version in edit mode', async () => {
  await renderPage({
    outputDocumentType: 'article',
    versionAction: 'edit',
    researchOutputData: createResearchOutputResponse(),
  });

  expect(screen.queryByText(/#1/i)).not.toBeInTheDocument();
});

it('shows the sorry not found page when the working group does not exist', async () => {
  mockGetWorkingGroup.mockResolvedValueOnce(undefined);
  await renderPage({
    outputDocumentType: 'article',
  });
  expect(screen.getByText(/sorry.+page/i)).toBeVisible();
});
it('can submit a form when form data is valid', async () => {
  // Override default mock for this test
  mockCreateResearchOutput.mockResolvedValue({
    ...createResearchOutputResponse(),
    id: 'research-output-id',
    published: true,
  });

  const user = userEvent.setup({ delay: null });
  const workingGroupId = 'wg1';
  const link = 'https://example42.com';
  const title = 'example42 title';
  const descriptionMD = 'example42 description';
  const shortDescription = 'example42 short description';
  const type = 'Code';
  const doi = '10.0777';
  const outputDocumentType = 'bioinformatics';

  await renderPage({
    workingGroupId,
    outputDocumentType,
    initialEntries: [
      network({})
        .workingGroups({})
        .workingGroup({ workingGroupId })
        .createOutput({ outputDocumentType }).$,
    ],
  });

  const { publish } = await mandatoryFields(
    {
      link,
      title,
      descriptionMD,
      shortDescription,
      type,
      doi,
    },
    true,
    user,
  );

  await publish();

  expect(mockCreateResearchOutput).toHaveBeenCalledWith(
    {
      doi,
      documentType: 'Bioinformatics',
      sharingStatus: 'Network Only',
      teams: ['t0'],
      link,
      title,
      descriptionMD,
      shortDescription,
      changelog: '',
      description: '',
      type,
      labs: ['l0'],
      authors: [
        {
          userId: 'user-id-2',
        },
      ],
      relatedResearch: [],
      relatedEvents: [],
      methods: [],
      organisms: [],
      environments: [],
      keywords: [],
      workingGroups: ['wg1'],
      publishDate: undefined,
      subtype: undefined,
      usageNotes: '',
      asapFunded: undefined,
      usedInPublication: undefined,
      published: true,
      categories: [],
      impact: '',
      layImpactStatement: '',
    },
    expect.anything(),
  );
  await waitFor(
    () => {
      expect(currentLocation?.pathname).toBe(
        '/shared-research/research-output-id',
      );
      expect(currentLocation?.state).toEqual({ toast: 'published' });
    },
    { interval: 50 },
  );
}, 120_000);

it('can save draft when form data is valid', async () => {
  const user = userEvent.setup({ delay: null });
  const workingGroupId = 'wg1';
  const link = 'https://example42.com';
  const title = 'example42 title';
  const descriptionMD = 'example42 description';
  const shortDescription = 'example42 short description';
  const type = 'Code';
  const doi = '10.0777';
  const outputDocumentType = 'bioinformatics';

  await renderPage({
    workingGroupId,
    outputDocumentType,
    initialEntries: [
      network({})
        .workingGroups({})
        .workingGroup({ workingGroupId })
        .createOutput({ outputDocumentType }).$,
    ],
  });

  const { saveDraft } = await mandatoryFields(
    {
      link,
      title,
      descriptionMD,
      shortDescription,
      type,
      doi,
    },
    true,
    user,
  );

  await saveDraft();

  expect(mockCreateResearchOutput).toHaveBeenCalledWith(
    {
      doi,
      documentType: 'Bioinformatics',
      sharingStatus: 'Network Only',
      teams: ['t0'],
      link,
      title,
      descriptionMD,
      shortDescription,
      changelog: '',
      description: '',
      type,
      labs: ['l0'],
      authors: [
        {
          userId: 'user-id-2',
        },
      ],
      methods: [],
      organisms: [],
      environments: [],
      keywords: [],
      relatedResearch: [],
      relatedEvents: [],
      workingGroups: ['wg1'],
      publishDate: undefined,
      subtype: undefined,
      usageNotes: '',
      asapFunded: undefined,
      usedInPublication: undefined,
      published: false,
      categories: [],
      impact: '',
      layImpactStatement: '',
    },
    expect.anything(),
  );
  await waitFor(
    () => {
      expect(currentLocation?.pathname).toBe(
        '/shared-research/research-output-id',
      );
    },
    { interval: 50 },
  );
}, 120_000);

it('can publish a new version for an output', async () => {
  const user = userEvent.setup({ delay: null });
  const baseResearchOutput = createResearchOutputResponse();
  const { descriptionMD, title, shortDescription } = baseResearchOutput;
  const link = 'https://example42.com';
  const doi = '10.0777';
  const changelog = 'creating new version';

  await renderPage({
    versionAction: 'create',
    researchOutputData: { ...baseResearchOutput, documentType: 'Article' },
  });

  await mandatoryFields(
    {
      link,
      title,
      descriptionMD: '',
      shortDescription,
      type: 'Preprint',
      doi,
    },
    true,
    user,
  );

  fireEvent.change(screen.getByRole('textbox', { name: /changelog/i }), {
    target: { value: changelog },
  });

  await user.click(screen.getByRole('button', { name: /Save/i }));
  const button = await findConfirmModalButton(/Publish new version/i);
  await user.click(button);

  await waitFor(
    () => {
      expect(mockUpdateResearchOutput).toHaveBeenCalledWith(
        baseResearchOutput.id,
        expect.objectContaining({
          changelog,
          relatedManuscriptVersion: undefined,
          descriptionMD,
          doi,
          link,
          createVersion: true,
          type: 'Preprint',
          documentType: 'Article',
        }),
        expect.anything(),
      );
    },
    { interval: 50 },
  );
}, 120_000);

it('will show server side validation error for link', async () => {
  const user = userEvent.setup({ delay: null });
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
    outputDocumentType: 'bioinformatics',
  });
  const { clickPublish } = await mandatoryFields({ type: 'Code' }, true, user);

  await clickPublish();

  expect(mockCreateResearchOutput).toHaveBeenCalled();
  // Supported server validation errors land on the field they belong to, so
  // the form error toast is shown instead of the generic save error one.
  await waitFor(() => {
    expect(
      screen.getByText(
        'A Research Output with this URL already exists. Please enter a different URL.',
      ),
    ).toBeInTheDocument();
  });
  expect(
    screen.getByText(
      'There are some errors in the form. Please correct the fields below.',
    ),
  ).toBeInTheDocument();
}, 120_000);

it('will toast server side errors for unknown errors', async () => {
  const user = userEvent.setup({ delay: null });
  mockCreateResearchOutput.mockRejectedValue(new Error('Something went wrong'));

  await renderPage({
    outputDocumentType: 'bioinformatics',
  });

  const { clickPublish } = await mandatoryFields({ type: 'Code' }, true, user);

  await clickPublish();

  expect(mockCreateResearchOutput).toHaveBeenCalled();
  expect(
    screen.queryByText(
      'There was an error and we were unable to save your changes. Please try again.',
    ),
  ).toBeInTheDocument();
  expect(window.scrollTo).toHaveBeenCalled();
}, 120_000);

it('display a toast warning when creating a new version', async () => {
  await renderPage({
    versionAction: 'create',
  });
  expect(
    screen.queryByText(
      'The previous output page will be replaced with a summarised version history section.',
    ),
  ).toBeInTheDocument();
});

it.each([
  {
    status: 'draft',
    buttonName: 'Save Draft',
    published: false,
    shouldPublish: false,
  },
  {
    status: 'published',
    buttonName: 'Save',
    published: true,
    shouldPublish: true,
    versionAction: 'edit',
  },
  {
    status: 'draft',
    buttonName: 'Publish',
    published: false,
    shouldPublish: true,
  },
])(
  'can edit a $status working group research output',
  async ({ buttonName, published, shouldPublish, versionAction }) => {
    const user = userEvent.setup({ delay: null });
    const id = 'RO-ID';
    const workingGroupId = 'wg1';
    const link = 'https://example42.com';
    const title = 'example42 title';
    const descriptionMD = 'example42 description';
    const shortDescription = 'example42 short description';
    const outputDocumentType = 'report';

    await renderPage({
      workingGroupId,
      outputDocumentType,
      researchOutputData: {
        ...createResearchOutputResponse(),
        id,
        link,
        title,
        descriptionMD,
        shortDescription,
        published,
        labs: [{ id: 'l0', name: 'Example 1' }],
        statusChangedBy: {
          id: 'user-id-1',
          firstName: 'User',
          lastName: 'One',
        },
        isInReview: false,
      },
      initialEntries: [
        network({})
          .workingGroups({})
          .workingGroup({ workingGroupId })
          .createOutput({ outputDocumentType }).$,
      ],
      versionAction: versionAction as 'create' | 'edit' | undefined,
    });

    const button = screen.getByRole('button', { name: buttonName });
    await user.click(button);
    if (buttonName === 'Publish') {
      await user.click(await findConfirmModalButton(/Publish Output/i));
    }
    await waitFor(
      () => {
        expect(currentLocation?.pathname).toBe(
          '/shared-research/research-output-id',
        );
        expect(currentLocation?.state).toEqual(
          buttonName === 'Publish' ? { toast: 'published' } : null,
        );
      },
      { interval: 50 },
    );

    expect(mockUpdateResearchOutput).toHaveBeenCalledWith(
      id,
      expect.objectContaining({
        documentType: 'Grant Document',
        link,
        title,
        descriptionMD,
        shortDescription,
        workingGroups: [workingGroupId],
        published: shouldPublish,
        statusChangedById: 'user-id-1',
        isInReview: false,
      }),
      expect.anything(),
    );
  },
);
