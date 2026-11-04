import {
  addLocaleToFields,
  Environment,
  FETCH_PROJECTS,
  FETCH_PROJECTS_BY_MEMBERSHIP_ID,
  FETCH_PROJECTS_BY_TEAM_ID,
  FETCH_PROJECTS_BY_USER_ID,
  FETCH_PROJECT_BY_ID,
  FETCH_TEAM_RESEARCH_OUTPUTS,
  FetchTeamResearchOutputsQuery,
  FetchTeamResearchOutputsQueryVariables,
  FetchProjectByIdQuery,
  FetchProjectByIdQueryVariables,
  FetchProjectsByMembershipIdQuery,
  FetchProjectsByMembershipIdQueryVariables,
  FetchProjectsByTeamIdQuery,
  FetchProjectsByTeamIdQueryVariables,
  FetchProjectsByUserIdQuery,
  FetchProjectsByUserIdQueryVariables,
  FetchProjectsQuery,
  FetchProjectsQueryVariables,
  GraphQLClient,
  patchAndPublish,
  ProjectsOrder,
  getLinkEntity,
  FETCH_PROJECT_MILESTONE_IDS,
  FetchProjectMilestoneIdsQuery,
  FetchProjectMilestoneIdsQueryVariables,
} from '@asap-hub/contentful';
import {
  Aim,
  AimStatus,
  CollaboratingTeam,
  CollaboratingTeamArticle,
  DiscoveryProject,
  FetchPaginationOptions,
  DiscoveryProjectDetail,
  FundedTeam,
  ListProjectDataObject,
  ProjectDataObject,
  ProjectDetailDataObject,
  ProjectMember,
  ProjectStatus,
  ProjectTool,
  ProjectType,
  ResearchOutputType,
  ResearchTag,
  TeamType,
  ResourceProject,
  ResourceProjectDetail,
  SupplementGrantInfo,
  TraineeProject,
  TraineeProjectDetail,
  ProjectStatusRank,
  FetchProjectMilestonesExportOptions,
  FetchProjectMilestonesOptions,
  GrantType,
  ListProjectMilestonesResponse,
  OpensearchHitsResponse,
  Milestone,
  MilestoneStatus,
  milestoneStatuses,
  MilestoneCreateRequest,
  ProjectAimExportRow,
  ProjectMilestoneExportRow,
  ProjectMilestonesExportResponse,
  getLatestUserAward,
  groupTraineeProjectMembers,
} from '@asap-hub/model';
import {
  cleanArray,
  parseUserDisplayName,
  OpensearchRequest,
} from '@asap-hub/server-common';
import { haveSameIds, getCleanProjectTools } from '../../utils/project';
import logger from '../../utils/logger';
import OpensearchProvider from '../opensearch.data-provider';

import {
  FetchProjectsOptions,
  ProjectDataProvider,
  ProjectUpdateDataObject,
} from '../types/projects.data-provider.types';
import {
  ProjectAimsDataObject,
  ProjectMilestonesDataObject,
} from '../../../scripts/opensearch/types';
import { deriveAimStatus } from '../../utils/aim-status';
import {
  aimNumbersAscSortScript,
  aimNumbersDescSortScript,
} from '../../utils/opensearch/aim-numbers-sort-scripts';
import { parseAwardsCollection } from '../transformers';

// Type guards for Contentful GraphQL responses
export type ProjectItem = NonNullable<FetchProjectByIdQuery['projects']>;

type ProjectsCollectionItem = NonNullable<
  NonNullable<FetchProjectsQuery['projectsCollection']>['items'][number]
>;

export type ProjectMembershipItem = NonNullable<
  NonNullable<ProjectItem['membersCollection']>['items'][number]
>;

type AimsCollectionItem = {
  sys: { id: string };
  description?: string | null;
  milestonesCollection?: {
    items: Array<{
      status?: string | null;
      relatedArticlesCollection?: { total: number } | null;
    } | null>;
  } | null;
};

export const parseContentfulAims = (
  items: Array<AimsCollectionItem | null> | undefined,
): Aim[] | undefined => {
  if (!items) return undefined;

  const aims = items
    .filter(
      (item): item is AimsCollectionItem =>
        item !== null && !!item.description?.trim(),
    )
    .map(
      (item, index) =>
        ({
          id: item.sys.id,
          order: index + 1,
          description: item.description?.trim() ?? '',
          status: deriveAimStatus(item.milestonesCollection?.items),
          articleCount: (item.milestonesCollection?.items ?? []).reduce(
            (sum: number, m) =>
              sum + (m?.relatedArticlesCollection?.total ?? 0),
            0,
          ),
        }) satisfies Aim,
    );

  return aims.length > 0 ? aims : undefined;
};

export type UserProjectMembershipItem = ProjectMembershipItem & {
  projectMember: Extract<
    NonNullable<ProjectMembershipItem['projectMember']>,
    { __typename: 'Users' }
  >;
};

const isUserMembership = <T extends ProjectMembershipItem>(
  membership: T,
): membership is T & UserProjectMembershipItem =>
  membership.projectMember?.__typename === 'Users';

