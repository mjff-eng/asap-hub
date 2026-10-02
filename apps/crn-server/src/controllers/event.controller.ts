import { NotFoundError } from '@asap-hub/errors';
import {
  EventCreateRequest,
  EventResponse,
  EventUpdateDetailsRequest,
  EventUpdateRequest,
  FetchEventsOptions,
  ListEventResponse,
} from '@asap-hub/model';

import { EventDataProvider } from '../data-providers/types';

export default class EventController {
  constructor(private dataProvider: EventDataProvider) {}

  async fetch(options: FetchEventsOptions): Promise<ListEventResponse> {
    return this.dataProvider.fetch(options);
  }

  async fetchById(eventId: string): Promise<EventResponse> {
    const event = await this.dataProvider.fetchById(eventId);
    if (!event) {
      throw new NotFoundError(undefined, `Event with id ${eventId} not found`);
    }
    return event;
  }

  async create(event: EventCreateRequest): Promise<EventResponse> {
    const eventId = await this.dataProvider.create(event);
    return this.fetchById(eventId);
  }

  async update(
    eventId: string,
    event: EventUpdateRequest,
  ): Promise<EventResponse> {
    await this.dataProvider.update(eventId, event);
    return this.fetchById(eventId);
  }

  async updateEventDetails(
    eventId: string,
    data: EventUpdateDetailsRequest,
  ): Promise<EventResponse> {
    await this.dataProvider.updateEventDetails(eventId, data);
    return this.fetchById(eventId);
  }

  async fetchByGoogleId(googleId: string): Promise<EventResponse | null> {
    const events = await this.dataProvider.fetch({
      take: 1,
      filter: { googleId, hidden: true },
    });

    const [event] = events.items;

    // A match skipped by the data provider (its calendar is unpublished) must
    // not read as missing, or the Google Calendar sync creates a duplicate.
    if (!event && events.total > 0) {
      throw new Error(
        `Event with google id ${googleId} exists but could not be parsed`,
      );
    }

    return event || null;
  }
}
