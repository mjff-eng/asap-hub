import {
  activeUserMembershipStatus,
  FetchUsersOptions,
  inactiveUserMembershipStatus,
  InterestGroupMembership,
  isProjectType,
  isUserDegree,
  isUserRole,
  LabResponse,
  ListPublicUserDataObject,
  ListUserDataObject,
  OrcidWork,
  PublicUserDataObject,
  TeamRole,
  UserDataObject,
  UserListItemDataObject,
  UserListItemTeam,
  UserProjectMembership,
  UserSocialLinks,
  UserTeam,
  UserUpdateDataObject,
  WorkingGroupMembership,
} from '@asap-hub/model';

import {
  addLocaleToFields,
  Entry,
  Environment,
  FetchPublicUsersQuery,
  FetchPublicUsersQueryVariables,
  FetchUserByIdQuery,
  FetchUserByIdQueryVariables,
  FetchUsersByLabIdQuery,
  FetchUsersByLabIdQueryVariables,
  FetchUsersByTeamIdQuery,
  FetchUsersByTeamIdQueryVariables,
  FetchUsersByTeamMembershipIdQuery,
  FetchUsersByTeamMembershipIdQueryVariables,
  FetchUsersQuery,
  FetchUsersQueryVariables,
  FETCH_PUBLIC_USERS,
  FETCH_USERS,
  FETCH_USERS_BY_LAB_ID,
  FETCH_USERS_BY_TEAM_ID,
  FETCH_USERS_BY_TEAM_MEMBERSHIP_ID,
  FETCH_USER_BY_ID,
  FETCH_USER_BY_ID_FOR_ALGOLIA_LIST,
  getLinkEntities,
  GraphQLClient,
  Maybe,
  patchAndPublish,
  patchAndPublishConflict,
  pollContentfulGql,
  UsersFilter,
  UsersOrder,
} from '@asap-hub/contentful';
import { cleanArray } from '@asap-hub/server-common';
import { DocumentNode } from 'graphql';
import {
  isTeamRole,
  parseAwardsCollection,
  parseOrcidWorkFromCMS,
  TeamMembershipWithAwards,
} from '../transformers';
import { UserDataProvider } from '../types';
import { parseResearchTags } from './research-tag.data-provider';
import logger from '../../utils/logger';

export type QueryUserListItem = NonNullable<
  NonNullable<FetchUsersQuery['usersCollection']>['items'][number]
>;

export type UserItem = NonNullable<NonNullable<FetchUserByIdQuery['users']>>;

export type PublicUserItem = NonNullable<
  NonNullable<FetchPublicUsersQuery['usersCollection']>['items'][number]
>;

export type TeamMembershipPublic = NonNullable<
  NonNullable<PublicUserItem['teamsCollection']>['items'][number]
>;

export type GroupMemberItemPublic = NonNullable<
  NonNullable<
    NonNullable<PublicUserItem['linkedFrom']>['workingGroupMembersCollection']
  >['items'][number]
>;
export type GroupLeaderItemPublic = NonNullable<
  NonNullable<
    NonNullable<PublicUserItem['linkedFrom']>['workingGroupLeadersCollection']
  >['items'][number]
>;

export type LabsCollection = UserItem['labsCollection'];

export type TeamsCollection = UserItem['teamsCollection'];

export type ResearchOutputsCollection = NonNullable<
  UserItem['linkedFrom']
>['researchOutputsCollection'];

export type ResearchOutputItem = NonNullable<
  NonNullable<
    NonNullable<UserItem['linkedFrom']>['researchOutputsCollection']
  >['items'][number]
>;

export type TeamMembership = NonNullable<
  NonNullable<UserItem['teamsCollection']>['items'][number]
>;
export type GroupMemberItem = NonNullable<
  NonNullable<
    NonNullable<UserItem['linkedFrom']>['workingGroupMembersCollection']
  >['items'][number]
>;
export type GroupLeaderItem = NonNullable<
  NonNullable<
    NonNullable<UserItem['linkedFrom']>['workingGroupLeadersCollection']
  >['items'][number]
>;

export type InterestGroupItem = NonNullable<
  NonNullable<
    NonNullable<TeamMembership['team']>['linkedFrom']
  >['interestGroupsTeamsCollection']
>['items'][number];

export type InterestGroupLeaderItem = NonNullable<
  NonNullable<
    NonNullable<UserItem['linkedFrom']>['interestGroupLeadersCollection']
  >['items'][number]
