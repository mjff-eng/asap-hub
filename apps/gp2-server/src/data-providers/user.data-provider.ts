import { gp2 as gp2Model, OrcidWork } from '@asap-hub/model';

import {
  addLocaleToFields,
  Environment,
  getBulkPayload,
  getLinkEntities,
  getLinkEntity,
  gp2 as gp2Contentful,
  GraphQLClient,
  Link,
  Maybe,
  patchAndPublish,
  pollContentfulGql,
} from '@asap-hub/contentful';
import logger from '../utils/logger';
import { parseTag, TagItem } from './tag.data-provider';
import { parseOrcidWorkFromCMS } from './transformers/users';
import {
  fetchProjectMembersPage,
  fetchWorkingGroupMembersPage,
  memoizeMembersPage,
  withAllMembers,
} from './transformers';
import { UserDataProvider } from './types';

export type UserItem = NonNullable<
  NonNullable<gp2Contentful.FetchUsersQuery['usersCollection']>['items'][number]
>;
type MembersPageFetchers = {
  project: ReturnType<typeof fetchProjectMembersPage>;
  workingGroup: ReturnType<typeof fetchWorkingGroupMembersPage>;
};

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
    private graphQLClient: GraphQLClient,
    private getRestClient: () => Promise<Environment>,
  ) {}

  private fetchUserById(id: string) {
    return this.graphQLClient.request<
      gp2Contentful.FetchUserByIdQuery,
      gp2Contentful.FetchUserByIdQueryVariables
    >(gp2Contentful.FETCH_USER_BY_ID, { id });
  }
  private async fetchUsersByProject(ids: string[]) {
    const { projectsCollection } = await this.graphQLClient.request<
      gp2Contentful.FetchUsersByProjectIdsQuery,
      gp2Contentful.FetchUsersByProjectIdsQueryVariables
    >(gp2Contentful.FETCH_USERS_BY_PROJECT_IDS, { ids });
    return projectsCollection;
  }
  private async fetchUsersByWorkingGroup(ids: string[]) {
    const { workingGroupsCollection } = await this.graphQLClient.request<
      gp2Contentful.FetchUsersByWorkingGroupIdsQuery,
      gp2Contentful.FetchUsersByWorkingGroupIdsQueryVariables
    >(gp2Contentful.FETCH_USERS_BY_WORKING_GROUP_IDS, { ids });
    return workingGroupsCollection;
  }

  private async fetchUsersByTag(ids: string[]) {
    const { usersCollection } = await this.graphQLClient.request<
      gp2Contentful.FetchUsersByTagIdsQuery,
      gp2Contentful.FetchUsersByTagIdsQueryVariables
    >(gp2Contentful.FETCH_USERS_BY_TAG_IDS, { ids });
    return usersCollection;
  }
  private async getUsersByTags(ids?: string[]) {
    if (!ids) {
      return [];
    }
    const entities = await this.fetchUsersByTag(ids);
    return entities?.items.flatMap((entity) => entity?.sys.id || []);
  }
  async fetchById(id: string) {
    const { users } = await this.fetchUserById(id);
    return users
      ? parseUserToDataObject(
          await this.withAllMembers(users, this.membersPageFetchers()),
        )
      : null;
  }

  private membersPageFetchers(): MembersPageFetchers {
    return {
      project: memoizeMembersPage(fetchProjectMembersPage(this.graphQLClient)),
      workingGroup: memoizeMembersPage(
        fetchWorkingGroupMembersPage(this.graphQLClient),
      ),
    };
  }

  private async withAllMembers(
    user: UserItem,
    fetchers: MembersPageFetchers,
  ): Promise<UserItem> {
    const { linkedFrom } = user;
    if (!linkedFrom) {
      return user;
    }
    const [projectMembershipCollection, workingGroupMembershipCollection] =
      await Promise.all([
        this.completeProjectMemberships(
          linkedFrom.projectMembershipCollection,
          fetchers.project,
        ),
        this.completeWorkingGroupMemberships(
          linkedFrom.workingGroupMembershipCollection,
          fetchers.workingGroup,
        ),
      ]);
    return {
      ...user,
      linkedFrom: {
        ...linkedFrom,
        projectMembershipCollection,
        workingGroupMembershipCollection,
      },
    };
  }

  private async completeProjectMemberships(
    memberships: LinkedProject,
    fetchMembersPage: MembersPageFetchers['project'],
  ) {
    if (!memberships) {
      return memberships;
    }
    const items = await Promise.all(
      memberships.items.map(async (membership) => {
        const projects = membership?.linkedFrom?.projectsCollection;
        if (!membership || !projects) {
          return membership;
        }
        const projectItems = await Promise.all(
          projects.items.map((project) =>
            project ? withAllMembers(project, fetchMembersPage) : project,
          ),
        );
        return {
          ...membership,
          linkedFrom: {
            ...membership.linkedFrom,
            projectsCollection: { ...projects, items: projectItems },
          },
        };
      }),
    );
    return { ...memberships, items };
  }

  private async completeWorkingGroupMemberships(
    memberships: LinkedWorkingGroup,
    fetchMembersPage: MembersPageFetchers['workingGroup'],
  ) {
    if (!memberships) {
      return memberships;
    }
    const items = await Promise.all(
      memberships.items.map(async (membership) => {
        const workingGroups = membership?.linkedFrom?.workingGroupsCollection;
        if (!membership || !workingGroups) {
          return membership;
        }
        const workingGroupItems = await Promise.all(
          workingGroups.items.map((workingGroup) =>
            workingGroup
              ? withAllMembers(workingGroup, fetchMembersPage)
              : workingGroup,
          ),
        );
        return {
          ...membership,
          linkedFrom: {
            ...membership.linkedFrom,
            workingGroupsCollection: {
              ...workingGroups,
              items: workingGroupItems,
            },
          },
        };
      }),
    );
    return { ...memberships, items };
  }

  private getUserIdFilter = async (
    {
      projects,
      workingGroups,
      tags,
      userIds,
    }: NonNullable<gp2Model.FetchUsersOptions['filter']>,
    fetchers: MembersPageFetchers,
  ): Promise<string[]> => {
    const unfilteredUserIds = await Promise.all([
      getEntityMemberUserIds(
        projects,
        this.fetchUsersByProject.bind(this),
        fetchers.project,
      ),
      getEntityMemberUserIds(
        workingGroups,
        this.fetchUsersByWorkingGroup.bind(this),
        fetchers.workingGroup,
      ),
      this.getUsersByTags(tags),
      userIds,
    ]);

    return unfilteredUserIds
      .flat()
      .filter((userId): userId is string => Boolean(userId))
      .filter((userId, index, arr) => arr.indexOf(userId) === index);
  };
  async fetch(options: gp2Model.FetchUsersOptions) {
    const { projects, workingGroups, userIds, tags } = options.filter || {};
    const fetchers = this.membersPageFetchers();
    const userIdFilter = await this.getUserIdFilter(
      { projects, workingGroups, userIds, tags },
      fetchers,
    );
    if (
      userIdFilter.length === 0 &&
      (projects?.length || workingGroups?.length || tags?.length)
    ) {
      return { total: 0, items: [] };
    }
    logger.debug(`fetch users ${JSON.stringify(options, undefined, 2)} `);
    const result = await this.fetchUsers(options, userIdFilter);

    const users = await Promise.all(
      result.items
        .filter((user: unknown): user is UserItem => user !== null)
        .map((user) => this.withAllMembers(user, fetchers)),
    );
    const items = {
      total: result.total,
      items: users.map(parseUserToDataObject),
    };

    logger.debug(JSON.stringify(items, undefined, 2));
    return items;
  }

  private async fetchUsers(
    options: gp2Model.FetchUsersOptions,
    userIdFilter: string[],
  ) {
    const { take = 8, skip = 0 } = options;

    const where = generateFetchQueryFilter(options, userIdFilter);
    logger.debug(`fetch users where: ${JSON.stringify(where, undefined, 2)}`);

    const { usersCollection } = await this.graphQLClient.request<
      gp2Contentful.FetchUsersQuery,
      gp2Contentful.FetchUsersQueryVariables
    >(gp2Contentful.FETCH_USERS, {
      limit: take,
      skip,
      where,
      order: [gp2Contentful.UsersOrder.SysFirstPublishedAtDesc],
    });
    return usersCollection || { total: 0, items: [] };
  }

  async fetchForOrcidSync(options: gp2Model.FetchUsersOptions) {
    const { take = 8, skip = 0 } = options;
    const where = generateFetchQueryFilter(options, []);
    logger.debug(
      `fetch users for ORCID sync where: ${JSON.stringify(
        where,
        undefined,
        2,
      )}`,
    );

    const { usersCollection } = await this.graphQLClient.request<
      gp2Contentful.FetchUsersForOrcidSyncQuery,
      gp2Contentful.FetchUsersForOrcidSyncQueryVariables
    >(gp2Contentful.FETCH_USERS_FOR_ORCID_SYNC, {
      limit: take,
      skip,
      where,
      order: [gp2Contentful.UsersOrder.SysFirstPublishedAtDesc],
    });

    const items = usersCollection?.items || [];
    return {
      total: usersCollection?.total || 0,
      items: items
        .filter((user): user is NonNullable<typeof user> => user !== null)
        .map((user) => ({
          id: user.sys.id,
          email: user.email || '',
          orcid: user.orcid || '',
        })),
    };
  }

  async create(data: gp2Model.UserCreateDataObject) {
    const fields = cleanUser(data);
    const environment = await this.getRestClient();
    const nextContributingCohorts = await addNextCohorts(
      environment,
      data.contributingCohorts,
    );
    const cohortFields = getCohortFields(nextContributingCohorts);
    const userEntry = await environment.createEntry('users', {
      fields: addLocaleToFields({
        ...fields,
        ...cohortFields,
        ...(data.tags
          ? { tags: getLinkEntities(data.tags.map((tag) => tag.id)) }
          : {}),
      }),
    });

    await userEntry.publish();

    return userEntry.sys.id;
  }

  async update(id: string, data: gp2Model.UserUpdateDataObject) {
    const fields = cleanUser(data);
    const environment = await this.getRestClient();
    const user = await environment.getEntry(id);
    const previousContributingCohorts = user.fields.contributingCohorts;

    logger.debug(`The user: ${JSON.stringify(user, undefined, 2)}`);

    const nextContributingCohorts = await addNextCohorts(
      environment,
      data.contributingCohorts,
    );

    const cohortFields = getCohortFields(nextContributingCohorts);

    const isAlumni = user.fields.alumniSinceDate?.['en-US'] != null;
    const shouldStampAlumni =
      'alumniSinceDate' in data ||
      'alumniLocation' in data ||
      (isAlumni && 'email' in data);

    const result = await patchAndPublish(user, {
      ...fields,
      ...cohortFields,
      ...(shouldStampAlumni
        ? { alumniLastUpdated: new Date().toISOString() }
        : {}),
      ...(data.tags
        ? { tags: getLinkEntities(data.tags.map((tag) => tag.id)) }
        : {}),
    });

    await removePreviousCohorts(
      environment,
      data.contributingCohorts,
      previousContributingCohorts,
    );
    const fetchEventById = () => this.fetchUserById(id);
    await pollContentfulGql<gp2Contentful.FetchUserByIdQuery>(
      result.sys.publishedVersion ?? Infinity,
      fetchEventById,
      'users',
    );
  }
}

