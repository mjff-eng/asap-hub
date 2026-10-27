import { GraphQLError } from 'graphql';
import {
  getContentfulGraphqlClientMockServer,
  Environment,
} from '@asap-hub/contentful';

import {
  getContentfulGraphqlCalendar,
  getContentfulCalendarsGraphqlResponse,
  getCalendarCreateDataObject,
  getCalendarDataObject,
} from '../../fixtures/calendars.fixtures';
import { getContentfulGraphqlClientMock } from '../../mocks/contentful-graphql-client.mock';
import { getContentfulEnvironmentMock } from '../../mocks/contentful-rest-client.mock';
import { CalendarContentfulDataProvider } from '../../../src/data-providers/contentful/calendar.data-provider';
import { getEntry } from '../../fixtures/contentful.fixtures';
import { getContentfulGraphqlWorkingGroup } from '../../fixtures/working-groups.fixtures';
import { getContentfulGraphqlInterestGroup } from '../../fixtures/interest-groups.fixtures';

describe('Calendars data provider', () => {
  const contentfulGraphqlClientMock = getContentfulGraphqlClientMock();
  const environmentMock = getContentfulEnvironmentMock();
  const contentfulRestClientMock: () => Promise<Environment> = () =>
    Promise.resolve(environmentMock);

  const calendarDataProvider = new CalendarContentfulDataProvider(
    contentfulGraphqlClientMock,
    contentfulRestClientMock,
  );

  const contentfulGraphqlCalendar = getContentfulGraphqlCalendar();
  const contentfulGraphqlClientMockServer =
    getContentfulGraphqlClientMockServer({
      Calendars: () => ({
        ...contentfulGraphqlCalendar,
        linkedFrom: () => contentfulGraphqlCalendar.linkedFrom,
      }),
      WorkingGroups: () => getContentfulGraphqlWorkingGroup({}),
      InterestGroups: () => getContentfulGraphqlInterestGroup(),
    });

  const calendarDataProviderMock = new CalendarContentfulDataProvider(
    contentfulGraphqlClientMockServer,
    contentfulRestClientMock,
  );

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch method', () => {
    test('Should fetch the list of calendars from Contentful GraphQl', async () => {
      const result = await calendarDataProviderMock.fetch({});

      expect(result.items[0]).toMatchObject(getCalendarDataObject());
    });

    test('Should return an empty result when no calendars exist', async () => {
      const contentfulGraphQLResponse = getContentfulCalendarsGraphqlResponse();
      contentfulGraphQLResponse.calendarsCollection!.total = 0;
      contentfulGraphQLResponse.calendarsCollection!.items = [];

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await calendarDataProvider.fetch({});

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    test('Should throw an error with a specific error message when the graphql client throws one', async () => {
      contentfulGraphqlClientMock.request.mockRejectedValueOnce(
        new GraphQLError('some error message'),
      );

      await expect(calendarDataProvider.fetch({})).rejects.toThrow(
        'some error message',
      );
    });

    test('Should return an empty result when the query is returned as null', async () => {
      const contentfulGraphQLResponse = getContentfulCalendarsGraphqlResponse();
      contentfulGraphQLResponse.calendarsCollection = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await calendarDataProvider.fetch({});

      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    test('Should use default query params when request does not have any', async () => {
      const contentfulGraphQLResponse = getContentfulCalendarsGraphqlResponse();

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await calendarDataProvider.fetch({});

      expect(result).toEqual({
        total: 1,
        items: [getCalendarDataObject()],
      });

      expect(contentfulGraphqlClientMock.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          limit: 50,
          order: ['name_ASC'],
          skip: 0,
          where: {},
        }),
      );
    });

    test('Should filter calendars by the resourceId', async () => {
      const filterResourceId = 'resource-1';
      const calendarWithMatchingResourceId = getCalendarResponse(
        'calendar-1',
        filterResourceId,
      );

      const calendarWithNonMatchingResourceId = getCalendarResponse(
        'calendar-2',
        'non-matching',
      );

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        calendarsCollection: {
          total: 2,
          items: [
            calendarWithMatchingResourceId,
            calendarWithNonMatchingResourceId,
          ],
        },
      });

      const result = await calendarDataProvider.fetch({
        resourceId: filterResourceId,
      });

      expect(contentfulGraphqlClientMock.request).toBeCalledWith(
        expect.anything(),
        {
          limit: 50,
          order: ['name_ASC'],
          skip: 0,
          where: {
            googleApiMetadata_exists: true,
          },
        },
      );
      expect(result).toEqual({
        total: 1,
        items: [
          {
            ...getCalendarDataObject(),
            id: calendarWithMatchingResourceId.sys.id,
            resourceId: filterResourceId,
          },
        ],
      });
    });

    test('Should filter calendars by maxExpiration', async () => {
      const baseExpirationDate = 100;

      const calendarOverExpirationDate = getCalendarResponse(
        'calendar-1',
        'resource-id',
        baseExpirationDate + 1,
      );

      const calendarWithinExpirationLimit = getCalendarResponse(
        'calendar-2',
        'resource-id',
        baseExpirationDate - 1,
      );

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        calendarsCollection: {
          total: 2,
          items: [calendarOverExpirationDate, calendarWithinExpirationLimit],
        },
      });

      const result = await calendarDataProvider.fetch({
        maxExpiration: baseExpirationDate,
      });

      expect(contentfulGraphqlClientMock.request).toBeCalledWith(
        expect.anything(),
        {
          limit: 50,
          order: ['name_ASC'],
          skip: 0,
          where: {
            googleApiMetadata_exists: true,
          },
        },
      );
      expect(result).toEqual({
        total: 1,
        items: [
          {
            ...getCalendarDataObject(),
            id: calendarWithinExpirationLimit.sys.id,
            expirationDate:
              calendarWithinExpirationLimit.googleApiMetadata.expirationDate,
          },
        ],
      });
    });

    test('Should filter calendars by resourceId and maxExpiration', async () => {
      const filterResourceId = 'resource-filter';
      const baseCalendar = getContentfulGraphqlCalendar();
      const baseExpirationDate = baseCalendar.googleApiMetadata.expirationDate;

      const calendarWithMatchingResourceIdButOverExpirationDate =
        getCalendarResponse(
          'calendar-1',
          filterResourceId,
          baseExpirationDate + 1,
        );

      const calendarWithinExpirationLimitButNonMatchingResourceId =
        getCalendarResponse(
          'calendar-2',
          'non-matching',
          baseExpirationDate - 1,
        );

      const calendarMatchingResourceIdWithinExpirationLimit =
        getCalendarResponse(
          'calendar-3',
          filterResourceId,
          baseExpirationDate - 1,
        );

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        calendarsCollection: {
          total: 3,
          items: [
            calendarWithMatchingResourceIdButOverExpirationDate,
            calendarWithinExpirationLimitButNonMatchingResourceId,
            calendarMatchingResourceIdWithinExpirationLimit,
          ],
        },
      });

      const result = await calendarDataProvider.fetch({
        resourceId: filterResourceId,
        maxExpiration: baseExpirationDate,
      });

      expect(contentfulGraphqlClientMock.request).toBeCalledWith(
        expect.anything(),
        {
          limit: 50,
          order: ['name_ASC'],
          skip: 0,
          where: {
            googleApiMetadata_exists: true,
          },
        },
      );
      expect(result).toEqual({
        total: 1,
        items: [
          {
            ...getCalendarDataObject(),
            id: calendarMatchingResourceIdWithinExpirationLimit.sys.id,
            expirationDate:
              calendarMatchingResourceIdWithinExpirationLimit.googleApiMetadata
                .expirationDate,
            resourceId:
              calendarMatchingResourceIdWithinExpirationLimit.googleApiMetadata
                .resourceId,
          },
        ],
      });
    });

    test('Should filter calendars by active', async () => {
      const baseExpirationDate = 100;

      const calendarWithActiveWorkingGroup = getCalendarResponse(
        'calendar-with-active-wg',
        'resource-id',
        baseExpirationDate,
        [
          getWorkingGroupData({
            workingGroupId: 'active-wg',
            complete: false,
          }),
        ],
        null,
      );

      const calendarWithActiveInterestGroup = getCalendarResponse(
        'calendar-with-active-ig',
        'resource-id',
        baseExpirationDate,
        null,
        [
          getInterestGroupData({
            interestGroupId: 'active-ig',
            active: true,
          }),
        ],
      );

      const calendarWithInactiveWorkingGroup = getCalendarResponse(
        'calendar-with-inactive-wg',
        'resource-id',
        baseExpirationDate,
        [
          getWorkingGroupData({
            workingGroupId: 'inactive-wg',
            complete: true,
          }),
        ],
        null,
      );

      const calendarWithInactiveInterestGroup = getCalendarResponse(
        'calendar-with-inactive-ig',
        'resource-id',
        baseExpirationDate,
        null,
        [
          getInterestGroupData({
            interestGroupId: 'inactive-ig',
            active: false,
          }),
        ],
      );

      const calendarWithEmptyLinkedWorkingGroup = getCalendarResponse(
        'calendar-with-empty-linked-wg',
        'resource-id',
        baseExpirationDate,
        [],
        null,
      );

      const calendarWithEmptyLinkedInterestGroup = getCalendarResponse(
        'calendar-with-empty-linked-ig',
        'resource-id',
        baseExpirationDate,
        null,
        [],
      );

      const calendarWithoutLinkedWorkingGroupAndInterestGroup =
        getCalendarResponse(
          'calendar-without-linked-working-group-and-interest-group',
          'resource-id',
          baseExpirationDate,
          null,
          null,
        );

      contentfulGraphqlClientMock.request.mockResolvedValueOnce({
        calendarsCollection: {
          total: 7,
          items: [
            calendarWithActiveWorkingGroup,
            calendarWithActiveInterestGroup,
            calendarWithInactiveWorkingGroup,
            calendarWithInactiveInterestGroup,
            calendarWithEmptyLinkedWorkingGroup,
            calendarWithEmptyLinkedInterestGroup,
            calendarWithoutLinkedWorkingGroupAndInterestGroup,
          ],
        },
      });

      const result = await calendarDataProvider.fetch({
        active: true,
      });

      expect(contentfulGraphqlClientMock.request).toBeCalledWith(
        expect.anything(),
        {
          limit: 50,
          order: ['name_ASC'],
          skip: 0,
          where: {},
        },
      );

      expect(result).toEqual({
        items: [
          {
            ...getCalendarDataObject(),
            id: 'calendar-with-active-wg',
            expirationDate: baseExpirationDate,
            workingGroups: [{ complete: false, id: 'active-wg' }],
            interestGroups: [],
          },
          {
            ...getCalendarDataObject(),
            id: 'calendar-with-active-ig',
            expirationDate: baseExpirationDate,
            workingGroups: [],
            interestGroups: [{ active: true, id: 'active-ig' }],
          },
          {
            ...getCalendarDataObject(),
            id: 'calendar-with-empty-linked-wg',
            expirationDate: baseExpirationDate,
            workingGroups: [],
            interestGroups: [],
          },
          {
            ...getCalendarDataObject(),
            id: 'calendar-with-empty-linked-ig',
            expirationDate: baseExpirationDate,
            workingGroups: [],
            interestGroups: [],
          },
          {
            ...getCalendarDataObject(),
            id: 'calendar-without-linked-working-group-and-interest-group',
            expirationDate: baseExpirationDate,
            workingGroups: [],
            interestGroups: [],
          },
        ],
        total: 5,
      });
    });

    test('Should default missing data to an empty string', async () => {
      const calendarResponse = getContentfulCalendarsGraphqlResponse();
      calendarResponse.calendarsCollection!.items![0]!.name = null;
      calendarResponse.calendarsCollection!.items![0]!.googleCalendarId = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        calendarResponse,
      );

      const response = await calendarDataProvider.fetch();

      expect(response.items[0]).toMatchObject({
        name: '',
        googleCalendarId: '',
      });
    });

    test('Should default the calendar color to #333333', async () => {
      const calendarResponse = getContentfulCalendarsGraphqlResponse();
      calendarResponse.calendarsCollection!.items![0]!.color = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        calendarResponse,
      );

      const response = await calendarDataProvider.fetch();

      expect(response.items[0]!.color).toBe('#333333');
    });

    test('Should map the crnCalendar and seminarSeries flags', async () => {
      const calendarResponse = getContentfulCalendarsGraphqlResponse();
      calendarResponse.calendarsCollection!.items![0]!.crnCalendar = false;
      calendarResponse.calendarsCollection!.items![0]!.seminarSeries = true;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        calendarResponse,
      );

      const response = await calendarDataProvider.fetch();

      expect(response.items[0]).toMatchObject({
        crnCalendar: false,
        seminarSeries: true,
      });
    });

    test('Should default missing crnCalendar and seminarSeries flags to false', async () => {
      const calendarResponse = getContentfulCalendarsGraphqlResponse();
      calendarResponse.calendarsCollection!.items![0]!.crnCalendar = null;
      calendarResponse.calendarsCollection!.items![0]!.seminarSeries = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        calendarResponse,
      );

      const response = await calendarDataProvider.fetch();

      expect(response.items[0]).toMatchObject({
        crnCalendar: false,
        seminarSeries: false,
      });
    });
  });

  describe('Fetch-by-id method', () => {
    test('Should fetch the calendar from Contentful GraphQl', async () => {
      const calendarId = 'calendar-id-0';
      const result = await calendarDataProviderMock.fetchById(calendarId);

      expect(result).toMatchObject(getCalendarDataObject());
    });

    test('Should return null when the calendar is not found', async () => {
      const calendarId = 'not-found';

      const contentfulGraphQLResponse = getContentfulCalendarsGraphqlResponse();
      contentfulGraphQLResponse.calendarsCollection = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      expect(await calendarDataProvider.fetchById(calendarId)).toBeNull();
    });

    test('Should throw an error with a specific error message when the graphql client throws one', async () => {
      const id = 'some-id';
      contentfulGraphqlClientMock.request.mockRejectedValueOnce(
        new GraphQLError('some error message'),
      );

      await expect(calendarDataProvider.fetchById(id)).rejects.toThrow(
        'some error message',
      );
    });

    test('Should return the result when the calendar exists', async () => {
      const id = 'some-id';
      const contentfulGraphQLResponse = {
        calendars: getContentfulGraphqlCalendar(),
      };

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await calendarDataProvider.fetchById(id);

      expect(result).toEqual(getCalendarDataObject());
      expect(contentfulGraphqlClientMock.request).toBeCalledWith(
        expect.anything(),
        expect.objectContaining({
          id,
        }),
      );
    });

    test('Should default missing data to an empty string', async () => {
      const contentfulGraphQLResponse = {
        calendars: getContentfulGraphqlCalendar(),
      };

      contentfulGraphQLResponse.calendars.name = null;
      contentfulGraphQLResponse.calendars.googleCalendarId = null;

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await calendarDataProvider.fetchById('calendar-id');

      expect(result).toMatchObject({
        name: '',
        googleCalendarId: '',
      });
    });

    test('Should default an invalid colour to #333333', async () => {
      const contentfulGraphQLResponse = {
        calendars: getContentfulGraphqlCalendar(),
      };

      contentfulGraphQLResponse.calendars.color = 'invalid';

      contentfulGraphqlClientMock.request.mockResolvedValueOnce(
        contentfulGraphQLResponse,
      );

      const result = await calendarDataProvider.fetchById('calendar-id');

      expect(result!.color).toBe('#333333');
    });

    describe('working group', () => {
      it('should return working group as empty array when linkedFrom calendar is null', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlCalendar();
        contentfulGraphQLResponse.linkedFrom = null;

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          calendars: contentfulGraphQLResponse,
        });

        const result = await calendarDataProvider.fetchById(id);

        expect(result!.workingGroups).toEqual([]);
      });

      it('should return working group as empty array when workingGroupsCollection is null', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlCalendar();
        contentfulGraphQLResponse.linkedFrom = {
          workingGroupsCollection: null,
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          calendars: contentfulGraphQLResponse,
        });

        const result = await calendarDataProvider.fetchById(id);

        expect(result!.workingGroups).toEqual([]);
      });

      it('should return working group as empty array when workingGroupsCollection items are empty', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlCalendar();
        contentfulGraphQLResponse.linkedFrom = {
          workingGroupsCollection: {
            items: [],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          calendars: contentfulGraphQLResponse,
        });

        const result = await calendarDataProvider.fetchById(id);

        expect(result!.workingGroups).toEqual([]);
      });

      it('should return working group as empty array when workingGroupsCollection items are null', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlCalendar();
        contentfulGraphQLResponse.linkedFrom = {
          workingGroupsCollection: {
            items: [null, null],
          },
        };
        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          calendars: contentfulGraphQLResponse,
        });

        const result = await calendarDataProvider.fetchById(id);

        expect(result!.workingGroups).toEqual([]);
      });

      it('should return working group when it is linked from calendar', async () => {
        const id = 'some-id';
        const contentfulGraphQLResponse = getContentfulGraphqlCalendar();
        contentfulGraphQLResponse!.linkedFrom = {
          workingGroupsCollection: {
            items: [
              {
                sys: {
                  id: 'wg-linked-from-calendar',
                },
                complete: true,
              },
            ],
          },
        };

        contentfulGraphqlClientMock.request.mockResolvedValueOnce({
          calendars: contentfulGraphQLResponse,
        });

        const result = await calendarDataProvider.fetchById(id);

        expect(result!.workingGroups).toEqual([
          {
            id: 'wg-linked-from-calendar',
            complete: true,
          },
        ]);
      });
    });
  });

  describe('Update method', () => {
    test('Should update the calendar - without new google api metadata - without previous google api metadata', async () => {
      const calendarId = 'calendar-id-1';

      const calendarMock = getEntry({});
      environmentMock.getEntry.mockResolvedValueOnce(calendarMock);
      const calendarMockUpdated = getEntry({});
      calendarMock.update = jest
        .fn()
        .mockResolvedValueOnce(calendarMockUpdated);

      await calendarDataProviderMock.update(calendarId, { color: '#060D5E' });

      expect(environmentMock.getEntry).toHaveBeenCalledWith(calendarId);

      expect(calendarMock.fields).toEqual({ color: { 'en-US': '#060D5E' } });
      expect(calendarMock.update).toHaveBeenCalled();
      expect(calendarMockUpdated.publish).toHaveBeenCalled();
    });

    test('Should update syncToken in googleApiMetadata', async () => {
      const calendarId = 'calendar-id-1';

      const calendarMock = getEntry({});
      environmentMock.getEntry.mockResolvedValueOnce(calendarMock);
      const calendarMockUpdated = getEntry({});
      calendarMock.update = jest
        .fn()
        .mockResolvedValueOnce(calendarMockUpdated);

      await calendarDataProviderMock.update(calendarId, {
        syncToken: 'token-1',
      });

      expect(environmentMock.getEntry).toHaveBeenCalledWith(calendarId);

      expect(calendarMock.fields).toEqual({
        googleApiMetadata: {
          'en-US': {
            syncToken: 'token-1',
          },
        },
      });
      expect(calendarMock.update).toHaveBeenCalled();
      expect(calendarMockUpdated.publish).toHaveBeenCalled();
    });

    test('Should update associatedGoogleCalendarId when passing resourceId', async () => {
      const calendarId = 'calendar-id-1';

      const calendarMock = getEntry({
        googleCalendarId: {
          'en-US': 'google-calendar-id-1',
        },
        googleApiMetadata: {
          'en-US': {
            syncToken: 'syncToken-1',
          },
        },
      });
      environmentMock.getEntry.mockResolvedValueOnce(calendarMock);
      const calendarMockUpdated = getEntry({});
      calendarMock.update = jest
        .fn()
        .mockResolvedValueOnce(calendarMockUpdated);

      await calendarDataProviderMock.update(calendarId, {
        resourceId: 'resourceId-1',
      });

      expect(environmentMock.getEntry).toHaveBeenCalledWith(calendarId);

      expect(calendarMock.fields).toEqual({
        googleCalendarId: {
          'en-US': 'google-calendar-id-1',
        },
        googleApiMetadata: {
          'en-US': {
            associatedGoogleCalendarId: 'google-calendar-id-1',
            resourceId: 'resourceId-1',
            syncToken: 'syncToken-1',
          },
        },
      });
      expect(calendarMock.update).toHaveBeenCalled();
      expect(calendarMockUpdated.publish).toHaveBeenCalled();
    });
    test('Should update resourceId when passing null', async () => {
      const calendarId = 'calendar-id-1';

      const calendarMock = getEntry({
        googleCalendarId: {
          'en-US': 'google-calendar-id-1',
        },
        googleApiMetadata: {
          'en-US': {
            syncToken: 'syncToken-1',
          },
        },
      });
      environmentMock.getEntry.mockResolvedValueOnce(calendarMock);
      const calendarMockUpdated = getEntry({});
      calendarMock.update = jest
        .fn()
        .mockResolvedValueOnce(calendarMockUpdated);

      await calendarDataProviderMock.update(calendarId, {
        resourceId: null,
      });

      expect(environmentMock.getEntry).toHaveBeenCalledWith(calendarId);

      expect(calendarMock.fields).toEqual({
        googleCalendarId: {
          'en-US': 'google-calendar-id-1',
        },
        googleApiMetadata: {
          'en-US': {
            associatedGoogleCalendarId: 'google-calendar-id-1',
            resourceId: null,
            syncToken: 'syncToken-1',
          },
        },
      });
      expect(calendarMock.update).toHaveBeenCalled();
      expect(calendarMockUpdated.publish).toHaveBeenCalled();
    });
  });

  describe('Create method', () => {
    test('Should create and publish a calendar', async () => {
      const calendarMock = getEntry({});
      environmentMock.createEntry.mockResolvedValue(calendarMock);
      calendarMock.publish = jest.fn().mockResolvedValueOnce(calendarMock);

      const calendarDataObject = getCalendarCreateDataObject();
      await calendarDataProviderMock.create(calendarDataObject);

      expect(environmentMock.createEntry).toHaveBeenCalledWith('calendars', {
        fields: {
          color: { 'en-US': '#2952A3' },
          expirationDate: { 'en-US': 1617196357000 },
          googleCalendarId: { 'en-US': '3@group.calendar.google.com' },
          name: { 'en-US': 'Tech 4a - iPSCs - 3D & Co-cultures' },
          resourceId: { 'en-US': 'resource-id' },
          syncToken: { 'en-US': 'sync-token' },
        },
      });

      expect(calendarMock.publish).toHaveBeenCalled();
    });
  });
});