>;

export type DirectProjectMembershipItem = NonNullable<
  NonNullable<
    NonNullable<UserItem['linkedFrom']>['projectMembershipCollection']
  >['items'][number]
>;

type OrcidWorkContentful = {
  id: string;
  doi?: string;
  title?: string;
  type?: string;
  publicationDate?: Record<'day' | 'month' | 'year', string | undefined>;
  lastModifiedDate?: string;
};

export class UserContentfulDataProvider implements UserDataProvider {
  constructor(
    private contentfulClient: GraphQLClient,
    private getRestClient: () => Promise<Environment>,
  ) {}

  private fetchUserById(
    id: string,
    publicUser: boolean = false,
    query: DocumentNode = FETCH_USER_BY_ID,
  ) {
    return this.contentfulClient.request<
      FetchUserByIdQuery,
      FetchUserByIdQueryVariables
    >(query, { id, publicUser });
  }

  async fetchByIdForAlgoliaList(
    id: string,
  ): Promise<UserListItemDataObject | null> {
    const { users } = await this.fetchUserById(
      id,
      false,
      FETCH_USER_BY_ID_FOR_ALGOLIA_LIST,
    );
    return users ? parseContentfulGraphQlUserListItem(users) : null;
  }

  async fetchById(
    id: string,
    publicUser: boolean = false,
  ): Promise<UserDataObject | null> {
    const { users } = await this.fetchUserById(id, publicUser);

    if (!users) {
      return null;
    }

    return parseContentfulGraphQlUsers(users);
  }

  async fetch(options: FetchUsersOptions): Promise<ListUserDataObject> {
    const result = await this.fetchUsers(options);

    return {
      total: result?.total,
      items: result?.items
        .filter((user): user is QueryUserListItem => user !== null)
        .map(parseContentfulGraphQlUserListItem),
    };
  }

  async fetchPublicUsers(
    options: FetchUsersOptions,
  ): Promise<ListPublicUserDataObject> {
    const result = await this.fetchPublicUsersData(options);

    return {
      total: result?.total,
      items: result?.items
        .filter((user): user is PublicUserItem => user !== null)
        .map(parseContentfulGraphQlPublicUsers),
    };
  }

  private async fetchUsers(options: FetchUsersOptions) {
    const { take = 8, skip = 0 } = options;

    const where: UsersFilter = generateFetchQueryFilter(options);
    const words = (options.search || '').split(' ').filter(Boolean);

    if (words.length) {
      const filters: UsersFilter[] = words.reduce(
        (acc: UsersFilter[], word) =>
          acc.concat([
            {
              OR: [{ expertiseAndResourceDescription_contains: word }],
            },
          ]),
        [],
      );
      where.AND = filters;
    }

    if (options.filter?.labId) {
      const { labs } = await this.contentfulClient.request<
        FetchUsersByLabIdQuery,
        FetchUsersByLabIdQueryVariables
      >(FETCH_USERS_BY_LAB_ID, {
        limit: take,
        skip,
        id: options.filter.labId,
      });

      const labMembershipCollection = labs?.linkedFrom?.labMembershipCollection;
      return labMembershipCollection
        ? {
            total: labMembershipCollection.total,
            items: labMembershipCollection.items.map(
              (labMembership) =>
                labMembership?.linkedFrom?.usersCollection?.items[0],
            ),
          }
        : { total: 0, items: [] };
    }

    if (options.filter?.teamId) {
      const { teamMembershipCollection } = await this.contentfulClient.request<
        FetchUsersByTeamIdQuery,
        FetchUsersByTeamIdQueryVariables
      >(FETCH_USERS_BY_TEAM_ID, {
        limit: take,
        skip,
        id: options.filter.teamId,
      });
      const users =
        teamMembershipCollection?.items
          ?.map((item) => item?.linkedFrom?.usersCollection?.items[0])
          .filter((item) => !!item) || [];

      return {
        total: users.length,
        items: users,
      };
    }

    if (options.filter?.teamMembershipId) {
      const { teamMembershipCollection } = await this.contentfulClient.request<
        FetchUsersByTeamMembershipIdQuery,
        FetchUsersByTeamMembershipIdQueryVariables
      >(FETCH_USERS_BY_TEAM_MEMBERSHIP_ID, {
        limit: take,
        skip,
        id: options.filter.teamMembershipId,
      });
      const users =
        teamMembershipCollection?.items
          ?.map((item) => item?.linkedFrom?.usersCollection?.items[0])
          .filter((item) => !!item) || [];

      return {
        total: users.length,
        items: users,
      };
    }

    const { usersCollection } = await this.contentfulClient.request<
      FetchUsersQuery,
      FetchUsersQueryVariables
    >(FETCH_USERS, {
      limit: take,
      skip,
      where,
      order: [UsersOrder.LastNameAsc],
    });
    return usersCollection || { total: 0, items: [] };
  }

