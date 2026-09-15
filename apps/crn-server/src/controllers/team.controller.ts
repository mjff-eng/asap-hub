import { NotFoundError } from '@asap-hub/errors';
import {
  FetchPaginationOptions,
  FetchTeamsOptions,
  ListPublicTeamResponse,
  ListTeamAwardMetricsResponse,
  ListTeamResponse,
  TeamResponse,
  TeamTool,
} from '@asap-hub/model';
import { TeamDataProvider } from '../data-providers/types/teams.data-provider.types';
import { getCleanTools } from '../utils/team';

type FetchTeamOptions = {
  showTools: boolean;
};

export default class TeamController {
  teamDataProvider: TeamDataProvider;

  constructor(teamDataProvider: TeamDataProvider) {
    this.teamDataProvider = teamDataProvider;
  }

  // TODO: Remove this function once we have migrated all tools to projects
  async update(id: string, tools: TeamTool[]): Promise<TeamResponse> {
    const cleanTools = getCleanTools(tools);
    await this.teamDataProvider.update(id, { tools: cleanTools });

    return this.fetchById(id);
  }

  async fetch(options: FetchTeamsOptions): Promise<ListTeamResponse> {
    const { take = 8, skip = 0, search, filter, teamType, teamIds } = options;

    const { total, items } = await this.teamDataProvider.fetch({
      take,
      skip,
      search,
      filter,
      teamType,
      teamIds,
    });

    return {
      total,
      items,
    };
  }

  async fetchPublicTeams(
    options: FetchPaginationOptions,
  ): Promise<ListPublicTeamResponse> {
    const { take = 8, skip = 0 } = options;

    const { total, items } = await this.teamDataProvider.fetchPublicTeams({
      take,
      skip,
    });

    return {
      total,
      items,
    };
  }

  async fetchPublicTeamById(teamId: string): Promise<TeamResponse> {
    const team = await this.teamDataProvider.fetchPublicTeamById(teamId);

    if (!team) {
      throw new NotFoundError(undefined, `team with id ${teamId} not found`);
    }

    return team;
  }

  async fetchById(
    teamId: string,
    options?: FetchTeamOptions,
  ): Promise<TeamResponse> {
    const team = await this.teamDataProvider.fetchById(teamId);

    if (!team) {
      throw new NotFoundError(undefined, `team with id ${teamId} not found`);
    }

    if (options?.showTools === false) {
      return {
        ...team,
        tools: undefined,
      };
    }

    return team;
  }

  async fetchTeamIdByProjectId(projectId: string): Promise<string | null> {
    return this.teamDataProvider.fetchTeamIdByProjectId(projectId);
  }

  async fetchAwardMetricsByTeamId(
    teamId: string,
  ): Promise<ListTeamAwardMetricsResponse> {
    return this.teamDataProvider.fetchAwardMetricsByTeamId(teamId);
  }
}
