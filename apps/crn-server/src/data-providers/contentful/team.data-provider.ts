import {
  addLocaleToFields,
  Environment,
  FetchPublicTeamByIdQuery,
  FetchPublicTeamByIdQueryVariables,
  FetchPublicTeamsQuery,
  FetchPublicTeamsQueryVariables,
  FetchTeamByIdQuery,
  FetchTeamByIdQueryVariables,
  FetchTeamIdByProjectIdQuery,
  FetchTeamIdByProjectIdQueryVariables,
  FetchTeamProjectByIdQuery,
  FetchTeamProjectByIdQueryVariables,
  FetchTeamsQuery,
  FetchTeamsQueryVariables,
  FetchTeamAwardMetricsQuery,
  FetchTeamAwardMetricsQueryVariables,
  FETCH_PROJECT_BY_TEAM_ID,
  FETCH_PUBLIC_TEAM_BY_ID,
  FETCH_PUBLIC_TEAMS,
  FETCH_TEAMS,
  FETCH_TEAM_AWARD_METRICS,
  FETCH_TEAM_BY_ID,
  FETCH_TEAM_ID_BY_PROJECT_ID,
  GraphQLClient,
  patchAndPublish,
  TeamsOrder,
} from '@asap-hub/contentful';
import {
  FetchPaginationOptions,
  FetchTeamsOptions,
  LabResponse,
  ListPublicTeamDataObject,
  ListTeamAwardMetricsDataObject,
  ListTeamDataObject,
  ProjectStatus,
  ProjectType,
  PublicTeamListItemDataObject,
  TeamDataObject,
  TeamLeader,
  TeamListItemDataObject,
  TeamMember,
  TeamRole,
  TeamSupplementGrant,
  TeamTool,
  TeamType,
  TeamUpdateDataObject,
  countActiveUniqueMembers,
  isPIRole,
  teamStatusRank,
  getLatestUserAward,
} from '@asap-hub/model';
import { cleanArray, parseUserDisplayName } from '@asap-hub/server-common';
import { DateTime } from 'luxon';

import { parseAwardsCollection, sortMembers } from '../transformers';
import { TeamDataProvider } from '../types/teams.data-provider.types';
import { parseResearchTags } from './research-tag.data-provider';
import { getCleanTools } from '../../utils/team';

export type TeamByIdItem = NonNullable<
  NonNullable<FetchTeamByIdQuery['teams']>
>;

export type TeamProjectItem = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<
          NonNullable<
            NonNullable<
              NonNullable<FetchTeamProjectByIdQuery['teams']>
            >['linkedFrom']
          >['projectMembershipCollection']
        >['items'][number]
      >['linkedFrom']
    >['projectsCollection']
  >['items'][number]
>;

export type MembershipTeamById = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<FetchTeamByIdQuery['teams']>['linkedFrom']
    >['teamMembershipCollection']
  >['items'][number]
>;

export type TeamItem = NonNullable<
  NonNullable<FetchTeamsQuery['teamsCollection']>['items'][number]
>;

type PublicTeamItem = NonNullable<
  NonNullable<FetchPublicTeamsQuery['teamsCollection']>['items'][number]
>;

type PublicTeamMembership = NonNullable<
  NonNullable<
    NonNullable<PublicTeamItem['linkedFrom']>['teamMembershipCollection']
  >['items'][number]
>;

export type PublicTeamByIdItem = NonNullable<
  NonNullable<FetchPublicTeamByIdQuery['teams']>
>;

type PublicTeamByIdMembership = NonNullable<
  NonNullable<
    NonNullable<PublicTeamByIdItem['linkedFrom']>['teamMembershipCollection']
  >['items'][number]
>;

type PublicTeamByIdProjectItem = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<
          NonNullable<
            NonNullable<
              PublicTeamByIdItem['linkedFrom']
            >['projectMembershipCollection']
          >['items'][number]
        >['linkedFrom']
      >['projectsCollection']
    >['items'][number]
  >
>;

type TeamInterestGroupItem = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<
          NonNullable<
            PublicTeamItem['linkedFrom']
          >['interestGroupsTeamsCollection']
        >['items'][number]
      >['linkedFrom']
    >['interestGroupsCollection']
  >['items'][number]