const cleanUser = (userToUpdate: gp2Model.UserUpdateDataObject) =>
  Object.entries(userToUpdate).reduce(
    (acc, [key, value]) => {
      if (key === 'avatar') {
        return {
          ...acc,
          avatar: {
            sys: {
              type: 'Link',
              linkType: 'Asset',
              id: value,
            },
          },
        };
      }
      if (key === 'social') {
        // the frontend only sends the fields which have values defined
        // so need to default all social keys to null to allow unsetting
        return {
          ...acc,
          blog: null,
          blueSky: null,
          threads: null,
          twitter: null,
          linkedIn: null,
          github: null,
          orcid: null,
          researcherId: null,
          googleScholar: null,
          researchGate: null,
          ...(value as gp2Model.UserSocial),
        };
      }

      if (key === 'telephone') {
        return {
          ...acc,
          telephoneNumber: (value as gp2Model.UserUpdateDataObject['telephone'])
            ?.number,
          telephoneCountryCode: (
            value as gp2Model.UserUpdateDataObject['telephone']
          )?.countryCode,
        };
      }
      if (key === 'connections') {
        const connections = userToUpdate.connections || [];
        return {
          ...acc,
          connections: connections.map(({ code }) => code),
        };
      }
      return { ...acc, [key]: value };
    },
    {} as { [key: string]: unknown },
  );

