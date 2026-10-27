import { GraphQLError } from 'graphql';
import {
  getContentfulGraphqlClientMockServer,
  Environment,
} from '@asap-hub/contentful';
import { DeliverableStatus } from '@asap-hub/model';
import { when } from 'jest-when';

import {
  getContentfulGraphql,
  getWorkingGroupDataObject,
  getContentfulGraphqlWorkingGroup,
  getContentfulWorkingGroupGraphqlResponse,
  getContentfulWorkingGroupsGraphqlResponse,
} from '../../fixtures/working-groups.fixtures';
import { getContentfulGraphqlClientMock } from '../../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../../mocks/contentful-rest-client.mock';
import { WorkingGroupContentfulDataProvider } from '../../../src/data-providers/contentful/working-group.data-provider';
import logger from '../../../src/utils/logger';
import { getEntry } from '../../fixtures/contentful.fixtures';

describe('Working Groups data provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const workingGroupDataProvider = new WorkingGroupContentfulDataProvider(
    contentfulGraphqlClientMock,
    contentfulRestClientMock,
  );

  const contentfulGraphqlClientMockServer =
    getContentfulGraphqlClientMockServer(getContentfulGraphql());

  const workingGroupDataProviderMock = new WorkingGroupContentfulDataProvider(
    contentfulGraphqlClientMockServer,
    contentfulRestClientMock,
  );

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch method', () => {
    test('Should fetch the list of working groups from Contentful GraphQl', async () => {
      const result = await workingGroupDataProviderMock.fetch({});

      expect(result).toMatchObject({
        total: 1,
        items: [getWorkingGroupDataObject()],
      });
    });

    test('Should return an empty result when the query is returned as null', async () => {
      const contentfulGraphQLResponse =
        getContentfulWorkingGroupsGraphqlResponse();
      contentfulGraphQLResponse.workingGroupsCollection = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await workingGroupDataProvider.fetch({});

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    test('Should return an empty result if items from workingGroupsCollection comes as null', async () => {
      const contentfulGraphQLResponse = {
        workingGroupsCollection: {
          items: null,
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await workingGroupDataProvider.fetch({});

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    test('Should throw an error with a specific error message when the graphql client throws one', async () => {
      contentfulGraphqlClientMock.request.mockRejectedValueOnce(
        new GraphQLError('some error message'),
      );

      await expect(workingGroupDataProvider.fetch({})).rejects.toThrow(
        'some error message',
      );
    });

    test('Should apply pagination parameters', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulWorkingGroupsGraphqlResponse(),
      );

      await workingGroupDataProvider.fetch({
        take: 13,
        skip: 3,
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          limit: 13,
          skip: 3,
        }),
      );
    });

    test('Should pass default pagination parameters', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulWorkingGroupsGraphqlResponse(),
      );
      await workingGroupDataProvider.fetch({});

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          limit: 10,
          skip: 0,
        }),
      );
    });

    test('should query with single term search filters', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulWorkingGroupsGraphqlResponse(),
      );

      await workingGroupDataProvider.fetch({ search: 'test' });
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            AND: [
              {
                OR: [
                  { title_contains: 'test' },
                  { description_contains: 'test' },
                  { shortText_contains: 'test' },
                ],
              },
            ],
          },
        }),
      );
    });

    test('should query with multiple term search filters', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulWorkingGroupsGraphqlResponse(),
      );

      await workingGroupDataProvider.fetch({ search: 'test search' });
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            AND: [
              {
                OR: [
                  { title_contains: 'test' },
                  { description_contains: 'test' },
                  { shortText_contains: 'test' },
                ],
              },
              {
                OR: [
                  { title_contains: 'search' },
                  { description_contains: 'search' },
                  { shortText_contains: 'search' },
                ],
              },
            ],
          },
        }),
      );
    });

    test('should apply an complete filter if defined', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulWorkingGroupsGraphqlResponse(),
      );

      await workingGroupDataProvider.fetch({ filter: { complete: false } });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            AND: [{ complete: false }],
          },
        }),
      );
    });

    test('can apply an active filter as well as a text search', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulWorkingGroupsGraphqlResponse(),
      );

      await workingGroupDataProvider.fetch({
        filter: { complete: true },
        search: 'test',
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            AND: [
              {
                OR: [
                  { title_contains: 'test' },
                  { description_contains: 'test' },
                  { shortText_contains: 'test' },
                ],
              },
              { complete: true },
            ],
          },
        }),
      );
    });
  });

  describe('Fetch-by-id method', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('Should fetch the workingGroup from Contentful GraphQl', async () => {
      const workingGroupId = 'workingGroup-id-0';
      const result =
        await workingGroupDataProviderMock.fetchById(workingGroupId);

      expect(result).toMatchObject(getWorkingGroupDataObject());
    });

    test('Should return null when the workingGroup is not found', async () => {
      const workingGroupId = 'not-found';

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        workingGroups: null,
      });

      expect(
        await workingGroupDataProvider.fetchById(workingGroupId),
      ).toBeNull();
    });

    test('Should throw an error with a specific error message when the graphql client throws one', async () => {
      const id = 'some-id';
      contentfulGraphqlClientMock.request.mockRejectedValueOnce(
        new GraphQLError('some error message'),
      );

      await expect(workingGroupDataProvider.fetchById(id)).rejects.toThrow(
        'some error message',
      );
    });

    test('Should return the result when the workingGroup exists', async () => {
      const id = 'some-id';

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulWorkingGroupGraphqlResponse(),
      );

      const result = await workingGroupDataProvider.fetchById(id);

      expect(result).toEqual(getWorkingGroupDataObject());
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id,
        }),
      );
    });

    test('Should return externalLink when it is not null', async () => {
      const id = 'some-id';
      const contentfulGraphQLResponse =
        getContentfulWorkingGroupGraphqlResponse();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const response = await workingGroupDataProvider.fetchById(id);

      expect(response).toHaveProperty('externalLink');
    });

    test('Should not return externalLink when it is null', async () => {
      const id = 'some-id';
      const contentfulGraphQLResponse =
        getContentfulWorkingGroupGraphqlResponse();
      contentfulGraphQLResponse.workingGroups!.externalLink = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );
      const response = await workingGroupDataProvider.fetchById(id);

      expect(response).not.toHaveProperty('externalLink');
    });

    test('Should default description to an empty string', async () => {
      const id = 'some-id';
      const contentfulGraphQLResponse =
        getContentfulWorkingGroupGraphqlResponse();
      contentfulGraphQLResponse.workingGroups!.description = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const response = await workingGroupDataProvider.fetchById(id);

      expect(response!.description).toBe('');
    });

    test('Should default title to an empty string', async () => {
      const id = 'some-id';
      const contentfulGraphQLResponse =
        getContentfulWorkingGroupGraphqlResponse();
      contentfulGraphQLResponse.workingGroups!.title = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );
      const response = await workingGroupDataProvider.fetchById(id);

      expect(response!.title).toBe('');
    });

    test('Should return researchOutputsIds when they exist', async () => {
      const id = 'some-id';
      const contentfulGraphQLResponse =
        getContentfulWorkingGroupGraphqlResponse();
      contentfulGraphQLResponse.workingGroups!.linkedFrom = {
        researchOutputsCollection: {
          items: [
            { sys: { id: 'research-output-1' } },
            { sys: { id: 'research-output-2' } },
          ],
        },
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );
      const publicAPI = true;
      const response = await workingGroupDataProvider.fetchById(id, publicAPI);

      expect(response!.researchOutputsIds).toEqual([
        'research-output-1',
        'research-output-2',
      ]);
    });

    test('Should filter out null researchOutputsIds', async () => {
      const id = 'some-id';
      const contentfulGraphQLResponse =
        getContentfulWorkingGroupGraphqlResponse();
      contentfulGraphQLResponse.workingGroups!.linkedFrom = {
        researchOutputsCollection: {
          items: [null, { sys: { id: 'research-output-2' } }],
        },
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );
      const publicAPI = true;
      const response = await workingGroupDataProvider.fetchById(id, publicAPI);

      expect(response!.researchOutputsIds).toEqual(['research-output-2']);
    });

    describe('calendars', () => {
      test('should return calendar if there is one', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse =
          getContentfulWorkingGroupGraphqlResponse();

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );
        const response = await workingGroupDataProvider.fetchById(id);

        expect(response!.calendars).toEqual([
          {
            id: 'hub@asap.science',
            name: 'ASAP Hub',
            color: '#B1365F',
            interestGroups: [],
            workingGroups: [],
            crnCalendar: false,
            seminarSeries: false,
          },
        ]);
      });

      test('should return empty calendars if there is not any', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse =
          getContentfulWorkingGroupGraphqlResponse();
        contentfulGraphQLResponse.workingGroups!.calendars = null;
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );
        const response = await workingGroupDataProvider.fetchById(id);

        expect(response!.calendars).toEqual([]);
      });
    });

    describe('deliverables', () => {
      test('should return deliverables if there is any', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse =
          getContentfulWorkingGroupGraphqlResponse();
        contentfulGraphQLResponse.workingGroups!.deliverablesCollection = {
          items: [
            {
              description: 'Deliverable 1',
              status: 'In Progress',
            },
            {
              description: 'Deliverable 2',
              status: 'Complete',
            },
          ],
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );
        const response = await workingGroupDataProvider.fetchById(id);

        expect(response!.deliverables).toEqual([
          { description: 'Deliverable 1', status: 'In Progress' },
          { description: 'Deliverable 2', status: 'Complete' },
        ]);
      });

      test('should return empty deliverables if they do not exist', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse =
          getContentfulWorkingGroupGraphqlResponse();
        contentfulGraphQLResponse.workingGroups!.deliverablesCollection = null;
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );
        const response = await workingGroupDataProvider.fetchById(id);

        expect(response!.deliverables).toEqual([]);
      });

      test('should filter null deliverablesCollection items', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse =
          getContentfulWorkingGroupGraphqlResponse();
        contentfulGraphQLResponse.workingGroups!.deliverablesCollection = {
          items: [
            null,
            {
              description: 'Deliverable 1',
              status: 'In Progress',
            },
          ],
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );
        const response = await workingGroupDataProvider.fetchById(id);

        expect(response!.deliverables).toEqual([
          { description: 'Deliverable 1', status: 'In Progress' },
        ]);
      });

      test('should normalise deliverable statuses for complete working groups', async () => {
        const contentfulGraphQLResponse =
          getContentfulWorkingGroupGraphqlResponse();
        contentfulGraphQLResponse.workingGroups!.complete = true;
        contentfulGraphQLResponse.workingGroups!.deliverablesCollection = {
          items: [
            { description: 'Deliverable 1', status: 'Complete' },
            { description: 'Deliverable 2', status: 'In Progress' },
            { description: 'Deliverable 3', status: 'Pending' },
          ],
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );

        const response = await workingGroupDataProvider.fetchById('wg-0');

        expect(response?.deliverables).toEqual([
          { description: 'Deliverable 1', status: 'Complete' },
          { description: 'Deliverable 2', status: 'Incomplete' },
          { description: 'Deliverable 3', status: 'Not Started' },
        ]);
      });

      test('should normalise deliverable statuses for incomplete working groups', async () => {
        const contentfulGraphQLResponse =
          getContentfulWorkingGroupGraphqlResponse();
        contentfulGraphQLResponse.workingGroups!.complete = false;
        contentfulGraphQLResponse.workingGroups!.deliverablesCollection = {
          items: [
            { description: 'Deliverable 1', status: 'Complete' },
            { description: 'Deliverable 2', status: 'Incomplete' },
            { description: 'Deliverable 3', status: 'Not Started' },
          ],
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );

        const response = await workingGroupDataProvider.fetchById('wg-0');

        expect(response?.deliverables).toEqual([
          { description: 'Deliverable 1', status: 'Complete' },
          { description: 'Deliverable 2', status: 'In Progress' },
          { description: 'Deliverable 3', status: 'Pending' },
        ]);
      });
    });

    describe('leaders and members', () => {
      test('should return leaders and members', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = {
          workingGroups: {
            ...getContentfulGraphqlWorkingGroup(),
            membersCollection: {
              items: [
                {
                  __typename: 'WorkingGroupLeaders',
                  workstreamRole: 'PM',
                  role: 'Project Manager',
                  inactiveSinceDate: null,
                  user: {
                    sys: {
                      id: 'leader-1',
                    },
                    avatar: null,
                    email: 'johndoe@gmail.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    alumniSinceDate: null,
                    teamsCollection: {
                      items: [
                        {
                          role: 'Project Manager',
                          team: {
                            sys: {
                              id: 'team-1',
                            },
                            displayName: 'Team 1',
                          },
                          awardsCollection: {
                            items: [
                              {
                                date: '2025-09-11',
                                awardType: {
                                  name: 'Open Science Champion',
                                  smallIcon: {
                                    url: 'https://example.com/avatar.jpg',
                                  },
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  __typename: 'WorkingGroupMembers',
                  inactiveSinceDate: '2023-05-25T00:00:00.000-03:00',
                  user: {
                    sys: {
                      id: 'member-1',
                    },
                    avatar: {
                      url: 'https://images.ctfassets.net/a01453c.png',
                    },
                    email: 'jane@gmail.com',
                    firstName: 'Jane',
                    lastName: 'Doe',
                    alumniSinceDate: null,
                    teamsCollection: {
                      items: [
                        {
                          role: 'Trainee',
                          team: {
                            sys: {
                              id: 'team-2',
                            },
                            displayName: 'Team 2',
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );

        const result = await workingGroupDataProvider.fetchById(id);

        expect(result!.leaders).toHaveLength(1);
        expect(result!.leaders[0]?.user).toEqual({
          alumniSinceDate: null,
          avatarUrl: undefined,
          displayName: 'John Doe',
          email: 'johndoe@gmail.com',
          firstName: 'John',
          id: 'leader-1',
          lastName: 'Doe',
          teams: [
            {
              displayName: 'Team 1',
              id: 'team-1',
              inactiveSinceDate: undefined,
              role: 'Project Manager',
              teamInactiveSince: '',
            },
          ],
          latestAward: {
            name: 'Open Science Champion',
            date: '2025-09-11',
            smallIconUrl: 'https://example.com/avatar.jpg',
          },
        });
        expect(result!.members).toHaveLength(1);
        expect(result!.members[0]?.user).toEqual({
          alumniSinceDate: null,
          avatarUrl: 'https://images.ctfassets.net/a01453c.png',
          displayName: 'Jane Doe',
          email: 'jane@gmail.com',
          firstName: 'Jane',
          id: 'member-1',
          lastName: 'Doe',
          teams: [
            {
              displayName: 'Team 2',
              id: 'team-2',
              inactiveSinceDate: undefined,
              role: 'Trainee',
              teamInactiveSince: '',
            },
          ],
        });
      });

      test('should return empty leaders and members if they do not exist', async () => {
        const id = 'some-id';

        const contentfulGraphQLResponse = getContentfulGraphqlWorkingGroup();
        contentfulGraphQLResponse.membersCollection = null;

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          workingGroups: contentfulGraphQLResponse,
        });

        const result = await workingGroupDataProvider.fetchById(id);

        expect(result!.members).toStrictEqual([]);
        expect(result!.leaders).toStrictEqual([]);
      });

      test('should filter null membersCollection items', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = {
          workingGroups: {
            ...getContentfulGraphqlWorkingGroup(),
            membersCollection: {
              items: [
                null,
                {
                  __typename: 'WorkingGroupMembers',
                  inactiveSinceDate: '2023-05-25T00:00:00.000-03:00',
                  user: {
                    sys: {
                      id: 'member-1',
                    },
                    avatar: {
                      url: 'https://images.ctfassets.net/a01453c.png',
                    },
                    email: 'jane@gmail.com',
                    firstName: 'Jane',
                    lastName: 'Doe',
                    alumniSinceDate: null,
                  },
                },
              ],
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );

        const result = await workingGroupDataProvider.fetchById(id);

        expect(result!.members).toHaveLength(1);
        expect(result!.leaders).toHaveLength(0);
      });
    });

    describe('tags', () => {
      test('should return tags if there is any', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse =
          getContentfulWorkingGroupGraphqlResponse();
        contentfulGraphQLResponse.workingGroups!.tagsCollection = {
          items: [
            {
              name: 'Neurobehavioral',
            },
            {
              name: 'Lysosomes',
            },
          ],
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );
        const response = await workingGroupDataProvider.fetchById(id);

        expect(response!.tags).toEqual(['Neurobehavioral', 'Lysosomes']);
      });

      test('should return empty tags if they do not exist', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse =
          getContentfulWorkingGroupGraphqlResponse();
        contentfulGraphQLResponse.workingGroups!.tagsCollection = null;
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );
        const response = await workingGroupDataProvider.fetchById(id);

        expect(response!.tags).toEqual([]);
      });

      test('should filter null tag items', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse =
          getContentfulWorkingGroupGraphqlResponse();
        contentfulGraphQLResponse.workingGroups!.tagsCollection = {
          items: [
            null,
            {
              name: 'Lysosomes',
            },
          ],
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          contentfulGraphQLResponse,
        );
        const response = await workingGroupDataProvider.fetchById(id);

        expect(response!.tags).toEqual(['Lysosomes']);
      });
    });
  });

  describe('Update method', () => {
    test("Should log if can't delete previous entry because fetching previous entry fails but still create new deliverable and update the working group", async () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn');

      const workingGroupId = 'working-group-id-1';
      const workingGroupMock = getEntry({
        deliverables: {
          'en-US': [
            {
              sys: {
                id: 'd0',
              },
              description: 'D0',
              status: 'Complete' as DeliverableStatus,
            },
          ],
        },
      });
      when(environmentMock.getEntry)
        .calledWith(workingGroupId)
        .mockResolvedValue(workingGroupMock);

      const previousDeliverableMock = getEntry({});
      previousDeliverableMock.isPublished = jest.fn(() => true);
      when(environmentMock.getEntry)
        .calledWith('d0')
        .mockRejectedValueOnce(new Error('failed!'));

      const deliverableCreatedMock = getEntry({});
      environmentMock.createEntry.mockResolvedValue(deliverableCreatedMock);
      deliverableCreatedMock.publish = jest
        .fn()
        .mockResolvedValueOnce(getEntry({}));

      const workingGroupMockUpdated = getEntry({});
      workingGroupMock.patch = jest
        .fn()
        .mockResolvedValueOnce(workingGroupMockUpdated);

      await workingGroupDataProviderMock.update(workingGroupId, {
        deliverables: [
          {
            description: 'D1',
            status: 'Pending' as DeliverableStatus,
          },
        ],
      });

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Error fetching entry with id: d0`,
      );

      expect(previousDeliverableMock.unpublish).not.toHaveBeenCalled();
      expect(previousDeliverableMock.delete).not.toHaveBeenCalled();
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'workingGroupDeliverables',
        {
          fields: {
            description: { 'en-US': 'D1' },
            status: { 'en-US': 'Pending' },
          },
        },
      );
      expect(deliverableCreatedMock.publish).toHaveBeenCalled();
      expect(workingGroupMock.patch).toHaveBeenCalledWith([
        {
          op: 'replace',
          path: '/fields/deliverables',
          value: {
            'en-US': [
              {
                sys: {
                  id: 'entry-id',
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        },
      ]);
    });

    test("Should log if can't delete previous entry because unpublish previous entry fails but still create new deliverable and update the working group", async () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn');

      const workingGroupId = 'working-group-id-1';
      const workingGroupMock = getEntry({
        deliverables: {
          'en-US': [
            {
              sys: {
                id: 'd0',
              },
              description: 'D0',
              status: 'Complete' as DeliverableStatus,
            },
          ],
        },
      });
      when(environmentMock.getEntry)
        .calledWith(workingGroupId)
        .mockResolvedValue(workingGroupMock);

      const previousDeliverableMock = getEntry({});
      previousDeliverableMock.isPublished = jest.fn(() => true);
      previousDeliverableMock.unpublish = jest
        .fn()
        .mockRejectedValueOnce(new Error('failed!'));
      when(environmentMock.getEntry)
        .calledWith('d0')
        .mockResolvedValueOnce(previousDeliverableMock);

      const deliverableCreatedMock = getEntry({});
      environmentMock.createEntry.mockResolvedValue(deliverableCreatedMock);
      deliverableCreatedMock.publish = jest
        .fn()
        .mockResolvedValueOnce(getEntry({}));

      const workingGroupMockUpdated = getEntry({});
      workingGroupMock.patch = jest
        .fn()
        .mockResolvedValueOnce(workingGroupMockUpdated);

      await workingGroupDataProviderMock.update(workingGroupId, {
        deliverables: [
          {
            description: 'D1',
            status: 'Pending' as DeliverableStatus,
          },
        ],
      });

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Error unpublishing entry with id: d0`,
      );

      expect(previousDeliverableMock.unpublish).toHaveBeenCalled();
      expect(previousDeliverableMock.delete).not.toHaveBeenCalled();
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'workingGroupDeliverables',
        {
          fields: {
            description: { 'en-US': 'D1' },
            status: { 'en-US': 'Pending' },
          },
        },
      );
      expect(deliverableCreatedMock.publish).toHaveBeenCalled();
      expect(workingGroupMock.patch).toHaveBeenCalledWith([
        {
          op: 'replace',
          path: '/fields/deliverables',
          value: {
            'en-US': [
              {
                sys: {
                  id: 'entry-id',
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        },
      ]);
    });

    test("Should log if can't delete previous entry because delete previous entry fails but still create new deliverable and update the working group", async () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn');

      const workingGroupId = 'working-group-id-1';
      const workingGroupMock = getEntry({
        deliverables: {
          'en-US': [
            {
              sys: {
                id: 'd0',
              },
              description: 'D0',
              status: 'Complete' as DeliverableStatus,
            },
          ],
        },
      });
      when(environmentMock.getEntry)
        .calledWith(workingGroupId)
        .mockResolvedValue(workingGroupMock);

      const previousDeliverableMock = getEntry({});
      previousDeliverableMock.isPublished = jest.fn(() => true);
      previousDeliverableMock.delete = jest
        .fn()
        .mockRejectedValueOnce(new Error('failed!'));
      when(environmentMock.getEntry)
        .calledWith('d0')
        .mockResolvedValueOnce(previousDeliverableMock);

      const deliverableCreatedMock = getEntry({});
      environmentMock.createEntry.mockResolvedValue(deliverableCreatedMock);
      deliverableCreatedMock.publish = jest
        .fn()
        .mockResolvedValueOnce(getEntry({}));

      const workingGroupMockUpdated = getEntry({});
      workingGroupMock.patch = jest
        .fn()
        .mockResolvedValueOnce(workingGroupMockUpdated);

      await workingGroupDataProviderMock.update(workingGroupId, {
        deliverables: [
          {
            description: 'D1',
            status: 'Pending' as DeliverableStatus,
          },
        ],
      });

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Error deleting entry with id: d0`,
      );

      expect(previousDeliverableMock.unpublish).toHaveBeenCalled();
      expect(previousDeliverableMock.delete).toHaveBeenCalled();
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'workingGroupDeliverables',
        {
          fields: {
            description: { 'en-US': 'D1' },
            status: { 'en-US': 'Pending' },
          },
        },
      );
      expect(deliverableCreatedMock.publish).toHaveBeenCalled();
      expect(workingGroupMock.patch).toHaveBeenCalledWith([
        {
          op: 'replace',
          path: '/fields/deliverables',
          value: {
            'en-US': [
              {
                sys: {
                  id: 'entry-id',
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        },
      ]);
    });

    test("Should throw if there's an error creating deliverable", async () => {
      const workingGroupId = 'working-group-id-1';
      const workingGroupMock = getEntry({
        deliverables: {
          'en-US': [
            {
              sys: {
                id: 'd0',
              },
              description: 'D0',
              status: 'Complete' as DeliverableStatus,
            },
          ],
        },
      });
      when(environmentMock.getEntry)
        .calledWith(workingGroupId)
        .mockResolvedValue(workingGroupMock);

      const previousDeliverableMock = getEntry({});
      previousDeliverableMock.isPublished = jest.fn(() => true);
      when(environmentMock.getEntry)
        .calledWith('d0')
        .mockResolvedValueOnce(previousDeliverableMock);

      const deliverableCreatedMock = getEntry({});
      environmentMock.createEntry.mockResolvedValueOnce(deliverableCreatedMock);
      environmentMock.createEntry.mockRejectedValueOnce(new Error('failed'));

      await expect(
        workingGroupDataProviderMock.update(workingGroupId, {
          deliverables: [
            {
              description: 'D1',
              status: 'Pending' as DeliverableStatus,
            },
            {
              description: 'D2',
              status: 'Complete' as DeliverableStatus,
            },
          ],
        }),
      ).rejects.toThrowError('Error creating deliverable: Error: failed');

      expect(deliverableCreatedMock.publish).toHaveBeenCalled();
      expect(workingGroupMock.patch).not.toHaveBeenCalled();
    });

    test("Should throw if there's an error publishing deliverable", async () => {
      const workingGroupId = 'working-group-id-1';
      const workingGroupMock = getEntry({
        deliverables: {
          'en-US': [
            {
              sys: {
                id: 'd0',
              },
              description: 'D0',
              status: 'Complete' as DeliverableStatus,
            },
          ],
        },
      });
      when(environmentMock.getEntry)
        .calledWith(workingGroupId)
        .mockResolvedValue(workingGroupMock);

      const previousDeliverableMock = getEntry({});
      previousDeliverableMock.isPublished = jest.fn(() => true);
      when(environmentMock.getEntry)
        .calledWith('d0')
        .mockResolvedValueOnce(previousDeliverableMock);

      const deliverableCreatedMock = getEntry({});
      environmentMock.createEntry.mockResolvedValueOnce(deliverableCreatedMock);
      deliverableCreatedMock.publish = jest
        .fn()
        .mockRejectedValueOnce(new Error('failed!'));

      await expect(
        workingGroupDataProviderMock.update(workingGroupId, {
          deliverables: [
            {
              description: 'D1',
              status: 'Pending' as DeliverableStatus,
            },
          ],
        }),
      ).rejects.toThrowError();

      expect(workingGroupMock.patch).not.toHaveBeenCalled();
    });

    test('Should update the working group with deliverables and delete previous ones', async () => {
      const workingGroupId = 'working-group-id-1';

      const workingGroupMock = getEntry({
        deliverables: {
          'en-US': [
            {
              sys: {
                id: 'd0',
              },
              description: 'D0',
              status: 'Complete' as DeliverableStatus,
            },
          ],
        },
      });
      when(environmentMock.getEntry)
        .calledWith(workingGroupId)
        .mockResolvedValue(workingGroupMock);

      const previousDeliverableMock = getEntry({});
      previousDeliverableMock.isPublished = jest.fn(() => true);
      when(environmentMock.getEntry)
        .calledWith('d0')
        .mockResolvedValue(previousDeliverableMock);

      const deliverableCreatedMock = getEntry({});
      environmentMock.createEntry.mockResolvedValue(deliverableCreatedMock);
      deliverableCreatedMock.publish = jest
        .fn()
        .mockResolvedValueOnce(getEntry({}));

      const workingGroupMockUpdated = getEntry({});
      workingGroupMock.patch = jest
        .fn()
        .mockResolvedValueOnce(workingGroupMockUpdated);

      await workingGroupDataProviderMock.update(workingGroupId, {
        deliverables: [
          {
            description: 'D1',
            status: 'Pending' as DeliverableStatus,
          },
        ],
      });

      expect(previousDeliverableMock.unpublish).toHaveBeenCalled();
      expect(previousDeliverableMock.delete).toHaveBeenCalled();
      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'workingGroupDeliverables',
        {
          fields: {
            description: { 'en-US': 'D1' },
            status: { 'en-US': 'Pending' },
          },
        },
      );
      expect(deliverableCreatedMock.publish).toHaveBeenCalled();
      expect(workingGroupMock.patch).toHaveBeenCalledWith([
        {
          op: 'replace',
          path: '/fields/deliverables',
          value: {
            'en-US': [
              {
                sys: {
                  id: 'entry-id',
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        },
      ]);
    });
  });
});
