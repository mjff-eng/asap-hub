import { Suspense } from 'react';
import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { screen, render, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  createListInterestGroupResponse,
  createUserResponse,
} from '@asap-hub/fixtures';
import userEvent from '@testing-library/user-event';
import { network } from '@asap-hub/routing';

import {
  Auth0Provider,
  WhenReady,
} from '@asap-hub/crn-frontend/src/auth/test-utils';
import Research from '../Research';
import { patchUser } from '../api';
import { getResearchTags } from '../../../shared-research/api';
import { getUserInterestGroups } from '../interest-groups/api';

jest.mock('../api');
jest.mock('../interest-groups/api');
jest.mock('../../../shared-research/api');

const renderResearch = async (
  user = createUserResponse(),
  currentUserId = user.id,
) => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Suspense fallback="loading">
        <Auth0Provider user={{ id: currentUserId }}>
          <WhenReady>
            <MemoryRouter
              initialEntries={[
                network({}).users({}).user({ userId: user.id }).research({}).$,
              ]}
            >
              <Routes>
                <Route
                  path={`${network.template}${network({}).users.template}${
                    network({}).users({}).user.template
                  }${
                    network({}).users({}).user({ userId: user.id }).research
                      .template
                  }/*`}
                  element={<Research user={user} />}
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
};

const tags = ['1', '2', '3', '4', '5'];

