import {
  EventResponse,
  EventSpeakerUser,
  EventStatus,
  gp2 as gp2Model,
} from '@asap-hub/model';

export const getEventSpeakerUser = (): EventSpeakerUser => ({
  team: {
    id: 'team-id-3',
    displayName: 'The team three',
    inactiveSince: '2022-10-24T11:00:00Z',
  },
  user: {
    id: 'user-id-3',
    firstName: 'Adam',
    lastName: 'Brown',
    displayName: 'Adam Brown',
    alumniSinceDate: undefined,
    avatarUrl: undefined,
  },
  role: 'Lead PI (Core Leadership)',
});
export const getEventResponse = ({
  baseUrl = 'http://a-base.url',
  appName = 'the-app',
} = {}): EventResponse => ({
  id: 'ec3086d4-aa64-4f30-a0f7-5c5b95ffbcca',
  description: 'This event is awesome',
  lastModifiedDate: '2021-05-14T14:48:46.000Z',
  endDate: '2009-12-24T16:30:54.000Z',
  endDateTimestamp: 1261672254,
  startDate: '2009-12-24T16:20:14.000Z',
  startDateTimestamp: 1261671614,
  startMonth: '2009-12',
  meetingLink: 'https://zoom.com/room/123',
  hideMeetingLink: false,
  status: 'Confirmed',
  tags: [],
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
  thumbnail: `${baseUrl}/api/assets/${appName}/uuid-thumbnail-2`,
  calendar: {
    color: '#125A12',
    id: 'c_t92qa82jd702q1fkreoi0hf4hk@group.calendar.google.com',
    name: 'Tech 1 - Sequencing/omics',
    interestGroups: [],
    workingGroups: [],
  },
  speakers: [getEventSpeakerUser()],
  relatedResearch: [],
});

export const getListEventResponse = () => ({
  total: 1,
  items: [getEventResponse()],
});
