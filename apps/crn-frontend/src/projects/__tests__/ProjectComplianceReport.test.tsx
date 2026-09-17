import { ComponentProps, Suspense, useEffect } from 'react';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ProjectDetail } from '@asap-hub/model';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { projects } from '@asap-hub/routing';

import { Auth0Provider, WhenReady } from '../../auth/test-utils';
import { ManuscriptToastProvider } from '../../network/teams/ManuscriptToastProvider';
import { getManuscript } from '../../network/teams/api';
import { manuscriptQueryKeys } from '../../network/teams/state';
import { createComplianceReport } from '../api';
import ProjectComplianceReport from '../ProjectComplianceReport';
import { projectQueryKeys } from '../state';

const mockSetFormType = jest.fn();
jest.mock('../../network/teams/useManuscriptToast', () => ({
  useManuscriptToast: jest.fn(() => ({
    setFormType: mockSetFormType,
  })),
}));

const manuscriptResponse = {
  id: 'manuscript-1',
  title: 'The Manuscript',
  versions: [{ id: 'manuscript-version-1' }],
  status: 'Addendum Required',
  notificationList: '',
};

const projectId = 'proj-1';

let currentLocation: { pathname: string; search: string } | null = null;
const LocationCapture = () => {
  const location = useLocation();
  useEffect(() => {
    currentLocation = { pathname: location.pathname, search: location.search };
  }, [location]);
  return null;
};

jest.mock('../../network/teams/api', () => ({
  getManuscript: jest.fn().mockResolvedValue(manuscriptResponse),
}));

jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  createComplianceReport: jest
    .fn()
    .mockResolvedValue({ id: 'compliance-report-1' }),
}));

beforeEach(() => {
  currentLocation = null;
  mockSetFormType.mockReset();
  jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  (createComplianceReport as jest.Mock).mockClear();
  (getManuscript as jest.Mock).mockClear();
  (getManuscript as jest.Mock).mockResolvedValue(manuscriptResponse);

  if (typeof Range !== 'undefined') {
    Range.prototype.getBoundingClientRect = jest.fn(() => ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }));
  }
  if (typeof Selection !== 'undefined') {
    Selection.prototype.getRangeAt = jest.fn(() => {
      const range = new Range();
      range.getBoundingClientRect = jest.fn(() => ({
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: jest.fn(),
      }));
      return range;
    });
  }
});

const getRoutes = (projectType: 'discovery' | 'resource' | 'trainee') => {
  const projectRoutes = projects({});
  switch (projectType) {
    case 'resource':
      return projectRoutes
        .resourceProjects({})
        .resourceProject({ projectId })
        .workspace({});
    case 'trainee':
      return projectRoutes
        .traineeProjects({})
        .traineeProject({ projectId })
        .workspace({});
    case 'discovery':
    default:
      return projectRoutes
        .discoveryProjects({})
        .discoveryProject({ projectId })
        .workspace({});
  }
};

const renderPage = async (
  user: ComponentProps<typeof Auth0Provider>['user'] = {},
  state?: unknown,
  projectType: 'discovery' | 'resource' | 'trainee' = 'discovery',
) => {
  const workspaceRoutes = getRoutes(projectType);
  const createCompliancePath = workspaceRoutes.createComplianceReport({
    manuscriptId: manuscriptResponse.id,
  }).$;
  const workspacePath = workspaceRoutes.$;

  const queryClient = createTestQueryClient();
  // Seed the project detail cache so the success flow's invalidation of the
  // project can be observed.
  queryClient.setQueryData(projectQueryKeys.detail(projectId), {
    id: projectId,
    title: 'The Project',
    projectType:
      projectType === 'resource'
        ? 'Resource Project'
        : projectType === 'trainee'
          ? 'Trainee Project'
          : 'Discovery Project',
  } as ProjectDetail);

  const result = render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="loading">
        <Auth0Provider user={user}>
          <WhenReady>
            <MemoryRouter
              initialEntries={[
                {
                  pathname: createCompliancePath,
                  state: state ?? { fromButton: true },
                },
              ]}
            >
              <LocationCapture />
              <Routes>
                <Route
                  path={`${workspacePath}/create-compliance-report/:manuscriptId`}
                  element={
                    <ManuscriptToastProvider>
                      <ProjectComplianceReport
                        projectId={projectId}
                        projectType={projectType}
                      />
                    </ManuscriptToastProvider>
                  }
                />
                <Route
                  path={`${workspacePath}/*`}
                  element={<div>Workspace</div>}
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
  return { ...result, queryClient };
};

