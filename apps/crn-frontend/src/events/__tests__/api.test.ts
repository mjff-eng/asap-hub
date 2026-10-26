import {
  createAlgoliaResponse,
  AlgoliaSearchClient,
  ClientSearch,
} from '@asap-hub/algolia';
import {
  createEventResponse,
  createListEventResponse,
  createTeamListItemResponse,
} from '@asap-hub/fixtures';
import { getEventListOptions } from '@asap-hub/frontend-utils';
import nock from 'nock';
import { API_BASE_URL } from '../../config';
import {
  getAttendanceSearchHits,
  getEvent,
  getEvents,
  getTeamsForMatching,
  patchEvent,
} from '../api';

jest.mock('../../config');

afterEach(() => {
  nock.cleanAll();
});

describe('getEvent', () => {
  it('makes an authorized GET request for the event id', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .get('/events/42')
      .reply(200, {});
    await getEvent('42', 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('returns a successfully fetched event', async () => {
    const event = createEventResponse();
    nock(API_BASE_URL).get('/events/42').reply(200, event);
    expect(await getEvent('42', '')).toEqual(event);
  });

  it('returns undefined for a 404', async () => {
    nock(API_BASE_URL).get('/events/42').reply(404);
    expect(await getEvent('42', '')).toBe(undefined);
  });

  it('errors for another status', async () => {
    nock(API_BASE_URL).get('/events/42').reply(500);
    await expect(getEvent('42', '')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to fetch event with id 42. Expected status 2xx or 404. Received status 500."`,
    );
  });
});

describe('patchEvent', () => {
  const attendance = [{ teamId: 'team-1', attended: true }];

  it('makes an authorized PATCH request with the attendance payload', async () => {
    nock(API_BASE_URL, { reqheaders: { authorization: 'Bearer x' } })
      .patch('/events/42', { attendance })
      .reply(200, {});
    await patchEvent('42', { attendance }, 'Bearer x');
    expect(nock.isDone()).toBe(true);
  });

  it('returns the updated event', async () => {
    const event = createEventResponse();
    nock(API_BASE_URL).patch('/events/42').reply(200, event);
    expect(await patchEvent('42', { attendance }, '')).toEqual(event);
  });

  it('errors for a non-2xx status', async () => {
    nock(API_BASE_URL).patch('/events/42').reply(500);
    await expect(patchEvent('42', { attendance }, '')).rejects.toThrow(
      'Failed to update event 42. Expected status 2xx. Received status 500.',
    );
  });
});

describe('getEvents', () => {
  type Search = ClientSearch<'crn', 'event'>;
  const search: jest.MockedFunction<Search> = jest.fn();

  const algoliaSearchClient = {
    search,
  } as unknown as AlgoliaSearchClient<'crn'>;

  beforeEach(() => {
    search.mockReset();
  });

  it('makes request for events before a date', async () => {
    const res = createAlgoliaResponse<'crn', 'event'>([]);
    search.mockResolvedValueOnce(res);

    await getEvents(
      algoliaSearchClient,
      getEventListOptions(new Date('2021-01-01T12:00:00'), { past: true }),
    );

    expect(search).toHaveBeenCalledWith(
      ['event'],
      '',
      {
        filters: 'endDateTimestamp < 1609498800',
        hitsPerPage: 10,
        page: 0,
      },
      true,
    );
  });

  it('makes request for events before a date filtering cancelled ones', async () => {
    search.mockResolvedValueOnce(createAlgoliaResponse<'crn', 'event'>([]));

    await getEvents(
      algoliaSearchClient,
      getEventListOptions(new Date('2021-01-01T12:00:00'), {
        past: true,
        constraint: { notStatus: 'Cancelled' },
      }),
    );

    expect(search).toHaveBeenCalledWith(
      ['event'],
      '',
      {
        filters: '(endDateTimestamp < 1609498800) AND (NOT status:Cancelled)',
        hitsPerPage: 10,
        page: 0,
      },
      true,
    );
  });
  it('makes for events after a date', async () => {
    search.mockResolvedValueOnce(createAlgoliaResponse<'crn', 'event'>([]));

    await getEvents(
      algoliaSearchClient,
      getEventListOptions(new Date('2021-01-01T12:00:00'), { past: false }),
    );
    expect(search).toHaveBeenCalledWith(
      ['event'],
      '',
      {
        filters: 'endDateTimestamp > 1609498800',
        hitsPerPage: 10,
        page: 0,
      },
      false,
    );
  });

  it('calls for upcoming events with a certain speaker user id', async () => {
    search.mockResolvedValueOnce(createAlgoliaResponse<'crn', 'event'>([]));

    await getEvents(algoliaSearchClient, {
      ...getEventListOptions(new Date('2021-01-01T12:00:00'), { past: false }),
      constraint: { userId: 'user-1' },
    });
    expect(search).toHaveBeenCalledWith(
      ['event'],
      '',
      {
        filters:
          '(endDateTimestamp > 1609498800) AND (speakers.user.id: "user-1")',
        hitsPerPage: 10,
        page: 0,
      },
      false,
    );
  });

  it('calls for past events with a certain speaker user id', async () => {
    search.mockResolvedValueOnce(createAlgoliaResponse<'crn', 'event'>([]));

    await getEvents(algoliaSearchClient, {
      ...getEventListOptions(new Date('2021-01-01T12:00:00Z'), { past: true }),
      constraint: { userId: 'user-1' },
    });
    expect(search).toHaveBeenCalledWith(
      ['event'],
      '',
      {
        filters:
          '(endDateTimestamp < 1609498800) AND (speakers.user.id: "user-1")',
        hitsPerPage: 10,
        page: 0,
      },
      true,
    );
  });

  it('calls for upcoming events with a certain speaker team id', async () => {
    search.mockResolvedValueOnce(createAlgoliaResponse<'crn', 'event'>([]));

    await getEvents(algoliaSearchClient, {
      ...getEventListOptions(new Date('2021-01-01T12:00:00'), { past: false }),
      constraint: { teamId: 'team-1' },
    });
    expect(search).toHaveBeenCalledWith(
      ['event'],
      '',
      {
        filters:
          '(endDateTimestamp > 1609498800) AND (speakers.team.id: "team-1")',
        hitsPerPage: 10,
        page: 0,
      },
      false,
    );
  });

  it('returns successfully fetched events', async () => {
    const events = createListEventResponse(1);

    search.mockResolvedValueOnce(
      createAlgoliaResponse<'crn', 'event'>(
        events.items.map((event) => ({
          ...event,
          objectID: event.id,
          __meta: {
            type: 'event',
          },
        })),
      ),
    );

    expect(
      await getEvents(
        algoliaSearchClient,
        getEventListOptions(new Date('2021-01-01T12:00:00'), { past: false }),
      ),
    ).toEqual({
      items: events.items.map((event) => ({
        ...event,
        objectID: event.id,
        __meta: {
          type: 'event',
        },
      })),
      total: 1,
    });
  });

  it('calls for upcoming events with a certain interest group id', async () => {
    search.mockResolvedValueOnce(createAlgoliaResponse<'crn', 'event'>([]));

    await getEvents(algoliaSearchClient, {
      ...getEventListOptions(new Date('2021-01-01T12:00:00'), { past: false }),
      constraint: { interestGroupId: 'group-5' },
    });
    expect(search).toHaveBeenCalledWith(
      ['event'],
      '',
      {
        filters:
          '(endDateTimestamp > 1609498800) AND (interestGroup.id: "group-5")',
        hitsPerPage: 10,
        page: 0,
      },
      false,
    );
  });

  it('calls for upcoming events with a certain working group id', async () => {
    search.mockResolvedValueOnce(createAlgoliaResponse<'crn', 'event'>([]));

    await getEvents(algoliaSearchClient, {
      ...getEventListOptions(new Date('2021-01-01T12:00:00'), { past: false }),
      constraint: { workingGroupId: 'wg-1' },
    });
    expect(search).toHaveBeenCalledWith(
      ['event'],
      '',
      {
        filters:
          '(endDateTimestamp > 1609498800) AND (workingGroup.id: "wg-1")',
        hitsPerPage: 10,
        page: 0,
      },
      false,
    );
  });
});

describe('getTeamsForMatching', () => {
  type Search = ClientSearch<'crn', 'team'>;
  const search: jest.MockedFunction<Search> = jest.fn();

  const algoliaSearchClient = {
    search,
  } as unknown as AlgoliaSearchClient<'crn'>;

  const hit = (index: number) =>
    ({
      ...createTeamListItemResponse(index),
      objectID: `t${index}`,
      __meta: { type: 'team' as const },
    }) as unknown as Awaited<ReturnType<Search>>['hits'][number];

  beforeEach(() => {
    search.mockReset();
  });

  it('fetches the whole team corpus in a single query', async () => {
    search.mockResolvedValueOnce(
      createAlgoliaResponse<'crn', 'team'>([hit(0), hit(1)]),
    );

    const teams = await getTeamsForMatching(algoliaSearchClient);

    expect(teams).toHaveLength(2);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(
      ['team'],
      '',
      expect.objectContaining({ hitsPerPage: 1000, page: 0 }),
    );
  });

  it('pages until the whole corpus is collected', async () => {
    search
      .mockResolvedValueOnce(
        createAlgoliaResponse<'crn', 'team'>([hit(0)], { nbHits: 2 }),
      )
      .mockResolvedValueOnce(
        createAlgoliaResponse<'crn', 'team'>([hit(1)], { nbHits: 2 }),
      );

    const teams = await getTeamsForMatching(algoliaSearchClient);

    expect(teams.map(({ id }) => id)).toEqual(['t0', 't1']);
    expect(search).toHaveBeenCalledTimes(2);
    expect(search).toHaveBeenLastCalledWith(
      ['team'],
      '',
      expect.objectContaining({ page: 1 }),
    );
  });

  it('stops when the corpus is empty', async () => {
    search.mockResolvedValueOnce(
      createAlgoliaResponse<'crn', 'team'>([], { nbHits: 5 }),
    );

    await expect(getTeamsForMatching(algoliaSearchClient)).resolves.toEqual([]);
    expect(search).toHaveBeenCalledTimes(1);
  });
});

describe('getAttendanceSearchHits', () => {
  type Search = ClientSearch<'crn', 'interest-group' | 'team'>;
  const search: jest.MockedFunction<Search> = jest.fn();

  const algoliaSearchClient = {
    search,
  } as unknown as AlgoliaSearchClient<'crn'>;

  it('searches interest group and team names only and returns the hits', async () => {
    const hit = {
      ...createTeamListItemResponse(),
      objectID: 't0',
      __meta: { type: 'team' as const },
    } as unknown as Awaited<ReturnType<Search>>['hits'][number];
    search.mockResolvedValueOnce(
      createAlgoliaResponse<'crn', 'interest-group' | 'team'>([hit]),
    );

    expect(await getAttendanceSearchHits(algoliaSearchClient, 'alp')).toEqual([
      hit,
    ]);
    expect(search).toHaveBeenCalledWith(['interest-group', 'team'], 'alp', {
      restrictSearchableAttributes: ['name', 'displayName'],
    });
  });
});