export const parseUserToDataObject = (
  user: UserItem,
): gp2Model.UserDataObject => {
  const normaliseArray = (
    inputs: Maybe<Maybe<string>[]> | undefined,
  ): string[] =>
    (inputs || []).reduce<string[]>(
      (parsed, input) => (input ? [...parsed, input] : parsed),
      [],
    );

  const questions = normaliseArray(user.questions);
  const connections = normaliseArray(user.connections);

  const telephone =
    user.telephoneNumber || user.telephoneCountryCode
      ? {
          countryCode: user.telephoneCountryCode ?? undefined,
          number: user.telephoneNumber ?? undefined,
        }
      : undefined;
  const contributingCohorts = parseContributingCohorts(
    user.contributingCohortsCollection,
  );
  const tags =
    user.tagsCollection?.items
      .filter((tag): tag is TagItem => tag !== null)
      .map(parseTag) ?? [];
  const outputs = parseOutputs(user.linkedFrom?.outputsCollection);
  const positions = parsePositions(user.positions);
  const projects = parseProjects(user.linkedFrom?.projectMembershipCollection);
  const workingGroups = parseWorkingGroups(
    user.linkedFrom?.workingGroupMembershipCollection,
  );
  const orcidWorks: OrcidWork[] = parseOrcidWorksContentful(
    user.orcidWorks || [],
  );

  return {
    id: user.sys.id,
    systemPublishedVersion: user.sys.publishedVersion ?? undefined,
    activeCampaignId: user.activeCampaignId || undefined,
    createdDate: user.sys.firstPublishedAt,
    activatedDate: user.activatedDate ?? undefined,
    lastModifiedDate: user.sys.publishedAt,
    onboarded: !!user.onboarded,
    alumniSinceDate: user.alumniSinceDate ?? undefined,
    alumniLocation: user.alumniLocation ?? undefined,
    alumniLastUpdated: user.alumniLastUpdated ?? undefined,
    email: user.email ?? '',
    alternativeEmail: user.alternativeEmail ?? undefined,
    firstName: user.firstName ?? '',
    middleName: user.middleName || undefined,
    lastName: user.lastName ?? '',
    nickname: user.nickname || undefined,
    biography: user.biography ?? undefined,
    city: user.city ?? undefined,
    stateOrProvince: user.stateOrProvince ?? '',
    country: user.country ?? '',
    region: user.region as gp2Model.UserRegion,
    avatarUrl: user.avatar?.url ?? undefined,
    questions,
    role: user.role as gp2Model.UserRole,
    degrees: (user.degrees as gp2Model.UserDegree[]) ?? [],
    connections: connections.map((connection) => ({ code: connection })),
    tags,
    telephone,
    fundingStreams: user.fundingStreams ?? undefined,
    social: {
      linkedIn: user.linkedIn ?? undefined,
      orcid: user.orcid ? `https://orcid.org/${user.orcid}` : undefined,
      researcherId: user.researcherId ?? undefined,
      blueSky: user.blueSky ?? undefined,
      threads: user.threads ?? undefined,
      twitter: user.twitter ?? undefined,
      github: user.github ?? undefined,
      blog: user.blog ?? undefined,
      googleScholar: user.googleScholar ?? undefined,
      researchGate: user.researchGate ?? undefined,
    },
    outputs,
    positions,
    projects,
    contributingCohorts,
    workingGroups,
    orcid: user.orcid ?? undefined,
    orcidLastModifiedDate: user.orcidLastModifiedDate ?? undefined,
    orcidLastSyncDate: user.orcidLastSyncDate ?? undefined,
    orcidWorks,
  };
};
const generateFetchQueryFilter = (
  { filter, search }: gp2Model.FetchUsersOptions,
  userIdFilter: string[],
): gp2Contentful.UsersFilter => {
  const {
    regions,
    code,
    onlyOnboarded,
    orcid,
    orcidLastSyncDate,
    hidden = true,
    email,
    membershipStatus,
  } = filter || {};

  const filterCode: gp2Contentful.UsersFilter = code
    ? { connections_contains_all: [code] }
    : {};
  const filterHidden: gp2Contentful.UsersFilter = hidden
    ? { role_not: 'Hidden' }
    : {};
  const filterNonOnboarded: gp2Contentful.UsersFilter = onlyOnboarded
    ? { onboarded: true }
    : {};
  const filterRegions: gp2Contentful.UsersFilter = regions
    ? { region_in: regions }
    : {};
  const filterOrcid = orcid ? { orcid_contains: orcid } : {};
  const filterOrcidLastSyncDate = orcidLastSyncDate
    ? { orcidLastSyncDate_lt: orcidLastSyncDate }
    : {};
  const searchFilter = search ? getSearchFilter(search) : {};
  const filterUserId =
    userIdFilter.length > 0 ? { sys: { id_in: userIdFilter } } : {};
  const filterEmail = email ? { email } : {};
  const filterMembershipStatus: gp2Contentful.UsersFilter =
    membershipStatus?.length
      ? {
          OR: membershipStatus.map((status) =>
            status === 'Alumni Member'
              ? { alumniSinceDate_exists: true }
              : { alumniSinceDate_exists: false },
          ),
        }
      : {};
  return {
    ...filterUserId,
    ...filterCode,
    ...filterNonOnboarded,
    ...filterHidden,
    ...filterRegions,
    ...filterOrcid,
    ...filterOrcidLastSyncDate,
    ...searchFilter,
    ...filterEmail,
    ...filterMembershipStatus,
  };
};

