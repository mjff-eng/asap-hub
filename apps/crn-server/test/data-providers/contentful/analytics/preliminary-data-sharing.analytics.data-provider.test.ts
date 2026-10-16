import {
  FETCH_INTEREST_GROUP_CALENDAR_IDS,
  FETCH_PRELIMINARY_DATA_SHARING,
} from '@asap-hub/contentful';
import { DateTime } from 'luxon';
import { AnalyticsContentfulDataProvider } from '../../../../src/data-providers/contentful/analytics.data-provider';
import {
  getInterestGroupCalendarIdsQuery,
  getPreliminaryDataSharingQuery,
} from '../../../fixtures/analytics.fixtures';
import { getContentfulGraphqlClientMock } from '../../../mocks/contentful-graphql-client.mock';

const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
const analyticsDataProvider = new AnalyticsContentfulDataProvider(
  contentfulGraphqlClientMock,
);

type RequestImplementation = Parameters<
  typeof contentfulGraphqlClientMock.request.mockImplementation
>[0];

const interestGroupCalendar = { sys: { id: 'interest-group-calendar-id' } };
const workingGroupCalendar = { sys: { id: 'working-group-calendar-id' } };

const mockRequests = (
  teamsResponse: unknown,
  ...byTeamResponses: unknown[]
) => {
  let byTeamIndex = 0;
  const implementation = async (query: unknown) => {
    if (query === FETCH_INTEREST_GROUP_CALENDAR_IDS) {
      return getInterestGroupCalendarIdsQuery();
    }
    if (query === FETCH_PRELIMINARY_DATA_SHARING) {
      return teamsResponse;
    }
    const response = byTeamResponses[byTeamIndex];
    byTeamIndex += 1;
    return response;
  };
  contentfulGraphqlClientMock.request.mockImplementation(
    implementation as unknown as RequestImplementation,
  );
};

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(async () => {
  const eventStartDate = DateTime.fromISO(
    '2024-12-31T00:00:00.000Z',
  ).toJSDate();
  jest.setSystemTime(eventStartDate);
});

afterEach(() => {
  jest.resetAllMocks();
});

test('Should return an empty result when the client returns an empty list', async () => {
  mockRequests({
    teamsCollection: {
      items: [],
      total: 0,
    },
  });

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(result).toEqual({
    total: 0,
    items: [],
  });
});

test('Should return zero percent shared and limited data when the preliminary data sharing collection is empty', async () => {
  const graphqlResponse = getPreliminaryDataSharingQuery();
  graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.eventSpeakersCollection!.total = 0;
  graphqlResponse.teamsCollection!.items[0]!.linkedFrom!.eventSpeakersCollection!.items =
    [];
  mockRequests(graphqlResponse);

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(result).toEqual({
    total: 1,
    items: [
      {
        teamId: 'team-id-0',
        teamName: 'Team A',
        isTeamInactive: false,
        percentShared: 0,
        limitedData: true,
        timeRange: 'all',
      },
    ],
  });
});

test('Should return the correct percent shared when the client returns a valid response', async () => {
  const graphqlResponse = getPreliminaryDataSharingQuery();
  mockRequests(graphqlResponse);

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(result).toEqual({
    total: 1,
    items: [
      {
        teamId: 'team-id-0',
        teamName: 'Team A',
        isTeamInactive: false,
        percentShared: 67,
        limitedData: false,
        timeRange: 'all',
      },
    ],
  });
});

