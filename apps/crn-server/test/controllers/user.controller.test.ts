import { GenericError, NotFoundError } from '@asap-hub/errors';
import nock from 'nock';
import Users from '../../src/controllers/user.controller';
import {
  AssetCreateData,
  AssetDataProvider,
} from '../../src/data-providers/types';
import * as orcidFixtures from '../fixtures/orcid.fixtures';
import {
  getPublicUserDataObject,
  getPublicUserResponse,
  getUserDataObject,
  getUserListItemDataObject,
  getUserListItemResponse,
  getUserResponse,
} from '../fixtures/users.fixtures';
import { getDataProviderMock } from '../mocks/data-provider.mock';
import { userDataProviderMock } from '../mocks/user.data-provider.mock';

describe('Users controller', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    nock.cleanAll();
  });
  const assetDataProviderMock: jest.Mocked<AssetDataProvider> =
    getDataProviderMock();
  const researchTagDataProviderMock = getDataProviderMock();
  const userController = new Users(
    userDataProviderMock,
    assetDataProviderMock,
    researchTagDataProviderMock,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch', () => {
    test('Should return the users', async () => {
      userDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [getUserListItemDataObject()],
      });
      const result = await userController.fetch({});

      expect(result).toEqual({ items: [getUserListItemResponse()], total: 1 });
    });

    test('Should return empty list when there are no users', async () => {
      userDataProviderMock.fetch.mockResolvedValue({ total: 0, items: [] });
      const result = await userController.fetch({});

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('FetchPublicUsers', () => {
    test('Should return the users', async () => {
      userDataProviderMock.fetchPublicUsers.mockResolvedValue({
        total: 1,
        items: [getPublicUserDataObject()],
      });
      const result = await userController.fetchPublicUsers({});

      expect(result).toEqual({ items: [getPublicUserResponse()], total: 1 });
    });

    test('Should return empty list when there are no users', async () => {
      userDataProviderMock.fetchPublicUsers.mockResolvedValue({
        total: 0,
        items: [],
      });
      const result = await userController.fetchPublicUsers({});

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('FetchById', () => {
    test('Should throw when user is not found', async () => {
      userDataProviderMock.fetchById.mockResolvedValue(null);

      await expect(userController.fetchById('not-found')).rejects.toThrow(
        NotFoundError,
      );
    });

    test('Should return the user when it finds it', async () => {
      userDataProviderMock.fetchById.mockResolvedValue(getUserDataObject());
      const result = await userController.fetchById('user-id');

      expect(result).toEqual(getUserResponse());
    });

    test('Should default onboarded flag to true when its null', async () => {
      const userData = getUserDataObject();
      userData.onboarded = null;
      userDataProviderMock.fetchById.mockResolvedValue(userData);
      const result = await userController.fetchById('user-id');

      expect(result?.onboarded).toEqual(true);
    });

    describe('Display name', () => {
      test('Should drop nickname when not available', async () => {
        const user = getUserDataObject();
        user.firstName = 'John';
        user.lastName = 'Smith';
        delete user.middleName;
        delete user.nickname;

        userDataProviderMock.fetchById.mockResolvedValue(user);
        const { displayName } = await userController.fetchById(user.id);

        expect(displayName).toEqual('John Smith');
      });

      test('Should put any nickname in brackets', async () => {
        const user = getUserDataObject();
        user.firstName = 'John';
        user.nickname = 'R2 D2';
        user.lastName = 'Smith';
        delete user.middleName;

        userDataProviderMock.fetchById.mockResolvedValue(user);
        const { displayName } = await userController.fetchById(user.id);

        expect(displayName).toEqual('John (R2 D2) Smith');
      });
    });

    describe('Full display name', () => {
      test('Should drop middle name when not available', async () => {
        const user = getUserDataObject();
        user.firstName = 'John';
        user.lastName = 'Smith';
        delete user.middleName;
        delete user.nickname;

        userDataProviderMock.fetchById.mockResolvedValue(user);
        const { fullDisplayName } = await userController.fetchById(user.id);

        expect(fullDisplayName).toEqual('John Smith');
      });

      test('Should use all middle name initials', async () => {
        const user = getUserDataObject();
        user.firstName = 'John';
        user.middleName = 'Wilbur Thomas Geofrey';
        user.lastName = 'Smith';
        delete user.nickname;

        userDataProviderMock.fetchById.mockResolvedValue(user);
        const { fullDisplayName } = await userController.fetchById(user.id);

        expect(fullDisplayName).toEqual('John W. T. G. Smith');
      });

      test('Should correctly display all names if provided', async () => {
        const user = getUserDataObject();
        user.firstName = 'John';
        user.middleName = 'Wilbur Thomas Geofrey';
        user.lastName = 'Smith';
        user.nickname = 'Jack';

        userDataProviderMock.fetchById.mockResolvedValue(user);
        const { fullDisplayName } = await userController.fetchById(user.id);

        expect(fullDisplayName).toEqual('John (Jack) W. T. G. Smith');
      });
    });
  });

  describe('FetchByIdForAlgoliaList', () => {
    test('Should throw when user is not found', async () => {
      userDataProviderMock.fetchByIdForAlgoliaList.mockResolvedValue(null);

      await expect(
        userController.fetchByIdForAlgoliaList('not-found'),
      ).rejects.toThrow(NotFoundError);
    });

    test('Should return the user when it finds it', async () => {
      const userListItem = getUserListItemDataObject();
      const { _tags: _ignoredTags, ...userListItemWithoutTags } = userListItem;

      userDataProviderMock.fetchByIdForAlgoliaList.mockResolvedValue(
        userListItem,
      );
      const result = await userController.fetchByIdForAlgoliaList('user-id');

      expect(result).toMatchObject({
        ...userListItemWithoutTags,
        displayName: 'Tom (Iron Man) Hardy',
        fullDisplayName: 'Tom (Iron Man) E. Hardy',
        onboarded: true,
        dismissedGettingStarted: false,
      });
      expect(result.id).toBe('user-id-1');
      expect(result.teams).toEqual([
        {
          id: 'team-id-0',
          role: 'Lead PI (Core Leadership)',
          displayName: 'Team A',
        },
      ]);
    });

    test('Should return the individual projects of the user', async () => {
      const individualProjects = [
        {
          id: 'project-1',
          title: 'Trainee Project',
          projectType: 'Trainee Project' as const,
          status: 'Active',
          role: 'Trainee',
        },
      ];
      userDataProviderMock.fetchByIdForAlgoliaList.mockResolvedValue({
        ...getUserListItemDataObject(),
        individualProjects,
      });
      const result = await userController.fetchByIdForAlgoliaList('user-id');

      expect(result.individualProjects).toEqual(individualProjects);
    });

    test('Should default onboarded flag to true when its null', async () => {
      const userData = getUserListItemDataObject();
      userData.onboarded = null;
      userDataProviderMock.fetchByIdForAlgoliaList.mockResolvedValue(userData);
      const result = await userController.fetchByIdForAlgoliaList('user-id');

      expect(result?.onboarded).toEqual(true);
    });

    test('Should call data provider with correct id', async () => {
      userDataProviderMock.fetchByIdForAlgoliaList.mockResolvedValue(
        getUserListItemDataObject(),
      );
      await userController.fetchByIdForAlgoliaList('user-id');

      expect(userDataProviderMock.fetchByIdForAlgoliaList).toHaveBeenCalledWith(
        'user-id',
      );
    });
  });

  describe('fetchByCode', () => {
    const code = 'some-uuid-code';

    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('Should return the users', async () => {
      userDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [getUserListItemResponse()],
      });

      userDataProviderMock.fetchById.mockResolvedValue(
        getUserListItemResponse(),
      );

      const result = await userController.fetchByCode(code);

      expect(result).toEqual(getUserListItemResponse());
    });

    test('Should call the data provider with correct parameters', async () => {
      userDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [getUserListItemResponse()],
      });

      userDataProviderMock.fetchById.mockResolvedValue(
        getUserListItemResponse(),
      );

      await userController.fetchByCode(code);

      expect(userDataProviderMock.fetch).toHaveBeenCalledWith({
        filter: { code, hidden: false, onboarded: false },
        take: 1,
        skip: 0,
      });
    });

    test('Should throw 404 when no user is found', async () => {
      userDataProviderMock.fetch.mockResolvedValue({ total: 0, items: [] });

      await expect(userController.fetchByCode(code)).rejects.toThrow(
        NotFoundError,
      );
    });

    test('Should throw when it finds more than one user', async () => {
      userDataProviderMock.fetch.mockResolvedValue({
        total: 2,
        items: [getUserDataObject(), getUserDataObject()],
      });

      await expect(userController.fetchByCode(code)).rejects.toThrow(
        GenericError,
      );
    });

    test('throws if user is not found', async () => {
      userDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [getUserListItemResponse()],
      });

      userDataProviderMock.fetchById.mockReturnValue(null);

      await expect(userController.fetchByCode(code)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      const mockResponse = getUserDataObject();
      userDataProviderMock.fetchById.mockResolvedValue(mockResponse);
    });
    test('Should return the newly updated user', async () => {
      const result = await userController.update('user-id', {});

      expect(result).toEqual(getUserResponse());
      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        'user-id',
        {},
        { suppressConflict: false, polling: true },
      );
    });

    test('Should reject if tag id does not exist', async () => {
      researchTagDataProviderMock.fetchById.mockResolvedValueOnce(null);
      await expect(
        userController.update('user-id', { tagIds: ['wrong-id'] }),
      ).rejects.toThrow(
        expect.objectContaining({
          data: [
            {
              instancePath: '/tags',
              keyword: 'exist',
              message: 'must exist',
              params: {
                type: 'string',
              },
              schemaPath: '#/properties/tags/exist',
            },
          ],
        }),
      );
    });

    test('Should call data provider with options', async () => {
      const result = await userController.update(
        'user-id',
        {},
        { suppressConflict: true, polling: false },
      );

      expect(result).toEqual(getUserResponse());
      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        'user-id',
        {},
        { suppressConflict: true, polling: false },
      );
    });
  });

  describe('updateAvatar', () => {
    beforeEach(nock.cleanAll);

    test('should return 200 when syncs asset and updates users profile', async () => {
      assetDataProviderMock.create.mockResolvedValueOnce({
        id: '42',
        filename: 'test.png',
        url: '',
      });
      userDataProviderMock.fetchById.mockResolvedValueOnce(getUserDataObject());
      const result = await userController.updateAvatar(
        'user-id',
        Buffer.from('avatar'),
        'image/jpeg',
      );

      expect(result).toEqual(getUserResponse());
      expect(nock.isDone()).toBe(true);
      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        'user-id',
        {
          avatar: '42',
        },
        { suppressConflict: false, polling: true },
      );
      expect(assetDataProviderMock.create).toHaveBeenCalledWith({
        id: 'user-id',
        title: 'Avatar',
        description: 'Avatar',
        content: Buffer.from('avatar'),
        contentType: 'image/jpeg',
      } satisfies AssetCreateData);
      expect(userDataProviderMock.fetchById).toHaveBeenCalledWith(
        'user-id',
        false,
      );
    });
  });

  describe('removeAvatar', () => {
    test('clears the avatar and returns the updated user', async () => {
      userDataProviderMock.fetchById.mockResolvedValueOnce(getUserDataObject());

      const result = await userController.removeAvatar('user-id');

      expect(result).toEqual(getUserResponse());
      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        'user-id',
        {
          avatar: null,
        },
        { suppressConflict: false, polling: true },
      );
      expect(userDataProviderMock.fetchById).toHaveBeenCalledWith(
        'user-id',
        false,
      );
    });
  });

  describe('connectByCode', () => {
    test('should replace the welcome code with the connection code and return the user on success', async () => {
      const userId = '42';
      const user = getUserDataObject();
      const welcomeCode = 'welcome-code';
      user.connections = [{ code: welcomeCode }];
      userDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [{ ...user, id: userId }],
      });

      userDataProviderMock.fetchById.mockResolvedValue({ ...user, id: userId });

      const result = await userController.connectByCode(welcomeCode, 'user-id');

      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        userId,
        {
          email: user.email,
          connections: [{ code: 'user-id' }],
        },
        { suppressConflict: false, polling: false },
      );
      expect(result).toEqual({
        ...getUserResponse(),
        id: userId,
      });
    });

    test('should keep the existing connections when creating a new one', async () => {
      const userId = '42';
      const user = getUserDataObject();
      const existingConnection = 'auth0|123456';
      const welcomeCode = 'welcome-code';
      user.connections = [{ code: existingConnection }, { code: welcomeCode }];
      userDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [{ ...user, id: userId }],
      });
      userDataProviderMock.fetchById.mockResolvedValue({ ...user, id: userId });
      await userController.connectByCode(welcomeCode, 'user-id');

      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        userId,
        {
          email: user.email,
          connections: expect.arrayContaining([
            {
              code: existingConnection,
            },
          ]),
        },
        { suppressConflict: false, polling: false },
      );
    });

    test('Shouldnt do anything if connecting with existing code', async () => {
      const userId = '42';
      const userCode = 'google-oauth2|token';
      userDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [
          {
            ...getUserDataObject(),
            id: userId,
            connections: [{ code: userCode }],
          },
        ],
      });
      userDataProviderMock.fetchById.mockResolvedValue({
        ...getUserDataObject(),
        id: userId,
        connections: [{ code: userCode }],
      });
      const result = await userController.connectByCode(
        'asapWelcomeCode',
        userCode,
      );

      expect(userDataProviderMock.update).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
    test('throws if no user is returned', async () => {
      userDataProviderMock.fetch.mockResolvedValue({ total: 0, items: [] });

      await expect(
        userController.connectByCode('some code', 'user-id'),
      ).rejects.toThrow(NotFoundError);
    });

    test('throws if user is not found', async () => {
      userDataProviderMock.fetch.mockResolvedValue({
        total: 1,
        items: [
          {
            ...getUserDataObject(),
            connections: [{ code: 'google-oauth2|token' }],
          },
        ],
      });
      userDataProviderMock.fetchById.mockReturnValue(null);

      await expect(
        userController.connectByCode('some code', 'user-id'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('syncOrcidProfile', () => {
    const userId = 'userId';
    const orcid = '0000-0001-9884-1913';

    test('should successfully fetch and update user - with id', async () => {
      const user = { ...getUserDataObject(), orcid };
      userDataProviderMock.fetchById.mockResolvedValue(user);

      nock('https://pub.orcid.org')
        .get(`/v2.1/${orcid}/works`)
        .reply(200, orcidFixtures.orcidWorksResponse);

      const result = await userController.syncOrcidProfile(userId);

      expect(userDataProviderMock.update).toHaveBeenCalled();
      expect(result).toEqual({ ...getUserResponse(), orcid });
      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          email: user.email,
          orcidLastModifiedDate: '2020-07-14T01:36:15.911Z',
          orcidWorks: orcidFixtures.orcidWorksDeserialisedExpectation,
        }),
        { suppressConflict: true, polling: false },
      );
    });

    test('successfully fetch and update user - with user', async () => {
      const user = { ...getUserDataObject(), orcid };
      userDataProviderMock.fetchById.mockResolvedValue(user);

      nock('https://pub.orcid.org')
        .get(`/v2.1/${orcid}/works`)
        .reply(200, orcidFixtures.orcidWorksResponse);

      const result = await userController.syncOrcidProfile(userId, {
        ...getUserResponse(),
        email: 'cache-user-email',
        orcid,
      });

      expect(userDataProviderMock.update).toHaveBeenCalled();
      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          email: 'cache-user-email',
          orcidLastModifiedDate: '2020-07-14T01:36:15.911Z',
          orcidWorks: orcidFixtures.orcidWorksDeserialisedExpectation,
        }),
        { suppressConflict: true, polling: false },
      );
      expect(result).toEqual({ ...getUserResponse(), orcid });
    });

    test('Should update user profile orcidLastSyncDate when ORCID returns 500', async () => {
      const user = { ...getUserDataObject(), orcid };
      userDataProviderMock.fetchById.mockResolvedValue(user);

      nock('https://pub.orcid.org')
        .get(`/v2.1/${orcid}/works`)
        .times(3)
        .reply(502, orcidFixtures.orcidWorksResponse);

      const result = await userController.syncOrcidProfile(userId, {
        ...getUserResponse(),
        email: user.email,
        orcid,
      });

      expect(userDataProviderMock.update).toHaveBeenCalled();
      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        user.id,
        {
          email: user.email,
          orcidLastSyncDate: expect.any(String),
        },
        { suppressConflict: true, polling: false },
      );
      expect(result).toEqual({ ...getUserResponse(), orcid });
    });

    test('Should update user profile orcidLastSyncDate when last-modified-date is null', async () => {
      const user = { ...getUserDataObject(), orcid };
      userDataProviderMock.fetchById.mockResolvedValue(user);

      const orcidWorksResponse = {
        ...orcidFixtures.orcidWorksResponse,
      };
      orcidWorksResponse['last-modified-date'] = null;

      nock('https://pub.orcid.org')
        .get(`/v2.1/${orcid}/works`)
        .reply(200, orcidWorksResponse);

      await userController.syncOrcidProfile(userId);

      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        user.id,
        {
          email: user.email,
          orcidLastSyncDate: expect.any(String),
        },
        { suppressConflict: true, polling: false },
      );
    });

    test('Throws when user does not exist', async () => {
      userDataProviderMock.fetchById.mockResolvedValue(null);

      await expect(
        userController.syncOrcidProfile('user-not-found'),
      ).rejects.toThrow(NotFoundError);
    });

    test('should convert the modified date to ISO before sending to data provider', async () => {
      const user = { ...getUserDataObject(), orcid };
      userDataProviderMock.fetchById.mockResolvedValue(user);

      const orcidWorksResponse = {
        ...orcidFixtures.orcidWorksResponse,
      };
      orcidWorksResponse['last-modified-date'] = { value: 1594690575911 };

      nock('https://pub.orcid.org')
        .get(`/v2.1/${orcid}/works`)
        .reply(200, orcidWorksResponse);

      await userController.syncOrcidProfile(userId);

      expect(userDataProviderMock.update).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({
          orcidLastModifiedDate: new Date(
            orcidFixtures.orcidWorksResponse['last-modified-date']!.value,
          ).toISOString(),
        }),
        { suppressConflict: true, polling: false },
      );
    });

    describe('ORCID validation', () => {
      test('should skip sync and return early when ORCID is undefined', async () => {
        const user = { ...getUserDataObject(), id: userId, orcid: undefined };
        userDataProviderMock.fetchById.mockResolvedValue(user);

        const result = await userController.syncOrcidProfile(userId);

        expect(nock.pendingMocks()).toHaveLength(0);
        expect(userDataProviderMock.update).not.toHaveBeenCalled();
        expect(result).toEqual({
          ...getUserResponse(),
          id: userId,
          orcid: undefined,
        });
      });

      test('should skip sync and return early when ORCID is empty string', async () => {
        const user = { ...getUserDataObject(), id: userId, orcid: '' };
        userDataProviderMock.fetchById.mockResolvedValue(user);

        const result = await userController.syncOrcidProfile(userId);

        expect(nock.pendingMocks()).toHaveLength(0);
        expect(userDataProviderMock.update).not.toHaveBeenCalled();
        expect(result).toEqual({ ...getUserResponse(), id: userId, orcid: '' });
      });

      test('should skip sync and return early when ORCID is placeholder "-"', async () => {
        const user = { ...getUserDataObject(), id: userId, orcid: '-' };
        userDataProviderMock.fetchById.mockResolvedValue(user);

        const result = await userController.syncOrcidProfile(userId);

        expect(nock.pendingMocks()).toHaveLength(0);
        expect(userDataProviderMock.update).not.toHaveBeenCalled();
        expect(result).toEqual({
          ...getUserResponse(),
          id: userId,
          orcid: '-',
        });
      });

      test('should skip sync when ORCID has wrong format (too short)', async () => {
        const user = {
          ...getUserDataObject(),
          id: userId,
          orcid: '363-98-9330',
        };
        userDataProviderMock.fetchById.mockResolvedValue(user);

        const result = await userController.syncOrcidProfile(userId);

        expect(nock.pendingMocks()).toHaveLength(0);
        expect(userDataProviderMock.update).not.toHaveBeenCalled();
        expect(result).toEqual({
          ...getUserResponse(),
          id: userId,
          orcid: '363-98-9330',
        });
      });

      test('should skip sync when ORCID has wrong format (missing hyphens)', async () => {
        const user = {
          ...getUserDataObject(),
          id: userId,
          orcid: '00000000198841913',
        };
        userDataProviderMock.fetchById.mockResolvedValue(user);

        const result = await userController.syncOrcidProfile(userId);

        expect(nock.pendingMocks()).toHaveLength(0);
        expect(userDataProviderMock.update).not.toHaveBeenCalled();
        expect(result).toEqual({
          ...getUserResponse(),
          id: userId,
          orcid: '00000000198841913',
        });
      });

      test('should skip sync when ORCID has wrong format (non-numeric)', async () => {
        const user = {
          ...getUserDataObject(),
          id: userId,
          orcid: 'abcd-efgh-ijkl-mnop',
        };
        userDataProviderMock.fetchById.mockResolvedValue(user);

        const result = await userController.syncOrcidProfile(userId);

        expect(nock.pendingMocks()).toHaveLength(0);
        expect(userDataProviderMock.update).not.toHaveBeenCalled();
        expect(result).toEqual({
          ...getUserResponse(),
          id: userId,
          orcid: 'abcd-efgh-ijkl-mnop',
        });
      });

      test('should proceed with sync when ORCID format is valid', async () => {
        const user = { ...getUserDataObject(), id: userId, orcid };
        userDataProviderMock.fetchById.mockResolvedValue(user);

        nock('https://pub.orcid.org')
          .get(`/v2.1/${orcid}/works`)
          .reply(200, orcidFixtures.orcidWorksResponse);

        await userController.syncOrcidProfile(userId);

        expect(nock.isDone()).toBe(true);
        expect(userDataProviderMock.update).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({
            email: user.email,
            orcidLastSyncDate: expect.any(String),
          }),
          { suppressConflict: true, polling: false },
        );
      });
    });
  });
});