type ContributingCohorts = NonNullable<
  NonNullable<gp2Contentful.FetchUsersQuery['usersCollection']>['items'][number]
>['contributingCohortsCollection'];

const parseContributingCohorts = (contributingCohorts: ContributingCohorts) =>
  contributingCohorts?.items.reduce(
    (cohorts: gp2Model.UserDataObject['contributingCohorts'], cohort) =>
      cohort?.contributingCohort
        ? [
            ...cohorts,
            {
              contributingCohortId: cohort.contributingCohort.sys.id,
              name: cohort.contributingCohort.name ?? '',
              role: cohort.role as gp2Model.UserContributingCohortRole,
              ...(cohort.contributingCohort.studyLink && {
                studyUrl: cohort.contributingCohort.studyLink,
              }),
            },
          ]
        : cohorts,
    [],
  ) || [];

type LinkedOutputs = NonNullable<
  NonNullable<
    NonNullable<
      gp2Contentful.FetchUsersQuery['usersCollection']
    >['items'][number]
  >['linkedFrom']
>['outputsCollection'];

type LinkedProject = NonNullable<
  NonNullable<
    NonNullable<
      gp2Contentful.FetchUsersQuery['usersCollection']
    >['items'][number]
  >['linkedFrom']
>['projectMembershipCollection'];
type LinkedWorkingGroup = NonNullable<
  NonNullable<
    NonNullable<
      gp2Contentful.FetchUsersQuery['usersCollection']
    >['items'][number]
  >['linkedFrom']
