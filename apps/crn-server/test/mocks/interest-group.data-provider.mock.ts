import { InterestGroupDataProvider } from '../../src/data-providers/types';

export const interestGroupDataProviderMock = {
  fetch: jest.fn(),
  fetchById: jest.fn(),
  fetchCalendarId: jest.fn(),
  fetchIdByInterestGroupTeamId: jest.fn(),
} as unknown as jest.Mocked<InterestGroupDataProvider>;
