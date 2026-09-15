/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ListInterestGroupResponse,
  ListTeamAwardMetricsResponse,
  ListTeamResponse,
  TeamResponse,
  TeamType,
} from '@asap-hub/model';
import { validateFetchOptions } from '@asap-hub/server-common';
import Boom from '@hapi/boom';
import { Request, Response, Router } from 'express';
import InterestGroupController from '../controllers/interest-group.controller';
import TeamController from '../controllers/team.controller';
import {
  validateTeamParameters,
  validateTeamPatchRequest,
} from '../validation/team.validation';

export const teamRouteFactory = (
  interestGroupController: InterestGroupController,
  teamController: TeamController,
): Router => {
  const teamRoutes = Router();

  const buildTeamRouteHandler =
    ({ teamType }: { teamType?: TeamType }) =>
    async (req: Request, res: Response<ListTeamResponse>) => {
      const { query } = req;

      const options = validateFetchOptions(query);

      const result = await teamController.fetch({
        ...options,
        teamType,
      });

      res.json(result);
    };

  teamRoutes.get('/teams', buildTeamRouteHandler({}));

  teamRoutes.get(
    '/discovery-teams',
    buildTeamRouteHandler({ teamType: 'Discovery Team' }),
  );

  teamRoutes.get(
    '/resource-teams',
    buildTeamRouteHandler({ teamType: 'Resource Team' }),
  );

  teamRoutes.get<{ teamId: string }>(
    '/teams/:teamId',
    async (req, res: Response<TeamResponse>) => {
      const { params } = req;
      const { teamId } = validateTeamParameters(params);

      const showTools = !!req.loggedInUser?.teams.find(
        (team) => team.id === teamId,
      );

      const result = await teamController.fetchById(teamId, {
        showTools,
      });

      res.json(result);
    },
  );

  // TODO: Remove this route once we have migrated all tools to projects
  teamRoutes.patch<{ teamId: string }>(
    '/teams/:teamId',
    async (req, res: Response<TeamResponse>) => {
      const { body, params } = req;

      const { teamId } = validateTeamParameters(params);
      const { tools } = validateTeamPatchRequest(body);

      if (!req.loggedInUser!.teams.find(({ id }) => id === teamId)) {
        throw Boom.forbidden();
      }

      const result = await teamController.update(teamId, tools);

      res.json(result);
    },
  );

  teamRoutes.get<{ teamId: string }>(
    '/teams/:teamId/interest-groups',
    async (req, res: Response<ListInterestGroupResponse>) => {
      const { params } = req;
      const { teamId } = validateTeamParameters(params);

      const result = await interestGroupController.fetchByTeamId(teamId);

      res.json(result);
    },
  );

  teamRoutes.get<{ teamId: string }>(
    '/teams/:teamId/award-metrics',
    async (req, res: Response<ListTeamAwardMetricsResponse>) => {
      const { params, loggedInUser } = req;
      const { teamId } = validateTeamParameters(params);

      const isStaff = loggedInUser!.role === 'Staff';
      const isTeamMember = loggedInUser!.teams.some(({ id }) => id === teamId);
      if (!isStaff && !isTeamMember) {
        throw Boom.forbidden();
      }

      const result = await teamController.fetchAwardMetricsByTeamId(teamId);

      res.json(result);
    },
  );

  return teamRoutes;
};
