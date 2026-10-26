import { FetchCalendarsQuery as ContentfulFetchCalendarsQuery } from '@asap-hub/contentful';
import {
  CalendarCreateDataObject,
  CalendarDataObject,
  CalendarResponse,
  ListCalendarDataObject,
  ListCalendarResponse,
} from '@asap-hub/model';

export const getContentfulGraphqlCalendar = (): NonNullable<
  NonNullable<
    ContentfulFetchCalendarsQuery['calendarsCollection']
  >['items'][number]
> => ({
  sys: {
    id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
    firstPublishedAt: '2020-09-23T16:34:26.842Z',
    publishedAt: '2021-05-14T14:48:46Z',
    publishedVersion: 42,
  },
  googleCalendarId: '3@group.calendar.google.com',
  color: '#2952A3',
  name: 'Tech 4a - iPSCs - 3D & Co-cultures',
  googleApiMetadata: {
    resourceId: 'resource-id',
    syncToken: 'sync-token',
    expirationDate: 1617196357000,
  },
  crnCalendar: true,
  seminarSeries: false,
  linkedFrom: {
    workingGroupsCollection: {
      items: [
        {
          sys: {
            id: '123',
          },
          complete: false,
        },
      ],
    },
    interestGroupsCollection: {
      items: [
        {
          sys: {
            id: 'group-id-1',
          },
          active: true,
        },
      ],
    },
  },
});

export const getContentfulCalendarsGraphqlResponse =
  (): ContentfulFetchCalendarsQuery => ({
    calendarsCollection: {
      total: 1,
      items: [getContentfulGraphqlCalendar()],
    },
  });

export const getCalendarDataObject = (): CalendarDataObject => ({
  id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
  color: '#2952A3',
  name: 'Tech 4a - iPSCs - 3D & Co-cultures',
  syncToken: 'sync-token',
  resourceId: 'resource-id',
  expirationDate: 1617196357000,
  googleCalendarId: '3@group.calendar.google.com',
  version: 42,
  interestGroups: [{ id: 'group-id-1', active: true }],
  workingGroups: [{ id: '123', complete: false }],
  crnCalendar: true,
  seminarSeries: false,
});
export const getCalendarCreateDataObject = (): CalendarCreateDataObject => {
  const {
    id: _id,
    version: _version,
    interestGroups: _interestGroups,
    workingGroups: _workingGroups,
    crnCalendar: _crnCalendar,
    seminarSeries: _seminarSeries,
    ...data
  } = getCalendarDataObject();
  return data;
};

export const getListCalendarDataObject = (): ListCalendarDataObject => ({
  total: 1,
  items: [getCalendarDataObject()],
});

export const getCalendarResponse = (): CalendarResponse => ({
  id: '3@group.calendar.google.com',
  color: '#2952A3',
  name: 'Tech 4a - iPSCs - 3D & Co-cultures',
  interestGroups: [{ id: 'group-id-1', active: true }],
  workingGroups: [{ id: '123', complete: false }],
  crnCalendar: true,
  seminarSeries: false,
});

export const getListCalendarResponse = (): ListCalendarResponse => ({
  items: [getCalendarResponse()],
  total: 1,
});

export const calendarsListRestResponse = () => [
  {
    id: 'cms-calendar-id-1',
    googleCalendarId: 'calendar-id-1',
    color: '#4E5D6C',
    name: 'Kubernetes Meetups',
    resourceId: 'resource-id',
    syncToken: 'sync-token',
    expirationDate: 1614697798681,
    version: 42,
  },
  {
    id: 'cms-calendar-id-2',
    googleCalendarId: 'calendar-id-2',
    color: '#B1365F',
    name: 'Service Mesh Conferences',
    resourceId: 'resource-id-2',
    syncToken: 'sync-token-2',
    expirationDate: 1614697798681,
    version: 42,
  },
];