// Parse project member from Contentful membership
export const parseProjectUserMember = (
  membership: UserProjectMembershipItem,
): ProjectMember => {
  const { projectMember } = membership;

  const memberAwards = cleanArray(projectMember.teamsCollection?.items).map(
    (teamMembership) => ({ awards: parseAwardsCollection(teamMembership) }),
  );

  return {
    id: projectMember.sys.id,
    displayName: parseUserDisplayName(
      projectMember.firstName || '',
      projectMember.lastName || '',
      undefined,
      projectMember.nickname || '',
    ),
    firstName: projectMember.firstName || undefined,
    lastName: projectMember.lastName || undefined,
    avatarUrl: projectMember.avatar?.url || undefined,
    role: membership.role || undefined,
    email: projectMember.email || undefined,
    alumniSinceDate: projectMember.alumniSinceDate || undefined,
    latestAward: getLatestUserAward(memberAwards),
  };
};

export const parseProjectTeamMember = (
  membership: ProjectMembershipItem,
): ProjectMember => {
  const { projectMember } = membership;

  if (!projectMember || projectMember.__typename !== 'Teams') {
    return {
      id: `unknown-team-${membership.sys?.id ?? 'missing'}`,
      displayName: '',
    };
  }

  return {
    id: projectMember.sys.id,
    displayName: projectMember.displayName || '',
  };
};

export const processTraineeProjectMembers = (
  members: ProjectMembershipItem[],
): ProjectMember[] => {
  const userMembers = members
    .filter(isUserMembership)
    .map((m) => parseProjectUserMember(m));

  const { trainees, mentors, unassigned } =
    groupTraineeProjectMembers(userMembers);

  return [...trainees, ...mentors, ...unassigned];
};

// Parse Contentful project to model format
export const parseContentfulProject = (
  item: ProjectsCollectionItem,
): ProjectDataObject => {
  const status = (item.status || '') as ProjectStatus;

  // Parse research tags with full metadata
  const researchTagsArray = cleanArray(
    item.researchTagsCollection?.items || [],
  );
  const tags = researchTagsArray.map((tag) => tag.name || '');
  const researchTags: ResearchTag[] = researchTagsArray.map((tag) => ({
    id: tag.sys.id,
    name: tag.name || '',
    category: tag.category || undefined,
    types: tag.types ? cleanArray(tag.types) : undefined,
  }));

  const tools: ProjectTool[] = cleanArray(
    item.toolsCollection?.items || [],
  ).reduce((acc: ProjectTool[], tool) => {
    if (!tool || !tool.name || !tool.url) {
      return acc;
    }
    return [
      ...acc,
      {
        id: tool.sys?.id,
        name: tool.name,
        url: tool.url,
        description: tool.description ?? undefined,
      },
    ];
  }, []);

  const baseProject = {
    id: item.sys.id,
    title: item.title,
    status,
    statusRank: ProjectStatusRank[status],
    startDate: item.startDate,
    endDate: item.endDate,
    tags,
    researchTags,
    projectId: item.projectId || undefined,
    grantId: item.grantId || undefined,
    applicationNumber: item.applicationNumber || undefined,
    contactEmail: item.contactEmail || undefined,
    projectType: item.projectType as ProjectType,
    originalGrant: item.originalGrant || '',
    supplementGrantDescription: item.supplementGrant?.description || '',
    tools: tools.length > 0 ? tools : undefined,
  };

  const members = cleanArray(item.membersCollection?.items || []);

  switch (item.projectType) {
    case 'Discovery Project': {
      const team = members.find((m) => m.projectMember?.__typename === 'Teams');
      const teamMember = team?.projectMember;

      if (teamMember?.__typename === 'Teams') {
        return {
          ...baseProject,
          researchTheme: teamMember.researchTheme?.name || '',
          teamName: teamMember.displayName || '',
          teamId: teamMember.sys?.id,
          inactiveSinceDate: teamMember.inactiveSince || undefined,
        } as DiscoveryProject;
      }

      // Fallback if no team found
      return {
        ...baseProject,
        researchTheme: '',
        teamName: '',
      } as DiscoveryProject;
    }

    case 'Resource Project': {
      const team = members.find((m) => m.projectMember?.__typename === 'Teams');
      const isTeamBased = !!team;

      if (isTeamBased && team?.projectMember?.__typename === 'Teams') {
        const teamMember = team.projectMember;
        const teamMembers = members
          .filter((m) => m.projectMember?.__typename === 'Teams')
          .map((m) => parseProjectTeamMember(m));

        return {
          ...baseProject,
          resourceType: item.resourceType?.name || '',
          isTeamBased: true,
          teamName: teamMember.displayName || '',
          teamId: teamMember.sys?.id,
          googleDriveLink: item.googleDriveLink || undefined,
          members: teamMembers,
          researchTheme: teamMember.researchTheme?.name || undefined,
        } as ResourceProject;
      }

      const userMembers = members
        .filter(isUserMembership)
        .map((m) => parseProjectUserMember(m));

      return {
        ...baseProject,
        resourceType: item.resourceType?.name || '',
        isTeamBased: false,
        members: userMembers,
        googleDriveLink: item.googleDriveLink || undefined,
      } as ResourceProject;
    }

    case 'Trainee Project': {
      const allMembers = processTraineeProjectMembers(members);

      return {
        ...baseProject,
        members: allMembers,
      } as TraineeProject;
    }

    default:
      throw new Error(`Unknown project type: ${item.projectType}`);
  }
};
type ProjectResearchOutputItem = {
  sys: { id: string };
  title?: string | null;
  documentType?: string | null;
  type?: string | null;
  teamsCollection?: {
    items: Array<{
      sys: { id: string };
      displayName?: string | null;
      teamType?: string | null;
      inactiveSince?: string | null;
    } | null>;
  } | null;
};

