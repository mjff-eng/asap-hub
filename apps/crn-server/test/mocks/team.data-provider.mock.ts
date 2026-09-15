import { getDataProviderMock } from './data-provider.mock';

export const teamDataProviderMock = {
  ...getDataProviderMock(),
  fetchPublicTeams: jest.fn(),
  fetchPublicTeamById: jest.fn(),
  fetchTeamIdByProjectId: jest.fn(),
  fetchAwardMetricsByTeamId: jest.fn(),
};
