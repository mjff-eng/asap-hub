import {
  DataProvider,
  FetchTeamsOptions,
  ListPublicTeamDataObject,
  ListTeamAwardMetricsDataObject,
  TeamCreateDataObject,
  TeamDataObject,
  TeamListItemDataObject,
  TeamUpdateDataObject,
} from '@asap-hub/model';

export type TeamDataProvider = DataProvider<
  TeamDataObject,
  TeamListItemDataObject,
  FetchTeamsOptions,
  TeamCreateDataObject,
  null,
  TeamUpdateDataObject
> & {
  fetchPublicTeams: (
    options: FetchTeamsOptions,
  ) => Promise<ListPublicTeamDataObject>;
  fetchPublicTeamById: (id: string) => Promise<TeamDataObject | null>;
  fetchById: (id: string) => Promise<TeamDataObject | null>;
  fetchTeamIdByProjectId: (projectId: string) => Promise<string | null>;
  fetchAwardMetricsByTeamId: (
    teamId: string,
  ) => Promise<ListTeamAwardMetricsDataObject>;
};
