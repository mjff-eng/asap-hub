import { Auth0, Auth0User } from '@asap-hub/auth';
import { disable } from '@asap-hub/flags';
import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import {
  createListEventResponse,
  createUserResponse,
  createUserTeams,
} from '@asap-hub/fixtures';
import { UserResponse } from '@asap-hub/model';
import { ToastContext } from '@asap-hub/react-context';
import { network } from '@asap-hub/routing';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import imageCompression from 'browser-image-compression';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ContextType, Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { getEvents } from '../../../events/api';
import { getResearchOutputs } from '../../../shared-research/api';
import { createResearchOutputListAlgoliaResponse } from '../../../__fixtures__/algolia';
import { getUser, patchUser, postUserAvatar } from '../api';
import UserProfile from '../UserProfile';

jest.mock('../api');
jest.mock('../interest-groups/api');
jest.mock('browser-image-compression');

jest.mock('../../../shared-research/api');
jest.mock('../../../events/api');
const mockGetResearchOutputs = getResearchOutputs as jest.MockedFunction<
  typeof getResearchOutputs
>;

const imageCompressionMock = imageCompression as jest.MockedFunction<
  typeof imageCompression
>;
const mockUserEventsFromAlgolia = getEvents as jest.MockedFunction<
  typeof getEvents
>;

imageCompressionMock.getDataUrlFromFile = jest.requireActual(
  'browser-image-compression',
).getDataUrlFromFile;

const mockGetUser = getUser as jest.MockedFunction<typeof getUser>;
const mockPatchUser = patchUser as jest.MockedFunction<typeof patchUser>;
const mockPostUserAvatar = postUserAvatar as jest.MockedFunction<
  typeof postUserAvatar
>;
const standardMockPatchUser =
  mockPatchUser.getMockImplementation() as typeof patchUser;
const standardMockPostUserAvatar =
  mockPostUserAvatar.getMockImplementation() as typeof postUserAvatar;

const mockToast = jest.fn() as jest.MockedFunction<
  ContextType<typeof ToastContext>
>;

// Suppress React Router v6 nested routes warnings from UserProfile component
// TODO: Remove this once UserProfile component is migrated to React Router v6
// eslint-disable-next-line no-console -- storing original console methods to restore after filtering warnings
const originalWarn = console.warn;
// eslint-disable-next-line no-console -- storing original console methods to restore after filtering errors
const originalError = console.error;
beforeEach(() => {
  disable('NEW_USER_DETAIL_PAGE');
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation((...args) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('rendered descendant <Routes>') ||
        message.includes('No routes matched location'))
    ) {
      return;
    }
    originalWarn(...args);
  });
  // Suppress JSDOM navigation errors (not implemented in test environment)
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const message = String(args[0]);
    if (message.includes('Not implemented: navigation')) {
      return;
    }
    // Also suppress act() warnings from Suspense
    if (message.includes('was not wrapped in act')) {
      return;
    }
    originalError(...args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const renderUserProfile = async (
  userResponse = createUserResponse(),
  {
    ownUserId = userResponse.id,
    onboarded = true,
    routeProfileId = userResponse.id,
    currentTime = new Date(),
  } = {},
  auth0Overrides?: (
    auth0Client?: Auth0Client,
    auth0User?: Auth0User,
  ) => Partial<Auth0>,
) => {
  mockGetUser.mockImplementation(async (id) =>
    id === userResponse.id ? userResponse : undefined,
  );
  mockPatchUser.mockImplementation(async (id, ...args) => {
    if (id === userResponse.id) return standardMockPatchUser(id, ...args);
    throw new Error('404');
  });
  mockPostUserAvatar.mockImplementation(async (id, ...args) => {
    if (id === userResponse.id) return standardMockPostUserAvatar(id, ...args);
    throw new Error('404');
  });

  mockToast.mockClear();

  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <ToastContext.Provider value={mockToast}>
          <Auth0Provider
            user={{ id: ownUserId, onboarded }}
            auth0Overrides={auth0Overrides}
          >
            <WhenReady>
              <MemoryRouter
                initialEntries={[
                  network({}).users({}).user({ userId: routeProfileId }).$,
                ]}
              >
                <Routes>
                  <Route
                    path={`${network.template}${network({}).users.template}${
                      network({}).users({}).user.template
                    }/*`}
                    element={<UserProfile currentTime={currentTime} />}
                  />
                </Routes>
              </MemoryRouter>
            </WhenReady>
          </Auth0Provider>
        </ToastContext.Provider>
      </Suspense>
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(result.queryByText(/loading/i)).not.toBeInTheDocument(),
  );
  return result;
};

it('renders the personal info', async () => {
  await renderUserProfile({
    ...createUserResponse(),
    fullDisplayName: 'Someone',
  });
  expect(
    (await screen.findByRole('heading', { name: 'Someone' })).tagName,
  ).toBe('H1');
});

