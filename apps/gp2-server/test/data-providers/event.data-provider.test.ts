import {
  Entry,
  Environment,
  getGP2ContentfulGraphqlClientMockServer,
  gp2 as gp2Contentful,
  patchAndPublish,
} from '@asap-hub/contentful';
import {
  EventContentfulDataProvider,
  parseGraphQLEvent,
} from '../../src/data-providers/event.data-provider';
import { getEntry } from '../fixtures/contentful.fixtures';
import {
  getContentfulEventDataObject,
  getContentfulGraphql,
  getContentfulGraphqlEvent,
  getContentfulGraphqlEventsResponse,
  getContentfulListEventDataObject,
  getEventCreateDataObject,
  getEventsByExternalUserIdGraphqlResponse,
  getEventsByUserIdGraphqlResponse,
} from '../fixtures/event.fixtures';
import { getContentfulGraphqlClientMock } from '../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../mocks/contentful-rest-client.mock';

jest.mock('@asap-hub/contentful', () => ({
  ...jest.requireActual('@asap-hub/contentful'),
  patchAndPublish: jest.fn().mockResolvedValue(undefined),
}));

describe('Events Contentful Data Provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const eventDataProvider = new EventContentfulDataProvider(
    contentfulGraphqlClientMock,
    contentfulRestClientMock,
  );

  const contentfulGraphqlClientMockServer =
    getGP2ContentfulGraphqlClientMockServer(getContentfulGraphql());

  const eventDataProviderMockGraphql = new EventContentfulDataProvider(
    contentfulGraphqlClientMockServer,
    contentfulRestClientMock,
  );

  beforeEach(jest.resetAllMocks);

  describe('Fetch', () => {
    test('Should fetch the events from Contentful graphql', async () => {
      const result = await eventDataProviderMockGraphql.fetch({});

      expect(result).toMatchObject(getContentfulListEventDataObject());
    });

    test('Should return an empty result when the client returns an empty array of data', async () => {
      const contentfulGraphQLResponse = getContentfulGraphqlEventsResponse();
      contentfulGraphQLResponse.eventsCollection!.total = 0;
      contentfulGraphQLResponse.eventsCollection!.items = [];

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await eventDataProvider.fetch({});

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    test('Should return a list of events', async () => {
      const contentfulGraphQLResponse = getContentfulGraphqlEventsResponse();

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await eventDataProvider.fetch({});

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_EVENTS,
        {
          limit: 10,
          skip: 0,
          order: undefined,
          where: {
            hidden_not: true,
          },
        },
      );
      expect(result).toEqual(getContentfulListEventDataObject());
    });

    test('Should return an empty result if no tags', async () => {
      const mockResponse = getContentfulGraphqlEventsResponse();
      const event = getContentfulGraphqlEvent();
      event.tagsCollection = null;
      mockResponse.eventsCollection!.items = [event];
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(mockResponse);

      const { items } = await eventDataProvider.fetch({});

      expect(items[0]).toMatchObject({
        tags: [],
      });
    });

    test('Should return the total of records ', async () => {
      const contentfulGraphQLResponse = getContentfulGraphqlEventsResponse();
      contentfulGraphQLResponse.eventsCollection!.total = 11;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const { total } = await eventDataProvider.fetch({});

      expect(total).toEqual(11);
    });

    test('Should apply the filter to remove hidden events by default', async () => {
      const contentfulGraphQLResponse = getContentfulGraphqlEventsResponse();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await eventDataProvider.fetch({ after: 'after-date' });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        gp2Contentful.FETCH_EVENTS,
        {
          limit: 10,
          skip: 0,
          order: undefined,
          where: {
            endDate_gt: 'after-date',
            hidden_not: true,
          },
        },
      );
      expect(result).toEqual(getContentfulListEventDataObject());
    });

    describe('Sorting', () => {
      test.each`
        sortBy         | sortOrder | order
        ${'startDate'} | ${'asc'}  | ${'startDate_ASC'}
        ${'startDate'} | ${'desc'} | ${'startDate_DESC'}
        ${'endDate'}   | ${'asc'}  | ${'endDate_ASC'}
        ${'endDate'}   | ${'desc'} | ${'endDate_DESC'}
      `(
        'Should apply the "orderBy" option using the $sortBy field and $sortOrder order',
        async ({ sortBy, sortOrder, order }) => {
          const eventsGraphqlResponse = getContentfulGraphqlEventsResponse();
          contentfulGraphqlClientMock.request.mockResolvedValueOnce(
            eventsGraphqlResponse,
          );
          const result = await eventDataProvider.fetch({
            sortBy,
            sortOrder,
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            gp2Contentful.FETCH_EVENTS,
            {
              limit: 10,
              skip: 0,
              where: {
                hidden_not: true,
              },
              order,
            },
          );
          expect(result).toEqual(getContentfulListEventDataObject());
        },
      );

      test('Should not apply any order if the parameters are not provided', async () => {
        const eventsGraphqlResponse = getContentfulGraphqlEventsResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          eventsGraphqlResponse,
        );
        const result = await eventDataProvider.fetch({});

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_EVENTS,
          {
            limit: 10,
            skip: 0,
            where: {
              hidden_not: true,
            },
            order: undefined,
          },
        );
        expect(result).toEqual(getContentfulListEventDataObject());
      });
    });

    describe('Filters', () => {
      describe.each`
        filterBy            | filterValue         | getGraphqlResponse                          | collection
        ${'userId'}         | ${'user-1'}         | ${getEventsByUserIdGraphqlResponse}         | ${'users'}
        ${'externalUserId'} | ${'externalUser-1'} | ${getEventsByExternalUserIdGraphqlResponse} | ${'externalUsers'}
      `(
        '$filterBy',
        ({ filterBy, filterValue, getGraphqlResponse, collection }) => {
          test('Should apply the filter and return the events', async () => {
            const eventsGraphqlResponse = getGraphqlResponse();
            contentfulGraphqlClientMock.request.mockResolvedValueOnce(
              eventsGraphqlResponse,
            );
            const result = await eventDataProvider.fetch({
              filter: { [filterBy]: filterValue },
            });

            expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
              expect.anything(),
              {
                id: filterValue,
                limit: 10,
                skip: 0,
              },
            );
            expect(result).toEqual(getContentfulListEventDataObject());
          });

          test('Should apply the filter and return empty result when eventSpeakersCollection is empty', async () => {
            const eventsGraphqlResponse = getGraphqlResponse();
            eventsGraphqlResponse[
              collection
            ]!.linkedFrom!.eventSpeakersCollection!.items! = [];
            contentfulGraphqlClientMock.request.mockResolvedValueOnce(
              eventsGraphqlResponse,
            );
            const result = await eventDataProvider.fetch({
              filter: { [filterBy]: filterValue },
            });

            expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
              expect.anything(),
              {
                id: filterValue,
                limit: 10,
                skip: 0,
              },
            );
            expect(result).toEqual({
              items: [],
              total: 0,
            });
          });
        },
      );

      test('should filter events if before date is provided', async () => {
        const eventsGraphqlResponse = getEventsByUserIdGraphqlResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          eventsGraphqlResponse,
        );
        const result = await eventDataProvider.fetch({
          before: new Date().toISOString(),
          filter: {
            userId: 'user-1',
          },
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_EVENTS_BY_USER_ID,
          {
            id: 'user-1',
            limit: 10,
            skip: 0,
          },
        );
        expect(result).toEqual(getContentfulListEventDataObject());
      });

      test('should filter events if after date is provided', async () => {
        const eventsGraphqlResponse = getEventsByUserIdGraphqlResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          eventsGraphqlResponse,
        );
        const result = await eventDataProvider.fetch({
          after: new Date().toISOString(),
          filter: { userId: 'user-1' },
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_EVENTS_BY_USER_ID,
          {
            id: 'user-1',
            limit: 10,
            skip: 0,
          },
        );
        expect(result).toEqual({ total: 0, items: [] });
      });

      test.each`
        filterValue           | filterBy            | resultParamName    | query
        ${'working-group-id'} | ${'workingGroupId'} | ${'workingGroups'} | ${gp2Contentful.FETCH_WORKING_GROUP_CALENDAR}
        ${'project-id'}       | ${'projectId'}      | ${'projects'}      | ${gp2Contentful.FETCH_PROJECT_CALENDAR}
      `(
        'can filter by $filterParam',
        async ({ filterValue, filterBy, resultParamName, query }) => {
          const calendarId = 'calendar-id';
          const calendarResponse = {
            [resultParamName]: {
              calendar: {
                sys: {
                  id: calendarId,
                },
              },
            },
          };

          const eventsGraphqlResponse = getContentfulGraphqlEventsResponse();
          contentfulGraphqlClientMock.request
            .mockResolvedValueOnce(calendarResponse)
            .mockResolvedValueOnce(eventsGraphqlResponse);
          const result = await eventDataProvider.fetch({
            filter: { [filterBy]: filterValue },
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            query,
            {
              id: filterValue,
            },
          );
          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            gp2Contentful.FETCH_EVENTS,
            {
              limit: 10,
              skip: 0,
              where: {
                calendar: { sys: { id: calendarId } },
                hidden_not: true,
              },
              order: undefined,
            },
          );
          expect(result).toEqual(getContentfulListEventDataObject());
        },
      );

      test('can filter by googleId', async () => {
        const googleId = 'google-event-id';

        const eventsGraphqlResponse = getContentfulGraphqlEventsResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          eventsGraphqlResponse,
        );
        const result = await eventDataProvider.fetch({
          filter: { googleId },
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_EVENTS,
          {
            limit: 10,
            skip: 0,
            where: {
              googleId_contains: 'google-event-id',
              hidden_not: true,
            },
            order: undefined,
          },
        );
        expect(result).toEqual(getContentfulListEventDataObject());
      });

      test('can filter by calendarId', async () => {
        const calendarId = 'caledndar-id';

        const eventsGraphqlResponse = getContentfulGraphqlEventsResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          eventsGraphqlResponse,
        );
        const result = await eventDataProvider.fetch({
          filter: { calendarId },
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_EVENTS,
          {
            limit: 10,
            skip: 0,
            where: {
              calendar: {
                sys: {
                  id: calendarId,
                },
              },
              hidden_not: true,
            },
            order: undefined,
          },
        );
        expect(result).toEqual(getContentfulListEventDataObject());
      });

      test('Should apply search query params', async () => {
        const eventsGraphqlResponse = getContentfulGraphqlEventsResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          eventsGraphqlResponse,
        );

        const result = await eventDataProvider.fetch({
          search: 'parkinson disease',
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          gp2Contentful.FETCH_EVENTS,
          {
            limit: 10,
            skip: 0,
            where: {
              OR: [
                {
                  title_contains: 'parkinson',
                },
                {
                  tags: { name_in: ['parkinson'] },
                },
                {
                  title_contains: 'disease',
                },
                {
                  tags: { name_in: ['disease'] },
                },
              ],
              hidden_not: true,
            },
            order: undefined,
          },
        );
        expect(result).toEqual(getContentfulListEventDataObject());
      });

      test.each`
        filterValue           | filterBy            | resultParamName    | query
        ${'working-group-id'} | ${'workingGroupId'} | ${'workingGroups'} | ${gp2Contentful.FETCH_WORKING_GROUP_CALENDAR}
        ${'project-id'}       | ${'projectId'}      | ${'projects'}      | ${gp2Contentful.FETCH_PROJECT_CALENDAR}
      `(
        'should return empty result if there is no calendar associated to the provided $filterBy',
        async ({ filterValue, filterBy, resultParamName, query }) => {
          const calendarResponse = { [resultParamName]: null };

          const eventsGraphqlResponse = getContentfulGraphqlEventsResponse();
          contentfulGraphqlClientMock.request
            .mockResolvedValueOnce(calendarResponse)
            .mockResolvedValueOnce(eventsGraphqlResponse);
          const result = await eventDataProvider.fetch({
            filter: { [filterBy]: filterValue },
          });

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            query,
            {
              id: filterValue,
            },
          );
          expect(contentfulGraphqlClientMock.request).not.toHaveBeenCalledWith(
            gp2Contentful.FETCH_EVENTS,
            expect.anything(),
          );
          expect(result).toEqual({
            total: 0,
            items: [],
          });
        },
      );
    });
  });

  describe('Fetch-by-id method', () => {
    const eventId = 'event-id';

    test('Should fetch the event from Contentful Graphql', async () => {
      const result = await eventDataProviderMockGraphql.fetchById(eventId);

      expect(result).toMatchObject(getContentfulEventDataObject());
    });

    test('Should return null when event is not found', async () => {
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        event: null,
      });

      const result = await eventDataProvider.fetchById('not-found');
      expect(result).toEqual(null);
    });

    test('Should return the event when it finds it', async () => {
      const contentfulGraphQLResponse = getContentfulGraphqlEvent();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        events: contentfulGraphQLResponse,
      });

      const result = await eventDataProvider.fetchById(eventId);
      expect(result).toEqual(getContentfulEventDataObject());
    });

    test('Should return the hidden flag of a hidden event', async () => {
      const contentfulGraphQLResponse = {
        ...getContentfulGraphqlEvent(),
        hidden: true,
      };
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        events: contentfulGraphQLResponse,
      });

      const result = await eventDataProvider.fetchById(eventId);
      expect(result).toEqual({
        ...getContentfulEventDataObject(),
        hidden: true,
      });
    });

    describe('Event speakers', () => {
      test('Should return external user speaker', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse.speakersCollection!.items![0]!.user! = {
          sys: {
            id: 'external-user-id-3',
          },
          __typename: 'ExternalUsers',
          name: 'Jane Doe',
          orcid: '0000-0000-1111-1111',
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers;
        expect(speakerResult).toEqual([
          {
            speaker: {
              name: 'Jane Doe',
              orcid: '0000-0000-1111-1111',
            },
            topic: 'Some Topic',
          },
        ]);
      });

      test('Should return user speaker', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers;
        expect(speakerResult).toEqual([
          {
            speaker: {
              avatarUrl: undefined,
              displayName: 'Adam Brown',
              firstName: 'Adam',
              id: 'user-id-3',
              lastName: 'Brown',
            },
            topic: 'Some Topic',
          },
        ]);
      });

      test('Should not return user if not onboarded', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse.speakersCollection!.items![0]!.user = {
          sys: {
            id: 'user-id-1',
          },
          __typename: 'Users',
          onboarded: false,
          firstName: 'Adam',
          lastName: 'Brown',
          avatar: null,
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers;
        expect(speakerResult).toEqual([]);
      });

      test('Should return TBA speaker', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse.speakersCollection!.items![0]!.user = null;
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers;
        expect(speakerResult).toEqual([
          {
            speaker: undefined,
            topic: 'Some Topic',
          },
        ]);
      });

      test('Should return TBA speaker without topic if it is not defined', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse.speakersCollection!.items![0]!.user = null;
        contentfulGraphQLResponse.speakersCollection!.items![0]!.title = null;
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers;
        expect(speakerResult).toEqual([
          {
            speaker: undefined,
            topic: undefined,
          },
        ]);
      });
    });
  });

  describe('Update', () => {
    const entry = getEntry({
      fields: {
        hidden: true,
      },
    });
    entry.patch = jest.fn().mockResolvedValueOnce(
      getEntry({
        fields: {
          hidden: false,
        },
      }),
    );

    beforeEach(() => {
      environmentMock.getEntry.mockResolvedValueOnce(entry);
    });

    test('fetches entry from contentful and passes to `patchAndPublish`', async () => {
      const mockPatchAndPublish = patchAndPublish as jest.MockedFunction<
        typeof patchAndPublish
      >;
      mockPatchAndPublish.mockResolvedValue({
        sys: {
          publishedVersion: 2,
        },
      } as Entry);
      contentfulGraphqlClientMock.request.mockResolvedValue({
        events: {
          sys: {
            publishedVersion: 2,
          },
        },
      });

      await eventDataProvider.update('123', {
        hidden: false,
      });
      expect(environmentMock.getEntry).toHaveBeenCalledWith('123');
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        hidden: false,
      });
    });

    test('updates the calendar`', async () => {
      const mockPatchAndPublish = patchAndPublish as jest.MockedFunction<
        typeof patchAndPublish
      >;
      mockPatchAndPublish.mockResolvedValue({
        sys: {
          publishedVersion: 2,
        },
      } as Entry);
      contentfulGraphqlClientMock.request.mockResolvedValue({
        events: {
          sys: {
            publishedVersion: 2,
          },
        },
      });

      await eventDataProvider.update('123', {
        calendar: 'google-calendar-1',
      });
      expect(environmentMock.getEntry).toHaveBeenCalledWith('123');
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        calendar: {
          sys: {
            id: 'google-calendar-1',
            linkType: 'Entry',
            type: 'Link',
          },
        },
      });
    });

    test('updates tags`', async () => {
      const mockPatchAndPublish = patchAndPublish as jest.MockedFunction<
        typeof patchAndPublish
      >;
      mockPatchAndPublish.mockResolvedValue({
        sys: {
          publishedVersion: 2,
        },
      } as Entry);
      contentfulGraphqlClientMock.request.mockResolvedValue({
        events: {
          sys: {
            publishedVersion: 2,
          },
        },
      });

      await eventDataProvider.update('123', {
        tags: [{ id: 'tag-1' }],
      });
      expect(environmentMock.getEntry).toHaveBeenCalledWith('123');
      expect(patchAndPublish).toHaveBeenCalledWith(entry, {
        tags: [
          {
            sys: {
              id: 'tag-1',
              linkType: 'Entry',
              type: 'Link',
            },
          },
        ],
      });
    });
  });

  describe('Create method', () => {
    test('Should create an event', async () => {
      const eventEntryMock = getEntry({
        fields: {
          sys: {
            id: 'event-1',
          },
        },
      });
      environmentMock.createEntry.mockResolvedValue(eventEntryMock);
      eventEntryMock.publish = jest.fn().mockResolvedValueOnce(eventEntryMock);

      const eventDataObject = getEventCreateDataObject();
      await eventDataProvider.create(eventDataObject);

      const createEntryFn = environmentMock.createEntry;
      expect(createEntryFn).toHaveBeenCalledWith('events', {
        fields: {
          calendar: {
            'en-US': {
              sys: {
                id: 'calendar-id',
                linkType: 'Entry',
                type: 'Link',
              },
            },
          },
          description: {
            'en-US': 'This event will be good',
          },
          endDate: {
            'en-US': '2021-02-23T19:32:00Z',
          },
          endDateTimeZone: {
            'en-US': 'Europe/Lisbon',
          },
          googleId: {
            'en-US': 'google-event-id',
          },
          hidden: {
            'en-US': false,
          },
          inPerson: {
            'en-US': false,
          },
          meetingLink: {
            'en-US': 'https://zweem.com',
          },
          startDate: {
            'en-US': '2021-02-23T19:32:00Z',
          },
          startDateTimeZone: {
            'en-US': 'Europe/Lisbon',
          },
          status: {
            'en-US': 'Confirmed',
          },
          title: {
            'en-US': 'Event Tittle',
          },
        },
      });
    });
  });

  describe('parseGraphQLEvent', () => {
    test(`returns null when provided event doesn't have a calendar`, () => {
      const graphqlEvent = getContentfulGraphqlEvent();
      graphqlEvent.sys.id = 'example';
      graphqlEvent.calendar = null;

      expect(parseGraphQLEvent(graphqlEvent)).toBeNull();
    });
  });
});