>;

export type Membership = NonNullable<
  NonNullable<
    NonNullable<TeamItem['linkedFrom']>['teamMembershipCollection']
  >['items'][number]
>;

export type ProjectMember = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<FetchTeamIdByProjectIdQuery['projects']>['membersCollection']
    >['items'][number]
  >['projectMember']
> & { __typename?: string };
const getTeamStatusQuery = (filter: FetchTeamsOptions['filter']) => {
  if (!filter || filter.length === 0) {
    return {};
  }

  const hasActive = filter.includes('Active');
  const hasInactive = filter.includes('Inactive');

  if (hasActive && hasInactive) {
    return {}; // retrieve all teams
  }

  if (hasActive) {
    return { inactiveSince_exists: false };
  }

  if (hasInactive) {
    return { inactiveSince_exists: true };
  }

  return {};
};

export class TeamContentfulDataProvider implements TeamDataProvider {
  constructor(
    private contentfulClient: GraphQLClient,
    private getRestClient: () => Promise<Environment>,
  ) {}
  async create(): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async fetch(options: FetchTeamsOptions): Promise<ListTeamDataObject> {
    const { take = 8, skip = 0, search, filter, teamType, teamIds } = options;

    const searchTerms = (search || '').split(' ').filter(Boolean);
    const searchQuery = searchTerms.length
      ? {
          OR: [
            ...searchTerms.map((term) => ({
              displayName_contains: term,
            })),
          ],
        }
      : {};

    const teamStatusQuery = getTeamStatusQuery(filter);

    const { teamsCollection } = await this.contentfulClient.request<
      FetchTeamsQuery,
      FetchTeamsQueryVariables
    >(FETCH_TEAMS, {
      limit: take,
      skip,
      order: [TeamsOrder.DisplayNameAsc],
      where: {
        ...searchQuery,
        ...teamStatusQuery,
        ...(teamType ? { teamType } : {}),
        ...(teamIds && teamIds.length > 0 ? { sys: { id_in: teamIds } } : {}),
      },
    });

    if (!teamsCollection?.items) {
      return {
        total: 0,
        items: [],
      };
    }

    return {
      total: teamsCollection?.total,
      items: teamsCollection?.items
        .filter((x): x is TeamItem => x !== null)
        .map(parseContentfulGraphQlTeamListItem),
    };
  }

  async fetchPublicTeams(
    options: FetchPaginationOptions,
  ): Promise<ListPublicTeamDataObject> {
    const { take = 8, skip = 0 } = options;

    const { teamsCollection } = await this.contentfulClient.request<
      FetchPublicTeamsQuery,
      FetchPublicTeamsQueryVariables
    >(FETCH_PUBLIC_TEAMS, {
      limit: take,
      skip,
      order: [TeamsOrder.DisplayNameAsc],
    });

    if (!teamsCollection?.items) {
      return {
        total: 0,
        items: [],
      };
    }

    return {
      total: teamsCollection?.total,
      items: teamsCollection?.items
        .filter((x): x is PublicTeamItem => x !== null)
        .map(parseContentfulGraphQlPublicTeamListItem),
    };
  }

  async fetchPublicTeamById(id: string): Promise<TeamDataObject | null> {
    // Using FETCH_PUBLIC_TEAM_BY_ID query (no manuscript fragment)
    const { teams } = await this.contentfulClient.request<
      FetchPublicTeamByIdQuery,
      FetchPublicTeamByIdQueryVariables
    >(FETCH_PUBLIC_TEAM_BY_ID, { id });

    if (!teams) {
      return null;
    }

    const linkedProject =
      teams.linkedFrom?.projectMembershipCollection?.items[0]?.linkedFrom
        ?.projectsCollection?.items[0];

    return parseContentfulGraphQlPublicTeam(teams, linkedProject);
  }

