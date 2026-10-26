import Boom from '@hapi/boom';
import { indexTeamUsersHandler } from '../../../src/handlers/teams/algolia-index-team-users-handler';
import { toUserListItem } from '@asap-hub/model';
import {
  getListUserResponse,
  getUserListItemResponse,
  getUserResponse,
} from '../../fixtures/users.fixtures';

import {
  getTeamPublishedEvent,
  TeamEventGenerator,
  getTeamUnpublishedEvent,
} from '../../fixtures/teams.fixtures';

import { getAlgoliaSearchClientMock } from '../../mocks/algolia-client.mock';
import { userControllerMock } from '../../mocks/user.controller.mock';

jest.mock('../../../src/utils/logger');

const algoliaSearchClientMock = getAlgoliaSearchClientMock();

const possibleRacingConditionEvents: [
  string,
  TeamEventGenerator,
  TeamEventGenerator,
][] = [
  ['published and unpublished', getTeamPublishedEvent, getTeamUnpublishedEvent],
  ['unpublished and published', getTeamUnpublishedEvent, getTeamPublishedEvent],
];

describe('Index Users on Team event handler', () => {
  const indexHandler = indexTeamUsersHandler(
    userControllerMock,
    algoliaSearchClientMock,
  );
  afterEach(() => jest.clearAllMocks());

  test('Should throw an error and do not trigger algolia when the team request fails with another error code', async () => {
    userControllerMock.fetch.mockRejectedValue(Boom.badData());

    await expect(
      indexHandler(getTeamPublishedEvent('team-1234')),
    ).rejects.toThrow(Boom.badData());
    expect(algoliaSearchClientMock.saveMany).not.toHaveBeenCalled();
  });

  test('Should throw the algolia error when saving the record fails', async () => {
    const algoliaError = new Error('ERROR');

    userControllerMock.fetch.mockResolvedValueOnce(getListUserResponse());
    algoliaSearchClientMock.saveMany.mockRejectedValueOnce(algoliaError);

    await expect(
      indexHandler(getTeamPublishedEvent('team-1234')),
    ).rejects.toThrow(algoliaError);
  });

  test('Should omit non-onboarded and Hidden users', async () => {
    const userResponse = getUserListItemResponse();
    userControllerMock.fetch.mockResolvedValueOnce({
      total: 3,
      items: [
        userResponse,
        { ...userResponse, role: 'Hidden' },
        { ...userResponse, onboarded: false },
      ],
    });

    await indexHandler(getTeamPublishedEvent('lab-1234'));

    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith([
      {
        data: userResponse,
        type: 'user',
      },
    ]);
  });

  test('Should index the users of the team when the team is published', async () => {
    const usersResponse = getListUserResponse();
    userControllerMock.fetch.mockResolvedValueOnce(usersResponse);

    await indexHandler(getTeamPublishedEvent('team-1234'));

    expect(userControllerMock.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ filter: { teamId: 'team-1234' } }),
    );
    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith(
      usersResponse.items.map((item) => ({
        data: item,
        type: 'user',
      })),
    );
  });

  test('Should reindex the users that list the team in Algolia when the team is unpublished', async () => {
    const users = ['user-1', 'user-2'].map((id) => ({
      ...getUserResponse(),
      id,
    }));
    algoliaSearchClientMock.search.mockResolvedValueOnce({
      hits: users.map(toUserListItem),
    } as never);
    userControllerMock.fetchByIdForAlgoliaList.mockImplementation(
      async (id) => ({ ...getUserResponse(), id }),
    );

    await indexHandler(getTeamUnpublishedEvent('team-1234'));

    expect(algoliaSearchClientMock.search).toHaveBeenCalledWith(['user'], '', {
      filters: 'teams.id:"team-1234"',
      hitsPerPage: 1000,
    });
    expect(userControllerMock.fetchByIdForAlgoliaList).toHaveBeenCalledWith(
      'user-1',
    );
    expect(userControllerMock.fetchByIdForAlgoliaList).toHaveBeenCalledWith(
      'user-2',
    );
    expect(userControllerMock.fetch).not.toHaveBeenCalled();
    expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith(
      users.map((user) => ({ data: toUserListItem(user), type: 'user' })),
    );
  });

  describe('Should process the events, handle race conditions and not rely on the order of the events', () => {
    test.each(possibleRacingConditionEvents)(
      'receives the events %s when team exists',
      async (name, eventA, eventB) => {
        const userID = 'user-1234';
        const usersResponse = {
          ...getListUserResponse(),
          id: userID,
        };
        const userResponse = getUserResponse();
        userControllerMock.fetch.mockResolvedValue(usersResponse);
        algoliaSearchClientMock.search.mockResolvedValue({
          hits: [toUserListItem(userResponse)],
        } as never);
        userControllerMock.fetchByIdForAlgoliaList.mockResolvedValue(
          userResponse,
        );

        await indexHandler(eventA(userID));
        await indexHandler(eventB(userID));

        expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledTimes(2);
        expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith(
          usersResponse.items.map((item) => ({
            data: item,
            type: 'user',
          })),
        );
        expect(algoliaSearchClientMock.saveMany).toHaveBeenCalledWith([
          { data: toUserListItem(userResponse), type: 'user' },
        ]);
      },
    );
  });
});
