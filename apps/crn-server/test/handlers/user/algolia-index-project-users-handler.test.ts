import { NotFoundError } from '@asap-hub/errors';
import {
  ProjectMembershipEvent,
  toUserListItem,
  UserListItemResponse,
} from '@asap-hub/model';
import Boom from '@hapi/boom';
import { indexProjectUsersHandler } from '../../../src/handlers/user/algolia-index-project-users-handler';
import {
  getExpectedResourceIndividualProject,
  getExpectedResourceTeamProject,
  getExpectedTraineeProject,
  getProjectEvent,
} from '../../fixtures/projects.fixtures';
import { getUserListItemResponse } from '../../fixtures/users.fixtures';
import { createEventBridgeEventMock } from '../../helpers/events';
import { getAlgoliaSearchClientMock } from '../../mocks/algolia-client.mock';
import { projectControllerMock } from '../../mocks/project.controller.mock';
import { userControllerMock } from '../../mocks/user.controller.mock';

jest.mock('../../../src/utils/logger');

const getProjectMembershipEvent = (
  membershipId: string,
  eventType: ProjectMembershipEvent,
) => createEventBridgeEventMock({ resourceId: membershipId }, eventType);

const getUser = (id: string): UserListItemResponse => ({
  ...getUserListItemResponse(),
  id,
});