  private async fetchPublicUsersData(options: FetchUsersOptions) {
    const { take = 8, skip = 0 } = options;

    const where: UsersFilter = generateFetchQueryFilter(options);

    const { usersCollection } = await this.contentfulClient.request<
      FetchPublicUsersQuery,
      FetchPublicUsersQueryVariables
    >(FETCH_PUBLIC_USERS, {
      limit: take,
      skip,
      where,
      order: [UsersOrder.LastNameAsc],
    });
    return usersCollection || { total: 0, items: [] };
  }

  async create(): Promise<string> {
    throw new Error('Method not implemented.');
  }
  async update(
    id: string,
    data: UserUpdateDataObject,
    { suppressConflict = false, polling = true } = {},
  ): Promise<void> {
    const pollForUpdate = async (publishedVersion: number | undefined) => {
      const fetchUserById = () => this.fetchUserById(id);

      await pollContentfulGql<FetchUserByIdQuery>(
        publishedVersion || Infinity,
        fetchUserById,
        'users',
      );
    };

    const fields = cleanUser(data);
    const environment = await this.getRestClient();
    const user = await environment.getEntry(id);

    // When the avatar field is being changed (cleared or replaced), keep a
    // reference to the previously linked asset so it can be deleted from
    // Contentful once the entry no longer points at it.
    const previousAvatarId =
      'avatar' in fields
        ? (user.fields.avatar?.['en-US']?.sys?.id as string | undefined)
        : undefined;
    const newAvatarId =
      typeof fields.avatar === 'object' && fields.avatar
        ? (fields.avatar as { sys?: { id?: string } }).sys?.id ?? undefined
        : undefined;
    const orphanedAvatarId =
      previousAvatarId && previousAvatarId !== newAvatarId
        ? previousAvatarId
        : undefined;

    const isAlumni = user.fields.alumniSinceDate?.['en-US'] != null;
    const shouldStampAlumni =
      'alumniSinceDate' in data ||
      'alumniLocation' in data ||
      (isAlumni && 'email' in data);

    // linking a newly created socials entry republishes the user, so the local
    // copy has to be refreshed before it is patched again
    const userEntry =
      data.social && (await this.updateSocials(environment, user, data.social))
        ? await environment.getEntry(id)
        : user;

    const patchMethod = suppressConflict
      ? patchAndPublishConflict
      : patchAndPublish;
    const result = await patchMethod(userEntry, {
      ...fields,
      ...(shouldStampAlumni
        ? { alumniLastUpdated: new Date().toISOString() }
        : {}),
      ...(data.tagIds ? { researchTags: getLinkEntities(data.tagIds) } : {}),
    });

    // only delete the old asset once the entry update actually applied,
    // otherwise a suppressed conflict would leave the entry linking a
    // deleted asset
    if (!result) {
      return;
    }

    if (orphanedAvatarId) {
      await this.deleteAsset(environment, orphanedAvatarId);
    }

    if (!polling) {
      return;
    }
    await pollForUpdate(result.sys.publishedVersion);
  }

  // Social links live on a separate socials entry, so they are written there
  // rather than on the user. The deterministic socials-<userId> entry id keeps
  // repeated updates idempotent.
  private async updateSocials(
    environment: Environment,
    user: Entry,
    social: Omit<UserSocialLinks, 'orcid'>,
  ) {
    // the frontend only sends the fields which have values defined
    // so need to default all social keys to null to allow unsetting
    const fields = {
      website1: null,
      website2: null,
      twitter: null,
      blueSky: null,
      linkedIn: null,
      github: null,
      researcherId: null,
      googleScholar: null,
      researchGate: null,
      ...social,
    };

    const linkedId = user.fields.userSocials?.['en-US']?.sys?.id as
      | string
      | undefined;

    if (linkedId) {
      const socialsEntry = await environment.getEntry(linkedId);
      await patchAndPublish(socialsEntry, fields);
      return false;
    }

    const entryId = `socials-${user.sys.id}`;
    const entryFields = addLocaleToFields(fields);

    // earlier data migrations created entries under this same deterministic
    // id, so an entry can already exist for a user that was never linked to it
    let socialsEntry;
    try {
      socialsEntry = await environment.getEntry(entryId);
      socialsEntry.fields = entryFields;
      socialsEntry = await socialsEntry.update();
    } catch {
      socialsEntry = await environment.createEntryWithId('socials', entryId, {
        fields: entryFields,
      });
    }

    await socialsEntry.publish();

    await patchAndPublish(user, {
      userSocials: {
        sys: { type: 'Link', linkType: 'Entry', id: socialsEntry.sys.id },
      },
    });

    return true;
  }