>['workingGroupMembershipCollection'];
type LinkedProjectItem = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<NonNullable<LinkedProject>['items'][number]>['linkedFrom']
    >['projectsCollection']
  >['items'][number]
>;
type LinkedProjectMembers = LinkedProjectItem['membersCollection'];
type LinkedWorkingGroupItem = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<LinkedWorkingGroup>['items'][number]
      >['linkedFrom']
    >['workingGroupsCollection']
  >['items'][number]
>;

type LinkedWorkingGroupMembers = LinkedWorkingGroupItem['membersCollection'];
export type Member<T> = {
  userId: string;
  role: T;
};
export const parseMembers = <T extends string>(
  members: LinkedProjectMembers | LinkedWorkingGroupMembers,
) =>
  members?.items.reduce((membersList: Member<T>[], member) => {
    const user = member?.user;
    const role = member?.role as T;
    if (!(user && user.onboarded)) {
      return membersList;
    }
    const groupMember = { role, userId: user.sys.id };
    return [...membersList, groupMember];
  }, []) || [];

const parseOutputs = (
  outputs: LinkedOutputs,
): gp2Model.UserDataObject['outputs'] =>
  (outputs &&
    outputs.items
      .filter(
        (
          output,
        ): output is Pick<
          gp2Contentful.Outputs,
          'title' | 'shortDescription' | 'sharingStatus' | 'gp2Supported'
        > & {
          sys: Pick<gp2Contentful.Sys, 'id'>;
          sharingStatus: gp2Model.OutputSharingStatus;
          gp2Supported: gp2Model.DecisionOption;
        } =>
          (output &&
            output.sharingStatus &&
            output.gp2Supported &&
            isSharingStatus(output.sharingStatus) &&
            isDecisionOption(output.gp2Supported)) ||
          false,
      )
      .map((output) => ({
        id: output.sys.id,
        title: output.title || '',
        shortDescription: output.shortDescription || '',
        sharingStatus: output.sharingStatus,
        gp2Supported: output.gp2Supported,
      }))) ||
  [];