  async fetchById(id: string): Promise<TeamDataObject | null> {
    const { teams } = await this.contentfulClient.request<
      FetchTeamByIdQuery,
      FetchTeamByIdQueryVariables
    >(FETCH_TEAM_BY_ID, { id });

    if (!teams) {
      return null;
    }

    const { teams: teamProjectData } = await this.contentfulClient.request<
      FetchTeamProjectByIdQuery,
      FetchTeamProjectByIdQueryVariables
    >(FETCH_PROJECT_BY_TEAM_ID, { id });

    const linkedProject =
      teamProjectData?.linkedFrom?.projectMembershipCollection?.items[0]
        ?.linkedFrom?.projectsCollection?.items[0];

    return parseContentfulGraphQlTeam(teams, linkedProject);
  }

  async fetchTeamIdByProjectId(projectId: string): Promise<string | null> {
    const { projects } = await this.contentfulClient.request<
      FetchTeamIdByProjectIdQuery,
      FetchTeamIdByProjectIdQueryVariables
    >(FETCH_TEAM_ID_BY_PROJECT_ID, { projectId });

    const isTeam = (
      member: ProjectMember,
    ): member is { __typename: 'Teams'; sys: { id: string } } =>
      member.__typename === 'Teams';

    const projectMember =
      projects?.membersCollection?.items?.[0]?.projectMember;

    return projectMember && isTeam(projectMember) ? projectMember.sys.id : null;
  }

  async fetchAwardMetricsByTeamId(
    teamId: string,
  ): Promise<ListTeamAwardMetricsDataObject> {
    const { awardTypeCollection, teamMembershipCollection } =
      await this.contentfulClient.request<
        FetchTeamAwardMetricsQuery,
        FetchTeamAwardMetricsQueryVariables
      >(FETCH_TEAM_AWARD_METRICS, { teamId });

    const receivedAwardTypeIds = new Set(
      cleanArray(teamMembershipCollection?.items).flatMap((membership) =>
        cleanArray(membership.awardsCollection?.items).flatMap((award) =>
          award.awardType ? [award.awardType.sys.id] : [],
        ),
      ),
    );

    const items = cleanArray(awardTypeCollection?.items).map((awardType) => ({
      id: awardType.sys.id,
      name: awardType.name ?? '',
      asapPhilosophy: awardType.asapPhilosophy ?? '',
      metricDefinition: awardType.metricDefinition ?? '',
      received: receivedAwardTypeIds.has(awardType.sys.id),
    }));

    return { total: items.length, items };
  }

  async update(id: string, update: TeamUpdateDataObject): Promise<void> {
    const environment = await this.getRestClient();
    const team = await environment.getEntry(id);

    const { tools, ...updateFields } = update;

    if (tools) {
      const cleanTools = getCleanTools(tools);
      const incomingToolIds = cleanTools
        .map((tool: TeamTool) => tool.id)
        .filter((toolId): toolId is string => !!toolId);

      const currentToolsLinks = team.fields.tools
        ? team.fields.tools['en-US']
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

      // TODO: Remove this function once we have migrated all tools to projects
      const publishedTools = await createAndPublishTools(
        environment,
        cleanTools,
      );

      // TODO: Remove this function once we have migrated all tools to projects
      await patchAndPublish(team, {
        ...updateFields,
        tools: publishedTools.map((tool: { sys: { id: string } }) => ({
          sys: {
            type: 'Link',
            linkType: 'Entry',
            id: tool.sys.id,
          },
        })),
      });
    }
  }
}

