import { NotFoundError } from '@asap-hub/errors';
import Teams from '../../src/controllers/team.controller';
import {
  getListTeamAwardMetricsDataObject,
  getPublicTeamListItemDataObject,
  getTeamDataObject,
  getTeamResponse,
} from '../fixtures/teams.fixtures';

import { teamDataProviderMock } from '../mocks/team.data-provider.mock';

describe('Team Controller', () => {
  const teamController = new Teams(teamDataProviderMock);

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Fetch method', () => {
    test('Should pass both filter and teamType to data provider', async () => {
      teamDataProviderMock.fetch.mockResolvedValueOnce({
        total: 1,
        items: [getTeamDataObject()],
      });

      await teamController.fetch({
        filter: ['Active'],
        teamType: 'Resource Team',
      });

      expect(teamDataProviderMock.fetch).toBeCalledWith({
        filter: ['Active'],
        search: undefined,
        skip: 0,
        take: 8,
        teamType: 'Resource Team',
      });
    });
  });

  describe('FetchPublicTeams method', () => {
    test('Should return the teams', async () => {
      const publicTeam = getPublicTeamListItemDataObject();
      teamDataProviderMock.fetchPublicTeams.mockResolvedValue({
        total: 1,
        items: [publicTeam],
      });
      const result = await teamController.fetchPublicTeams({});

      expect(result).toEqual({ items: [publicTeam], total: 1 });
    });

    test('Should return empty list when there are no teams', async () => {
      teamDataProviderMock.fetchPublicTeams.mockResolvedValue({
        total: 0,
        items: [],
      });
      const result = await teamController.fetchPublicTeams({});

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('FetchPublicTeamById method', () => {
    test('Should throw when team is not found', async () => {
      teamDataProviderMock.fetchPublicTeamById.mockResolvedValueOnce(null);

      await expect(
        teamController.fetchPublicTeamById('not-found'),
      ).rejects.toThrow(NotFoundError);
    });

    test('Should return the team when it finds it', async () => {
      teamDataProviderMock.fetchPublicTeamById.mockResolvedValueOnce(
        getTeamDataObject(),
      );
      const result = await teamController.fetchPublicTeamById('team-id');

      expect(result).toEqual(getTeamResponse());
    });
  });

  describe('Fetch-by-ID method', () => {
    test('Should throw when team is not found', async () => {
      teamDataProviderMock.fetchById.mockResolvedValueOnce(null);

      await expect(teamController.fetchById('not-found')).rejects.toThrow(
        NotFoundError,
      );
    });

    test('Should return the team when it finds it', async () => {
      teamDataProviderMock.fetchById.mockResolvedValueOnce(getTeamDataObject());
      const result = await teamController.fetchById('team-id');

      expect(result).toEqual(getTeamResponse());
    });

    test('Should not display the team tools if the parameter is set to false', async () => {
      const teamDataObject = getTeamDataObject();
      teamDataObject.tools = [
        {
          name: 'tool name',
          url: 'tool url',
        },
      ];
      teamDataProviderMock.fetchById.mockResolvedValueOnce(getTeamDataObject());
      const result = await teamController.fetchById('team-id', {
        showTools: false,
      });

      expect(result.tools).toBeUndefined();
    });
  });

  describe('fetchTeamIdByProjectId method', () => {
    test('Should return null when team is not found', async () => {
      teamDataProviderMock.fetchTeamIdByProjectId.mockResolvedValueOnce(null);
      const result = await teamController.fetchTeamIdByProjectId('not-found');

      expect(result).toEqual(null);
    });

    test('Should return the team id when found', async () => {
      const teamId = 'team-id-1';
      teamDataProviderMock.fetchTeamIdByProjectId.mockResolvedValueOnce(teamId);
      const result =
        await teamController.fetchTeamIdByProjectId('project-id-1');

      expect(result).toEqual(teamId);
    });
  });

  describe('Update method', () => {
    const teamTools = [
      {
        name: 'tool name',
        url: 'tool url',
      },
      {
        name: 'tool name',
        url: 'tool url',
      },
    ];

    test('Should return the newly updated user', async () => {
      const mockResponse = getTeamDataObject();
      teamDataProviderMock.fetchById.mockResolvedValue(mockResponse);
      const result = await teamController.update('user-id', teamTools);

      expect(result).toEqual(mockResponse);
    });

    test('Should call the data provider with input data', async () => {
      teamDataProviderMock.fetchById.mockResolvedValue(getTeamDataObject());

      await teamController.update('user-id', teamTools);

      expect(teamDataProviderMock.update).toHaveBeenCalledWith('user-id', {
        tools: teamTools,
      });
    });

    test('Should remove description from the payload when its an empty string', async () => {
      const teamToolsEmptyDescription = [
        {
          url: 'https://example.com',
          name: 'good link',
          description: '',
        },
      ];
      teamDataProviderMock.fetchById.mockResolvedValue(getTeamDataObject());

      await teamController.update('user-id', teamToolsEmptyDescription);

      const expectedTools = [
        {
          url: 'https://example.com',
          name: 'good link',
        },
      ];
      expect(teamDataProviderMock.update).toHaveBeenCalledWith('user-id', {
        tools: expectedTools,
      });
    });
  });

  describe('FetchAwardMetricsByTeamId method', () => {
    test('Should return the award metrics from the data provider', async () => {
      const awardMetrics = getListTeamAwardMetricsDataObject();
      teamDataProviderMock.fetchAwardMetricsByTeamId.mockResolvedValueOnce(
        awardMetrics,
      );

      const result = await teamController.fetchAwardMetricsByTeamId('team-id');

      expect(result).toEqual(awardMetrics);
      expect(
        teamDataProviderMock.fetchAwardMetricsByTeamId,
      ).toHaveBeenCalledWith('team-id');
    });
  });
});
