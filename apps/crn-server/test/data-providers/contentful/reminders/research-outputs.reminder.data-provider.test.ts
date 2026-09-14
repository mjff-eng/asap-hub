import { FetchRemindersQuery } from '@asap-hub/contentful';
import { FetchRemindersOptions } from '@asap-hub/model';
import { DateTime } from 'luxon';

import { ReminderContentfulDataProvider } from '../../../../src/data-providers/contentful/reminder.data-provider';
import { getContentfulGraphqlClientMock } from '../../../mocks/contentful-graphql-client.mock';
import { getContentfulGraphqlEvent } from '../../../fixtures/events.fixtures';
import {
  getContentfulReminderResearchOutputCollectionItem,
  getContentfulReminderResearchOutputVersionCollectionItem,
  getContentfulReminderUsersContent,
  getResearchOutputDraftProjectReminder,
  getResearchOutputInReviewProjectReminder,
  getResearchOutputPublishedReminder,
  getResearchOutputSwitchToDraftProjectReminder,
  getResearchOutputSwitchToDraftWorkingGroupReminder,
  getResearchOutputVersionPublishedReminder,
} from '../../../fixtures/reminders.fixtures';

const buildProjectMembershipItem = (
  projectId: string,
  projectTitle: string,
  role = 'Member',
) => ({
  role,
  linkedFrom: {
    projectsCollection: {
      items: [{ sys: { id: projectId }, title: projectTitle }],
    },
  },
});

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
    // set the current date to 1 minute after the beginning of the event
    const dayOfTheEvent = DateTime.fromISO(
      getContentfulGraphqlEvent().startDate,
    )
      .plus({ minutes: 1 })
      .toJSDate();
    jest.setSystemTime(dayOfTheEvent);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch method', () => {
    const userId = 'user-id';
    const timezone = 'Europe/London';
    const fetchRemindersOptions: FetchRemindersOptions = { userId, timezone };

    describe('Research Output', () => {
      type ResearchOutputItem = NonNullable<
        FetchRemindersQuery['researchOutputsCollection']
      >['items'][number];
      let publishedResearchOutputItem: ResearchOutputItem;
      let draftResearchOutputsItem: ResearchOutputItem;
      let inReviewResearchOutputItem: ResearchOutputItem;
      let switchToDraftResearchOutputItem: ResearchOutputItem;

      const addedDate = '2023-01-01T08:00:00Z';
      const createdDate = '2023-01-01T08:00:00Z';
      const statusChangedAt = '2021-05-21T13:18:31Z';

      const setNowWithinLast7Days = (date: string) => {
        jest.setSystemTime(
          DateTime.fromISO(date).plus({ hours: 2 }).toJSDate(),
        );
      };

      const setContentfulMock = (
        researchOutputsCollection: FetchRemindersQuery['researchOutputsCollection'],
        users?: FetchRemindersQuery['users'],
      ) => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          researchOutputsCollection,
          users:
            users === undefined ? getContentfulReminderUsersContent() : users,
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          discussionsCollection: {
            items: [],
          },
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          messagesCollection: {
            items: [],
          },
        });
      };

      beforeEach(() => {
        publishedResearchOutputItem =
          getContentfulReminderResearchOutputCollectionItem();
        publishedResearchOutputItem!.sys.publishedAt = addedDate;
        publishedResearchOutputItem!.addedDate = addedDate;

        draftResearchOutputsItem =
          getContentfulReminderResearchOutputCollectionItem();
        draftResearchOutputsItem!.createdDate = createdDate;
        draftResearchOutputsItem!.sys.publishedAt = null;
        draftResearchOutputsItem!.addedDate = null;
        draftResearchOutputsItem!.statusChangedBy = null;

        inReviewResearchOutputItem =
          getContentfulReminderResearchOutputCollectionItem();
        inReviewResearchOutputItem!.sys.publishedAt = null;
        inReviewResearchOutputItem!.addedDate = null;
        inReviewResearchOutputItem!.isInReview = true;
        inReviewResearchOutputItem!.statusChangedBy = {
          sys: {
            id: 'user-1',
          },
          firstName: 'Tom',
          lastName: 'Hardy',
        };

        switchToDraftResearchOutputItem =
          getContentfulReminderResearchOutputCollectionItem();
        switchToDraftResearchOutputItem!.sys.publishedAt = null;
        switchToDraftResearchOutputItem!.addedDate = null;
        switchToDraftResearchOutputItem!.isInReview = false;
        switchToDraftResearchOutputItem!.statusChangedBy = {
          sys: {
            id: 'user-1',
          },
          firstName: 'Tom',
          lastName: 'Hardy',
        };
        switchToDraftResearchOutputItem!.statusChangedAt = statusChangedAt;
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      describe('Shared tests', () => {
        beforeEach(() => {
          setNowWithinLast7Days(addedDate);
        });

        test('Should fetch and sort appropriately all types of Research Output reminders when conditions are met', async () => {
          publishedResearchOutputItem!.addedDate = '2023-01-01T08:00:00Z';
          draftResearchOutputsItem!.createdDate = '2023-01-01T08:01:00Z';
          inReviewResearchOutputItem!.createdDate = '2023-01-01T08:02:00Z';

          const researchOutputsCollection = {
            items: [
              publishedResearchOutputItem,
              draftResearchOutputsItem,
              inReviewResearchOutputItem,
            ],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result).toEqual({
            items: [
              expect.objectContaining({
                entity: 'Research Output',
                type: 'In Review',
              }),
              expect.objectContaining({
                entity: 'Research Output',
                type: 'Draft',
              }),
              expect.objectContaining({
                entity: 'Research Output',
                type: 'Published',
              }),
            ],
            total: 3,
          });
        });

        test('Should not fetch the reminders if user data is null', async () => {
          const researchOutputsCollection = {
            items: [
              publishedResearchOutputItem,
              draftResearchOutputsItem,
              inReviewResearchOutputItem,
            ],
          };
          const usersResponse = null;
          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result).toEqual({ items: [], total: 0 });
        });

        test("Should not fetch the published reminder if there isn't any research outputs", async () => {
          const researchOutputsCollection = { items: [] };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result).toEqual({ items: [], total: 0 });
        });

        test("Should not fetch the reminders if the research output doesn't have a title", async () => {
          publishedResearchOutputItem!.title = null;
          draftResearchOutputsItem!.title = null;
          inReviewResearchOutputItem!.title = null;
          const researchOutputsCollection = {
            items: [
              publishedResearchOutputItem,
              draftResearchOutputsItem,
              inReviewResearchOutputItem,
            ],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result).toEqual({ items: [], total: 0 });
        });

        test("Should not fetch the reminders if the research output doesn't have a documentType", async () => {
          publishedResearchOutputItem!.documentType = null;
          draftResearchOutputsItem!.documentType = null;
          inReviewResearchOutputItem!.documentType = null;
          const researchOutputsCollection = {
            items: [
              publishedResearchOutputItem,
              draftResearchOutputsItem,
              inReviewResearchOutputItem,
            ],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should not fetch the reminder if the research output documentType property is not a valid documentType', async () => {
          publishedResearchOutputItem!.documentType = 'invalid-document-type';
          draftResearchOutputsItem!.documentType = 'invalid-document-type';
          inReviewResearchOutputItem!.documentType = 'invalid-document-type';
          const researchOutputsCollection = {
            items: [
              publishedResearchOutputItem,
              draftResearchOutputsItem,
              inReviewResearchOutputItem,
            ],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should not fetch the reminder if associated team name is null', async () => {
          publishedResearchOutputItem!.teamsCollection!.items[0]!.displayName =
            null;
          draftResearchOutputsItem!.teamsCollection!.items[0]!.displayName =
            null;
          inReviewResearchOutputItem!.teamsCollection!.items[0]!.displayName =
            null;
          publishedResearchOutputItem!.workingGroup = null;
          draftResearchOutputsItem!.workingGroup = null;
          inReviewResearchOutputItem!.workingGroup = null;

          const researchOutputsCollection = {
            items: [
              publishedResearchOutputItem,
              draftResearchOutputsItem,
              inReviewResearchOutputItem,
            ],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should not fetch the reminder if associated working group name is null', async () => {
          publishedResearchOutputItem!.teamsCollection!.items = [];
          draftResearchOutputsItem!.teamsCollection!.items = [];
          inReviewResearchOutputItem!.teamsCollection!.items = [];

          publishedResearchOutputItem!.workingGroup!.title = null;
          draftResearchOutputsItem!.workingGroup!.title = null;
          inReviewResearchOutputItem!.workingGroup!.title = null;

          const researchOutputsCollection = {
            items: [
              publishedResearchOutputItem,
              draftResearchOutputsItem,
              inReviewResearchOutputItem,
            ],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should not fetch the reminder if associated project name is null', async () => {
          publishedResearchOutputItem!.teamsCollection!.items = [];
          draftResearchOutputsItem!.teamsCollection!.items = [];
          inReviewResearchOutputItem!.teamsCollection!.items = [];

          publishedResearchOutputItem!.workingGroup = null;
          draftResearchOutputsItem!.workingGroup = null;
          inReviewResearchOutputItem!.workingGroup = null;

          publishedResearchOutputItem!.project = {
            sys: { id: 'project-with-no-title' },
            title: null,
          };
          draftResearchOutputsItem!.project = {
            sys: { id: 'project-with-no-title' },
            title: null,
          };
          inReviewResearchOutputItem!.project = {
            sys: { id: 'project-with-no-title' },
            title: null,
          };
          const researchOutputsCollection = {
            items: [
              publishedResearchOutputItem,
              draftResearchOutputsItem,
              inReviewResearchOutputItem,
            ],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should not fetch the reminder if user who (published | created a draft | requested review) is null', async () => {
          publishedResearchOutputItem!.createdBy = null;
          draftResearchOutputsItem!.createdBy = null;
          inReviewResearchOutputItem!.statusChangedBy = null;

          const researchOutputsCollection = {
            items: [
              publishedResearchOutputItem,
              draftResearchOutputsItem,
              inReviewResearchOutputItem,
            ],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result).toEqual({ items: [], total: 0 });
        });
      });

      describe('Published Reminder', () => {
        beforeEach(() => {
          setNowWithinLast7Days(addedDate);
        });

        test('Should not fetch the published reminder if the associated team is not linked to any project', async () => {
          publishedResearchOutputItem!.workingGroup = null;
          publishedResearchOutputItem!.teamsCollection!.items[0]!.linkedFrom =
            null;
          const researchOutputsCollection = {
            items: [publishedResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should return the project association when the team is linked to a project', async () => {
          publishedResearchOutputItem!.workingGroup = null;
          const researchOutputsCollection = {
            items: [publishedResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputPublishedReminder();
          expectedReminder.data.addedDate = addedDate;

          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should fetch the published reminder for a user-based project output when the user is a member of the project linked directly on the output', async () => {
          publishedResearchOutputItem!.workingGroup = null;
          publishedResearchOutputItem!.teamsCollection = { items: [] };
          publishedResearchOutputItem!.project = {
            sys: { id: 'direct-project-id' },
            title: 'Direct Project',
          };
          const researchOutputsCollection = {
            items: [publishedResearchOutputItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.linkedFrom!.projectMembershipCollection = {
            items: [
              buildProjectMembershipItem('direct-project-id', 'Direct Project'),
            ],
          };

          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputPublishedReminder();
          expectedReminder.data.addedDate = addedDate;
          expectedReminder.data.associationName = 'Direct Project';

          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should not fetch the published reminder for a user-based project output when the user is not a member of the project linked directly on the output', async () => {
          publishedResearchOutputItem!.workingGroup = null;
          publishedResearchOutputItem!.teamsCollection = { items: [] };
          publishedResearchOutputItem!.project = {
            sys: { id: 'direct-project-id' },
            title: 'Direct Project',
          };
          const researchOutputsCollection = {
            items: [publishedResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should fetch the published reminder if user is part of the working group associated with the research output', async () => {
          const researchOutputsCollection = {
            items: [publishedResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputPublishedReminder();
          expectedReminder.data.addedDate = addedDate;
          expectedReminder.data.associationName = 'Working Group 1';
          expectedReminder.data.associationType = 'working group';

          expect(result.items.map((r) => r.type)).toContain('Published');
          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should not fetch the published reminder of research output associated with working group if user is not part of any working group', async () => {
          const researchOutputsCollection = {
            items: [publishedResearchOutputItem],
          };

          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.linkedFrom!.workingGroupMembersCollection = null;
          usersResponse!.linkedFrom!.workingGroupLeadersCollection = null;

          setContentfulMock(researchOutputsCollection, usersResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain('Published');
        });

        test('Should not fetch the published reminder if the user is not associated with any team or working group from the research output', async () => {
          publishedResearchOutputItem!.teamsCollection!.items = [
            {
              sys: {
                id: 'team-user-is-not-part-of',
              },
              displayName: 'Team that user is not part of',
            },
          ];
          publishedResearchOutputItem!.workingGroup = {
            sys: {
              id: 'wg-user-is-not-part-of',
            },
            title: 'Working Group that user is not part of',
          };
          const researchOutputsCollection = {
            items: [publishedResearchOutputItem],
          };
          setContentfulMock(researchOutputsCollection);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items.map((r) => r.type)).not.toContain('Published');
        });

        test('Should not fetch the published reminder if it has passed more than 7 days from the addedDate', async () => {
          jest.setSystemTime(
            DateTime.fromISO(addedDate).plus({ days: 8 }).toJSDate(),
          );

          const researchOutputsCollection = {
            items: [publishedResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items.map((r) => r.type)).not.toContain('Published');
        });

        test('Should not fetch the published reminder if research output is a draft', async () => {
          publishedResearchOutputItem!.sys.publishedAt = null; // draft output
          const researchOutputsCollection = {
            items: [publishedResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items.map((r) => r.type)).not.toContain('Published');
        });
      });

      describe('Draft Reminder', () => {
        beforeEach(() => {
          setNowWithinLast7Days(createdDate);
        });

        test('Should not fetch the draft reminder if the associated team is not linked to any project', async () => {
          draftResearchOutputsItem!.workingGroup = null;
          draftResearchOutputsItem!.teamsCollection!.items[0]!.linkedFrom =
            null;
          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should return the project association when the team is linked to a project', async () => {
          draftResearchOutputsItem!.workingGroup = null;
          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputDraftProjectReminder();
          expectedReminder.data.createdDate = createdDate;

          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should fetch the draft reminder for a user-based project output when the user is a member of the project linked directly on the output', async () => {
          draftResearchOutputsItem!.workingGroup = null;
          draftResearchOutputsItem!.teamsCollection = { items: [] };
          draftResearchOutputsItem!.project = {
            sys: { id: 'direct-project-id' },
            title: 'Direct Project',
          };
          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.linkedFrom!.projectMembershipCollection = {
            items: [
              buildProjectMembershipItem('direct-project-id', 'Direct Project'),
            ],
          };

          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputDraftProjectReminder();
          expectedReminder.data.createdDate = createdDate;
          expectedReminder.data.associationName = 'Direct Project';

          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should not fetch the draft reminder for a user-based project output when the user is not a member of the project linked directly on the output', async () => {
          draftResearchOutputsItem!.workingGroup = null;
          draftResearchOutputsItem!.teamsCollection = { items: [] };
          draftResearchOutputsItem!.project = {
            sys: { id: 'direct-project-id' },
            title: 'Direct Project',
          };
          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should fetch the draft reminder for a user-based project output if the user is a Staff even if not a member of the project linked directly on the output', async () => {
          draftResearchOutputsItem!.workingGroup = null;
          draftResearchOutputsItem!.teamsCollection = { items: [] };
          draftResearchOutputsItem!.project = {
            sys: { id: 'direct-project-id' },
            title: 'Direct Project',
          };
          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';

          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputDraftProjectReminder();
          expectedReminder.data.createdDate = createdDate;
          expectedReminder.data.associationName = 'Direct Project';

          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should fetch the draft reminder if user is not a Staff but is part of the working group associated with the research output', async () => {
          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputDraftProjectReminder();
          expectedReminder.data.createdDate = createdDate;
          expectedReminder.data.associationName = 'Working Group 1';
          expectedReminder.data.associationType = 'working group';

          expect(result.items.map((r) => r.type)).toContain('Draft');
          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should not fetch the draft reminder if the user is not a Staff and is not associated with any team or working group from the research output', async () => {
          draftResearchOutputsItem!.teamsCollection!.items = [
            {
              sys: {
                id: 'team-user-is-not-part-of',
              },
              displayName: 'Team that user is not part of',
            },
          ];
          draftResearchOutputsItem!.workingGroup = {
            sys: {
              id: 'wg-user-is-not-part-of',
            },
            title: 'Working Group that user is not part of',
          };
          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain('Draft');
        });

        test('Should fetch the draft reminder if the user is a Staff even if is not associated with any team or working group from the research output', async () => {
          draftResearchOutputsItem!.teamsCollection!.items = [
            {
              sys: {
                id: 'team-user-is-not-part-of',
              },
              displayName: 'Team that user is not part of',
            },
          ];
          draftResearchOutputsItem!.workingGroup = {
            sys: {
              id: 'wg-user-is-not-part-of',
            },
            title: 'Working Group that user is not part of',
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';

          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };

          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).toContain('Draft');
        });

        test('Should not fetch the draft reminder if it has passed more than 7 days from the createdDate', async () => {
          jest.setSystemTime(
            DateTime.fromISO(createdDate).plus({ days: 8 }).toJSDate(),
          );
          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items.map((r) => r.type)).not.toContain('Draft');
        });

        test('Should not fetch the draft reminder if research output is published', async () => {
          draftResearchOutputsItem!.sys.publishedAt = createdDate;
          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items.map((r) => r.type)).not.toContain('Draft');
        });

        test('Should return no reminder when the statusChangedBy attribute is populated', async () => {
          draftResearchOutputsItem!.statusChangedBy = {
            sys: {
              id: 'user-1',
            },
            firstName: 'Tom',
            lastName: 'Hardy',
          };

          const researchOutputsCollection = {
            items: [draftResearchOutputsItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain('Draft');
        });
      });

      describe('Switch to Draft Reminder', () => {
        beforeEach(() => {
          setNowWithinLast7Days(statusChangedAt);
        });

        test('Should not fetch the switch to draft reminder if the associated team is not linked to any project', async () => {
          switchToDraftResearchOutputItem!.workingGroup = null;
          switchToDraftResearchOutputItem!.teamsCollection!.items[0]!.linkedFrom =
            null;
          const researchOutputsCollection = {
            items: [switchToDraftResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should return the project association when the team is linked to a project', async () => {
          switchToDraftResearchOutputItem!.workingGroup = null;
          const researchOutputsCollection = {
            items: [switchToDraftResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder =
            getResearchOutputSwitchToDraftProjectReminder();

          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should fetch the switch to draft reminder if user is not Staff but is part of the working group associated with the research output', async () => {
          const researchOutputsCollection = {
            items: [switchToDraftResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder =
            getResearchOutputSwitchToDraftWorkingGroupReminder();

          expect(result.items.map((r) => r.type)).toContain('Switch To Draft');
          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should not fetch the switch to draft reminder if the user is not a Staff and is not associated with any team or working group from the research output', async () => {
          switchToDraftResearchOutputItem!.teamsCollection!.items = [
            {
              sys: {
                id: 'team-user-is-not-part-of',
              },
              displayName: 'Team that user is not part of',
            },
          ];
          switchToDraftResearchOutputItem!.workingGroup = {
            sys: {
              id: 'wg-user-is-not-part-of',
            },
            title: 'Working Group that user is not part of',
          };
          const researchOutputsCollection = {
            items: [switchToDraftResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain(
            'Switch To Draft',
          );
        });

        test('Should fetch the switch to draft reminder if the user is a Staff even if is not associated with any team or working group from the research output', async () => {
          switchToDraftResearchOutputItem!.teamsCollection!.items = [
            {
              sys: {
                id: 'team-user-is-not-part-of',
              },
              displayName: 'Team that user is not part of',
            },
          ];
          switchToDraftResearchOutputItem!.workingGroup = {
            sys: {
              id: 'wg-user-is-not-part-of',
            },
            title: 'Working Group that user is not part of',
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';

          const researchOutputsCollection = {
            items: [switchToDraftResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).toContain('Switch To Draft');
        });

        test('Should not fetch the switch to draft reminder if it has passed more than 7 days from the statusChangedAt', async () => {
          jest.setSystemTime(
            DateTime.fromISO(statusChangedAt).plus({ days: 8 }).toJSDate(),
          );
          const researchOutputsCollection = {
            items: [switchToDraftResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items.map((r) => r.type)).not.toContain(
            'Switch To Draft',
          );
        });

        test('Should not fetch the draft reminder if research output is published', async () => {
          switchToDraftResearchOutputItem!.sys.publishedAt = createdDate;
          const researchOutputsCollection = {
            items: [switchToDraftResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );
          expect(result.items.map((r) => r.type)).not.toContain(
            'Switch To Draft',
          );
        });
      });

      describe('In Review Reminder', () => {
        test('Should not fetch the reminder if the associated team is not linked to any project, even if the user is a PM of that team', async () => {
          inReviewResearchOutputItem!.workingGroup = null;
          inReviewResearchOutputItem!.teamsCollection!.items[0]!.linkedFrom =
            null;
          const researchOutputsCollection = {
            items: [inReviewResearchOutputItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.teamsCollection!.items = [
            {
              role: 'Project Manager',
              team: {
                sys: {
                  id: 'team-1',
                },
              },
            },
          ];

          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should return the project association when the team is linked to a project', async () => {
          inReviewResearchOutputItem!.workingGroup = null;
          const researchOutputsCollection = {
            items: [inReviewResearchOutputItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.teamsCollection!.items = [
            {
              role: 'Project Manager',
              team: {
                sys: {
                  id: 'team-1',
                },
              },
            },
          ];

          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputInReviewProjectReminder();

          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test.each([
          'Lead PI',
          'Co-PI',
          'Project Manager',
          'Data Manager',
          'Independent Project - Lead',
        ])(
          'Should fetch the reminder for a directly project-linked output when the user has project role "%s" on the project',
          async (role) => {
            inReviewResearchOutputItem!.workingGroup = null;
            inReviewResearchOutputItem!.teamsCollection = { items: [] };
            inReviewResearchOutputItem!.project = {
              sys: { id: 'direct-project-id' },
              title: 'Direct Project',
            };
            const researchOutputsCollection = {
              items: [inReviewResearchOutputItem],
            };
            const usersResponse = getContentfulReminderUsersContent();
            usersResponse!.linkedFrom!.projectMembershipCollection = {
              items: [
                buildProjectMembershipItem(
                  'direct-project-id',
                  'Direct Project',
                  role,
                ),
              ],
            };

            setContentfulMock(researchOutputsCollection, usersResponse);
            const result = await remindersDataProvider.fetch(
              fetchRemindersOptions,
            );

            const expectedReminder = getResearchOutputInReviewProjectReminder();
            expectedReminder.data.associationName = 'Direct Project';

            expect(result).toEqual({
              total: 1,
              items: [expectedReminder],
            });
          },
        );

        test.each([
          'Collaborating PI',
          'Staff Scientist',
          'ASAP Staff',
          'Trainee',
          'Independent Project - Mentor',
        ])(
          'Should not fetch the reminder for a directly project-linked output when the user has project role "%s" on the project',
          async (role) => {
            inReviewResearchOutputItem!.workingGroup = null;
            inReviewResearchOutputItem!.teamsCollection = { items: [] };
            inReviewResearchOutputItem!.project = {
              sys: { id: 'direct-project-id' },
              title: 'Direct Project',
            };
            const researchOutputsCollection = {
              items: [inReviewResearchOutputItem],
            };
            const usersResponse = getContentfulReminderUsersContent();
            usersResponse!.linkedFrom!.projectMembershipCollection = {
              items: [
                buildProjectMembershipItem(
                  'direct-project-id',
                  'Direct Project',
                  role,
                ),
              ],
            };

            setContentfulMock(researchOutputsCollection, usersResponse);
            const result = await remindersDataProvider.fetch(
              fetchRemindersOptions,
            );

            expect(result).toEqual({ items: [], total: 0 });
          },
        );

        test('Should not fetch the reminder for a team-less, directly project-linked output if the user is not a member of that project at all', async () => {
          inReviewResearchOutputItem!.workingGroup = null;
          inReviewResearchOutputItem!.teamsCollection = { items: [] };
          inReviewResearchOutputItem!.project = {
            sys: { id: 'direct-project-id' },
            title: 'Direct Project',
          };
          const researchOutputsCollection = {
            items: [inReviewResearchOutputItem],
          };

          setContentfulMock(researchOutputsCollection);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result).toEqual({ items: [], total: 0 });
        });

        test('Should fetch the reminder if user is a Staff even if is not a PM of a team associated with the research output', async () => {
          inReviewResearchOutputItem!.workingGroup = null;
          const researchOutputsCollection = {
            items: [inReviewResearchOutputItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          usersResponse!.teamsCollection!.items = [
            {
              role: 'Collaborating PI',
              team: {
                sys: {
                  id: 'team-1',
                },
              },
            },
          ];

          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputInReviewProjectReminder();

          expect(result.items.map((r) => r.type)).toContain('In Review');
          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should fetch the reminder if user is not a Staff but is a PM of the working group associated with the research output', async () => {
          const researchOutputsCollection = {
            items: [inReviewResearchOutputItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.linkedFrom!.workingGroupLeadersCollection!.items = [
            {
              role: 'Project Manager',
              linkedFrom: {
                workingGroupsCollection: {
                  items: [
                    {
                      sys: {
                        id: 'wg-id-1',
                      },
                      title: 'Working Group 1',
                    },
                  ],
                },
              },
            },
          ];
          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputInReviewProjectReminder();
          expectedReminder.data.associationName = 'Working Group 1';
          expectedReminder.data.associationType = 'working group';

          expect(result.items.map((r) => r.type)).toContain('In Review');
          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should fetch the reminder if user is a Staff even if is not a PM of the working group associated with the research output', async () => {
          inReviewResearchOutputItem!.workingGroup = null;
          const researchOutputsCollection = {
            items: [inReviewResearchOutputItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';
          usersResponse!.linkedFrom!.workingGroupLeadersCollection!.items = [
            {
              role: 'Chair',
              linkedFrom: {
                workingGroupsCollection: {
                  items: [
                    {
                      sys: {
                        id: 'wg-id-1',
                      },
                      title: 'Working Group 1',
                    },
                  ],
                },
              },
            },
          ];
          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const expectedReminder = getResearchOutputInReviewProjectReminder();

          expect(result.items.map((r) => r.type)).toContain('In Review');
          expect(result).toEqual({
            total: 1,
            items: [expectedReminder],
          });
        });

        test('Should not fetch the reminder if user is not a Staff and is not a PM of a team associated with the research output', async () => {
          inReviewResearchOutputItem!.workingGroup = null;
          const researchOutputsCollection = {
            items: [inReviewResearchOutputItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.teamsCollection!.items = [
            {
              role: 'Collaborating PI',
              team: {
                sys: {
                  id: 'team-1',
                },
              },
            },
          ];

          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain('In Review');
        });

        test('Should not fetch the reminder of research output associated to working group if user is not a Staff and is not a leader of any working group', async () => {
          const researchOutputsCollection = {
            items: [inReviewResearchOutputItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.linkedFrom!.workingGroupLeadersCollection = null;
          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain('In Review');
        });

        test('Should not fetch the reminder if user is not a Staff but and is not a PM of the working group associated with the research output', async () => {
          const researchOutputsCollection = {
            items: [inReviewResearchOutputItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.linkedFrom!.workingGroupLeadersCollection!.items = [
            {
              role: 'Chair',
              linkedFrom: {
                workingGroupsCollection: {
                  items: [
                    {
                      sys: {
                        id: 'wg-id-1',
                      },
                      title: 'Working Group 1',
                    },
                  ],
                },
              },
            },
          ];
          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain('In Review');
        });

        test('Should not fetch the reminder if research output is published', async () => {
          inReviewResearchOutputItem!.sys.publishedAt = new Date();
          const researchOutputsCollection = {
            items: [inReviewResearchOutputItem],
          };
          const usersResponse = getContentfulReminderUsersContent();
          usersResponse!.role = 'Staff';

          setContentfulMock(researchOutputsCollection, usersResponse);
          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain('In Review');
        });
      });
    });

    describe('Research Output Versions', () => {
      type ResearchOutputVersionItem = NonNullable<
        FetchRemindersQuery['researchOutputVersionsCollection']
      >['items'][number];

      let researchOutputVersionItem: ResearchOutputVersionItem;

      const publishedAt = '2023-01-01T08:00:00Z';

      const setNowWithinLast7Days = (date: string) => {
        jest.setSystemTime(
          DateTime.fromISO(date).plus({ hours: 2 }).toJSDate(),
        );
      };

      const setContentfulMock = ({
        researchOutputVersionsCollection,
        researchOutputsCollection,
        users,
      }: {
        researchOutputVersionsCollection: FetchRemindersQuery['researchOutputVersionsCollection'];
        researchOutputsCollection?: FetchRemindersQuery['researchOutputsCollection'];
        users?: FetchRemindersQuery['users'];
      }) => {
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          researchOutputsCollection:
            researchOutputsCollection === undefined
              ? { items: [] }
              : researchOutputsCollection,
          researchOutputVersionsCollection,
          users:
            users === undefined ? getContentfulReminderUsersContent() : users,
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          discussionsCollection: {
            items: [],
          },
        });

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          messagesCollection: {
            items: [],
          },
        });
      };

      beforeEach(() => {
        researchOutputVersionItem =
          getContentfulReminderResearchOutputVersionCollectionItem();
        researchOutputVersionItem!.sys.publishedAt = publishedAt;
        setNowWithinLast7Days(publishedAt);
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      test('Should fetch and sort appropriately research output version reminders when conditions are met', async () => {
        const version1 = {
          sys: {
            id: 'version-1',
            publishedAt: '2023-01-01T08:00:00Z',
          },
          linkedFrom: {
            researchOutputsCollection: {
              items: [
                {
                  ...researchOutputVersionItem!.linkedFrom!
                    .researchOutputsCollection!.items[0],
                  sys: {
                    id: 'research-output-1',
                  },
                },
              ],
            },
          },
        };
        const version2 = {
          sys: {
            id: 'version-2',
            publishedAt: '2023-01-01T09:00:00Z',
          },
          linkedFrom: {
            researchOutputsCollection: {
              items: [
                {
                  ...researchOutputVersionItem!.linkedFrom!
                    .researchOutputsCollection!.items[0],
                  sys: {
                    id: 'research-output-2',
                  },
                },
              ],
            },
          },
        };
        const version3 = {
          sys: {
            id: 'version-3',
            publishedAt: '2023-01-01T10:00:00Z',
          },
          linkedFrom: {
            researchOutputsCollection: {
              items: [
                {
                  ...researchOutputVersionItem!.linkedFrom!
                    .researchOutputsCollection!.items[0],
                  sys: {
                    id: 'research-output-3',
                  },
                },
              ],
            },
          },
        };

        const researchOutputVersionsCollection = {
          items: [version1, version2, version3],
        };
        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';
        setContentfulMock({ researchOutputVersionsCollection, users });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result).toEqual({
          items: [
            expect.objectContaining({
              id: 'research-output-version-published-version-3',
              entity: 'Research Output Version',
              type: 'Published',
            }),
            expect.objectContaining({
              id: 'research-output-version-published-version-2',
              entity: 'Research Output Version',
              type: 'Published',
            }),
            expect.objectContaining({
              id: 'research-output-version-published-version-1',
              entity: 'Research Output Version',
              type: 'Published',
            }),
          ],
          total: 3,
        });
      });

      test('Should not fetch the reminders if user data is null', async () => {
        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };
        const users = null;
        setContentfulMock({ researchOutputVersionsCollection, users });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result).toEqual({ items: [], total: 0 });
      });

      test("Should not fetch the published reminder if there isn't any research output versions", async () => {
        const researchOutputVersionsCollection = { items: [] };
        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';
        setContentfulMock({ researchOutputVersionsCollection, users });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result).toEqual({ items: [], total: 0 });
      });

      test("Should not fetch the reminders if the related research output doesn't have a title", async () => {
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.title =
          null;

        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };
        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';
        setContentfulMock({ researchOutputVersionsCollection, users });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result).toEqual({ items: [], total: 0 });
      });

      test("Should not fetch the reminders if the related research output doesn't have a documentType", async () => {
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.documentType =
          null;

        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };
        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';
        setContentfulMock({ researchOutputVersionsCollection, users });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result).toEqual({ items: [], total: 0 });
      });

      test('Should not fetch the reminder if the related research output documentType property is not a valid documentType', async () => {
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.documentType =
          'invalid-document-type';

        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };
        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';
        setContentfulMock({ researchOutputVersionsCollection, users });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result).toEqual({ items: [], total: 0 });
      });

      test('Should not fetch the reminder if associated team name is null', async () => {
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.teamsCollection!.items[0]!.displayName =
          null;
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.workingGroup =
          null;

        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };
        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';
        setContentfulMock({ researchOutputVersionsCollection, users });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result).toEqual({ items: [], total: 0 });
      });

      test('Should not fetch the reminder if associated working group name is null', async () => {
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.teamsCollection!.items =
          [];
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.workingGroup!.title =
          null;

        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };
        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';
        setContentfulMock({ researchOutputVersionsCollection, users });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result).toEqual({ items: [], total: 0 });
      });

      test('Should not fetch the published reminder if the associated team is not linked to any project', async () => {
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.workingGroup =
          null;
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.teamsCollection!.items[0]!.linkedFrom =
          null;
        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };

        setContentfulMock({ researchOutputVersionsCollection });
        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result).toEqual({ items: [], total: 0 });
      });

      test('Should return the project association when the team is linked to a project', async () => {
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.workingGroup =
          null;
        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };

        setContentfulMock({ researchOutputVersionsCollection });
        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const expectedReminder = getResearchOutputVersionPublishedReminder();
        expectedReminder.data.publishedAt = publishedAt;

        expect(result).toEqual({
          total: 1,
          items: [expectedReminder],
        });
      });

      test('Should fetch the published reminder for a user-based project output when the user is a member of the project linked directly on the output', async () => {
        const researchOutput =
          researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!
            .items[0]!;
        researchOutput.workingGroup = null;
        researchOutput.teamsCollection = { items: [] };
        researchOutput.project = {
          sys: { id: 'direct-project-id' },
          title: 'Direct Project',
        };
        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };
        const users = getContentfulReminderUsersContent();
        users!.linkedFrom!.projectMembershipCollection = {
          items: [
            buildProjectMembershipItem('direct-project-id', 'Direct Project'),
          ],
        };

        setContentfulMock({ researchOutputVersionsCollection, users });
        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const expectedReminder = getResearchOutputVersionPublishedReminder();
        expectedReminder.data.publishedAt = publishedAt;
        expectedReminder.data.associationName = 'Direct Project';

        expect(result).toEqual({
          total: 1,
          items: [expectedReminder],
        });
      });

      test('Should not fetch the published reminder for a user-based project output when the user is not a member of the project linked directly on the output', async () => {
        const researchOutput =
          researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!
            .items[0]!;
        researchOutput.workingGroup = null;
        researchOutput.teamsCollection = { items: [] };
        researchOutput.project = {
          sys: { id: 'direct-project-id' },
          title: 'Direct Project',
        };
        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };

        setContentfulMock({ researchOutputVersionsCollection });
        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result).toEqual({ items: [], total: 0 });
      });

      test('Should fetch the published reminder if user is part of the working group associated with the research output version', async () => {
        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };

        setContentfulMock({ researchOutputVersionsCollection });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const expectedReminder = getResearchOutputVersionPublishedReminder();
        expectedReminder.data.publishedAt = publishedAt;
        expectedReminder.data.associationName = 'Working Group 1';
        expectedReminder.data.associationType = 'working group';

        expect(result.items.map((r) => r.type)).toContain('Published');
        expect(result).toEqual({
          total: 1,
          items: [expectedReminder],
        });
      });

      test('Should not fetch the published reminder of research output version associated with working group if user is not part of any working group', async () => {
        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };

        const users = getContentfulReminderUsersContent();
        users!.linkedFrom!.workingGroupMembersCollection = null;
        users!.linkedFrom!.workingGroupLeadersCollection = null;

        setContentfulMock({ researchOutputVersionsCollection, users });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result).toEqual({ total: 0, items: [] });
      });

      test('Should not fetch the published reminder if the user is not associated with any team or working group from the research output version', async () => {
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.teamsCollection!.items =
          [
            {
              sys: {
                id: 'team-user-is-not-part-of',
              },
              displayName: 'Team that user is not part of',
            },
          ];
        researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.workingGroup =
          {
            sys: {
              id: 'wg-user-is-not-part-of',
            },
            title: 'Working Group that user is not part of',
          };
        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };
        setContentfulMock({ researchOutputVersionsCollection });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result).toEqual({ total: 0, items: [] });
      });

      test('Should not fetch the published reminder if it has been more than 7 days since it was published', async () => {
        jest.setSystemTime(
          DateTime.fromISO(publishedAt).plus({ days: 8 }).toJSDate(),
        );

        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };

        setContentfulMock({ researchOutputVersionsCollection });
        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        expect(result).toEqual({ total: 0, items: [] });
      });

      test('Should not return published research output reminder, if there is a related version reminder', async () => {
        const publishedResearchOutputItem =
          getContentfulReminderResearchOutputCollectionItem();
        publishedResearchOutputItem!.sys.publishedAt = publishedAt;
        publishedResearchOutputItem!.addedDate = publishedAt;

        publishedResearchOutputItem!.sys.id =
          researchOutputVersionItem!.linkedFrom!.researchOutputsCollection!.items[0]!.sys.id;

        const researchOutputVersionsCollection = {
          items: [researchOutputVersionItem],
        };

        const researchOutputsCollection = {
          items: [publishedResearchOutputItem],
        };

        setContentfulMock({
          researchOutputVersionsCollection,
          researchOutputsCollection,
        });

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);
        const expectedReminder = getResearchOutputVersionPublishedReminder();

        expectedReminder.data.publishedAt = publishedAt;
        expectedReminder.data.associationName = 'Working Group 1';
        expectedReminder.data.associationType = 'working group';

        expect(result).toEqual({
          total: 1,
          items: [expectedReminder],
        });
      });
    });
  });
});