type ProjectMemberWithLinkedResearchOutputs = NonNullable<
  ProjectMembershipItem['projectMember']
> & {
  linkedFrom?: {
    researchOutputsCollection?: {
      total?: number | null;
      items: Array<ProjectResearchOutputItem | null>;
    };
  };
};

const getResearchOutputItemsFromProjectMember = (
  projectMember: NonNullable<ProjectMembershipItem['projectMember']>,
): ProjectResearchOutputItem[] => {
  const memberWithLinkedFrom =
    projectMember as ProjectMemberWithLinkedResearchOutputs;
  return cleanArray(
    memberWithLinkedFrom.linkedFrom?.researchOutputsCollection?.items,
  );
};

const getResearchOutputsTotalFromProjectMember = (
  projectMember: NonNullable<ProjectMembershipItem['projectMember']>,
): number => {
  const memberWithLinkedFrom =
    projectMember as ProjectMemberWithLinkedResearchOutputs;
  return memberWithLinkedFrom.linkedFrom?.researchOutputsCollection?.total ?? 0;
};

export const parseCollaboratingTeams = (
  researchOutputItems: ProjectResearchOutputItem[],
  fundedTeamId: string,
): CollaboratingTeam[] => {
  const teamsById = new Map<
    string,
    {
      id: string;
      displayName: string;
      teamType?: TeamType;
      inactiveSince?: string;
      articles: CollaboratingTeamArticle[];
    }
  >();

  researchOutputItems
    .filter((ro) => ro.documentType === 'Article')
    .forEach((ro) => {
      const article: CollaboratingTeamArticle = {
        id: ro.sys.id,
        title: ro.title || '',
        type: (ro.type as ResearchOutputType | null) ?? undefined,
      };

      const coauthors = cleanArray(ro.teamsCollection?.items).filter(
        (team) => team.sys.id !== fundedTeamId,
      );

      coauthors.forEach((team) => {
        const existing = teamsById.get(team.sys.id);
        if (existing) {
          existing.articles.push(article);
        } else {
          teamsById.set(team.sys.id, {
            id: team.sys.id,
            displayName: team.displayName || '',
            teamType: (team.teamType as TeamType | null) ?? undefined,
            inactiveSince: team.inactiveSince || undefined,
            articles: [article],
          });
        }
      });
    });

  return Array.from(teamsById.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
};

// Parse Contentful project to ProjectDetail format with all additional fields
export const parseContentfulProjectDetail = (
  item: ProjectItem,
): ProjectDetailDataObject => {
  const baseProject = parseContentfulProject(item);
  const { projectType } = baseProject;

  const originalGrantProposalId = item.proposal?.sys.id || undefined;

  const supplementGrant: SupplementGrantInfo | undefined = item.supplementGrant
    ? {
        grantTitle: item.supplementGrant.title || '',
        grantDescription: item.supplementGrant.description || '',
        grantProposalId: item.supplementGrant.proposal?.sys.id || undefined,
        grantStartDate: item.supplementGrant.startDate || undefined,
        grantEndDate: item.supplementGrant.endDate || undefined,
      }
    : undefined;

  const members = cleanArray(item.membersCollection?.items || []);

  switch (projectType) {
    case 'Discovery Project': {
      const team = members.find((m) => m.projectMember?.__typename === 'Teams');
      const teamMember = team?.projectMember;

      if (teamMember?.__typename === 'Teams') {
        // Parse funded team
        const fundedTeam: FundedTeam = {
          id: teamMember.sys?.id,
          displayName: teamMember.displayName || '',
          teamType: 'Discovery Team',
          researchTheme: teamMember.researchTheme?.name || undefined,
          teamDescription: teamMember.teamDescription || undefined,
        };

        // Parse collaborating teams from funded team's research outputs
        const researchOutputItems =
          getResearchOutputItemsFromProjectMember(teamMember);
        const collaboratingTeams = parseCollaboratingTeams(
          researchOutputItems,
          teamMember.sys.id,
        );

        return {
          ...baseProject,
          originalGrantProposalId,
          supplementGrant,
          fundedTeam,
          collaboratingTeams:
            collaboratingTeams.length > 0 ? collaboratingTeams : undefined,
        } as DiscoveryProjectDetail;
      }

      // Fallback if no team found
      return {
        ...baseProject,
        originalGrantProposalId,
        supplementGrant,
      } as DiscoveryProjectDetail;
    }

    case 'Resource Project': {
      const team = members.find((m) => m.projectMember?.__typename === 'Teams');
      const isTeamBased = !!team;

      if (isTeamBased && team?.projectMember?.__typename === 'Teams') {
        const teamMember = team.projectMember;
        const fundedTeam: FundedTeam | undefined = {
          id: teamMember.sys?.id,
          displayName: teamMember.displayName || '',
          teamType: 'Resource Team',
          researchTheme: teamMember.researchTheme?.name || undefined,
          teamDescription: teamMember.teamDescription || undefined,
        };

        // Parse collaborating teams from funded team's research outputs
        const resourceResearchOutputItems =
          getResearchOutputItemsFromProjectMember(teamMember);
        const resourceCollaboratingTeams = parseCollaboratingTeams(
          resourceResearchOutputItems,
          teamMember.sys.id,
        );

        return {
          ...baseProject,
          originalGrantProposalId,
          supplementGrant,
          fundedTeam,
          researchTheme: fundedTeam?.researchTheme || undefined,
          collaboratingTeams:
            resourceCollaboratingTeams.length > 0
              ? resourceCollaboratingTeams
              : undefined,
        } as ResourceProjectDetail;
      }

      // Parse user members for non-team-based projects
      const userMembers: ProjectMember[] = members
        .filter(isUserMembership)
        .map((m) => parseProjectUserMember(m));

      return {
        ...baseProject,
        originalGrantProposalId,
        supplementGrant,
        members: userMembers.length > 0 ? userMembers : undefined,
      } as ResourceProjectDetail;
    }

    case 'Trainee Project': {
      const allMembers = processTraineeProjectMembers(members);

      return {
        ...baseProject,
        originalGrantProposalId,
        supplementGrant,
        members: allMembers,
      } as TraineeProjectDetail;
    }

    // istanbul ignore next - validated by parseContentfulProject
    default:
      throw new Error(`Unknown project type: ${item.projectType}`);
  }
};

const createAndPublishProjectTools = (
  environment: Environment,
  tools: ProjectTool[],
) =>
  Promise.all(
    tools.map(async (tool) => {
      const { id, ...toolFields } = tool;
      const entry = id
        ? await environment
            .getEntry(id)
            .then((e: Awaited<ReturnType<typeof environment.getEntry>>) => {
              e.fields = addLocaleToFields(toolFields);
              return e.update();
            })
        : await environment.createEntry('externalTools', {
            fields: addLocaleToFields(toolFields),
          });
      return entry.publish();
    }),
  );

export class ProjectContentfulDataProvider implements ProjectDataProvider {
  constructor(
    private contentfulClient: GraphQLClient,
    private getRestClient?: () => Promise<Environment>,
    private opensearchProvider?: OpensearchProvider,
  ) {}

  private async fetchMilestonesLastUpdated(
    projectId: string,
    grantType: 'original' | 'supplement',
  ): Promise<string | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const response = await this.opensearchProvider!.search({
      index: 'project-milestones',
      body: {
        query: {
          bool: {
            filter: [{ term: { projectId } }, { term: { grantType } }],
          },
        },
        aggs: {
          last_milestone_update: { max: { field: 'lastDate' } },
        },
        size: 0,
      } satisfies OpensearchRequest,
    });

    const agg = response.aggregations?.last_milestone_update as
      | { value_as_string?: string }
      | undefined;

    return agg?.value_as_string;
  }

  private async fetchAimsByProjectId(
    projectId: string,
    grantType: 'original' | 'supplement',
  ): Promise<
    Array<{
      id: string;
      description: string;
      status: string;
      articleCount: number;
    }>
  > {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const response = await this.opensearchProvider!.search({
      index: 'project-aims',
      body: {
        query: {
          bool: {
            filter: [{ term: { projectId } }, { term: { grantType } }],
          },
        },
        sort: [{ aimOrder: { order: 'asc', missing: '_last' } }],
        size: 50,
      } satisfies OpensearchRequest,
    });

    return (
      (
        (response.hits?.hits as unknown as Array<{
          _source: {
            id: string;
            description: string;
            status: string;
            articleCount: number;
          };
        }>) ?? []
      )
        // eslint-disable-next-line no-underscore-dangle
        .map((hit) => hit._source)
    );
  }

  private async fetchOpenSearchMilestoneIds(
    projectId: string,
  ): Promise<string[]> {
    if (!this.opensearchProvider) {
      throw new Error(
        'Opensearch Provider not configured for ProjectContentfulDataProvider',
      );
    }

    const response = (await this.opensearchProvider.search({
      index: 'project-milestones',
      body: {
        query: {
          bool: {
            filter: [{ term: { projectId } }],
          },
        },
        size: 100,
        _source: ['id'],
      } satisfies OpensearchRequest,
    })) as unknown as OpensearchHitsResponse<{ id: string }>;

    const hits = response.hits?.hits ?? [];

    // eslint-disable-next-line no-underscore-dangle
    return hits.map((hit) => hit._source.id);
  }

  private async fetchContentfulMilestoneIds(
    projectId: string,
  ): Promise<string[]> {
    const { projects } = await this.contentfulClient.request<
      FetchProjectMilestoneIdsQuery,
      FetchProjectMilestoneIdsQueryVariables
    >(FETCH_PROJECT_MILESTONE_IDS, {
      projectId,
    });

    if (!projects) return [];

    const ids = new Set<string>();

    projects.originalGrantAimsCollection?.items?.forEach((aim) => {
      aim?.milestonesCollection?.items?.forEach((m) => {
        if (m?.sys?.id) ids.add(m.sys.id);
      });
    });

    projects.supplementGrant?.aimsCollection?.items?.forEach((aim) => {
      aim?.milestonesCollection?.items?.forEach((m) => {
        if (m?.sys?.id) ids.add(m.sys.id);
      });
    });

    return [...ids];
  }

  /**
   * Page size for the funded team's linked research outputs. Matches the
   * inline projection in FETCH_PROJECT_BY_ID and stays under Contentful's
   * 100k query-complexity budget (50 ROs * 10 teamsCollection items each).
   */
  private static readonly RESEARCH_OUTPUTS_PAGE_SIZE = 50;

  /**
   * If the funded team has more research outputs than fit in the first page
   * inlined on FETCH_PROJECT_BY_ID, fetch the remaining pages and recompute
   * collaboratingTeams over the full set. No extra requests are made when
   * the first page already contains everything.
   */
  private async augmentCollaboratingTeams(
    projects: NonNullable<FetchProjectByIdQuery['projects']>,
    baseResult: ProjectDetailDataObject,
  ): Promise<ProjectDetailDataObject> {
    const members = cleanArray(projects.membersCollection?.items || []);
    const teamMember = members.find(
      (m) => m.projectMember?.__typename === 'Teams',
    )?.projectMember;
    if (!teamMember || teamMember.__typename !== 'Teams') return baseResult;

    const firstPageItems = getResearchOutputItemsFromProjectMember(teamMember);
    const total = getResearchOutputsTotalFromProjectMember(teamMember);
    const pageSize = ProjectContentfulDataProvider.RESEARCH_OUTPUTS_PAGE_SIZE;

    if (total <= firstPageItems.length) return baseResult;

    const fundedTeamId = teamMember.sys.id;
    const extraPageRequests: Array<Promise<FetchTeamResearchOutputsQuery>> = [];
    for (let skip = pageSize; skip < total; skip += pageSize) {
      extraPageRequests.push(
        this.contentfulClient.request<
          FetchTeamResearchOutputsQuery,
          FetchTeamResearchOutputsQueryVariables
        >(FETCH_TEAM_RESEARCH_OUTPUTS, {
          teamId: fundedTeamId,
          limit: pageSize,
          skip,
        }),
      );
    }

    const extraResponses = await Promise.all(extraPageRequests);
    const extraItems = extraResponses.flatMap((r) =>
      cleanArray(r.teams?.linkedFrom?.researchOutputsCollection?.items),
    );

    const allItems = [
      ...firstPageItems,
      ...(extraItems as ProjectResearchOutputItem[]),
    ];
    const collaboratingTeams = parseCollaboratingTeams(allItems, fundedTeamId);

    return {
      ...baseResult,
      collaboratingTeams:
        collaboratingTeams.length > 0 ? collaboratingTeams : undefined,
    } as ProjectDetailDataObject;
  }

  async fetchById(id: string): Promise<ProjectDataObject | null> {
    try {
      const [
        { projects },
        originalAimsHits,
        supplementAimsHits,
        originalMilestonesLastUpdated,
        supplementMilestonesLastUpdated,
      ] = await Promise.all([
        this.contentfulClient.request<
          FetchProjectByIdQuery,
          FetchProjectByIdQueryVariables
        >(FETCH_PROJECT_BY_ID, { id }),
        this.fetchAimsByProjectId(id, 'original'),
        this.fetchAimsByProjectId(id, 'supplement'),
        this.fetchMilestonesLastUpdated(id, 'original'),
        this.fetchMilestonesLastUpdated(id, 'supplement'),
      ]);

      if (!projects) {
        return null;
      }

      const toAims = (
        hits: Array<{
          id: string;
          description: string;
          status: string;
          articleCount: number;
        }>,
      ): ReadonlyArray<Aim> | undefined => {
        if (hits.length === 0) return undefined;
        return hits.map((hit, index) => ({
          id: hit.id,
          order: index + 1,
          description: hit.description,
          status: hit.status as AimStatus,
          articleCount: hit.articleCount,
        }));
      };

      const baseResult = parseContentfulProjectDetail(projects);
      const augmentedResult = await this.augmentCollaboratingTeams(
        projects,
        baseResult,
      );

      const originalGrantAims = toAims(originalAimsHits);
      const supplementGrant = baseResult.supplementGrant
        ? {
            ...baseResult.supplementGrant,
            aims: toAims(supplementAimsHits),
          }
        : undefined;

      const milestonesLastUpdated = {
        ...(originalMilestonesLastUpdated && {
          original: originalMilestonesLastUpdated,
        }),
        ...(supplementMilestonesLastUpdated && {
          supplement: supplementMilestonesLastUpdated,
        }),
      };

      return {
        ...augmentedResult,
        originalGrantAims,
        supplementGrant,
        milestonesLastUpdated:
          Object.keys(milestonesLastUpdated).length > 0
            ? milestonesLastUpdated
            : undefined,
      } as ProjectDetailDataObject;
    } catch (error) {
      const err = error as Error & {
        response?: { errors?: unknown };
      };
      logger.error(
        `Failed to fetch project by id: ${err?.message ?? String(error)}`,
        {
          id,
          message: err?.message,
          stack: err?.stack,
          gqlErrors: err?.response?.errors,
        },
      );
      return null;
    }
  }

  async fetch(options: FetchProjectsOptions): Promise<ListProjectDataObject> {
    const { take = 10, skip = 0, search, filter } = options;

    if (filter?.projectMembershipId) {
      const { projectMembership } = await this.contentfulClient.request<
        FetchProjectsByMembershipIdQuery,
        FetchProjectsByMembershipIdQueryVariables
      >(FETCH_PROJECTS_BY_MEMBERSHIP_ID, {
        membershipId: filter.projectMembershipId,
        // It's unlikely that one membership belongs to many projects, but for completeness sake I'm using a safe limit.
        limit: 20,
      });

      if (!projectMembership?.linkedFrom?.projectsCollection?.items) {
        return {
          total: 0,
          items: [],
        };
      }

      const projects =
        projectMembership.linkedFrom.projectsCollection.items.filter(
          (project): project is NonNullable<typeof project> => project !== null,
        );

      const paginatedItems = projects.slice(skip, skip + take);

      return {
        total: projects.length,
        items: paginatedItems.map(parseContentfulProject),
      };
    }

    const searchTerms = (search || '').split(' ').filter(Boolean);
    const searchQuery = searchTerms.length
      ? {
          OR: [
            ...searchTerms.map((term) => ({
              title_contains: term,
            })),
            ...searchTerms.map((term) => ({
              researchTags: { name_contains: term },
            })),
            ...searchTerms.map((term) => ({
              resourceType: { name_contains: term },
            })),
          ],
        }
      : {};

    const projectTypeQuery = filter?.projectType
      ? {
          projectType_in: Array.isArray(filter.projectType)
            ? filter.projectType
            : [filter.projectType],
        }
      : {};

    const statusQuery = filter?.status
      ? {
          status_in: Array.isArray(filter.status)
            ? filter.status
            : [filter.status],
        }
      : {};

    const { projectsCollection } = await this.contentfulClient.request<
      FetchProjectsQuery,
      FetchProjectsQueryVariables
    >(FETCH_PROJECTS, {
      limit: take,
      skip,
      order: [ProjectsOrder.SysFirstPublishedAtDesc],
      where: {
        ...searchQuery,
        ...projectTypeQuery,
        ...statusQuery,
      },
    });

    if (!projectsCollection?.items) {
      return {
        total: 0,
        items: [],
      };
    }

    return {
      total: projectsCollection.total,
      items: cleanArray<ProjectsCollectionItem>(projectsCollection.items).map(
        parseContentfulProject,
      ),
    };
  }

  async fetchByTeamId(
    teamId: string,
    options: FetchPaginationOptions,
  ): Promise<ListProjectDataObject> {
    const { take = 10, skip = 0 } = options;

    const { teams } = await this.contentfulClient.request<
      FetchProjectsByTeamIdQuery,
      FetchProjectsByTeamIdQueryVariables
    >(FETCH_PROJECTS_BY_TEAM_ID, {
      teamId,
      limit: 100, // Fetch all memberships, deduplicate in memory as a team may have more than one role per project.
    });

    if (!teams?.linkedFrom?.projectMembershipCollection?.items) {
      return {
        total: 0,
        items: [],
      };
    }

    // Extract projects from memberships and deduplicate by project ID
    const projectMap = new Map<string, ProjectsCollectionItem>();
    const memberships =
      teams.linkedFrom.projectMembershipCollection.items.filter(
        (membership): membership is NonNullable<typeof membership> =>
          membership !== null,
      );
    for (const membership of memberships) {
      const projects = membership.linkedFrom?.projectsCollection?.items || [];
      for (const project of projects) {
        if (project && !projectMap.has(project.sys.id)) {
          projectMap.set(project.sys.id, project);
        }
      }
    }

    const uniqueProjects = Array.from(projectMap.values());

    // Apply pagination in memory on deduplicated projects
    const paginatedItems = uniqueProjects.slice(skip, skip + take);

    return {
      total: uniqueProjects.length,
      items: paginatedItems.map(parseContentfulProject),
    };
  }

  async update(id: string, update: ProjectUpdateDataObject): Promise<void> {
    if (!this.getRestClient) {
      throw new Error(
        'REST client not configured for ProjectContentfulDataProvider',
      );
    }
    const environment = await this.getRestClient();
    const project = await environment.getEntry(id);

    const { tools } = update;
    const cleanTools = getCleanProjectTools(tools);
    const incomingToolIds = cleanTools
      .map((tool: ProjectTool) => tool.id)
      .filter((toolId): toolId is string => !!toolId);

    const currentToolsLinks = project.fields.tools
      ? project.fields.tools['en-US']
      : [];
    const currentToolIds = currentToolsLinks.map(
      (link: { sys: { id: string } }) => link.sys.id,
    );

    const toolsToDelete = currentToolIds.filter(
      (toolId: string) => !incomingToolIds.includes(toolId),
    );

    await Promise.all(
      toolsToDelete.map(async (toolId: string) => {
        const entry = await environment.getEntry(toolId);
        await entry.unpublish();
        await entry.delete();
      }),
    );

    const publishedTools = await createAndPublishProjectTools(
      environment,
      cleanTools,
    );

    await patchAndPublish(project, {
      tools: publishedTools.map((tool: { sys: { id: string } }) => ({
        sys: {
          type: 'Link',
          linkType: 'Entry',
          id: tool.sys.id,
        },
      })),
    });
  }

  async fetchByUserId(
    userId: string,
    options: FetchPaginationOptions,
  ): Promise<ListProjectDataObject> {
    const { take = 10, skip = 0 } = options;

    const { users } = await this.contentfulClient.request<
      FetchProjectsByUserIdQuery,
      FetchProjectsByUserIdQueryVariables
    >(FETCH_PROJECTS_BY_USER_ID, {
      userId,
      limit: 100, // Fetch all memberships, deduplicate in memory as a user may have more than one role per project.
    });

    if (!users?.linkedFrom?.projectMembershipCollection?.items) {
      return {
        total: 0,
        items: [],
      };
    }

    // Extract projects from memberships and deduplicate by project ID
    const projectMap = new Map<string, ProjectsCollectionItem>();
    const memberships =
      users.linkedFrom.projectMembershipCollection.items.filter(
        (membership): membership is NonNullable<typeof membership> =>
          membership !== null,
      );
    for (const membership of memberships) {
      const projects = membership.linkedFrom?.projectsCollection?.items || [];
      for (const project of projects) {
        if (project && !projectMap.has(project.sys.id)) {
          projectMap.set(project.sys.id, project);
        }
      }
    }

    const uniqueProjects = Array.from(projectMap.values());

    // Apply pagination in memory on deduplicated projects
    const paginatedItems = uniqueProjects.slice(skip, skip + take);

    return {
      total: uniqueProjects.length,
      items: paginatedItems.map(parseContentfulProject),
    };
  }

  async fetchProjectMilestones(
    id: string,
    options: FetchProjectMilestonesOptions,
  ): Promise<ListProjectMilestonesResponse> {
    if (!this.opensearchProvider) {
      throw new Error(
        'Opensearch Provider not configured for ProjectContentfulDataProvider',
      );
    }
    const {
      take = 10,
      skip = 0,
      grantType,
      search,
      filter,
      sort = 'aim_asc',
    } = options;
    const normalizedSearch = search?.trim();
    const statusFilters = (filter ?? []).filter(
      (value): value is MilestoneStatus =>
        milestoneStatuses.includes(value as MilestoneStatus),
    );
    const filters = cleanArray([
      { term: { projectId: id } },
      grantType ? { term: { grantType } } : undefined,
      statusFilters.length ? { terms: { status: statusFilters } } : undefined,
    ]);

    const isDescAimsSort = sort === 'aim_desc';
    const sortScriptSource = isDescAimsSort
      ? aimNumbersDescSortScript
      : aimNumbersAscSortScript;

    const response = (await this.opensearchProvider.search({
      index: 'project-milestones',
      body: {
        query: {
          bool: {
            filter: filters,
            ...(normalizedSearch
              ? {
                  must: [
                    {
                      match: {
                        description: {
                          query: normalizedSearch,
                          fuzziness: 'AUTO',
                          operator: 'and',
                        },
                      },
                    },
                  ],
                }
              : {}),
          },
        },
        sort: [
          {
            _script: {
              type: 'string',
              order: 'asc',
              script: { source: sortScriptSource },
            },
          },
        ],
        from: skip,
        size: take,
      } satisfies OpensearchRequest,
    })) as unknown as OpensearchHitsResponse<ProjectMilestonesDataObject>;

    const hits = response.hits?.hits ?? [];

    const items: Milestone[] = hits.map((hit) => {
      const {
        _source: { aimNumbers, status, ...fields },
      } = hit;

      return {
        ...fields,
        aims: aimNumbers,
        status: status as MilestoneStatus,
      };
    });

    return {
      total: response.hits?.total?.value || 0,
      items,
    };
  }

  private formatAimNumbers(aimNumbers: string | undefined | null): string {
    return (aimNumbers ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => `A${value}`)
      .join('; ');
  }

  async exportProjectMilestones(
    id: string,
    options: FetchProjectMilestonesExportOptions,
  ): Promise<ProjectMilestonesExportResponse> {
    if (!this.opensearchProvider) {
      throw new Error(
        'Opensearch Provider not configured for ProjectContentfulDataProvider',
      );
    }
    const { grantType, search, filter, sort = 'aim_asc' } = options;
    const normalizedSearch = search?.trim();
    const statusFilters = (filter ?? []).filter(
      (value): value is MilestoneStatus =>
        milestoneStatuses.includes(value as MilestoneStatus),
    );

    const hasTableFilters = !!normalizedSearch || statusFilters.length > 0;

    const milestoneFilters = cleanArray([
      { term: { projectId: id } },
      grantType ? { term: { grantType } } : undefined,
      statusFilters.length ? { terms: { status: statusFilters } } : undefined,
    ]);

    const isDescAimsSort = sort === 'aim_desc';
    const sortScriptSource = isDescAimsSort
      ? aimNumbersDescSortScript
      : aimNumbersAscSortScript;

    const milestonesResponse = (await this.opensearchProvider.search({
      index: 'project-milestones',
      body: {
        query: {
          bool: {
            filter: milestoneFilters,
            ...(normalizedSearch
              ? {
                  must: [
                    {
                      match: {
                        description: {
                          query: normalizedSearch,
                          fuzziness: 'AUTO',
                          operator: 'and',
                        },
                      },
                    },
                  ],
                }
              : {}),
          },
        },
        sort: [
          {
            _script: {
              type: 'string',
              order: 'asc',
              script: { source: sortScriptSource },
            },
          },
        ],
        from: 0,
        size: 10000,
      } satisfies OpensearchRequest,
    })) as unknown as OpensearchHitsResponse<ProjectMilestonesDataObject>;

    const milestoneHits = milestonesResponse.hits?.hits ?? [];
    const milestones: ProjectMilestoneExportRow[] = milestoneHits.map((hit) => {
      // eslint-disable-next-line no-underscore-dangle
      const source = hit._source;
      return {
        projectName: source.projectName,
        grantType: source.grantType as GrantType,
        description: source.description,
        relatedAimNumbers: this.formatAimNumbers(source.aimNumbers),
        articlesDOI: source.articlesDOI ?? '',
        createdDate: source.createdDate,
        lastUpdated: source.lastDate,
        status: source.status as MilestoneStatus,
      };
    });

    const aimsFilter = cleanArray([
      { term: { projectId: id } },
      grantType ? { term: { grantType } } : undefined,
    ]);

    const aimsResponse = (await this.opensearchProvider.search({
      index: 'project-aims',
      body: {
        query: {
          bool: {
            filter: aimsFilter,
          },
        },
        sort: [{ aimOrder: { order: 'asc', missing: '_last' } }],
        from: 0,
        size: 1000,
      } satisfies OpensearchRequest,
    })) as unknown as OpensearchHitsResponse<ProjectAimsDataObject>;

    const aimHits = aimsResponse.hits?.hits ?? [];
    // eslint-disable-next-line no-underscore-dangle
    const aimSources = aimHits.map((hit) => hit._source);

    const referencedAimNumbers = hasTableFilters
      ? new Set(
          milestones.flatMap((m) =>
            m.relatedAimNumbers
              .split(';')
              .map((value) => value.trim().replace(/^A/, ''))
              .filter(Boolean),
          ),
        )
      : null;

    const aims: ProjectAimExportRow[] = aimSources
      .filter((source) =>
        referencedAimNumbers
          ? referencedAimNumbers.has(String(source.aimOrder))
          : true,
      )
      .map((source) => ({
        projectName: source.projectName,
        grantType: source.grantType as GrantType,
        aimNumber: `A${source.aimOrder}`,
        description: source.description,
        articlesDOI: source.articlesDOI ?? '',
        createdDate: source.createdDate,
        lastUpdated: source.lastDate,
        status: source.status as ProjectAimExportRow['status'],
      }));

    return { aims, milestones };
  }

  async createMilestone(
    data: MilestoneCreateRequest,
    userId: string,
  ): Promise<string> {
    if (!this.getRestClient) {
      throw new Error('REST client not available');
    }

    const environment = await this.getRestClient();

    const articleIds = data.relatedArticleIds ?? [];
    const hasArticles = articleIds.length > 0;
    const now = new Date();

    const milestoneEntry = await environment.createEntry('milestones', {
      fields: addLocaleToFields({
        description: data.description,
        status: data.status,
        relatedArticles: articleIds.map((id: string) => getLinkEntity(id)),
        statusUpdatedAt: now,
        statusUpdatedBy: getLinkEntity(userId),
        ...(hasArticles && {
          outputsLinkedAt: now,
          outputsLinkedBy: getLinkEntity(userId),
        }),
      }),
    });

    await milestoneEntry.publish();

    await Promise.all(
      data.aimIds.map(async (aimId) => {
        const aimEntry = await environment.getEntry(aimId);
        const currentMilestones = aimEntry.fields.milestones?.['en-US'] || [];

        await patchAndPublish(aimEntry, {
          milestones: [
            ...currentMilestones,
            getLinkEntity(milestoneEntry.sys.id),
          ],
        });
      }),
    );

    return milestoneEntry.sys.id;
  }

  async isProjectMilestonesSynced(projectId: string): Promise<boolean> {
    const [contentfulIds, osIds] = await Promise.all([
      this.fetchContentfulMilestoneIds(projectId),
      this.fetchOpenSearchMilestoneIds(projectId),
    ]);

    return haveSameIds(contentfulIds, osIds);
  }
}
