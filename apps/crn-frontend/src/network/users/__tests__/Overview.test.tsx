import { Suspense } from 'react';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { screen, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createUserResponse } from '@asap-hub/fixtures';
import { UserProfileContext } from '@asap-hub/react-context';
import userEvent from '@testing-library/user-event';
import { network } from '@asap-hub/routing';

import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import Overview from '../Overview';
import { patchUser } from '../api';
import { getResearchTags } from '../../../shared-research/api';

jest.mock('../api');
jest.mock('../../../shared-research/api');

const mockPatchUser = patchUser as jest.MockedFunction<typeof patchUser>;
const mockGetResearchTags = getResearchTags as jest.MockedFunction<
  typeof getResearchTags
>;

const renderOverview = async (
  user = createUserResponse(),
  isOwnProfile = true,
) => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{ id: user.id }}>
          <WhenReady>
            <UserProfileContext.Provider value={{ isOwnProfile }}>
              <MemoryRouter
                initialEntries={[
                  network({}).users({}).user({ userId: user.id }).overview({})
                    .$,
                ]}
              >
                <Routes>
                  <Route
                    path={`${network.template}${network({}).users.template}${
                      network({}).users({}).user.template
                    }${
                      network({}).users({}).user({ userId: user.id }).overview
                        .template
                    }/*`}
                    element={<Overview user={user} />}
                  />
                </Routes>
              </MemoryRouter>
            </UserProfileContext.Provider>
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
  jest.resetAllMocks();
  mockGetResearchTags.mockResolvedValue([{ id: '1', name: 'Tag 1' }]);
});

it('renders the overview cards', async () => {
  await renderOverview({ ...createUserResponse(), biography: 'Some Bio' });

  expect(screen.getByText('Some Bio')).toBeVisible();
  expect(
    screen.getByRole('heading', { name: 'Expertise and Resources' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Role' })).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /Recent Publications/ }),
  ).toBeInTheDocument();
});

it("does not allow editing somebody else's profile", async () => {
  await renderOverview(createUserResponse(), false);

  expect(screen.queryByLabelText(/edit/i)).not.toBeInTheDocument();
});

describe('editing the biography and open questions', () => {
  const user = {
    ...createUserResponse(),
    biography: 'My Bio',
    questions: ['First question?', 'Second question?'],
  };

  it('opens and closes the dialog', async () => {
    await renderOverview(user);

    await userEvent.click(screen.getByLabelText('Edit biography'));
    expect(screen.getByDisplayValue('My Bio')).toBeVisible();
    expect(screen.getByDisplayValue('First question?')).toBeVisible();

    await userEvent.click(screen.getByText(/close/i));
    expect(screen.queryByDisplayValue('My Bio')).not.toBeInTheDocument();
  });

  it('saves the biography and questions together', async () => {
    await renderOverview(user);

    await userEvent.click(screen.getByLabelText('Edit biography'));
    await userEvent.type(screen.getByDisplayValue('My Bio'), ' 2');
    await userEvent.click(screen.getByText(/save/i));

    await waitFor(() =>
      expect(mockPatchUser).toHaveBeenCalledWith(
        user.id,
        {
          biography: 'My Bio 2',
          questions: ['First question?', 'Second question?'],
        },
        expect.any(String),
      ),
    );
  });
});

describe('editing expertise and resources', () => {
  const user = {
    ...createUserResponse(),
    expertiseAndResourceDescription: 'Expertise Description',
  };

  it('opens and closes the dialog', async () => {
    await renderOverview(user);

    await userEvent.click(
      screen.getByLabelText('Edit expertise and resources'),
    );
    expect(screen.getByDisplayValue('Expertise Description')).toBeVisible();

    await userEvent.click(screen.getByText(/close/i));
    expect(
      screen.queryByDisplayValue('Expertise Description'),
    ).not.toBeInTheDocument();
  });
});

describe('editing the role', () => {
  const user = {
    ...createUserResponse(),
    researchInterests: 'My Interests',
    responsibilities: 'My Responsibilities',
  };

  it('saves the changes from the dialog', async () => {
    await renderOverview(user);

    await userEvent.click(screen.getByLabelText('Edit role'));
    await userEvent.click(screen.getByText(/save/i));

    await waitFor(() =>
      expect(mockPatchUser).toHaveBeenCalledWith(
        user.id,
        {
          researchInterests: 'My Interests',
          responsibilities: 'My Responsibilities',
          reachOut: '',
        },
        expect.any(String),
      ),
    );
  });
});