it('by default renders the research tab', async () => {
  await renderUserProfile({
    ...createUserResponse(),
    questions: ['What?'],
  });
  expect(await screen.findByText('What?')).toBeVisible();
});

it('navigates to the background tab', async () => {
  await renderUserProfile({
    ...createUserResponse(),
    biography: 'My Bio',
  });

  const tab = screen.getByRole('link', { name: /background/i });
  await userEvent.click(tab);
  expect(await screen.findByText('My Bio')).toBeVisible();
});

it('navigates to the outputs tab', async () => {
  mockGetResearchOutputs.mockResolvedValue({
    ...createResearchOutputListAlgoliaResponse(1),
    hits: createResearchOutputListAlgoliaResponse(1).hits.map((hit, index) => ({
      ...hit,
      title: `Test Output ${index}`,
    })),
  });
  await renderUserProfile(createUserResponse());

  const tab = screen.getByRole('link', { name: /output/i });
  await userEvent.click(tab);
  expect(await screen.findByRole('searchbox')).toHaveAttribute(
    'placeholder',
    'Enter a keyword, method, resource…',
  );
  expect(await screen.findByText(/Test Output 0/i)).toBeVisible();
});

it("links to the user's team", async () => {
  await renderUserProfile({
    ...createUserResponse(),
    teams: [
      {
        ...createUserTeams({ teams: 1 })[0]!,
        id: '42',
        displayName: 'Kool Krew',
      },
    ],
  });
  expect(
    (
      await screen.findAllByText('Kool Krew', {
        exact: false,
        selector: 'div ~ * *',
      })
    )[0]!.closest('a')!.href,
  ).toContain('42');
});

it('renders the 404 page for a missing user', async () => {
  await renderUserProfile(
    {
      ...createUserResponse(),
      id: '42',
    },
    { routeProfileId: '1337' },
  );
  expect(await screen.findByText(/sorry.+page/i)).toBeVisible();
});

