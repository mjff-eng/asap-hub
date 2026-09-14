import {
  addLocaleToFields,
  Entry,
  Environment,
  gp2 as gp2Contentful,
  patchAndPublish,
} from '@asap-hub/contentful';
import { gp2 as gp2Model } from '@asap-hub/model';
import { UserDataProvider } from '../../src/data-providers/types';
import { UserContentfulDataProvider } from '../../src/data-providers/user.data-provider';
import {
  getBulkAction,
  getEntry,
  getEntryCollection,
} from '../fixtures/contentful.fixtures';
import {
  getContentfulGraphqlUser,
  getContentfulUsersByProjectIds,
  getContentfulUsersByTagIds,
  getContentfulUsersByWorkingGroupIds,
  getContentfulUsersGraphqlResponse,
  getProjectGraphQL,
  getUserCreateDataObject,
  getUserDataObject,
} from '../fixtures/user.fixtures';
import { getContentfulGraphqlClientMock } from '../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../mocks/contentful-rest-client.mock';

jest.mock('@asap-hub/contentful', () => ({
  ...jest.requireActual('@asap-hub/contentful'),
  patchAndPublish: jest.fn().mockResolvedValue(undefined),
}));
describe('User data provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const userDataProvider: UserDataProvider = new UserContentfulDataProvider(
    contentfulGraphqlClientMock,
    contentfulRestClientMock,
  );

  beforeEach(jest.resetAllMocks);

  describe('FetchById', () => {
    test('Should return null when the user is not found', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: null,
      });

      const result = await userDataProvider.fetchById('user-id');
      expect(result).toBeNull();
    });
    test('Should return the user when it finds it', async () => {
      const mockResponse = getContentfulGraphqlUser();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: mockResponse,
      });

      const result = await userDataProvider.fetchById('user-id');
      expect(result).toEqual(getUserDataObject());
    });
    test('Should not fetch members when the user has no linked entities', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: { ...getContentfulGraphqlUser(), linkedFrom: undefined },
      });

      const result = await userDataProvider.fetchById('user-id');

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(1);
      expect(result?.projects).toEqual([]);
      expect(result?.workingGroups).toEqual([]);
    });
    test('Should skip memberships and entities that are null or unlinked when completing members', async () => {
      const user = getContentfulGraphqlUser();
      const [projectMembership] =
        user.linkedFrom!.projectMembershipCollection!.items;
      const [workingGroupMembership] =
        user.linkedFrom!.workingGroupMembershipCollection!.items;
      user.linkedFrom!.projectMembershipCollection!.items = [
        null,
        { ...projectMembership!, linkedFrom: undefined },
        {
          ...projectMembership!,
          linkedFrom: { projectsCollection: { items: [null] } },
        },
      ];
      user.linkedFrom!.workingGroupMembershipCollection!.items = [
        null,
        { ...workingGroupMembership!, linkedFrom: undefined },
        {
          ...workingGroupMembership!,
          linkedFrom: { workingGroupsCollection: { items: [null] } },
        },
      ];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: user,
      });

      const result = await userDataProvider.fetchById('user-id');

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(1);
      expect(result?.projects).toEqual([]);
      expect(result?.workingGroups).toEqual([]);
    });
    test('Should fetch remaining member pages of the linked projects and working groups', async () => {
      const user = getContentfulGraphqlUser();
      const project =
        user.linkedFrom!.projectMembershipCollection!.items[0]!.linkedFrom!
          .projectsCollection!.items[0]!;
      const workingGroup =
        user.linkedFrom!.workingGroupMembershipCollection!.items[0]!.linkedFrom!
          .workingGroupsCollection!.items[0]!;
      project.membersCollection = {
        ...project.membersCollection!,
        total: project.membersCollection!.items.length + 1,
      };
      workingGroup.membersCollection = {
        ...workingGroup.membersCollection!,
        total: workingGroup.membersCollection!.items.length + 1,
      };
      const extraMember = (userId: string) => ({
        sys: { id: `membership-${userId}` },
        role: 'Contributor',
        user: { sys: { id: userId }, onboarded: true },
      });
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce({ users: user })
        .mockResolvedValueOnce({
          projects: {
            membersCollection: { total: 3, items: [extraMember('p-2')] },
          },
        })
        .mockResolvedValueOnce({
          workingGroups: {
            membersCollection: { total: 3, items: [extraMember('wg-2')] },
          },
        });

      const result = await userDataProvider.fetchById('user-id');

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(3);
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_PROJECT_MEMBERS,
        { id: project.sys.id, limit: 100, skip: 2 },
      );
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_WORKING_GROUP_MEMBERS,
        { id: workingGroup.sys.id, limit: 100, skip: 2 },
      );
      expect(result?.projects[0]?.members.map(({ userId }) => userId)).toEqual([
        ...getUserDataObject().projects[0]!.members.map((m) => m.userId),
        'p-2',
      ]);
      expect(
        result?.workingGroups[0]?.members.map(({ userId }) => userId),
      ).toEqual([
        ...getUserDataObject().workingGroups[0]!.members.map((m) => m.userId),
        'wg-2',
      ]);
    });

    test.each(['middleName', 'nickname'] satisfies Array<
      keyof gp2Model.UserDataObject
    >)(
      'Should not return a field when its an empty string for %s',
      async (field) => {
        const mockResponse = getContentfulGraphqlUser();
        mockResponse[field] = '';
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');

        expect(result![field]).toBeUndefined();
      },
    );

    test('Should default alumniLastUpdated to undefined when null', async () => {
      const mockResponse = getContentfulGraphqlUser();
      mockResponse.alumniLastUpdated = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: mockResponse,
      });

      const result = await userDataProvider.fetchById('user-id');
      expect(result!.alumniLastUpdated).toBeUndefined();
    });

    test('Should throw an error when the ORCID Works field has invalid data', async () => {
      const mockResponse = getContentfulGraphqlUser();
      mockResponse.orcidWorks = [null];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: mockResponse,
      });

      await expect(userDataProvider.fetchById('user-id')).rejects.toThrow(
        'Invalid ORCID works content data',
      );
    });

    test.each(gp2Model.userDegrees)(
      'Should correctly map MD, PhD Correctly - %s',
      async (degree) => {
        const expected = degree;
        const degreeUser = getContentfulGraphqlUser();
        degreeUser.degrees = [degree];
        const mockResponse = getContentfulGraphqlUser(degreeUser);
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.degrees).toEqual([expected]);
      },
    );

    test('tags default to empty array', async () => {
      const mockResponse = getContentfulGraphqlUser({
        tagsCollection: null,
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: mockResponse,
      });
      const result = await userDataProvider.fetchById('user-id');
      expect(result!.tags).toEqual([]);
    });
    test('degrees default to empty array', async () => {
      const mockResponse = getContentfulGraphqlUser({
        degrees: null,
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: mockResponse,
      });
      const result = await userDataProvider.fetchById('user-id');
      expect(result!.degrees).toEqual([]);
    });

    test('connections default to empty array', async () => {
      const mockResponse = getContentfulGraphqlUser({
        connections: null,
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: mockResponse,
      });
      const result = await userDataProvider.fetchById('user-id');
      expect(result!.connections).toEqual([]);
    });

    test.each(gp2Model.userRegions)(
      'Should correctly map region - %s',
      async (region) => {
        const mockResponse = getContentfulGraphqlUser({ region });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.region).toEqual(region);
      },
    );

    test.each(gp2Model.userRoles)(
      'Should correctly map role - %s',
      async (role) => {
        const mockResponse = getContentfulGraphqlUser({ role });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.role).toEqual(role);
      },
    );

    test('questions are added', async () => {
      const questions = ['a valid question'];
      const mockResponse = getContentfulGraphqlUser({ questions });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: mockResponse,
      });
      const result = await userDataProvider.fetchById('user-id');
      expect(result?.questions).toEqual(questions);
    });
    test('avatar is added', async () => {
      const avatar = {
        url: 'avatar-id',
      };
      const mockResponse = getContentfulGraphqlUser({ avatar });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: mockResponse,
      });
      const result = await userDataProvider.fetchById('user-id');
      expect(result?.avatarUrl).toEqual(expect.stringContaining('avatar-id'));
    });

    test('questions default to empty array', async () => {
      const questions = null;
      const mockResponse = getContentfulGraphqlUser({ questions });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: mockResponse,
      });
      const result = await userDataProvider.fetchById('user-id');
      expect(result?.questions).toEqual([]);
    });

    describe('positions', () => {
      test('Should return empty array if positions has not been defined', async () => {
        const positions = null;
        const mockResponse = getContentfulGraphqlUser({ positions });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.positions).toEqual([]);
      });
    });
    describe('contributing cohorts', () => {
      test('Should return empty array if cohorts collection have not been defined', async () => {
        const mockResponse = getContentfulGraphqlUser({
          contributingCohortsCollection: null,
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.contributingCohorts).toEqual([]);
      });
      test('Should return empty array if cohorts have not been defined', async () => {
        const mockResponse = getContentfulGraphqlUser({
          contributingCohortsCollection: { items: [], total: 0 },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.contributingCohorts).toEqual([]);
      });
      test.each(gp2Model.userContributingCohortRole)(
        'should parse the role - %s',
        async (role) => {
          const contributingCohort = {
            sys: { id: '42' },
            name: 'GeneFinder',
          };
          const contributingCohortsCollection = {
            items: [
              {
                contributingCohort,
                role,
                studyLink: 'http://example.com/test',
              },
            ],
          };
          const mockResponse = getContentfulGraphqlUser({
            contributingCohortsCollection,
          });
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            users: mockResponse,
          });
          const result = await userDataProvider.fetchById('user-id');
          expect(result?.contributingCohorts[0]?.role).toEqual(role);
        },
      );
      test('should return empty if no cohort related', async () => {
        const contributingCohortsCollection = {
          items: [
            {
              role: 'Investigator',
              studyLink: 'http://example.com/test',
            },
          ],
        };
        const mockResponse = getContentfulGraphqlUser({
          contributingCohortsCollection,
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });
        const result = await userDataProvider.fetchById('user-id');
        expect(result?.contributingCohorts).toEqual([]);
      });
    });

    describe('outputs', () => {
      test('should remove outputs with null sharing-status', async () => {
        const mockResponse = getContentfulGraphqlUser();
        mockResponse.linkedFrom!.outputsCollection = {
          items: [
            {
              sys: {
                id: 'output-id',
              },
              gp2Supported: 'Yes',
              shortDescription: 'Test output',
              title: 'Test output',
              sharingStatus: null,
            },
          ],
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.outputs).toEqual([]);
      });
    });

    describe('projects', () => {
      test('Should return empty array if no projects collection', async () => {
        const mockResponse = getContentfulGraphqlUser({ linkedFrom: {} });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.projects).toEqual([]);
      });
      test('Should return empty array if no project collection items', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            projectMembershipCollection: { items: [], total: 0 },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.projects).toEqual([]);
      });
      test('Should return empty array if no linked project', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                {
                  user: {
                    sys: {
                      id: '42',
                    },
                  },
                  role: 'Project lead',
                  linkedFrom: {
                    projectsCollection: {
                      items: [],
                    },
                  },
                },
              ],
            },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.projects).toEqual([]);
      });
      test('Should return empty when no members', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            projectMembershipCollection: {
              items: [getProjectGraphQL({ hasMembers: false })],
            },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.projects[0]?.members).toHaveLength(0);
      });
      test('Should return empty when not onboarded', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                getProjectGraphQL({
                  user: { sys: { id: '42' }, onboarded: false },
                }),
              ],
            },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.projects[0]?.members).toHaveLength(0);
      });
      test.each(gp2Model.projectMemberRole)(
        'should parse the role - %s',
        async (role) => {
          const mockResponse = getContentfulGraphqlUser({
            linkedFrom: {
              projectMembershipCollection: {
                items: [getProjectGraphQL({ role })],
              },
            },
          });
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            users: mockResponse,
          });
          const result = await userDataProvider.fetchById('user-id');
          expect(result?.projects[0]?.members[0]!.role).toEqual(role);
        },
      );
      test('check multiple members', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [
                        {
                          sys: {
                            id: '11',
                          },
                          title: 'Test Project',
                          status: 'Active',
                          membersCollection: {
                            items: [
                              {
                                role: 'Contributor',
                                user: {
                                  sys: {
                                    id: '23',
                                  },
                                  onboarded: true,
                                },
                              },
                              {
                                role: 'Project lead',
                                user: {
                                  sys: {
                                    id: '27',
                                  },
                                  onboarded: true,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });
        const result = await userDataProvider.fetchById('user-id');
        expect(result?.projects[0]?.members).toHaveLength(2);
        expect(result?.projects[0]?.members).toEqual([
          { role: 'Contributor', userId: '23' },
          { role: 'Project lead', userId: '27' },
        ]);
      });
      test('members empty', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            projectMembershipCollection: {
              items: [
                {
                  linkedFrom: {
                    projectsCollection: {
                      items: [
                        {
                          sys: {
                            id: '11',
                          },
                          title: 'Test Project',
                          status: 'Active',
                          membersCollection: {
                            items: [],
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.projects[0]?.members).toHaveLength(0);
      });
    });

    describe('working groups', () => {
      const getWorkingGroupGraphQL = ({
        role = 'Co-lead',
        user = {
          sys: {
            id: '42',
          },
          onboarded: true,
        },
        workingGroupId = '7',
        hasMembers = true,
      }: {
        role?: string | null;
        user?: { sys: { id: string }; onboarded: boolean } | null;
        workingGroupId?: string | null;
        hasMembers?: boolean;
      } = {}) => ({
        user,
        role,
        linkedFrom: {
          workingGroupsCollection: {
            items: [
              {
                sys: {
                  id: workingGroupId,
                },
                title: 'Test working group',
                membersCollection: hasMembers
                  ? {
                      items: [
                        {
                          user,
                          role,
                        },
                      ],
                    }
                  : null,
              },
            ],
          },
        },
      });
      test('Should return empty array if not working group items', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            workingGroupMembershipCollection: { items: [], total: 0 },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.workingGroups).toEqual([]);
      });
      test('Should return empty array if no linked working group', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            workingGroupMembershipCollection: {
              items: [
                {
                  user: {
                    sys: {
                      id: '42',
                    },
                  },
                  role: 'Co-lead',
                  linkedFrom: {
                    workingGroupsCollection: {
                      items: [],
                    },
                  },
                },
              ],
            },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.workingGroups).toEqual([]);
      });

      test('Should return empty when no members', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            workingGroupMembershipCollection: {
              items: [getWorkingGroupGraphQL({ hasMembers: false })],
            },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.workingGroups[0]?.members).toHaveLength(0);
      });
      test('Should return empty when not onboarded', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            workingGroupMembershipCollection: {
              items: [
                getWorkingGroupGraphQL({
                  user: { sys: { id: '42' }, onboarded: false },
                }),
              ],
            },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.workingGroups[0]?.members).toHaveLength(0);
      });

      test.each(gp2Model.workingGroupMemberRole)(
        'should parse the role - %s',
        async (role) => {
          const mockResponse = getContentfulGraphqlUser({
            linkedFrom: {
              workingGroupMembershipCollection: {
                items: [getWorkingGroupGraphQL({ role })],
              },
            },
          });
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            users: mockResponse,
          });
          const result = await userDataProvider.fetchById('user-id');
          expect(result?.workingGroups[0]?.members[0]!.role).toEqual(role);
        },
      );
      test('check multiple members', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            workingGroupMembershipCollection: {
              items: [
                {
                  user: {
                    sys: {
                      id: '42',
                    },
                  },
                  role: 'Co-lead',
                  linkedFrom: {
                    workingGroupsCollection: {
                      items: [
                        {
                          sys: {
                            id: '7',
                          },
                          title: 'Test working group',
                          membersCollection: {
                            items: [
                              {
                                role: 'Co-lead',
                                user: {
                                  sys: {
                                    id: '23',
                                  },
                                  onboarded: true,
                                },
                              },
                              {
                                role: 'Lead',
                                user: {
                                  sys: {
                                    id: '27',
                                  },
                                  onboarded: true,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });
        const result = await userDataProvider.fetchById('user-id');
        expect(result?.workingGroups[0]?.members).toHaveLength(2);
        expect(result?.workingGroups[0]?.members).toEqual([
          { role: 'Co-lead', userId: '23' },
          { role: 'Lead', userId: '27' },
        ]);
      });
      test('members undefined', async () => {
        const mockResponse = getContentfulGraphqlUser({
          linkedFrom: {
            workingGroupMembershipCollection: {
              items: [
                {
                  user: {
                    sys: {
                      id: '42',
                    },
                    onboarded: true,
                  },
                  role: 'Co-lead',
                  linkedFrom: {
                    workingGroupsCollection: {
                      items: [
                        {
                          sys: {
                            id: '7',
                          },
                          title: 'Test working group',
                          membersCollection: {
                            items: [],
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.workingGroups[0]?.members).toHaveLength(0);
      });
    });
    describe('telephone', () => {
      test('Should return undefined telephone if both the number and country code have not been defined', async () => {
        const mockResponse = getContentfulGraphqlUser({
          telephoneNumber: null,
          telephoneCountryCode: null,
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.telephone).toBeUndefined();
      });
      test('Should return undefined telephone number if the number has not been defined', async () => {
        const mockResponse = getContentfulGraphqlUser({
          telephoneNumber: null,
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.telephone?.number).toBeUndefined();
        expect(result?.telephone?.countryCode).toEqual('+1');
      });
      test('Should return undefined telephone country code if the country code has not been defined', async () => {
        const mockResponse = getContentfulGraphqlUser({
          telephoneCountryCode: null,
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.telephone?.countryCode).toBeUndefined();
        expect(result?.telephone?.number).toEqual('212-970-4133');
      });
    });

    describe('social', () => {
      test('should return social props undefined if they have not been defined', async () => {
        const mockResponse = getContentfulGraphqlUser({
          googleScholar: null,
          orcid: null,
          blog: null,
          blueSky: null,
          threads: null,
          twitter: null,
          linkedIn: null,
          github: null,
          researcherId: null,
          researchGate: null,
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: mockResponse,
        });

        const result = await userDataProvider.fetchById('user-id');
        expect(result?.social).toEqual({});
      });
    });
  });

  describe('Fetch', () => {
    beforeEach(jest.resetAllMocks);
    test('Should return an empty result', async () => {
      const mockResponse = getContentfulUsersGraphqlResponse();
      mockResponse.usersCollection!.items = [];
      mockResponse.usersCollection!.total = 0;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const result = await userDataProvider.fetch({});
      expect(result).toEqual({ total: 0, items: [] });
    });
    test('Should return an empty result when the client returns a response with query property set to null', async () => {
      const mockResponse = getContentfulUsersGraphqlResponse();
      mockResponse.usersCollection = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const result = await userDataProvider.fetch({});
      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should query with correct order param', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulUsersGraphqlResponse(),
      );

      const users = await userDataProvider.fetch({});

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_USERS,
        expect.objectContaining({
          order: [gp2Contentful.UsersOrder.SysFirstPublishedAtDesc],
        }),
      );
      expect(users).toMatchObject({ total: 1, items: [getUserDataObject()] });
    });

    test('Should query with onboarded filter', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulUsersGraphqlResponse(),
      );
      const fetchOptions: gp2Model.FetchUsersOptions = {
        take: 12,
        skip: 2,
        filter: {
          onlyOnboarded: true,
        },
      };
      const users = await userDataProvider.fetch(fetchOptions);

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_USERS,
        expect.objectContaining({
          limit: 12,
          skip: 2,
          where: expect.objectContaining({
            onboarded: true,
            role_not: 'Hidden',
          }),
        }),
      );
      expect(users).toMatchObject({ total: 1, items: [getUserDataObject()] });
    });

    test('Should return all users when the onlyOnboard flag is false', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulUsersGraphqlResponse(),
      );
      const fetchOptions: gp2Model.FetchUsersOptions = {
        take: 12,
        skip: 2,
        filter: {
          onlyOnboarded: false,
        },
      };
      const users = await userDataProvider.fetch(fetchOptions);

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_USERS,
        expect.objectContaining({
          limit: 12,
          skip: 2,
          where: expect.objectContaining({
            role_not: 'Hidden',
          }),
        }),
      );
      expect(users).toMatchObject({ total: 1, items: [getUserDataObject()] });
    });

    test.each`
      name         | value                 | fieldName
      ${'regions'} | ${['Africa', 'Asia']} | ${'region_in'}
    `(
      'Should query with region filters',
      async ({ name, value, fieldName }) => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulUsersGraphqlResponse(),
        );
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            [name]: value,
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              [fieldName]: value,
            }),
          }),
        );
      },
    );

    test.each`
      values                             | expected
      ${['Alumni Member']}               | ${[{ alumniSinceDate_exists: true }]}
      ${['GP2 Member']}                  | ${[{ alumniSinceDate_exists: false }]}
      ${['Alumni Member', 'GP2 Member']} | ${[{ alumniSinceDate_exists: true }, { alumniSinceDate_exists: false }]}
    `(
      'Should translate membershipStatus $values to alumniSinceDate_exists OR clauses',
      async ({ values, expected }) => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulUsersGraphqlResponse(),
        );
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            membershipStatus: values,
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expected,
            }),
          }),
        );
      },
    );

    test('Should not add membershipStatus filter when array is empty', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulUsersGraphqlResponse(),
      );
      const fetchOptions: gp2Model.FetchUsersOptions = {
        take: 12,
        skip: 2,
        filter: { membershipStatus: [] },
      };
      await userDataProvider.fetch(fetchOptions);

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_USERS,
        expect.objectContaining({
          where: expect.not.objectContaining({ OR: expect.anything() }),
        }),
      );
    });

    describe('projects filter', () => {
      test('it should return empty when no members', async () => {
        const projectId = '140f5e15-922d-4cbf-9d39-35dd39225b03';
        const projectMembers = {
          projectsCollection: {
            total: 0,
            items: [
              {
                membersCollection: null,
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          projectMembers,
        );
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            projects: [projectId],
          },
        };
        const result = await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(1);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_PROJECT_IDS,
          expect.objectContaining({
            ids: [projectId],
          }),
        );
        expect(result).toEqual({ total: 0, items: [] });
      });
      test('it should be able to filter by project', async () => {
        const projectId = '140f5e15-922d-4cbf-9d39-35dd39225b03';
        const userId = '11';
        const projectMembers = getContentfulUsersByProjectIds(userId);

        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(projectMembers)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            projects: [projectId],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_PROJECT_IDS,
          expect.objectContaining({
            ids: [projectId],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: ['11'] },
            }),
          }),
        );
      });
      test('it should be able to filter by projects', async () => {
        const project1Id = '140f5e15-922d-4cbf-9d39-35dd39225b03';
        const project2Id = '140f5e15-922d-4cbf-9d39-35dd39225b04';
        const user1Id = '11';
        const user2Id = '7';
        const project1Members =
          getContentfulUsersByProjectIds(user1Id).projectsCollection.items;
        const project2Members =
          getContentfulUsersByProjectIds(user2Id).projectsCollection.items;

        const projectMembersResponse = {
          projectsCollection: {
            total: 2,
            items: [project1Members, project2Members].flat(),
          },
        };
        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(projectMembersResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            projects: [project1Id, project2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_PROJECT_IDS,
          expect.objectContaining({
            ids: [project1Id, project2Id],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id, user2Id] },
            }),
          }),
        );
      });
      test('it should be able to filter by projects and multiple users', async () => {
        const project1Id = '140f5e15-922d-4cbf-9d39-35dd39225b03';
        const project2Id = '140f5e15-922d-4cbf-9d39-35dd39225b04';
        const user1Id = '11';
        const user2Id = '7';
        const user3Id = '23';
        const project1Members =
          getContentfulUsersByProjectIds(user1Id).projectsCollection.items;
        const project2Members = getContentfulUsersByProjectIds(user2Id, user3Id)
          .projectsCollection.items;

        const projectMembersResponse = {
          projectsCollection: {
            total: 2,
            items: [project1Members, project2Members].flat(),
          },
        };
        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(projectMembersResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            projects: [project1Id, project2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_PROJECT_IDS,
          expect.objectContaining({
            ids: [project1Id, project2Id],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id, user2Id, user3Id] },
            }),
          }),
        );
      });
      test('it should be able to filter out duplicate user Ids', async () => {
        const project1Id = '140f5e15-922d-4cbf-9d39-35dd39225b03';
        const project2Id = '140f5e15-922d-4cbf-9d39-35dd39225b04';
        const user1Id = '11';
        const user2Id = '11';
        const project1Members =
          getContentfulUsersByProjectIds(user1Id).projectsCollection.items;
        const project2Members =
          getContentfulUsersByProjectIds(user2Id).projectsCollection.items;

        const projectMembersResponse = {
          projectsCollection: {
            total: 2,
            items: [project1Members, project2Members].flat(),
          },
        };
        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(projectMembersResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            projects: [project1Id, project2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_PROJECT_IDS,
          expect.objectContaining({
            ids: [project1Id, project2Id],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id] },
            }),
          }),
        );
      });
    });

    describe('working groups filter', () => {
      test('it should return empty when no members', async () => {
        const workingGroupId = '140f5e15-922d-4cbf-9d39-35dd39225b03';
        const workingGroupMembersResponse = {
          workingGroupsCollection: {
            total: 0,
            items: [
              {
                membersCollection: null,
              },
            ],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          workingGroupMembersResponse,
        );
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            workingGroups: [workingGroupId],
          },
        };
        const result = await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(1);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_WORKING_GROUP_IDS,
          expect.objectContaining({
            ids: [workingGroupId],
          }),
        );
        expect(result).toEqual({ total: 0, items: [] });
      });
      test('it should be able to filter by working group', async () => {
        const workingGroupId = '3ec68d44-82c1-4855-b6a0-ba44b9e313ba';
        const userId = '11';
        const workingGroupMembersResponse =
          getContentfulUsersByWorkingGroupIds(userId);

        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(workingGroupMembersResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            workingGroups: [workingGroupId],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_WORKING_GROUP_IDS,
          expect.objectContaining({
            ids: [workingGroupId],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [userId] },
            }),
          }),
        );
      });
      test('it should be able to filter by workingGroups', async () => {
        const workingGroup1Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313ba';
        const workingGroup2Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313bb';
        const user1Id = '11';
        const user2Id = '7';
        const workingGroup1Members =
          getContentfulUsersByProjectIds(user1Id).projectsCollection.items;
        const workingGroup2Members =
          getContentfulUsersByProjectIds(user2Id).projectsCollection.items;

        const workingGroupMembersResponse = {
          workingGroupsCollection: {
            total: 2,
            items: [workingGroup1Members, workingGroup2Members].flat(),
          },
        };

        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(workingGroupMembersResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            workingGroups: [workingGroup1Id, workingGroup2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_WORKING_GROUP_IDS,
          expect.objectContaining({
            ids: [workingGroup1Id, workingGroup2Id],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id, user2Id] },
            }),
          }),
        );
      });
      test('it should be able to filter by workingGroups and multiple users', async () => {
        const workingGroup1Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313ba';
        const workingGroup2Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313bb';
        const user1Id = '11';
        const user2Id = '7';
        const user3Id = '23';
        const workingGroup1Members =
          getContentfulUsersByProjectIds(user1Id).projectsCollection.items;
        const workingGroup2Members = getContentfulUsersByProjectIds(
          user2Id,
          user3Id,
        ).projectsCollection.items;
        const workingGroupMembersResponse = {
          workingGroupsCollection: {
            total: 2,
            items: [workingGroup1Members, workingGroup2Members].flat(),
          },
        };

        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(workingGroupMembersResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            workingGroups: [workingGroup1Id, workingGroup2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_WORKING_GROUP_IDS,
          expect.objectContaining({
            ids: [workingGroup1Id, workingGroup2Id],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id, user2Id, user3Id] },
            }),
          }),
        );
      });
      test('it should be able to filter out duplicate user Ids', async () => {
        const workingGroup1Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313ba';
        const workingGroup2Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313bb';
        const user1Id = '11';
        const user2Id = '11';
        const workingGroup1Members =
          getContentfulUsersByWorkingGroupIds(user1Id).workingGroupsCollection
            .items;
        const workingGroup2Members =
          getContentfulUsersByWorkingGroupIds(user2Id).workingGroupsCollection
            .items;
        const workingGroupMembersResponse = {
          workingGroupsCollection: {
            total: 2,
            items: [workingGroup1Members, workingGroup2Members].flat(),
          },
        };

        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(workingGroupMembersResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            workingGroups: [workingGroup1Id, workingGroup2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_WORKING_GROUP_IDS,
          expect.objectContaining({
            ids: [workingGroup1Id, workingGroup2Id],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id] },
            }),
          }),
        );
      });
    });
    describe('tags filter', () => {
      test('it should return empty when no members', async () => {
        const tagId = '140f5e15-922d-4cbf-9d39-35dd39225b03';
        const tagsResponse = {
          usersCollection: {
            total: 0,
            items: [],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(tagsResponse);
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            tags: [tagId],
          },
        };
        const result = await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(1);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_TAG_IDS,
          expect.objectContaining({
            ids: [tagId],
          }),
        );
        expect(result).toEqual({ total: 0, items: [] });
      });
      test('it should be able to filter by tag', async () => {
        const tagId = '3ec68d44-82c1-4855-b6a0-ba44b9e313ba';
        const userId = '11';
        const tagResponse = getContentfulUsersByTagIds(userId);

        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(tagResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            tags: [tagId],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_TAG_IDS,
          expect.objectContaining({
            ids: [tagId],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [userId] },
            }),
          }),
        );
      });
      test('it should be able to filter by tags', async () => {
        const tag1Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313ba';
        const tag2Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313bb';
        const user1Id = '11';
        const user2Id = '7';
        const tag1Members =
          getContentfulUsersByTagIds(user1Id).usersCollection.items;
        const tag2Members =
          getContentfulUsersByTagIds(user2Id).usersCollection.items;

        const tagMembersResponse = {
          usersCollection: {
            total: 2,
            items: [tag1Members, tag2Members].flat(),
          },
        };

        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(tagMembersResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            tags: [tag1Id, tag2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_TAG_IDS,
          expect.objectContaining({
            ids: [tag1Id, tag2Id],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id, user2Id] },
            }),
          }),
        );
      });
      test('it should be able to filter by tags and multiple users', async () => {
        const tag1Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313ba';
        const tag2Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313bb';
        const user1Id = '11';
        const user2Id = '7';
        const user3Id = '23';
        const tag1Members =
          getContentfulUsersByTagIds(user1Id).usersCollection.items;
        const tag2Members = getContentfulUsersByTagIds(user2Id, user3Id)
          .usersCollection.items;
        const tagMembersResponse = {
          usersCollection: {
            total: 2,
            items: [tag1Members, tag2Members].flat(),
          },
        };

        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(tagMembersResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            tags: [tag1Id, tag2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_TAG_IDS,
          expect.objectContaining({
            ids: [tag1Id, tag2Id],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id, user2Id, user3Id] },
            }),
          }),
        );
      });
      test('it should be able to filter out duplicate user Ids', async () => {
        const tag1Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313ba';
        const tag2Id = '3ec68d44-82c1-4855-b6a0-ba44b9e313bb';
        const user1Id = '11';
        const user2Id = '11';
        const tag1Members =
          getContentfulUsersByTagIds(user1Id).usersCollection.items;
        const tag2Members =
          getContentfulUsersByTagIds(user2Id).usersCollection.items;
        const tagMembersResponse = {
          usersCollection: {
            total: 2,
            items: [tag1Members, tag2Members].flat(),
          },
        };

        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(tagMembersResponse)
          .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            tags: [tag1Id, tag2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          1,
          gp2Contentful.FETCH_USERS_BY_TAG_IDS,
          expect.objectContaining({
            ids: [tag1Id, tag2Id],
          }),
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
          2,
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id] },
            }),
          }),
        );
      });
    });
    describe('user filter', () => {
      test('it should be able to filter by user', async () => {
        const userId = '42';

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulUsersGraphqlResponse(),
        );
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            userIds: [userId],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(1);
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [userId] },
            }),
          }),
        );
      });
      test('it should be able to filter by users', async () => {
        const user1Id = '11';
        const user2Id = '7';
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulUsersGraphqlResponse(),
        );
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            userIds: [user1Id, user2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(1);
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id, user2Id] },
            }),
          }),
        );
      });
      test('it should be able to filter out duplicate user Ids', async () => {
        const user1Id = '11';
        const user2Id = '11';

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulUsersGraphqlResponse(),
        );
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            userIds: [user1Id, user2Id],
          },
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(1);
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              role_not: 'Hidden',
              sys: { id_in: [user1Id] },
            }),
          }),
        );
      });
    });
    test('it should be able to filter out duplicate user Ids when  the project and working group and tag filters are defined', async () => {
      const projectId = '140f5e15-922d-4cbf-9d39-35dd39225b03';
      const workingGroupId = '3ec68d44-82c1-4855-b6a0-ba44b9e313bb';
      const tagId = '0a391bca-5ad8-45c1-82d4-02bfde66481b';
      const user1Id = '11';
      const user2Id = '11';

      const workingGroupMembersResponse =
        getContentfulUsersByWorkingGroupIds(user2Id);
      const projectMembersResponse = getContentfulUsersByProjectIds(user1Id);
      const tagMembersResponse = getContentfulUsersByTagIds(user1Id);

      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce(projectMembersResponse)
        .mockResolvedValueOnce(workingGroupMembersResponse)
        .mockResolvedValueOnce(tagMembersResponse)
        .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());
      const fetchOptions: gp2Model.FetchUsersOptions = {
        take: 12,
        skip: 2,
        filter: {
          projects: [projectId],
          workingGroups: [workingGroupId],
          tags: [tagId],
          userIds: [user1Id],
        },
      };
      await userDataProvider.fetch(fetchOptions);

      expect(contentfulGraphqlClientMock.request).toBeCalledTimes(4);
      expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
        1,
        gp2Contentful.FETCH_USERS_BY_PROJECT_IDS,
        expect.objectContaining({
          ids: [projectId],
        }),
      );
      expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
        2,
        gp2Contentful.FETCH_USERS_BY_WORKING_GROUP_IDS,
        expect.objectContaining({
          ids: [workingGroupId],
        }),
      );
      expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
        3,
        gp2Contentful.FETCH_USERS_BY_TAG_IDS,
        expect.objectContaining({
          ids: [tagId],
        }),
      );
      expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
        4,
        gp2Contentful.FETCH_USERS,
        expect.objectContaining({
          limit: 12,
          skip: 2,
          where: expect.objectContaining({
            role_not: 'Hidden',
            sys: { id_in: [user1Id] },
          }),
        }),
      );
    });

    describe('if there is a working group or a project filter and no users are found - we should return an empty list', () => {
      test('we have a projects filter and no working group filter', async () => {
        const projectId = '140f5e15-922d-4cbf-9d39-35dd39225b03';

        const projectMembersResponse = getContentfulUsersByProjectIds();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          projectMembersResponse,
        );

        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            projects: [projectId],
          },
        };
        const result = await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(1);
        expect(result).toEqual({ total: 0, items: [] });
      });
      test('we have a working groups filter and no projects filter', async () => {
        const workingGroupId = '3ec68d44-82c1-4855-b6a0-ba44b9e313bb';

        const workingGroupMembersResponse =
          getContentfulUsersByWorkingGroupIds();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          workingGroupMembersResponse,
        );
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            workingGroups: [workingGroupId],
          },
        };
        const result = await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(1);
        expect(result).toEqual({ total: 0, items: [] });
      });
      test('if both are defined', async () => {
        const projectId = '140f5e15-922d-4cbf-9d39-35dd39225b03';
        const workingGroupId = '3ec68d44-82c1-4855-b6a0-ba44b9e313bb';

        const workingGroupMembersResponse =
          getContentfulUsersByWorkingGroupIds();
        const projectMembersResponse = getContentfulUsersByProjectIds();

        contentfulGraphqlClientMock.request
          .mockResolvedValueOnce(projectMembersResponse)
          .mockResolvedValueOnce(workingGroupMembersResponse);
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          filter: {
            projects: [projectId],
            workingGroups: [workingGroupId],
          },
        };
        const result = await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledTimes(2);
        expect(result).toEqual({ total: 0, items: [] });
      });
    });

    test.each([
      ['a missing collection', { projectsCollection: null }],
      ['a null entity', { projectsCollection: { total: 1, items: [null] } }],
    ])(
      'Should return no users when the project filter yields %s',
      async (_, response) => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(response);

        const result = await userDataProvider.fetch({
          take: 10,
          skip: 0,
          filter: { projects: ['project-id'] },
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ total: 0, items: [] });
      },
    );
    test('Should page through working group members when filtering users', async () => {
      const workingGroupId = 'working-group-id';
      const response = getContentfulUsersByWorkingGroupIds('user-1');
      response.workingGroupsCollection.items[0]!.membersCollection.total = 2;
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce(response)
        .mockResolvedValueOnce({
          workingGroups: {
            membersCollection: {
              total: 2,
              items: [{ user: { sys: { id: 'user-2' } } }],
            },
          },
        })
        .mockResolvedValueOnce(getContentfulUsersGraphqlResponse());

      await userDataProvider.fetch({
        take: 10,
        skip: 0,
        filter: { workingGroups: [workingGroupId] },
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
        2,
        gp2Contentful.FETCH_WORKING_GROUP_MEMBERS,
        { id: workingGroupId, limit: 100, skip: 1 },
      );
      expect(contentfulGraphqlClientMock.request).toHaveBeenLastCalledWith(
        gp2Contentful.FETCH_USERS,
        expect.objectContaining({
          where: expect.objectContaining({
            sys: { id_in: ['user-1', 'user-2'] },
          }),
        }),
      );
    });
    test('Should fetch each truncated working group members page once for a page of users', async () => {
      const makeUser = (id: string) => {
        const user = getContentfulGraphqlUser();
        const workingGroup =
          user.linkedFrom!.workingGroupMembershipCollection!.items[0]!
            .linkedFrom!.workingGroupsCollection!.items[0]!;
        workingGroup.membersCollection = {
          ...workingGroup.membersCollection!,
          total: workingGroup.membersCollection!.items.length + 1,
        };
        return { ...user, sys: { ...user.sys, id } };
      };
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce({
          usersCollection: {
            total: 2,
            items: [makeUser('user-1'), makeUser('user-2')],
          },
        })
        .mockResolvedValueOnce({
          workingGroups: {
            membersCollection: {
              total: 3,
              items: [
                {
                  sys: { id: 'membership-3' },
                  role: 'Working group member',
                  user: { sys: { id: 'user-3' }, onboarded: true },
                },
              ],
            },
          },
        });

      const result = await userDataProvider.fetch({ take: 10, skip: 0 });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(2);
      expect(contentfulGraphqlClientMock.request).toHaveBeenLastCalledWith(
        gp2Contentful.FETCH_WORKING_GROUP_MEMBERS,
        expect.objectContaining({ skip: 2 }),
      );
      result.items.forEach((user) => {
        expect(user.workingGroups[0]?.members.map((m) => m.userId)).toContain(
          'user-3',
        );
      });
    });
    test('Should reuse the members page fetched for the filter when completing users', async () => {
      const user = getContentfulGraphqlUser();
      const workingGroup =
        user.linkedFrom!.workingGroupMembershipCollection!.items[0]!.linkedFrom!
          .workingGroupsCollection!.items[0]!;
      const workingGroupId = workingGroup.sys.id;
      const firstPage = workingGroup.membersCollection!.items;
      workingGroup.membersCollection = {
        ...workingGroup.membersCollection!,
        total: firstPage.length + 1,
      };
      contentfulGraphqlClientMock.request
        .mockResolvedValueOnce({
          workingGroupsCollection: {
            total: 1,
            items: [
              {
                sys: { id: workingGroupId },
                membersCollection: {
                  total: firstPage.length + 1,
                  items: firstPage.map((member) => ({ user: member!.user })),
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          workingGroups: {
            membersCollection: {
              total: firstPage.length + 1,
              items: [
                {
                  sys: { id: 'membership-extra' },
                  role: 'Working group member',
                  user: { sys: { id: 'user-extra' }, onboarded: true },
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          usersCollection: { total: 1, items: [user] },
        });

      const result = await userDataProvider.fetch({
        take: 10,
        skip: 0,
        filter: { workingGroups: [workingGroupId] },
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(3);
      expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
        2,
        gp2Contentful.FETCH_WORKING_GROUP_MEMBERS,
        { id: workingGroupId, limit: 100, skip: firstPage.length },
      );
      expect(contentfulGraphqlClientMock.request).toHaveBeenNthCalledWith(
        3,
        gp2Contentful.FETCH_USERS,
        expect.objectContaining({
          where: expect.objectContaining({
            sys: { id_in: expect.arrayContaining(['user-extra']) },
          }),
        }),
      );
      expect(
        result.items[0]?.workingGroups[0]?.members.map((m) => m.userId),
      ).toContain('user-extra');
    });
    test('Should query with code filters', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulUsersGraphqlResponse(),
      );
      const fetchOptions: gp2Model.FetchUsersOptions = {
        take: 1,
        skip: 0,
        filter: {
          onlyOnboarded: false,
          hidden: false,
          code: 'a-code',
        },
      };
      await userDataProvider.fetch(fetchOptions);

      expect(contentfulGraphqlClientMock.request).toBeCalledWith(
        gp2Contentful.FETCH_USERS,
        expect.objectContaining({
          limit: 1,
          skip: 0,
          where: expect.objectContaining({
            connections_contains_all: ['a-code'],
          }),
        }),
      );
    });

    test('should support filtering by orcid', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulUsersGraphqlResponse(),
      );
      await userDataProvider.fetch({
        filter: { orcid: '0000-0000-1111-1111' },
      });
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_USERS,
        expect.objectContaining({
          where: expect.objectContaining({
            orcid_contains: '0000-0000-1111-1111',
          }),
        }),
      );
    });

    test('should support filtering by orcidLastSyncDate', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        getContentfulUsersGraphqlResponse(),
      );
      await userDataProvider.fetch({
        filter: {
          orcidLastSyncDate: 'some-date',
        },
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_USERS,
        expect.objectContaining({
          where: expect.objectContaining({
            orcidLastSyncDate_lt: 'some-date',
          }),
        }),
      );
    });

    describe('search', () => {
      test('Should query with filters and return the users', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulUsersGraphqlResponse(),
        );
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          search: 'tony stark',
          filter: {},
        };
        const users = await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledWith(
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              AND: [
                {
                  OR: [
                    {
                      firstName_contains: 'tony',
                    },
                    {
                      lastName_contains: 'tony',
                    },
                  ],
                },
                {
                  OR: [
                    {
                      firstName_contains: 'stark',
                    },
                    {
                      lastName_contains: 'stark',
                    },
                  ],
                },
              ],
            }),
          }),
        );
        expect(users).toMatchObject({ total: 1, items: [getUserDataObject()] });
      });
      test('Should search with special characters', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulUsersGraphqlResponse(),
        );
        const fetchOptions: gp2Model.FetchUsersOptions = {
          take: 12,
          skip: 2,
          search: 'Solène',
        };
        await userDataProvider.fetch(fetchOptions);

        expect(contentfulGraphqlClientMock.request).toBeCalledWith(
          gp2Contentful.FETCH_USERS,
          expect.objectContaining({
            limit: 12,
            skip: 2,
            where: expect.objectContaining({
              AND: [
                {
                  OR: [
                    {
                      firstName_contains: 'Solène',
                    },
                    {
                      lastName_contains: 'Solène',
                    },
                  ],
                },
              ],
            }),
          }),
        );
      });
    });
  });

  describe('fetchForOrcidSync', () => {
    test('Should fetch users with minimal data for ORCID sync', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: {
          total: 2,
          items: [
            {
              sys: { id: 'user-1' },
              email: 'user1@test.com',
              orcid: '0000-0001-1111-1111',
            },
            {
              sys: { id: 'user-2' },
              email: 'user2@test.com',
              orcid: '0000-0002-2222-2222',
            },
          ],
        },
      });

      const result = await userDataProvider.fetchForOrcidSync({
        take: 100,
        filter: {
          orcid: '-',
          orcidLastSyncDate: '2024-01-01T00:00:00.000Z',
        },
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_USERS_FOR_ORCID_SYNC,
        expect.objectContaining({
          limit: 100,
          skip: 0,
          order: [gp2Contentful.UsersOrder.SysFirstPublishedAtDesc],
          where: {
            orcid_contains: '-',
            orcidLastSyncDate_lt: '2024-01-01T00:00:00.000Z',
            role_not: 'Hidden',
          },
        }),
      );

      expect(result).toEqual({
        total: 2,
        items: [
          {
            id: 'user-1',
            email: 'user1@test.com',
            orcid: '0000-0001-1111-1111',
          },
          {
            id: 'user-2',
            email: 'user2@test.com',
            orcid: '0000-0002-2222-2222',
          },
        ],
      });
    });

    test('Should handle null email and orcid fields', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: {
          total: 1,
          items: [
            {
              sys: { id: 'user-1' },
              email: null,
              orcid: null,
            },
          ],
        },
      });

      const result = await userDataProvider.fetchForOrcidSync({
        take: 10,
        filter: { orcid: '-' },
      });

      expect(result).toEqual({
        total: 1,
        items: [{ id: 'user-1', email: '', orcid: '' }],
      });
    });

    test('Should filter out null users', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: {
          total: 3,
          items: [
            {
              sys: { id: 'user-1' },
              email: 'user1@test.com',
              orcid: '0000-0001-1111-1111',
            },
            null,
            {
              sys: { id: 'user-2' },
              email: 'user2@test.com',
              orcid: '0000-0002-2222-2222',
            },
          ],
        },
      });

      const result = await userDataProvider.fetchForOrcidSync({
        take: 10,
        filter: { orcid: '-' },
      });

      expect(result.items).toHaveLength(2);
      expect(result.items).toEqual([
        { id: 'user-1', email: 'user1@test.com', orcid: '0000-0001-1111-1111' },
        { id: 'user-2', email: 'user2@test.com', orcid: '0000-0002-2222-2222' },
      ]);
    });

    test('Should return empty result when usersCollection is null', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: null,
      });

      const result = await userDataProvider.fetchForOrcidSync({
        take: 10,
        filter: { orcid: '-' },
      });

      expect(result).toEqual({
        total: 0,
        items: [],
      });
    });

    test('Should use default take and skip values', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: { total: 0, items: [] },
      });

      await userDataProvider.fetchForOrcidSync({
        filter: { orcid: '-' },
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_USERS_FOR_ORCID_SYNC,
        expect.objectContaining({
          limit: 8,
          skip: 0,
        }),
      );
    });
  });

  describe('Create', () => {
    beforeEach(jest.resetAllMocks);
    test('Should throw when the POST request to contentful fails', async () => {
      environmentMock.createEntry.mockRejectedValue(new Error('failed'));

      await expect(
        userDataProvider.create(getUserCreateDataObject()),
      ).rejects.toThrow(Error);
    });

    test('Should create the user', async () => {
      const {
        contributingCohorts: _,
        tags,
        ...userCreateDataObject
      } = getUserCreateDataObject();

      const userMock = getEntry({});
      environmentMock.createEntry.mockResolvedValue(userMock);
      userMock.publish = jest.fn().mockResolvedValueOnce(userMock);

      await userDataProvider.create({
        ...userCreateDataObject,
        contributingCohorts: [],
      });

      const { social, telephone, ...fieldsWithoutLocale } =
        userCreateDataObject;
      const fields = addLocaleToFields({
        ...fieldsWithoutLocale,
        contributingCohorts: [],
        ...social,
        orcid: userCreateDataObject.orcid,
        telephoneCountryCode: telephone?.countryCode,
        telephoneNumber: telephone?.number,
      });
      expect(environmentMock.createEntry).toHaveBeenCalledWith('users', {
        fields,
      });

      expect(userMock.publish).toHaveBeenCalled();
    });

    test.each(gp2Model.userRegions)(
      'Should create a user with the region - %s',
      async (region) => {
        const { contributingCohorts: _, ...userCreateDataObject } =
          getUserCreateDataObject();

        const userMock = getEntry({});
        environmentMock.createEntry.mockResolvedValue(userMock);
        userMock.publish = jest.fn().mockResolvedValueOnce(userMock);

        await userDataProvider.create({
          ...userCreateDataObject,
          contributingCohorts: [],
          region,
        });
        expect(environmentMock.createEntry).toHaveBeenCalledWith('users', {
          fields: expect.objectContaining({ region: { 'en-US': region } }),
        });

        expect(userMock.publish).toHaveBeenCalled();
      },
    );

    test.each(gp2Model.userRoles)(
      'Should create a user with the role - %s',
      async (role) => {
        const { contributingCohorts: _, ...userCreateDataObject } =
          getUserCreateDataObject();

        const userMock = getEntry({});
        environmentMock.createEntry.mockResolvedValue(userMock);
        userMock.publish = jest.fn().mockResolvedValueOnce(userMock);

        await userDataProvider.create({
          ...userCreateDataObject,
          contributingCohorts: [],
          role,
        });
        expect(environmentMock.createEntry).toHaveBeenCalledWith('users', {
          fields: expect.objectContaining({ role: { 'en-US': role } }),
        });

        expect(userMock.publish).toHaveBeenCalled();
      },
    );

    test.each(gp2Model.userDegrees)(
      'Should create a user with the degree - %s',
      async (degree) => {
        const { contributingCohorts: _, ...userCreateDataObject } =
          getUserCreateDataObject();
        const expected = degree;

        const userMock = getEntry({});
        environmentMock.createEntry.mockResolvedValue(userMock);
        userMock.publish = jest.fn().mockResolvedValueOnce(userMock);

        await userDataProvider.create({
          ...userCreateDataObject,
          contributingCohorts: [],
          degrees: [degree],
        });
        expect(environmentMock.createEntry).toHaveBeenCalledWith('users', {
          fields: expect.objectContaining({ degrees: { 'en-US': [expected] } }),
        });

        expect(userMock.publish).toHaveBeenCalled();
      },
    );
    test.each(gp2Model.userContributingCohortRole)(
      'Should update the contributing cohort role - %s',
      async (role) => {
        const userCreateDataObject = getUserCreateDataObject();
        const id = '42';
        const userMock = getEntry({});
        const waitProcessingPublish = jest
          .fn()
          .mockImplementation(() => Promise.resolve());
        environmentMock.createEntry.mockResolvedValueOnce(getEntry({}, id));
        environmentMock.createPublishBulkAction.mockResolvedValueOnce(
          getBulkAction({
            waitProcessing: waitProcessingPublish,
          }),
        );
        environmentMock.createEntry.mockResolvedValue(userMock);
        userMock.publish = jest.fn().mockResolvedValueOnce(userMock);
        await userDataProvider.create({
          ...userCreateDataObject,
          contributingCohorts: [{ contributingCohortId: id, role }],
        });
        expect(environmentMock.createEntry).toHaveBeenNthCalledWith(
          1,
          'contributingCohortsMembership',
          {
            fields: {
              contributingCohort: {
                'en-US': {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id,
                  },
                },
              },
              role: { 'en-US': role },
            },
          },
        );
        expect(environmentMock.createPublishBulkAction).toHaveBeenCalledWith({
          entities: {
            sys: { type: 'Array' },
            items: [
              {
                sys: { linkType: 'Entry', type: 'Link', id, version: 1 },
              },
            ],
          },
        });
        expect(waitProcessingPublish).toHaveBeenCalled();

        expect(environmentMock.createEntry).toHaveBeenNthCalledWith(
          2,
          'users',
          {
            fields: expect.objectContaining({
              contributingCohorts: {
                'en-US': [{ sys: { id, linkType: 'Entry', type: 'Link' } }],
              },
            }),
          },
        );

        expect(userMock.publish).toHaveBeenCalled();
      },
    );
    test('Should create with tags', async () => {
      const {
        contributingCohorts: _,
        tags,
        ...userCreateDataObject
      } = getUserCreateDataObject();

      const userMock = getEntry({});
      environmentMock.createEntry.mockResolvedValue(userMock);
      userMock.publish = jest.fn().mockResolvedValueOnce(userMock);

      await userDataProvider.create({
        ...userCreateDataObject,
        contributingCohorts: [],
        tags,
      });
      expect(environmentMock.createEntry).toHaveBeenCalledWith('users', {
        fields: expect.objectContaining({
          tags: {
            'en-US': [
              {
                sys: {
                  id: 'tag-1',
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
              {
                sys: {
                  id: 'tag-2',
                  linkType: 'Entry',
                  type: 'Link',
                },
              },
            ],
          },
        }),
      });

      expect(userMock.publish).toHaveBeenCalled();
    });
  });
  describe('Update', () => {
    const userId = 'user-id';

    const entry = getEntry({
      fields: {
        firstName: 'Test',
        lastName: 'User',
      },
    });

    beforeEach(() => {
      jest.resetAllMocks();
      environmentMock.getEntry.mockResolvedValueOnce(entry);
      const mockPatchAndPublish = patchAndPublish as jest.MockedFunction<
        typeof patchAndPublish
      >;
      mockPatchAndPublish.mockResolvedValue({
        sys: {
          publishedVersion: 2,
        },
      } as Entry);
      contentfulGraphqlClientMock.request.mockResolvedValue({
        users: {
          sys: {
            publishedVersion: 2,
          },
        },
      });
    });

    test('Should update first name', async () => {
      await userDataProvider.update(userId, { firstName: 'Tony' });
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        firstName: 'Tony',
      });
      expect(environmentMock.createEntry).toBeCalledTimes(0);
      expect(environmentMock.createPublishBulkAction).not.toBeCalled();
      expect(environmentMock.createUnpublishBulkAction).not.toBeCalled();
      expect(environmentMock.getEntries).not.toBeCalled();
    });

    test('Should update last name', async () => {
      await userDataProvider.update(userId, { lastName: 'Stark' });
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        lastName: 'Stark',
      });
    });
    test('Should update telephone fields', async () => {
      await userDataProvider.update(userId, {
        telephone: { countryCode: '+1', number: '212-970-4133' },
      });
      expect(environmentMock.getEntry).toHaveBeenCalledWith(userId);
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        telephoneCountryCode: '+1',
        telephoneNumber: '212-970-4133',
      });
    });
    test('Should update allow empty telephone country code', async () => {
      await userDataProvider.update(userId, {
        telephone: { countryCode: '', number: '212-970-4133' },
      });
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        telephoneCountryCode: '',
        telephoneNumber: '212-970-4133',
      });
    });
    test('Should update allow empty telephone number', async () => {
      await userDataProvider.update(userId, {
        telephone: { countryCode: '+1', number: '' },
      });
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        telephoneCountryCode: '+1',
        telephoneNumber: '',
      });
    });
    test('Should update secondary email', async () => {
      await userDataProvider.update(userId, {
        alternativeEmail: '',
      });
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        alternativeEmail: '',
      });
    });
    test('Should update secondary email', async () => {
      await userDataProvider.update(userId, {
        alternativeEmail: 'tony@example.com',
      });
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        alternativeEmail: 'tony@example.com',
      });
    });

    test('Should update tags', async () => {
      await userDataProvider.update(userId, {
        tags: [{ id: '1' }],
      });
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        tags: [{ sys: { id: '1', linkType: 'Entry', type: 'Link' } }],
      });
    });

    describe('alumniLastUpdated stamping', () => {
      const now = '2026-06-11T12:00:00.000Z';

      beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date(now));
      });
      afterEach(() => {
        jest.useRealTimers();
      });

      test('Should stamp alumniLastUpdated when alumniSinceDate is in the payload', async () => {
        await userDataProvider.update(userId, {
          alumniSinceDate: '2026-06-11T12:00:00.000Z',
        });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          alumniSinceDate: '2026-06-11T12:00:00.000Z',
          alumniLastUpdated: now,
        });
      });

      test('Should stamp alumniLastUpdated when alumniLocation is in the payload', async () => {
        await userDataProvider.update(userId, {
          alumniLocation: 'New York',
        });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          alumniLocation: 'New York',
          alumniLastUpdated: now,
        });
      });

      test('Should stamp alumniLastUpdated when email is in the payload and user is alumni', async () => {
        const alumniEntry = getEntry({
          fields: {
            firstName: 'Test',
            lastName: 'User',
            alumniSinceDate: { 'en-US': '2024-01-01T00:00:00.000Z' },
          },
        });
        environmentMock.getEntry.mockReset();
        environmentMock.getEntry.mockResolvedValueOnce(alumniEntry);
        (
          patchAndPublish as jest.MockedFunction<typeof patchAndPublish>
        ).mockResolvedValueOnce({
          sys: { publishedVersion: 2 },
        } as Entry);
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: { sys: { publishedVersion: 2 } },
        });
        await userDataProvider.update(userId, {
          email: 'new@example.com',
        });
        expect(patchAndPublish).toHaveBeenCalledWith(
          alumniEntry,
          expect.objectContaining({
            alumniLastUpdated: now,
          }),
        );
      });

      test('Should not stamp alumniLastUpdated when email changes on non-alumni user', async () => {
        await userDataProvider.update(userId, {
          email: 'new@example.com',
        });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          email: 'new@example.com',
        });
      });

      test('Should stamp alumniLastUpdated when alumniSinceDate is explicitly cleared', async () => {
        await userDataProvider.update(userId, {
          alumniSinceDate: undefined,
        });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          alumniSinceDate: undefined,
          alumniLastUpdated: now,
        });
      });

      test('Should not stamp alumniLastUpdated when no alumni field is in the payload', async () => {
        await userDataProvider.update(userId, { firstName: 'Tony' });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          firstName: 'Tony',
        });
      });
    });

    test.each(gp2Model.userRegions)(
      'Should update the region - %s',
      async (region) => {
        await userDataProvider.update(userId, {
          region,
        });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          region,
        });
      },
    );
    test.each(gp2Model.userRoles)(
      'Should update the role - %s',
      async (role) => {
        await userDataProvider.update(userId, {
          role,
        });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          role,
        });
      },
    );
    test.each(gp2Model.userDegrees)(
      'Should update the degree - %s',
      async (degree) => {
        const expected = degree;
        await userDataProvider.update(userId, {
          degrees: [expected],
        });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          degrees: [expected],
        });
      },
    );
    test.each(gp2Model.userContributingCohortRole)(
      'Should update the contributing cohort role - %s',
      async (role) => {
        const previousCohortId = '11';
        const cohortUserEntry = getEntry({
          fields: {
            contributingCohorts: {
              'en-US': [
                {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id: previousCohortId,
                  },
                },
              ],
            },
          },
        });

        environmentMock.getEntry
          .mockReset()
          .mockResolvedValueOnce(cohortUserEntry);
        const id = '42';
        const waitProcessingPublish = jest
          .fn()
          .mockImplementation(() => Promise.resolve());

        const waitProcessingUnPublish = jest
          .fn()
          .mockImplementation(() => Promise.resolve());
        environmentMock.createEntry.mockResolvedValueOnce(getEntry({}, id));
        environmentMock.createPublishBulkAction.mockResolvedValueOnce(
          getBulkAction({
            waitProcessing: waitProcessingPublish,
          }),
        );
        environmentMock.createUnpublishBulkAction.mockResolvedValueOnce(
          getBulkAction({
            waitProcessing: waitProcessingUnPublish,
          }),
        );
        const deleteSpy = jest.fn();
        environmentMock.getEntries.mockResolvedValueOnce(
          getEntryCollection([getEntry({ delete: deleteSpy })]),
        );
        await userDataProvider.update(userId, {
          contributingCohorts: [{ contributingCohortId: id, role }],
        });

        expect(environmentMock.createEntry).toBeCalledTimes(1);
        expect(environmentMock.createEntry).toHaveBeenCalledWith(
          'contributingCohortsMembership',
          {
            fields: {
              contributingCohort: {
                'en-US': {
                  sys: {
                    type: 'Link',
                    linkType: 'Entry',
                    id,
                  },
                },
              },
              role: { 'en-US': role },
            },
          },
        );
        expect(environmentMock.createPublishBulkAction).toHaveBeenCalledWith({
          entities: {
            sys: { type: 'Array' },
            items: [
              {
                sys: { linkType: 'Entry', type: 'Link', id, version: 1 },
              },
            ],
          },
        });
        expect(waitProcessingPublish).toHaveBeenCalled();

        expect(patchAndPublish).toHaveBeenCalledWith(cohortUserEntry, {
          contributingCohorts: [
            { sys: { id, linkType: 'Entry', type: 'Link' } },
          ],
        });
        expect(environmentMock.createUnpublishBulkAction).toHaveBeenCalledWith({
          entities: {
            sys: { type: 'Array' },
            items: [
              {
                sys: { linkType: 'Entry', type: 'Link', id: previousCohortId },
              },
            ],
          },
        });
        expect(waitProcessingUnPublish).toHaveBeenCalled();
        expect(environmentMock.getEntries).toHaveBeenCalledWith({
          content_type: 'contributingCohortsMembership',
          'sys.id[in]': previousCohortId,
        });
        expect(deleteSpy).toHaveBeenCalled();
      },
    );
    test('flattens `social` values', async () => {
      await userDataProvider.update('123', {
        social: {
          github: 'asaphub',
          twitter: 'asaphub',
        },
      });
      expect(patchAndPublish).toHaveBeenCalledWith(
        entry,
        expect.objectContaining({ github: 'asaphub', twitter: 'asaphub' }),
      );
      expect(patchAndPublish).toHaveBeenCalledWith(
        entry,
        expect.not.objectContaining({ social: expect.anything() }),
      );
    });

    test('includes undefined `social` values as null to allow unsetting', async () => {
      await userDataProvider.update('123', {
        social: {
          github: 'asaphub',
          twitter: 'asaphub',
        },
      });
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        blog: null,
        blueSky: null,
        github: 'asaphub',
        googleScholar: null,
        linkedIn: null,
        orcid: null,
        researcherId: null,
        researchGate: null,
        threads: null,
        twitter: 'asaphub',
      });
    });
    test('maps avatar value to a linked resource', async () => {
      await userDataProvider.update('123', {
        avatar: 'abc123',
      });
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        avatar: {
          sys: {
            type: 'Link',
            linkType: 'Asset',
            id: 'abc123',
          },
        },
      });
    });
    test('checks version of published data and polls until they match', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: {
          sys: {
            publishedVersion: 1,
          },
        },
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: {
          sys: {
            publishedVersion: 1,
          },
        },
      });
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: {
          sys: {
            publishedVersion: 2,
          },
        },
      });

      await userDataProvider.update('123', {
        firstName: 'Colin',
      });
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(3);
    });

    test('throws if polling query does not return a value', async () => {
      jest.resetAllMocks();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: null,
      });

      await expect(
        userDataProvider.update('123', {
          firstName: 'Colin',
        }),
      ).rejects.toThrow();
    });

    test('unwraps `code` property of connections', async () => {
      await userDataProvider.update('123', {
        connections: [{ code: 'abc123' }],
      });
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        connections: ['abc123'],
      });
    });
  });
});