  private async deleteAsset(environment: Environment, assetId: string) {
    try {
      const asset = await environment.getAsset(assetId);
      if (asset.isPublished()) {
        await asset.unpublish();
      }
      await asset.delete();
    } catch (error) {
      logger.warn(
        { error, assetId },
        'Failed to delete avatar asset from Contentful',
      );
    }
  }
}

const cleanUser = ({
  tagIds: _tagIds,
  ...userToUpdate
}: UserUpdateDataObject) =>
  Object.entries(userToUpdate).reduce(
    (acc, [key, value]) => {
      if (key === 'avatar') {
        return {
          ...acc,
          avatar: value
            ? {
                sys: {
                  type: 'Link',
                  linkType: 'Asset',
                  id: value,
                },
              }
            : null,
        };
      }
      if (key === 'social') {
        // social links live on the linked socials entry, not the user. The user
        // entry is still republished below with no changed fields, which is
        // what emits the UsersPublished event downstream consumers such as the
        // ActiveCampaign sync rely on.
        return acc;
      }
      if (key === 'connections') {
        const connections = userToUpdate.connections || [];
        return {
          ...acc,
          connections: connections.map(({ code }) => code),
        };
      }
      if (typeof value === 'string') {
        return { ...acc, [key]: value.trim() === '' ? null : value };
      }
      return { ...acc, [key]: value };
    },
    {} as { [key: string]: unknown },
  );

const getProjectFromTeamMembership = (teamItem: TeamMembership | null) =>
  teamItem?.team?.linkedFrom?.projectMembershipCollection?.items?.[0]
    ?.linkedFrom?.projectsCollection?.items?.[0] ?? null;

const getProjectFromDirectMembership = (
  membership: DirectProjectMembershipItem | null,
) => membership?.linkedFrom?.projectsCollection?.items?.[0] ?? null;

const toUserProjectMembership = (
  project:
    | {
        sys?: { id?: string };
        title?: string | null;
        projectType?: string | null;
        status?: string | null;
      }
    | null
    | undefined,
): UserProjectMembership | null => {
  if (
    !project ||
    !project.sys?.id ||
    !project.title ||
    !isProjectType(project.projectType)
  ) {
    return null;
  }
  return {
    id: project.sys.id,
    title: project.title,
    projectType: project.projectType,
    status: project.status || '',
  };
};

const parseUserProjects = (
  teamsCollection: UserItem['teamsCollection'],
  directProjectMemberships:
    | NonNullable<UserItem['linkedFrom']>['projectMembershipCollection']
    | undefined,
): UserProjectMembership[] => {
  const teamProjects = cleanArray(teamsCollection?.items)
    .map(getProjectFromTeamMembership)
    .map(toUserProjectMembership)
    .filter((p): p is UserProjectMembership => p !== null);

  const directProjects = cleanArray(directProjectMemberships?.items)
    .map(getProjectFromDirectMembership)
    .map(toUserProjectMembership)
    .filter((p): p is UserProjectMembership => p !== null);

  // Deduplicate in case a project has both types of relationship
  // with the user (the team project will take precedence)
  const seenIds = new Set(teamProjects.map((p) => p.id));
  const uniqueDirectProjects = directProjects.filter((p) => !seenIds.has(p.id));

  return [...teamProjects, ...uniqueDirectProjects];
};