describe('a header edit button', () => {
  it("is not rendered on someone else's profile", async () => {
    await renderUserProfile(
      { ...createUserResponse(), id: '42' },
      { ownUserId: '1337' },
    );
    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
    );

    expect(screen.queryByLabelText(/edit/i)).not.toBeInTheDocument();
  });

  it('is rendered for personal info on your own profile', async () => {
    await renderUserProfile();
    expect(await screen.findByLabelText(/edit.+personal/i)).toBeVisible();
  });

  it('is rendered for contact info on your own profile', async () => {
    await renderUserProfile();
    expect(await screen.findByLabelText(/edit.+contact/i)).toBeVisible();
  });

  it('is rendered for avatar on your own profile', async () => {
    await renderUserProfile();
    expect(await screen.findByLabelText(/edit.+avatar/i)).toBeInTheDocument();
  });

  it('can change personal info', async () => {
    const userProfile: UserResponse = {
      ...createUserResponse(),
      city: 'Lon',
      stateOrProvince: 'State',
      country: 'United Kingdom of Great Britain and Northern Ireland',
      id: '42',
    };
    await renderUserProfile(userProfile);
    // Navigate to about tab first since edit modals are only rendered under about/*
    await userEvent.click(
      await screen.findByRole('link', { name: /background/i }),
    );
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    await userEvent.click(await screen.findByLabelText(/edit.+personal/i));
    // Wait for modal to open - look for the city input field which is modal-specific
    const cityInput = await screen.findByDisplayValue(
      'Lon',
      {},
      { timeout: 3000 },
    );
    await userEvent.type(cityInput, 'don');
    expect(await screen.findByDisplayValue('London')).toBeVisible();
    await userEvent.click(await screen.findByText(/save/i));
    await waitFor(() => {
      expect(screen.getByText(/London/i)).toBeVisible();
    });
    expect(mockPatchUser).toHaveBeenLastCalledWith(
      '42',
      expect.objectContaining({ city: 'London' }),
      expect.any(String),
    );
  });

  it('remains on the same tab after closing a modal', async () => {
    const user = userEvent.setup({ delay: null });
    const userProfile: UserResponse = {
      ...createUserResponse(),
      biography: 'My Bio',
    };
    await renderUserProfile(userProfile);
    // Open and close on research tab (default tab)
    // Wait for the Research component to load (it's lazy-loaded)
    const roleHeading = await screen.findByRole('heading', {
      name: 'Role',
    });
    expect(roleHeading).toBeVisible();
    expect(screen.queryByText(/main details/i)).toBeNull();
    // Open the modal - content behind should still be visible through the semi-transparent overlay
    await user.click(await screen.findByLabelText(/edit.+personal/i));
    // Check that both the modal and the content behind are visible
    await waitFor(() => {
      expect(screen.getByText(/main details/i)).toBeVisible();
      // Content behind should be visible (though not interactive)
      expect(screen.getByRole('heading', { name: 'Role' })).toBeVisible();
    });
    // Close the modal
    await user.click(await screen.findByTitle(/Close/i));
    // After closing, verify we're still on the research tab
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Role' })).toBeVisible();
      expect(screen.queryByText(/main details/i)).toBeNull();
    });
    // Open and close on background tab
    await user.click(
      await screen.findByText(/background/i, { selector: 'nav *' }),
    );
    expect(await screen.findByText('My Bio')).toBeVisible();
    await user.click(await screen.findByLabelText(/edit.+personal/i));
    // Check that both the modal and the content behind are visible
    await waitFor(() => {
      expect(screen.getByText(/main details/i)).toBeVisible();
      // Content behind should be visible (though not interactive)
      expect(screen.getByText(/my bio/i)).toBeVisible();
    });
    // Close the modal
    await user.click(await screen.findByTitle(/Close/i));
    // After closing, verify we're still on the background tab
    await waitFor(() => {
      expect(screen.getByText(/my bio/i)).toBeVisible();
      expect(screen.queryByText(/main details/i)).toBeNull();
    });
  }, 30000);

  it('can change contact info', async () => {
    const user = userEvent.setup({ delay: null });
    const userProfile: UserResponse = {
      ...createUserResponse(),
      contactEmail: 'contact@example.com',
      id: '42',
    };
    await renderUserProfile(userProfile);
    // Navigate to about tab first since edit modals are only rendered under about/*
    await user.click(await screen.findByRole('link', { name: /background/i }));
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    await user.click(await screen.findByLabelText(/edit.+contact/i));
    // Wait for modal to open - look for the email input field which is modal-specific
    const emailInput = await screen.findByDisplayValue(
      'contact@example.com',
      {},
      { timeout: 3000 },
    );
    await user.type(emailInput, 'm');
    expect(
      await screen.findByDisplayValue('contact@example.comm'),
    ).toBeVisible();
    await user.click(await screen.findByText(/save/i));
    await waitFor(() => {
      expect(
        screen.getByText(/contact/i, { selector: 'header *' }),
      ).toBeVisible();
    });
    expect(
      (await screen.findByText(/contact/i, { selector: 'header *' })).closest(
        'a',
      ),
    ).toHaveAttribute('href', 'mailto:contact@example.comm');
    expect(mockPatchUser).toHaveBeenLastCalledWith(
      '42',
      expect.objectContaining({
        contactEmail: 'contact@example.comm',
      }),
      expect.any(String),
    );
  }, 30000);

  it('refreshes auth0 id token', async () => {
    const userProfile: UserResponse = {
      ...createUserResponse(),
    };
    const mockToken = jest.fn().mockResolvedValue('token');
    await renderUserProfile(userProfile, {}, (authClient, user) => ({
      getTokenSilently:
        authClient && user
          ? mockToken
          : () => {
              throw new Error('Not Ready');
            },
    }));
    // Navigate to about tab first since edit modals are only rendered under about/*
    await userEvent.click(
      await screen.findByRole('link', { name: /background/i }),
    );
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    await userEvent.click(await screen.findByLabelText(/edit.+contact/i));
    // Wait for modal to open - look for save button
    const saveButton = await screen.findByText(/save/i, {}, { timeout: 3000 });
    await userEvent.click(saveButton);
    await waitFor(() => expect(mockToken).toHaveBeenCalled());
  });

  describe('for the avatar', () => {
    const fileBuffer = readFileSync(join(__dirname, 'jpeg.jpg'));
    const file = new File([new Uint8Array(fileBuffer)], 'jpeg.jpg', {
      type: 'image/jpeg',
    });
    beforeEach(() => {
      imageCompressionMock.mockImplementationOnce((fileToCompress) =>
        Promise.resolve(fileToCompress),
      );
    });

    it('updates the avatar', async () => {
      const userProfile: UserResponse = {
        ...createUserResponse(),
        avatarUrl: 'https://placekitten.com/200/300',
        id: '42',
      };
      await renderUserProfile(userProfile);

      await userEvent.upload(
        await screen.findByLabelText(/upload.+avatar/i),
        file,
      );
      await waitFor(() =>
        expect(mockPostUserAvatar).toHaveBeenLastCalledWith(
          '42',
          expect.objectContaining({
            avatar: `data:image/jpeg;base64,${fileBuffer.toString('base64')}`,
          }),
          expect.any(String),
        ),
      );
    });

    it('refreshes the Auth0 id token', async () => {
      const userProfile: UserResponse = {
        ...createUserResponse(),
        avatarUrl: 'https://placekitten.com/200/300',
        id: '42',
      };
      const mockToken = jest.fn().mockResolvedValue('token');
      await renderUserProfile(userProfile, {}, (authClient, user) => ({
        getTokenSilently:
          authClient && user
            ? mockToken
            : () => {
                throw new Error('Not Ready');
              },
      }));

      const upload = await screen.findByLabelText(/upload.+avatar/i);
      await userEvent.upload(upload, file);
      await waitFor(() => expect(mockToken).toHaveBeenCalled());
      await waitFor(() => expect(mockPostUserAvatar).toHaveBeenCalled());
    });

    it('toasts if the upload fails', async () => {
      const userProfile: UserResponse = {
        ...createUserResponse(),
        avatarUrl: 'https://placekitten.com/200/300',
        id: '42',
      };
      await renderUserProfile(userProfile);

      mockPostUserAvatar.mockRejectedValue(new Error('500'));
      const upload = await screen.findByLabelText(/upload.+avatar/i);
      await userEvent.upload(upload, file);
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.stringMatching(/error.+picture/i),
        );
      });
    });
  });
});

