import { DateTime } from 'luxon';
import { AnalyticsContentfulDataProvider } from '../../../../src/data-providers/contentful/analytics.data-provider';
import { getPreliminaryDataSharingQuery } from '../../../fixtures/analytics.fixtures';
import { getContentfulGraphqlClientMock } from '../../../mocks/contentful-graphql-client.mock';

const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
const analyticsDataProvider = new AnalyticsContentfulDataProvider(
  contentfulGraphqlClientMock,
);

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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce({
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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

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
  event: { sys: { id: string }; startDate: string | null } | null,
) => ({
  preliminaryDataShared,
  linkedFrom: {
    eventsCollection: {
      items: event ? [event] : [],
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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2024-10-03T00:00:00.000Z',
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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce(
    teamWithSpeakers([
      speaker(null, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2024-10-03T00:00:00.000Z',
      }),
      speaker(true, { sys: { id: 'event-3' }, startDate: null }),
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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce(
    teamWithSpeakers([
      speaker(true, {
        sys: { id: 'event-1' },
        startDate: '2024-05-07T00:00:00.000Z',
      }),
      speaker(false, {
        sys: { id: 'event-2' },
        startDate: '2024-10-03T00:00:00.000Z',
      }),
      speaker(true, { sys: { id: 'event-3' }, startDate: null }),
    ]),
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({
    filter: { timeRange: 'all' },
  });

  expect(result.items[0]).toEqual(
    expect.objectContaining({ percentShared: 67, limitedData: false }),
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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

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
          items: [{ sys: { id: 'event-1' }, startDate: '2024-01-15' }],
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
              items: [{ sys: { id: 'event-1' }, startDate: '2024-01-15' }],
            },
          },
        },
        {
          preliminaryDataShared: true,
          linkedFrom: {
            eventsCollection: {
              items: [{ sys: { id: 'event-2' }, startDate: '2024-02-20' }],
            },
          },
        },
        {
          preliminaryDataShared: false,
          linkedFrom: {
            eventsCollection: {
              items: [{ sys: { id: 'event-3' }, startDate: '2023-06-10' }],
            },
          },
        },
      ],
    },
  };

  contentfulGraphqlClientMock.request
    .mockResolvedValueOnce(graphqlResponse)
    .mockResolvedValueOnce(byTeamResponse);

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(2);
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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce({
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

  expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(1);
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
    requestImplementation as unknown as Parameters<
      typeof contentfulGraphqlClientMock.request.mockImplementation
    >[0],
  );

  const result = await analyticsDataProvider.fetchPreliminaryDataSharing({});

  expect(contentfulGraphqlClientMock.request).toHaveBeenCalledTimes(9);
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
  contentfulGraphqlClientMock.request.mockResolvedValueOnce(graphqlResponse);

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