const parseSocialLinks = (
  userSocials: UserItem['userSocials'] | PublicUserItem['userSocials'],
): Omit<UserSocialLinks, 'orcid'> => ({
  website1: userSocials?.website1 ?? undefined,
  website2: userSocials?.website2 ?? undefined,
  linkedIn: userSocials?.linkedIn ?? undefined,
  researcherId: userSocials?.researcherId ?? undefined,
  twitter: userSocials?.twitter ?? undefined,
  blueSky: userSocials?.blueSky ?? undefined,
  github: userSocials?.github ?? undefined,
  googleScholar: userSocials?.googleScholar ?? undefined,
  researchGate: userSocials?.researchGate ?? undefined,
});

export const parseContentfulGraphQlPublicUsers = (
  item: PublicUserItem,
): PublicUserDataObject => {
  const userId = item.sys.id;
  const degree =
    item.degree && isUserDegree(item.degree) ? item.degree : undefined;

  const teams: PublicUserDataObject['teams'] = cleanArray(
    item.teamsCollection?.items,
  )?.map((teamItem) => ({
    displayName: teamItem?.team?.displayName || '',
    role: teamItem?.role as TeamRole,
  }));

  const labs: LabResponse[] = cleanArray(item.labsCollection?.items).map(
    (labItem) => ({
      id: labItem?.sys.id || '',
      name: labItem?.name || '',
    }),
  );

  const tags = cleanArray(item.researchTagsCollection?.items || []).map(
    (tagItem) => tagItem?.name || '',
  );

  const isAlumni = !!item.alumniSinceDate;

  const workingGroupLeadersCollection = cleanArray(
    item.linkedFrom?.workingGroupLeadersCollection?.items,
  );
  const workingGroupMembersCollection = cleanArray(
    item.linkedFrom?.workingGroupMembersCollection?.items,
  );
  const interestGroupLeadersCollection = cleanArray(
    item?.linkedFrom?.interestGroupLeadersCollection?.items,
  );

  const teamsCollection = cleanArray(item?.teamsCollection?.items);

  const workingGroups = [
    ...parseToWorkingGroupsForPublicUser(
      workingGroupLeadersCollection,
      isAlumni,
    ),
    ...parseToWorkingGroupsForPublicUser(
      workingGroupMembersCollection,
      isAlumni,
    ),
  ];

  const interestGroups = removeDuplicates([
    ...parseToInterestGroups(teamsCollection),
    ...parseLeadersToInterestGroups(interestGroupLeadersCollection),
  ]);

  const researchOutputs = parseResearchOutputsCollection(
    item?.linkedFrom?.researchOutputsCollection,
    userId,
  );

  return {
    id: userId,
    avatarUrl: item.avatar?.url ?? undefined,
    biography: item.biography ?? undefined,
    city: item.city ?? undefined,
    country: item.country ?? undefined,
    createdDate: item.createdDate || item.sys.firstPublishedAt,
    lastModifiedDate: item.lastUpdated,
    alumni: isAlumni ? 'Yes' : 'No',
    degree,
    firstName: item.firstName ?? '',
    lastName: item.lastName ?? '',
    institution: item.institution ?? undefined,
    personalEmail: item.personalEmail ?? undefined,
    researchTheme: teamsCollection
      .map((teamItem) => teamItem.team?.researchTheme?.name)
      .filter(
        (researchThemeName): researchThemeName is string =>
          researchThemeName !== undefined,
      ),
    researchOutputs,
    tags,
    teams,
    labs,
    interestGroups,
    workingGroups,
    social: {
      ...parseSocialLinks(item.userSocials),
      orcid: item.orcid ?? undefined,
    },
  };
};

