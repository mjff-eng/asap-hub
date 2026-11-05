import { FetchOptions, ListResponse } from './common';
import { ResearchOutputType } from './research-output';
import { TeamDataObject, TeamRole, TeamType } from './team';
import { UserAward } from './user';

export type ProjectTool = {
  id?: string;
  name: string;
  description?: string;
  url: string;
};

export const projectStatuses = ['Active', 'Completed', 'Closed'] as const;
export type ProjectStatus = (typeof projectStatuses)[number];
export const isProjectStatus = (value: unknown): value is ProjectStatus =>
  (projectStatuses as readonly string[]).includes(value as string);

export const projectTypes = [
  'Discovery Project',
  'Resource Project',
  'Trainee Project',
] as const;

export type ProjectType = (typeof projectTypes)[number];

export const isProjectType = (value: unknown): value is ProjectType =>
  (projectTypes as readonly string[]).includes(value as string);

export type ResearchTag = {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
  readonly types?: ReadonlyArray<string>;
};

export const ProjectStatusRank: Record<ProjectStatus, number> = {
  Active: 1,
  Completed: 2,
  Closed: 3,
};

export type BaseProject = {
  readonly id: string;
  readonly title: string;
  readonly status: ProjectStatus;
  readonly statusRank: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly duration?: string;
  readonly tags: string[];
  readonly projectId?: string;
  readonly grantId?: string;
  readonly applicationNumber?: string;
  readonly contactEmail?: string;
  readonly researchTags?: ReadonlyArray<ResearchTag>;
  readonly originalGrant?: string;
  readonly supplementGrantDescription?: string;
  readonly tools?: ReadonlyArray<ProjectTool>;
};

export type ProjectMemberTeam = {
  readonly id: string;
  readonly displayName: string;
};

export type ProjectMember = {
  readonly id: string;
  readonly displayName: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly avatarUrl?: string;
  readonly role?: string;
  readonly email?: string;
  readonly alumniSinceDate?: string;
  readonly href?: string;
  readonly teams?: ReadonlyArray<ProjectMemberTeam>;
  readonly latestAward?: UserAward;
};

export type FundedTeam = Pick<
  TeamDataObject,
  'id' | 'displayName' | 'teamType' | 'researchTheme' | 'teamDescription'
>;

export type DiscoveryProject = BaseProject & {
  readonly projectType: 'Discovery Project';
  readonly researchTheme: string;
  readonly teamName: string;
  readonly teamId?: string;
  readonly inactiveSinceDate?: string;
  readonly fundedTeam?: FundedTeam;
};

export type ResourceProject = BaseProject & {
  readonly projectType: 'Resource Project';
  readonly resourceType: string;
  readonly isTeamBased: boolean;
  readonly teamName?: string;
  readonly teamId?: string;
  readonly members?: ReadonlyArray<ProjectMember>;
  readonly googleDriveLink?: string;
  readonly fundedTeam?: FundedTeam;
  readonly researchTheme?: string;
};

export type TraineeProject = BaseProject & {
  readonly projectType: 'Trainee Project';
  readonly members: ReadonlyArray<ProjectMember>;
};

export type Project = DiscoveryProject | ResourceProject | TraineeProject;

export const milestoneStatuses = [
  'Complete',
  'In Progress',
  'Pending',
  'Terminated',
] as const;

export type MilestoneStatus = (typeof milestoneStatuses)[number];

export type ArticleItem = {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly type?: ResearchOutputType;
};

export type Milestone = {
  readonly id: string;
  readonly description: string;
  readonly status: MilestoneStatus;
  readonly articleCount: number;
  /**
   * Optional comma-separated aim numbers for the Aims column (e.g. "1", "1,2", "2,3,4,5,6").
   * Stored as string for OpenSearch sorting.
   */
  readonly aims?: string;
};

// NOTE: this is going to be inferred from the collection
// of associated milestones in ticket https://asaphub.atlassian.net/browse/ASAP-1365
// If redundant, we can remove it, and use MilestoneStatus instead (though AimMilestoneStatus
// might be a better name)
export type AimStatus = 'Complete' | 'In Progress' | 'Pending' | 'Terminated';

export type Aim = {
  readonly id: string;
  readonly order: number; // feel free to remove this property if it can be inferred from the item's order in a given list
  readonly description: string;
  readonly status: AimStatus;
  readonly articleCount: number;
};

export const grantTypes = ['original', 'supplement'] as const;

export type GrantType = (typeof grantTypes)[number];

// Grant information types
export type OriginalGrantInfo = {
  readonly originalGrant: string;
  readonly proposalId?: string;
};

