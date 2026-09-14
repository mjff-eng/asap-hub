import {
  Entry,
  Environment,
  getGP2ContentfulGraphqlClientMockServer,
  gp2 as gp2Contentful,
  patchAndPublish,
} from '@asap-hub/contentful';
import { gp2 as gp2Model } from '@asap-hub/model';
import { ProjectContentfulDataProvider } from '../../src/data-providers/project.data-provider';
import { getEntry } from '../fixtures/contentful.fixtures';
import {
  getContentfulGraphqlProject,
  getContentfulGraphqlProjectMembers,
  getContentfulGraphqlProjectsByUserResponse,
  getContentfulGraphqlProjectsResponse,
  getListProjectDataObject,
  getProjectDataObject,
} from '../fixtures/project.fixtures';
import { getContentfulGraphqlClientMock } from '../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../mocks/contentful-rest-client.mock';

jest.mock('@asap-hub/contentful', () => ({
  ...jest.requireActual('@asap-hub/contentful'),
  patchAndPublish: jest.fn().mockResolvedValue(undefined),
}));
describe('Project Data Provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const projectDataProvider = new ProjectContentfulDataProvider(
    contentfulGraphqlClientMock,
    contentfulRestClientMock,
  );

  const contentfulGraphqlClientMockServer =
    getGP2ContentfulGraphqlClientMockServer({
      Projects: () => getContentfulGraphqlProject(),
    });

  const projectDataProviderWithMockServer = new ProjectContentfulDataProvider(
    contentfulGraphqlClientMockServer,
    contentfulRestClientMock,
  );
  beforeEach(jest.resetAllMocks);

  describe('FetchById', () => {
    test('Should fetch the project from graphql', async () => {
      const result = await projectDataProviderWithMockServer.fetchById('id');
      expect(result).toMatchObject(getProjectDataObject());
    });

    test('Should return null when the project is not found', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        projects: null,
      });

      expect(await projectDataProvider.fetchById('not-found')).toBeNull();
    });
    test('Should fetch remaining member pages when the collection is truncated', async () => {
      const [member] = getContentfulGraphqlProjectMembers().items;
      const other = {
        ...member,
        sys: { id: '33' },
        user: { ...member!.user, sys: { id: '12' } },
      };
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce({
          projects: {
            ...getContentfulGraphqlProject(),
            membersCollection: { total: 2, items: [member] },
          },
        })
        .mockResolvedValueOnce({
          projects: { membersCollection: { total: 2, items: [other] } },
        });

      const result = await projectDataProvider.fetchById('id');

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(2);
      expect(contentfulGraphqlClientMock.request).toHaveBeenLastCalledWith(
        gp2Contentful.FETCH_PROJECT_MEMBERS,
        { id: '7', limit: 100, skip: 1 },
      );
      expect(result?.members.map(({ userId }) => userId)).toEqual(['11', '12']);
    });
    test('the project is parsed', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        projects: getContentfulGraphqlProject(),
      });
      const projectDataObject = await projectDataProvider.fetchById('id');
      expect(projectDataObject).toEqual(getProjectDataObject());
    });
    test('pm emails are added if available', async () => {
      const email = 'tony@starkenterprises.com';
      const project = getContentfulGraphqlProject();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        projects: { ...project, pmEmail: email },
      });
      const projectDataObject = await projectDataProvider.fetchById('id');
      expect(projectDataObject?.pmEmail).toEqual(email);
    });

    test('lead emails are added if available', async () => {
      const email = 'tony@starkenterprises.com';
      const project = getContentfulGraphqlProject();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        projects: { ...project, leadEmail: email },
      });
      const projectDataObject = await projectDataProvider.fetchById('id');
      expect(projectDataObject?.leadEmail).toEqual(email);
    });

    test('description is added if available', async () => {
      const description = 'this is a description';
      const project = getContentfulGraphqlProject();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        projects: { ...project, description },
      });
      const projectDataObject = await projectDataProvider.fetchById('id');
      expect(projectDataObject?.description).toEqual(description);
    });

    describe('traineeProject', () => {
      test('if doesnt exist returns as false', async () => {
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: { ...project, traineeProject: null },
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.traineeProject).toEqual(false);
      });

      test('returns if available', async () => {
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: { ...project, traineeProject: true },
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.traineeProject).toEqual(true);
      });
    });
    describe('opportunitiesLink', () => {
      test('if doesnt exist returns as false', async () => {
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: { ...project, opportunitiesLink: null },
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.opportunitiesLink).toBeUndefined();
      });

      test('returns if available', async () => {
        const opportunitiesLink = 'https://link';
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: { ...project, opportunitiesLink },
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.opportunitiesLink).toEqual(opportunitiesLink);
      });
    });
    describe('members', () => {
      test('empty members returns empty array', async () => {
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: { ...project, membersCollection: { total: 0, items: [] } },
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.members).toEqual([]);
      });

      test('avatar urls are added if available', async () => {
        const project = getContentfulGraphqlProject();
        const url = 'http://a-avatar.url';
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: {
            ...project,
            membersCollection: {
              total: 0,
              items: [
                {
                  sys: { id: '11' },
                  role: 'Project lead',
                  user: {
                    sys: { id: '42 ' },
                    avatar: { url },
                    onboarded: true,
                  },
                },
              ],
            },
          },
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.members[0]?.avatarUrl).toEqual(url);
      });

      test.each([false, undefined])(
        'should skip the user from the result if the user is not onboarded',
        async (onboarded) => {
          const project = {
            ...getContentfulGraphqlProject(),
            membersCollection: {
              total: 1,
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
            projects: project,
          });
          const projectDataObject = await projectDataProvider.fetchById('id');
          expect(projectDataObject?.members).toEqual([]);
        },
      );

      test.each([gp2Model.projectMemberRole])(
        'should parse the role',
        async (role) => {
          const project = {
            ...getContentfulGraphqlProject(),
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
            projects: project,
          });
          const projectDataObject = await projectDataProvider.fetchById('id');
          expect(projectDataObject?.members[0]?.role).toEqual(role);
        },
      );
    });
    describe('resources', () => {
      test('should map a resource note', async () => {
        const project = {
          ...getContentfulGraphqlProject(),
          resourcesCollection: {
            total: 0,
            items: [
              {
                sys: {
                  id: '27',
                },
                type: 'Note',
                title: 'Project resource title',
                description: 'Project resource description',
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: project,
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.resources).toStrictEqual([
          {
            id: '27',
            description: 'Project resource description',
            title: 'Project resource title',
            type: 'Note',
          },
        ]);
      });
      test('should ignore an external link for a resource note', async () => {
        const project = {
          ...getContentfulGraphqlProject(),
          resourcesCollection: {
            total: 0,
            items: [
              {
                sys: {
                  id: '27',
                },
                type: 'Note',
                title: 'Project resource title',
                description: 'Project resource description',
                externalLink: 'http://example/link',
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: project,
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.resources).toStrictEqual([
          {
            id: '27',
            description: 'Project resource description',
            title: 'Project resource title',
            type: 'Note',
          },
        ]);
      });
      test('should map a resource link', async () => {
        const externalLink = 'this is an external link';
        const project = {
          ...getContentfulGraphqlProject(),
          resourcesCollection: {
            total: 0,
            items: [
              {
                sys: {
                  id: '27',
                },
                type: 'Link',
                title: 'Project resource title',
                description: 'Project resource description',
                externalLink,
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: project,
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.resources).toStrictEqual([
          {
            id: '27',
            description: 'Project resource description',
            title: 'Project resource title',
            type: 'Link',
            externalLink,
          },
        ]);
      });
      test('empty resources returns empty array', async () => {
        const project = {
          ...getContentfulGraphqlProject(),
          resourcesCollection: {
            total: 0,
            items: [],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: project,
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.resources).toEqual([]);
      });
    });
    describe('milestones', () => {
      test('empty milestones returns empty array', async () => {
        const project = {
          ...getContentfulGraphqlProject(),
          milestonesCollection: {
            total: 0,
            items: [],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: project,
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.milestones).toEqual([]);
      });
      test('if present it parses the link', async () => {
        const externalLink = 'it-is-a-link';
        const project = {
          ...getContentfulGraphqlProject(),
          milestonesCollection: {
            total: 0,
            items: [
              {
                sys: {
                  id: '23',
                },
                status: 'Active',
                title: 'A project milestone',
                externalLink,
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: project,
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.milestones[0]?.link).toEqual(externalLink);
      });
      test('if present it parses the description', async () => {
        const description = 'it-is-a-description';
        const project = {
          ...getContentfulGraphqlProject(),
          milestonesCollection: {
            total: 0,
            items: [
              {
                sys: {
                  id: '23',
                },
                status: 'Active',
                title: 'A project milestone',
                description,
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: project,
        });
        const projectDataObject = await projectDataProvider.fetchById('id');
        expect(projectDataObject?.milestones[0]?.description).toEqual(
          description,
        );
      });
    });
  });

  describe('Fetch', () => {
    const options = {
      take: 10,
      skip: 0,
    };

    test('Should fetch remaining member pages for each truncated project', async () => {
      const [member] = getContentfulGraphqlProjectMembers().items;
      const response = getContentfulGraphqlProjectsResponse();
      const project = response.projectsCollection!.items[0]!;
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce({
          projectsCollection: {
            ...response.projectsCollection,
            items: [
              {
                ...project,
                sys: { ...project.sys, id: 'project-1' },
                membersCollection: { total: 2, items: [member] },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          projects: {
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

      const result = await projectDataProvider.fetch({});

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(2);
      expect(contentfulGraphqlClientMock.request).toHaveBeenLastCalledWith(
        gp2Contentful.FETCH_PROJECT_MEMBERS,
        { id: 'project-1', limit: 100, skip: 1 },
      );
      expect(result.items[0]?.members.map(({ userId }) => userId)).toEqual([
        '11',
        '12',
      ]);
    });
    test('Should fetch the project from graphql', async () => {
      const result = await projectDataProviderWithMockServer.fetch(options);

      expect(result).toMatchObject(getListProjectDataObject());
    });

    test('Should return empty result when no projects are found', async () => {
      const mockResponse = getContentfulGraphqlProjectsResponse();
      mockResponse.projectsCollection!.items = [];
      mockResponse.projectsCollection!.total = 0;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const result = await projectDataProvider.fetch(options);
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_PROJECTS,
        expect.objectContaining({
          limit: 10,
          skip: 0,
        }),
      );
      expect(result).toEqual({ total: 0, items: [] });
    });
    test('Should call the query with no filters', async () => {
      const mockResponse = getContentfulGraphqlProjectsResponse();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const result = await projectDataProvider.fetch(options);
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_PROJECTS,
        expect.objectContaining({
          limit: 10,
          skip: 0,
        }),
      );
      expect(result).toMatchObject(getListProjectDataObject());
    });
    describe('filter by user id', () => {
      test('Should call the query with user id', async () => {
        const mockResponse = getContentfulGraphqlProjectsByUserResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);
        const userId = '42';
        const result = await projectDataProvider.fetch({
          ...options,
          filter: { userId },
        });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_PROJECTS_BY_USER,
          expect.objectContaining({
            limit: 10,
            skip: 0,
            userId,
          }),
        );
        expect(result).toMatchObject(getListProjectDataObject());
      });
      test('should return empty if no membership collection', async () => {
        const mockResponse = getContentfulGraphqlProjectsByUserResponse();
        mockResponse.projectMembershipCollection = null;

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);
        const userId = '42';
        const result = await projectDataProvider.fetch({
          ...options,
          filter: { userId },
        });
        expect(result).toMatchObject({ total: 0, items: [] });
      });
      test('should return empty if empty membership collection items', async () => {
        const mockResponse = getContentfulGraphqlProjectsByUserResponse();
        mockResponse.projectMembershipCollection!.items = [];

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);
        const userId = '42';
        const result = await projectDataProvider.fetch({
          ...options,
          filter: { userId },
        });
        expect(result).toMatchObject({ total: 0, items: [] });
      });
      test('should return empty if membership collection items is null', async () => {
        const mockResponse = getContentfulGraphqlProjectsByUserResponse();
        mockResponse.projectMembershipCollection!.items = [null];

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);
        const userId = '42';
        const result = await projectDataProvider.fetch({
          ...options,
          filter: { userId },
        });
        expect(result).toMatchObject({ total: 0, items: [] });
      });
      test('should return empty if membership collection items linkedFrom is null', async () => {
        const mockResponse = getContentfulGraphqlProjectsByUserResponse();
        mockResponse.projectMembershipCollection!.items = [
          {
            linkedFrom: null,
          },
        ];

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);
        const userId = '42';
        const result = await projectDataProvider.fetch({
          ...options,
          filter: { userId },
        });
        expect(result).toMatchObject({ total: 0, items: [] });
      });
      test('should return empty if membership collection items linkedFrom projectsCollection is null', async () => {
        const mockResponse = getContentfulGraphqlProjectsByUserResponse();
        mockResponse.projectMembershipCollection!.items = [
          {
            linkedFrom: {
              projectsCollection: null,
            },
          },
        ];

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);
        const userId = '42';
        const result = await projectDataProvider.fetch({
          ...options,
          filter: { userId },
        });
        expect(result).toMatchObject({ total: 0, items: [] });
      });
    });

    test('Should return an empty result if the client returns a response with a null items property', async () => {
      const mockResponse = getContentfulGraphqlProjectsResponse();
      mockResponse.projectsCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const result = await projectDataProvider.fetch(options);
      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return an empty result if no tags', async () => {
      const mockResponse = getContentfulGraphqlProjectsResponse();
      const project = getContentfulGraphqlProject();
      project.tagsCollection = null;
      mockResponse.projectsCollection!.items = [project];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const { items } = await projectDataProvider.fetch(options);

      expect(items[0]).toMatchObject({
        tags: [],
      });
    });

    test('Should default null title, startDate to undefined', async () => {
      const mockResponse = getContentfulGraphqlProjectsResponse();
      const project = getContentfulGraphqlProject();
      project.title = null;
      project.startDate = null;
      mockResponse.projectsCollection!.items = [project];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const { items } = await projectDataProvider.fetch(options);
      expect(items[0]).toMatchObject({
        title: '',
        startDate: undefined,
      });
    });

    test('Should default null calendars to undefined', async () => {
      const mockResponse = getContentfulGraphqlProjectsResponse();
      const project = getContentfulGraphqlProject();
      project.calendar = null;
      mockResponse.projectsCollection!.items = [project];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const { items } = await projectDataProvider.fetch(options);
      expect(items[0]).toMatchObject({
        calendar: undefined,
      });
    });
  });

  describe('Update', () => {
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
        projects: {
          sys: {
            publishedVersion: 2,
          },
          status: 'Active',
        },
      });
    });

    describe('resource', () => {
      test('It should create the Note resource and associate it to the project', async () => {
        const projectId = '11';
        const resourceId = '23';
        const createdResourceMock = getEntry({}, resourceId);
        const title = 'a title 2';
        const type = 'Note';
        const existingProjectMock = getEntry({});
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: {
            ...project,
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
        environmentMock.getEntry.mockResolvedValueOnce(existingProjectMock);
        environmentMock.createEntry.mockResolvedValueOnce(createdResourceMock);
        createdResourceMock.publish = jest
          .fn()
          .mockResolvedValueOnce(createdResourceMock);
        await projectDataProvider.update(projectId, {
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
        expect(patchAndPublish).toHaveBeenCalledWith(existingProjectMock, {
          resources: [
            { sys: { id: resourceId, linkType: 'Entry', type: 'Link' } },
          ],
        });
      });
      test('It should not remove the existing resource', async () => {
        const existingResourceId = '32';
        const projectId = '11';
        const memberId = '23';
        const createdMemberMock = getEntry({}, memberId);
        const existingProjectMock = getEntry({});
        const existingMemberMock = getEntry({}, existingResourceId);
        const unpublishSpy = jest.fn();
        const deleteSpy = jest.fn();
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: {
            ...project,
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
          .mockResolvedValueOnce(existingProjectMock)
          .mockResolvedValueOnce(existingMemberMock);
        existingMemberMock.unpublish = unpublishSpy;
        existingMemberMock.delete = deleteSpy;
        environmentMock.createEntry.mockResolvedValueOnce(createdMemberMock);
        createdMemberMock.publish = jest
          .fn()
          .mockResolvedValueOnce(createdMemberMock);
        await projectDataProvider.update(projectId, {
          members: [],
        });
        expect(unpublishSpy).not.toHaveBeenCalled();
        expect(deleteSpy).not.toHaveBeenCalled();
      });
      test('It should create the Link resource and associate it to the project', async () => {
        const projectId = '11';
        const resourceId = '23';
        const createdResourceMock = getEntry({}, resourceId);
        const title = 'a title 2';
        const description = 'a description 2';
        const externalLink = 'http://example.com/a-link';
        const type = 'Link';
        const existingProjectMock = getEntry({});
        environmentMock.getEntry.mockResolvedValueOnce(existingProjectMock);
        environmentMock.createEntry.mockResolvedValueOnce(createdResourceMock);
        createdResourceMock.publish = jest
          .fn()
          .mockResolvedValueOnce(createdResourceMock);
        await projectDataProvider.update(projectId, {
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
        expect(patchAndPublish).toHaveBeenCalledWith(existingProjectMock, {
          resources: [
            { sys: { id: resourceId, linkType: 'Entry', type: 'Link' } },
          ],
        });
      });
      test('It should delete the resource and unassociate it to the project if no resources passed', async () => {
        const projectId = '42';
        const existingResourceId = '11';
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: {
            ...project,
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
        const existingProjectMock = getEntry({}, projectId);
        const existingResourceMock = getEntry({}, existingResourceId);
        const unpublishSpy = jest.fn();
        const deleteSpy = jest.fn();
        environmentMock.getEntry
          .mockResolvedValueOnce(existingProjectMock)
          .mockResolvedValueOnce(existingResourceMock);
        existingResourceMock.unpublish = unpublishSpy;
        existingResourceMock.delete = deleteSpy;
        await projectDataProvider.update(projectId, {
          resources: [],
        });
        expect(patchAndPublish).toHaveBeenCalledWith(existingProjectMock, {
          resources: [],
        });
        expect(unpublishSpy).toBeCalled();
        expect(deleteSpy).toBeCalled();
        expect(environmentMock.createEntry).not.toBeCalled();
      });
      test('It should update the resource', async () => {
        const title = 'a title 2';
        const type = 'Note';
        const projectId = '42';
        const existingResourceId = '11';
        const existingProjectMock = getEntry({}, projectId);
        const existingResourceMock = getEntry({}, existingResourceId);
        environmentMock.getEntry
          .mockResolvedValueOnce(existingResourceMock)
          .mockResolvedValueOnce(existingProjectMock);
        await projectDataProvider.update(projectId, {
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
          existingProjectMock,
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
          const projectId = '42';
          const existingResourceId = '11';
          const project = getContentfulGraphqlProject();
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            projects: {
              ...project,
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
          const existingProjectMock = getEntry({}, projectId);
          const existingResourceMock = getEntry({}, existingResourceId);
          environmentMock.getEntry
            .mockResolvedValueOnce(existingResourceMock)
            .mockResolvedValueOnce(existingProjectMock);
          await projectDataProvider.update(projectId, {
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
            existingProjectMock,
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
        'It should not update the resource if it is the same',
        async (type) => {
          const title = 'a title 2';
          const description = 'a description';
          const externalLink = 'http://example.com/a-link';
          const projectId = '42';
          const existingResourceId = '11';
          const project = getContentfulGraphqlProject();
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            projects: {
              ...project,
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
          const existingProjectMock = getEntry({}, projectId);
          const existingResourceMock = getEntry({}, existingResourceId);
          environmentMock.getEntry
            .mockResolvedValueOnce(existingProjectMock)
            .mockResolvedValueOnce(existingResourceMock);
          const resourceToUpdate: gp2Model.Resource = {
            id: existingResourceId,
            title,
            description,
            ...(type === 'Link' ? { externalLink, type } : { type }),
          };
          await projectDataProvider.update(projectId, {
            resources: [resourceToUpdate],
          });
          expect(patchAndPublish).toHaveBeenNthCalledWith(
            1,
            existingProjectMock,
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
      test('It should create the member and associate it to the project', async () => {
        const projectId = '11';
        const memberId = '23';
        const createdMemberMock = getEntry({}, memberId);
        const userId = '42';
        const role = 'Project manager';
        const existingProjectMock = getEntry({});
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: {
            ...project,
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
        environmentMock.getEntry.mockResolvedValueOnce(existingProjectMock);
        environmentMock.createEntry.mockResolvedValueOnce(createdMemberMock);
        createdMemberMock.publish = jest
          .fn()
          .mockResolvedValueOnce(createdMemberMock);
        await projectDataProvider.update(projectId, {
          members: [{ userId, role }],
        });
        expect(environmentMock.createEntry).toHaveBeenCalledWith(
          'projectMembership',
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
        expect(patchAndPublish).toHaveBeenCalledWith(existingProjectMock, {
          members: [{ sys: { id: memberId, linkType: 'Entry', type: 'Link' } }],
        });
      });
      test('It should not remove the existing member', async () => {
        const existingMemberId = '32';
        const projectId = '11';
        const memberId = '23';
        const createdMemberMock = getEntry({}, memberId);
        const existingProjectMock = getEntry({});
        const existingMemberMock = getEntry({}, existingMemberId);
        const unpublishSpy = jest.fn();
        const deleteSpy = jest.fn();
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: {
            ...project,
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
          .mockResolvedValueOnce(existingProjectMock)
          .mockResolvedValueOnce(existingMemberMock);
        existingMemberMock.unpublish = unpublishSpy;
        existingMemberMock.delete = deleteSpy;
        environmentMock.createEntry.mockResolvedValueOnce(createdMemberMock);
        createdMemberMock.publish = jest
          .fn()
          .mockResolvedValueOnce(createdMemberMock);
        await projectDataProvider.update(projectId, {
          resources: [],
        });
        expect(unpublishSpy).not.toHaveBeenCalled();
        expect(deleteSpy).not.toHaveBeenCalled();
      });
      test('It should delete the member and unassociate it to the project if no members passed', async () => {
        const projectId = '42';
        const existingMemberId = '11';
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: {
            ...project,
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
                  role: 'Investigator',
                },
              ],
            },
          },
        });
        const existingProjectMock = getEntry({}, projectId);
        const existingMemberMock = getEntry({}, existingMemberId);
        const unpublishSpy = jest.fn();
        const deleteSpy = jest.fn();
        environmentMock.getEntry
          .mockResolvedValueOnce(existingProjectMock)
          .mockResolvedValueOnce(existingMemberMock);
        existingMemberMock.unpublish = unpublishSpy;
        existingMemberMock.delete = deleteSpy;
        await projectDataProvider.update(projectId, {
          members: [],
        });
        expect(patchAndPublish).toHaveBeenCalledWith(existingProjectMock, {
          members: [],
        });
        expect(unpublishSpy).toBeCalled();
        expect(deleteSpy).toBeCalled();
        expect(environmentMock.createEntry).not.toBeCalled();
      });
      test('It should update the member', async () => {
        const userId = '42';
        const role = 'Project manager';
        const projectId = '42';
        const existingMemberId = '11';
        const existingProjectMock = getEntry({}, projectId);
        const existingMemberMock = getEntry({}, existingMemberId);
        environmentMock.getEntry
          .mockResolvedValueOnce(existingMemberMock)
          .mockResolvedValueOnce(existingProjectMock);
        await projectDataProvider.update(projectId, {
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
          existingProjectMock,
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
        const role = 'Contributor';
        const projectId = '42';
        const existingMemberId = '11';
        const userId = '23';
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: {
            ...project,
            resourcesCollection: {
              total: 0,
              items: [],
            },
            membersCollection: {
              total: 1,
              items: [
                {
                  sys: { id: existingMemberId },
                  user: { sys: { id: userId } },
                  role,
                },
              ],
            },
          },
        });
        const existingProjectMock = getEntry({}, projectId);
        const existingMemberMock = getEntry({}, existingMemberId);
        environmentMock.getEntry
          .mockResolvedValueOnce(existingMemberMock)
          .mockResolvedValueOnce(existingProjectMock);
        await projectDataProvider.update(projectId, {
          members: [
            {
              id: existingMemberId,
              userId,
              role,
              ...(override as Partial<gp2Model.ProjectMember>),
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
          existingProjectMock,
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
        const role = 'Contributor';
        const projectId = '42';
        const existingMemberId = '11';
        const userId = '23';
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: {
            ...project,
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
        const existingProjectMock = getEntry({}, projectId);
        const existingMemberMock = getEntry({}, existingMemberId);
        environmentMock.getEntry
          .mockResolvedValueOnce(existingProjectMock)
          .mockResolvedValueOnce(existingMemberMock);
        const memberToUpdate: NonNullable<
          gp2Model.ProjectUpdateDataObject['members']
        >[number] = {
          id: existingMemberId,
          userId,
          role,
        };
        await projectDataProvider.update(projectId, {
          members: [memberToUpdate],
        });
        expect(patchAndPublish).toHaveBeenNthCalledWith(
          1,
          existingProjectMock,
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
      const existingProjectMock = getEntry({});
      environmentMock.getEntry.mockResolvedValueOnce(existingProjectMock);
      const createdResourceMock = getEntry({});
      environmentMock.createEntry.mockResolvedValueOnce(createdResourceMock);
      createdResourceMock.publish = jest
        .fn()
        .mockResolvedValueOnce(createdResourceMock);
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        projects: {
          sys: {
            publishedVersion: 1,
          },
          status: 'Active',
        },
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        projects: {
          sys: {
            publishedVersion: 1,
          },
        },
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        projects: {
          sys: {
            publishedVersion: 2,
          },
        },
      });

      await projectDataProvider.update('123', {
        resources: [{ title: 'title', type: 'Note' }],
      });
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(3);
    });

    describe('tags', () => {
      test('It should associate the tag to the project', async () => {
        const projectId = '11';
        const tagId = '23';
        const existingProjectMock = getEntry({}, projectId);
        const project = getContentfulGraphqlProject();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          projects: {
            ...project,
            tagsCollection: {
              total: 0,
              items: [],
            },
          },
        });
        environmentMock.getEntry.mockResolvedValueOnce(existingProjectMock);

        await projectDataProvider.update(projectId, {
          tags: [{ id: tagId }],
        });

        expect(patchAndPublish).toHaveBeenCalledWith(existingProjectMock, {
          tags: [{ sys: { id: tagId, linkType: 'Entry', type: 'Link' } }],
        });
      });
    });
  });
});