export const parseContentfulGraphQlUsers = (item: UserItem): UserDataObject => {
  const normaliseArray = (
    input: Maybe<Maybe<string>[]> | undefined,
  ): string[] =>
    (input || []).reduce(
      (arr: string[], str: Maybe<string>) => (str ? [...arr, str] : arr),
      [],
    );

  const userId = item.sys.id;
  const questions = normaliseArray(item.questions);
  const connections = normaliseArray(item.connections);

  const role = item.role && isUserRole(item.role) ? item.role : 'Guest';
  const degree =
    item.degree && isUserDegree(item.degree) ? item.degree : undefined;

  const teams: UserTeam[] = parseTeamsCollection(item.teamsCollection);
  const labs: LabResponse[] = parseLabsCollection(item.labsCollection);

  const orcidWorks: OrcidWork[] = parseOrcidWorksContentful(
    item.orcidWorks || [],
  );

  const isAlumni = !!item.alumniSinceDate;

  const workingGroupLeadersCollection = cleanArray(
    item.linkedFrom?.workingGroupLeadersCollection?.items,
  );
  const workingGroupMembersCollection = cleanArray(
    item.linkedFrom?.workingGroupMembersCollection?.items,
  );
  const interestGroupLeadersCollection = cleanArray(
    item?.linkedFrom?.interestGroupLeadersCollection?.items,
  );

  const teamsCollection = cleanArray(item?.teamsCollection?.items);

  const workingGroups = [
    ...parseToWorkingGroups(workingGroupLeadersCollection, isAlumni),
    ...parseToWorkingGroups(workingGroupMembersCollection, isAlumni),
  ];

  const interestGroups = removeDuplicates([
    ...parseToInterestGroups(teamsCollection),
    ...parseLeadersToInterestGroups(interestGroupLeadersCollection),
  ]);

  const researchOutputs = parseResearchOutputsCollection(
    item?.linkedFrom?.researchOutputsCollection,
    userId,
  );

  const projects = parseUserProjects(
    item.teamsCollection,
    item.linkedFrom?.projectMembershipCollection,
  );

  return {
    id: userId,
    activeCampaignId: item.activeCampaignId || undefined,
    membershipStatus: [
      item.alumniSinceDate
        ? inactiveUserMembershipStatus
        : activeUserMembershipStatus,
    ],
    createdDate: item.createdDate || item.sys.firstPublishedAt,
    lastModifiedDate: item.lastUpdated,
    workingGroups,
    interestGroups,
    projects,
    onboarded: typeof item.onboarded === 'boolean' ? item.onboarded : undefined,
    email: item.email ?? '',
    researchTheme: teamsCollection
      .map((teamItem) => teamItem.team?.researchTheme?.name)
      .filter(
        (researchThemeName): researchThemeName is string =>
          researchThemeName !== undefined,
      ),
    contactEmail: item.contactEmail ?? undefined,
    personalEmail: item.personalEmail ?? undefined,
    firstName: item.firstName ?? '',
    middleName: item.middleName || undefined,
    lastName: item.lastName ?? '',
    nickname: item.nickname || undefined,
    biography: item.biography ?? undefined,
    jobTitle: item.jobTitle ?? undefined,
    city: item.city ?? undefined,
    stateOrProvince: item.stateOrProvince ?? undefined,
    country: item.country ?? undefined,
    institution: item.institution ?? undefined,
    orcid: item.orcid ?? undefined,
    orcidLastModifiedDate: item.orcidLastModifiedDate ?? undefined,
    orcidLastSyncDate: item.orcidLastSyncDate ?? undefined,
    orcidWorks,
    alumniLastUpdated: item.alumniLastUpdated ?? undefined,
    alumniLocation: item.alumniLocation ?? undefined,
    alumniSinceDate: item.alumniSinceDate ?? undefined,
    reachOut: item.reachOut ?? undefined,
    researchInterests: item.researchInterests ?? undefined,
    researchOutputs,
    responsibilities: item.responsibilities ?? undefined,
    expertiseAndResourceDescription:
      item.expertiseAndResourceDescription ?? undefined,
    dismissedGettingStarted: item.dismissedGettingStarted ?? false,
    avatarUrl: item.avatar?.url ?? undefined,
    questions,
    role,
    openScienceTeamMember: !!item.openScienceTeamMember,
    techSupport: !!item.techSupport,
    degree,
    connections: connections.map((connection) => ({ code: connection })),
    teams,
    tags: parseResearchTags(item.researchTagsCollection?.items || []),
    labs,
    social: {
      ...parseSocialLinks(item.userSocials),
      orcid: item.orcid ?? undefined,
    },
  };
};