describe('UserDetail', () => {
  const mockPatchUser = patchUser as jest.MockedFunction<typeof patchUser>;
  const mockGetResearchTags = getResearchTags as jest.MockedFunction<
    typeof getResearchTags
  >;
  const mockGetUserInterestGroups =
    getUserInterestGroups as jest.MockedFunction<typeof getUserInterestGroups>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetResearchTags.mockResolvedValue(
      tags.map((tag) => ({ name: tag, id: tag })),
    );
    mockGetUserInterestGroups.mockResolvedValue(
      createListInterestGroupResponse(0),
    );
  });

  it('renders the profile research section', async () => {
    const user = {
      ...createUserResponse(),
      tags: [{ name: 'Some Expertise', id: '1' }],
    };
    await renderResearch(user);
    expect(screen.getByText('Some Expertise')).toBeVisible();
  });

  it('allows editing your own profile', async () => {
    await renderResearch();
    expect(screen.getAllByLabelText(/edit/i)).not.toHaveLength(0);
  });

  it("does not allow editing somebody else's profile", async () => {
    const user = {
      ...createUserResponse(),
      id: '12',
    };
    await renderResearch(user, '1337');
    expect(screen.queryByLabelText(/edit/i)).not.toBeInTheDocument();
  });

  describe('editing role', () => {
    const user = {
      ...createUserResponse(),
      researchInterests: 'My Interests',
      responsibilities: 'My Responsibilities',
    };
    it('opens and closes the dialog', async () => {
      await renderResearch(user);
      await userEvent.click(screen.getByLabelText(/edit.+role/i));
      expect(screen.getByDisplayValue('My Interests')).toBeVisible();
      await userEvent.click(screen.getByText(/close/i));
      expect(
        screen.queryByDisplayValue('My Interests'),
      ).not.toBeInTheDocument();
    });

    it('saves the changes from the dialog', async () => {
      await renderResearch(user);
      await userEvent.click(screen.getByLabelText(/edit.+role/i));

      await userEvent.click(screen.getByText(/save/i));
      await waitFor(() => {
        expect(mockPatchUser).toHaveBeenCalledWith(
          user.id,
          {
            researchInterests: 'My Interests',
            responsibilities: 'My Responsibilities',
            reachOut: '',
          },
          expect.any(String),
        );
      });
    });
  });

  describe('editing expertise and resources', () => {
    const user = {
      ...createUserResponse(),
      expertiseAndResourceDescription: 'Expertise Description',
    };
    it('opens and closes the dialog', async () => {
      await renderResearch(user);

      await userEvent.click(screen.getByLabelText(/edit.+resources/i));
      expect(screen.getByDisplayValue('Expertise Description')).toBeVisible();

      await userEvent.click(screen.getByText(/close/i));
      expect(
        screen.queryByDisplayValue('Expertise Description'),
      ).not.toBeInTheDocument();
    });

    it('saves the changes from the dialog', async () => {
      await renderResearch(user);

      await userEvent.click(screen.getByLabelText(/edit.+resources/i));
      await userEvent.type(
        screen.getByDisplayValue('Expertise Description'),
        ' 2',
      );
      expect(screen.getByDisplayValue('Expertise Description 2')).toBeVisible();
      for (const expertise of tags) {
        // eslint-disable-next-line no-await-in-loop -- Sequential UI interactions must be awaited in order
        await userEvent.type(
          screen.getByLabelText(/tags\s*\(required\)/i),
          expertise,
        );
        // eslint-disable-next-line no-await-in-loop
        await userEvent.tab();
      }

      await userEvent.click(screen.getByText(/save/i));
      await waitFor(
        () => {
          expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        },
        { timeout: 20000 },
      );

      expect(mockPatchUser).toHaveBeenCalledWith(
        user.id,
        {
          tagIds: tags,
          expertiseAndResourceDescription: 'Expertise Description 2',
        },
        expect.any(String),
      );
    }, 20000);
  });

  describe('questions', () => {
    const user = {
      ...createUserResponse(),
      questions: ['question 1', 'question 2', 'question 3', 'question 4'],
    };
    it('opens and closes the dialog', async () => {
      await renderResearch(user);
      await userEvent.click(screen.getByLabelText(/edit.+questions/i));
      expect(screen.getByDisplayValue('question 1')).toBeVisible();

      await userEvent.click(screen.getByText(/close/i));
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      expect(screen.queryByDisplayValue('question 1')).not.toBeInTheDocument();
    });

    it('saves the changes from the dialog', async () => {
      await renderResearch(user);

      await userEvent.click(screen.getByLabelText(/edit.+questions/i));
      await userEvent.type(screen.getByDisplayValue('question 1'), ' a');
      expect(screen.getByDisplayValue('question 1 a')).toBeVisible();

      await userEvent.type(screen.getByDisplayValue('question 2'), ' b');
      expect(screen.getByDisplayValue('question 2 b')).toBeVisible();

      await userEvent.type(screen.getByDisplayValue('question 3'), ' c');
      expect(screen.getByDisplayValue('question 3 c')).toBeVisible();
      await userEvent.type(screen.getByDisplayValue('question 4'), ' d');
      expect(screen.getByDisplayValue('question 4 d')).toBeVisible();
      await userEvent.click(screen.getByText(/save/i));
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      expect(mockPatchUser).toHaveBeenCalledWith(
        user.id,
        {
          questions: [
            'question 1 a',
            'question 2 b',
            'question 3 c',
            'question 4 d',
          ],
        },
        expect.any(String),
      );
    });
  });

  describe('badges', () => {
    const userWithAwards = () => {
      const baseUser = createUserResponse();
      return {
        ...baseUser,
        teams: [
          {
            ...baseUser.teams[0]!,
            displayName: 'Award Team',
            awards: [
              {
                name: 'Open Science Champion',
                date: '2024-01-01',
                iconUrl: 'https://example.com/badge.png',
              },
            ],
          },
        ],
      };
    };

    it('renders the Badges card for a user with awards', async () => {
      await renderResearch(userWithAwards());

      expect(screen.getByText('Badges')).toBeInTheDocument();
      expect(screen.getByText('Award Team')).toBeInTheDocument();
    });

    it('does not render the Badges card when the user has no awards', async () => {
      await renderResearch(createUserResponse());
      expect(screen.queryByText('Badges')).not.toBeInTheDocument();
    });
  });

  describe('UserProjectsCard feature flag', () => {
    const userWithProjects = {
      ...createUserResponse(),
      projects: [
        {
          id: 'project-1',
          title: 'Test Project',
          projectType: 'Discovery Project' as const,
          status: 'Active',
        },
      ],
    };

    it('shows UserProjectsCard', async () => {
      await renderResearch(userWithProjects);

      expect(screen.getByText('Projects')).toBeInTheDocument();
      const table = screen.getByTestId('projects-table');
      expect(within(table).getByText('Test Project')).toBeInTheDocument();
    });
  });
});
