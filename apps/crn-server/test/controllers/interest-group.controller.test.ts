import { NotFoundError } from '@asap-hub/errors';
import InterestGroups from '../../src/controllers/interest-group.controller';
import {
  getInterestGroupDataObject,
  getInterestGroupResponse,
} from '../fixtures/interest-groups.fixtures';
import { getUserDataObject } from '../fixtures/users.fixtures';
import { interestGroupDataProviderMock } from '../mocks/interest-group.data-provider.mock';
import { userDataProviderMock } from '../mocks/user.data-provider.mock';

describe('Group controller', () => {
  const interestGroupController = new InterestGroups(
    interestGroupDataProviderMock,
    userDataProviderMock,
  );

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch', () => {
    test('Should return the groups', async () => {
      interestGroupDataProviderMock.fetch.mockResolvedValueOnce({
        total: 1,
        items: [getInterestGroupDataObject()],
      });

      const result = await interestGroupController.fetch({});

      expect(result).toEqual({ items: [getInterestGroupResponse()], total: 1 });
    });

    test.each`
      filter                    | filterValue
      ${['Active']}             | ${{ filter: { active: true } }}
      ${['Inactive']}           | ${{ filter: { active: false } }}
      ${[]}                     | ${{}}
      ${['Active', 'Inactive']} | ${{}}
    `(
      `Should call data provider with correct filter when filter is $filter`,
      async ({ filter, filterValue }) => {
        interestGroupDataProviderMock.fetch.mockResolvedValueOnce({
          total: 1,
          items: [getInterestGroupDataObject()],
        });

        await interestGroupController.fetch({ filter });

        expect(interestGroupDataProviderMock.fetch).toBeCalledWith(filterValue);
      },
    );

    test('Should return an empty list when there are no groups', async () => {
      interestGroupDataProviderMock.fetch.mockResolvedValueOnce({
        total: 0,
        items: [],
      });
      const result = await interestGroupController.fetch({});

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('Fetch-by-ID method', () => {
    test('Should throw when group is not found', async () => {
      interestGroupDataProviderMock.fetchById.mockResolvedValueOnce(null);

      await expect(
        interestGroupController.fetchById('not-found'),
      ).rejects.toThrow(NotFoundError);
    });

    test('Should return the group when it finds it', async () => {
      interestGroupDataProviderMock.fetchById.mockResolvedValueOnce(
        getInterestGroupDataObject(),
      );
      const result = await interestGroupController.fetchById('group-id');

      expect(result).toEqual(getInterestGroupResponse());
    });
  });

  describe('Fetch-by-team-ID method', () => {
    const teamId = 'eb531b6e-195c-46e2-b347-58fb86715033';

    test('Should return the group', async () => {
      interestGroupDataProviderMock.fetch.mockResolvedValueOnce({
        total: 1,
        items: [getInterestGroupDataObject()],
      });
      const result = await interestGroupController.fetchByTeamId(teamId);

      expect(result).toEqual({ items: [getInterestGroupResponse()], total: 1 });
    });

    test('Should call the data provider with correct parameters', async () => {
      interestGroupDataProviderMock.fetch.mockResolvedValueOnce({
        total: 1,
        items: [getInterestGroupDataObject()],
      });
      await interestGroupController.fetchByTeamId(teamId);

      expect(interestGroupDataProviderMock.fetch).toHaveBeenCalledWith({
        filter: { teamId },
      });
    });

    test('Should not call the data provider if teamId is empty and should return empty result', async () => {
      const response = await interestGroupController.fetchByTeamId('');

      expect(interestGroupDataProviderMock.fetch).not.toHaveBeenCalled();
      expect(response).toEqual({ items: [], total: 0 });
    });
  });

  describe('Fetch-by-user-ID method', () => {
    const userId = 'eb531b6e-195c-46e2-b347-58fb86715033';
    const teamIds = ['team-id-1', 'team-id-3'];

    test('Should throw an error if the user is not found', async () => {
      userDataProviderMock.fetchById.mockResolvedValueOnce(null);

      await expect(
        interestGroupController.fetchByUserId(userId),
      ).rejects.toThrow(NotFoundError);
    });

    test('Should return the groups', async () => {
      userDataProviderMock.fetchById.mockResolvedValueOnce(getUserDataObject());
      interestGroupDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [getInterestGroupDataObject()],
      });
      const result = await interestGroupController.fetchByUserId(userId);

      expect(result).toEqual({ items: [getInterestGroupResponse()], total: 1 });
    });

    test('Should not call the data provider to fetch based on teams if user does not belong to any team and should return empty result', async () => {
      const userDataObject = getUserDataObject();
      userDataObject.teams = [];
      userDataProviderMock.fetchById.mockResolvedValueOnce(userDataObject);
      interestGroupDataProviderMock.fetch.mockResolvedValue({
        total: 0,
        items: [],
      });

      const response = await interestGroupController.fetchByUserId(userId);

      expect(userDataProviderMock.fetchById).toBeCalledWith(userId);
      expect(interestGroupDataProviderMock.fetch).toBeCalledTimes(1);
      expect(interestGroupDataProviderMock.fetch).toBeCalledWith({
        filter: { userId },
      });
      expect(response).toEqual({ items: [], total: 0 });
    });

    test('Should call the data provider with correct parameters', async () => {
      const userDataObject = getUserDataObject();
      userDataObject.teams = [
        {
          id: teamIds[0]!,
          role: 'Lead PI (Core Leadership)',
        },
        {
          id: teamIds[1]!,
          role: 'Lead PI (Core Leadership)',
        },
      ];
      userDataProviderMock.fetchById.mockResolvedValueOnce(userDataObject);
      interestGroupDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [getInterestGroupDataObject()],
      });

      await interestGroupController.fetchByUserId(userId);

      expect(userDataProviderMock.fetchById).toHaveBeenCalledWith(userId);
      expect(interestGroupDataProviderMock.fetch).toHaveBeenCalledTimes(3);
      expect(interestGroupDataProviderMock.fetch).toHaveBeenNthCalledWith(1, {
        filter: { teamId: teamIds[0] },
      });
      expect(interestGroupDataProviderMock.fetch).toHaveBeenNthCalledWith(2, {
        filter: { teamId: teamIds[1] },
      });
      expect(interestGroupDataProviderMock.fetch).toHaveBeenNthCalledWith(3, {
        filter: { userId },
      });
    });

    test('Should return the deduped result', async () => {
      const groupDataObject1 = getInterestGroupDataObject();
      (groupDataObject1.id as string) = 'id-1';
      const groupDataObject2 = getInterestGroupDataObject();
      (groupDataObject2.id as string) = 'id-2';

      userDataProviderMock.fetchById.mockResolvedValueOnce(getUserDataObject());
      interestGroupDataProviderMock.fetch.mockResolvedValueOnce({
        total: 2,
        items: [groupDataObject1, groupDataObject2],
      });
      interestGroupDataProviderMock.fetch.mockResolvedValueOnce({
        total: 1,
        items: [groupDataObject2],
      });
      const result = await interestGroupController.fetchByUserId(userId);

      expect(result).toEqual({
        items: [groupDataObject1, groupDataObject2],
        total: 2,
      });
    });
  });
});