export type SupplementGrantInfo = {
  readonly grantTitle: string;
  readonly grantDescription?: string;
  readonly grantProposalId?: string;
  readonly grantStartDate?: string;
  readonly grantEndDate?: string;
  readonly aims?: ReadonlyArray<Aim>;
};

export type BaseProjectDetail = {
  readonly originalGrantProposalId?: string;
  readonly originalGrantAims?: ReadonlyArray<Aim>;
  readonly supplementGrant?: SupplementGrantInfo;
  readonly milestonesLastUpdated?: Partial<Record<GrantType, string>>;
};

export type CollaboratingTeamArticle = {
  readonly id: string;
  readonly title: string;
  readonly type?: ResearchOutputType;
};

export type CollaboratingTeam = {
  readonly id: string;
  readonly displayName: string;
  readonly teamType?: TeamType;
  readonly inactiveSince?: string;
  readonly articles: ReadonlyArray<CollaboratingTeamArticle>;
};

type CollaboratingTeams = {
  readonly collaboratingTeams?: ReadonlyArray<CollaboratingTeam>;
};

export type DiscoveryProjectDetail = DiscoveryProject &
  BaseProjectDetail &
  CollaboratingTeams & {
    readonly fundedTeam: FundedTeam;
  };

export type ResourceProjectDetail = ResourceProject &
  BaseProjectDetail &
  CollaboratingTeams & {
    readonly fundedTeam?: FundedTeam;
  };

export type TraineeProjectDetail = TraineeProject & BaseProjectDetail;

export type ProjectDetail =
  | DiscoveryProjectDetail
  | ResourceProjectDetail
  | TraineeProjectDetail;

// Data Provider types
export type ProjectDataObject = Project;
export type DiscoveryProjectDataObject = DiscoveryProject;
export type ResourceProjectDataObject = ResourceProject;
export type TraineeProjectDataObject = TraineeProject;

export type ProjectDetailDataObject = ProjectDetail;

export type ListProjectDataObject = ListResponse<ProjectDataObject>;

export const projectLeadTeamRoles = [
  'Project Manager',
  'Lead PI (Core Leadership)',
  'Co-PI (Core Leadership)',
  'Data Manager',
] as const;

export const projectLeadMemberRoles = [
  'Project Manager',
  'Lead PI',
  'Co-PI',
  'Data Manager',
] as const;

export const traineeProjectLeadRoles = ['Independent Project - Lead'] as const;

export const traineeProjectMentorRoles = [
  'Independent Project - Mentor',
] as const;

/**
 * Partitions Trainee Project members by role. `trainees` and `mentors` back the
 * two summary rows on the project header and card; `unassigned` holds members
 * with no role at all, listed in full member lists as "No role assigned".
 *
 * A member holding some other role — one that belongs to another project type,
 * or one retired from the content model — is in none of the three and stays out
 * of the project, which is how it behaved before `unassigned` existed.
 */
export const groupTraineeProjectMembers = <T extends { role?: string }>(
  members: ReadonlyArray<T>,
): { trainees: T[]; mentors: T[]; unassigned: T[] } => {
  const hasRoleIn = (roles: ReadonlyArray<string>) => (member: T) =>
    roles.includes(member.role ?? '');

  return {
    trainees: members.filter(hasRoleIn(traineeProjectLeadRoles)),
    mentors: members.filter(hasRoleIn(traineeProjectMentorRoles)),
    unassigned: members.filter((m) => !m.role),
  };
};

/**
 *
 * Determines if a user is a "lead" for a given project, controlling access
 * to features like editing milestone articles.
 *
 * For team-based projects (Discovery, team-based Resource): checks the user's
 * team role against projectLeadTeamRoles.
 *
 * For Trainee projects: checks if the user has the "Independent Project - Lead"
 * role in the project's members list.
 *
 * For user-based Resource projects (isTeamBased=false, no teamId): these have
 * a members array with roles like "Project Manager" or "Lead PI (Core
 * Leadership)". We check the user's role in project.members against
 * projectLeadTeamRoles. For example, a Resource Project not linked to a team
 * but with individual user members who hold PM or Lead PI roles.
 */
export const isProjectLead = (
  userId: string,
  userTeams: ReadonlyArray<{ id: string; role: TeamRole }>,
  project: Project,
): boolean => {
  // Team-based projects: Discovery always has teamId, Resource may have teamId
  if ('teamId' in project && project.teamId) {
    const userTeam = userTeams.find((t) => t.id === project.teamId);
    return (
      !!userTeam &&
      (projectLeadTeamRoles as readonly string[]).includes(userTeam.role)
    );
  }

  if (project.projectType === 'Trainee Project') {
    return project.members.some(
      (m) =>
        m.id === userId &&
        (traineeProjectLeadRoles as readonly string[]).includes(m.role ?? ''),
    );
  }

  // User-based Resource projects (no teamId, has members): check members
  // for project-level lead roles.
  if (
    project.projectType === 'Resource Project' &&
    !project.teamId &&
    project.members
  ) {
    return project.members.some(
      (m) =>
        m.id === userId &&
        (projectLeadMemberRoles as readonly string[]).includes(m.role ?? ''),
    );
  }

  return false;
};

