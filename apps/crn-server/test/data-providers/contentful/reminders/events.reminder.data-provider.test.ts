import {
  EventNotesReminder,
  FetchRemindersOptions,
  PresentationUpdatedReminder,
  VideoEventReminder,
} from '@asap-hub/model';
import { DateTime } from 'luxon';

import { ReminderContentfulDataProvider } from '../../../../src/data-providers/contentful/reminder.data-provider';
import { getContentfulGraphqlClientMock } from '../../../mocks/contentful-graphql-client.mock';
import { getContentfulGraphqlEvent } from '../../../fixtures/events.fixtures';
import {
  getAddSpeakersReminder,
  getContentfulReminderEventsCollectionItem,
  getContentfulReminderUsersContent,
  getEventHappeningNowReminder,
  getEventHappeningTodayReminder,
  getMarkAttendanceReminder,
  getNotesUpdatedReminder,
  getPresentationUpdatedReminder,
  getPublishMaterialReminder,
  getSharePresentationReminder,
  getTeamProjectManagerResponse,
  getUploadPresentationReminder,
  getVideoEventUpdatedReminder,
} from '../../../fixtures/reminders.fixtures';
import {
  FetchRemindersQuery,
  FetchRemindersUserQuery,
} from '@asap-hub/contentful';

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
    const newEventPageOptions: FetchRemindersOptions = {
      ...fetchRemindersOptions,
      isNewEventPageEnabled: true,
    };

    const setContentfulMock = (
      systemTime: string,
      users:
        | FetchRemindersUserQuery['users']
        | null = getContentfulReminderUsersContent(),
      startDate: string = '2023-01-01T08:00:00Z',
      endDate: string = '2023-01-01T10:00:00Z',
      eventResponse?: NonNullable<
        FetchRemindersQuery['eventsCollection']
      >['items'][number],
    ) => {
      jest.setSystemTime(DateTime.fromISO(systemTime).toJSDate());

      const eventMockResponse =
        eventResponse || getContentfulReminderEventsCollectionItem();
      eventMockResponse!.startDate = startDate;
      eventMockResponse!.endDate = endDate;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        eventsCollection: {
          items: [eventMockResponse],
        },
      });

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        users,
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
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        milestonesCollection: {
          items: [],
        },
      });
    };

    describe('Event Happening Now Reminder', () => {
      test('Should fetch the reminder when it has already started', async () => {
        const startDate = '2023-01-01T08:00:00Z';
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-01T08:01:00Z';

        setContentfulMock(systemTime, null, startDate, endDate);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const expectedEventHappeningNowReminder =
          getEventHappeningNowReminder();
        expectedEventHappeningNowReminder.data.startDate = startDate;
        expectedEventHappeningNowReminder.data.endDate = endDate;

        expect(result.items.map((r) => r.type)).toContain('Happening Now');
        expect(result).toEqual({
          total: 1,
          items: [expectedEventHappeningNowReminder],
        });
      });

      test('Should not fetch the reminder when it has already ended', async () => {
        const systemTime = '2023-01-01T10:01:00Z';

        setContentfulMock(systemTime, null);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Happening Now');
      });

      test('Should not fetch the reminder when it is a future event', async () => {
        const systemTime = '2022-12-31T08:01:00Z';

        setContentfulMock(systemTime, null);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Happening Now');
      });
    });

    describe('Event Happening Today Reminder', () => {
      test('Should fetch the reminder if it has not started yet', async () => {
        const startDate = '2023-01-01T08:00:00Z';
        const systemTime = '2023-01-01T07:59:00Z';

        setContentfulMock(systemTime, null, startDate);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const expectedEventHappeningTodayReminder =
          getEventHappeningTodayReminder();
        expectedEventHappeningTodayReminder.data.startDate = startDate;

        expect(result.items.map((r) => r.type)).toContain('Happening Today');
        expect(result).toEqual({
          total: 1,
          items: [expectedEventHappeningTodayReminder],
        });
      });

      test('Should not fetch the reminder if it has already started', async () => {
        const systemTime = '2023-01-01T08:01:00Z';

        setContentfulMock(systemTime, null);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Happening Today',
        );
      });

      test('Should not fetch the reminder if it is a future event', async () => {
        const systemTime = '2022-12-31T08:01:00Z';

        setContentfulMock(systemTime, null);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Happening Today',
        );
      });
    });

    describe('Share Presentation Reminder', () => {
      it.each`
        asapRole     | teamRole
        ${`Grantee`} | ${`Lead PI (Core Leadership)`}
        ${`Grantee`} | ${`Key Personnel`}
        ${`Grantee`} | ${'Co-PI (Core Leadership)'}
        ${`Grantee`} | ${`Scientific Advisory Board`}
        ${`Grantee`} | ${'Collaborating PI'}
      `(
        `Should fetch the reminder when user has asap role $asapRole and team role $teamRole`,
        async ({ asapRole, teamRole }) => {
          const startDate = '2023-01-01T08:00:00Z';
          const endDate = '2023-01-01T10:00:00Z';
          const systemTime = '2023-01-02T09:00:00Z';

          const users = getContentfulReminderUsersContent();
          users!.role = asapRole;
          users!.teamsCollection!.items[0]!.role = teamRole;

          setContentfulMock(systemTime, users, startDate, endDate);

          contentfulGraphqlClientMock.request.mockResolvedValueOnce(
            getTeamProjectManagerResponse(),
          );

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const sharePresentationReminder = getSharePresentationReminder();
          sharePresentationReminder.data.endDate = endDate;
          sharePresentationReminder.data.pmId = 'project-manager-1';
          expect(result).toEqual({
            total: 1,
            items: [sharePresentationReminder],
          });
        },
      );

      it.each`
        asapRole     | teamRole
        ${`Grantee`} | ${`Project Manager`}
        ${`Grantee`} | ${`ASAP Staff`}
        ${`Staff`}   | ${`Lead PI (Core Leadership)`}
        ${`Staff`}   | ${`Lead PI (Core Leadership)`}
        ${`Staff`}   | ${'Co-PI (Core Leadership)'}
        ${`Staff`}   | ${'Collaborating PI'}
        ${`Staff`}   | ${`Key Personnel`}
        ${`Staff`}   | ${`Scientific Advisory Board`}
        ${`Staff`}   | ${`Project Manager`}
        ${`Staff`}   | ${`ASAP Staff`}
      `(
        `Should not fetch the reminder when user has asap role $asapRole and team role $teamRole`,
        async ({ asapRole, teamRole }) => {
          const systemTime = '2023-01-02T09:00:00Z';

          const users = getContentfulReminderUsersContent();
          users!.role = asapRole;
          users!.teamsCollection!.items[0]!.role = teamRole;

          setContentfulMock(systemTime, users);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain(
            'Share Presentation',
          );
        },
      );

      it('Should not fetch the reminder when user is not one of the speakers', async () => {
        const systemTime = '2023-01-02T09:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.linkedFrom!.eventSpeakersCollection!.items = [];

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Share Presentation',
        );
      });

      it('Should fetch the reminder up until 7 days of the end of the event', async () => {
        const startDate = '2023-01-01T08:00:00Z';
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-08T09:58:00Z';
        const users = getContentfulReminderUsersContent();

        setContentfulMock(systemTime, users, startDate, endDate);

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const sharePresentationReminder = getSharePresentationReminder();
        sharePresentationReminder.data.endDate = endDate;
        sharePresentationReminder.data.pmId = 'project-manager-1';
        expect(result).toEqual({
          total: 1,
          items: [sharePresentationReminder],
        });
      });

      it('Should not fetch the reminder when it passed more than 7 days of the end of the event', async () => {
        const users = getContentfulReminderUsersContent();
        const startDate = '2023-01-01T08:00:00Z';
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-08T10:01:00Z';

        setContentfulMock(systemTime, users, startDate, endDate);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Share Presentation',
        );
      });

      it('Should not fetch the reminder when the event is a future event', async () => {
        const systemTime = '2022-12-31T10:00:00Z';

        setContentfulMock(systemTime);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Share Presentation',
        );
      });

      it('Should not fetch the reminder if it has not ended', async () => {
        const systemTime = '2023-01-01T09:00:00Z';

        setContentfulMock(systemTime);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Share Presentation',
        );
      });
    });

    describe('Publish Material Reminder', () => {
      it('Should fetch the reminder if the user asap role is Staff', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-02T09:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const publishMaterialReminder = getPublishMaterialReminder();
        publishMaterialReminder.data.endDate = endDate;

        expect(result.items.map((r) => r.type)).toContain('Publish Material');

        expect(result).toEqual({
          total: 1,
          items: [publishMaterialReminder],
        });
      });

      it.each`
        asapRole
        ${`Grantee`}
        ${`Guest`}
        ${`Hidden`}
      `(
        `Should not fetch the reminder if user has asap role $asapRole`,
        async ({ asapRole }) => {
          const users = getContentfulReminderUsersContent();
          users!.role = asapRole;

          const systemTime = '2023-01-02T09:00:00Z';
          setContentfulMock(systemTime, users);

          contentfulGraphqlClientMock.request.mockResolvedValueOnce(
            getTeamProjectManagerResponse(),
          );

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain(
            'Publish Material',
          );
        },
      );

      it('Should fetch the reminder up until 7 days of the end of the event', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-08T09:58:00Z';

        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';
        setContentfulMock(systemTime, users);

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const publishMaterialReminder = getPublishMaterialReminder();
        publishMaterialReminder.data.endDate = endDate;
        expect(result).toEqual({
          total: 1,
          items: [publishMaterialReminder],
        });
      });

      it('Should not fetch the reminder when it passed more than 7 days of the end of the event', async () => {
        const systemTime = '2023-01-08T10:01:00Z';

        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Publish Material',
        );
      });

      it('Should not fetch the reminder when the event is a future event', async () => {
        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';

        const systemTime = '2022-12-31T10:00:00Z';
        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Publish Material',
        );
      });

      it('Should not fetch the reminder if it has not ended', async () => {
        const systemTime = '2023-01-01T09:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Publish Material',
        );
      });
    });

    describe('Mark Attendance Reminder', () => {
      it('Should not fetch the reminder when the new event page is not enabled', async () => {
        const users = getContentfulReminderUsersContent();
        users!.techSupport = true;

        setContentfulMock('2023-01-02T09:00:00Z', users);

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Mark Attendance',
        );
      });

      it('Should fetch the reminder if the user has tech support', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-02T09:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.techSupport = true;

        setContentfulMock(systemTime, users);

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        const markAttendanceReminder = getMarkAttendanceReminder();
        markAttendanceReminder.data.endDate = endDate;

        expect(result.items).toContainEqual(markAttendanceReminder);
      });

      it('Should not fetch the reminder if the user does not have tech support even if the asap role is Staff', async () => {
        const systemTime = '2023-01-02T09:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.role = 'Staff';
        users!.techSupport = false;

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).toContain('Publish Material');
        expect(result.items.map((r) => r.type)).not.toContain(
          'Mark Attendance',
        );
      });

      it('Should not fetch the reminder before the event is considered ended (1 hour after the end date)', async () => {
        const systemTime = '2023-01-01T10:30:00Z';

        const users = getContentfulReminderUsersContent();
        users!.techSupport = true;

        setContentfulMock(systemTime, users);

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Mark Attendance',
        );
      });

      it('Should fetch the reminder once the event is considered ended (1 hour after the end date)', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-01T11:01:00Z';

        const users = getContentfulReminderUsersContent();
        users!.techSupport = true;

        setContentfulMock(systemTime, users);

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        const markAttendanceReminder = getMarkAttendanceReminder();
        markAttendanceReminder.data.endDate = endDate;

        expect(result.items).toContainEqual(markAttendanceReminder);
      });

      it('Should fetch the reminder up until 7 days of the end of the event', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-08T09:58:00Z';

        const users = getContentfulReminderUsersContent();
        users!.techSupport = true;

        setContentfulMock(systemTime, users);

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        const markAttendanceReminder = getMarkAttendanceReminder();
        markAttendanceReminder.data.endDate = endDate;

        expect(result.items).toContainEqual(markAttendanceReminder);
      });

      it('Should not fetch the reminder when it passed more than 7 days of the end of the event', async () => {
        const systemTime = '2023-01-08T10:01:00Z';

        const users = getContentfulReminderUsersContent();
        users!.techSupport = true;

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Mark Attendance',
        );
      });

      it('Should not fetch the reminder when the event is a future event', async () => {
        const systemTime = '2022-12-31T10:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.techSupport = true;

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Mark Attendance',
        );
      });

      it('Should not fetch the reminder if the event has not ended', async () => {
        const systemTime = '2023-01-01T09:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.techSupport = true;

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain(
          'Mark Attendance',
        );
      });
    });

    describe('Add Speakers Reminder', () => {
      const getInterestGroupLeadership = ({
        groupId = 'interest-group-1',
        role = 'Project Manager',
        active = true,
        inactiveSinceDate = null,
      }: {
        groupId?: string;
        role?: string;
        active?: boolean;
        inactiveSinceDate?: string | null;
      } = {}) => ({
        items: [
          {
            role,
            inactiveSinceDate,
            linkedFrom: {
              interestGroupsCollection: {
                items: [
                  {
                    sys: { id: groupId },
                    active,
                    name: 'Interest Group 1',
                  },
                ],
              },
            },
          },
        ],
      });

      const getInterestGroupProjectManager = (
        leadership = getInterestGroupLeadership(),
      ) => {
        const users = getContentfulReminderUsersContent();
        users!.linkedFrom!.interestGroupLeadersCollection = leadership;
        return users;
      };

      it('Should not fetch the reminder when the new event page is not enabled', async () => {
        setContentfulMock(
          '2023-01-02T09:00:00Z',
          getInterestGroupProjectManager(),
        );

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Add Speakers');
      });

      it('Should fetch the reminder if the user is a Project Manager of the event interest group', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-02T09:00:00Z';

        setContentfulMock(systemTime, getInterestGroupProjectManager());

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        const addSpeakersReminder = getAddSpeakersReminder();
        addSpeakersReminder.data.endDate = endDate;

        expect(result.items).toContainEqual(addSpeakersReminder);
      });

      it('Should not fetch the reminder if the user leadership of the interest group is inactive', async () => {
        const systemTime = '2023-01-02T09:00:00Z';

        setContentfulMock(
          systemTime,
          getInterestGroupProjectManager(
            getInterestGroupLeadership({
              inactiveSinceDate: '2022-12-01T00:00:00Z',
            }),
          ),
        );

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Add Speakers');
      });

      it('Should not fetch the reminder if the event interest group is inactive', async () => {
        const systemTime = '2023-01-02T09:00:00Z';

        setContentfulMock(
          systemTime,
          getInterestGroupProjectManager(
            getInterestGroupLeadership({ active: false }),
          ),
        );

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Add Speakers');
      });

      it('Should not fetch the reminder if the user is a Project Manager of another interest group', async () => {
        const systemTime = '2023-01-02T09:00:00Z';

        setContentfulMock(
          systemTime,
          getInterestGroupProjectManager(
            getInterestGroupLeadership({ groupId: 'interest-group-2' }),
          ),
        );

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Add Speakers');
      });

      it('Should not fetch the reminder if the event does not have an interest group', async () => {
        const systemTime = '2023-01-02T09:00:00Z';

        const eventResponse = getContentfulReminderEventsCollectionItem();
        eventResponse!.calendar = null;

        setContentfulMock(
          systemTime,
          getInterestGroupProjectManager(),
          undefined,
          undefined,
          eventResponse,
        );

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Add Speakers');
      });

      it('Should not fetch the reminder if the user is a Project Manager of a team but not a leader of the event interest group', async () => {
        const systemTime = '2023-01-02T09:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.teamsCollection!.items[0]!.role = 'Project Manager';

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).toContain(
          'Upload Presentation',
        );
        expect(result.items.map((r) => r.type)).not.toContain('Add Speakers');
      });

      it('Should fetch the reminder even when the event does not have speakers', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-02T09:00:00Z';

        const eventResponse = getContentfulReminderEventsCollectionItem();
        eventResponse!.speakersCollection = { items: [] };

        setContentfulMock(
          systemTime,
          getInterestGroupProjectManager(),
          undefined,
          undefined,
          eventResponse,
        );

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        const addSpeakersReminder = getAddSpeakersReminder();
        addSpeakersReminder.data.endDate = endDate;

        expect(result.items).toContainEqual(addSpeakersReminder);
      });

      it('Should not fetch the reminder before the event is considered ended (1 hour after the end date)', async () => {
        const systemTime = '2023-01-01T10:30:00Z';

        setContentfulMock(systemTime, getInterestGroupProjectManager());

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Add Speakers');
      });

      it('Should fetch the reminder once the event is considered ended (1 hour after the end date)', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-01T11:01:00Z';

        setContentfulMock(systemTime, getInterestGroupProjectManager());

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        const addSpeakersReminder = getAddSpeakersReminder();
        addSpeakersReminder.data.endDate = endDate;

        expect(result.items).toContainEqual(addSpeakersReminder);
      });

      it('Should fetch the reminder up until 7 days of the end of the event', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-08T09:58:00Z';

        setContentfulMock(systemTime, getInterestGroupProjectManager());

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        const addSpeakersReminder = getAddSpeakersReminder();
        addSpeakersReminder.data.endDate = endDate;

        expect(result.items).toContainEqual(addSpeakersReminder);
      });

      it('Should not fetch the reminder when it passed more than 7 days of the end of the event', async () => {
        const systemTime = '2023-01-08T10:01:00Z';

        setContentfulMock(systemTime, getInterestGroupProjectManager());

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Add Speakers');
      });

      it('Should not fetch the reminder when the event is a future event', async () => {
        const systemTime = '2022-12-31T10:00:00Z';

        setContentfulMock(systemTime, getInterestGroupProjectManager());

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Add Speakers');
      });

      it('Should not fetch the reminder if the event has not ended', async () => {
        const systemTime = '2023-01-01T09:00:00Z';

        setContentfulMock(systemTime, getInterestGroupProjectManager());

        const result = await remindersDataProvider.fetch(newEventPageOptions);

        expect(result.items.map((r) => r.type)).not.toContain('Add Speakers');
      });
    });

    describe('Upload Presentation Reminder', () => {
      it.each`
        asapRole
        ${`Grantee`}
        ${`Guest`}
        ${`Hidden`}
      `(
        `Should fetch the reminder when user asap role is $asapRole and user is Project Manager of one of the speakers team`,
        async ({ asapRole }) => {
          const users = getContentfulReminderUsersContent();
          users!.role = asapRole;
          users!.teamsCollection!.items[0]!.role = 'Project Manager';

          setContentfulMock('2023-01-02T09:00:00Z', users);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const uploadPresentationReminder = getUploadPresentationReminder();
          uploadPresentationReminder.data.endDate = '2023-01-01T10:00:00Z';

          expect(result.items.map((r) => r.type)).toContain(
            'Upload Presentation',
          );

          expect(result).toEqual({
            total: 1,
            items: [uploadPresentationReminder],
          });
        },
      );

      it.each`
        asapRole     | teamRole
        ${`Grantee`} | ${`Lead PI (Core Leadership)`}
        ${`Grantee`} | ${'Co-PI (Core Leadership)'}
        ${`Grantee`} | ${'Collaborating PI'}
        ${`Grantee`} | ${`Key Personnel`}
        ${`Grantee`} | ${`Scientific Advisory Board`}
        ${`Grantee`} | ${`ASAP Staff`}
        ${`Staff`}   | ${'Collaborating PI'}
        ${`Staff`}   | ${`Key Personnel`}
        ${`Staff`}   | ${`Lead PI (Core Leadership)`}
        ${`Staff`}   | ${`Project Manager`}
        ${`Staff`}   | ${'Co-PI (Core Leadership)'}
        ${`Staff`}   | ${`Scientific Advisory Board`}
        ${`Staff`}   | ${`ASAP Staff`}
      `(
        `Should not fetch the reminder when user has asap role $asapRole and team role $teamRole`,
        async ({ asapRole, teamRole }) => {
          const endDate = '2023-01-01T10:00:00Z';
          const systemTime = '2023-01-02T09:00:00Z';

          const users = getContentfulReminderUsersContent();
          users!.role = asapRole;
          users!.teamsCollection!.items[0]!.role = teamRole;

          setContentfulMock(systemTime, users);

          contentfulGraphqlClientMock.request.mockResolvedValueOnce(
            getTeamProjectManagerResponse(),
          );

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          const uploadPresentationReminder = getUploadPresentationReminder();
          uploadPresentationReminder.data.endDate = endDate;

          expect(result.items.map((r) => r.type)).not.toContain(
            'Upload Presentation',
          );
        },
      );

      it('Should not fetch the reminder when user is a PM but not one of a team which is associated to a speaker', async () => {
        const systemTime = '2023-01-02T09:00:00Z';
        const endDate = '2023-01-01T10:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.role = 'Grantee';
        users!.teamsCollection!.items[0]!.role = 'Project Manager';
        users!.teamsCollection!.items[0]!.team!.sys.id = 'team-2';

        setContentfulMock(systemTime, users);

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const uploadPresentationReminder = getUploadPresentationReminder();
        uploadPresentationReminder.data.endDate = endDate;

        expect(result.items.map((r) => r.type)).not.toContain(
          'Upload Presentation',
        );
      });

      it('Should not fetch the reminder when the event does not have speakers', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const startDate = '2023-01-01T08:00:00Z';
        const systemTime = '2023-01-02T09:00:00Z';

        const eventMockResponse = getContentfulReminderEventsCollectionItem();
        eventMockResponse!.startDate = startDate;
        eventMockResponse!.endDate = endDate;
        eventMockResponse!.speakersCollection!.items = [];

        const users = getContentfulReminderUsersContent();
        users!.role = 'Grantee';
        users!.teamsCollection!.items[0]!.role = 'Project Manager';

        setContentfulMock(
          systemTime,
          users,
          startDate,
          endDate,
          eventMockResponse,
        );

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const uploadPresentationReminder = getUploadPresentationReminder();
        uploadPresentationReminder.data.endDate = endDate;

        expect(result.items.map((r) => r.type)).not.toContain(
          'Upload Presentation',
        );
      });

      it('Should not fetch the reminder when event speakersCollection come as null', async () => {
        const startDate = '2023-01-01T08:00:00Z';
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-02T09:00:00Z';

        const eventMockResponse = getContentfulReminderEventsCollectionItem();
        eventMockResponse!.startDate = startDate;
        eventMockResponse!.endDate = endDate;
        eventMockResponse!.speakersCollection = null;

        const users = getContentfulReminderUsersContent();
        users!.role = 'Grantee';
        users!.teamsCollection!.items[0]!.role = 'Project Manager';

        setContentfulMock(
          systemTime,
          users,
          startDate,
          endDate,
          eventMockResponse,
        );

        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          getTeamProjectManagerResponse(),
        );

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const uploadPresentationReminder = getUploadPresentationReminder();
        uploadPresentationReminder.data.endDate = endDate;

        expect(result.items.map((r) => r.type)).not.toContain(
          'Upload Presentation',
        );
      });

      it('Should fetch the reminder up until 7 days of the end of the event', async () => {
        const eventMockResponse = getContentfulReminderEventsCollectionItem();
        const startDate = '2023-01-01T08:00:00Z';
        const endDate = '2023-01-01T10:00:00Z';
        eventMockResponse!.startDate = startDate;
        eventMockResponse!.endDate = endDate;

        const users = getContentfulReminderUsersContent();
        users!.role = 'Grantee';
        users!.teamsCollection!.items[0]!.role = 'Project Manager';

        setContentfulMock('2023-01-08T09:58:00Z', users, startDate, endDate);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const uploadPresentationReminder = getUploadPresentationReminder();
        uploadPresentationReminder.data.endDate = endDate;

        expect(result.items.map((r) => r.type)).toContain(
          'Upload Presentation',
        );

        expect(result).toEqual({
          total: 1,
          items: [uploadPresentationReminder],
        });
      });

      it('Should not fetch the reminder when it passed more than 7 days of the end of the event', async () => {
        const endDate = '2023-01-01T10:00:00Z';
        const systemTime = '2023-01-08T10:01:00Z';

        const users = getContentfulReminderUsersContent();
        users!.role = 'Grantee';
        users!.teamsCollection!.items[0]!.role = 'Project Manager';

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const uploadPresentationReminder = getUploadPresentationReminder();
        uploadPresentationReminder.data.endDate = endDate;

        expect(result.items.map((r) => r.type)).not.toContain(
          'Upload Presentation',
        );
      });

      it('Should not fetch the reminder when the event is a future event', async () => {
        const systemTime = '2022-12-31T10:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.role = 'Grantee';
        users!.teamsCollection!.items[0]!.role = 'Project Manager';

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const uploadPresentationReminder = getUploadPresentationReminder();
        uploadPresentationReminder.data.endDate = '2023-01-01T10:00:00Z';

        expect(result.items.map((r) => r.type)).not.toContain(
          'Upload Presentation',
        );
      });

      it('Should not fetch the reminder if it has not ended', async () => {
        const systemTime = '2023-01-01T09:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.role = 'Grantee';
        users!.teamsCollection!.items[0]!.role = 'Project Manager';

        setContentfulMock(systemTime, users);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const endDate = '2023-01-01T10:00:00Z';
        const uploadPresentationReminder = getUploadPresentationReminder();
        uploadPresentationReminder.data.endDate = endDate;

        expect(result.items.map((r) => r.type)).not.toContain(
          'Upload Presentation',
        );
      });
    });

    interface MaterialTestProps {
      material: 'Video' | 'Presentation' | 'Notes';
      materialUpdatedAtName:
        | 'videoRecordingUpdatedAt'
        | 'presentationUpdatedAt'
        | 'notesUpdatedAt';
      expectedMaterialReminder:
        | PresentationUpdatedReminder
        | VideoEventReminder
        | EventNotesReminder;
    }

    describe.each`
      material          | materialUpdatedAtName        | expectedMaterialReminder
      ${'Video'}        | ${'videoRecordingUpdatedAt'} | ${getVideoEventUpdatedReminder()}
      ${'Presentation'} | ${'presentationUpdatedAt'}   | ${getPresentationUpdatedReminder()}
      ${'Notes'}        | ${'notesUpdatedAt'}          | ${getNotesUpdatedReminder()}
    `(
      '$material Updated Reminder',
      ({
        material,
        materialUpdatedAtName,
        expectedMaterialReminder,
      }: MaterialTestProps) => {
        test(`Should fetch the reminder if a ${material} was updated in an event between now and 24 hours ago`, async () => {
          const materialUpdatedAt = '2023-01-01T08:00:00Z';
          const systemTime = '2023-01-02T07:59:00Z';

          const eventMockResponse = getContentfulReminderEventsCollectionItem();
          eventMockResponse![materialUpdatedAtName] = materialUpdatedAt;

          setContentfulMock(systemTime, null, '', '', eventMockResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result).toEqual({
            total: 1,
            items: [
              {
                ...expectedMaterialReminder,
                data: {
                  ...expectedMaterialReminder.data,
                  [materialUpdatedAtName]: materialUpdatedAt,
                },
              },
            ],
          });
        });

        test(`Should not fetch the reminder if a ${material} in an event was updated more that 24 hours ago`, async () => {
          const materialUpdatedAt = '2023-01-01T08:00:00Z';
          const systemTime = '2023-01-02T08:10:00Z';

          const eventMockResponse = getContentfulReminderEventsCollectionItem();
          eventMockResponse![materialUpdatedAtName] = materialUpdatedAt;

          setContentfulMock(systemTime, null, '', '', eventMockResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain(
            expectedMaterialReminder.type,
          );
        });

        test(`Should not fetch the reminder if a ${material} in an event was updated after the current time`, async () => {
          const materialUpdatedAt = '2023-01-01T08:00:00Z';
          const systemTime = '2023-01-01T07:00:00Z';

          const eventMockResponse = getContentfulReminderEventsCollectionItem();
          eventMockResponse![materialUpdatedAtName] = materialUpdatedAt;

          setContentfulMock(systemTime, null, '', '', eventMockResponse);

          const result = await remindersDataProvider.fetch(
            fetchRemindersOptions,
          );

          expect(result.items.map((r) => r.type)).not.toContain(
            expectedMaterialReminder.type,
          );
        });
      },
    );

    describe('Multiple material reminders', () => {
      test(`Should fetch the reminders if more than one material was updated in an event between now and 24 hours ago`, async () => {
        const materialUpdatedAt = '2023-01-01T08:00:00Z';
        const systemTime = '2023-01-02T07:59:00Z';

        const eventMockResponse = getContentfulReminderEventsCollectionItem();
        eventMockResponse!.videoRecordingUpdatedAt = materialUpdatedAt;
        eventMockResponse!.presentationUpdatedAt = materialUpdatedAt;
        eventMockResponse!.notesUpdatedAt = materialUpdatedAt;

        setContentfulMock(systemTime, null, '', '', eventMockResponse);

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const videoEventUpdatedReminder = getVideoEventUpdatedReminder();
        videoEventUpdatedReminder.data.videoRecordingUpdatedAt =
          materialUpdatedAt;

        const presentationUpdatedReminder = getPresentationUpdatedReminder();
        presentationUpdatedReminder.data.presentationUpdatedAt =
          materialUpdatedAt;

        const notesEventUpdatedReminder = getNotesUpdatedReminder();
        notesEventUpdatedReminder.data.notesUpdatedAt = materialUpdatedAt;

        expect(result).toEqual({
          total: 3,
          items: [
            videoEventUpdatedReminder,
            presentationUpdatedReminder,
            notesEventUpdatedReminder,
          ],
        });
      });
    });
  });
});
