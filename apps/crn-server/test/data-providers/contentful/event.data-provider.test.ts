/* eslint-disable no-unused-expressions, no-sequences */
import {
  Entry,
  Environment,
  getContentfulGraphqlClientMockServer,
  patchAndPublish,
} from '@asap-hub/contentful';
import { EventSpeakerTeam } from '@asap-hub/model';
import { when } from 'jest-when';

import {
  EventContentfulDataProvider,
  parseGraphQLEvent,
} from '../../../src/data-providers/contentful/event.data-provider';
import logger from '../../../src/utils/logger';
import { getEntry } from '../../fixtures/contentful.fixtures';
import {
  getContentfulEventDataObject,
  getContentfulGraphqlEvent,
  getContentfulGraphqlEventsResponse,
  getContentfulListEventDataObject,
  getContentfulRelatedResearch,
  getContentfulRelatedTutorial,
  getContentfulUserSpeakerTeams,
  getEventCreateDataObject,
  getEventsByExternalAuthorIdGraphqlResponse,
  getEventsByTeamIdGraphqlResponse,
  getEventsByUserIdGraphqlResponse,
  getInterestGroupCalendarResponse,
  getPreviousEventAttendanceGraphqlResponse,
  getWorkingGroupCalendarResponse,
} from '../../fixtures/events.fixtures';
import {
  getContentfulGraphqlInterestGroup,
  getInterestGroupDataObject,
} from '../../fixtures/interest-groups.fixtures';
import {
  getContentfulGraphqlWorkingGroup,
  getWorkingGroupDataObject,
} from '../../fixtures/working-groups.fixtures';
import { getContentfulGraphqlClientMock } from '../../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../../mocks/contentful-rest-client.mock';

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
    getContentfulGraphqlClientMockServer({
      TeamMembership: () => getContentfulUserSpeakerTeams(),
      Events: () => getContentfulGraphqlEvent(),
      WorkingGroups: () => getContentfulGraphqlWorkingGroup({}),
      InterestGroups: () => getContentfulGraphqlInterestGroup(),
      ResearchOutputs: () => getContentfulRelatedResearch(),
      Tutorials: () => getContentfulRelatedTutorial(),
    });

  const eventDataProviderMockGraphql = new EventContentfulDataProvider(
    contentfulGraphqlClientMockServer,
    contentfulRestClientMock,
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  const workingGroup = getWorkingGroupDataObject();
  const eventWorkingGroup = {
    id: workingGroup.id,
    title: workingGroup.title,
  };

  const interestGroup = getInterestGroupDataObject();
  const eventInterestGroup = {
    id: interestGroup.id,
    name: interestGroup.name,
    active: interestGroup.active,
    tools: {
      slack: interestGroup.tools.slack,
      googleDrive: interestGroup.tools.googleDrive,
    },
  };
  describe('Fetch', () => {
    test('Should fetch the events from Contentful graphql', async () => {
      const result = await eventDataProviderMockGraphql.fetch({});

      const expectedResult = getContentfulListEventDataObject();
      expectedResult.items[0]!.workingGroup! = eventWorkingGroup;
      expectedResult.items[0]!.interestGroup! = eventInterestGroup;
      expect(result).toMatchObject(expectedResult);
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
        expect.anything(),
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

    test('Should apply the filter to remove hidden events by default', async () => {
      const contentfulGraphQLResponse = getContentfulGraphqlEventsResponse();
      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await eventDataProvider.fetch({ after: 'after-date' });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
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
            expect.anything(),
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
          expect.anything(),
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
        filterBy              | filterValue           | getGraphqlResponse                            | collection
        ${'userId'}           | ${'user-1'}           | ${getEventsByUserIdGraphqlResponse}           | ${'users'}
        ${'externalAuthorId'} | ${'externalAuthor-1'} | ${getEventsByExternalAuthorIdGraphqlResponse} | ${'externalAuthors'}
        ${'teamId'}           | ${'team-1'}           | ${getEventsByTeamIdGraphqlResponse}           | ${'teams'}
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
          expect.anything(),
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

      test('Should apply search query params', async () => {
        const eventsGraphqlResponse = getContentfulGraphqlEventsResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          eventsGraphqlResponse,
        );

        const result = await eventDataProvider.fetch({
          search: 'parkinson disease',
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          {
            limit: 10,
            skip: 0,
            where: {
              OR: [
                {
                  title_contains: 'parkinson',
                },
                {
                  researchTags: {
                    name_contains: 'parkinson',
                  },
                },
                {
                  title_contains: 'disease',
                },
                {
                  researchTags: {
                    name_contains: 'disease',
                  },
                },
              ],
              hidden_not: true,
            },
            order: undefined,
          },
        );
        expect(result).toEqual(getContentfulListEventDataObject());
      });

      test('can filter by workingGroupId', async () => {
        const workingGroupId = 'wg-1';

        const workingGroupCalendar = getWorkingGroupCalendarResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          workingGroupCalendar,
        );

        const eventsGraphqlResponse = getContentfulGraphqlEventsResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          eventsGraphqlResponse,
        );

        const result = await eventDataProvider.fetch({
          filter: { workingGroupId },
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          {
            limit: 10,
            skip: 0,
            where: {
              hidden_not: true,
              calendar: {
                sys: {
                  id: 'calendar-from-wg-id',
                },
              },
            },
            order: undefined,
          },
        );
        expect(result).toEqual(getContentfulListEventDataObject());
      });

      test('can filter by groupId', async () => {
        const interestGroupId = 'wg-1';

        const interestGroupCalendar = getInterestGroupCalendarResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          interestGroupCalendar,
        );

        const eventsGraphqlResponse = getContentfulGraphqlEventsResponse();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce(
          eventsGraphqlResponse,
        );

        const result = await eventDataProvider.fetch({
          filter: { interestGroupId: interestGroupId },
        });

        expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
          expect.anything(),
          {
            limit: 10,
            skip: 0,
            where: {
              hidden_not: true,
              calendar: {
                sys: {
                  id: 'calendar-from-ig-id',
                },
              },
            },
          },
        );
        expect(result).toEqual(getContentfulListEventDataObject());
      });
    });
  });

  describe('Fetch-by-id method', () => {
    const eventId = 'event-id';

    test('Should fetch the event from Contentful Graphql', async () => {
      const result = await eventDataProviderMockGraphql.fetchById(eventId);

      const expectedResult = getContentfulEventDataObject();
      expectedResult.workingGroup = eventWorkingGroup;
      expectedResult.interestGroup = eventInterestGroup;
      expect(result).toMatchObject(expectedResult);
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

    test('Should return the publishedAt as lastModifiedDate lastUpdated is not available', async () => {
      const contentfulGraphQLResponse = getContentfulGraphqlEvent();
      contentfulGraphQLResponse.lastUpdated = null;
      contentfulGraphQLResponse.sys.publishedAt = '2023-08-31T14:00:00.000Z';
      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        events: contentfulGraphQLResponse,
      });

      const result = await eventDataProvider.fetchById(eventId);
      expect(result).toEqual({
        ...getContentfulEventDataObject(),
        lastModifiedDate: '2023-08-31T14:00:00.000Z',
      });
    });

    describe('Attendance', () => {
      test('Should parse attendance and filter out entries with a null team', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        expect(result?.attendance).toEqual([
          {
            id: 'attendance-id-1',
            attended: true,
            team: {
              id: 'team-id-1',
              displayName: 'The team one',
              teamType: 'Discovery Team',
              inactiveSince: undefined,
            },
          },
          {
            id: 'attendance-id-2',
            attended: false,
            team: {
              id: 'team-id-2',
              displayName: 'The team two',
              teamType: undefined,
              inactiveSince: '2022-10-24T11:00:00Z',
            },
          },
        ]);
      });

      test('Should not include attendance on list fetches', async () => {
        const result = await eventDataProviderMockGraphql.fetch({});
        expect(result.items[0]).not.toHaveProperty('attendance');
      });

      describe('previousEventAttendance', () => {
        const withGoogleId = () => {
          const contentfulGraphQLResponse = getContentfulGraphqlEvent();
          contentfulGraphQLResponse.googleId = 'abc123_20260101T100000Z';
          return contentfulGraphQLResponse;
        };

        test('Should compute previousEventAttendance from the previous event', async () => {
          contentfulGraphqlClientMock.request
            .mockResolvedValueOnce({ events: withGoogleId() })
            .mockResolvedValueOnce(getPreviousEventAttendanceGraphqlResponse());

          const result = await eventDataProvider.fetchById(eventId);

          expect(result?.previousEventAttendance).toEqual({
            teamsTotal: 3,
            teamsAttended: 2,
          });
        });

        test('Should request the previous event with the base googleId and the event startDate', async () => {
          contentfulGraphqlClientMock.request
            .mockResolvedValueOnce({ events: withGoogleId() })
            .mockResolvedValueOnce(getPreviousEventAttendanceGraphqlResponse());

          await eventDataProvider.fetchById(eventId);

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
            expect.anything(),
            {
              googleId: 'abc123',
              startDate: '2009-12-24T16:20:14.000Z',
            },
          );
        });

        test('Should not request the previous event when there is no googleId', async () => {
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            events: getContentfulGraphqlEvent(),
          });

          const result = await eventDataProvider.fetchById(eventId);

          expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(1);
          expect(result?.previousEventAttendance).toBeUndefined();
        });

        test('Should leave previousEventAttendance undefined when no previous event is found', async () => {
          contentfulGraphqlClientMock.request
            .mockResolvedValueOnce({ events: withGoogleId() })
            .mockResolvedValueOnce({ eventsCollection: { items: [] } });

          const result = await eventDataProvider.fetchById(eventId);

          expect(result?.previousEventAttendance).toBeUndefined();
        });

        test('Should leave previousEventAttendance undefined when the previous event has no attendance', async () => {
          const response = getPreviousEventAttendanceGraphqlResponse();
          response.eventsCollection!.items[0]!.attendanceCollection!.total = 0;
          response.eventsCollection!.items[0]!.attendanceCollection!.items = [];

          contentfulGraphqlClientMock.request
            .mockResolvedValueOnce({ events: withGoogleId() })
            .mockResolvedValueOnce(response);

          const result = await eventDataProvider.fetchById(eventId);

          expect(result?.previousEventAttendance).toBeUndefined();
        });
      });
    });

    describe('Preliminary data shared', () => {
      test('Should parse preliminary data shared and filter out entries with a null team', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        expect(result?.preliminaryDataShared).toEqual([
          { team: { id: 'team-id-1' }, shared: true },
          { team: { id: 'team-id-2' }, shared: false },
        ]);
      });

      test('Should default preliminaryDataShared to an empty array when the collection has no items', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse.preliminaryDataSharedCollection!.items = [];
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        expect(result?.preliminaryDataShared).toEqual([]);
      });

      test('Should not include preliminaryDataShared on list fetches', async () => {
        const result = await eventDataProviderMockGraphql.fetch({});
        expect(result.items[0]).not.toHaveProperty('preliminaryDataShared');
      });
    });

    describe('Event speakers', () => {
      test('Should remove null speakers from the list', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse.speakersCollection!.items = [
          null,
          ...contentfulGraphQLResponse.speakersCollection!.items,
        ];

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        expect(result!.speakers.length).toEqual(1);
        const speakerResult = result!.speakers[0]! as EventSpeakerTeam;
        expect(speakerResult.team.displayName).toEqual('The team three');
      });
      test('Should default speakers to an empty array', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse.speakersCollection = null;

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        expect(result!.speakers).toEqual([]);
      });
      test('Should return team inactiveSince as undefined when it comes as null from graphql response', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse.speakersCollection!.items![0]!.team!.inactiveSince! =
          null;

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers[0]! as EventSpeakerTeam;
        expect(speakerResult.team.inactiveSince).toBeUndefined();
      });

      test('Should return external author speaker', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse.speakersCollection!.items![0]!.user! = {
          __typename: 'ExternalAuthors',
          name: 'Jane Doe',
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers;
        expect(speakerResult).toEqual([
          {
            id: 'event-speaker-id-3',
            externalUser: {
              name: 'Jane Doe',
            },
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
            id: 'event-speaker-id-3',
            role: 'Lead PI (Core Leadership)',
            team: {
              displayName: 'The team three',
              id: 'team-id-3',
              inactiveSince: '2022-10-24T11:00:00Z',
            },
            user: {
              alumniSinceDate: undefined,
              avatarUrl: undefined,
              displayName: 'Adam (Ad) Brown',
              firstName: 'Adam',
              id: 'user-id-3',
              lastName: 'Brown',
            },
          },
        ]);
      });

      test('Should return only the team when speaker of type user does not belong to this team', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        const team = getContentfulUserSpeakerTeams();
        team.team.sys.id = 'team-id-1';

        (contentfulGraphQLResponse.speakersCollection!.items = [
          {
            team: {
              sys: {
                id: 'team-id-3',
              },
              displayName: 'The team three',
              inactiveSince: null,
            },
            user: {
              __typename: 'Users',
              sys: {
                id: 'user-id-3',
              },
              alumniSinceDate: null,
              alumniLocation: 'some alumni location',
              firstName: 'Adam',
              lastName: 'Brown',
              onboarded: true,
              teamsCollection: {
                items: [team],
              },
              avatar: null,
            },
          },
        ]),
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            events: contentfulGraphQLResponse,
          });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers;
        expect(speakerResult).toEqual([
          {
            team: {
              displayName: 'The team three',
              id: 'team-id-3',
              inactiveSince: undefined,
            },
          },
        ]);
      });

      test('Should return only the team when speaker of type user belongs to the team but is not onboarded', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        const team = getContentfulUserSpeakerTeams();
        team.team.sys.id = 'team-id-1';

        (contentfulGraphQLResponse.speakersCollection!.items = [
          {
            team: {
              sys: {
                id: 'team-id-3',
              },
              displayName: 'The team three',
              inactiveSince: '2022-10-24T11:00:00Z',
            },
            user: {
              __typename: 'Users',
              sys: {
                id: 'user-id-3',
              },
              alumniSinceDate: null,
              alumniLocation: 'some alumni location',
              firstName: 'Adam',
              lastName: 'Brown',
              onboarded: false,
              teamsCollection: {
                items: [getContentfulUserSpeakerTeams()],
              },
              avatar: null,
            },
          },
        ]),
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            events: contentfulGraphQLResponse,
          });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers;
        expect(speakerResult).toEqual([
          {
            team: {
              displayName: 'The team three',
              id: 'team-id-3',
              inactiveSince: '2022-10-24T11:00:00Z',
            },
          },
        ]);
      });

      test("Should return only the team when there's a team assigned but no user", async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();

        (contentfulGraphQLResponse.speakersCollection!.items = [
          {
            team: {
              sys: {
                id: 'team-id-3',
              },
              displayName: 'The team three',
              inactiveSince: '2022-10-24T11:00:00Z',
            },
            user: undefined,
          },
        ]),
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            events: contentfulGraphQLResponse,
          });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers;
        expect(speakerResult).toEqual([
          {
            team: {
              displayName: 'The team three',
              id: 'team-id-3',
              inactiveSince: '2022-10-24T11:00:00Z',
            },
          },
        ]);
      });

      test('Should drop the speaker when it has no team and the user is not onboarded', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();

        contentfulGraphQLResponse.speakersCollection!.items = [
          {
            team: null,
            user: {
              __typename: 'Users',
              sys: {
                id: 'user-id-3',
              },
              alumniSinceDate: null,
              alumniLocation: null,
              firstName: 'Adam',
              lastName: 'Brown',
              onboarded: false,
              teamsCollection: {
                items: [],
              },
              avatar: null,
            },
          },
        ];
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);
        expect(result!.speakers).toEqual([]);
      });

      test('Keeps the speaker without a team assigned', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        (contentfulGraphQLResponse.speakersCollection!.items = [
          {
            team: undefined,
            user: {
              __typename: 'ExternalAuthors',
              name: 'Jane Doe',
            },
          },
          {
            team: undefined,
            user: {
              __typename: 'Users',
              sys: {
                id: 'user-id-3',
              },
              alumniSinceDate: null,
              alumniLocation: 'some alumni location',
              firstName: 'Adam',
              lastName: 'Brown',
              onboarded: true,
              teamsCollection: {
                items: [getContentfulUserSpeakerTeams()],
              },
              avatar: null,
            },
          },
        ]),
          contentfulGraphqlClientMock.request.mockResolvedValueOnce({
            events: contentfulGraphQLResponse,
          });

        const result = await eventDataProvider.fetchById(eventId);
        const speakerResult = result!.speakers;
        expect(speakerResult).toEqual([
          {
            externalUser: {
              name: 'Jane Doe',
            },
          },
          {
            user: expect.objectContaining({
              id: 'user-id-3',
              displayName: 'Adam Brown',
            }),
          },
        ]);
      });
    });

    describe('working group', () => {
      it('should return working group as undefined when linked from calendar is null', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = null;
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.workingGroup).toBeUndefined();
      });

      it('should return working group as undefined when workingGroupsCollection is null', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = {
          workingGroupsCollection: null,
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.workingGroup).toBeUndefined();
      });

      it('should return working group as undefined when workingGroupsCollection items are empty', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = {
          workingGroupsCollection: {
            items: [],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.workingGroup).toBeUndefined();
      });

      it('should return working group as undefined when workingGroupsCollection items are null', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = {
          workingGroupsCollection: {
            items: [null, null],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.workingGroup).toBeUndefined();
      });

      it('should return working group when it is linked from calendar', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = {
          workingGroupsCollection: {
            items: [
              {
                sys: {
                  id: 'wg-linked-from-calendar',
                },
                title: 'WG-1',
              },
            ],
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.workingGroup).toEqual({
          id: 'wg-linked-from-calendar',
          title: 'WG-1',
        });
      });
    });

    describe('interest group', () => {
      it('should return interest group as undefined when linked from calendar is null', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = null;
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.interestGroup).toBeUndefined();
      });

      it('should return interest group as undefined when workingGroupsCollection is null', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = {
          interestGroupsCollection: null,
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.interestGroup).toBeUndefined();
      });

      it('should return interest group as undefined when workingGroupsCollection items are empty', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = {
          interestGroupsCollection: {
            items: [],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.interestGroup).toBeUndefined();
      });

      it('should return interest group as undefined when workingGroupsCollection items are null', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = {
          interestGroupsCollection: {
            items: [null, null],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.interestGroup).toBeUndefined();
      });

      it('should return interest group when it is linked from calendar', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = {
          interestGroupsCollection: {
            items: [
              {
                sys: {
                  id: 'ig-linked-from-calendar',
                },
                name: 'IG-1',
                active: true,
                slack: 'http://www.slack.com/ig1',
              },
            ],
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.interestGroup).toEqual({
          id: 'ig-linked-from-calendar',
          name: 'IG-1',
          active: true,
          tools: {
            slack: 'http://www.slack.com/ig1',
          },
        });
      });

      it('should map the interest group thumbnail when present', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = {
          interestGroupsCollection: {
            items: [
              {
                sys: {
                  id: 'ig-linked-from-calendar',
                },
                name: 'IG-1',
                active: true,
                slack: 'http://www.slack.com/ig1',
                thumbnail: { url: 'https://example.com/ig-thumbnail.png' },
              },
            ],
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.interestGroup!.thumbnail).toEqual(
          'https://example.com/ig-thumbnail.png',
        );
      });

      it('should leave the interest group thumbnail undefined when absent', async () => {
        const contentfulGraphQLResponse = getContentfulGraphqlEvent();
        contentfulGraphQLResponse!.calendar!.linkedFrom = {
          interestGroupsCollection: {
            items: [
              {
                sys: {
                  id: 'ig-linked-from-calendar',
                },
                name: 'IG-1',
                active: true,
                slack: 'http://www.slack.com/ig1',
              },
            ],
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          events: contentfulGraphQLResponse,
        });

        const result = await eventDataProvider.fetchById(eventId);

        expect(result!.interestGroup!.thumbnail).toBeUndefined();
      });
    });
  });

  describe('Update', () => {
    const entry = getEntry({
      hidden: true,
    });
    entry.patch = jest.fn().mockResolvedValueOnce(
      getEntry({
        hidden: false,
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
  });

  describe('updateEventDetails', () => {
    const mockPollingConsistency = () => {
      const mockPatchAndPublish = patchAndPublish as jest.MockedFunction<
        typeof patchAndPublish
      >;
      mockPatchAndPublish.mockResolvedValue({
        sys: { publishedVersion: 2 },
      } as Entry);
      contentfulGraphqlClientMock.request.mockResolvedValue({
        events: { sys: { publishedVersion: 2 } },
      });
    };

    test('creates a new attendance entry for an attendance item without an id and links it to the event', async () => {
      const eventEntry = getEntry(
        { attendance: { 'en-US': [] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const publishedEntry = getEntry({}, { id: 'attendance-new' });
      const newAttendanceEntry = getEntry({}, { id: 'attendance-new' });
      newAttendanceEntry.publish = jest.fn().mockResolvedValue(publishedEntry);
      environmentMock.createEntry.mockResolvedValue(newAttendanceEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        attendance: [{ teamId: 'team-1', attended: true }],
      });

      expect(environmentMock.createEntry).toHaveBeenCalledWith('attendance', {
        fields: {
          team: {
            'en-US': { sys: { type: 'Link', linkType: 'Entry', id: 'team-1' } },
          },
          attended: { 'en-US': true },
        },
      });
      expect(patchAndPublish).toHaveBeenCalledWith(eventEntry, {
        attendance: [
          { sys: { type: 'Link', linkType: 'Entry', id: 'attendance-new' } },
        ],
      });
    });

    test('updates an existing attendance entry in place when attended changes, without recreating it', async () => {
      const existingLink = {
        sys: { type: 'Link', linkType: 'Entry', id: 'attendance-1' },
      };
      const eventEntry = getEntry(
        { attendance: { 'en-US': [existingLink] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const existingAttendanceEntry = getEntry(
        { attended: { 'en-US': true } },
        { id: 'attendance-1' },
      );
      existingAttendanceEntry.update = jest
        .fn()
        .mockResolvedValue(existingAttendanceEntry);
      existingAttendanceEntry.publish = jest
        .fn()
        .mockResolvedValue(existingAttendanceEntry);
      when(environmentMock.getEntry)
        .calledWith('attendance-1')
        .mockResolvedValue(existingAttendanceEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        attendance: [{ id: 'attendance-1', teamId: 'team-1', attended: false }],
      });

      expect(existingAttendanceEntry.fields).toEqual({
        team: {
          'en-US': { sys: { type: 'Link', linkType: 'Entry', id: 'team-1' } },
        },
        attended: { 'en-US': false },
      });
      expect(existingAttendanceEntry.update).toHaveBeenCalled();
      expect(existingAttendanceEntry.publish).toHaveBeenCalled();
      expect(environmentMock.createEntry).not.toHaveBeenCalled();
    });

    test('does not touch an existing attendance entry when attended is unchanged', async () => {
      const existingLink = {
        sys: { type: 'Link', linkType: 'Entry', id: 'attendance-1' },
      };
      const eventEntry = getEntry(
        { attendance: { 'en-US': [existingLink] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const existingAttendanceEntry = getEntry(
        { attended: { 'en-US': true } },
        { id: 'attendance-1' },
      );
      existingAttendanceEntry.update = jest.fn();
      when(environmentMock.getEntry)
        .calledWith('attendance-1')
        .mockResolvedValue(existingAttendanceEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        attendance: [{ id: 'attendance-1', teamId: 'team-1', attended: true }],
      });

      expect(existingAttendanceEntry.update).not.toHaveBeenCalled();
      expect(environmentMock.createEntry).not.toHaveBeenCalled();
      expect(patchAndPublish).toHaveBeenCalledWith(eventEntry, {
        attendance: [
          { sys: { type: 'Link', linkType: 'Entry', id: 'attendance-1' } },
        ],
      });
    });

    test('deletes an attendance entry that is no longer present in the payload', async () => {
      const staleLink = {
        sys: { type: 'Link', linkType: 'Entry', id: 'attendance-stale' },
      };
      const eventEntry = getEntry(
        { attendance: { 'en-US': [staleLink] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const staleEntry = getEntry({}, { id: 'attendance-stale' });
      staleEntry.isPublished = jest.fn(() => true);
      when(environmentMock.getEntry)
        .calledWith('attendance-stale')
        .mockResolvedValue(staleEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', { attendance: [] });

      expect(staleEntry.unpublish).toHaveBeenCalled();
      expect(staleEntry.delete).toHaveBeenCalled();
    });

    test('logs a warning and continues if fetching a stale attendance entry fails', async () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn');
      const staleLink = {
        sys: { type: 'Link', linkType: 'Entry', id: 'attendance-stale' },
      };
      const eventEntry = getEntry(
        { attendance: { 'en-US': [staleLink] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);
      const fetchError = new Error('failed!');
      when(environmentMock.getEntry)
        .calledWith('attendance-stale')
        .mockRejectedValue(fetchError);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', { attendance: [] });

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        { error: fetchError, attendanceId: 'attendance-stale' },
        'Error fetching attendance entry with id: attendance-stale',
      );
    });

    test('logs a warning and continues if unpublishing a stale attendance entry fails', async () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn');
      const staleLink = {
        sys: { type: 'Link', linkType: 'Entry', id: 'attendance-stale' },
      };
      const eventEntry = getEntry(
        { attendance: { 'en-US': [staleLink] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const staleEntry = getEntry({}, { id: 'attendance-stale' });
      staleEntry.isPublished = jest.fn(() => true);
      const unpublishError = new Error('unpublish failed!');
      staleEntry.unpublish = jest.fn().mockRejectedValue(unpublishError);
      when(environmentMock.getEntry)
        .calledWith('attendance-stale')
        .mockResolvedValue(staleEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', { attendance: [] });

      expect(staleEntry.delete).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        { error: unpublishError, attendanceId: 'attendance-stale' },
        'Error unpublishing attendance entry with id: attendance-stale',
      );
    });

    test('logs a warning and continues if deleting a stale attendance entry fails', async () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn');
      const staleLink = {
        sys: { type: 'Link', linkType: 'Entry', id: 'attendance-stale' },
      };
      const eventEntry = getEntry(
        { attendance: { 'en-US': [staleLink] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const staleEntry = getEntry({}, { id: 'attendance-stale' });
      staleEntry.isPublished = jest.fn(() => true);
      const deleteError = new Error('delete failed!');
      staleEntry.delete = jest.fn().mockRejectedValue(deleteError);
      when(environmentMock.getEntry)
        .calledWith('attendance-stale')
        .mockResolvedValue(staleEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', { attendance: [] });

      expect(staleEntry.unpublish).toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        { error: deleteError, attendanceId: 'attendance-stale' },
        'Error deleting attendance entry with id: attendance-stale',
      );
    });

    test('skips an attendance entry that no longer exists', async () => {
      const loggerWarnSpy = jest.spyOn(logger, 'warn');
      const existingLink = {
        sys: { type: 'Link', linkType: 'Entry', id: 'attendance-1' },
      };
      const eventEntry = getEntry(
        { attendance: { 'en-US': [existingLink] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const existingAttendanceEntry = getEntry(
        { attended: { 'en-US': true } },
        { id: 'attendance-1' },
      );
      existingAttendanceEntry.update = jest
        .fn()
        .mockResolvedValue(existingAttendanceEntry);
      existingAttendanceEntry.publish = jest
        .fn()
        .mockResolvedValue(existingAttendanceEntry);
      when(environmentMock.getEntry)
        .calledWith('attendance-1')
        .mockResolvedValue(existingAttendanceEntry);

      const missingError = new Error('not found');
      when(environmentMock.getEntry)
        .calledWith('attendance-missing')
        .mockRejectedValue(missingError);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        attendance: [
          { id: 'attendance-1', teamId: 'team-1', attended: false },
          { id: 'attendance-missing', teamId: 'team-2', attended: true },
        ],
      });

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        { error: missingError, attendanceId: 'attendance-missing' },
        'Attendance entry with id: attendance-missing no longer exists, skipping',
      );
      expect(patchAndPublish).toHaveBeenCalledWith(eventEntry, {
        attendance: [
          { sys: { type: 'Link', linkType: 'Entry', id: 'attendance-1' } },
        ],
      });
    });

    test('throws if creating a new attendance entry fails', async () => {
      const eventEntry = getEntry(
        { attendance: { 'en-US': [] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);
      environmentMock.createEntry.mockRejectedValue(new Error('boom'));

      await expect(
        eventDataProvider.updateEventDetails('123', {
          attendance: [{ teamId: 'team-1', attended: true }],
        }),
      ).rejects.toThrow('Error creating attendance entry');
    });

    test('does nothing when the payload has no recognised fields', async () => {
      const eventEntry = getEntry({}, { id: '123' });
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      await eventDataProvider.updateEventDetails('123', {});

      expect(patchAndPublish).not.toHaveBeenCalled();
      expect(environmentMock.createEntry).not.toHaveBeenCalled();
    });

    test('deletes the speaker entries listed in speakersToRemove and relinks the remaining speakers', async () => {
      const eventEntry = getEntry(
        {
          speakers: {
            'en-US': [
              { sys: { type: 'Link', linkType: 'Entry', id: 'speaker-1' } },
              { sys: { type: 'Link', linkType: 'Entry', id: 'speaker-2' } },
            ],
          },
        },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const speakerToDelete = getEntry({}, { id: 'speaker-1' });
      speakerToDelete.isPublished = jest.fn(() => true);
      speakerToDelete.unpublish = jest.fn().mockResolvedValue(speakerToDelete);
      speakerToDelete.delete = jest.fn().mockResolvedValue(undefined);
      when(environmentMock.getEntry)
        .calledWith('speaker-1')
        .mockResolvedValue(speakerToDelete);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        speakersToRemove: ['speaker-1'],
      });

      expect(speakerToDelete.unpublish).toHaveBeenCalled();
      expect(speakerToDelete.delete).toHaveBeenCalled();
      expect(patchAndPublish).toHaveBeenCalledWith(eventEntry, {
        speakers: [
          { sys: { type: 'Link', linkType: 'Entry', id: 'speaker-2' } },
        ],
      });
    });

    test('warns and continues when a speaker entry to delete cannot be fetched', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const eventEntry = getEntry(
        {
          speakers: {
            'en-US': [
              { sys: { type: 'Link', linkType: 'Entry', id: 'speaker-1' } },
            ],
          },
        },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);
      when(environmentMock.getEntry)
        .calledWith('speaker-1')
        .mockRejectedValue(new Error('gone'));
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        speakersToRemove: ['speaker-1'],
      });

      expect(warnSpy).toHaveBeenCalled();
      expect(patchAndPublish).toHaveBeenCalledWith(eventEntry, {
        speakers: [],
      });
      warnSpy.mockRestore();
    });

    test('warns and continues when unpublishing a speaker entry fails', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const eventEntry = getEntry(
        {
          speakers: {
            'en-US': [
              { sys: { type: 'Link', linkType: 'Entry', id: 'speaker-1' } },
            ],
          },
        },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const speakerToDelete = getEntry({}, { id: 'speaker-1' });
      speakerToDelete.isPublished = jest.fn(() => true);
      speakerToDelete.unpublish = jest
        .fn()
        .mockRejectedValue(new Error('locked'));
      when(environmentMock.getEntry)
        .calledWith('speaker-1')
        .mockResolvedValue(speakerToDelete);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        speakersToRemove: ['speaker-1'],
      });

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('warns and continues when deleting a speaker entry fails', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const eventEntry = getEntry(
        {
          speakers: {
            'en-US': [
              { sys: { type: 'Link', linkType: 'Entry', id: 'speaker-1' } },
            ],
          },
        },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const speakerToDelete = getEntry({}, { id: 'speaker-1' });
      speakerToDelete.isPublished = jest.fn(() => false);
      speakerToDelete.delete = jest.fn().mockRejectedValue(new Error('busy'));
      when(environmentMock.getEntry)
        .calledWith('speaker-1')
        .mockResolvedValue(speakerToDelete);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        speakersToRemove: ['speaker-1'],
      });

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('updates an existing preliminary data sharing entry when shared changes', async () => {
      const eventEntry = getEntry(
        {
          preliminaryDataShared: {
            'en-US': [
              { sys: { type: 'Link', linkType: 'Entry', id: 'prelim-1' } },
            ],
          },
        },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const prelimEntry = getEntry(
        {
          team: { 'en-US': { sys: { id: 'team-1' } } },
          preliminaryDataShared: { 'en-US': false },
        },
        { id: 'prelim-1' },
      );
      prelimEntry.update = jest.fn().mockResolvedValue(prelimEntry);
      prelimEntry.publish = jest.fn().mockResolvedValue(prelimEntry);
      when(environmentMock.getEntry)
        .calledWith('prelim-1')
        .mockResolvedValue(prelimEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        preliminaryDataShared: [{ teamId: 'team-1', shared: true }],
      });

      expect(prelimEntry.fields).toEqual({
        team: {
          'en-US': { sys: { type: 'Link', linkType: 'Entry', id: 'team-1' } },
        },
        preliminaryDataShared: { 'en-US': true },
      });
      expect(prelimEntry.update).toHaveBeenCalled();
      expect(prelimEntry.publish).toHaveBeenCalled();
      expect(environmentMock.createEntry).not.toHaveBeenCalled();
      expect(patchAndPublish).toHaveBeenCalledWith(eventEntry, {
        preliminaryDataShared: [
          { sys: { type: 'Link', linkType: 'Entry', id: 'prelim-1' } },
        ],
      });
    });

    test('does not rewrite a preliminary data sharing entry when shared is unchanged', async () => {
      const eventEntry = getEntry(
        {
          preliminaryDataShared: {
            'en-US': [
              { sys: { type: 'Link', linkType: 'Entry', id: 'prelim-1' } },
            ],
          },
        },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const prelimEntry = getEntry(
        {
          team: { 'en-US': { sys: { id: 'team-1' } } },
          preliminaryDataShared: { 'en-US': true },
        },
        { id: 'prelim-1' },
      );
      prelimEntry.update = jest.fn();
      when(environmentMock.getEntry)
        .calledWith('prelim-1')
        .mockResolvedValue(prelimEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        preliminaryDataShared: [{ teamId: 'team-1', shared: true }],
      });

      expect(prelimEntry.update).not.toHaveBeenCalled();
      expect(environmentMock.createEntry).not.toHaveBeenCalled();
    });

    test('creates a preliminary data sharing entry when none exists and shared is true', async () => {
      const eventEntry = getEntry(
        { preliminaryDataShared: { 'en-US': [] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const publishedEntry = getEntry({}, { id: 'prelim-new' });
      const newEntry = getEntry({}, { id: 'prelim-new' });
      newEntry.publish = jest.fn().mockResolvedValue(publishedEntry);
      environmentMock.createEntry.mockResolvedValue(newEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        preliminaryDataShared: [{ teamId: 'team-2', shared: true }],
      });

      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'preliminaryDataSharing',
        {
          fields: {
            team: {
              'en-US': {
                sys: { type: 'Link', linkType: 'Entry', id: 'team-2' },
              },
            },
            preliminaryDataShared: { 'en-US': true },
          },
        },
      );
      expect(patchAndPublish).toHaveBeenCalledWith(eventEntry, {
        preliminaryDataShared: [
          { sys: { type: 'Link', linkType: 'Entry', id: 'prelim-new' } },
        ],
      });
    });

    test('creates a not-shared preliminary data sharing entry when a team has none', async () => {
      const eventEntry = getEntry(
        { preliminaryDataShared: { 'en-US': [] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const publishedEntry = getEntry({}, { id: 'prelim-new' });
      const newEntry = getEntry({}, { id: 'prelim-new' });
      newEntry.publish = jest.fn().mockResolvedValue(publishedEntry);
      environmentMock.createEntry.mockResolvedValue(newEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        preliminaryDataShared: [{ teamId: 'team-3', shared: false }],
      });

      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'preliminaryDataSharing',
        {
          fields: {
            team: {
              'en-US': {
                sys: { type: 'Link', linkType: 'Entry', id: 'team-3' },
              },
            },
            preliminaryDataShared: { 'en-US': false },
          },
        },
      );
      expect(patchAndPublish).toHaveBeenCalledWith(eventEntry, {
        preliminaryDataShared: [
          { sys: { type: 'Link', linkType: 'Entry', id: 'prelim-new' } },
        ],
      });
    });

    test('treats a preliminary data sharing entry without a team link as absent and creates a new one', async () => {
      const eventEntry = getEntry(
        {
          preliminaryDataShared: {
            'en-US': [
              { sys: { type: 'Link', linkType: 'Entry', id: 'prelim-orphan' } },
            ],
          },
        },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);

      const orphanEntry = getEntry(
        { preliminaryDataShared: { 'en-US': true } },
        { id: 'prelim-orphan' },
      );
      when(environmentMock.getEntry)
        .calledWith('prelim-orphan')
        .mockResolvedValue(orphanEntry);

      const publishedEntry = getEntry({}, { id: 'prelim-new' });
      const newEntry = getEntry({}, { id: 'prelim-new' });
      newEntry.publish = jest.fn().mockResolvedValue(publishedEntry);
      environmentMock.createEntry.mockResolvedValue(newEntry);
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        preliminaryDataShared: [{ teamId: 'team-5', shared: true }],
      });

      expect(environmentMock.createEntry).toHaveBeenCalledWith(
        'preliminaryDataSharing',
        expect.objectContaining({
          fields: expect.objectContaining({
            team: {
              'en-US': {
                sys: { type: 'Link', linkType: 'Entry', id: 'team-5' },
              },
            },
          }),
        }),
      );
    });

    test('warns and continues when a preliminary data sharing entry cannot be fetched', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const eventEntry = getEntry(
        {
          preliminaryDataShared: {
            'en-US': [
              { sys: { type: 'Link', linkType: 'Entry', id: 'prelim-1' } },
            ],
          },
        },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);
      when(environmentMock.getEntry)
        .calledWith('prelim-1')
        .mockRejectedValue(new Error('gone'));
      mockPollingConsistency();

      await eventDataProvider.updateEventDetails('123', {
        preliminaryDataShared: [{ teamId: 'team-9', shared: true }],
      });

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('throws if creating a preliminary data sharing entry fails', async () => {
      const eventEntry = getEntry(
        { preliminaryDataShared: { 'en-US': [] } },
        { id: '123' },
      );
      when(environmentMock.getEntry)
        .calledWith('123')
        .mockResolvedValue(eventEntry);
      environmentMock.createEntry.mockRejectedValue(new Error('boom'));

      await expect(
        eventDataProvider.updateEventDetails('123', {
          preliminaryDataShared: [{ teamId: 'team-2', shared: true }],
        }),
      ).rejects.toThrow('Error creating preliminary data sharing entry');
    });
  });

  describe('Create method', () => {
    test('Should create an event', async () => {
      const eventEntryMock = getEntry({
        sys: {
          id: 'event-1',
        },
      });
      environmentMock.createEntry.mockResolvedValue(eventEntryMock);
      eventEntryMock.publish = jest.fn().mockResolvedValueOnce(eventEntryMock);

      const teamDataObject = getEventCreateDataObject();
      await eventDataProvider.create(teamDataObject);

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
          hideMeetingLink: {
            'en-US': false,
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
    test(`throws when provided event doesn't have a calendar`, () => {
      const graphqlEvent = getContentfulGraphqlEvent();
      graphqlEvent.sys.id = 'example';
      graphqlEvent.calendar = null;

      expect(() => parseGraphQLEvent(graphqlEvent)).toThrowError(
        `Event (example) doesn't have a calendar`,
      );
    });

    test('throws when provided an invalid event status', () => {
      const graphqlEvent = getContentfulGraphqlEvent();
      graphqlEvent.sys.id = 'example';
      graphqlEvent.status = 'invalid';

      expect(() =>
        parseGraphQLEvent(graphqlEvent),
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid event (example) status "invalid""`,
      );
    });

    test('handles null working group by returning an empty array', () => {
      const graphqlEvent = getContentfulGraphqlEvent();
      graphqlEvent.linkedFrom!.researchOutputsCollection!.items[0]!.workingGroup =
        null;

      expect(parseGraphQLEvent(graphqlEvent).relatedResearch[0]).toEqual(
        expect.objectContaining({ workingGroups: [] }),
      );
    });

    test('parses the recurring flag and defaults it to false when null', () => {
      const graphqlEvent = getContentfulGraphqlEvent();
      graphqlEvent.recurring = true;
      expect(parseGraphQLEvent(graphqlEvent).recurring).toBe(true);

      graphqlEvent.recurring = null;
      expect(parseGraphQLEvent(graphqlEvent).recurring).toBe(false);
    });
  });
});