it('renders number of shared outputs', async () => {
  mockGetResearchOutputs.mockResolvedValue({
    ...createResearchOutputListAlgoliaResponse(5),
  });
  await renderUserProfile(createUserResponse());

  expect(await screen.findByText(/Shared Outputs \(5\)/i)).toBeVisible();
});

it('renders number of upcoming events', async () => {
  const response = createListEventResponse(7);
  mockUserEventsFromAlgolia.mockResolvedValue(response);
  await renderUserProfile(createUserResponse());

  expect(await screen.findByText(/Upcoming Events \(7\)/i)).toBeVisible();
});

it('renders number of past events', async () => {
  const response = createListEventResponse(7, { isEventInThePast: true });
  mockUserEventsFromAlgolia.mockResolvedValue(response);
  await renderUserProfile(createUserResponse());

  expect(await screen.findByText(/Past Events \(7\)/i)).toBeVisible();
});

it('navigates to the upcoming events tab', async () => {
  const currentTime = new Date('2021-12-28T14:00:00.000Z');
  const response = createListEventResponse(1);
  mockUserEventsFromAlgolia.mockResolvedValue(response);

  const userResponse = createUserResponse();
  await renderUserProfile(userResponse, { currentTime });

  const tab = screen.getByRole('link', { name: /upcoming/i });
  await userEvent.click(tab);
  expect(await screen.findByRole('searchbox')).toHaveAttribute(
    'placeholder',
    'Search by topic, presenting team, …',
  );
  expect(await screen.findByText(/Event 0/i)).toBeVisible();
  expect(mockUserEventsFromAlgolia).toHaveBeenCalledTimes(2);
  expect(mockUserEventsFromAlgolia).toHaveBeenCalledWith(expect.anything(), {
    after: '2021-12-28T13:00:00.000Z',
    currentPage: 0,
    filters: new Set(),
    pageSize: 10,
    searchQuery: '',
    constraint: {
      userId: userResponse.id,
    },
  });
});

it('navigates to the past events tab', async () => {
  const currentTime = new Date('2021-12-28T14:00:00.000Z');
  const response = createListEventResponse(1, { isEventInThePast: true });
  mockUserEventsFromAlgolia.mockResolvedValue(response);

  const userResponse = createUserResponse();
  await renderUserProfile(userResponse, { currentTime });

  const tab = screen.getByRole('link', { name: /past/i });
  await userEvent.click(tab);
  expect(await screen.findByRole('searchbox')).toHaveAttribute(
    'placeholder',
    'Search by topic, presenting team, …',
  );
  expect(await screen.findByText(/Event 0/i)).toBeVisible();
  expect(mockUserEventsFromAlgolia).toHaveBeenCalledTimes(2);
  expect(mockUserEventsFromAlgolia).toHaveBeenCalledWith(expect.anything(), {
    after: '2021-12-28T13:00:00.000Z',
    currentPage: 0,
    filters: new Set(),
    pageSize: 10,
    searchQuery: '',
    constraint: {
      userId: userResponse.id,
    },
  });
});

describe('for a non onboarded user', () => {
  const userProfile: UserResponse = {
    ...createUserResponse(),
    avatarUrl: 'https://placekitten.com/200/300',
    id: '42',
    onboarded: false,
  };
  it('renders the tabs without the numbers', async () => {
    await renderUserProfile(userProfile, { onboarded: userProfile.onboarded });

    expect(screen.getByRole('link', { name: /^Past Events$/ })).toBeVisible();
    expect(
      screen.getByRole('link', { name: /^Upcoming Events$/ }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: /^Shared Outputs$/ }),
    ).toBeVisible();
  });
});
