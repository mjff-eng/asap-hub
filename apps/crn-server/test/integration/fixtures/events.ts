import { EventCreateDataObject } from './types';
import Chance from 'chance';
import { EventStatus } from '@asap-hub/model';

const chance = Chance();

export const getEventFixture = (
  props: Partial<EventCreateDataObject> = {},
): EventCreateDataObject => {
  return {
    lastUpdated: '2021-01-01T00:00:00.000Z',
    title: 'Event Title',
    description: 'This event will be good',
    startDate: '2021-02-23T19:32:00Z',
    startDateTimeZone: 'Europe/Lisbon',
    endDate: '2021-02-23T19:32:00Z',
    endDateTimeZone: 'Europe/Lisbon',
    status: 'Confirmed' as EventStatus,
    hidden: false,
    inPerson: false,
    calendar: chance.string(),
    googleId: chance.string(),
    ...props,
  };
};