export const parseContentfulGraphQlTeamListItem = (
  item: TeamItem,
): TeamListItemDataObject => {
  const [members, labIds]: [
    Array<Pick<TeamMember, 'id' | 'alumniSinceDate' | 'inactiveSinceDate'>>,
    Set<string>,
  ] = (item.linkedFrom?.teamMembershipCollection?.items || []).reduce(
    ([memberList, labIdsSet], membership: Membership | null) => {
      if (
        !membership ||
        !membership.linkedFrom?.usersCollection?.items[0]?.onboarded ||
        !membership.role
      ) {
        return [memberList, labIdsSet];
      }

      const user = membership.linkedFrom?.usersCollection?.items[0];
      const userId = user?.sys?.id;

      if (isPIRole(membership.role) && userId) {
        const memberLabIds = user?.labsCollection?.items
          .filter((labItem) => labItem?.labPi?.sys?.id === userId)
          .map((labItem) => labItem?.sys.id)
          .filter((x): x is string => x !== undefined);

        memberLabIds?.forEach((labId) => labIdsSet.add(labId));
      }

      if (userId) {
        memberList.push({
          id: userId,
          alumniSinceDate: user?.alumniSinceDate ?? undefined,
          inactiveSinceDate: membership.inactiveSinceDate ?? undefined,
        });
      }

      return [memberList, labIdsSet];
    },
    [
      [] as Array<
        Pick<TeamMember, 'id' | 'alumniSinceDate' | 'inactiveSinceDate'>
      >,
      new Set() as Set<string>,
    ],
  );

  const linkedProject =
    item.linkedFrom?.projectMembershipCollection?.items[0]?.linkedFrom
      ?.projectsCollection?.items[0];

  const teamStatus = item.inactiveSince ? 'Inactive' : 'Active';

  return {
    id: item.sys.id ?? '',
    displayName: item.displayName ?? '',
    inactiveSince: item.inactiveSince ?? undefined,
    teamStatus,
    statusRank: teamStatusRank[teamStatus],
    projectTitle: linkedProject?.title ?? '',
    linkedProjectId: linkedProject?.sys.id ?? '',
    teamType: (item.teamType as TeamType) ?? 'Discovery Team',
    tags: parseResearchTags(linkedProject?.researchTagsCollection?.items || []),
    memberCount: countActiveUniqueMembers(members),
    labCount: labIds.size,
    researchTheme: item.researchTheme?.name ?? undefined,
    resourceType: linkedProject?.resourceType?.name ?? undefined,
    projectType: (linkedProject?.projectType as ProjectType) ?? undefined,
  };
};

export const parseContentfulGraphQlPublicTeamListItem = (
  item: PublicTeamItem,
): PublicTeamListItemDataObject => {
  const [activeMembers, inactiveMembers, teamLeaders]: [
    Set<string>,
    Set<string>,
    Set<TeamLeader>,
  ] = (item.linkedFrom?.teamMembershipCollection?.items || []).reduce(
    (
      [activeIdsSet, inactiveIdsSet, leadersSet],
      membership: PublicTeamMembership | null,
    ) => {
      if (
        !membership ||
        !membership.linkedFrom?.usersCollection?.items[0]?.onboarded ||
        !membership.role
      ) {
        return [activeIdsSet, inactiveIdsSet, leadersSet];
      }

      const member = membership.linkedFrom.usersCollection.items[0];
      if (membership.inactiveSinceDate || member.alumniSinceDate) {
        inactiveIdsSet.add(member.sys.id);
      } else {
        activeIdsSet.add(member.sys.id);
        if (
          membership.role === 'Project Manager' ||
          membership.role === 'Lead PI (Core Leadership)'
        ) {
          leadersSet.add({
            id: member.sys.id,
            displayName: parseUserDisplayName(
              member.firstName ?? '',
              member.lastName ?? '',
              undefined,
              member.nickname ?? '',
            ),
            avatarUrl: member.avatar?.url,
          } as TeamLeader);
        }
      }

      return [activeIdsSet, inactiveIdsSet, leadersSet];
    },
    [
      new Set() as Set<string>,
      new Set() as Set<string>,
      new Set() as Set<TeamLeader>,
    ],
  );

  const activeInterestGroups = cleanArray(
    item.linkedFrom?.interestGroupsTeamsCollection?.items.flatMap(
      (igTeams) => igTeams?.linkedFrom?.interestGroupsCollection?.items,
    ),
  )
    .filter((ig): ig is TeamInterestGroupItem => !!ig?.active)
    .map((ig) => ig?.name || '');

  const isInactiveTeam = !!item.inactiveSince;

  const membershipData = isInactiveTeam
    ? {
        activeTeamMembers: [],
        noOfTeamMembers: 0,
        inactiveTeamMembers: [
          ...new Set([...activeMembers, ...inactiveMembers]),
        ],
      }
    : {
        activeTeamMembers: [...activeMembers],
        noOfTeamMembers: activeMembers.size,
        inactiveTeamMembers: [...inactiveMembers],
      };

  return {
    id: item.sys.id ?? '',
    name: item.displayName ?? '',
    researchTheme: item.researchTheme?.name ?? undefined,
    teamLeaders: [...teamLeaders],
    activeInterestGroups,
    ...membershipData,
  };
};

