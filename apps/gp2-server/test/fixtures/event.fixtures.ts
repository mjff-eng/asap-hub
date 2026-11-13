import {
  ContentfulWebhookPayload,
  gp2 as gp2Contentful,
} from '@asap-hub/contentful';
import { EventStatus, gp2 as gp2Model, WebhookDetail } from '@asap-hub/model';
import { EventBridgeEvent } from 'aws-lambda';
import { createEventBridgeEventMock } from '../helpers/events';

export const getContentfulGraphql = () => ({
  Events: () => getContentfulGraphqlEvent(),
  ProjectsCollection: () => getContentfulProjectsCollection(),
  WorkingGroupsCollection: () => getContentfulWorkingGroupsCollection(),
  OutputsCollection: () => getContentfulOutputsCollection(),
});

export const getContentfulGraphqlEvent = (): NonNullable<
  NonNullable<
    gp2Contentful.FetchEventsQuery['eventsCollection']
  >['items'][number]
> => ({
  sys: {
    id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
    publishedAt: '2021-05-14T14:48:46.000Z',
  },
  description: 'This event is awesome',
  endDate: '2009-12-24T16:30:54.000Z',
  endDateTimeZone: 'UTC',
  startDate: '2009-12-24T16:20:14.000Z',
  startDateTimeZone: 'UTC',
  meetingLink: 'https://zoom.com/room/123',
  hideMeetingLink: false,
  eventLink: 'https://zoom.com/room/123',
  status: 'Confirmed',
  hidden: false,
  tagsCollection: {
    items: [{ sys: { id: 'id-1' }, name: 'Cohort' }],
    total: 0,
  },
  title: 'Example Event',
  notesPermanentlyUnavailable: false,
  notes: {
    json: {
      data: {},
      content: [
        {
          data: {},
          content: [
            {
              data: {},
              marks: [],
              value: 'These are the notes from the meeting',
              nodeType: 'text',
            },
          ],
          nodeType: 'paragraph',
        },
      ],
      nodeType: 'document',
    },
    links: {
      entries: {
        inline: [],
      },
      assets: {
        block: [],
      },
    },
  },
  notesUpdatedAt: '2010-10-01T08:00:04.000Z',
  videoRecordingPermanentlyUnavailable: false,
  videoRecording: {
    json: {
      nodeType: 'document',
      data: {},
      content: [
        {
          nodeType: 'paragraph',
          data: {},
          content: [
            {
              nodeType: 'text',
              value: '',
              marks: [],
              data: {},
            },
            {
              nodeType: 'embedded-entry-inline',
              data: {
                target: {
                  sys: {
                    id: 'video-id',
                    type: 'Link',
                    linkType: 'Entry',
                  },
                },
              },
              content: [],
            },
            {
              nodeType: 'text',
              value: '',
              marks: [],
              data: {},
            },
          ],
        },
      ],
    },
    links: {
      entries: {
        inline: [
          {
            sys: {
              id: 'video-id',
            },
            __typename: 'Media',
            url: 'https://player.vimeo.com/video/493052720',
          },
        ],
      },
      assets: {
        block: [],
      },
    },
  },
  videoRecordingUpdatedAt: '2010-08-01T08:00:04.000Z',
  presentationPermanentlyUnavailable: false,
  presentation: {
    json: {
      nodeType: 'document',
      data: {},
      content: [
        {
          nodeType: 'paragraph',
          data: {},
          content: [
            {
              nodeType: 'text',
              value: '',
              marks: [],
              data: {},
            },
            {
              nodeType: 'embedded-entry-inline',
              data: {
                target: {
                  sys: {
                    id: 'presentation-id',
                    type: 'Link',
                    linkType: 'Entry',
                  },
                },
              },
              content: [],
            },
            {
              nodeType: 'text',
              value: '',
              marks: [],
              data: {},
            },
          ],
        },
      ],
    },
    links: {
      entries: {
        inline: [
          {
            sys: {
              id: 'presentation-id',
            },
            __typename: 'Media',
            url: 'https://example.com',
          },
        ],
      },
      assets: {
        block: [],
      },
    },
  },
  presentationUpdatedAt: '2010-09-01T08:00:04.000Z',
  meetingMaterialsPermanentlyUnavailable: false,
  meetingMaterials: [
    {
      title: 'My additional link',
      url: 'https://link.pt/additional-material',
    },
  ],
  calendar: {
    googleCalendarId: 'c_t92qa82jd702q1fkreoi0hf4hk@group.calendar.google.com',
    color: '#125A12' as const,
    name: 'Tech 1 - Sequencing/omics',
    linkedFrom: {
      projectsCollection: {
        items: getContentfulProjectsCollection().items,
      },
      workingGroupsCollection: {
        items: getContentfulWorkingGroupsCollection().items,
      },
    },
  },
  thumbnail: {
    url: 'https://example.com',
  },
  speakersCollection: {
    items: [
      {
        title: 'Some Topic',
        user: {
          __typename: 'Users',
          sys: {
            id: 'user-id-3',
          },
          firstName: 'Adam',
          nickname: null,
          lastName: 'Brown',
          onboarded: true,
          alumniSinceDate: null,
          avatar: null,
        },
      },
    ],
  },
  linkedFrom: {
    outputsCollection: {
      items: getContentfulOutputsCollection().items,
    },
  },
});

