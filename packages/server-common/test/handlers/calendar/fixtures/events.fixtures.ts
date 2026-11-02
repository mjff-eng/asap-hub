import {
  EventDataObject,
  EventResponse,
  EventSpeakerUser,
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
  startMonth: '2009-12',
  meetingLink: 'https://zoom.com/room/123',
  hideMeetingLink: false,
  status: 'Confirmed',
  hidden: false,
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
  thumbnail: `api/assets/uuid-thumbnail-2`,
  calendar: {
    color: '#125A12',
    id: 'c_t92qa82jd702q1fkreoi0hf4hk@group.calendar.google.com',
    name: 'Tech 1 - Sequencing/omics',
    interestGroups: [],
    workingGroups: [],
  },
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
});

export const getEventResponse = (
  overrides: Partial<EventResponse> = {},
): EventResponse => ({ ...getEventDataObject(), ...overrides });