const isSharingStatus = (
  sharingStatus: string,
): sharingStatus is gp2Model.OutputSharingStatus =>
  ['GP2 Only', 'Public'].includes(sharingStatus);

const isDecisionOption = (
  decision: string,
): decision is gp2Model.DecisionOption => ['Yes', 'No'].includes(decision);

const parseProjects = (
  projects: LinkedProject,
): gp2Model.UserDataObject['projects'] =>
  projects?.items
    .reduce((projectList: LinkedProjectItem[], project) => {
      const linked = project?.linkedFrom?.projectsCollection?.items[0];
      return linked ? [...projectList, linked] : projectList;
    }, [])
    .map((project) => {
      const projectId = project.sys.id;
      const status = project.status as gp2Model.ProjectStatus;
      const members = parseMembers<gp2Model.ProjectMemberRole>(
        project.membersCollection,
      );
      return {
        id: projectId,
        status,
        title: project.title ?? '',
        members,
      };
    }) || [];

const parseWorkingGroups = (
  workingGroupItems: LinkedWorkingGroup,
): gp2Model.UserDataObject['workingGroups'] =>
  workingGroupItems?.items
    .reduce(
      (
        workingGroups: Array<{
          workingGroup: LinkedWorkingGroupItem;
          role: gp2Model.WorkingGroupMemberRole;
        }>,
        workingGroup,
      ) => {
        const associatedWorkingGroup =
          workingGroup?.linkedFrom?.workingGroupsCollection?.items[0];

        if (
          !associatedWorkingGroup ||
          !workingGroup?.role ||
          !isWorkingGroupRole(workingGroup.role)
        ) {
          return workingGroups;
        }

        const linked = {
          workingGroup: associatedWorkingGroup,
          role: workingGroup.role,
        };
        return [...workingGroups, linked];
      },
      [],
    )
    .map((userWorkingGroup) => {
      const workingGroupId = userWorkingGroup.workingGroup.sys.id;
      const members = parseMembers<gp2Model.WorkingGroupMemberRole>(
        userWorkingGroup.workingGroup.membersCollection,
      );
      return {
        id: workingGroupId,
        title: userWorkingGroup.workingGroup.title ?? '',
        members,
        role: userWorkingGroup.role,
      };
    }) || [];

