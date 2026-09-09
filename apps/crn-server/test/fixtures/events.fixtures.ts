import {
  ContentfulWebhookPayload,
  FetchEventsByExternalAuthorIdQuery,
  FetchEventsByTeamIdQuery,
  FetchEventsByUserIdQuery,
  FetchEventsQuery as ContentfulFetchEventsQuery,
  FetchInterestGroupCalendarQuery,
  FetchPreviousEventAttendanceQuery,
  FetchWorkingGroupCalendarQuery,
} from '@asap-hub/contentful';
import {
  EventCreateDataObject,
  EventDataObject,
  EventEvent,
  EventResponse,
  EventSpeakerUser,
  EventStatus,
  ListEventDataObject,
  ListEventResponse,
  WebhookDetail,
} from '@asap-hub/model';
import { EventBridgeEvent } from 'aws-lambda';
import { createEventBridgeEventMock } from '../helpers/events';
import { getInterestGroupResponse } from './interest-groups.fixtures';
import { getWorkingGroupResponse } from './working-groups.fixtures';

export const getContentfulUserSpeakerTeams = () => ({
  team: {
    sys: {
      id: 'team-id-3',
    },
  },
  role: 'Lead PI (Core Leadership)',
});

export const getContentfulRelatedTutorial = () => ({
  sys: {
    id: 'tutorial-1',
  },
  title: 'Tutorial 1',
  addedDate: '2020-07-09T14:48:46.000Z',
});

export const getContentfulRelatedResearch = (isList: boolean = false) => ({
  sys: {
    id: 'research-output-id',
  },
  title: 'Research output title',
  type: '3D Printing',
  documentType: 'Article',
  teamsCollection: isList
    ? undefined
    : {
        items: [
          {
            sys: {
              id: 'team-id-1',
            },
            displayName: 'The team one',
          },
        ],
      },
  workingGroup: isList
    ? undefined
    : {
        sys: { id: 'wg-id' },
        title: 'Working group name',
      },
});
export const getContentfulGraphqlEvent = (
  isList: boolean = false,
): NonNullable<
  NonNullable<ContentfulFetchEventsQuery['eventsCollection']>['items'][number]