export const parseContentfulGraphQlUserListItem = (
  item: QueryUserListItem,
): UserListItemDataObject => {
  const userFirstName = item.firstName ?? '';
  const userLastName = item.lastName ?? '';

  const userTeams = (item.teamsCollection?.items || []).reduce(
    (userListItemTeams: UserListItemTeam[], teamItem) => {
      if (!teamItem || !teamItem.role || !isTeamRole(teamItem.role)) {
        return userListItemTeams;
      }

      const awards = parseAwardsCollection(
        teamItem as TeamMembershipWithAwards,
      );

      return [
        ...userListItemTeams,
        {
          id: teamItem?.team?.sys.id || '',
          displayName: teamItem?.team?.displayName || '',
          role: teamItem?.role,
          ...(awards.length ? { awards } : {}),
        },
      ];
    },
    [],
  );

  const tags = parseResearchTags(item.researchTagsCollection?.items || []);
  return {
    alumniSinceDate: item.alumniSinceDate,
    avatarUrl: item.avatar?.url ?? undefined,
    biography: item.biography ?? undefined,
    city: item.city ?? undefined,
    contactEmail: item.contactEmail ?? undefined,
    stateOrProvince: item.stateOrProvince ?? undefined,
    country: item.country ?? undefined,
    createdDate: item.createdDate,
    degree: item.degree && isUserDegree(item.degree) ? item.degree : undefined,
    dismissedGettingStarted: item.dismissedGettingStarted ?? false,
    email: item.email ?? '',
    firstName: userFirstName,
    id: item.sys.id,
    institution: item.institution ?? undefined,
    jobTitle: item.jobTitle ?? undefined,
    labs: parseLabsCollection(item.labsCollection),
    lastName: userLastName,
    membershipStatus: [
      item.alumniSinceDate
        ? inactiveUserMembershipStatus
        : activeUserMembershipStatus,
    ],
    middleName: item.middleName ?? undefined,
    nickname: item.nickname ?? undefined,
    onboarded: typeof item.onboarded === 'boolean' ? item.onboarded : true,
    orcid: item.orcid ?? undefined,
    role: item.role && isUserRole(item.role) ? item.role : 'Guest',
    openScienceTeamMember: !!item.openScienceTeamMember,
    techSupport: !!item.techSupport,
    social: parseSocialLinks(item.userSocials),
    teams: userTeams,
    tags,
    _tags: tags.map((tag) => tag.name),
  };
};
const generateFetchQueryFilter = ({
  filter,
}: FetchUsersOptions): UsersFilter => {
  const {
    orcid,
    orcidLastSyncDate,
    code,
    onboarded = true,
    hidden = true,
  } = filter || {};

  const filterCode = code ? { connections_contains_all: [code] } : {};
  const filterHidden = hidden ? { role_not: 'Hidden' } : {};
  const filterNonOnboarded = onboarded ? { onboarded: true } : {};
  const filterOrcid = orcid ? { orcid_contains: orcid } : {};
  const filterOrcidLastSyncDate = orcidLastSyncDate
    ? { orcidLastSyncDate_lt: orcidLastSyncDate }
    : {};

  const queryFilter = {
    ...filterCode,
    ...filterNonOnboarded,
    ...filterHidden,
    ...filterOrcid,
    ...filterOrcidLastSyncDate,
  };

  return queryFilter;
};

const parseOrcidWorksContentful = (
  orcidWorksContentful: OrcidWorkContentful[],
): OrcidWork[] => {
  try {
    return orcidWorksContentful.map(parseOrcidWorkFromCMS);
  } catch (e) {
    throw new Error(`Invalid ORCID works content data: ${e}`);
  }
};

export const parseLabsCollection = (
  labsCollection: LabsCollection,
): LabResponse[] =>
  (labsCollection?.items || []).reduce(
    (userLabs: LabResponse[], lab): LabResponse[] => {
      if (!lab || !lab.name) {
        return userLabs;
      }

      return [
        ...userLabs,
        {
          id: lab.sys.id,
          name: lab.name,
          labPrincipalInvestigatorId: lab.labPi?.sys.id,
        },
      ];
    },
    [],
  );

export const parseTeamsCollection = (
  teamsCollection: TeamsCollection,
  includeAwards = true,
): UserTeam[] =>
  (teamsCollection?.items || []).reduce(
    (userTeams: UserTeam[], team: TeamMembership | null): UserTeam[] => {
      if (!team) {
        return userTeams;
      }

      const { role: teamRole, inactiveSinceDate } = team;

      if (!teamRole || !isTeamRole(teamRole)) {
        return userTeams;
      }

      const project =
        team.team?.linkedFrom?.projectMembershipCollection?.items[0]?.linkedFrom
          ?.projectsCollection?.items[0];

      const awards = includeAwards
        ? parseAwardsCollection(team as TeamMembershipWithAwards)
        : [];

      return [
        ...userTeams,
        {
          role: teamRole,
          inactiveSinceDate: inactiveSinceDate || undefined,
          displayName: team.team?.displayName || '',
          id: team.team?.sys.id || '',
          teamInactiveSince: team.team?.inactiveSince || '',
          proposal: project?.proposal ? project.proposal.sys.id : undefined,
          ...(awards.length ? { awards } : {}),
        },
      ];
    },
    [],
  );

