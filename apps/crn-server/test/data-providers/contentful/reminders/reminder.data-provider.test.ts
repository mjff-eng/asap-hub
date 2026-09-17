import { getContentfulGraphqlClientMockServer } from '@asap-hub/contentful';
import { FetchRemindersOptions } from '@asap-hub/model';
import { DateTime } from 'luxon';

import { ReminderContentfulDataProvider } from '../../../../src/data-providers/contentful/reminder.data-provider';
import { getContentfulGraphqlClientMock } from '../../../mocks/contentful-graphql-client.mock';
import { getContentfulGraphqlEvent } from '../../../fixtures/events.fixtures';
import {
  getContentfulReminderEventsCollectionItem,
  getContentfulReminderResearchOutputCollectionItem,
  getContentfulReminderUsersContent,
  getEventHappeningNowReminder,
} from '../../../fixtures/reminders.fixtures';

describe('Reminders data provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();

  const remindersDataProvider = new ReminderContentfulDataProvider(
    contentfulGraphqlClientMock,
  );

  const contentfulGraphqlClientMockServer =
    getContentfulGraphqlClientMockServer({
      Events: () => getContentfulGraphqlEvent(),
    });

  const remindersDataProviderMockGraphql = new ReminderContentfulDataProvider(
    contentfulGraphqlClientMockServer,
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

    const mockEmptyDiscussionGraphqlResponse = () => {
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

    test('Should fetch the reminders from contentful graphql', async () => {
      const result = await remindersDataProviderMockGraphql.fetch(
        fetchRemindersOptions,
      );

      expect(result).toEqual({
        total: 1,
        items: [
          {
            id: 'event-happening-now-ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
            entity: 'Event',
            type: 'Happening Now',
            data: {
              eventId: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
              title: 'Example Event',
              startDate: '2009-12-24T16:20:14.000Z',
              endDate: '2009-12-24T16:30:54.000Z',
            },
          },
        ],
      });
    });

    test('Should consider timezone when fetching reminders', async () => {
      const zone = 'America/Sao_Paulo';
      const startDate = '2023-01-01T08:00:00Z';
      const endDate = '2023-01-01T10:00:00Z';
      jest.setSystemTime(
        DateTime.fromISO('2023-01-01T08:02:00.000+04:00', {
          zone,
        }).toJSDate(),
      );

      const eventMockResponse = getContentfulReminderEventsCollectionItem();
      eventMockResponse!.startDate = startDate;
      eventMockResponse!.endDate = endDate;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        eventsCollection: {
          items: [eventMockResponse],
        },
      });

      mockEmptyDiscussionGraphqlResponse();

      const result = await remindersDataProvider.fetch({
        ...fetchRemindersOptions,
        timezone: zone,
      });

      const expectedEventHappeningNowReminder = getEventHappeningNowReminder();
      expectedEventHappeningNowReminder.data.startDate = startDate;
      expectedEventHappeningNowReminder.data.endDate = endDate;

      expect(result.items.map((r) => r.type)).not.toContain('Happening Now');
      expect(result.items.map((r) => r.type)).toContain('Happening Today');
    });

    describe('All types of reminders', () => {
      test('Should sort the reminders by the date they are referring to, in a descending order', async () => {
        jest.setSystemTime(new Date('2022-01-01T09:00:00Z'));

        const event1 = getContentfulReminderEventsCollectionItem();
        event1!.sys.id = 'event-1';
        // using event start-date for sorting
        event1!.startDate = '2022-01-01T12:00:00Z';
        event1!.endDate = '2022-01-01T13:00:00Z';
        event1!.presentationUpdatedAt = '2022-01-01T08:04:00Z';

        const event2 = getContentfulReminderEventsCollectionItem();
        event2!.sys.id = 'event-2';
        event2!.startDate = '2022-01-01T08:00:00Z';
        // using event end-date for sorting
        event2!.endDate = '2022-01-01T10:00:00Z';
        event2!.videoRecordingUpdatedAt = '2022-01-01T08:02:00Z';

        const event3 = getContentfulReminderEventsCollectionItem();
        event3!.sys.id = 'event-3';
        event3!.startDate = '2022-01-01T06:00:00Z';
        event3!.endDate = '2022-01-01T07:00:00Z';
        event1!.notesUpdatedAt = '2022-01-01T08:00:00Z';

        const switchToDraftResearchOutputItem =
          getContentfulReminderResearchOutputCollectionItem();
        switchToDraftResearchOutputItem!.sys.id = 'research-output-1';
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
        switchToDraftResearchOutputItem!.statusChangedAt =
          '2022-01-01T09:00:00Z';

        const users = getContentfulReminderUsersContent();
        users!.role = 'Grantee';
        users!.teamsCollection!.items[0]!.role = 'Project Manager';

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          eventsCollection: {
            items: [event1, event2, event3],
          },
          researchOutputsCollection: {
            items: [switchToDraftResearchOutputItem],
          },
          users,
        });

        mockEmptyDiscussionGraphqlResponse();

        const result = await remindersDataProvider.fetch(fetchRemindersOptions);

        const reminderIds = result.items.map((reminder) => reminder.id);

        expect(reminderIds).toEqual([
          'event-happening-today-event-1',
          'event-happening-now-event-2',
          'research-output-switch-to-draft-research-output-1',
          'presentation-event-updated-event-1',
          'video-event-updated-event-2',
          'notes-event-updated-event-1',
          'upload-presentation-event-3',
        ]);
      });
    });
  });

  describe('Fetch-by-id', () => {
    test('should throw an error', async () => {
      await expect(remindersDataProvider.fetchById()).rejects.toThrow(
        'Method not implemented.',
      );
    });
  });
});
