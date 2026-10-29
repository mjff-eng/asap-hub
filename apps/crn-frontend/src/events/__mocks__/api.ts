import { ClientSearchResponse } from '@asap-hub/algolia';
import {
  EventAttendeesFile,
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

export const getEventMonthCounts = jest.fn(
  async (): Promise<Record<string, number>> => ({}),
);

export const patchEvent = jest.fn(
  async (id: string): Promise<EventResponse> => ({
    ...createEventResponse(),
    id,
  }),
);

export const uploadAttendeesFile = jest.fn(
  async (_id: string, file: File): Promise<EventAttendeesFile> => ({
    id: `asset-${file.name}`,
    filename: file.name,
    url: `//assets.ctfassets.net/${file.name}`,
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

export const getSpeakerSearchHits = jest.fn(
  async (): Promise<
    ClientSearchResponse<'crn', 'user' | 'external-author'>['hits']
  > => [],
);
