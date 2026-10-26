import { ClientSearchResponse } from '@asap-hub/algolia';
import {
  EventResponse,
  ListEventResponse,
  TeamListItemResponse,
} from '@asap-hub/model';
import {
  createEventResponse,
  createListEventResponse,
  createTeamListItemResponse,
} from '@asap-hub/fixtures';

export const getEvent = jest.fn(
  async (id: string): Promise<EventResponse> => ({
    ...createEventResponse(),
    id,
  }),
);

export const getEvents = jest.fn(
  async (): Promise<ListEventResponse> => ({
    ...createListEventResponse(2),
  }),
);

export const patchEvent = jest.fn(
  async (id: string): Promise<EventResponse> => ({
    ...createEventResponse(),
    id,
  }),
);

export const getTeamsForMatching = jest.fn(
  async (): Promise<TeamListItemResponse[]> => [createTeamListItemResponse()],
);

export const getAttendanceSearchHits = jest.fn(
  async (): Promise<
    ClientSearchResponse<'crn', 'interest-group' | 'team'>['hits']
  > => [],
);