> => ({
  sys: {
    id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
  },
  lastUpdated: '2021-05-14T14:48:46.000Z',
  description: 'This event is awesome',
  endDate: '2009-12-24T16:30:54.000Z',
  endDateTimeZone: 'UTC',
  startDate: '2009-12-24T16:20:14.000Z',
  startDateTimeZone: 'UTC',
  meetingLink: 'https://zoom.com/room/123',
  hideMeetingLink: false,
  recurring: false,
  eventLink: 'https://zoom.com/room/123',
  status: 'Confirmed',
  hidden: false,
  researchTagsCollection: { items: [] },
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
  linkedFrom: {
    researchOutputsCollection: {
      items: [getContentfulRelatedResearch(isList)],
    },
    tutorialsCollection: {
      items: [getContentfulRelatedTutorial()],
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
  attendanceCollection: isList
    ? undefined
    : {
        total: 2,
        items: [
          {
            sys: { id: 'attendance-id-1' },
            attended: true,
            team: {
              sys: { id: 'team-id-1' },
              displayName: 'The team one',
              teamType: 'Discovery Team',
              inactiveSince: null,
            },
          },
          {
            sys: { id: 'attendance-id-2' },
            attended: false,
            team: {
              sys: { id: 'team-id-2' },
              displayName: 'The team two',
              teamType: 'Unknown Team Type',
              inactiveSince: '2022-10-24T11:00:00Z',
            },
          },
          {
            sys: { id: 'attendance-id-3' },
            attended: true,
            team: null,
          },
        ],
      },
  preliminaryDataSharedCollection: isList
    ? undefined
    : {
        items: [
          {
            preliminaryDataShared: true,
            team: { sys: { id: 'team-id-1' } },
          },
          {
            preliminaryDataShared: false,
            team: { sys: { id: 'team-id-2' } },
          },
          {
            preliminaryDataShared: true,
            team: null,
          },
        ],
      },
  calendar: {
    googleCalendarId: 'c_t92qa82jd702q1fkreoi0hf4hk@group.calendar.google.com',
    color: '#125A12' as const,
    name: 'Tech 1 - Sequencing/omics',
  },
  thumbnail: {
    url: 'https://example.com',
  },
  speakersCollection: {
    items: [
      // sys.id is queried but absent from the generated type (see
      // parseGraphQLSpeakers); cast to match what the query returns.
      {
        sys: {
          id: 'event-speaker-id-3',
        },
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
          nickname: 'Ad',
          lastName: 'Brown',
          onboarded: true,
          teamsCollection: {
            items: [getContentfulUserSpeakerTeams()],
          },
          avatar: null,
        },
      } as NonNullable<
        NonNullable<
          NonNullable<
            NonNullable<
              ContentfulFetchEventsQuery['eventsCollection']
            >['items'][number]
          >['speakersCollection']
        >['items'][number]
      >,
    ],
  },
});

export const getContentfulGraphqlEventsResponse =
  (): ContentfulFetchEventsQuery => ({
    eventsCollection: {
      total: 1,
      items: [getContentfulGraphqlEvent(true)],
    },
  });

export const getEventsByUserIdGraphqlResponse =
  (): FetchEventsByUserIdQuery => ({
    users: {
      linkedFrom: {
        eventSpeakersCollection: {
          items: [
            {
              linkedFrom: {
                eventsCollection: {
                  total: 1,
                  items: [getContentfulGraphqlEvent(true)],
                },
              },
            },
          ],
        },
      },
    },
  });

export const getEventsByExternalAuthorIdGraphqlResponse =
  (): FetchEventsByExternalAuthorIdQuery => ({
    externalAuthors: {
      linkedFrom: {
        eventSpeakersCollection: {
          items: [
            {
              linkedFrom: {
                eventsCollection: {
                  total: 1,
                  items: [getContentfulGraphqlEvent(true)],
                },
              },
            },
          ],
        },
      },
    },
  });

export const getEventsByTeamIdGraphqlResponse =
  (): FetchEventsByTeamIdQuery => ({
    teams: {
      linkedFrom: {
        eventSpeakersCollection: {
          items: [
            {
              linkedFrom: {
                eventsCollection: {
                  total: 1,
                  items: [getContentfulGraphqlEvent(true)],
                },
              },
            },
          ],
        },
      },
    },
  });

export const getWorkingGroupCalendarResponse =
  (): FetchWorkingGroupCalendarQuery => ({
    workingGroups: {
      calendars: {
        sys: {
          id: 'calendar-from-wg-id',
        },
      },
    },
  });

export const getInterestGroupCalendarResponse =
  (): FetchInterestGroupCalendarQuery => ({
    interestGroups: {
      calendar: {
        sys: {
          id: 'calendar-from-ig-id',
        },
      },
    },
  });

export const getEventSpeakerUser = (): EventSpeakerUser => ({
  id: 'event-speaker-id-3',
  team: {
    id: 'team-id-3',
    displayName: 'The team three',
    inactiveSince: '2022-10-24T11:00:00Z',
  },
  user: {
    id: 'user-id-3',
    firstName: 'Adam',
    lastName: 'Brown',
    displayName: 'Adam (Ad) Brown',
    alumniSinceDate: undefined,
    avatarUrl: undefined,
  },
  role: 'Lead PI (Core Leadership)',
});

export const getContentfulEventDataObject = (
  isList: boolean = false,
): EventDataObject => ({
  ...getEventDataObject(isList),
  interestGroup: undefined,
  workingGroup: undefined,
  notes: '<p>These are the notes from the meeting</p>',
  presentation: '<p><iframe src="https://example.com"></iframe></p>',
  videoRecording:
    '<p><iframe src="https://player.vimeo.com/video/493052720"></iframe></p>',
  thumbnail: 'https://example.com',
  tags: [],
  ...(isList
    ? {}
    : {
        attendance: [
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
        ],
        preliminaryDataShared: [
          { team: { id: 'team-id-1' }, shared: true },
          { team: { id: 'team-id-2' }, shared: false },
        ],
      }),
});

export const getPreviousEventAttendanceGraphqlResponse =
  (): FetchPreviousEventAttendanceQuery => ({
    eventsCollection: {
      items: [
        {
          sys: { id: 'previous-event-id' },
          attendanceCollection: {
            total: 3,
            items: [
              { attended: true },
              { attended: false },
              { attended: true },
            ],
          },
        },
      ],
    },
  });

export const getContentfulEventResponse = (): EventResponse =>
  getEventDataObject();

export const getContentfulListEventDataObject = (): ListEventDataObject => ({
  total: 1,
  items: [getContentfulEventDataObject(true)],
});
export const getContentfulListEventResponse = (): ListEventResponse =>
  getContentfulListEventDataObject();

export const getEventDataObject = (
  isList: boolean = false,
): EventDataObject => ({
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
  recurring: false,
  tags: [],
  title: 'Example Event',
  startDateTimeZone: 'UTC',
  endDateTimeZone: 'UTC',
  notes: 'These are the notes from the meeting',
  notesUpdatedAt: '2010-10-01T08:00:04.000Z',
  videoRecording: '<embeded>video</embeded>',
  videoRecordingUpdatedAt: '2010-08-01T08:00:04.000Z',
  presentation: '<embeded>presentation</embeded>',
  presentationUpdatedAt: '2010-09-01T08:00:04.000Z',
  meetingMaterials: [
    {
      title: 'My additional link',
      url: 'https://link.pt/additional-material',
    },
  ],
  thumbnail: `https://www.contentful.com/api/assets/asap-crn/uuid-thumbnail-2`,
  calendar: {
    color: '#125A12',
    id: 'c_t92qa82jd702q1fkreoi0hf4hk@group.calendar.google.com',
    name: 'Tech 1 - Sequencing/omics',
    interestGroups: [],
    workingGroups: [],
  },
  interestGroup: getInterestGroupResponse(),
  workingGroup: getWorkingGroupResponse(),
  speakers: [getEventSpeakerUser()],
  relatedResearch: [
    {
      id: 'research-output-id',
      title: 'Research output title',
      type: '3D Printing',
      documentType: 'Article',
      teams: isList
        ? []
        : [
            {
              id: 'team-id-1',
              displayName: 'The team one',
            },
          ],
      workingGroups: isList
        ? []
        : [
            {
              id: 'wg-id',
              title: 'Working group name',
            },
          ],
    },
  ],
  relatedTutorials: [
    {
      id: 'tutorial-1',
      title: 'Tutorial 1',
      created: '2020-07-09T14:48:46.000Z',
    },
  ],
});

export const getEventResponse = (isList: boolean = false): EventResponse =>
  getEventDataObject(isList);

export const getListEventDataObject = (
  isReducedResponse: boolean = true,
): ListEventDataObject => ({
  total: 1,
  items: [getEventDataObject(isReducedResponse)],
});
export const getListEventResponse = (
  isReducedResponse: boolean = true,
): ListEventResponse => getListEventDataObject(isReducedResponse);

export const getEventCreateDataObject = (): EventCreateDataObject => ({
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
  hideMeetingLink: false,
});

export const getEventContentfulWebhookDetail = (
  id: string,
): WebhookDetail<ContentfulWebhookPayload<'events'>> => ({
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
        id: 'crn-3046',
        type: 'Link',
        linkType: 'Environment',
      },
    },
    contentType: {
      sys: {
        type: 'Link',
        linkType: 'ContentType',
        id: 'events',
      },
    },
    createdBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '2SHvngTJ24kxZGAPDJ8J1y',
      },
    },
    updatedBy: {
      sys: {
        type: 'Link',
        linkType: 'User',
        id: '2SHvngTJ24kxZGAPDJ8J1y',
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
    startDate: {
      'en-US': '2021-04-27T18:00:00Z',
    },
    status: {
      'en-US': 'Confirmed',
    },
    calendar: {
      'en-US': {
        sys: {
          type: 'Link',
          linkType: 'Entry',
          id: '7dca2b08-828b-44ee-9e57-7675ff3f6693',
        },
      },
    },
    hidden: {
      'en-US': false,
    },
    meetingLink: {
      'en-US':
        'https://zoom.us/j/96449436221?pwd=MXpTbVJvdzRuMkhZM2YyMWxubStJdz09',
    },
    hideMeetingLink: {
      'en-US': false,
    },
    thumbnail: {
      'en-US': null,
    },
    notesPermanentlyUnavailable: {
      'en-US': null,
    },
    notes: {
      'en-US': {
        data: {},
        content: [
          {
            data: {},
            content: [
              {
                data: {},
                marks: [],
                value: 'material!',
                nodeType: 'text',
              },
            ],
            nodeType: 'paragraph',
          },
        ],
        nodeType: 'document',
      },
    },
    notesUpdatedAt: {
      'en-US': null,
    },
    videoRecordingPermanentlyUnavailable: {
      'en-US': null,
    },
    videoRecording: {
      'en-US': null,
    },
    videoRecordingUpdatedAt: {
      'en-US': null,
    },
    presentationPermanentlyUnavailable: {
      'en-US': null,
    },
    presentation: {
      'en-US': null,
    },
    presentationUpdatedAt: {
      'en-US': null,
    },
    meetingMaterials: {
      'en-US': [],
    },
    meetingMaterialsPermanentlyUnavailable: {
      'en-US': null,
    },
    description: {
      'en-US':
        '<b>Chair:</b> Xiqun Chen<br><b>PM: </b>Pranay Srivastava (email&nbsp;<a href="mailto:psrivastava3@mgh.harvard.edu">psrivastava3@mgh.harvard.edu</a> for any enquiries)<br>Anyone from the ASAP Network is welcome to attend<br>&nbsp;  <br>Inflammation and Immune Regulation ASAP CRN Subgroup Meeting<br>Presenting Teams: Sulzer, Desjardins, Kordower<br><br>Agenda to follow',
    },
    startDateTimeZone: {
      'en-US': 'America/New_York',
    },
    endDate: {
      'en-US': '2021-04-27T19:30:00Z',
    },
    endDateTimeZone: {
      'en-US': 'America/New_York',
    },
    eventLink: {
      'en-US': null,
    },
    googleId: {
      'en-US': '76fmieuhgnm0c15k327uvvi4tt',
    },
  },
});

export const getEventContentfulEvent = (
  id: string,
  eventType: EventEvent,
): EventBridgeEvent<
  EventEvent,
  WebhookDetail<ContentfulWebhookPayload<'events'>>
> =>
  createEventBridgeEventMock(
    getEventContentfulWebhookDetail(id),
    eventType,
    id,
  );
