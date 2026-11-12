import {
  gp2 as gp2Contentful,
  ContentfulWebhookPayload,
} from '@asap-hub/contentful';
import { CalendarCreateDataObject, gp2, WebhookDetail } from '@asap-hub/model';
import { EventBridgeEvent } from 'aws-lambda';
import { createEventBridgeEventMock } from '../helpers/events';

export const getContentfulGraphql = () => ({
  Calendars: () => getContentfulGraphqlCalendar(),
  ProjectsCollection: () => getContentfulProjectsCollection(),
  WorkingGroupsCollection: () => getContentfulWorkingGroupsCollection(),
});

export const getContentfulGraphqlCalendar = (): NonNullable<
  NonNullable<
    gp2Contentful.FetchCalendarsQuery['calendarsCollection']
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
  gp2Calendar: false,
  linkedFrom: {
    projectsCollection: {
      items: getContentfulProjectsCollection().items,
    },
    workingGroupsCollection: {
      items: getContentfulWorkingGroupsCollection().items,
    },
  },
});

export const getContentfulProjectsCollection = () => ({
  total: 1,
  items: [
    {
      sys: { id: '7' },
      title: 'a project title',
      status: 'Active',
    },
  ],
});

export const getContentfulWorkingGroupsCollection = () => ({
  total: 1,
  items: [
    {
      sys: { id: '11' },
      title: 'a working group title',
    },
  ],
});

export const getContentfulCalendarsGraphqlResponse =
  (): gp2Contentful.FetchCalendarsQuery => ({
    calendarsCollection: {
      total: 1,
      items: [getContentfulGraphqlCalendar()],
    },
  });

export const getCalendarDataObject = (): gp2.CalendarDataObject => ({
  id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
  color: '#2952A3',
  name: 'Tech 4a - iPSCs - 3D & Co-cultures',
  syncToken: 'sync-token',
  resourceId: 'resource-id',
  expirationDate: 1617196357000,
  googleCalendarId: '3@group.calendar.google.com',
  version: 42,
  projects: [{ id: '7', title: 'a project title', status: 'Active' }],
  workingGroups: [{ id: '11', title: 'a working group title' }],
  gp2Calendar: false,
});

export const getCalendarCreateDataObject = (): CalendarCreateDataObject => {
  const {
    id: _,
    version: __,
    projects: ___,
    workingGroups: ____,
    gp2Calendar: _____,
    ...data
  } = getCalendarDataObject();
  return data;
};

export const getListCalendarDataObject = (): gp2.ListCalendarDataObject => ({
  total: 1,
  items: [getCalendarDataObject()],
});

export const getCalendarResponse = (): gp2.CalendarResponse => ({
  id: '3@group.calendar.google.com',
  color: '#2952A3',
  name: 'Tech 4a - iPSCs - 3D & Co-cultures',
  projects: [{ id: '7', title: 'a project title', status: 'Active' }],
  workingGroups: [{ id: '11', title: 'a working group title' }],
  gp2Calendar: false,
});

export const getListCalendarResponse = (): gp2.ListCalendarResponse => ({
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

export const getCalendarWebhookPayload = (
  id: string,
): WebhookDetail<ContentfulWebhookPayload<'calendar'>> => ({
  resourceId: id,
  metadata: {
    tags: [],
  },
  sys: {
    type: 'Entry',
    id: 'fc496d00-053f-44fd-9bac-68dd9d959848',
    space: {
      sys: {
        type: 'Link',
        linkType: 'Space',
        id: '5v6w5j61tndm',
      },
    },
    environment: {
      sys: {
        id: 'an-environment',
        type: 'Link',
        linkType: 'Environment',
      },
    },
    contentType: {
      sys: {
        type: 'Link',
        linkType: 'ContentType',
        id: 'calendar',
      },
    },
    createdBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '3ZHvngTJ24kxZUAPDJ8J1z',
      },
    },
    updatedBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '3ZHvngTJ24kxZUAPDJ8J1z',
      },
    },
    revision: 14,
    createdAt: '2023-05-17T13:39:03.250Z',
    updatedAt: '2023-05-18T16:17:36.425Z',
  },
  fields: {
    name: {
      'en-US': 'Tony',
    },
    googleCalendarId: {
      'en-US': 'calendar-id',
    },
    color: {
      'en-US': '#009900',
    },
  },
});

export const getCalendarEvent = (
  id: string,
  eventType: gp2.CalendarEvent,
): EventBridgeEvent<
  gp2.CalendarEvent,
  WebhookDetail<ContentfulWebhookPayload<'calendar'>>
> => createEventBridgeEventMock(getCalendarWebhookPayload(id), eventType, id);
