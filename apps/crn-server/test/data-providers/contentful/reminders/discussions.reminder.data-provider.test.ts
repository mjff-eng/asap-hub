import {
  DiscussionCreatedReminder,
  DiscussionRepliedToReminder,
  FetchRemindersOptions,
} from '@asap-hub/model';
import { DateTime } from 'luxon';

import {
  ReminderContentfulDataProvider,
  DiscussionItem,
  MessageItem,
  getTeamNames,
} from '../../../../src/data-providers/contentful/reminder.data-provider';
import { getContentfulGraphqlClientMock } from '../../../mocks/contentful-graphql-client.mock';
import {
  getContentfulReminderUsersContent,
  getContentfulReminderDiscussionCollectionItem,
  getDiscussionStartedByGranteeReminder,
  getContentfulReminderMessageCollectionItem,
  getDiscussionRepliedToByGranteeReminder,
  getDiscussionStartedByOpenScienceMemberReminder,
  getDiscussionRepliedToByOpenScienceMemberReminder,
} from '../../../fixtures/reminders.fixtures';
import { FetchRemindersQuery } from '@asap-hub/contentful';

describe('Reminders data provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();

  const remindersDataProvider = new ReminderContentfulDataProvider(
    contentfulGraphqlClientMock,
  );

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.setSystemTime(
      DateTime.fromISO(
        getContentfulReminderDiscussionCollectionItem()!.sys.firstPublishedAt,
      )
        .plus({ days: 1 })
        .toJSDate(),
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch discussion reminders', () => {
    const timezone = 'Europe/London';
    const team = {
      sys: {
        id: 'reminder-team',
      },
    };
    const teamsCollection = {
      items: [
        {
          sys: {
            id: 'reminder-team',
          },
          displayName: 'Reminder',
        },
      ],
    };

    describe('Missing Data', () => {
      const userId = 'first-author-user';
      const fetchRemindersOptions: FetchRemindersOptions = {
        userId,
        timezone,
      };

      const mockContentfulGraphqlResponse = (
        discussion: DiscussionItem | null,
        message: MessageItem | null,
      ) => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: getContentfulReminderUsersContent(),
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          discussionsCollection: {
            items: [discussion],
          },
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          messagesCollection: {
            items: [message],
          },
        });
      };

      const expectEmptyResult = async () => {
        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual([]);
      };

      test('does not return the reminder if discussion is null', async () => {
        mockContentfulGraphqlResponse(null, null);
        await expectEmptyResult();
      });

      test('does not return the reminder if discussion has no message', async () => {
        const discussion = getContentfulReminderDiscussionCollectionItem();
        discussion!.message = null;

        mockContentfulGraphqlResponse(discussion, null);
        await expectEmptyResult();
      });

      test('does not return the reminder if discussion message createdBy is null', async () => {
        const discussion = getContentfulReminderDiscussionCollectionItem();
        discussion!.message!.createdBy = null;

        mockContentfulGraphqlResponse(discussion, null);
        await expectEmptyResult();
      });
    });

    describe('Discussion started', () => {
      const expectedReminder: DiscussionCreatedReminder =
        getDiscussionStartedByGranteeReminder();

      const mockContentfulGraphqlResponse = (
        discussion: DiscussionItem | null = getContentfulReminderDiscussionCollectionItem(),
        user: FetchRemindersQuery['users'] = getContentfulReminderUsersContent(),
      ) => {
        discussion!.linkedFrom!.manuscriptsCollection!.items[0]!.versionsCollection!.items[0]!.teamsCollection =
          teamsCollection;
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: user,
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          discussionsCollection: {
            items: [discussion],
          },
        });
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          messagesCollection: {
            items: [],
          },
        });
      };

      test('the person who started the discussion should not see discussion started reminders', async () => {
        const userId = 'user-who-started-discussion';
        const fetchRemindersOptions: FetchRemindersOptions = {
          userId,
          timezone,
        };

        mockContentfulGraphqlResponse();

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual([]);
      });

      test.each`
        userId                    | role
        ${'project-manager-user'} | ${'Project Manager'}
        ${'lead-pi-user'}         | ${'Lead PI (Core Leadership)'}
      `(
        'the team member with role $role should see discussion started reminders',
        async ({ userId, role }) => {
          const fetchRemindersOptions: FetchRemindersOptions = {
            userId,
            timezone,
          };

          const user = getContentfulReminderUsersContent();
          user!.teamsCollection! = {
            items: [
              {
                role,
                team,
              },
            ],
          };

          mockContentfulGraphqlResponse(
            getContentfulReminderDiscussionCollectionItem(),
            user,
          );

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items).toEqual([expectedReminder]);
        },
      );

      test.each`
        userId                              | role
        ${'co-pi-user'}                     | ${'Co-PI (Core Leadership)'}
        ${'key-personnel-user'}             | ${'Key Personnel'}
        ${'scientific-advisory-board-user'} | ${'Scientific Advisory Board'}
        ${'asap-staff-user'}                | ${'ASAP Staff'}
        ${'trainee-user'}                   | ${'Trainee'}
      `(
        'the team member with role $role should not see discussion started reminders',
        async ({ userId, role }) => {
          const fetchRemindersOptions: FetchRemindersOptions = {
            userId,
            timezone,
          };

          const user = getContentfulReminderUsersContent();
          user!.teamsCollection = {
            items: [
              {
                role,
                team,
              },
            ],
          };

          mockContentfulGraphqlResponse(
            getContentfulReminderDiscussionCollectionItem(),
            user,
          );

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items).toEqual([]);
        },
      );

      test('first author of the related manuscript should see discussion started reminders', async () => {
        const userId = 'first-author-user';
        const fetchRemindersOptions: FetchRemindersOptions = {
          userId,
          timezone,
        };

        mockContentfulGraphqlResponse();

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual([expectedReminder]);
      });

      test('PI of the related manuscript lab should see discussion started reminders', async () => {
        const userId = 'lab-pi-id';
        const fetchRemindersOptions: FetchRemindersOptions = {
          userId,
          timezone,
        };

        mockContentfulGraphqlResponse();

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual([expectedReminder]);
      });

      test('returns reminder if discussion was started by open science member', async () => {
        const discussionItem = getContentfulReminderDiscussionCollectionItem();
        const user = getContentfulReminderUsersContent();
        discussionItem!.message!.createdBy = {
          ...discussionItem!.message!.createdBy,
          openScienceTeamMember: true,
          role: 'Staff',
          sys: { id: 'user-who-started-discussion' },
        };

        const expectedReminder =
          getDiscussionStartedByOpenScienceMemberReminder();

        const userId = 'first-author-user';
        const fetchRemindersOptions: FetchRemindersOptions = {
          userId,
          timezone,
        };

        mockContentfulGraphqlResponse(discussionItem, user);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual([expectedReminder]);
      });

      test('returns reminder if user is os member assigned to manuscript and discussion was started by grantee', async () => {
        const discussionItem = getContentfulReminderDiscussionCollectionItem();
        const expectedReminder = getDiscussionStartedByGranteeReminder();

        const userId = 'assigned-os-member-id';
        const fetchRemindersOptions: FetchRemindersOptions = {
          userId,
          timezone,
        };

        mockContentfulGraphqlResponse(discussionItem);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual([expectedReminder]);
      });
    });

    describe('Discussion Replies Reminders', () => {
      const mockContentfulGraphqlResponse = (
        replyAuthor: 'open-science-member' | 'grantee' = 'grantee',
        message: MessageItem | null = null,
        user: FetchRemindersQuery['users'] = getContentfulReminderUsersContent(),
      ): DiscussionRepliedToReminder => {
        const messageItem =
          message || getContentfulReminderMessageCollectionItem();
        messageItem!.linkedFrom!.discussionsCollection!.items[0]!.linkedFrom!.manuscriptsCollection!.items[0]!.versionsCollection!.items[0]!.teamsCollection =
          teamsCollection;

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: user,
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          discussionsCollection: {
            items: [],
          },
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          messagesCollection: {
            items: [messageItem],
          },
        });

        return replyAuthor === 'grantee'
          ? getDiscussionRepliedToByGranteeReminder()
          : getDiscussionRepliedToByOpenScienceMemberReminder();
      };

      test('the person who replied to the discussion should not see discussion replied reminders', async () => {
        const userId = 'user-who-replied-discussion';
        const fetchRemindersOptions: FetchRemindersOptions = {
          userId,
          timezone,
        };

        mockContentfulGraphqlResponse();

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual([]);
      });

      test.each`
        userId                    | role
        ${'project-manager-user'} | ${'Project Manager'}
        ${'lead-pi-user'}         | ${'Lead PI (Core Leadership)'}
      `(
        'the team member with role $role should see discussion replied to reminders',
        async ({ userId, role }) => {
          const user = getContentfulReminderUsersContent();
          user!.teamsCollection! = {
            items: [
              {
                role,
                team,
              },
            ],
          };
          const expectedReminder = mockContentfulGraphqlResponse(
            'grantee',
            null,
            user,
          );

          const fetchRemindersOptions: FetchRemindersOptions = {
            userId,
            timezone,
          };

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items).toEqual(
            expect.arrayContaining([expectedReminder]),
          );
        },
      );

      test.each`
        userId                              | role
        ${'co-pi-user'}                     | ${'Co-PI (Core Leadership)'}
        ${'asap-staff-user'}                | ${'ASAP Staff'}
        ${'key-personnel-user'}             | ${'Key Personnel'}
        ${'trainee-user'}                   | ${'Trainee'}
        ${'scientific-advisory-board-user'} | ${'Scientific Advisory Board'}
      `(
        'the team member with role $role should not see discussion replied to reminders',
        async ({ userId, role }) => {
          const fetchRemindersOptions: FetchRemindersOptions = {
            userId,
            timezone,
          };

          const user = getContentfulReminderUsersContent();
          user!.teamsCollection = {
            items: [
              {
                role,
                team,
              },
            ],
          };

          mockContentfulGraphqlResponse('grantee', null, user);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items).toEqual([]);
        },
      );

      test('first author of the manuscript should see discussion replied to reminders', async () => {
        const userId = 'first-author-user';
        const fetchRemindersOptions: FetchRemindersOptions = {
          userId,
          timezone,
        };

        const expectedReminder = mockContentfulGraphqlResponse('grantee', null);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual(
          expect.arrayContaining([expectedReminder]),
        );
      });

      test('PI of the manuscript lab should see discussion replied to reminders', async () => {
        const userId = 'lab-pi-id';
        const fetchRemindersOptions: FetchRemindersOptions = {
          userId,
          timezone,
        };

        const expectedReminder = mockContentfulGraphqlResponse('grantee', null);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual(
          expect.arrayContaining([expectedReminder]),
        );
      });

      test('returns reminder if discussion was replied to by open science member', async () => {
        const messageItem = getContentfulReminderMessageCollectionItem();

        messageItem!.createdBy = {
          ...messageItem!.createdBy,
          openScienceTeamMember: true,
          role: 'Staff',
          sys: { id: 'user-who-started-discussion' },
        };

        const userId = 'first-author-user';
        const fetchRemindersOptions: FetchRemindersOptions = {
          userId,
          timezone,
        };

        const expectedReminder = mockContentfulGraphqlResponse(
          'open-science-member',
          messageItem,
        );

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual(
          expect.arrayContaining([expectedReminder]),
        );
      });

      test('returns reminder if discussion was replied to by grantee and user is os member assigned to manuscript', async () => {
        const userId = 'assigned-os-member-id';
        const fetchRemindersOptions: FetchRemindersOptions = {
          userId,
          timezone,
        };

        const expectedReminder = mockContentfulGraphqlResponse('grantee');

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result.items).toEqual(
          expect.arrayContaining([expectedReminder]),
        );
      });
    });

    describe('User-based project manuscripts', () => {
      const projectName = 'Genetic Determinants of Progression';
      const project = {
        sys: {
          id: 'project-id-1',
        },
        title: projectName,
      };
      const fetchOptions = { timezone };

      const getProjectDiscussion = () => {
        const discussion = getContentfulReminderDiscussionCollectionItem();
        discussion!.linkedFrom!.manuscriptsCollection!.items[0]!.project =
          project;
        return discussion;
      };

      const getProjectMessage = () => {
        const message = getContentfulReminderMessageCollectionItem();
        message!.linkedFrom!.discussionsCollection!.items[0]!.linkedFrom!.manuscriptsCollection!.items[0]!.project =
          project;
        return message;
      };

      const mockContentfulGraphqlResponse = (
        discussion: DiscussionItem | null,
        message: MessageItem | null,
        user: FetchRemindersQuery['users'] = getContentfulReminderUsersContent(),
      ) => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: user,
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          discussionsCollection: {
            items: discussion ? [discussion] : [],
          },
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          messagesCollection: {
            items: message ? [message] : [],
          },
        });
      };

      test('first author of the manuscript should see discussion started reminders with the project name', async () => {
        mockContentfulGraphqlResponse(getProjectDiscussion(), null);

        const expectedReminder = getDiscussionStartedByGranteeReminder();
        expectedReminder.data.manuscriptTeams = projectName;

        const result = await remindersDataProvider.fetch({
          userId: 'first-author-user',
          ...fetchOptions,
        });
        expect(result.items).toEqual([expectedReminder]);
      });

      test('PI of the manuscript lab should not see discussion started reminders', async () => {
        const discussion = getProjectDiscussion();
        discussion!.linkedFrom!.manuscriptsCollection!.items[0]!.versionsCollection!.items[0]!.labsCollection =
          {
            items: [
              {
                labPi: {
                  sys: {
                    id: 'lab-pi-user',
                  },
                },
              },
            ],
          };
        mockContentfulGraphqlResponse(discussion, null);

        const result = await remindersDataProvider.fetch({
          userId: 'lab-pi-user',
          ...fetchOptions,
        });
        expect(result.items).toEqual([]);
      });

      test('first author of the manuscript should see discussion replied to reminders with the project name', async () => {
        mockContentfulGraphqlResponse(null, getProjectMessage());

        const expectedReminder = getDiscussionRepliedToByGranteeReminder();
        expectedReminder.data.manuscriptTeams = projectName;

        const result = await remindersDataProvider.fetch({
          userId: 'first-author-user',
          ...fetchOptions,
        });
        expect(result.items).toEqual([expectedReminder]);
      });

      test('os member assigned to the manuscript should see discussion replied to reminders', async () => {
        const expectedReminder = getDiscussionRepliedToByGranteeReminder();
        expectedReminder.data.manuscriptTeams = projectName;

        mockContentfulGraphqlResponse(null, getProjectMessage());

        const result = await remindersDataProvider.fetch({
          userId: 'assigned-os-member-id',
          ...fetchOptions,
        });
        expect(result.items).toEqual([expectedReminder]);
      });
    });

    describe('Team-based manuscripts linked to a project', () => {
      const teamLinkedProject = {
        projectMembershipCollection: {
          items: [
            {
              linkedFrom: {
                projectsCollection: {
                  items: [
                    {
                      sys: {
                        id: 'project-id-2',
                      },
                      title: 'Team Linked Project',
                    },
                  ],
                },
              },
            },
          ],
        },
      };

      const getTeamDiscussionWithLinkedProject = () => {
        const discussion = getContentfulReminderDiscussionCollectionItem();
        discussion!.linkedFrom!.manuscriptsCollection!.items[0]!.versionsCollection!.items[0]!.teamsCollection =
          {
            items: [
              {
                sys: {
                  id: 'reminder-team',
                },
                displayName: 'Reminder',
                linkedFrom: teamLinkedProject,
              },
            ],
          };
        return discussion;
      };

      const mockContentfulGraphqlResponse = (discussion: DiscussionItem) => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          users: getContentfulReminderUsersContent(),
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          discussionsCollection: {
            items: [discussion],
          },
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          messagesCollection: {
            items: [],
          },
        });
      };

      test('shows the linked project name', async () => {
        mockContentfulGraphqlResponse(getTeamDiscussionWithLinkedProject()!);

        const expectedReminder = getDiscussionStartedByGranteeReminder();
        expectedReminder.data.manuscriptTeams = 'Team Linked Project';

        const result = await remindersDataProvider.fetch({
          userId: 'first-author-user',
          timezone,
        });
        expect(result.items).toEqual([expectedReminder]);
      });
    });

    test('getTeamNames returns empty string when no teams provided', async () => {
      expect(getTeamNames(undefined)).toEqual('');
    });

    test('getTeamNames deduplicates teams repeated across roles', async () => {
      expect(getTeamNames(['Alessi', 'Ant', 'Alessi'])).toEqual(
        'Team Alessi and Team Ant',
      );
      expect(getTeamNames(['Alessi', 'Alessi'])).toEqual('Team Alessi');
    });

    test('getTeamNames ignores empty team names', async () => {
      expect(getTeamNames([null, undefined, 'Ant'])).toEqual('Team Ant');
    });

    test('getTeamNames returns empty string for an empty or all-empty list', async () => {
      expect(getTeamNames([])).toEqual('');
      expect(getTeamNames([null, undefined])).toEqual('');
    });
  });
});