export const getContentfulOutputsCollection = () => ({
  total: 1,
  items: [
    {
      sys: { id: '7' },
      title: 'a output title',
      documentType: 'Article',
    },
  ],
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

export const getContentfulGraphqlEventsResponse =
  (): gp2Contentful.FetchEventsQuery => ({
    eventsCollection: {
      total: 1,
      items: [getContentfulGraphqlEvent()],
    },
  });

export const getEventsByUserIdGraphqlResponse =
  (): gp2Contentful.FetchEventsByUserIdQuery => ({
    users: {
      linkedFrom: {
        eventSpeakersCollection: {
          items: [
            {
              linkedFrom: {
                eventsCollection: {
                  total: 1,
                  items: [getContentfulGraphqlEvent()],
                },
              },
            },
          ],
        },
      },
    },
  });

export const getEventsByExternalUserIdGraphqlResponse =
  (): gp2Contentful.FetchEventsByExternalUserIdQuery => ({
    externalUsers: {
      linkedFrom: {
        eventSpeakersCollection: {
          items: [
            {
              linkedFrom: {
                eventsCollection: {
                  total: 1,
                  items: [getContentfulGraphqlEvent()],
                },
              },
            },
          ],
        },
      },
    },
  });

export const getEventSpeakerUser = (): gp2Model.EventSpeakerUser => ({
  id: 'user-id-3',
  firstName: 'Adam',
  lastName: 'Brown',
  displayName: 'Adam Brown',
  avatarUrl: undefined,
});

export const getContentfulEventDataObject = (): gp2Model.EventDataObject => ({
  ...getEventDataObject(),
  notes: '<p>These are the notes from the meeting</p>',
  presentation: '<p><iframe src="https://example.com"></iframe></p>',
  videoRecording:
    '<p><iframe src="https://player.vimeo.com/video/493052720"></iframe></p>',
  thumbnail: 'https://example.com',
  calendar: {
    ...getEventDataObject().calendar,
    projects: [
      {
        id: '7',
        title: 'a project title',
        status: 'Active',
      },
    ],
    workingGroups: [
      {
        id: '11',
        title: 'a working group title',
      },
    ],
  },
});

export const getContentfulListEventDataObject =
  (): gp2Model.ListEventDataObject => ({
    total: 1,
    items: [getContentfulEventDataObject()],
  });

export const getEventSpeaker = (): gp2Model.EventSpeaker => ({
  speaker: getEventSpeakerUser(),
  topic: 'Some Topic',
});

export const getEventExternalUser = (): gp2Model.EventSpeakerExternalUser => ({
  name: 'Adam Brown',
  orcid: '1234-1234-1234',
});

export const getEventExternalSpeaker = (): gp2Model.EventSpeaker => ({
  speaker: getEventExternalUser(),
  topic: 'Some Topic',
});

export const getEventSpeakerToBeAnnounced = (): gp2Model.EventSpeaker => ({
  speaker: undefined,
  topic: undefined,
});

export const getEventDataObject = (): gp2Model.EventDataObject => ({
  id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
  description: 'This event is awesome',
  lastModifiedDate: '2021-05-14T14:48:46.000Z',
  endDate: '2009-12-24T16:30:54.000Z',
  endDateTimestamp: 1261672254,
  startDate: '2009-12-24T16:20:14.000Z',
  startDateTimestamp: 1261671614,
  meetingLink: 'https://zoom.com/room/123',
  hideMeetingLink: false,
  status: 'Confirmed',
  hidden: false,
  tags: [{ id: 'id-1', name: 'Cohort' }],
  title: 'Example Event',
  startDateTimeZone: 'UTC',
  endDateTimeZone: 'UTC',
  notes: 'These are the notes from the meeting',
  videoRecording: '<embeded>video</embeded>',
  presentation: '<embeded>presentation</embeded>',
  meetingMaterials: [
    {
      title: 'My additional link',
      url: 'https://link.pt/additional-material',
    },
  ],
  calendar: {
    color: '#125A12',
    id: 'c_t92qa82jd702q1fkreoi0hf4hk@group.calendar.google.com',
    name: 'Tech 1 - Sequencing/omics',
    projects: [],
    workingGroups: [],
    gp2Calendar: false,
  },
  speakers: [getEventSpeaker()],
  workingGroup: { id: '11', title: 'a working group title' },
  project: { id: '7', title: 'a project title', status: 'Active' },
  relatedOutputs: [
    { id: '7', title: 'a output title', documentType: 'Article' },
  ],
});

export const getListEventDataObject = (): gp2Model.ListEventDataObject => ({
  total: 1,
  items: [
    {
      ...getEventDataObject(),
    },
  ],
});
export const getEventResponse = (): gp2Model.EventResponse => ({
  ...getEventDataObject(),
  eventTypes: [gp2Model.eventWorkingGroups, gp2Model.eventProjects],
});
export const getListEventResponse = (): gp2Model.ListEventResponse => ({
  total: 1,
  items: [getEventResponse()],
});

export const getEventCreateDataObject = (): gp2Model.EventCreateDataObject => ({
  googleId: 'google-event-id',
  title: 'Event Tittle',
  description: 'This event will be good',
  startDate: '2021-02-23T19:32:00Z',
  startDateTimeZone: 'Europe/Lisbon',
  endDate: '2021-02-23T19:32:00Z',
  endDateTimeZone: 'Europe/Lisbon',
  calendar: 'calendar-id',
  status: 'Confirmed' as EventStatus,
  hidden: false,
  meetingLink: 'https://zweem.com',
  hideMeetingLink: false,
});

export const getEventWebhookPayload = (
  id: string,
): WebhookDetail<ContentfulWebhookPayload<'event'>> => ({
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
        id: 'event',
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
    title: {
      'en-US':
        'Sci 7 - Inflammation & Immune Reg., Presenting Teams: Sulzer, Desjardins, Kordower',
    },
  },
});

export const getEventEvent = (
  id: string,
  eventType: gp2Model.EventEvent,
): EventBridgeEvent<
  gp2Model.EventEvent,
  WebhookDetail<ContentfulWebhookPayload<'event'>>
> => createEventBridgeEventMock(getEventWebhookPayload(id), eventType, id);
