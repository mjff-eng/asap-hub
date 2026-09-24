import { NotFoundError } from '@asap-hub/errors';
import Boom from '@hapi/boom';
import { indexUserHandler } from '../../../src/handlers/user/algolia-index-user-handler';
import {
  getUserEvent,
  getUserListItemResponse,
  getUserResponse,
} from '../../fixtures/users.fixtures';
import {
  getTeamMembershipPublishedEvent,
  getTeamMembershipUnpublishedEvent,
  TeamMembershipEventGenerator,
} from '../../fixtures/teams.fixtures';
import { getAlgoliaSearchClientMock } from '../../mocks/algolia-client.mock';
import { userControllerMock } from '../../mocks/user.controller.mock';
import logger from '../../../src/utils/logger';

jest.mock('../../../src/utils/logger');
describe('User index handler', () => {
  const algoliaSearchClientMock = getAlgoliaSearchClientMock();
  const indexHandler = indexUserHandler(
    userControllerMock,
    algoliaSearchClientMock,
  );

  afterEach(() => jest.clearAllMocks());

  const possibleTeamMembershipEvents: [string, TeamMembershipEventGenerator][] =
    [
      ['published', getTeamMembershipPublishedEvent],
      ['unpublished', getTeamMembershipUnpublishedEvent],
    ];

  test('Should fetch the user and create a record in Algolia when the user is published', async () => {
    const event = publishedEvent();
    const userResponse = getUserResponse();
    userControllerMock.fetchByIdForAlgoliaList.mockResolvedValueOnce(
      userResponse,
    );

    await indexHandler(event);
    expect(userControllerMock.fetchByIdForAlgoliaList).toHaveBeenCalledWith(
      event.detail.resourceId,
    );

    const user = getUserListItemResponse();
    expect(algoliaSearchClientMock.save).toHaveBeenCalledWith({
      data: {
        ...user,
        avatarUrl: undefined,
        biography: 'some bio',
        contactEmail: 'T@rdy.io',
        orcid: '123-456-789',
        social: { orcid: '123-456-789' },
      },
      type: 'user',
    });
  });

  test('Should fetch the user and remove a record in Algolia when user is published but not onboarded', async () => {
    const userResponse = {
      ...getUserResponse(),
      onboarded: false,
    };
    userControllerMock.fetchByIdForAlgoliaList.mockResolvedValueOnce(
      userResponse,
    );

    await indexHandler(publishedEvent(userResponse.id));

    expect(algoliaSearchClientMock.remove).toHaveBeenCalledWith(
      userResponse.id,
    );
  });

  test('Should fetch the user and remove a record in Algolia when user is published but Hidden', async () => {
    const userResponse = getUserResponse();
    userControllerMock.fetchByIdForAlgoliaList.mockResolvedValueOnce({
      ...userResponse,
      role: 'Hidden',
    });

    await indexHandler(publishedEvent(userResponse.id));

    expect(algoliaSearchClientMock.remove).toHaveBeenCalledWith(
      userResponse.id,
    );
  });

  test('Should fetch the user and remove the record in Algolia when user is unpublished', async () => {
    const event = unpublishedEvent();

    userControllerMock.fetchByIdForAlgoliaList.mockRejectedValue(
      Boom.notFound(),
    );

    await indexHandler(event);

    expect(algoliaSearchClientMock.remove).toHaveBeenCalledWith(
      event.detail.resourceId,
    );
  });

  test('Should fetch the user and remove the record in Algolia when controller throws NotFoundError', async () => {
    const event = unpublishedEvent();

    userControllerMock.fetchByIdForAlgoliaList.mockRejectedValue(
      new NotFoundError(undefined, 'not found'),
    );

    await indexHandler(event);

    expect(algoliaSearchClientMock.remove).toHaveBeenCalledWith(
      event.detail.resourceId,
    );
  });

  test('Should populate _tags field before saving the user to Algolia', async () => {
    const event = publishedEvent();
    const userResponse = getUserResponse();
    userResponse.tags = [
      { id: '1', name: 'Bitopertin' },
      { id: '2', name: 'A53T' },
      { id: '3', name: 'Adapter ligation' },
    ];
    userControllerMock.fetchByIdForAlgoliaList.mockResolvedValueOnce(
      userResponse,
    );

    await indexHandler(event);

    expect(algoliaSearchClientMock.save).toHaveBeenCalledWith({
      data: expect.objectContaining({
        _tags: ['Bitopertin', 'A53T', 'Adapter ligation'],
      }),
      type: 'user',
    });
  });

  test('Should throw an error and do not trigger algolia when the user request fails with another error code', async () => {
    userControllerMock.fetchByIdForAlgoliaList.mockRejectedValue(
      Boom.badData(),
    );

    await expect(indexHandler(publishedEvent())).rejects.toThrow(
      Boom.badData(),
    );
    expect(algoliaSearchClientMock.remove).not.toHaveBeenCalled();
  });

  test('Should throw the algolia error when saving the record fails', async () => {
    const algoliaError = new Error('ERROR');

    userControllerMock.fetchByIdForAlgoliaList.mockResolvedValueOnce(
      getUserResponse(),
    );
    algoliaSearchClientMock.save.mockRejectedValueOnce(algoliaError);

    await expect(indexHandler(publishedEvent())).rejects.toThrow(algoliaError);
  });

  test('Should throw the algolia error when deleting the record fails', async () => {
    const algoliaError = new Error('ERROR');

    userControllerMock.fetchByIdForAlgoliaList.mockRejectedValue(
      Boom.notFound(),
    );

    algoliaSearchClientMock.remove.mockRejectedValueOnce(algoliaError);

    await expect(indexHandler(unpublishedEvent())).rejects.toThrow(
      algoliaError,
    );
  });

  // TeamMembership event tests
  test('Should throw an error and do not trigger algolia when the team membership request fails with another error code', async () => {
    userControllerMock.fetch.mockRejectedValue(Boom.badData());

    await expect(
      indexHandler(
        getTeamMembershipPublishedEvent('membership-123', 'team-456'),
      ),
    ).rejects.toThrow(Boom.badData());
    expect(algoliaSearchClientMock.save).not.toHaveBeenCalled();
  });

  test.each(possibleTeamMembershipEvents)(
    'Should index user when team membership event %s occurs',
    async (name, eventA) => {
      const userResponse = getUserResponse();
      const membershipId = 'membership-123';
      const teamId = 'team-456';

      const event = eventA(membershipId, teamId);
      userControllerMock.fetch.mockResolvedValueOnce({
        total: 1,
        items: [getUserListItemResponse()],
      });
      userControllerMock.fetchByIdForAlgoliaList.mockResolvedValueOnce(
        userResponse,
      );

      await indexHandler(event);

      // Verify that the handler uses teamMembershipId filter
      expect(userControllerMock.fetch).toHaveBeenCalledWith({
        filter: { teamMembershipId: membershipId },
        take: 1,
        skip: 0,
      });
      expect(userControllerMock.fetchByIdForAlgoliaList).toHaveBeenCalledWith(
        getUserListItemResponse().id,
      );
      expect(algoliaSearchClientMock.save).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: userResponse.id,
        }),
        type: 'user',
      });
    },
  );

  test('Should extract user ID correctly from TeamMembershipPublished event', async () => {
    const userResponse = getUserResponse();
    const membershipId = 'membership-abc123';
    const teamId = 'team-xyz789';

    const event = getTeamMembershipPublishedEvent(membershipId, teamId);
    userControllerMock.fetch.mockResolvedValueOnce({
      total: 1,
      items: [getUserListItemResponse()],
    });
    userControllerMock.fetchByIdForAlgoliaList.mockResolvedValueOnce(
      userResponse,
    );

    await indexHandler(event);

    // Verify the handler correctly uses teamMembershipId filter
    expect(userControllerMock.fetch).toHaveBeenCalledWith({
      filter: { teamMembershipId: membershipId },
      take: 1,
      skip: 0,
    });
    expect(userControllerMock.fetchByIdForAlgoliaList).toHaveBeenCalledWith(
      getUserListItemResponse().id,
    );
    expect(algoliaSearchClientMock.save).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: userResponse.id,
      }),
      type: 'user',
    });
  });

  test('Should extract user ID correctly from TeamMembershipUnpublished event', async () => {
    const userResponse = getUserResponse();
    const membershipId = 'membership-def456';
    const teamId = 'team-uvw012';

    const event = getTeamMembershipUnpublishedEvent(membershipId, teamId);
    userControllerMock.fetch.mockResolvedValueOnce({
      total: 1,
      items: [getUserListItemResponse()],
    });
    userControllerMock.fetchByIdForAlgoliaList.mockResolvedValueOnce(
      userResponse,
    );

    await indexHandler(event);

    // Verify the handler correctly uses teamMembershipId filter
    expect(userControllerMock.fetch).toHaveBeenCalledWith({
      filter: { teamMembershipId: membershipId },
      take: 1,
      skip: 0,
    });
    expect(userControllerMock.fetchByIdForAlgoliaList).toHaveBeenCalledWith(
      getUserListItemResponse().id,
    );
    expect(algoliaSearchClientMock.save).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: userResponse.id,
      }),
      type: 'user',
    });
  });

  test('Should gracefully handle TeamMembership event when no user is found', async () => {
    const membershipId = 'membership-123';
    const teamId = 'team-456';

    const event = getTeamMembershipPublishedEvent(membershipId, teamId);
    userControllerMock.fetch.mockResolvedValueOnce({
      total: 0,
      items: [],
    });

    await expect(indexHandler(event)).resolves.toBeUndefined();
    expect(userControllerMock.fetch).toHaveBeenCalledWith({
      filter: { teamMembershipId: membershipId },
      take: 1,
      skip: 0,
    });
    expect(userControllerMock.fetchByIdForAlgoliaList).not.toHaveBeenCalled();
    expect(algoliaSearchClientMock.save).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        detailType: expect.stringContaining('TeamMembership'),
        resourceId: membershipId,
      }),
      'TeamMembership event received but no associated user found',
    );
  });

  describe('Should process the events, handle race conditions and not rely on the order of the events', () => {
    test('receives the events published and unpublished in correct order', async () => {
      const userId = 'user-1234';
      const createEv = publishedEvent(userId);
      const unpublishedEv = unpublishedEvent(userId);
      const algoliaError = new Error('ERROR');

      userControllerMock.fetchByIdForAlgoliaList.mockRejectedValue(
        Boom.notFound(),
      );
      algoliaSearchClientMock.remove.mockResolvedValueOnce(undefined);
      algoliaSearchClientMock.remove.mockRejectedValue(algoliaError);

      await indexHandler(createEv);
      await expect(indexHandler(unpublishedEv)).rejects.toEqual(algoliaError);

      expect(algoliaSearchClientMock.save).not.toHaveBeenCalled();
      expect(algoliaSearchClientMock.remove).toHaveBeenCalledTimes(2);
      expect(algoliaSearchClientMock.remove).toHaveBeenCalledWith(
        unpublishedEv.detail.resourceId,
      );
    });

    test('receives the events published and unpublished in reverse order', async () => {
      const userId = 'user-1234';
      const createEv = publishedEvent(userId);
      const unpublishedEv = unpublishedEvent(userId);
      const algoliaError = new Error('ERROR');

      userControllerMock.fetchByIdForAlgoliaList.mockRejectedValue(
        Boom.notFound(),
      );
      algoliaSearchClientMock.remove.mockResolvedValueOnce(undefined);
      algoliaSearchClientMock.remove.mockRejectedValue(algoliaError);

      await indexHandler(unpublishedEv);
      await expect(indexHandler(createEv)).rejects.toEqual(algoliaError);

      expect(algoliaSearchClientMock.save).not.toHaveBeenCalled();
      expect(algoliaSearchClientMock.remove).toHaveBeenCalledTimes(2);
      expect(algoliaSearchClientMock.remove).toHaveBeenCalledWith(
        unpublishedEv.detail.resourceId,
      );
    });
  });
});

const unpublishedEvent = (id: string = 'user-1234') =>
  getUserEvent(id, 'UsersUnpublished');

const publishedEvent = (id: string = 'user-1234') =>
  getUserEvent(id, 'UsersPublished');
