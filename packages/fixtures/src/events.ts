import {
  ReminderEventResponse,
  EventSpeakerExternalUser,
  EventSpeakerUser,
  EventSpeakerUserData,
  ListEventResponse,
  EventSpeaker,
  TeamResponse,
} from '@asap-hub/model';
import { addHours, subHours } from 'date-fns';

import { createCalendarResponse } from './calendars';
import { createInterestGroupResponse } from './interest-groups';

export const createSpeakerUserResponse = (
  itemIndex = 0,
): EventSpeakerUserData => ({
  id: `user-id-${itemIndex}`,
  firstName: 'John',
  lastName: 'Doe',
  displayName: `John Doe ${itemIndex}`,
});

export const createSpeakerTeamResponse = (
  itemIndex = 0,
): Pick<TeamResponse, 'displayName' | 'id'> => ({
  id: `team-id-${itemIndex}`,
  displayName: `The team ${itemIndex}`,
});

export const createSpeakersResponse = (itemIndex = 0): EventSpeakerUser => ({
  id: `event-speaker-id-${itemIndex}`,
  team: createSpeakerTeamResponse(itemIndex),
  user: createSpeakerUserResponse(itemIndex),
  role: `Genetics ${itemIndex}`,
});

export const createExternalSpeakerResponse = (
  itemIndex = 0,
): EventSpeakerExternalUser => ({
  id: `event-external-speaker-id-${itemIndex}`,
  externalUser: {
    name: `External user ${itemIndex}`,
  },
});

const getSpeakers = (
  numberOfSpeakers: number,
  numberOfExternalSpeakers: number,
  numberOfUnknownSpeakers: number,
): EventSpeaker[] => {
  const speakerList: EventSpeaker[] = [];

  for (let index = 0; index < numberOfSpeakers; index += 1) {
    speakerList.push(createSpeakersResponse(index));
  }

  for (let index = 0; index < numberOfExternalSpeakers; index += 1) {
    speakerList.push(createExternalSpeakerResponse(index));
  }

  for (let index = 0; index < numberOfUnknownSpeakers; index += 1) {
    speakerList.push({
      team: createSpeakerTeamResponse(index),
    });
  }

  return speakerList;
};

interface FixtureOptions {
  meetingMaterials?: number;
  numberOfSpeakers?: number;
  numberOfExternalSpeakers?: number;
  numberOfUnknownSpeakers?: number;
  isEventInThePast?: boolean;
  customTitle?: string;
}

export const createEventResponse = (
  {
    meetingMaterials = 1,
    numberOfSpeakers = 4,
    numberOfUnknownSpeakers = 1,
    numberOfExternalSpeakers = 1,
    isEventInThePast = false,
    customTitle = 'Event',
  }: FixtureOptions = {},
  itemIndex = 0,
): ReminderEventResponse => ({
  id: `event-${itemIndex}`,
  calendar: createCalendarResponse(
    { activeGroups: false, incompleteWorkingGroups: false },
    itemIndex,
  ),
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
  interestGroup: createInterestGroupResponse(),
  description: `Event ${itemIndex} description`,
  status: 'Confirmed',
  tags: [],
  title: `${customTitle} ${itemIndex}`,
  lastModifiedDate: new Date().toISOString(),
  meetingLink: 'https://example.com/meeting',
  hideMeetingLink: false,
  notes: 'Meeting notes go here',
  notesUpdatedAt: new Date().toISOString(),
  presentation: 'Presentation',
  videoRecording: 'Video Recording',
  videoRecordingUpdatedAt: new Date().toISOString(),
  presentationUpdatedAt: new Date().toISOString(),
  meetingMaterials: Array.from({ length: meetingMaterials }).map((_, i) => ({
    title: `Material ${i + 1}`,
    url: `https://example.com/materials/${i}`,
  })),
  speakers: getSpeakers(
    numberOfSpeakers,
    numberOfExternalSpeakers,
    numberOfUnknownSpeakers,
  ),
  relatedTutorials: [],
  relatedResearch: [],
});

export const createListEventResponse = (
  items: number,
  options: FixtureOptions = {},
): ListEventResponse => ({
  total: items,
  items: Array.from({ length: items }, (_, itemIndex) =>
    createEventResponse(options, itemIndex),
  ),
});

export default createListEventResponse;
