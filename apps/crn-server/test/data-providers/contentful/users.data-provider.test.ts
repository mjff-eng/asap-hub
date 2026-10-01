import {
  Asset,
  Entry,
  Environment,
  FETCH_PUBLIC_USERS,
  FETCH_USERS,
  FETCH_USERS_BY_LAB_ID,
  FETCH_USERS_BY_TEAM_ID,
  FETCH_USERS_BY_TEAM_MEMBERSHIP_ID,
  FETCH_USER_BY_ID_FOR_ALGOLIA_LIST,
  patchAndPublish,
  patchAndPublishConflict,
} from '@asap-hub/contentful';
import { UserDataObject, UserSocialLinks } from '@asap-hub/model';
import {
  GroupLeaderItemPublic,
  GroupMemberItemPublic,
  parseToWorkingGroups,
  parseToWorkingGroupsForPublicUser,
  UserContentfulDataProvider,
} from '../../../src/data-providers/contentful/user.data-provider';
import { UserDataProvider } from '../../../src/data-providers/types';
import { getEntry } from '../../fixtures/contentful.fixtures';
import {
  getContentfulGraphqlUser,
  getContentfulGraphqlUserListItem,
  getInterestGroupLeadersCollection,
  getUserCreateDataObject,
  getUserDataObject,
  getUserListItemDataObject,
} from '../../fixtures/users.fixtures';
import { getContentfulGraphqlClientMock } from '../../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../../mocks/contentful-rest-client.mock';