export const parseContentfulGraphQlTeam = (
  item: TeamByIdItem,
  linkedProject?: TeamProjectItem | null,
): TeamDataObject => {
  // TODO: Remove this function once we have migrated all tools to projects
  const tools = (item.toolsCollection?.items || []).reduce(
    (teamTools: TeamTool[], tool) => {
      if (!tool || !tool.name || !tool.url) {
        return teamTools;
      }

      const { name, url, description } = tool;
      const id = tool.sys?.id;

      return [
        ...teamTools,
        {
          id,
          name,
          url,
          description: description ?? undefined,
        },
      ];
    },
    [],
  );

  const members: TeamMember[] = (
    item.linkedFrom?.teamMembershipCollection?.items || []
  ).reduce(
    (
      userList: TeamMember[],
      membership: MembershipTeamById | null,
    ): TeamMember[] => {
      if (
        !membership ||
        !membership.linkedFrom?.usersCollection?.items[0]?.onboarded ||
        !membership.role
      ) {
        return userList;
      }

      const { role, inactiveSinceDate } = membership;
      const {
        sys: { id },
        firstName,
        nickname,
        lastName,
        email,
        avatar,
        labsCollection,
        alumniSinceDate,
        teamsCollection,
      } = membership.linkedFrom?.usersCollection?.items[0] || {};

      const labs: LabResponse[] = (labsCollection?.items || []).reduce(
        (userLabs: LabResponse[], lab): LabResponse[] => {
          if (!lab) {
            return userLabs;
          }

          return [
            ...userLabs,
            {
              id: lab.sys.id,
              name: lab.name || '',
              labPrincipalInvestigatorId: lab.labPi?.sys.id,
            },
          ];
        },
        [],
      );

      const memberAwards = cleanArray(teamsCollection?.items).map(
        (teamMembership) => ({ awards: parseAwardsCollection(teamMembership) }),
      );

      return [
        ...userList,
        {
          id,
          firstName: firstName ?? '',
          lastName: lastName ?? '',
          email: email ?? '',
          role: (role as TeamRole) ?? '',
          inactiveSinceDate: inactiveSinceDate ?? undefined,
          alumniSinceDate: alumniSinceDate ?? undefined,
          avatarUrl: avatar?.url ?? undefined,
          displayName: parseUserDisplayName(
            firstName ?? '',
            lastName ?? '',
            undefined,
            nickname ?? '',
          ),
          labs,
          latestAward: getLatestUserAward(memberAwards),
        },
      ];
    },
    [],
  );

  const piLabs = members
    .filter((member) => isPIRole(member.role))
    .flatMap((member) =>
      (member.labs || []).filter(
        (lab) => lab.labPrincipalInvestigatorId === member.id,
      ),
    )
    .filter(
      (lab, index, labs) => labs.findIndex((l) => l.id === lab.id) === index,
    );

  const getSupplementGrant = (): TeamSupplementGrant | undefined => {
    if (!linkedProject?.supplementGrant) return undefined;

    const { title, description, proposal, startDate, endDate } =
      linkedProject.supplementGrant;

    const hasGrantStarted = DateTime.now() >= DateTime.fromISO(startDate);

    if (!hasGrantStarted) return undefined;

    return {
      title: title ?? '',
      description: description ?? '',
      proposalURL: proposal ? proposal.sys.id : undefined,
      startDate,
      endDate,
    };
  };

  const teamStatus = item.inactiveSince ? 'Inactive' : 'Active';

  return {
    id: item.sys.id ?? '',
    grantId: linkedProject?.grantId ?? undefined,
    teamId: linkedProject?.projectId ?? undefined,
    teamType: (item.teamType as TeamType) ?? 'Discovery Team',
    displayName: item.displayName ?? '',
    inactiveSince: item.inactiveSince ?? undefined,
    teamStatus,
    statusRank: teamStatusRank[teamStatus],
    projectTitle: linkedProject?.title ?? '',
    linkedProjectId: linkedProject?.sys.id ?? '',
    projectStatus: (linkedProject?.status as ProjectStatus) ?? undefined,
    lastModifiedDate: new Date(item.sys.publishedAt).toISOString(),
    tags: parseResearchTags(linkedProject?.researchTagsCollection?.items || []),
    // TODO: Remove this field once we have migrated all tools to projects
    tools,
    supplementGrant: getSupplementGrant(),
    projectSummary: linkedProject?.originalGrant ?? undefined,
    members: members.sort(sortMembers),
    pointOfContact: linkedProject?.contactEmail ?? undefined,
    proposalURL: linkedProject?.proposal
      ? linkedProject.proposal.sys.id
      : undefined,
    researchTheme: item.researchTheme?.name ?? undefined,
    resourceType: linkedProject?.resourceType?.name ?? undefined,
    projectType: (linkedProject?.projectType as ProjectType) ?? undefined,
    teamDescription: item.teamDescription ?? undefined,
    resourceTitle: item.resourceTitle ?? undefined,
    resourceDescription: item.resourceDescription ?? undefined,
    resourceButtonCopy: item.resourceButtonCopy ?? undefined,
    resourceContactEmail: item.resourceContactEmail ?? undefined,
    resourceLink: item.resourceLink ?? undefined,
    labs: piLabs,
    labCount: piLabs.length,
  };
};