export const parseResearchOutputsCollection = (
  researchOutputsCollection: ResearchOutputsCollection,
  userId: string,
): string[] =>
  (researchOutputsCollection?.items || []).reduce(
    (
      userResearchOutputs: string[],
      researchOutput: ResearchOutputItem | null,
    ): string[] => {
      const isAuthor = researchOutput?.authorsCollection?.items.some(
        (author) => author?.__typename === 'Users' && author.sys.id === userId,
      );

      if (isAuthor && researchOutput?.sys.id) {
        return [...userResearchOutputs, researchOutput.sys.id];
      }

      return userResearchOutputs;
    },
    [],
  );

export const parseToWorkingGroupsForPublicUser = (
  users: (GroupMemberItemPublic | GroupLeaderItemPublic)[],
  isAlumni: boolean,
): PublicUserDataObject['workingGroups'] =>
  users.reduce(
    (
      workingGroups: PublicUserDataObject['workingGroups'],
      user: GroupMemberItemPublic | GroupLeaderItemPublic,
    ) => {
      const workingGroup = user.linkedFrom?.workingGroupsCollection?.items[0];

      if (!workingGroup) {
        return workingGroups;
      }

      const isUserInactiveInWorkingGroup = !!user.inactiveSinceDate;
      const isWorkingGroupComplete = workingGroup.complete;
      const isUserActiveInWorkingGroup =
        !isAlumni && !isUserInactiveInWorkingGroup;
      const isActive = !isWorkingGroupComplete && isUserActiveInWorkingGroup;

      if (isActive) {
        workingGroups.push({
          name: workingGroup.title || '',
          role:
            'role' in user
              ? (user.role as WorkingGroupMembership['role'])
              : 'Member',
        });
      }

      return workingGroups;
    },
    [],
  );

export const parseToWorkingGroups = (
  users: (GroupMemberItem | GroupLeaderItem)[],
  isAlumni: boolean,
): WorkingGroupMembership[] =>
  users.reduce(
    (workingGroups: WorkingGroupMembership[], user: GroupLeaderItem) => {
      const workingGroup = user.linkedFrom?.workingGroupsCollection?.items[0];
      const isInActive = !!user.inactiveSinceDate;

      if (!workingGroup) {
        return workingGroups;
      }

      workingGroups.push({
        id: workingGroup.sys.id,
        name: workingGroup.title || '',
        role: (user.role as WorkingGroupMembership['role']) || 'Member',
        active: workingGroup?.complete ? false : !isAlumni && !isInActive,
      });

      return workingGroups;
    },
    [],
  );

const parseToInterestGroups = (
  teams: TeamMembership[] | TeamMembershipPublic[],
): InterestGroupMembership[] =>
  teams.flatMap(({ team }) => {
    const items = cleanArray(
      team?.linkedFrom?.interestGroupsTeamsCollection?.items.flatMap(
        (item) => item?.linkedFrom?.interestGroupsCollection?.items,
      ),
    );
    return items.map((group) => ({
      id: group?.sys.id || '',
      name: group?.name || '',
      active: !!group?.active,
    }));
  });

const parseLeadersToInterestGroups = (
  leaders: InterestGroupLeaderItem[],
): InterestGroupMembership[] =>
  leaders.reduce(
    (
      interestGroups: InterestGroupMembership[],
      leader: InterestGroupLeaderItem,
    ) => {
      const group = leader.linkedFrom?.interestGroupsCollection?.items[0];
      // a lapsed leadership grants no role
      const role = leader.inactiveSinceDate ? undefined : leader.role;

      interestGroups.push({
        id: group?.sys.id || '',
        active: !!group?.active,
        name: group?.name || '',
        ...(role ? { role } : {}),
      });

      return interestGroups;
    },
    [],
  );

const removeDuplicates = (
  interestGroups: InterestGroupMembership[],
): InterestGroupMembership[] => {
  const byId = new Map<string, InterestGroupMembership>();
  interestGroups.forEach((group) => {
    const existing = byId.get(group.id);
    if (!existing) {
      byId.set(group.id, group);
    } else if (!existing.role && group.role) {
      // a team-derived entry carries no role; keep the leader's
      byId.set(group.id, { ...existing, role: group.role });
    }
  });
  return [...byId.values()];
};
