import { User } from '@asap-hub/auth';
import { createAuthUser } from '@asap-hub/fixtures';
import { FetchOptions } from '@asap-hub/model';
import { AuthHandler } from '@asap-hub/server-common';
import Boom from '@hapi/boom';
import supertest from 'supertest';
import { appFactory } from '../../src/app';
import * as fixtures from '../fixtures/interest-groups.fixtures';
import { getListTeamAwardMetricsResponse } from '../fixtures/teams.fixtures';
import {
  getListTeamResponse,
  getTeamResponse,
} from '../fixtures/teams.fixtures';
import { interestGroupControllerMock } from '../mocks/interest-group.controller.mock';
import { loggerMock } from '../mocks/logger.mock';
import { teamControllerMock } from '../mocks/team.controller.mock';

describe('/teams/ route', () => {
  const loggedUser: User = {
    ...createAuthUser(),
    teams: [
      {
        id: 'team-id-1',
        roles: ['Project Manager'],
      },
    ],
  };
  const getLoggedUser = jest.fn().mockReturnValue(loggedUser);
  const authHandlerMock: AuthHandler = (req, _res, next) => {
    req.loggedInUser = getLoggedUser();
    next();
  };
  const app = appFactory({
    interestGroupController: interestGroupControllerMock,
    teamController: teamControllerMock,
    authHandler: authHandlerMock,
    logger: loggerMock,
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /teams/{team_id}/interest-groups', () => {
    test('Should return 200 when no grups exist', async () => {
      interestGroupControllerMock.fetchByTeamId.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const response = await supertest(app).get('/teams/123/interest-groups');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        total: 0,
        items: [],
      });
    });

    test('Should return the results correctly', async () => {
      interestGroupControllerMock.fetchByTeamId.mockResolvedValueOnce(
        fixtures.listInterestGroupsResponse,
      );

      const response = await supertest(app).get('/teams/123/interest-groups');

      expect(response.body).toEqual(fixtures.listInterestGroupsResponse);
    });

    test('Should call the controller with the right parameters', async () => {
      interestGroupControllerMock.fetchByTeamId.mockResolvedValueOnce({
        items: [],
        total: 0,
      });
      const teamId = '123abcd';

      await supertest(app).get(`/teams/${teamId}/interest-groups`);

      expect(interestGroupControllerMock.fetchByTeamId).toHaveBeenCalledWith(
        teamId,
      );
    });
  });

  describe('GET /teams', () => {
    test('Should return 200 when no teams exist', async () => {
      teamControllerMock.fetch.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      const response = await supertest(app).get('/teams');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        total: 0,
        items: [],
      });
    });

    test('Should return the results correctly', async () => {
      teamControllerMock.fetch.mockResolvedValueOnce(getListTeamResponse());

      const response = await supertest(app).get('/teams');

      expect(response.body).toEqual(getListTeamResponse());
    });

    test('Should call the controller with the right parameters', async () => {
      teamControllerMock.fetch.mockResolvedValueOnce(getListTeamResponse());

      const params: FetchOptions = {
        take: 15,
        skip: 5,
        search: 'something',
        filter: ['one', 'two'],
      };

      await supertest(app).get('/teams').query(params);

      expect(teamControllerMock.fetch).toHaveBeenCalledWith(params);
    });

    describe('Parameter validation', () => {
      test('Should return a 400 error when additional properties exist', async () => {
        const response = await supertest(app).get('/teams').query({
          additionalField: 'some-data',
        });

        expect(response.status).toBe(400);
      });

      test('Should return a validation error when the arguments are not valid', async () => {
        const response = await supertest(app).get(`/teams`).query({
          take: 'invalid param',
        });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('GET /teams/{team_id}/award-metrics', () => {
    const awardMetrics = getListTeamAwardMetricsResponse();

    test('Should return the award metrics for a team member', async () => {
      teamControllerMock.fetchAwardMetricsByTeamId.mockResolvedValueOnce(
        awardMetrics,
      );

      const response = await supertest(app).get(
        '/teams/team-id-1/award-metrics',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(awardMetrics);
      expect(teamControllerMock.fetchAwardMetricsByTeamId).toHaveBeenCalledWith(
        'team-id-1',
      );
    });

    test('Should return the award metrics for staff who are not on the team', async () => {
      getLoggedUser.mockReturnValueOnce({ ...loggedUser, role: 'Staff' });
      teamControllerMock.fetchAwardMetricsByTeamId.mockResolvedValueOnce(
        awardMetrics,
      );

      const response = await supertest(app).get(
        '/teams/another-team/award-metrics',
      );

      expect(response.status).toBe(200);
    });

    test('Should return 403 for a user who is neither staff nor on the team', async () => {
      const response = await supertest(app).get(
        '/teams/another-team/award-metrics',
      );

      expect(response.status).toBe(403);
      expect(
        teamControllerMock.fetchAwardMetricsByTeamId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('GET /teams/{team_id}', () => {
    const teamResponse = getTeamResponse();
    test('Should return a 404 error when the team or members are not found', async () => {
      teamControllerMock.fetchById.mockRejectedValueOnce(Boom.notFound());

      const response = await supertest(app).get('/teams/123');

      expect(response.status).toBe(404);
    });

    test('Should return the result correctly', async () => {
      teamControllerMock.fetchById.mockResolvedValueOnce(teamResponse);

      const response = await supertest(app).get('/teams/123');

      expect(response.body).toEqual(teamResponse);
    });

    test('Should call the controller with the right parameters', async () => {
      const teamId = 'abc123';

      teamControllerMock.fetchById.mockResolvedValueOnce(teamResponse);

      await supertest(app).get(`/teams/${teamId}`);

      expect(teamControllerMock.fetchById).toHaveBeenCalledWith(teamId, {
        showTools: false,
      });
    });

    describe('Team tools', () => {
      test('Should ask the controller to hide the tools when the user is not part of the requested team', async () => {
        const teamId = 'abc123';

        teamControllerMock.fetchById.mockResolvedValueOnce(teamResponse);

        await supertest(app).get(`/teams/${teamId}`);

        expect(teamControllerMock.fetchById).toBeCalledWith(teamId, {
          showTools: false,
        });
      });

      test('Should ask the controller to display the tools when the user is part of the requested team', async () => {
        const teamId = loggedUser.teams[0]!.id;

        teamControllerMock.fetchById.mockResolvedValueOnce(teamResponse);

        await supertest(app).get(`/teams/${teamId}`);

        expect(teamControllerMock.fetchById).toBeCalledWith(teamId, {
          showTools: true,
        });
      });
    });
  });

  describe('PATCH /teams/{team_id}', () => {
    const teamResponse = getTeamResponse();
    test('Should return a 400 error when the payload is invalid', async () => {
      const response = await supertest(app).patch('/teams/123').send({
        tools: 'something',
      });

      expect(response.status).toBe(400);
    });

    test('Should return a 400 error when additional properties exist', async () => {
      const response = await supertest(app).patch('/teams/123').send({
        tools: [],
        additionalField: 'some-data',
      });

      expect(response.status).toBe(400);
    });

    test('Should return a 403 error when the user is not part of the the team', async () => {
      const response = await supertest(app).patch('/teams/not-my-team').send({
        tools: [],
      });

      expect(response.status).toBe(403);
    });

    test('Should return a 404 error when the team does not exist', async () => {
      teamControllerMock.update.mockRejectedValueOnce(Boom.notFound());

      const response = await supertest(app).patch('/teams/team-id-1').send({
        tools: [],
      });

      expect(response.status).toBe(404);
    });

    test('Should return the results correctly', async () => {
      teamControllerMock.update.mockResolvedValueOnce(teamResponse);

      const response = await supertest(app).patch('/teams/team-id-1').send({
        tools: [],
      });

      expect(response.body).toEqual(teamResponse);
    });

    test('Should call the controller with the right parameters', async () => {
      const teamId = 'team-id-1';
      const tools = [
        {
          url: 'https://example.com',
          name: 'good line',
        },
      ];

      await supertest(app).patch(`/teams/${teamId}`).send({
        tools,
      });

      expect(teamControllerMock.update).toBeCalledWith(teamId, tools);
    });
  });
});