describe('Index Users on Project event handler', () => {
  const algoliaSearchClientMock = getAlgoliaSearchClientMock();
  const indexHandler = indexProjectUsersHandler(
    projectControllerMock,
    userControllerMock,
    algoliaSearchClientMock,
  );

  const mockAlgoliaUsers = (ids: string[]) =>
    algoliaSearchClientMock.search.mockResolvedValueOnce({
      hits: ids.map((id) => toUserListItem(getUser(id))),
    } as never);

  beforeEach(() => {
    userControllerMock.fetchByIdForAlgoliaList.mockImplementation(async (id) =>
      getUser(id),
    );
  });

  afterEach(() => jest.resetAllMocks());

  test('Should reindex the current members of a published individual project and the users that list it in Algolia', async () => {
    projectControllerMock.fetchById.mockResolvedValueOnce(
      getExpectedTraineeProject(),
    );
    mockAlgoliaUsers(['user-trainee', 'user-removed']);

    await indexHandler(getProjectEvent('trainee-1', 'ProjectsPublished'));

    expect(projectControllerMock.fetchById).toHaveBeenCalledWith('trainee-1');
    expect(algoliaSearchClientMock.search).toHaveBeenCalledWith(['user'], '', {
      filters: 'individualProjects.id:"trainee-1"',
      hitsPerPage: 1000,
    });
    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith(
      ['user-trainee', 'user-trainer', 'user-removed'].map((id) => ({
        data: toUserListItem(getUser(id)),
        type: 'user',
      })),
    );
  });

  test('Should reindex the user members of a resource project that is not team based', async () => {
    projectControllerMock.fetchById.mockResolvedValueOnce(
      getExpectedResourceIndividualProject(),
    );
    mockAlgoliaUsers([]);

    await indexHandler(
      getProjectEvent('resource-individual-1', 'ProjectsPublished'),
    );

    expect(userControllerMock.fetchByIdForAlgoliaList.mock.calls).toEqual([
      ['user-2'],
      ['user-3'],
    ]);
  });

  test('Should not treat the teams of a team based project as users', async () => {
    projectControllerMock.fetchById.mockResolvedValueOnce(
      getExpectedResourceTeamProject(),
    );
    mockAlgoliaUsers(['user-removed']);

    await indexHandler(getProjectEvent('resource-team-1', 'ProjectsPublished'));

    expect(userControllerMock.fetchByIdForAlgoliaList.mock.calls).toEqual([
      ['user-removed'],
    ]);
  });

  test('Should handle an individual project without members', async () => {
    projectControllerMock.fetchById.mockResolvedValueOnce({
      ...getExpectedResourceIndividualProject(),
      members: undefined,
    });
    mockAlgoliaUsers(['user-removed']);

    await indexHandler(
      getProjectEvent('resource-individual-1', 'ProjectsPublished'),
    );

    expect(userControllerMock.fetchByIdForAlgoliaList.mock.calls).toEqual([
      ['user-removed'],
    ]);
  });

  test('Should ignore project members that could not be resolved to a user', async () => {
    projectControllerMock.fetchById.mockResolvedValueOnce({
      ...getExpectedTraineeProject(),
      members: [
        { id: 'user-trainee', displayName: 'Trainee' },
        { id: 'unknown-user-membership-1', displayName: '' },
      ],
    });
    mockAlgoliaUsers([]);

    await indexHandler(getProjectEvent('trainee-1', 'ProjectsPublished'));

    expect(userControllerMock.fetchByIdForAlgoliaList.mock.calls).toEqual([
      ['user-trainee'],
    ]);
  });

  test('Should only reindex the users found in Algolia when the project is unpublished', async () => {
    mockAlgoliaUsers(['user-1']);

    await indexHandler(getProjectEvent('trainee-1', 'ProjectsUnpublished'));

    expect(projectControllerMock.fetchById).not.toHaveBeenCalled();
    expect(algoliaSearchClientMock.search).toHaveBeenCalledWith(['user'], '', {
      filters: 'individualProjects.id:"trainee-1"',
      hitsPerPage: 1000,
    });
    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith([
      { data: toUserListItem(getUser('user-1')), type: 'user' },
    ]);
  });

  test('Should only reindex the users found in Algolia when the published project is no longer found', async () => {
    projectControllerMock.fetchById.mockRejectedValueOnce(new NotFoundError());
    mockAlgoliaUsers(['user-1']);

    await indexHandler(getProjectEvent('trainee-1', 'ProjectsPublished'));

    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith([
      { data: toUserListItem(getUser('user-1')), type: 'user' },
    ]);
  });

  test('Should throw when fetching the project fails with another error', async () => {
    projectControllerMock.fetchById.mockRejectedValueOnce(Boom.badData());

    await expect(
      indexHandler(getProjectEvent('trainee-1', 'ProjectsPublished')),
    ).rejects.toThrow(Boom.badData());
    expect(algoliaSearchClientMock.saveMany).not.toHaveBeenCalled();
  });

  test.each<ProjectMembershipEvent>([
    'ProjectMembershipPublished',
    'ProjectMembershipUnpublished',
  ])(
    'Should reindex the users of the projects of the membership on %s',
    async (eventType) => {
      projectControllerMock.fetch.mockResolvedValueOnce({
        total: 2,
        items: [getExpectedTraineeProject(), getExpectedResourceTeamProject()],
      });
      mockAlgoliaUsers(['user-removed']);

      await indexHandler(getProjectMembershipEvent('membership-1', eventType));

      expect(projectControllerMock.fetch).toHaveBeenCalledWith({
        filter: { projectMembershipId: 'membership-1' },
        take: 20,
      });
      expect(algoliaSearchClientMock.search).toHaveBeenCalledWith(
        ['user'],
        '',
        {
          filters:
            'individualProjects.id:"trainee-1" OR individualProjects.id:"resource-team-1"',
          hitsPerPage: 1000,
        },
      );
      expect(userControllerMock.fetchByIdForAlgoliaList.mock.calls).toEqual([
        ['user-trainee'],
        ['user-trainer'],
        ['user-removed'],
      ]);
    },
  );

  test('Should do nothing when the membership is not linked to any project', async () => {
    projectControllerMock.fetch.mockResolvedValueOnce({ total: 0, items: [] });

    await indexHandler(
      getProjectMembershipEvent('membership-1', 'ProjectMembershipUnpublished'),
    );

    expect(algoliaSearchClientMock.search).not.toHaveBeenCalled();
    expect(algoliaSearchClientMock.saveMany).not.toHaveBeenCalled();
  });

  test('Should not save anything when no user is affected', async () => {
    mockAlgoliaUsers([]);

    await indexHandler(getProjectEvent('trainee-1', 'ProjectsUnpublished'));

    expect(userControllerMock.fetchByIdForAlgoliaList).not.toHaveBeenCalled();
    expect(algoliaSearchClientMock.saveMany).not.toHaveBeenCalled();
  });

  test('Should skip users that are no longer found', async () => {
    mockAlgoliaUsers(['user-1', 'user-deleted']);
    userControllerMock.fetchByIdForAlgoliaList.mockImplementation(
      async (id) => {
        if (id === 'user-deleted') {
          throw new NotFoundError();
        }
        return getUser(id);
      },
    );

    await indexHandler(getProjectEvent('trainee-1', 'ProjectsUnpublished'));

    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith([
      { data: toUserListItem(getUser('user-1')), type: 'user' },
    ]);
  });

  test('Should throw when fetching a user fails with another error', async () => {
    mockAlgoliaUsers(['user-1']);
    userControllerMock.fetchByIdForAlgoliaList.mockRejectedValueOnce(
      Boom.badData(),
    );

    await expect(
      indexHandler(getProjectEvent('trainee-1', 'ProjectsUnpublished')),
    ).rejects.toThrow(Boom.badData());
    expect(algoliaSearchClientMock.saveMany).not.toHaveBeenCalled();
  });

  test('Should omit non-onboarded and Hidden users', async () => {
    mockAlgoliaUsers(['user-1', 'user-not-onboarded', 'user-hidden']);
    userControllerMock.fetchByIdForAlgoliaList.mockImplementation(
      async (id) => ({
        ...getUser(id),
        onboarded: id !== 'user-not-onboarded',
        role: id === 'user-hidden' ? 'Hidden' : 'Grantee',
      }),
    );

    await indexHandler(getProjectEvent('trainee-1', 'ProjectsUnpublished'));

    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith([
      { data: toUserListItem(getUser('user-1')), type: 'user' },
    ]);
  });
});
