import {
  Entry,
  Environment,
  getGP2ContentfulGraphqlClientMockServer,
  gp2 as gp2Contentful,
  patchAndPublish,
} from '@asap-hub/contentful';
import { gp2 as gp2Model } from '@asap-hub/model';
import { WorkingGroupContentfulDataProvider } from '../../src/data-providers/working-group.data-provider';
import { getEntry } from '../fixtures/contentful.fixtures';
import {
  getContentfulGraphqlWorkingGroup,
  getContentfulGraphqlWorkingGroupMembers,
  getContentfulGraphqlWorkingGroupsResponse,
  getListWorkingGroupDataObject,
  getWorkingGroupDataObject,
} from '../fixtures/working-group.fixtures';
import { getContentfulGraphqlClientMock } from '../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../mocks/contentful-rest-client.mock';

jest.mock('@asap-hub/contentful', () => ({
  ...jest.requireActual('@asap-hub/contentful'),
  patchAndPublish: jest.fn().mockResolvedValue(undefined),
}));
describe('Working Group Data Provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const workingGroupDataProvider = new WorkingGroupContentfulDataProvider(
    contentfulGraphqlClientMock,
    contentfulRestClientMock,
  );

  const contentfulGraphqlClientMockServer =
    getGP2ContentfulGraphqlClientMockServer({
      WorkingGroups: () => getContentfulGraphqlWorkingGroup(),
    });

  const workinGroupDataProviderWithMockServer =
    new WorkingGroupContentfulDataProvider(
      contentfulGraphqlClientMockServer,
      contentfulRestClientMock,
    );

  beforeEach(jest.resetAllMocks);

  describe('FetchById', () => {
    test('Should fetch the working group from graphql', async () => {
      const result =
        await workinGroupDataProviderWithMockServer.fetchById('id');

      expect(result).toMatchObject(getWorkingGroupDataObject());
    });

    test('Should return null when the working group is not found', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        workingGroups: null,
      });

      expect(await workingGroupDataProvider.fetchById('not-found')).toBeNull();
    });
    test('Should fetch the remaining members when the collection is truncated', async () => {
      const [member] = getContentfulGraphqlWorkingGroupMembers().items;
      const memberWithUser = (userId: string) => ({
        ...member,
        sys: { id: `membership-${userId}` },
        user: { ...member!.user, sys: { id: userId } },
      });
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce({
          workingGroups: {
            ...getContentfulGraphqlWorkingGroup(),
            membersCollection: { total: 3, items: [memberWithUser('1')] },
          },
        })
        .mockResolvedValueOnce({
          workingGroups: {
            membersCollection: {
              total: 3,
              items: [memberWithUser('2'), memberWithUser('3')],
            },
          },
        });

      const result = await workingGroupDataProvider.fetchById('id');

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(2);
      expect(contentfulGraphqlClientMock.request).toHaveBeenLastCalledWith(
        gp2Contentful.FETCH_WORKING_GROUP_MEMBERS,
        { id: '11', limit: 100, skip: 1 },
      );
      expect(result?.members.map(({ userId }) => userId)).toEqual([
        '1',
        '2',
        '3',
      ]);
    });
    test('the working group is parsed', async () => {
      const workingGroup = getContentfulGraphqlWorkingGroup();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        workingGroups: workingGroup,
      });
      const workingGroupDataObject =
        await workingGroupDataProvider.fetchById('id');
      const expected = getWorkingGroupDataObject();
      expect(workingGroupDataObject).toEqual(expected);
    });
    test('the calendar is null is ignored', async () => {
      const workingGroup = getContentfulGraphqlWorkingGroup();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        workingGroups: { ...workingGroup, calendar: null },
      });
      const workingGroupDataObject =
        await workingGroupDataProvider.fetchById('id');
      expect(workingGroupDataObject?.calendar).toBeUndefined();
    });
    describe('members', () => {
      test('the members in working group are parsed', async () => {
        const workingGroup = getContentfulGraphqlWorkingGroup();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.members).toEqual([
          {
            id: '32',
            userId: '11',
            role: 'Lead',
            firstName: 'Tony',
            lastName: 'Stark',
            displayName: 'Tony Stark',
          },
        ]);
      });
      test('empty members returns empty array', async () => {
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          membersCollection: {
            total: 0,
            items: [],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.members).toEqual([]);
      });
      test('avatar urls are added if available', async () => {
        const url = 'http://a-avatar.url';
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          membersCollection: {
            total: 0,
            items: [
              {
                sys: { id: '11' },
                role: 'Lead',
                user: {
                  sys: { id: '42 ' },
                  avatar: { url },
                  onboarded: true,
                },
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.members[0]?.avatarUrl).toEqual(url);
      });

      test.each([false, undefined])(
        'should skip the user from the result if the user is not onboarded',
        async (onboarded) => {
          const workingGroup = {
            ...getContentfulGraphqlWorkingGroup(),
            membersCollection: {
              total: 0,
              items: [
                {
                  sys: { id: '11' },
                  role: 'Lead',
                  user: {
                    sys: { id: '42 ' },
                    onboarded,
                  },
                },
              ],
            },
          };
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            workingGroups: workingGroup,
          });
          const workingGroupDataObject =
            await workingGroupDataProvider.fetchById('id');
          expect(workingGroupDataObject?.members).toEqual([]);
        },
      );
      test.each(gp2Model.workingGroupMemberRole)(
        'should parse the role',
        async (role) => {
          const workingGroup = {
            ...getContentfulGraphqlWorkingGroup(),
            membersCollection: {
              total: 0,
              items: [
                {
                  sys: { id: '11' },
                  role,
                  user: {
                    sys: { id: '42 ' },
                    onboarded: true,
                  },
                },
              ],
            },
          };
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            workingGroups: workingGroup,
          });
          const workingGroupDataObject =
            await workingGroupDataProvider.fetchById('id');
          expect(workingGroupDataObject?.members[0]?.role).toEqual(role);
        },
      );
      test('should skip the user from the result if the user property is undefined', async () => {
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          membersCollection: {
            total: 0,
            items: [
              {
                sys: { id: '11' },
                role: 'Lead',
                user: null,
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.members).toEqual([]);
      });
      test('undefined members should return empty array', async () => {
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          membersCollection: null,
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.members).toEqual([]);
      });
    });
    describe('milestones', () => {
      test('undefined milestones returns empty array', async () => {
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          milestonesCollection: {
            total: 0,
            items: [],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.milestones).toEqual([]);
      });
      test('if present it parses the link', async () => {
        const externalLink = 'it-is-a-link';
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          milestonesCollection: {
            total: 0,
            items: [
              {
                sys: {
                  id: '23',
                },
                status: 'Active',
                title: 'A working group milestone',
                externalLink,
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.milestones[0]?.link).toEqual(
          externalLink,
        );
      });
      test('if present it parses the description', async () => {
        const description = 'it-is-a-description';
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          milestonesCollection: {
            total: 0,
            items: [
              {
                sys: {
                  id: '23',
                },
                status: 'Active',
                title: 'A working group milestone',
                description,
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.milestones[0]?.description).toEqual(
          description,
        );
      });
    });
    describe('resources', () => {
      test('should map a resource note', async () => {
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          resourcesCollection: {
            total: 0,
            items: [
              {
                sys: {
                  id: '27',
                },
                type: 'Note',
                title: 'Working group resource title',
                description: 'Working group resource description',
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.resources).toStrictEqual([
          {
            id: '27',
            description: 'Working group resource description',
            title: 'Working group resource title',
            type: 'Note',
          },
        ]);
      });
      test('should ignore an external link for a resource note', async () => {
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          resourcesCollection: {
            total: 0,
            items: [
              {
                sys: {
                  id: '27',
                },
                type: 'Note',
                title: 'Working group resource title',
                description: 'Working group resource description',
                externalLink: 'http://example/link',
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.resources).toStrictEqual([
          {
            id: '27',
            description: 'Working group resource description',
            title: 'Working group resource title',
            type: 'Note',
          },
        ]);
      });
      test('should map a resource link', async () => {
        const externalLink = 'this is an external link';
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          resourcesCollection: {
            total: 0,
            items: [
              {
                sys: {
                  id: '27',
                },
                type: 'Link',
                title: 'Working group resource title',
                description: 'Working group resource description',
                externalLink,
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.resources).toStrictEqual([
          {
            id: '27',
            description: 'Working group resource description',
            title: 'Working group resource title',
            type: 'Link',
            externalLink,
          },
        ]);
      });
      test('empty resources returns empty array', async () => {
        const workingGroup = {
          ...getContentfulGraphqlWorkingGroup(),
          resourcesCollection: {
            total: 0,
            items: [],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: workingGroup,
        });
        const workingGroupDataObject =
          await workingGroupDataProvider.fetchById('id');
        expect(workingGroupDataObject?.resources).toEqual([]);
      });
    });
  });
  describe('Fetch method', () => {
    test('Should fetch remaining member pages for each truncated working group', async () => {
      const [member] = getContentfulGraphqlWorkingGroupMembers().items;
      const response = getContentfulGraphqlWorkingGroupsResponse();
      const workingGroup = response.workingGroupsCollection!.items[0]!;
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce({
          workingGroupsCollection: {
            ...response.workingGroupsCollection,
            items: [
              {
                ...workingGroup,
                sys: { ...workingGroup.sys, id: 'wg-1' },
                membersCollection: { total: 2, items: [member] },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          workingGroups: {
            membersCollection: {
              total: 2,
              items: [
                {
                  ...member,
                  sys: { id: '33' },
                  user: { ...member!.user, sys: { id: '12' } },
                },
              ],
            },
          },
        });

      const result = await workingGroupDataProvider.fetch();

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(2);
      expect(contentfulGraphqlClientMock.request).toHaveBeenLastCalledWith(
        gp2Contentful.FETCH_WORKING_GROUP_MEMBERS,
        { id: 'wg-1', limit: 100, skip: 1 },
      );
      expect(result.items[0]?.members.map(({ userId }) => userId)).toEqual([
        '11',
        '12',
      ]);
    });
    test('Should fetch the working group from graphql', async () => {
      const result = await workinGroupDataProviderWithMockServer.fetch();

      expect(result).toMatchObject(getListWorkingGroupDataObject());
    });

    test('Should return an empty result', async () => {
      const mockResponse = getContentfulGraphqlWorkingGroupsResponse();
      mockResponse.workingGroupsCollection!.items = [];
      mockResponse.workingGroupsCollection!.total = 0;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const result = await workingGroupDataProvider.fetch();
      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return an empty result if the client returns a response with a null items property', async () => {
      const mockResponse = getContentfulGraphqlWorkingGroupsResponse();
      mockResponse.workingGroupsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const result = await workingGroupDataProvider.fetch();
      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should default null title, shortDescription and leadingMembers to an empty string', async () => {
      const mockResponse = getContentfulGraphqlWorkingGroupsResponse();
      const workingGroup = getContentfulGraphqlWorkingGroup();
      workingGroup.title = null;
      workingGroup.shortDescription = null;
      workingGroup.leadingMembers = null;
      mockResponse.workingGroupsCollection!.items = [workingGroup];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const { items } = await workingGroupDataProvider.fetch();
      expect(items[0]).toMatchObject({
        title: '',
        shortDescription: '',
        leadingMembers: '',
      });
    });

    test('Should default null calendars to undefined', async () => {
      const mockResponse = getContentfulGraphqlWorkingGroupsResponse();
      const workingGroup = getContentfulGraphqlWorkingGroup();
      workingGroup.calendar = null;
      mockResponse.workingGroupsCollection!.items = [workingGroup];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const { items } = await workingGroupDataProvider.fetch();
      expect(items[0]).toMatchObject({
        calendar: undefined,
      });
    });
  });
  describe('update method', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      const mockPatchAndPublish = patchAndPublish as jest.MockedFunction<
        typeof patchAndPublish
      >;
      mockPatchAndPublish.mockResolvedValue({
        sys: {
          publishedVersion: 2,
        },
      } as Entry);
      contentfulGraphqlClientMock.request.mockResolvedValue({
        workingGroups: {
          sys: {
            publishedVersion: 2,
          },
        },
      });
    });

    describe('resource', () => {
      test('It should create the Note resource and associate it to the working group', async () => {
        const workingGroupId = '11';
        const resourceId = '32';
        const createdResourceMock = getEntry({}, resourceId);
        const title = 'a title 2';
        const type = 'Note';
        const existingWorkingGroupMock = getEntry({});
        environmentMock.getEntry.mockResolvedValueOnce(
          existingWorkingGroupMock,
        );
        environmentMock.createEntry.mockResolvedValueOnce(createdResourceMock);
        createdResourceMock.publish = jest
          .fn()
          .mockResolvedValueOnce(createdResourceMock);
        await workingGroupDataProvider.update(workingGroupId, {
          resources: [{ title, type }],
        });
        expect(environmentMock.createEntry).toHaveBeenCalledWith('resources', {
          fields: {
            description: { 'en-US': undefined },
            externalLink: { 'en-US': undefined },
            title: { 'en-US': title },
            type: { 'en-US': type },
          },
        });

        expect(createdResourceMock.publish).toHaveBeenCalled();
        expect(patchAndPublish).toHaveBeenCalledWith(existingWorkingGroupMock, {
          resources: [
            { sys: { id: resourceId, linkType: 'Entry', type: 'Link' } },
          ],
        });
      });
      test('It should not remove the existing resource', async () => {
        const existingResourceId = '32';
        const workingGroupId = '11';
        const memberId = '23';
        const createdMemberMock = getEntry({}, memberId);
        const userId = '42';
        const role = 'Lead';
        const existingWorkingGroupMock = getEntry({});
        const existingMemberMock = getEntry({}, existingResourceId);
        const unpublishSpy = jest.fn();
        const deleteSpy = jest.fn();
        const workingGroup = getContentfulGraphqlWorkingGroup();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: {
            ...workingGroup,
            resourcesCollection: {
              total: 0,
              items: [
                {
                  sys: { id: existingResourceId },
                },
              ],
            },
            membersCollection: {
              total: 1,
              items: [],
            },
          },
        });
        environmentMock.getEntry
          .mockResolvedValueOnce(existingWorkingGroupMock)
          .mockResolvedValueOnce(existingMemberMock);
        existingMemberMock.unpublish = unpublishSpy;
        existingMemberMock.delete = deleteSpy;
        environmentMock.createEntry.mockResolvedValueOnce(createdMemberMock);
        createdMemberMock.publish = jest
          .fn()
          .mockResolvedValueOnce(createdMemberMock);
        await workingGroupDataProvider.update(workingGroupId, {
          members: [{ userId, role }],
        });
        expect(unpublishSpy).not.toHaveBeenCalled();
        expect(deleteSpy).not.toHaveBeenCalled();
      });
      test('It should create the Link resource and associate it to the working group', async () => {
        const workingGroupId = '11';
        const resourceId = '11';
        const createdResourceMock = getEntry({}, resourceId);
        const title = 'a title 2';
        const description = 'a description 2';
        const externalLink = 'http://example.com/a-link';
        const type = 'Link';
        const existingWorkingGroupMock = getEntry({});
        environmentMock.getEntry.mockResolvedValueOnce(
          existingWorkingGroupMock,
        );
        environmentMock.createEntry.mockResolvedValueOnce(createdResourceMock);
        createdResourceMock.publish = jest
          .fn()
          .mockResolvedValueOnce(createdResourceMock);
        await workingGroupDataProvider.update(workingGroupId, {
          resources: [{ title, type, externalLink, description }],
        });
        expect(environmentMock.createEntry).toHaveBeenCalledWith('resources', {
          fields: {
            description: { 'en-US': description },
            externalLink: { 'en-US': externalLink },
            title: { 'en-US': title },
            type: { 'en-US': type },
          },
        });

        expect(createdResourceMock.publish).toHaveBeenCalled();
        expect(patchAndPublish).toHaveBeenCalledWith(existingWorkingGroupMock, {
          resources: [
            { sys: { id: resourceId, linkType: 'Entry', type: 'Link' } },
          ],
        });
      });
      test('It should delete the resource and unassociate it to the working group if no resources passed', async () => {
        const workingGroupId = '42';
        const existingResourceId = '11';
        const workingGroup = getContentfulGraphqlWorkingGroup();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: {
            ...workingGroup,
            resourcesCollection: {
              total: 1,
              items: [
                {
                  sys: { id: existingResourceId },
                },
              ],
            },
            membersCollection: {
              total: 0,
              items: [],
            },
          },
        });
        const existingWorkingGroupMock = getEntry({}, workingGroupId);
        const existingResourceMock = getEntry({}, existingResourceId);
        const unpublishSpy = jest.fn();
        const deleteSpy = jest.fn();
        environmentMock.getEntry
          .mockResolvedValueOnce(existingWorkingGroupMock)
          .mockResolvedValueOnce(existingResourceMock);
        existingResourceMock.unpublish = unpublishSpy;
        existingResourceMock.delete = deleteSpy;
        await workingGroupDataProvider.update(workingGroupId, {
          resources: [],
        });
        expect(patchAndPublish).toHaveBeenCalledWith(existingWorkingGroupMock, {
          resources: [],
        });
        expect(unpublishSpy).toBeCalled();
        expect(deleteSpy).toBeCalled();
        expect(environmentMock.createEntry).not.toBeCalled();
      });
      test('It should update the resource', async () => {
        const title = 'a title 2';
        const type = 'Note';
        const workingGroupId = '42';
        const existingResourceId = '11';
        const existingWorkingGroupMock = getEntry({}, workingGroupId);
        const existingResourceMock = getEntry({}, existingResourceId);
        environmentMock.getEntry
          .mockResolvedValueOnce(existingResourceMock)
          .mockResolvedValueOnce(existingWorkingGroupMock);
        await workingGroupDataProvider.update(workingGroupId, {
          resources: [{ id: existingResourceId, title, type }],
        });
        expect(patchAndPublish).toHaveBeenNthCalledWith(
          1,
          existingResourceMock,
          {
            title,
            type,
          },
        );
        expect(patchAndPublish).toHaveBeenNthCalledWith(
          2,
          existingWorkingGroupMock,
          {
            resources: [
              {
                sys: {
                  id: existingResourceId,
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        );
        expect(environmentMock.createEntry).not.toBeCalled();
      });
      test.each([
        {
          title: 'new title',
        },
        {
          description: 'new title',
        },
        {
          type: 'Note' as const,
        },
        {
          externalLink: 'http://example.com/new-link',
        },
      ])(
        'It should update the resource if it has changed',
        async (override) => {
          const title = 'a title 2';
          const type = 'Link' as const;
          const description = 'a description';
          const externalLink = 'http://example.com/a-link';
          const workingGroupId = '42';
          const existingResourceId = '11';
          const workingGroup = getContentfulGraphqlWorkingGroup();
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            workingGroups: {
              ...workingGroup,
              membersCollection: {
                total: 0,
                items: [],
              },
              resourcesCollection: {
                total: 1,
                items: [
                  {
                    sys: { id: existingResourceId },
                    title,
                    type,
                    description,
                    externalLink,
                  },
                ],
              },
            },
          });
          const existingWorkingGroupMock = getEntry({}, workingGroupId);
          const existingResourceMock = getEntry({}, existingResourceId);
          environmentMock.getEntry
            .mockResolvedValueOnce(existingResourceMock)
            .mockResolvedValueOnce(existingWorkingGroupMock);
          await workingGroupDataProvider.update(workingGroupId, {
            resources: [
              {
                id: existingResourceId,
                title,
                type,
                externalLink,
                description,
                ...override,
              },
            ],
          });
          expect(patchAndPublish).toHaveBeenNthCalledWith(
            1,
            existingResourceMock,
            {
              title,
              type,
              description,
              externalLink,
              ...override,
            },
          );
          expect(patchAndPublish).toHaveBeenNthCalledWith(
            2,
            existingWorkingGroupMock,
            {
              resources: [
                {
                  sys: {
                    id: existingResourceId,
                    linkType: 'Entry',
                    type: 'Link',
                  },
                },
              ],
            },
          );
          expect(environmentMock.createEntry).not.toBeCalled();
        },
      );
      test.each<gp2Model.Resource['type']>(['Link', 'Note'])(
        'It should not update the resource only if it is the same',
        async (type) => {
          const title = 'a title 2';
          const description = 'a description';
          const externalLink = 'http://example.com/a-link';
          const workingGroupId = '42';
          const existingResourceId = '11';
          const workingGroup = getContentfulGraphqlWorkingGroup();
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            workingGroups: {
              ...workingGroup,
              resourcesCollection: {
                total: 1,
                items: [
                  {
                    sys: { id: existingResourceId },
                    title,
                    type,
                    description,
                    ...(type === 'Link' ? { externalLink } : {}),
                  },
                ],
              },
            },
          });
          const existingWorkingGroupMock = getEntry({}, workingGroupId);
          const existingResourceMock = getEntry({}, existingResourceId);
          environmentMock.getEntry
            .mockResolvedValueOnce(existingWorkingGroupMock)
            .mockResolvedValueOnce(existingResourceMock);
          const resourceToUpdate: gp2Model.Resource = {
            id: existingResourceId,
            title,
            description,
            ...(type === 'Link' ? { externalLink, type } : { type }),
          };
          await workingGroupDataProvider.update(workingGroupId, {
            resources: [resourceToUpdate],
          });
          expect(patchAndPublish).toHaveBeenNthCalledWith(
            1,
            existingWorkingGroupMock,
            {
              resources: [
                {
                  sys: {
                    id: existingResourceId,
                    linkType: 'Entry',
                    type: 'Link',
                  },
                },
              ],
            },
          );
          expect(environmentMock.createEntry).not.toBeCalled();
        },
      );
    });
    describe('members', () => {
      test('It should create the member and associate it to the working group', async () => {
        const workingGroupId = '11';
        const memberId = '23';
        const createdMemberMock = getEntry({}, memberId);
        const userId = '42';
        const role = 'Lead';
        const existingworkingGroupMock = getEntry({});
        const workingGroup = getContentfulGraphqlWorkingGroup();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: {
            ...workingGroup,
            resourcesCollection: {
              total: 0,
              items: [],
            },
            membersCollection: {
              total: 0,
              items: [],
            },
          },
        });
        environmentMock.getEntry.mockResolvedValueOnce(
          existingworkingGroupMock,
        );
        environmentMock.createEntry.mockResolvedValueOnce(createdMemberMock);
        createdMemberMock.publish = jest
          .fn()
          .mockResolvedValueOnce(createdMemberMock);
        await workingGroupDataProvider.update(workingGroupId, {
          members: [{ userId, role }],
        });
        expect(environmentMock.createEntry).toHaveBeenCalledWith(
          'workingGroupMembership',
          {
            fields: {
              role: { 'en-US': role },
              user: {
                'en-US': {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: userId,
                  },
                },
              },
            },
          },
        );

        expect(createdMemberMock.publish).toHaveBeenCalled();
        expect(patchAndPublish).toHaveBeenCalledWith(existingworkingGroupMock, {
          members: [{ sys: { id: memberId, linkType: 'Entry', type: 'Link' } }],
        });
      });
      test('It should not remove the existing member', async () => {
        const existingMemberId = '32';
        const workingGroupId = '11';
        const memberId = '23';
        const createdMemberMock = getEntry({}, memberId);
        const existingWorkingGroupMock = getEntry({});
        const existingMemberMock = getEntry({}, existingMemberId);
        const unpublishSpy = jest.fn();
        const deleteSpy = jest.fn();
        const workingGroup = getContentfulGraphqlWorkingGroup();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: {
            ...workingGroup,
            resourcesCollection: {
              total: 0,
              items: [],
            },
            membersCollection: {
              total: 1,
              items: [
                {
                  sys: { id: existingMemberId },
                  role: 'Investigator',
                  user: { sys: { id: '32' }, onboarded: true },
                },
              ],
            },
          },
        });
        environmentMock.getEntry
          .mockResolvedValueOnce(existingWorkingGroupMock)
          .mockResolvedValueOnce(existingMemberMock);
        existingMemberMock.unpublish = unpublishSpy;
        existingMemberMock.delete = deleteSpy;
        environmentMock.createEntry.mockResolvedValueOnce(createdMemberMock);
        createdMemberMock.publish = jest
          .fn()
          .mockResolvedValueOnce(createdMemberMock);
        await workingGroupDataProvider.update(workingGroupId, {
          resources: [],
        });
        expect(unpublishSpy).not.toHaveBeenCalled();
        expect(deleteSpy).not.toHaveBeenCalled();
      });
      test('It should delete the member and unassociate it to the working group if no members passed', async () => {
        const workingGroupId = '42';
        const existingMemberId = '11';
        const workingGroup = getContentfulGraphqlWorkingGroup();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: {
            ...workingGroup,
            resourcesCollection: {
              total: 0,
              items: [],
            },
            membersCollection: {
              total: 1,
              items: [
                {
                  sys: { id: existingMemberId },
                  user: { sys: { id: '32' }, onboarded: true },
                  role: 'Lead',
                },
              ],
            },
          },
        });
        const existingworkingGroupMock = getEntry({}, workingGroupId);
        const existingMemberMock = getEntry({}, existingMemberId);
        const unpublishSpy = jest.fn();
        const deleteSpy = jest.fn();
        environmentMock.getEntry
          .mockResolvedValueOnce(existingworkingGroupMock)
          .mockResolvedValueOnce(existingMemberMock);
        existingMemberMock.unpublish = unpublishSpy;
        existingMemberMock.delete = deleteSpy;
        await workingGroupDataProvider.update(workingGroupId, {
          members: [],
        });
        expect(patchAndPublish).toHaveBeenCalledWith(existingworkingGroupMock, {
          members: [],
        });
        expect(unpublishSpy).toBeCalled();
        expect(deleteSpy).toBeCalled();
        expect(environmentMock.createEntry).not.toBeCalled();
      });
      test('It should update the member', async () => {
        const userId = '42';
        const role = 'Lead';
        const workingGroupId = '42';
        const existingMemberId = '11';
        const existingworkingGroupMock = getEntry({}, workingGroupId);
        const existingMemberMock = getEntry({}, existingMemberId);
        environmentMock.getEntry
          .mockResolvedValueOnce(existingMemberMock)
          .mockResolvedValueOnce(existingworkingGroupMock);
        await workingGroupDataProvider.update(workingGroupId, {
          members: [{ id: existingMemberId, userId, role }],
        });
        expect(patchAndPublish).toHaveBeenNthCalledWith(1, existingMemberMock, {
          role,
          user: {
            sys: {
              id: userId,
              linkType: 'Entry',
              type: 'Link',
            },
          },
        });
        expect(patchAndPublish).toHaveBeenNthCalledWith(
          2,
          existingworkingGroupMock,
          {
            members: [
              {
                sys: {
                  id: existingMemberId,
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        );
        expect(environmentMock.createEntry).not.toBeCalled();
      });
      test.each([
        {
          role: 'new role',
        },
        {
          userId: 'new user',
        },
      ])('It should update the member if has changed', async (override) => {
        const role = 'Lead';
        const workingGroupId = '42';
        const existingMemberId = '11';
        const userId = '23';
        const workingGroup = getContentfulGraphqlWorkingGroup();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: {
            ...workingGroup,
            resourcesCollection: {
              total: 0,
              items: [],
            },
            membersCollection: {
              total: 1,
              items: [
                {
                  user: { sys: { id: userId } },
                  role,
                },
              ],
            },
          },
        });
        const existingworkingGroupMock = getEntry({}, workingGroupId);
        const existingMemberMock = getEntry({}, existingMemberId);
        environmentMock.getEntry
          .mockResolvedValueOnce(existingMemberMock)
          .mockResolvedValueOnce(existingworkingGroupMock);
        await workingGroupDataProvider.update(workingGroupId, {
          members: [
            {
              id: existingMemberId,
              userId,
              role,
              ...(override as Partial<gp2Model.WorkingGroupMember>),
            },
          ],
        });
        expect(patchAndPublish).toHaveBeenNthCalledWith(1, existingMemberMock, {
          user: {
            sys: {
              id: override.userId ?? userId,
              linkType: 'Entry',
              type: 'Link',
            },
          },
          role: override.role ?? role,
        });
        expect(patchAndPublish).toHaveBeenNthCalledWith(
          2,
          existingworkingGroupMock,
          {
            members: [
              {
                sys: {
                  id: existingMemberId,
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        );
        expect(environmentMock.createEntry).not.toBeCalled();
      });
      test('It should not update the member if it is the same', async () => {
        const role = 'Lead';
        const workingGroupId = '42';
        const existingMemberId = '11';
        const userId = '23';
        const workingGroup = getContentfulGraphqlWorkingGroup();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: {
            ...workingGroup,
            membersCollection: {
              total: 1,
              items: [
                {
                  sys: { id: existingMemberId },
                  role,
                  user: {
                    sys: { id: userId },
                    onboarded: true,
                  },
                },
              ],
            },
          },
        });
        const existingworkingGroupMock = getEntry({}, workingGroupId);
        const existingMemberMock = getEntry({}, existingMemberId);
        environmentMock.getEntry
          .mockResolvedValueOnce(existingworkingGroupMock)
          .mockResolvedValueOnce(existingMemberMock);
        const memberToUpdate: NonNullable<
          gp2Model.WorkingGroupUpdateDataObject['members']
        >[number] = {
          id: existingMemberId,
          userId,
          role,
        };
        await workingGroupDataProvider.update(workingGroupId, {
          members: [memberToUpdate],
        });
        expect(patchAndPublish).toHaveBeenNthCalledWith(
          1,
          existingworkingGroupMock,
          {
            members: [
              {
                sys: {
                  id: existingMemberId,
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        );
        expect(environmentMock.createEntry).not.toBeCalled();
      });
    });
    test('checks version of published data and polls until they match', async () => {
      const existingWorkingGroupMock = getEntry({});
      environmentMock.getEntry.mockResolvedValueOnce(existingWorkingGroupMock);
      const createdResourceMock = getEntry({});
      environmentMock.createEntry.mockResolvedValueOnce(createdResourceMock);
      createdResourceMock.publish = jest
        .fn()
        .mockResolvedValueOnce(createdResourceMock);
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        workingGroups: {
          sys: {
            publishedVersion: 1,
          },
        },
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        workingGroups: {
          sys: {
            publishedVersion: 1,
          },
        },
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        workingGroups: {
          sys: {
            publishedVersion: 2,
          },
        },
      });

      await workingGroupDataProvider.update('123', {
        resources: [{ title: 'title', type: 'Note' }],
      });
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(3);
    });

    describe('tags', () => {
      test('It should associate the tag to the working groups', async () => {
        const workingGroupId = '11';
        const tagId = '23';
        const existingWorkingGroupMock = getEntry({});
        const workingGroup = getContentfulGraphqlWorkingGroup();

        environmentMock.getEntry.mockResolvedValueOnce(
          existingWorkingGroupMock,
        );

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroup: {
            ...workingGroup,
            tagsCollection: {
              total: 0,
              items: [],
            },
          },
        });

        await workingGroupDataProvider.update(workingGroupId, {
          tags: [{ id: tagId }],
        });

        expect(patchAndPublish).toHaveBeenCalledWith(existingWorkingGroupMock, {
          tags: [{ sys: { id: tagId, linkType: 'Entry', type: 'Link' } }],
        });
      });
    });
  });
});