const parsePositions = (
  positions: NonNullable<
    NonNullable<
      gp2Contentful.FetchUsersQuery['usersCollection']
    >['items'][number]
  >['positions'],
): gp2Model.UserDataObject['positions'] =>
  positions?.map(
    ({
      role,
      department,
      institution,
    }: {
      role: string;
      department: string;
      institution: string;
    }) => ({
      role,
      department,
      institution,
    }),
  ) || [];

type MemberUserIdItems = {
  items: Array<{ user?: { sys: { id: string } } | null } | null>;
};
const getEntityMemberUserIds = async (
  ids: string[] | undefined,
  queryFetchMemberData: (
    filter: string[],
  ) => Promise<
    | gp2Contentful.FetchUsersByWorkingGroupIdsQuery['workingGroupsCollection']
    | gp2Contentful.FetchUsersByProjectIdsQuery['projectsCollection']
  >,
  fetchMembersPage: (
    entityId: string,
    limit: number,
    skip: number,
  ) => Promise<MemberUserIdItems | null | undefined>,
) => {
  if (!ids) {
    return [];
  }
  const entities = await queryFetchMemberData(ids);
  if (!entities) {
    return [];
  }
  const completedEntities = await Promise.all(
    entities.items.map((entity) =>
      entity ? withAllMembers(entity, fetchMembersPage) : entity,
    ),
  );
  return completedEntities.flatMap(
    (entity) =>
      entity?.membersCollection?.items.map((member) => member?.user?.sys.id) ||
      [],
  );
};

const isWorkingGroupRole = (
  role: string,
): role is gp2Model.WorkingGroupMemberRole =>
  ['Lead', 'Co-lead', 'Working group member'].includes(role);

const getSearchFilter = (search: string) => {
  type SearchFields = {
    OR: (
      | (Pick<gp2Contentful.UsersFilter, 'firstName_contains'> & {
          lastName_contains?: undefined;
        })
      | (Pick<gp2Contentful.UsersFilter, 'lastName_contains'> & {
          firstName_contains?: undefined;
        })
    )[];
  };

  const filter = search
    .split(' ')
    .filter(Boolean) // removes whitespaces
    .reduce<SearchFields[]>(
      (acc, word: string) => [
        ...acc,
        {
          OR: [{ firstName_contains: word }, { lastName_contains: word }],
        },
      ],
      [],
    );

  return { AND: [...filter] };
};
const getCohortFields = (nextContributingCohorts: string[] | undefined) =>
  nextContributingCohorts
    ? {
        contributingCohorts: getLinkEntities(nextContributingCohorts, false),
      }
    : {};

const addNextCohorts = async (
  environment: Environment,
  nextCohorts?: gp2Model.UserUpdateDataObject['contributingCohorts'],
) => {
  if (nextCohorts && nextCohorts.length > 0) {
    const nextContributingCohorts = await Promise.all(
      nextCohorts.map(async ({ contributingCohortId, role }) => {
        const entry = await environment.createEntry(
          'contributingCohortsMembership',
          {
            fields: addLocaleToFields({
              contributingCohort: getLinkEntity(contributingCohortId, false),
              role,
            }),
          },
        );
        return entry.sys.id;
      }),
    );

    const payload = getBulkPayload(nextContributingCohorts, true);
    const publish = await environment.createPublishBulkAction(payload);
    await publish.waitProcessing();
    return nextContributingCohorts;
  }
  return undefined;
};

const removePreviousCohorts = async (
  environment: Environment,
  nextCohorts?: gp2Model.UserUpdateDataObject['contributingCohorts'],
  previousContributingCohorts?: { 'en-US': Link<'Entry'>[] },
) => {
  if (previousContributingCohorts && nextCohorts && nextCohorts.length > 0) {
    const previousCohorts = previousContributingCohorts['en-US'].map(
      (cohort) => cohort.sys.id,
    );
    const payload = getBulkPayload(previousCohorts, false);
    const unpublish = await environment.createUnpublishBulkAction(payload);
    await unpublish.waitProcessing();
    const cohortEntities = await environment.getEntries({
      content_type: 'contributingCohortsMembership',
      'sys.id[in]': previousCohorts.join(','),
    });
    return Promise.all(cohortEntities.items.map((entry) => entry.delete()));
  }
  return null;
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