test('Should filter by time range when last-year filter is applied', async () => {
  const graphqlResponse = {
    teamsCollection: {
      total: 1,
      items: [
        {
          sys: {
            id: 'team-id-0',
          },
          displayName: 'Team A',
          inactiveSince: null,
          linkedFrom: {
            eventSpeakersCollection: {
              total: 4,
              items: [
                {
                  preliminaryDataShared: true,
                  linkedFrom: {
                    eventsCollection: {
                      items: [
                        {
                          sys: {
                            id: 'event-1',
                          },
                          startDate: '2024-05-07T00:00:00.000Z',
                          endDate: '2024-05-07T00:00:00.000Z',
                          status: 'Confirmed',
                          calendar: interestGroupCalendar,
                        },
                      ],
                    },
                  },
                },
                {
                  preliminaryDataShared: true,
                  linkedFrom: {
                    eventsCollection: {
                      items: [
                        {
                          sys: {
                            id: 'event-2',
                          },
                          startDate: '2024-02-20T00:00:00.000Z',
                          endDate: '2024-02-20T00:00:00.000Z',
                          status: 'Confirmed',
                          calendar: interestGroupCalendar,
                        },
                      ],
                    },
                  },
                },
                {
                  preliminaryDataShared: false,
                  linkedFrom: {
                    eventsCollection: {
                      items: [
                        {
                          sys: {
                            id: 'event-3',
                          },
                          startDate: '2024-10-03T00:00:00.000Z',
                          endDate: '2024-10-03T00:00:00.000Z',
                          status: 'Confirmed',
                          calendar: interestGroupCalendar,
                        },
                      ],
                    },
                  },
                },
                {
                  preliminaryDataShared: true,
                  linkedFrom: {
                    eventsCollection: {
                      items: [
                        {
                          sys: {
                            id: 'event-4',
                          },
                          startDate: '2022-12-30T00:00:00.000Z',
                          endDate: '2022-12-30T00:00:00.000Z',
                          status: 'Confirmed',
                          calendar: interestGroupCalendar,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  };
  mockRequests(graphqlResponse);

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({
    filter: { timeRange: 'last-year' },
  });

  expect(result).toEqual({
    total: 1,
    items: [
      {
        teamId: 'team-id-0',
        teamName: 'Team A',
        isTeamInactive: false,
        percentShared: 67,
        limitedData: false,
        timeRange: 'last-year',
      },
    ],
  });
});

const speaker = (
  preliminaryDataShared: boolean | null,
  event: {
    sys: { id: string };
    startDate?: string | null;
    endDate: string | null;
    status?: string | null;
    calendar?: { sys: { id: string } } | null;
  } | null,
) => ({
  preliminaryDataShared,
  linkedFrom: {
    eventsCollection: {
      items: event ? [{ calendar: interestGroupCalendar, ...event }] : [],
    },
  },
});

const teamWithSpeakers = (speakers: unknown[]) => ({
  teamsCollection: {
    total: 1,
    items: [
      {
        sys: { id: 'team-id-0' },
        displayName: 'Team A',
        inactiveSince: null,
        linkedFrom: {
          eventSpeakersCollection: {
            total: speakers.length,
            items: speakers,
          },
        },
      },
    ],
  },
});

test('Should ignore speakers that are not linked to any event', async () => {
  mockRequests(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
        endDate: '2024-05-07T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2024-10-03T00:00:00.000Z',
        endDate: '2024-10-03T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(true, null),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({
    filter: { timeRange: 'last-year' },
  });

  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 50, limitedData: false }),
  );
});

test('Should return zero percent shared and limited data when every speaker is skipped', async () => {
  mockRequests(
    teamWithSpeakers([
      speaker(null, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
        endDate: '2024-05-07T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(true, null),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 0, limitedData: true }),
  );
});

test('Should exclude events without a start date from the last-year range', async () => {
  mockRequests(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
        endDate: '2024-05-07T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2024-10-03T00:00:00.000Z',
        endDate: '2024-10-03T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(true, {
        sys: { id: 'event-3' },
        startDate: null,
        endDate: '2024-06-01T00:00:00.000Z',
        status: 'Confirmed',
      }),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({
    filter: { timeRange: 'last-year' },
  });

  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 50, limitedData: false }),
  );
});

test('Should keep events without a start date when no time range is applied', async () => {
  mockRequests(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
        endDate: '2024-05-07T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2024-10-03T00:00:00.000Z',
        endDate: '2024-10-03T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(true, {
        sys: { id: 'event-3' },
        startDate: null,
        endDate: '2024-06-01T00:00:00.000Z',
        status: 'Confirmed',
      }),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({
    filter: { timeRange: 'all' },
  });

  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 67, limitedData: false }),
  );
});

test('Should exclude events without an end date', async () => {
  mockRequests(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
        endDate: '2024-05-07T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2024-10-03T00:00:00.000Z',
        endDate: '2024-10-03T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(true, { sys: { id: 'event-3' }, endDate: null }),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({
    filter: { timeRange: 'all' },
  });

  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 50, limitedData: false }),
  );
});

