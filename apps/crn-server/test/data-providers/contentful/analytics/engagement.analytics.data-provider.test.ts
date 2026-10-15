import {
  FETCH_ENGAGEMENT,
  FETCH_INTEREST_GROUP_CALENDAR_IDS,
} from '@asap-hub/contentful';
import { AnalyticsContentfulDataProvider } from '../../../../src/data-providers/contentful/analytics.data-provider';
import {
  getEngagementQuery,
  getEngagementResponse,
  getInterestGroupCalendarIdsQuery,
} from '../../../fixtures/analytics.fixtures';
import { getContentfulGraphqlClientMock } from '../../../mocks/contentful-graphql-client.mock';

const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
const analyticsDataProvider = new AnalyticsContentfulDataProvider(
  contentfulGraphqlClientMock,
);

type RequestImplementation = Parameters<
  typeof contentfulGraphqlClientMock.request.mockImplementation
>[0];

const mockRequests = (...engagementResponses: unknown[]) => {
  let engagementIndex = 0;
  const implementation = async (query: unknown) => {
    if (query === FETCH_INTEREST_GROUP_CALENDAR_IDS) {
      return getInterestGroupCalendarIdsQuery();
    }
    const response =
      engagementResponses[
        Math.min(engagementIndex, engagementResponses.length - 1)
      ];
    engagementIndex += 1;
    return response;
  };
  contentfulGraphqlClientMock.request.mockImplementation(
    implementation as unknown as RequestImplementation,
  );
};

const engagementCalls = () =>
  contentfulGraphqlClientMock.request.mock.calls.filter(
    (call) => (call[0] as unknown) === FETCH_ENGAGEMENT,
  );

describe('fetchEngagement', () => {
  beforeAll(() => {
    jest.useFakeTimers();

    jest.setSystemTime(new Date('2024-06-13T03:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(jest.resetAllMocks);

  describe('Pagination', () => {
    test('Should apply pagination parameters', async () => {
      mockRequests(getEngagementQuery());

      await analyticsDataProvider.fetchEngagement({
        take: 13,
        skip: 3,
      });

      expect(engagementCalls()).toEqual([
        [
          FETCH_ENGAGEMENT,
          expect.objectContaining({
            limit: 5,
            skip: 3,
          }),
        ],
        [
          FETCH_ENGAGEMENT,
          expect.objectContaining({
            limit: 5,
            skip: 8,
          }),
        ],
        [
          FETCH_ENGAGEMENT,
          expect.objectContaining({
            limit: 5,
            skip: 13,
          }),
        ],
      ]);
    });

    test('Should pass default pagination parameters', async () => {
      mockRequests(getEngagementQuery());

      await analyticsDataProvider.fetchEngagement({});

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        FETCH_INTEREST_GROUP_CALENDAR_IDS,
        { limit: 500, skip: 0 },
      );
      expect(engagementCalls()).toEqual([
        [
          FETCH_ENGAGEMENT,
          expect.objectContaining({
            limit: 5,
            skip: 0,
          }),
        ],
        [
          FETCH_ENGAGEMENT,
          expect.objectContaining({
            limit: 5,
            skip: 5,
          }),
        ],
      ]);
    });
  });

  test('Should return an empty result when the client returns an empty list', async () => {
    mockRequests({
      teamsCollection: {
        items: [],
        total: 0,
      },
    });

    const result = await analyticsDataProvider.fetchEngagement({});

    expect(result).toEqual({
      total: 0,
      items: [],
    });
  });

  test('Should return an empty result when the client returns teamsCollection as null', async () => {
    mockRequests({
      teamsCollection: null,
    });

    const result = await analyticsDataProvider.fetchEngagement({});

    expect(result).toEqual({
      total: 0,
      items: [],
    });
  });

  test('Should return the count of events as zero when the client returns eventSpeakersCollection as null', async () => {
    const graphqlResponse = getEngagementQuery();
    graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.eventSpeakersCollection =
      null;
    mockRequests(graphqlResponse, {});

    const result = await analyticsDataProvider.fetchEngagement({});

    expect(result).toEqual({
      total: 1,
      items: [
        {
          id: 'team-id-0',
          name: 'Team A',
          inactiveSince: null,
          memberCount: 4,
          eventCount: 0,
          totalSpeakerCount: 0,
          uniqueAllRolesCount: 0,
          uniqueAllRolesCountPercentage: 0,
          uniqueKeyPersonnelCount: 0,
          uniqueKeyPersonnelCountPercentage: 0,
        },
      ],
    });
  });

  test('Should return the number of events published in the last month', async () => {
    mockRequests(getEngagementQuery(), {});

    const result = await analyticsDataProvider.fetchEngagement({});

    expect(result).toEqual({
      total: 1,
      items: [getEngagementResponse()],
    });
  });

  test('Should not count events outside interest group calendars', async () => {
    const graphqlResponse = getEngagementQuery();
    graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.eventSpeakersCollection!.items.forEach(
      (speaker) => {
        speaker!.linkedFrom!.eventsCollection!.items[0]!.calendar = {
          sys: { id: 'working-group-calendar-id' },
        };
      },
    );
    mockRequests(graphqlResponse, {});

    const result = await analyticsDataProvider.fetchEngagement({});

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        eventCount: 0,
        totalSpeakerCount: 0,
        uniqueAllRolesCount: 0,
        uniqueKeyPersonnelCount: 0,
      }),
    );
  });
});
