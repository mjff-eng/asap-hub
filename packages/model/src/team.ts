import { FetchOptions, ListResponse } from './common';
import { LabResponse } from './lab';
import { ManuscriptResponse } from './manuscript';
import { ProjectStatus, ProjectType } from './project';
import { ResearchTagDataObject } from './research-tag';
import { UserAward } from './user';

export const piRole = [
  'Lead PI (Core Leadership)',
  'Co-PI (Core Leadership)',
  'Collaborating PI',
] as const;

export type TeamPIRole = (typeof piRole)[number];

export const teamRole = [
  ...piRole,
  'Project Manager',
  'Data Manager',
  'Key Personnel',
  'Scientific Advisory Board',
  'ASAP Staff',
  'Trainee',
] as const;

const teamType = ['Discovery Team', 'Resource Team'] as const;

export type TeamRole = (typeof teamRole)[number];

export const isPIRole = (role: unknown): role is TeamPIRole =>
  typeof role === 'string' && (piRole as readonly string[]).includes(role);

export type TeamTool = {
  id?: string;
  name: string;
  description?: string;
  url: string;
};

export type TeamType = (typeof teamType)[number];

export const isTeamType = (type: unknown): type is TeamType =>
  typeof type === 'string' && (teamType as readonly string[]).includes(type);

export const teamStatus = ['Active', 'Inactive'] as const;

export type TeamStatus = (typeof teamStatus)[number];

export const teamStatusRank: Record<TeamStatus, number> = {
  Active: 1,
  Inactive: 2,
};

export type FetchTeamsFilter = {
  status?: TeamStatus[];
  resourceType?: string[];
  researchTheme?: string[];
};

export interface TeamCreateRequest {
  displayName: string;
  inactiveSince?: string;
  applicationNumber: string;
  projectTitle: string;
  projectSummary?: string;
  proposalURL?: string;
}

export type TeamUpdateDataObject = {
  tools: TeamTool[];
};

export type TeamPatchRequest = TeamUpdateDataObject;

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  role: TeamRole;
  avatarUrl?: string;
  labs?: LabResponse[];
  alumniSinceDate?: string;
  inactiveSinceDate?: string;
  latestAward?: UserAward;
}

export const isActiveTeamMember = (
  member: Pick<TeamMember, 'alumniSinceDate' | 'inactiveSinceDate'>,
): boolean => !member.alumniSinceDate && !member.inactiveSinceDate;

export const countActiveUniqueMembers = (
  members: ReadonlyArray<
    Pick<TeamMember, 'id' | 'alumniSinceDate' | 'inactiveSinceDate'>
  >,
): number =>
  new Set(members.filter(isActiveTeamMember).map(({ id }) => id)).size;

export const teamHasActiveProjectManager = (
  members: ReadonlyArray<
    Pick<TeamMember, 'role' | 'alumniSinceDate' | 'inactiveSinceDate'>
  >,
): boolean =>
  members.some(
    (member) => member.role === 'Project Manager' && isActiveTeamMember(member),
  );

export type TeamManuscript = Pick<
  ManuscriptResponse,
  | 'id'
  | 'title'
  | 'url'
  | 'versions'
  | 'status'
  | 'count'
  | 'teamId'
  | 'impact'
  | 'categories'
> & {
  grantId: string;
};

export type TeamSupplementGrant = {
  title: string;
  description?: string;
  proposalURL?: string;
  startDate?: string;
  endDate?: string;
};

export type TeamDataObject = Omit<TeamCreateRequest, 'applicationNumber'> & {
  id: string;
  teamId?: string;
  grantId?: string;
  teamType: TeamType;
  tags: Pick<ResearchTagDataObject, 'id' | 'name'>[];
  members: TeamMember[];
  lastModifiedDate: string;
  pointOfContact?: string;
  tools?: TeamTool[];
  labCount: number;
  labs: LabResponse[];
  inactiveSince?: string;
  teamStatus: TeamStatus;
  statusRank?: number;
  linkedProjectId?: string;
  projectStatus?: ProjectStatus;
  supplementGrant?: TeamSupplementGrant;
  researchTheme?: string;
  resourceType?: string;
  projectType?: ProjectType;
  teamDescription?: string;
  resourceTitle?: string;
  resourceDescription?: string;
  resourceButtonCopy?: string;
  resourceContactEmail?: string;
  resourceLink?: string;
};

export type TeamCreateDataObject = {
  applicationNumber: string;
  displayName: string;
  inactiveSince?: string;
  researchOutputIds?: string[];
  projectSummary?: string;
  projectTitle: string;
  tools?: TeamTool[];
  teamId: string;
  grantId: string;
  teamType: TeamType;
};

export type TeamResponse = TeamDataObject;

export type FetchTeamsOptions = FetchOptions & {
  teamType?: TeamType;
  teamIds?: string[];
};

export type TeamListItemDataObject = Pick<
  TeamDataObject,
  | 'id'
  | 'displayName'
  | 'inactiveSince'
  | 'teamStatus'
  | 'statusRank'
  | 'projectTitle'
  | 'linkedProjectId'
  | 'teamType'
  | 'tags'
  | 'labCount'
  | 'researchTheme'
  | 'teamDescription'
  | 'projectType'
> & { memberCount: number; resourceType?: string };

export type ListTeamDataObject = ListResponse<TeamListItemDataObject>;

export type TeamListItemResponse = TeamListItemDataObject;

export type ListTeamResponse = ListResponse<TeamListItemResponse>;

export type TeamLeader = Pick<TeamMember, 'id' | 'avatarUrl' | 'displayName'>;
export type PublicTeamMember = Pick<
  TeamMember,
  'id' | 'avatarUrl' | 'role' | 'firstName' | 'lastName' | 'displayName'
> & {
  status: string;
};

export type PublicTeamResponse = {
  id: string;
  name: string;
  status: string;
  tags: string[];
  title: string;
  projectSummary?: string;
  researchTheme?: string;
  members: PublicTeamMember[];
};

export type PublicTeamListItemDataObject = {
  id: string;
  name: string;
  researchTheme?: string;
  activeTeamMembers: string[];
  activeInterestGroups: string[];
  inactiveTeamMembers: string[];
  noOfTeamMembers: number;
  teamLeaders: TeamLeader[];
};

export type ListPublicTeamDataObject =
  ListResponse<PublicTeamListItemDataObject>;

export type PublicTeamListItemResponse = PublicTeamListItemDataObject;

export type ListPublicTeamResponse = ListResponse<PublicTeamListItemResponse>;

export type TeamAwardMetricDataObject = {
  id: string;
  name: string;
  asapPhilosophy: string;
  metricDefinition: string;
  received: boolean;
};

export type ListTeamAwardMetricsDataObject =
  ListResponse<TeamAwardMetricDataObject>;

export type TeamAwardMetricResponse = TeamAwardMetricDataObject;

export type ListTeamAwardMetricsResponse =
  ListResponse<TeamAwardMetricResponse>;