it('renders the compliance report form page for the manuscript', async () => {
  const { container } = await renderPage();
  expect(container).toHaveTextContent(
    'Share the compliance report associated with this manuscript.',
  );
  expect(container).toHaveTextContent('Title of Manuscript');
});

it('redirects back to the project workspace when state.fromButton is missing', async () => {
  await renderPage({}, {});
  await waitFor(() => {
    expect(currentLocation?.pathname).toBe(
      projects({})
        .discoveryProjects({})
        .discoveryProject({ projectId })
        .workspace({}).$,
    );
  });
});

it('redirects back to the resource project workspace path', async () => {
  await renderPage({}, {}, 'resource');
  await waitFor(() => {
    expect(currentLocation?.pathname).toBe(
      projects({})
        .resourceProjects({})
        .resourceProject({ projectId })
        .workspace({}).$,
    );
  });
});

it('redirects back to the trainee project workspace path', async () => {
  await renderPage({}, {}, 'trainee');
  await waitFor(() => {
    expect(currentLocation?.pathname).toBe(
      projects({})
        .traineeProjects({})
        .traineeProject({ projectId })
        .workspace({}).$,
    );
  });
});

it('on form success sets compliance-report toast, refreshes the workspace manuscripts, and navigates to workspace', async () => {
  const user = userEvent.setup();
  const { queryClient } = await renderPage();
  queryClient.setQueryData(manuscriptQueryKeys.workspace({ projectId }), {
    manuscripts: [],
    collaborationManuscripts: [],
  });

  await user.type(
    screen.getByRole('textbox', { name: /url/i }),
    'https://compliancereport.com',
  );

  const editor = await waitFor(() => screen.getByTestId('editor'));
  await act(async () => {
    await user.click(editor);
    fireEvent.input(editor, { data: 'compliance report description' });
  });
  await act(async () => {
    fireEvent.blur(editor);
  });

  await user.click(screen.getByLabelText(/Status/i));
  await user.click(screen.getByText(/Addendum Required/i));

  const shareButton = screen.getByRole('button', { name: /Share/i });
  await waitFor(() => expect(shareButton).toBeEnabled(), { timeout: 5000 });
  await user.click(shareButton);

  const confirmButton = screen.getByRole('button', {
    name: /Share Compliance Report/i,
  });
  await user.click(confirmButton);

  await waitFor(() => {
    expect(mockSetFormType).toHaveBeenCalledWith({
      type: 'compliance-report',
      accent: 'successLarge',
    });
  });

  await waitFor(() => {
    expect(createComplianceReport).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://compliancereport.com',
        description: 'compliance report description',
        manuscriptVersionId: manuscriptResponse.versions[0]!.id,
        manuscriptId: manuscriptResponse.id,
      }),
      expect.anything(),
    );
  });

  await waitFor(() => {
    expect(
      queryClient.getQueryState(manuscriptQueryKeys.workspace({ projectId }))
        ?.isInvalidated,
    ).toBe(true);
  });
  expect(
    queryClient.getQueryState(projectQueryKeys.detail(projectId))
      ?.isInvalidated,
  ).toBe(false);

  await waitFor(() => {
    expect(currentLocation?.pathname).toBe(
      projects({})
        .discoveryProjects({})
        .discoveryProject({ projectId })
        .workspace({}).$,
    );
  });
});

it('renders NotFoundPage when manuscript is missing', async () => {
  (getManuscript as jest.Mock).mockResolvedValueOnce(undefined);
  await renderPage();
  expect(
    screen.getByText(/Sorry! We can.+t seem to find that page/),
  ).toBeInTheDocument();
});