const getCalendarResponse = (
  id: string,
  resourceId?: string,
  expirationDate?: number,
  workingGroups?:
    | {
        sys: {
          id: string;
        };
        complete: boolean;
      }[]
    | null,
  interestGroups?:
    | {
        sys: {
          id: string;
        };
        active: boolean;
      }[]
    | null,
) => {
  const baseCalendar = getContentfulGraphqlCalendar();

  const getLinkedFrom = () => ({
    linkedFrom: {
      workingGroupsCollection:
        workingGroups === null
          ? null
          : {
              items: workingGroups ?? [getWorkingGroupData({})],
            },
      interestGroupsCollection:
        interestGroups === null
          ? null
          : {
              items: interestGroups ?? [getInterestGroupData({})],
            },
    },
  });

  return {
    ...baseCalendar,
    sys: {
      ...baseCalendar.sys,
      id,
    },
    googleApiMetadata: {
      ...baseCalendar.googleApiMetadata,
      ...(resourceId
        ? { resourceId }
        : { resourceId: baseCalendar.googleApiMetadata.resourceId }),
      ...(expirationDate
        ? { expirationDate }
        : { expirationDate: baseCalendar.googleApiMetadata.expirationDate }),
    },
    ...getLinkedFrom(),
  };
};
export const getWorkingGroupData = ({
  workingGroupId = '123',
  complete = false,
}) => ({
  sys: {
    id: workingGroupId,
  },
  complete,
});

export const getInterestGroupData = ({
  interestGroupId = 'group-id-1',
  active = true,
}) => ({
  sys: {
    id: interestGroupId,
  },
  active,
});