jest.mock('@asap-hub/contentful', () => ({
  ...jest.requireActual('@asap-hub/contentful'),
  patchAndPublishConflict: jest.fn().mockResolvedValue(undefined),
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

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch-by-ID', () => {
    test('fetches the user by id', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser(),
      });

      const result = await userDataProvider.fetchById('123');
      const expectation = {
        ...getUserDataObject(),
        workingGroups: [
          {
            active: false,
            id: 'wg-1',
            name: 'working-group-1',
            role: 'Project Manager',
          },
          {
            active: false,
            id: 'wg-1',
            name: 'working-group-1',
            role: 'Member',
          },
        ],
        interestGroups: [
          {
            active: true,
            id: 'ig-1',
            name: 'interest-group-1',
          },
          {
            active: false,
            id: 'ig-2',
            name: 'interest-group-2',
          },
          {
            role: 'Project Manager',
            active: true,
            id: 'interest-group-leader-1',
            name: 'Interest Group Leader 1',
          },
        ],
      };
      expect(result).toEqual(expectation);
    });

    test('keeps the leader role when the user is also in a team of the same interest group', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          linkedFrom: {
            interestGroupLeadersCollection: getInterestGroupLeadersCollection({
              groupId: 'ig-1',
              groupName: 'interest-group-1',
            }),
          },
        }),
      });

      const result = await userDataProvider.fetchById('123');

      expect(result!.interestGroups).toEqual([
        {
          active: true,
          id: 'ig-1',
          name: 'interest-group-1',
          role: 'Project Manager',
        },
        { active: false, id: 'ig-2', name: 'interest-group-2' },
      ]);
    });

    test('drops the leader role when the leadership is inactive', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          linkedFrom: {
            interestGroupLeadersCollection: getInterestGroupLeadersCollection({
              inactiveSinceDate: '2023-01-01T00:00:00.000Z',
            }),
          },
        }),
      });

      const result = await userDataProvider.fetchById('123');

      expect(result!.interestGroups).toEqual([
        { active: true, id: 'ig-1', name: 'interest-group-1' },
        { active: false, id: 'ig-2', name: 'interest-group-2' },
        {
          active: true,
          id: 'interest-group-leader-1',
          name: 'Interest Group Leader 1',
        },
      ]);
    });

    test('returns null if user does not exist', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: null,
      });
      const result = await userDataProvider.fetchById('abc');
      expect(result).toEqual(null);
    });

    test.each(['middleName', 'nickname'] satisfies Array<keyof UserDataObject>)(
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

    test('defaults alumniLastUpdated to undefined when null', async () => {
      const mockResponse = getContentfulGraphqlUser();
      (mockResponse as any).alumniLastUpdated = null;
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: mockResponse,
      });

      const result = await userDataProvider.fetchById('user-id');
      expect(result!.alumniLastUpdated).toBeUndefined();
    });

    test('should map social properties and orcid onto `social` object', async () => {
      const socialProps = {
        github: '@github',
        twitter: '@twitter',
        website1: 'https://example.com',
        website2: 'https://example2.com',
        researchGate: 'researchGate',
        researcherId: 'researcherId',
        googleScholar: 'googleScholar',
        linkedIn: 'linkedIn',
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({ userSocials: socialProps }),
      });

      const result = await userDataProvider.fetchById('123');

      expect(result!.social).toEqual({
        ...socialProps,
        blueSky: undefined,
        orcid: '123-456-789',
      });
      expect(result).not.toMatchObject(socialProps);
    });

    test('should filter out null teams', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          teamsCollection: {
            items: [
              null,
              {
                inactiveSinceDate: null,
                role: 'Lead PI (Core Leadership)',
                team: {
                  sys: {
                    id: '2',
                  },
                  displayName: 'Good team',
                  linkedFrom: {
                    interestGroupsTeamsCollection: {
                      items: [
                        {
                          linkedFrom: {
                            interestGroupsCollection: {
                              items: [],
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        }),
      });

      const result = await userDataProvider.fetchById('123');
      expect(result!.teams).toHaveLength(1);
      expect(result!.teams[0]!.displayName).toEqual('Good team');
    });

    test('should filter out teams for which the role is not a valid role', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          teamsCollection: {
            items: [
              {
                inactiveSinceDate: null,
                role: 'Not a role',
                team: {
                  sys: {
                    id: '1',
                  },
                  displayName: 'Bad team',
                },
              },
              {
                inactiveSinceDate: null,
                role: 'Lead PI (Core Leadership)',
                team: {
                  sys: {
                    id: '2',
                  },
                  displayName: 'Good team',
                },
              },
            ],
          },
        }),
      });

      const result = await userDataProvider.fetchById('123');
      expect(result!.teams).toHaveLength(1);
      expect(result!.teams[0]!.displayName).toEqual('Good team');
    });

    test('should normalise invalid user roles to "Guest"', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          role: 'Not a role',
        }),
      });
      const result = await userDataProvider.fetchById('123');
      expect(result!.role).toEqual('Guest');
    });

    test('should normalise invalid user degree properties to undefined', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          degree: 'Not a degree',
        }),
      });
      const result = await userDataProvider.fetchById('123');
      expect(result!.degree).toBe(undefined);
    });

    test('should remove labs without a name', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          labsCollection: {
            items: [
              {
                sys: {
                  id: '1',
                },
                name: 'My lab',
              },
              {
                sys: {
                  id: '2',
                },
                name: null,
              },
            ],
          },
        }),
      });

      const result = await userDataProvider.fetchById('123');
      expect(result!.labs).toHaveLength(1);
      expect(result!.labs[0]!.name).toEqual('My lab');
    });

    test('should map labPrincipalInvestigatorId when present', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          labsCollection: {
            items: [
              {
                sys: {
                  id: '1',
                },
                name: 'My lab',
                labPi: {
                  sys: {
                    id: 'pi-1',
                  },
                },
              } as any,
            ],
          },
        }),
      });

      const result = await userDataProvider.fetchById('123');
      expect(result!.labs).toHaveLength(1);
      expect(result!.labs[0]!.labPrincipalInvestigatorId).toEqual('pi-1');
    });

    test('should tag alumni users', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          alumniSinceDate: '2020-01-01T12:00:00.000Z',
        }),
      });

      const result = await userDataProvider.fetchById('123');

      expect(result!.membershipStatus).toEqual(['Alumni Member']);
    });

    test('should tag non-alumni users', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          alumniSinceDate: null,
        }),
      });

      const result = await userDataProvider.fetchById('123');

      expect(result!.membershipStatus).toEqual(['CRN Member']);
    });

    test('should fall back to `firstPublishedAt` if `createdDate` does not exist', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          sys: {
            id: '123',
            firstPublishedAt: '2018-02-14T12:00:00.000Z',
          },
          createdDate: null,
        }),
      });

      const result = await userDataProvider.fetchById('123');

      expect(result!.createdDate).toEqual('2018-02-14T12:00:00.000Z');
    });

    test('should throw an error when orcid-works field does not adhere to the interface', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          orcidWorks: { invalid: 'data' },
        }),
      });

      await expect(userDataProvider.fetchById('123')).rejects.toThrow(
        'Invalid ORCID works content data',
      );
    });

    describe('default values', () => {
      const stringFields = {
        email: null,
        firstName: null,
        lastName: null,
      };
      const fields = {
        contactEmail: null,
        biography: null,
        jobTitle: null,
        city: null,
        country: null,
        institution: null,
        orcid: null,
        orcidLastModifiedDate: null,
        orcidLastSyncDate: null,
        alumniLocation: null,
        alumniSinceDate: null,
        reachOut: null,
        researchInterests: null,
        responsibilities: null,
        expertiseAndResourceDescription: null,
      };
      const social = {
        website1: null,
        website2: null,
        linkedIn: null,
        orcid: null,
        researcherId: null,
        twitter: null,
        github: null,
        googleScholar: null,
        researchGate: null,
      };

      let result: UserDataObject | null = null;

      beforeAll(async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: getContentfulGraphqlUser({
            ...stringFields,
            ...fields,
          }),
        });
        result = await userDataProvider.fetchById('123');
      });

      test.each(Object.keys(stringFields) as (keyof UserDataObject)[])(
        '%s should default null value to an empty string',
        async (key) => {
          expect(result?.[key]).toEqual('');
        },
      );
      test.each(Object.keys(fields) as (keyof UserDataObject)[])(
        '%s should default null value to undefined',
        async (key) => {
          expect(result?.[key]).toBeUndefined();
        },
      );
      test.each(Object.keys(social) as (keyof UserSocialLinks)[])(
        'social.%s should default null value to undefined',
        async (key) => {
          expect(result?.social?.[key]).toBeUndefined();
        },
      );
    });

    test('should filter null tag items', async () => {
      const id = 'user-id-1';
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          researchTagsCollection: {
            items: [null, { sys: { id: '1' }, name: 'Lysosomes' }],
          },
        }),
      });

      const response = await userDataProvider.fetchById(id);
      expect(response!.tags).toEqual([{ id: '1', name: 'Lysosomes' }]);
    });

    test('Should default missing research theme to an empty array', async () => {
      const id = 'user-id-1';
      const contentfulUser = getContentfulGraphqlUser();
      contentfulUser.teamsCollection!.items[0]!.team!.researchTheme = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: contentfulUser,
      });

      const response = await userDataProvider.fetchById(id);
      expect(response!.researchTheme).toEqual([]);
    });
  });

  describe('FetchByIdForAlgoliaList', () => {
    test('fetches the user by id for Algolia list', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUserListItem(),
      });

      const result = await userDataProvider.fetchByIdForAlgoliaList('123');

      expect(result).toEqual(getUserListItemDataObject());
      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        FETCH_USER_BY_ID_FOR_ALGOLIA_LIST,
        { id: '123', publicUser: false },
      );
    });

    test('returns null if user does not exist', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: null,
      });
      const result = await userDataProvider.fetchByIdForAlgoliaList('abc');
      expect(result).toEqual(null);
    });

    test('should use the correct GraphQL query', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUserListItem(),
      });

      await userDataProvider.fetchByIdForAlgoliaList('user-id');

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        FETCH_USER_BY_ID_FOR_ALGOLIA_LIST,
        { id: 'user-id', publicUser: false },
      );
    });
  });

  describe('Fetch', () => {
    test('should receive a user list', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: {
          total: 1,
          items: [getContentfulGraphqlUserListItem()],
        },
      });
      const result = await userDataProvider.fetch({});

      expect(result.total).toEqual(1);
      expect(result.items).toEqual([getUserListItemDataObject()]);
    });

    test('should return empty social links when userSocials is null', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: {
          total: 1,
          items: [getContentfulGraphqlUserListItem({ userSocials: null })],
        },
      });
      const result = await userDataProvider.fetch({});

      expect(result.items[0]?.social).toEqual({});
    });

    test('should return an empty response if there is no result', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: null,
      });
      const result = await userDataProvider.fetch({});
      expect(result).toEqual({
        total: 0,
        items: [],
      });
    });

    test('should filter user teams without roles', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: {
          total: 1,
          items: [
            getContentfulGraphqlUserListItem({
              teamsCollection: {
                items: [
                  {
                    team: {
                      sys: {
                        id: 'team-id-0',
                      },
                      displayName: 'Team A',
                    },
                  },
                  {
                    role: 'Lead PI (Core Leadership)',
                    team: {
                      sys: {
                        id: 'team-id-1',
                      },
                      displayName: 'Team B',
                    },
                  },
                ],
              },
            }),
          ],
        },
      });
      const result = await userDataProvider.fetch({});
      expect(result).toEqual({
        total: 1,
        items: [
          {
            ...getUserListItemDataObject(),
            teams: [
              {
                id: 'team-id-1',
                role: 'Lead PI (Core Leadership)',
                displayName: 'Team B',
              },
            ],
          },
        ],
      });
    });

    test.each([
      { membershipStatus: 'CRN Member', alumniSinceDate: null },
      {
        membershipStatus: 'Alumni Member',
        alumniSinceDate: '2020-01-01T12:00:00.000Z',
      },
    ])(
      'should return membershipStatus as $membershipStatus if alumniSinceDate is $alumniSinceDate',
      async ({ membershipStatus, alumniSinceDate }) => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          usersCollection: {
            total: 1,
            items: [
              getContentfulGraphqlUserListItem({
                alumniSinceDate,
              }),
            ],
          },
        });
        const result = await userDataProvider.fetch({});
        expect(result).toEqual({
          total: 1,
          items: [
            {
              ...getUserListItemDataObject(),
              alumniSinceDate,
              membershipStatus: [membershipStatus],
            },
          ],
        });
      },
    );

    test('should filter out team memberships not linked to a user', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        teamMembershipCollection: {
          total: 3,
          items: [
            {
              linkedFrom: {
                usersCollection: {
                  total: 1,
                  items: [{ ...getContentfulGraphqlUser(), firstName: 'Alan' }],
                },
              },
            },
            {
              linkedFrom: {
                usersCollection: {
                  total: 0,
                  items: [],
                },
              },
            },
            {
              linkedFrom: {
                usersCollection: {
                  total: 1,
                  items: [
                    { ...getContentfulGraphqlUser(), firstName: 'Brady' },
                  ],
                },
              },
            },
          ],
        },
      });

      const result = await userDataProvider.fetch({ filter: { teamId: 'A' } });
      expect(result!.total).toEqual(2);
      expect(result!.items.map((item) => item.firstName)).toEqual([
        'Alan',
        'Brady',
      ]);
    });

    describe('fetch by lab', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });
      test('should return empty result when labs is null', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          labs: null,
        });

        const result = await userDataProvider.fetch({
          filter: { labId: '1234567' },
        });

        expect(result).toEqual({
          total: 0,
          items: [],
        });
      });

      test('should return empty result when labMembershipCollection is null', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          labs: {
            linkedFrom: {
              labMembershipCollection: null,
            },
          },
        });

        const result = await userDataProvider.fetch({
          filter: { labId: '1234567' },
        });

        expect(result).toEqual({
          total: 0,
          items: [],
        });
      });

      test('should return the users in the lab', async () => {
        const contentfulGraphqlUser = getContentfulGraphqlUser();
        const labByIdGraphqlResponse = {
          labs: {
            linkedFrom: {
              labMembershipCollection: {
                total: 1,
                items: [
                  {
                    linkedFrom: {
                      usersCollection: {
                        items: [contentfulGraphqlUser],
                      },
                    },
                  },
                ],
              },
            },
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          labByIdGraphqlResponse,
        );

        const result = await userDataProvider.fetch({
          filter: { labId: '1234567' },
        });

        const userResponse = getUserListItemDataObject();
        userResponse.avatarUrl = undefined;
        userResponse.biography = 'some bio';
        userResponse.contactEmail = 'T@rdy.io';
        userResponse.orcid = '123-456-789';
        userResponse.social = {};
        expect(result).toEqual({
          total: 1,
          items: [userResponse],
        });
      });
    });

    describe('fetch by team membership', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      test('should return empty result when teamMembershipCollection is null', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamMembershipCollection: null,
        });

        const result = await userDataProvider.fetch({
          filter: { teamMembershipId: 'membership-123' },
        });

        expect(result).toEqual({
          total: 0,
          items: [],
        });
      });

      test('should return empty result when teamMembershipCollection items is null', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamMembershipCollection: {
            items: null,
          },
        });

        const result = await userDataProvider.fetch({
          filter: { teamMembershipId: 'membership-123' },
        });

        expect(result).toEqual({
          total: 0,
          items: [],
        });
      });

      test('should return the user linked to the team membership', async () => {
        const contentfulGraphqlUser = getContentfulGraphqlUser();
        const teamMembershipByIdGraphqlResponse = {
          teamMembershipCollection: {
            items: [
              {
                linkedFrom: {
                  usersCollection: {
                    items: [contentfulGraphqlUser],
                  },
                },
              },
            ],
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          teamMembershipByIdGraphqlResponse,
        );

        const result = await userDataProvider.fetch({
          filter: { teamMembershipId: 'membership-123' },
        });

        const userResponse = getUserListItemDataObject();
        userResponse.avatarUrl = undefined;
        userResponse.biography = 'some bio';
        userResponse.contactEmail = 'T@rdy.io';
        userResponse.orcid = '123-456-789';
        userResponse.social = {};
        expect(result).toEqual({
          total: 1,
          items: [userResponse],
        });
      });

      test('should filter out team memberships not linked to a user', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamMembershipCollection: {
            items: [
              {
                linkedFrom: {
                  usersCollection: {
                    items: [
                      { ...getContentfulGraphqlUser(), firstName: 'Alice' },
                    ],
                  },
                },
              },
              {
                linkedFrom: {
                  usersCollection: {
                    items: [],
                  },
                },
              },
              {
                linkedFrom: {
                  usersCollection: {
                    items: [
                      { ...getContentfulGraphqlUser(), firstName: 'Bob' },
                    ],
                  },
                },
              },
            ],
          },
        });

        const result = await userDataProvider.fetch({
          filter: { teamMembershipId: 'membership-123' },
        });

        expect(result!.total).toEqual(2);
        expect(result!.items.map((item) => item.firstName)).toEqual([
          'Alice',
          'Bob',
        ]);
      });

      test('should filter out null team membership items', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          teamMembershipCollection: {
            items: [
              null,
              {
                linkedFrom: {
                  usersCollection: {
                    items: [
                      { ...getContentfulGraphqlUser(), firstName: 'Charlie' },
                    ],
                  },
                },
              },
            ],
          },
        });

        const result = await userDataProvider.fetch({
          filter: { teamMembershipId: 'membership-123' },
        });

        expect(result!.total).toEqual(1);
        expect(result!.items[0]!.firstName).toEqual('Charlie');
      });
    });

    describe('query parameters', () => {
      beforeEach(() => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          usersCollection: {
            total: 0,
            items: [],
          },
        });
      });

      test('should set default pagination parameters', async () => {
        await userDataProvider.fetch({});
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS,
          expect.objectContaining({ limit: 8, skip: 0 }),
        );
      });

      test('should pass pagination parameters if provided', async () => {
        await userDataProvider.fetch({ take: 20, skip: 20 });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS,
          expect.objectContaining({ limit: 20, skip: 20 }),
        );
      });

      test('should filter out non-onboarded users by default', async () => {
        await userDataProvider.fetch({});
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS,
          expect.objectContaining({
            where: expect.objectContaining({ onboarded: true }),
          }),
        );
      });

      test('should allow including non-onboarded users', async () => {
        await userDataProvider.fetch({ filter: { onboarded: false } });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS,
          expect.objectContaining({
            where: expect.not.objectContaining({
              onboarded: expect.anything(),
            }),
          }),
        );
      });

      test('should filter out hidden users by default', async () => {
        await userDataProvider.fetch({});
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS,
          expect.objectContaining({
            where: expect.objectContaining({ role_not: 'Hidden' }),
          }),
        );
      });

      test('should allow including hidden users', async () => {
        await userDataProvider.fetch({ filter: { hidden: false } });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS,
          expect.objectContaining({
            where: expect.not.objectContaining({ role_not: expect.anything() }),
          }),
        );
      });

      test('should enable filtering by a connection code', async () => {
        await userDataProvider.fetch({ filter: { code: 'google-auth-123' } });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS,
          expect.objectContaining({
            where: expect.objectContaining({
              connections_contains_all: ['google-auth-123'],
            }),
          }),
        );
      });

      test('should support filtering by lab', async () => {
        await userDataProvider.fetch({
          filter: { labId: '1234567' },
        });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS_BY_LAB_ID,
          expect.objectContaining({ id: '1234567' }),
        );
      });

      test('should support filtering by team', async () => {
        await userDataProvider.fetch({ filter: { teamId: '1234567' } });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS_BY_TEAM_ID,
          expect.objectContaining({ id: '1234567' }),
        );
      });

      test('should support filtering by teamMembershipId', async () => {
        await userDataProvider.fetch({
          filter: { teamMembershipId: 'membership-123' },
        });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS_BY_TEAM_MEMBERSHIP_ID,
          expect.objectContaining({ id: 'membership-123' }),
        );
      });

      test('should support filtering by orcid', async () => {
        await userDataProvider.fetch({
          filter: { orcid: '0000-0000-1111-1111' },
        });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS,
          expect.objectContaining({
            where: expect.objectContaining({
              orcid_contains: '0000-0000-1111-1111',
            }),
          }),
        );
      });

      test('should support filtering by orcidLastSyncDate', async () => {
        await userDataProvider.fetch({
          filter: {
            orcidLastSyncDate: 'some-date',
          },
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_USERS,
          expect.objectContaining({
            where: expect.objectContaining({
              orcidLastSyncDate_lt: 'some-date',
            }),
          }),
        );
      });
      test('Should query data properly when passing search param', async () => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getContentfulGraphqlUser(),
        );

        const search = 'Tag';
        await userDataProvider.fetch({
          search,
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            limit: 8,
            order: ['lastName_ASC'],
            skip: 0,
            where: {
              AND: [
                { OR: [{ expertiseAndResourceDescription_contains: 'Tag' }] },
              ],
              onboarded: true,
              role_not: 'Hidden',
            },
          }),
        );
      });
    });
  });

  describe('FetchPublicUsers', () => {
    test('should receive a user list', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: {
          total: 1,
          items: [getContentfulGraphqlUser()],
        },
      });

      const result = await userDataProvider.fetchPublicUsers({});

      expect(result.total).toEqual(1);
      expect(result.items[0]).toEqual({
        biography: 'some bio',
        city: 'London',
        country: 'United Kingdom',
        createdDate: '2020-09-23T20:45:22.000Z',
        degree: 'MPH',
        alumni: 'Yes',
        firstName: 'Tom',
        id: 'user-id-1',
        institution: 'some institution',
        interestGroups: [
          { active: true, id: 'ig-1', name: 'interest-group-1' },
          { active: false, id: 'ig-2', name: 'interest-group-2' },
          {
            active: true,
            id: 'interest-group-leader-1',
            name: 'Interest Group Leader 1',
            role: 'Project Manager',
          },
        ],
        labs: [
          { id: 'cd7be4902', name: 'Brighton' },
          { id: 'cd7be4903', name: 'Liverpool' },
        ],
        lastModifiedDate: '2021-09-23T20:45:22.000Z',
        lastName: 'Hardy',
        personalEmail: 'personal@rdy.io',
        researchOutputs: [],
        researchTheme: ['PD Functional Genomics'],
        social: {
          github: undefined,
          googleScholar: undefined,
          linkedIn: undefined,
          orcid: '123-456-789',
          researchGate: undefined,
          researcherId: undefined,
          twitter: undefined,
          website1: undefined,
          website2: undefined,
        },
        tags: [
          'expertise 1',
          'expertise 2',
          'expertise 3',
          'expertise 4',
          'expertise 5',
        ],
        teams: [{ displayName: 'Team A', role: 'Lead PI (Core Leadership)' }],
        workingGroups: [],
      });
    });

    test('should return an empty response if there is no result', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: null,
      });
      const result = await userDataProvider.fetch({});
      expect(result).toEqual({
        total: 0,
        items: [],
      });
    });

    test('should filter out research outputs where the user is not the author', async () => {
      const graphqlUser = getContentfulGraphqlUser();
      graphqlUser.linkedFrom!.researchOutputsCollection = {
        items: [
          {
            sys: {
              id: 'research-output-1',
            },
            authorsCollection: {
              items: [
                {
                  __typename: 'Users',
                  sys: {
                    id: graphqlUser.sys.id,
                  },
                },
              ],
            },
          },
          {
            sys: {
              id: 'research-output-2',
            },
            authorsCollection: {
              items: [
                {
                  __typename: 'Users',
                  sys: {
                    id: 'random-user-id',
                  },
                },
              ],
            },
          },
        ],
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        usersCollection: {
          total: 1,
          items: [graphqlUser],
        },
      });

      const result = await userDataProvider.fetchPublicUsers({});
      expect(result!.items[0]!.researchOutputs).toEqual(['research-output-1']);
    });

    describe('query parameters', () => {
      beforeEach(() => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          usersCollection: {
            total: 0,
            items: [],
          },
        });
      });

      test('should set default pagination parameters', async () => {
        await userDataProvider.fetchPublicUsers({});
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_PUBLIC_USERS,
          expect.objectContaining({ limit: 8, skip: 0 }),
        );
      });

      test('should pass pagination parameters if provided', async () => {
        await userDataProvider.fetchPublicUsers({ take: 20, skip: 20 });
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_PUBLIC_USERS,
          expect.objectContaining({ limit: 20, skip: 20 }),
        );
      });

      test('should filter out non-onboarded users by default', async () => {
        await userDataProvider.fetchPublicUsers({});
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_PUBLIC_USERS,
          expect.objectContaining({
            where: expect.objectContaining({ onboarded: true }),
          }),
        );
      });

      test('should filter out hidden users by default', async () => {
        await userDataProvider.fetchPublicUsers({});
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          FETCH_PUBLIC_USERS,
          expect.objectContaining({
            where: expect.objectContaining({ role_not: 'Hidden' }),
          }),
        );
      });
    });
  });

  describe('Update', () => {
    const entry = getEntry({
      firstName: 'Test',
      lastName: 'User',
    });
    const mockPatchAndPublishConflict =
      patchAndPublishConflict as jest.MockedFunction<
        typeof patchAndPublishConflict
      >;
    const mockPatchAndPublish = patchAndPublish as jest.MockedFunction<
      typeof patchAndPublish
    >;

    beforeEach(() => {
      environmentMock.getEntry.mockResolvedValueOnce(entry);
      mockPatchAndPublish.mockResolvedValue({
        sys: {
          publishedVersion: 2,
        },
      } as Entry);
      mockPatchAndPublishConflict.mockResolvedValue({
        sys: {
          publishedVersion: 2,
        },
      } as Entry);
      const user = getContentfulGraphqlUser();
      contentfulGraphqlClientMock.request.mockResolvedValue({
        users: {
          ...user,
          sys: {
            ...user.sys,
            publishedVersion: 2,
          },
        },
      });
    });

    describe('polling', () => {
      test('it is true by default when no options is passed, thus it makes a graphql request', async () => {
        await userDataProvider.update('123', {
          firstName: 'Colin',
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalled();
      });

      test('does not call graphql request when polling is passed as false', async () => {
        await userDataProvider.update(
          '123',
          {
            firstName: 'Colin',
          },
          { polling: false },
        );

        expect(contentfulGraphqlClientMock.request).not.toHaveBeenCalled();
      });
    });

    describe('suppressConflict false', () => {
      test('fetches entry from contentful and passes to `patchAndPublish`', async () => {
        await userDataProvider.update('123', {
          firstName: 'Colin',
        });
        expect(environmentMock.getEntry).toHaveBeenCalledWith('123');
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          firstName: 'Colin',
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalled();
      });

      test('writes `social` values to the linked socials entry', async () => {
        const socialsEntry = getEntry({});
        environmentMock.getEntry.mockReset();
        environmentMock.getEntry
          .mockResolvedValueOnce(
            getEntry({
              userSocials: { 'en-US': { sys: { id: 'socials-123' } } },
            }),
          )
          .mockResolvedValueOnce(socialsEntry);

        await userDataProvider.update('123', {
          social: {
            github: 'asaphub',
            twitter: 'asaphub',
          },
        });

        expect(patchAndPublish).toHaveBeenCalledWith(
          socialsEntry,
          expect.objectContaining({ github: 'asaphub', twitter: 'asaphub' }),
        );
        expect(patchAndPublish).not.toHaveBeenCalledWith(
          entry,
          expect.objectContaining({ github: 'asaphub' }),
        );
      });

      test('creates and links a socials entry when the user has none', async () => {
        const createdEntry = getEntry({});
        environmentMock.getEntry.mockReset();
        environmentMock.getEntry.mockImplementation(async (entryId: string) => {
          if (entryId === 'socials-entry-id') {
            throw new Error('NotFound');
          }
          return getEntry({});
        });
        environmentMock.createEntryWithId.mockResolvedValueOnce(createdEntry);

        await userDataProvider.update('123', {
          social: { github: 'asaphub' },
        });

        expect(environmentMock.createEntryWithId).toHaveBeenCalledWith(
          'socials',
          'socials-entry-id',
          expect.objectContaining({
            fields: expect.objectContaining({
              github: { 'en-US': 'asaphub' },
            }),
          }),
        );
        expect(createdEntry.publish).toHaveBeenCalled();
      });

      test('reuses an existing socials entry that is not linked yet', async () => {
        const existingEntry = getEntry({});
        (existingEntry.update as jest.Mock).mockResolvedValue(existingEntry);
        environmentMock.getEntry.mockReset();
        environmentMock.getEntry.mockImplementation(async (entryId: string) =>
          entryId === 'socials-entry-id' ? existingEntry : getEntry({}),
        );

        await userDataProvider.update('123', {
          social: { github: 'asaphub' },
        });

        expect(environmentMock.getEntry).toHaveBeenCalledWith(
          'socials-entry-id',
        );
        expect(environmentMock.createEntryWithId).not.toHaveBeenCalled();
        expect(existingEntry.update).toHaveBeenCalled();
        expect(existingEntry.fields).toEqual(
          expect.objectContaining({ github: { 'en-US': 'asaphub' } }),
        );
      });

      test('includes undefined `social` values as null to allow unsetting', async () => {
        const socialsEntry = getEntry({});
        environmentMock.getEntry.mockReset();
        environmentMock.getEntry
          .mockResolvedValueOnce(
            getEntry({
              userSocials: { 'en-US': { sys: { id: 'socials-123' } } },
            }),
          )
          .mockResolvedValueOnce(socialsEntry);

        await userDataProvider.update('123', {
          social: {
            github: 'asaphub',
            twitter: 'asaphub',
          },
        });

        expect(patchAndPublish).toHaveBeenCalledWith(socialsEntry, {
          website1: null,
          website2: null,
          googleScholar: null,
          linkedIn: null,
          researchGate: null,
          researcherId: null,
          github: 'asaphub',
          twitter: 'asaphub',
          blueSky: null,
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

      describe('changing the avatar', () => {
        const buildAssetMock = (isPublished = true) =>
          ({
            isPublished: jest.fn().mockReturnValue(isPublished),
            unpublish: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(undefined),
          }) as unknown as Asset;

        const entryWithAvatar = () =>
          getEntry({
            firstName: { 'en-US': 'Test' },
            avatar: { 'en-US': { sys: { id: 'asset-1' } } },
          });

        beforeEach(() => {
          // replace the parent's default entry with one that has an avatar link
          environmentMock.getEntry.mockReset();
          environmentMock.getEntry.mockResolvedValueOnce(entryWithAvatar());
        });

        test('clears the avatar link when avatar is null', async () => {
          environmentMock.getAsset.mockResolvedValueOnce(buildAssetMock());

          await userDataProvider.update('123', { avatar: null });

          expect(patchAndPublish).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ avatar: null }),
          );
        });

        test('unpublishes and deletes the previous asset when cleared', async () => {
          const asset = buildAssetMock();
          environmentMock.getAsset.mockResolvedValueOnce(asset);

          await userDataProvider.update('123', { avatar: null });

          expect(environmentMock.getAsset).toHaveBeenCalledWith('asset-1');
          expect(asset.unpublish).toHaveBeenCalled();
          expect(asset.delete).toHaveBeenCalled();
        });

        test('deletes the previous asset when the avatar is replaced', async () => {
          const asset = buildAssetMock();
          environmentMock.getAsset.mockResolvedValueOnce(asset);

          await userDataProvider.update('123', { avatar: 'asset-2' });

          expect(environmentMock.getAsset).toHaveBeenCalledWith('asset-1');
          expect(asset.delete).toHaveBeenCalled();
        });

        test('does not delete the asset when the avatar is unchanged', async () => {
          await userDataProvider.update('123', { avatar: 'asset-1' });

          expect(environmentMock.getAsset).not.toHaveBeenCalled();
        });

        test('does not delete any asset when the avatar field is not updated', async () => {
          await userDataProvider.update('123', { firstName: 'New' });

          expect(environmentMock.getAsset).not.toHaveBeenCalled();
        });

        test('does not unpublish an unpublished asset', async () => {
          const asset = buildAssetMock(false);
          environmentMock.getAsset.mockResolvedValueOnce(asset);

          await userDataProvider.update('123', { avatar: null });

          expect(asset.unpublish).not.toHaveBeenCalled();
          expect(asset.delete).toHaveBeenCalled();
        });

        test('does not attempt to delete an asset when none existed', async () => {
          environmentMock.getEntry.mockReset();
          environmentMock.getEntry.mockResolvedValueOnce(
            getEntry({ firstName: { 'en-US': 'Test' } }),
          );

          await userDataProvider.update('123', { avatar: 'asset-2' });

          expect(environmentMock.getAsset).not.toHaveBeenCalled();
        });

        test('swallows errors when the asset deletion fails', async () => {
          environmentMock.getAsset.mockRejectedValueOnce(
            new Error('asset gone'),
          );

          await expect(
            userDataProvider.update('123', { avatar: null }),
          ).resolves.not.toThrow();
        });

        test('does not delete the asset when a suppressed conflict skips the update', async () => {
          // patchAndPublishConflict resolves undefined on a 409, so the entry
          // was not modified and still links the asset — it must not be deleted
          mockPatchAndPublishConflict.mockResolvedValueOnce(
            undefined as unknown as Entry,
          );

          await userDataProvider.update(
            '123',
            { avatar: null },
            { suppressConflict: true },
          );

          expect(environmentMock.getAsset).not.toHaveBeenCalled();
        });
      });
      test('map tag value to a linked resource', async () => {
        await userDataProvider.update('123', {
          tagIds: ['1'],
        });

        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          researchTags: [
            {
              sys: {
                type: 'Link',
                linkType: 'Entry',
                id: '1',
              },
            },
          ],
        });
      });
      test('converts empty string values to `null`', async () => {
        await userDataProvider.update('123', {
          firstName: '  ',
          degree: '',
          onboarded: false,
        });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          firstName: null,
          degree: null,
          onboarded: false,
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
        contentfulGraphqlClientMock.request.mockReset().mockResolvedValueOnce({
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

    describe('alumniLastUpdated stamping', () => {
      beforeEach(() => {
        jest
          .useFakeTimers()
          .setSystemTime(new Date('2026-06-16T12:00:00.000Z'));
      });
      afterEach(() => {
        jest.useRealTimers();
      });

      test('stamps alumniLastUpdated when alumniSinceDate is in the payload', async () => {
        await userDataProvider.update('123', {
          alumniSinceDate: '2026-06-16T12:00:00.000Z',
        } as any);
        expect(patchAndPublish).toHaveBeenCalledWith(
          entry,
          expect.objectContaining({
            alumniLastUpdated: '2026-06-16T12:00:00.000Z',
          }),
        );
      });

      test('stamps alumniLastUpdated when alumniLocation is in the payload', async () => {
        await userDataProvider.update('123', {
          alumniLocation: 'New York',
        } as any);
        expect(patchAndPublish).toHaveBeenCalledWith(
          entry,
          expect.objectContaining({
            alumniLastUpdated: '2026-06-16T12:00:00.000Z',
          }),
        );
      });

      test('stamps alumniLastUpdated when email is in the payload and user is alumni', async () => {
        const alumniEntry = getEntry({
          firstName: 'Test',
          lastName: 'User',
          alumniSinceDate: { 'en-US': '2024-01-01T00:00:00.000Z' },
        });
        environmentMock.getEntry.mockReset();
        environmentMock.getEntry.mockResolvedValueOnce(alumniEntry);
        await userDataProvider.update('123', {
          email: 'new@example.com',
        });
        expect(patchAndPublish).toHaveBeenCalledWith(
          alumniEntry,
          expect.objectContaining({
            alumniLastUpdated: '2026-06-16T12:00:00.000Z',
          }),
        );
      });

      test('does not stamp alumniLastUpdated when email changes on non-alumni user', async () => {
        await userDataProvider.update('123', {
          email: 'new@example.com',
        });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          email: 'new@example.com',
        });
      });

      test('stamps alumniLastUpdated when alumniSinceDate is explicitly cleared', async () => {
        await userDataProvider.update('123', {
          alumniSinceDate: undefined,
        } as any);
        expect(patchAndPublish).toHaveBeenCalledWith(
          entry,
          expect.objectContaining({
            alumniLastUpdated: '2026-06-16T12:00:00.000Z',
          }),
        );
      });

      test('does not stamp alumniLastUpdated for unrelated fields', async () => {
        await userDataProvider.update('123', {
          firstName: 'Colin',
        });
        expect(patchAndPublish).toHaveBeenCalledWith(entry, {
          firstName: 'Colin',
        });
      });
    });

    describe('suppressConflict true', () => {
      test('fetches entry from contentful and passes to `patchAndPublishConflict`', async () => {
        await userDataProvider.update(
          '123',
          {
            firstName: 'Colin',
            middleName: 'Mike',
          },

          { suppressConflict: true },
        );
        expect(environmentMock.getEntry).toHaveBeenCalledWith('123');
        expect(patchAndPublishConflict).toHaveBeenCalledWith(entry, {
          firstName: 'Colin',
          middleName: 'Mike',
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalled();
      });
      test('when conflict should return and not poll', async () => {
        mockPatchAndPublishConflict.mockReset().mockResolvedValueOnce(null);
        await userDataProvider.update(
          '123',
          {
            firstName: 'Colin',
          },
          { suppressConflict: true },
        );
        expect(environmentMock.getEntry).toHaveBeenCalledWith('123');
        expect(patchAndPublishConflict).toHaveBeenCalledWith(entry, {
          firstName: 'Colin',
        });

        expect(contentfulGraphqlClientMock.request).not.toHaveBeenCalled();
      });
      test('writes `social` values to the linked socials entry', async () => {
        const socialsEntry = getEntry({});
        environmentMock.getEntry.mockReset();
        environmentMock.getEntry
          .mockResolvedValueOnce(
            getEntry({
              userSocials: { 'en-US': { sys: { id: 'socials-123' } } },
            }),
          )
          .mockResolvedValueOnce(socialsEntry);

        await userDataProvider.update(
          '123',
          {
            social: {
              github: 'asaphub',
              twitter: 'asaphub',
            },
          },
          { suppressConflict: true },
        );

        expect(patchAndPublish).toHaveBeenCalledWith(
          socialsEntry,
          expect.objectContaining({ github: 'asaphub', twitter: 'asaphub' }),
        );
        expect(patchAndPublishConflict).not.toHaveBeenCalledWith(
          entry,
          expect.objectContaining({ github: 'asaphub' }),
        );
      });
      test('maps avatar value to a linked resource', async () => {
        await userDataProvider.update(
          '123',
          {
            avatar: 'abc123',
          },
          { suppressConflict: true },
        );
        expect(patchAndPublishConflict).toHaveBeenCalledWith(entry, {
          avatar: {
            sys: {
              type: 'Link',
              linkType: 'Asset',
              id: 'abc123',
            },
          },
        });
      });
      test('converts empty string values to `null`', async () => {
        await userDataProvider.update(
          '123',
          {
            firstName: '  ',
            degree: '',
            onboarded: false,
          },
          { suppressConflict: true },
        );
        expect(patchAndPublishConflict).toHaveBeenCalledWith(entry, {
          firstName: null,
          degree: null,
          onboarded: false,
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

        await userDataProvider.update(
          '123',
          {
            firstName: 'Colin',
          },
          { suppressConflict: true },
        );
        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(3);
      });

      test('throws if polling query does not return a value', async () => {
        contentfulGraphqlClientMock.request.mockReset().mockResolvedValueOnce({
          users: null,
        });

        await expect(
          userDataProvider.update(
            '123',
            {
              firstName: 'Colin',
            },
            { suppressConflict: true },
          ),
        ).rejects.toThrow();
      });

      test('unwraps `code` property of connections', async () => {
        await userDataProvider.update(
          '123',
          {
            connections: [{ code: 'abc123' }],
          },
          { suppressConflict: true },
        );
        expect(patchAndPublishConflict).toHaveBeenCalledWith(entry, {
          connections: ['abc123'],
        });
      });
    });
  });

  describe('Create', () => {
    test('not implemented', async () => {
      await expect(
        userDataProvider.create(getUserCreateDataObject()),
      ).rejects.toThrow();
    });
  });

  describe('parseToWorkingGroupsForPublicUser', () => {
    test('should filter out roles not linked to any working group', async () => {
      const workingGroupGQLResponse: (
        | GroupMemberItemPublic
        | GroupLeaderItemPublic
      )[] = [
        {
          inactiveSinceDate: '',
          role: 'Project Manager',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
        },
        {
          inactiveSinceDate: '',
          role: 'Chair',
          linkedFrom: {
            workingGroupsCollection: {
              items: [],
            },
          },
        },
      ];
      const isAlumni = false;
      const parsedWorkingGroups = parseToWorkingGroupsForPublicUser(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups).toEqual([
        {
          name: 'working-group-1',
          role: 'Project Manager',
        },
      ]);
    });

    test('should assign the correct role when user is a leader', () => {
      const workingGroupGQLResponse: (
        | GroupMemberItemPublic
        | GroupLeaderItemPublic
      )[] = [
        {
          inactiveSinceDate: '',
          role: 'Project Manager',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
        },
      ];
      const isAlumni = false;
      const parsedWorkingGroups = parseToWorkingGroupsForPublicUser(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups[0]!.role).toBe('Project Manager');
    });

    test('should assign the correct role when user is a member', () => {
      const workingGroupGQLResponse: (
        | GroupMemberItemPublic
        | GroupLeaderItemPublic
      )[] = [
        {
          inactiveSinceDate: '',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
        },
      ];
      const isAlumni = false;
      const parsedWorkingGroups = parseToWorkingGroupsForPublicUser(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups[0]!.role).toBe('Member');
    });

    test('should not return inactive working group membership', () => {
      const workingGroupGQLResponse: (
        | GroupMemberItemPublic
        | GroupLeaderItemPublic
      )[] = [
        {
          inactiveSinceDate: '2020-09-23T20:45:22Z',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
        },
      ];
      const isAlumni = false;
      const parsedWorkingGroups = parseToWorkingGroupsForPublicUser(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups.length).toBe(0);
    });

    test('should not return working groups if user is set as alumni', () => {
      const workingGroupGQLResponse: (
        | GroupMemberItemPublic
        | GroupLeaderItemPublic
      )[] = [
        {
          inactiveSinceDate: '',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
        },
      ];
      const isAlumni = true;
      const parsedWorkingGroups = parseToWorkingGroupsForPublicUser(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups.length).toBe(0);
    });

    test('should not return complete working groups', () => {
      const workingGroupGQLResponse: (
        | GroupMemberItemPublic
        | GroupLeaderItemPublic
      )[] = [
        {
          inactiveSinceDate: '',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  title: 'working-group-1',
                  complete: true,
                },
              ],
            },
          },
        },
      ];
      const isAlumni = false;
      const parsedWorkingGroups = parseToWorkingGroupsForPublicUser(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups.length).toBe(0);
    });
  });

  describe('parseToWorkingGroups', () => {
    test('should discard working group roles that are not linked to a working group', async () => {
      const workingGroupGQLResponse = [
        {
          inactiveSinceDate: '',
          role: 'Project Manager',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  sys: {
                    id: 'wg-1',
                  },
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
          user: {
            lastName: 'simpson',
          },
        },
        {
          inactiveSinceDate: '',
          role: 'Chair',
          linkedFrom: {
            workingGroupsCollection: {
              items: [],
            },
          },
          user: {
            lastName: 'simpson',
          },
        },
      ];
      const isAlumni = false;
      const parsedWorkingGroups = parseToWorkingGroups(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups).toEqual([
        {
          id: 'wg-1',
          active: true,
          name: 'working-group-1',
          role: 'Project Manager',
        },
      ]);
    });
    test('should set role to leadership role for leaders', () => {
      const workingGroupGQLResponse = [
        {
          inactiveSinceDate: '',
          role: 'Project Manager',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  sys: {
                    id: 'wg-1',
                  },
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
          user: {
            lastName: 'simpson',
          },
        },
      ];
      const isAlumni = false;
      const parsedWorkingGroups = parseToWorkingGroups(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups[0]!.role).toBe('Project Manager');
    });

    test('should set role to `Member` for members', () => {
      const workingGroupGQLResponse = [
        {
          inactiveSinceDate: '',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  sys: {
                    id: 'wg-1',
                  },
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
          user: {
            lastName: 'simpson',
          },
        },
      ];
      const isAlumni = false;
      const parsedWorkingGroups = parseToWorkingGroups(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups[0]!.role).toBe('Member');
    });

    test('should set active to false if user is set to inactive', () => {
      const workingGroupGQLResponse = [
        {
          inactiveSinceDate: '2020-09-23T20:45:22Z',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  sys: {
                    id: 'wg-1',
                  },
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
          user: {
            lastName: 'simpson',
          },
        },
      ];
      const isAlumni = false;
      const parsedWorkingGroups = parseToWorkingGroups(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups[0]!.active).toBe(false);
    });

    test('should set active to false if user is set as alumni', () => {
      const workingGroupGQLResponse = [
        {
          inactiveSinceDate: '',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  sys: {
                    id: 'wg-1',
                  },
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
          user: {
            lastName: 'simpson',
          },
        },
      ];
      const isAlumni = true;
      const parsedWorkingGroups = parseToWorkingGroups(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups[0]!.active).toBe(false);
    });

    test('should set active to false if working group is complete', () => {
      const workingGroupGQLResponse = [
        {
          inactiveSinceDate: '',
          linkedFrom: {
            workingGroupsCollection: {
              items: [
                {
                  sys: {
                    id: 'wg-1',
                  },
                  title: 'working-group-1',
                  complete: false,
                },
              ],
            },
          },
          user: {
            lastName: 'simpson',
          },
        },
      ];
      const isAlumni = true;
      const parsedWorkingGroups = parseToWorkingGroups(
        workingGroupGQLResponse,
        isAlumni,
      );
      expect(parsedWorkingGroups[0]!.active).toBe(false);
    });
  });

  describe('User projects parsing', () => {
    test('should parse direct project memberships (Trainee Projects)', async () => {
      const userWithDirectProject = {
        ...getContentfulGraphqlUser(),
        linkedFrom: {
          ...getContentfulGraphqlUser().linkedFrom,
          projectMembershipCollection: {
            items: [
              {
                linkedFrom: {
                  projectsCollection: {
                    items: [
                      {
                        sys: { id: 'trainee-project-1' },
                        title: 'My Trainee Project',
                        projectType: 'Trainee Project',
                        status: 'Active',
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: userWithDirectProject,
      });

      const result = await userDataProvider.fetchById('123');
      expect(result?.projects).toContainEqual({
        id: 'trainee-project-1',
        title: 'My Trainee Project',
        projectType: 'Trainee Project',
        status: 'Active',
      });
    });

    test('should deduplicate projects appearing in both team and direct memberships', async () => {
      const userWithDuplicateProject = {
        ...getContentfulGraphqlUser(),
        teamsCollection: {
          items: [
            {
              role: 'Lead PI (Core Leadership)',
              inactiveSinceDate: null,
              team: {
                sys: { id: 'team-id-1' },
                displayName: 'Team 1',
                inactiveSince: null,
                researchTheme: { name: 'PD Functional Genomics' },
                linkedFrom: {
                  interestGroupsTeamsCollection: { items: [] },
                  projectMembershipCollection: {
                    items: [
                      {
                        linkedFrom: {
                          projectsCollection: {
                            items: [
                              {
                                sys: { id: 'shared-project-id' },
                                title: 'Shared Project',
                                projectType: 'Discovery Project',
                                proposal: null,
                              },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
        linkedFrom: {
          ...getContentfulGraphqlUser().linkedFrom,
          projectMembershipCollection: {
            items: [
              {
                linkedFrom: {
                  projectsCollection: {
                    items: [
                      {
                        sys: { id: 'shared-project-id' },
                        title: 'Shared Project',
                        projectType: 'Discovery Project',
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: userWithDuplicateProject,
      });

      const result = await userDataProvider.fetchById('123');
      const projectsWithSharedId = result?.projects.filter(
        (p) => p.id === 'shared-project-id',
      );
      expect(projectsWithSharedId).toHaveLength(1);
    });

    test('should skip projects missing required fields', async () => {
      const userWithIncompleteProject = {
        ...getContentfulGraphqlUser(),
        linkedFrom: {
          ...getContentfulGraphqlUser().linkedFrom,
          projectMembershipCollection: {
            items: [
              {
                linkedFrom: {
                  projectsCollection: {
                    items: [
                      {
                        sys: { id: 'valid-project' },
                        title: 'Valid Project',
                        projectType: 'Trainee Project',
                        status: 'Active',
                      },
                    ],
                  },
                },
              },
              {
                linkedFrom: {
                  projectsCollection: {
                    items: [
                      {
                        sys: { id: 'missing-title' },
                        title: null,
                        projectType: 'Trainee Project',
                      },
                    ],
                  },
                },
              },
              {
                linkedFrom: {
                  projectsCollection: {
                    items: [
                      {
                        sys: { id: 'missing-type' },
                        title: 'Missing Type',
                        projectType: null,
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: userWithIncompleteProject,
      });

      const result = await userDataProvider.fetchById('123');
      expect(result?.projects).toContainEqual({
        id: 'valid-project',
        title: 'Valid Project',
        projectType: 'Trainee Project',
        status: 'Active',
      });
      expect(
        result?.projects.find((p) => p.id === 'missing-title'),
      ).toBeUndefined();
      expect(
        result?.projects.find((p) => p.id === 'missing-type'),
      ).toBeUndefined();
    });

    test('should return empty array when no direct project memberships exist', async () => {
      const userWithoutDirectProjects = {
        ...getContentfulGraphqlUser(),
        teamsCollection: {
          items: [
            {
              role: 'Lead PI (Core Leadership)',
              inactiveSinceDate: null,
              team: {
                sys: { id: 'team-id-1' },
                displayName: 'Team 1',
                inactiveSince: null,
                researchTheme: { name: 'PD Functional Genomics' },
                linkedFrom: {
                  interestGroupsTeamsCollection: { items: [] },
                  projectMembershipCollection: { items: [] },
                },
              },
            },
          ],
        },
        linkedFrom: {
          ...getContentfulGraphqlUser().linkedFrom,
          projectMembershipCollection: { items: [] },
        },
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: userWithoutDirectProjects,
      });

      const result = await userDataProvider.fetchById('123');
      expect(result?.projects).toEqual([]);
    });
  });

  describe('awards on user teams', () => {
    const teamWithAwards = {
      role: 'Lead PI (Core Leadership)',
      inactiveSinceDate: null,
      team: { sys: { id: 'team-1' }, displayName: 'Team 1' },
      awardsCollection: {
        items: [
          {
            date: '2024-01-01',
            awardType: {
              name: 'Open Science Champion',
              icon: { url: 'https://example.com/badge.png' },
            },
          },
        ],
      },
    };

    it('parses awards onto a team when fetching a user by id', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          teamsCollection: { items: [teamWithAwards] },
        }),
      });

      const result = await userDataProvider.fetchById('123');

      expect(result!.teams[0]!.awards).toEqual([
        {
          name: 'Open Science Champion',
          date: '2024-01-01',
          iconUrl: 'https://example.com/badge.png',
        },
      ]);
    });

    it('omits the awards key when a team has no awards', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUser({
          teamsCollection: {
            items: [{ ...teamWithAwards, awardsCollection: { items: [] } }],
          },
        }),
      });

      const result = await userDataProvider.fetchById('123');

      expect(result!.teams[0]).not.toHaveProperty('awards');
    });

    it('parses awards onto a team in the Algolia list item', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users: getContentfulGraphqlUserListItem({
          teamsCollection: { items: [teamWithAwards] },
        }),
      });

      const result = await userDataProvider.fetchByIdForAlgoliaList('user-id');

      expect(result!.teams[0]!.awards).toEqual([
        {
          name: 'Open Science Champion',
          date: '2024-01-01',
          iconUrl: 'https://example.com/badge.png',
        },
      ]);
    });
  });
});