test('Should exclude upcoming events', async () => {
  mockRequests(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
        endDate: '2024-05-07T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2025-01-15T00:00:00.000Z',
        endDate: '2025-01-15T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(false, {
        sys: { id: 'event-3' },
        startDate: '2024-12-30T23:30:00.000Z',
        endDate: '2024-12-30T23:30:00.000Z',
        status: 'Confirmed',
      }),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 100, limitedData: false }),
  );
});

test('Should exclude cancelled events', async () => {
  mockRequests(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
        endDate: '2024-05-07T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2024-10-03T00:00:00.000Z',
        endDate: '2024-10-03T00:00:00.000Z',
        status: 'Cancelled',
      }),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 100, limitedData: false }),
  );
});

test('Should return zero percent shared and limited data when a team only has upcoming or cancelled events', async () => {
  mockRequests(
    teamWithSpeakers([
      speaker(false, {
        sys: { id: 'event-1' },
        startDate: '2025-03-01T00:00:00.000Z',
        endDate: '2025-03-01T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2024-10-03T00:00:00.000Z',
        endDate: '2024-10-03T00:00:00.000Z',
        status: 'Cancelled',
      }),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 0, limitedData: true }),
  );
});

test('Should group speakers by event and count an event as shared when any of its speakers shared', async () => {
  const graphqlResponse = {
    teamsCollection: {
      total: 1,
      items: [
        {
          sys: {
            id: 'team-id-0',
          },
          displayName: 'Team A',
          inactiveSince: null,
          linkedFrom: {
            eventSpeakersCollection: {
              total: 3,
              items: [
                {
                  preliminaryDataShared: false,
                  linkedFrom: {
                    eventsCollection: {
                      items: [
                        {
                          sys: {
                            id: 'event-1',
                          },
                          startDate: '2024-01-15T00:00:00.000Z',
                          endDate: '2024-01-15T00:00:00.000Z',
                          status: 'Confirmed',
                          calendar: interestGroupCalendar,
                        },
                      ],
                    },
                  },
                },
                {
                  preliminaryDataShared: true,
                  linkedFrom: {
                    eventsCollection: {
                      items: [
                        {
                          sys: {
                            id: 'event-1',
                          },
                          startDate: '2024-01-15T00:00:00.000Z',
                          endDate: '2024-01-15T00:00:00.000Z',
                          status: 'Confirmed',
                          calendar: interestGroupCalendar,
                        },
                      ],
                    },
                  },
                },
                {
                  preliminaryDataShared: false,
                  linkedFrom: {
                    eventsCollection: {
                      items: [
                        {
                          sys: {
                            id: 'event-2',
                          },
                          startDate: '2024-02-20T00:00:00.000Z',
                          endDate: '2024-02-20T00:00:00.000Z',
                          status: 'Confirmed',
                          calendar: interestGroupCalendar,
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  };
  mockRequests(graphqlResponse);

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(result).toEqual({
    total: 1,
    items: [
      {
        teamId: 'team-id-0',
        teamName: 'Team A',
        isTeamInactive: false,
        percentShared: 50,
        limitedData: false,
        timeRange: 'all',
      },
    ],
  });
});

test('Should drain remaining event speakers when a team overflows the nested page limit', async () => {
  const graphqlResponse = getPreliminaryDataSharingQuery();
  const speakers =
    graphqlResponse.teamsCollection!.items[0]!.linkedFrom!
      .eventSpeakersCollection!;
  speakers.total = 3;
  speakers.items = [
    {
      preliminaryDataShared: true,
      linkedFrom: {
        eventsCollection: {
          items: [
            {
              sys: { id: 'event-1' },
              startDate: '2024-01-15',
              endDate: '2024-01-15',
              status: 'Confirmed',
              calendar: interestGroupCalendar,
            },
          ],
        },
      },
    },
  ];

  const byTeamResponse = {
    eventSpeakersCollection: {
      total: 3,
      items: [
        {
          preliminaryDataShared: true,
          linkedFrom: {
            eventsCollection: {
              items: [
                {
                  sys: { id: 'event-1' },
                  startDate: '2024-01-15',
                  endDate: '2024-01-15',
                  status: 'Confirmed',
                  calendar: interestGroupCalendar,
                },
              ],
            },
          },
        },
        {
          preliminaryDataShared: true,
          linkedFrom: {
            eventsCollection: {
              items: [
                {
                  sys: { id: 'event-2' },
                  startDate: '2024-02-20',
                  endDate: '2024-02-20',
                  status: 'Confirmed',
                  calendar: interestGroupCalendar,
                },
              ],
            },
          },
        },
        {
          preliminaryDataShared: false,
          linkedFrom: {
            eventsCollection: {
              items: [
                {
                  sys: { id: 'event-3' },
                  startDate: '2023-06-10',
                  endDate: '2023-06-10',
                  status: 'Confirmed',
                  calendar: interestGroupCalendar,
                },
              ],
            },
          },
        },
      ],
    },
  };

  mockRequests(graphqlResponse, byTeamResponse);

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(3);
  expect(contentfulGraphqlClientMock.request).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ teamId: 'team-id-0', skip: 0 }),
  );

  expect(result).toEqual({
    total: 1,
    items: [
      {
        teamId: 'team-id-0',
        teamName: 'Team A',
        isTeamInactive: false,
        percentShared: 67,
        limitedData: false,
        timeRange: 'all',
      },
    ],
  });
});

test('Should not request more speakers for null teams or teams without linked speakers', async () => {
  mockRequests({
    teamsCollection: {
      total: 2,
      items: [
        null,
        {
          sys: { id: 'team-id-1' },
          displayName: 'Team B',
          inactiveSince: null,
          linkedFrom: null,
        },
      ],
    },
  });

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(2);
  expect(result).toEqual({
    total: 2,
    items: [
      {
        teamId: 'team-id-1',
        teamName: 'Team B',
        isTeamInactive: false,
        percentShared: 0,
        limitedData: true,
        timeRange: 'all',
      },
    ],
  });
});

test('Should bound the number of concurrent speaker requests when several teams overflow', async () => {
  const teamIds = ['team-0', 'team-1', 'team-2', 'team-3'];
  const speakersPerTeam = 1500;
  const pageSize = 1000;

  const speakerAt = (teamId: string, index: number) =>
    speaker(index % 2 === 0, {
      sys: { id: `${teamId}-event-${index}` },
      startDate: '2024-05-07T00:00:00.000Z',
      endDate: '2024-05-07T00:00:00.000Z',
      status: 'Confirmed',
    });

  const mainResponse = {
    teamsCollection: {
      total: teamIds.length,
      items: teamIds.map((teamId) => ({
        sys: { id: teamId },
        displayName: teamId,
        inactiveSince: null,
        linkedFrom: {
          eventSpeakersCollection: {
            total: speakersPerTeam,
            items: [speakerAt(teamId, 0)],
          },
        },
      })),
    },
  };

  let inFlight = 0;
  let maxInFlight = 0;
  const skipsByTeam: Record<string, number[]> = {};

  const requestImplementation = async (
    _query: unknown,
    variables: Record<string, unknown>,
  ) => {
    if (_query === FETCH_INTEREST_GROUP_CALENDAR_IDS) {
      return getInterestGroupCalendarIdsQuery();
    }
    const teamId = variables?.teamId as string | undefined;
    if (!teamId) {
      return mainResponse;
    }

    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await Promise.resolve();
    await Promise.resolve();
    inFlight -= 1;

    const skip = variables.skip as number;
    skipsByTeam[teamId] = [...(skipsByTeam[teamId] ?? []), skip];

    const count = Math.min(pageSize, speakersPerTeam - skip);
    return {
      eventSpeakersCollection: {
        total: speakersPerTeam,
        items: Array.from({ length: count }, (_, index) =>
          speakerAt(teamId, skip + index),
        ),
      },
    };
  };

  contentfulGraphqlClientMock.request.mockImplementation(
    requestImplementation as unknown as RequestImplementation,
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(10);
  expect(maxInFlight).toBeLessThanOrEqual(5);
  teamIds.forEach((teamId) => {
    expect(skipsByTeam[teamId]).toEqual([0, 1000]);
  });

  expect(result.total).toBe(4);
  expect(result.items).toHaveLength(4);
  result.items.forEach((item) => {
    expect(item).toEqual(
      expect.objectContaining({ percentShared: 50, limitedData: false }),
    );
  });
});

test('Should handle inactive teams correctly', async () => {
  const graphqlResponse = getPreliminaryDataSharingQuery();
  graphqlResponse.teamsCollection!.items[0]!.inactiveSince = '2023-01-01';
  mockRequests(graphqlResponse);

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(result).toEqual({
    total: 1,
    items: [
      {
        teamId: 'team-id-0',
        teamName: 'Team A',
        isTeamInactive: true,
        percentShared: 67,
        limitedData: false,
        timeRange: 'all',
      },
    ],
  });
});

test('Should only count events that belong to an interest group calendar', async () => {
  mockRequests(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
        endDate: '2024-05-07T00:00:00.000Z',
        status: 'Confirmed',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2024-10-03T00:00:00.000Z',
        endDate: '2024-10-03T00:00:00.000Z',
        status: 'Confirmed',
        calendar: workingGroupCalendar,
      }),
      speaker(false, {
        sys: { id: 'event-3' },
        startDate: '2024-11-03T00:00:00.000Z',
        endDate: '2024-11-03T00:00:00.000Z',
        status: 'Confirmed',
        calendar: null,
      }),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
    FETCH_INTEREST_GROUP_CALENDAR_IDS,
    { limit: 500, skip: 0 },
  );
  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 100, limitedData: false }),
  );
});

test('Should return zero percent shared and limited data when a team only spoke at events outside interest groups', async () => {
  mockRequests(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
        endDate: '2024-05-07T00:00:00.000Z',
        status: 'Confirmed',
        calendar: workingGroupCalendar,
      }),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 0, limitedData: true }),
  );
});

test('Should page through interest groups when they exceed the calendar page size', async () => {
  const calendarId = (index: number) => `interest-group-calendar-${index}`;
  const interestGroupsPage = (skip: number, count: number) => ({
    interestGroupsCollection: {
      total: 501,
      items: Array.from({ length: count }, (_, index) => ({
        calendar: { sys: { id: calendarId(skip + index) } },
      })),
    },
  });

  contentfulGraphqlClientMock.request.mockImplementation((async (
    _query: unknown,
    variables: Record<string, unknown>,
  ) => {
    if (_query === FETCH_INTEREST_GROUP_CALENDAR_IDS) {
      const skip = variables.skip as number;
      return interestGroupsPage(skip, skip === 0 ? 500 : 1);
    }
    return teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
        endDate: '2024-05-07T00:00:00.000Z',
        status: 'Confirmed',
        calendar: { sys: { id: calendarId(500) } },
      }),
    ]);
  }) as unknown as RequestImplementation);

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
    FETCH_INTEREST_GROUP_CALENDAR_IDS,
    { limit: 500, skip: 0 },
  );
  expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
    FETCH_INTEREST_GROUP_CALENDAR_IDS,
    { limit: 500, skip: 500 },
  );
  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 100, limitedData: false }),
  );
});