export const parseContentfulGraphQlPublicTeam = (
  item: PublicTeamByIdItem,
  linkedProject?: PublicTeamByIdProjectItem | null,
): TeamDataObject => {
  const members: TeamMember[] = (
    item.linkedFrom?.teamMembershipCollection?.items || []
  ).reduce(
    (
      userList: TeamMember[],
      membership: PublicTeamByIdMembership | null,
    ): TeamMember[] => {
      if (
        !membership ||
        !membership.linkedFrom?.usersCollection?.items[0]?.onboarded ||
        !membership.role
      ) {
        return userList;
      }

      const { role, inactiveSinceDate } = membership;
      const {
        sys: { id },
        firstName,
        nickname,
        lastName,
        avatar,
        alumniSinceDate,
      } = membership.linkedFrom?.usersCollection?.items[0] || {};

      return [
        ...userList,
        {
          id,
          firstName: firstName ?? '',
          lastName: lastName ?? '',
          email: '', // Not needed for public API but required by TeamMember type
          role: (role as TeamRole) ?? '',
          inactiveSinceDate: inactiveSinceDate ?? undefined,
          alumniSinceDate,
          avatarUrl: avatar?.url ?? undefined,
          displayName: parseUserDisplayName(
            firstName ?? '',
            lastName ?? '',
            undefined,
            nickname ?? '',
          ),
          labs: [], // Not needed for public API but required by TeamMember type
        },
      ];
    },
    [],
  );

  return {
    id: item.sys.id ?? '',
    displayName: item.displayName ?? '',
    inactiveSince: item.inactiveSince ?? undefined,
    teamStatus: item.inactiveSince ? 'Inactive' : 'Active',
    projectTitle: linkedProject?.title ?? '',
    projectSummary: linkedProject?.originalGrant ?? undefined,
    researchTheme: item.researchTheme?.name ?? undefined,
    tags: parseResearchTags(linkedProject?.researchTagsCollection?.items || []),
    members: members.sort(sortMembers),
    // Required fields with minimal defaults
    teamType: 'Discovery Team' as TeamType,
    lastModifiedDate: new Date(item.sys.publishedAt).toISOString(),
    labCount: 0,
    labs: [],
  };
};

// TODO: Remove this function once we have migrated all tools to projects
const createAndPublishTools = (environment: Environment, tools: TeamTool[]) =>
  Promise.all(
    tools.map(async (tool) => {
      const { id, ...toolFields } = tool;
      const entry = id
        ? await environment.getEntry(id).then((e) => {
            e.fields = addLocaleToFields(toolFields);
            return e.update();
          })
        : await environment.createEntry('externalTools', {
            fields: addLocaleToFields(toolFields),
          });
      return entry.publish();
    }),
  );