export const projectHasLead = (project: Project): boolean => {
  if (project.projectType === 'Trainee Project') {
    return project.members.some((m) =>
      (traineeProjectLeadRoles as readonly string[]).includes(m.role ?? ''),
    );
  }

  if (
    project.projectType === 'Resource Project' &&
    !project.teamId &&
    project.members
  ) {
    return project.members.some((m) =>
      (projectLeadMemberRoles as readonly string[]).includes(m.role ?? ''),
    );
  }

  return false;
};

export const canPublishProjectOutput = (
  userId: string,
  userTeams: ReadonlyArray<{ id: string; role: TeamRole }>,
  project: Project,
): boolean => {
  if (isProjectLead(userId, userTeams, project)) {
    return true;
  }

  if ('teamId' in project && project.teamId) {
    return false;
  }

  return !projectHasLead(project);
};
/**
 * Determines if a user is a member of a project.
 *
 * For team-based projects (Discovery, team-based Resource): the user is a
 * member if they belong to the project's funded team. The funded team is
 * resolved from `teamId` or, when only the detail payload is available,
 * from `fundedTeam.id`.
 *
 * For individual-based projects (Trainee, user-based Resource): the user is a
 * member if they appear in the project's members list.
 */
export const isProjectMember = (
  userId: string,
  userTeams: ReadonlyArray<{ id: string }>,
  project: Project & Partial<{ fundedTeam: Pick<FundedTeam, 'id'> }>,
): boolean => {
  const fundedTeamId =
    ('teamId' in project ? project.teamId : undefined) ??
    project.fundedTeam?.id;
  if (fundedTeamId) {
    return userTeams.some((t) => t.id === fundedTeamId);
  }

  // Trainee members with no recognised role are listed on the project but do
  // not get member access, which is what they had before they were listed.
  if (project.projectType === 'Trainee Project') {
    const { trainees, mentors } = groupTraineeProjectMembers(project.members);
    return [...trainees, ...mentors].some((m) => m.id === userId);
  }

  if ('members' in project && project.members) {
    return project.members.some((m) => m.id === userId);
  }

  return false;
};

// Filter types
export type FetchProjectsFilter =
  | {
      readonly projectType?: ProjectType | ProjectType[];
      readonly status?: ProjectStatus | ProjectStatus[];
      readonly tags?: string[];
      readonly search?: string;
      readonly projectMembershipId?: never;
    }
  | {
      readonly projectMembershipId?: string;
      readonly projectType?: never;
      readonly status?: never;
      readonly tags?: never;
      readonly search?: never;
    };

// Response types
export type ProjectResponse = Project;
export type ListProjectResponse = ListProjectDataObject;

export type ListProjectMilestonesResponse = ListResponse<Milestone>;

export const milestoneSortOptions = ['aim_asc', 'aim_desc'] as const;
export type MilestoneSortOption = (typeof milestoneSortOptions)[number];

export type FetchProjectMilestonesOptions = FetchOptions & {
  grantType?: GrantType;
  sort?: MilestoneSortOption;
};

export type FetchProjectMilestonesExportOptions = {
  grantType?: GrantType;
  search?: string;
  filter?: string[];
  sort?: MilestoneSortOption;
};

export type ProjectMilestoneExportRow = {
  readonly projectName: string;
  readonly grantType: GrantType;
  readonly description: string;
  readonly relatedAimNumbers: string;
  readonly articlesDOI: string;
  readonly createdDate: string | null;
  readonly lastUpdated: string | null;
  readonly status: MilestoneStatus;
};

export type ProjectAimExportRow = {
  readonly projectName: string;
  readonly grantType: GrantType;
  readonly aimNumber: string;
  readonly description: string;
  readonly articlesDOI: string;
  readonly createdDate: string | null;
  readonly lastUpdated: string | null;
  readonly status: AimStatus;
};

export type ProjectMilestonesExportResponse = {
  readonly aims: ReadonlyArray<ProjectAimExportRow>;
  readonly milestones: ReadonlyArray<ProjectMilestoneExportRow>;
};

export type MilestoneCreateRequest = {
  readonly grantType: GrantType;
  readonly description: string;
  readonly status: MilestoneStatus;
  readonly aimIds: string[];
  readonly relatedArticleIds?: string[];
};

export type MilestoneUpdateRequest = {
  readonly status?: MilestoneStatus;
  readonly articleIds?: string[];
};
