import { gp2 } from '@asap-hub/model';
import { addHours, subHours } from 'date-fns';
import { createCalendarResponse } from './calendars';

const topic = 'Some Topic';

export const createInternalSpeakerResponse = (
  itemIndex = 0,
): gp2.EventSpeaker => ({
  speaker: {
    id: `user-id-${itemIndex}`,
    firstName: 'John',
    lastName: 'Doe',
    displayName: `John Doe ${itemIndex}`,
  },
  topic,
});

export const createExternalSpeakerResponse = (): gp2.EventSpeaker => ({
  speaker: {
    name: 'John',
    orcid: '1234-1234-1234',
  },
  topic,
});

export const createSpeakerToBeAnnounced = (): gp2.EventSpeaker => ({
  speaker: undefined,
});

export const getSpeakers = (
  numberOfInternalSpeakers: number,
  numberOfExternalSpeakers: number,
  numberOfSpeakersToBeAnnounced: number,
): gp2.EventSpeaker[] => {
  const speakerList: gp2.EventSpeaker[] = [];

  for (let index = 0; index < numberOfInternalSpeakers; index += 1) {
    speakerList.push(createInternalSpeakerResponse(index));
  }

  for (let index = 0; index < numberOfExternalSpeakers; index += 1) {
    speakerList.push(createExternalSpeakerResponse());
  }

  for (let index = 0; index < numberOfSpeakersToBeAnnounced; index += 1) {
    speakerList.push(createSpeakerToBeAnnounced());
  }

  return speakerList;
};

export interface EventFixtureOptions {
  meetingMaterials?: number;
  numberOfInternalSpeakers?: number;
  numberOfExternalSpeakers?: number;
  numberOfSpeakersToBeAnnounced?: number;
  isEventInThePast?: boolean;
  customTitle?: string;
}

export const createEventResponse = (
  {
    meetingMaterials = 1,
    numberOfInternalSpeakers = 4,
    numberOfExternalSpeakers = 0,
    numberOfSpeakersToBeAnnounced = 0,
    isEventInThePast = false,
    customTitle = 'Event',
  }: EventFixtureOptions = {},
  itemIndex = 0,
): gp2.EventResponse => ({
  id: `event-${itemIndex}`,
  calendar: createCalendarResponse(itemIndex),
  startDate: new Date().toISOString(),
  startDateTimeZone: 'Europe/London',
  startDateTimestamp: new Date().getTime(),
  endDate: isEventInThePast
    ? subHours(new Date(), 2).toISOString()
    : addHours(new Date(), 1).toISOString(),
  endDateTimeZone: 'Europe/London',
  endDateTimestamp: isEventInThePast
    ? subHours(new Date(), 2).getTime()
    : addHours(new Date(), 1).getTime(),
  description: `Event ${itemIndex} description`,
  status: 'Confirmed',
  tags: [{ id: 'tag-1', name: '10X Genomics' }],
  title: `${customTitle} ${itemIndex}`,
  lastModifiedDate: new Date().toISOString(),
  meetingLink: 'https://example.com/meeting',
  inPerson: false,
  notes: 'Meeting notes go here',
  presentation: 'Presentation',
  videoRecording: 'Video Recording',
  meetingMaterials: Array.from({ length: meetingMaterials }).map((_, i) => ({
    title: `Material ${i + 1}`,
    url: `https://example.com/materials/${i}`,
  })),
  speakers: getSpeakers(
    numberOfInternalSpeakers,
    numberOfExternalSpeakers,
    numberOfSpeakersToBeAnnounced,
  ),
  eventTypes: [],
});

export const createListEventResponse = (
  items: number,
  options: EventFixtureOptions = {},
): gp2.ListEventResponse => ({
  total: items,
  items: Array.from({ length: items }, (_, itemIndex) =>
    createEventResponse(options, itemIndex),
  ),
});

export default createListEventResponse;
