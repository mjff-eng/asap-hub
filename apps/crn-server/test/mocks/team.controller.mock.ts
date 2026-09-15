import TeamController from '../../src/controllers/team.controller';

export const teamControllerMock = {
  fetch: jest.fn(),
  fetchPublicTeams: jest.fn(),
  fetchPublicTeamById: jest.fn(),
  fetchById: jest.fn(),
  fetchTeamIdByProjectId: jest.fn(),
  fetchAwardMetricsByTeamId: jest.fn(),
  update: jest.fn(),
} as unknown as jest.Mocked<TeamController>;
