import {
  addLocaleToFields,
  Environment,
  getLinkEntities,
  getLinkEntity,
  gp2 as gp2Contentful,
  GraphQLClient,
  patchAndPublish,
} from '@asap-hub/contentful';
import { gp2 as gp2Model } from '@asap-hub/model';
import { parseUserDisplayName } from '@asap-hub/server-common';
import { fetchAllCollectionItems } from '../../utils/fetch-all-collection-items';
import { GraphQLProject } from '../project.data-provider';
import { GraphQLWorkingGroup } from '../working-group.data-provider';
import { getIdsToDelete } from './common';

export const MEMBERS_PAGE_SIZE = 100;

type MembersCollection = { total: number; items: unknown[] };
type EntityWithMembers = {
  sys: { id: string };
  membersCollection?: MembersCollection | null;
};
type FetchMembersPage<E extends EntityWithMembers> = (
  id: string,
  limit: number,
  skip: number,
) => Promise<
  Pick<NonNullable<E['membersCollection']>, 'items'> | null | undefined
>;

export const withAllMembers = async <E extends EntityWithMembers>(
  entity: E,
  fetchMembersPage: FetchMembersPage<E>,
): Promise<E> => ({
  ...entity,
  membersCollection: await fetchAllCollectionItems(
    entity.membersCollection,
    MEMBERS_PAGE_SIZE,
    (limit, skip) => fetchMembersPage(entity.sys.id, limit, skip),
  ),
});

type PageFetcher = (
  id: string,
  limit: number,
  skip: number,
) => Promise<unknown>;

export const memoizeMembersPage = <F extends PageFetcher>(
  fetchMembersPage: F,
): F => {
  const pages = new Map<string, ReturnType<F>>();
  return ((id: string, limit: number, skip: number) => {
    const key = `${id}:${limit}:${skip}`;
    const page =
      pages.get(key) ?? (fetchMembersPage(id, limit, skip) as ReturnType<F>);
    pages.set(key, page);
    return page;
  }) as unknown as F;
};

export const fetchWorkingGroupMembersPage =
  (graphQLClient: GraphQLClient) =>
  async (id: string, limit: number, skip: number) => {
    const { workingGroups } = await graphQLClient.request<
      gp2Contentful.FetchWorkingGroupMembersQuery,
      gp2Contentful.FetchWorkingGroupMembersQueryVariables
    >(gp2Contentful.FETCH_WORKING_GROUP_MEMBERS, { id, limit, skip });
    return workingGroups?.membersCollection;
  };

export const fetchProjectMembersPage =
  (graphQLClient: GraphQLClient) =>
  async (id: string, limit: number, skip: number) => {
    const { projects } = await graphQLClient.request<
      gp2Contentful.FetchProjectMembersQuery,
      gp2Contentful.FetchProjectMembersQueryVariables
    >(gp2Contentful.FETCH_PROJECT_MEMBERS, { id, limit, skip });
    return projects?.membersCollection;
  };

type MembersItem =
  | GraphQLWorkingGroup['membersCollection']
  | GraphQLProject['membersCollection'];

type RawMemberItem = NonNullable<NonNullable<MembersItem>['items'][number]>;
type MemberItem = NonNullable<
  NonNullable<GraphQLProject['membersCollection']>['items'][number]
>;
const parseMember = <T extends string>(
  id: string,
  user: NonNullable<MemberItem['user']>,
  role: MemberItem['role'],
  inactiveSinceDate?: string | null,
): {
  id: string;
  userId: string;
  role: T;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;
  alumniSinceDate?: string;
  inactiveSinceDate?: string;
} => ({
  id,
  userId: user.sys.id,
  role: (role ?? '') as T,
  firstName: user.firstName ?? '',
  lastName: user.lastName ?? '',
  displayName: parseUserDisplayName(
    user.firstName ?? '',
    user.lastName ?? '',
    undefined,
    user.nickname ?? '',
  ),
  avatarUrl: user.avatar?.url ?? undefined,
  alumniSinceDate: user.alumniSinceDate ?? undefined,
  inactiveSinceDate: inactiveSinceDate ?? undefined,
});

export const parseMembers = <T extends string>(members: MembersItem) =>
  members?.items
    .filter((member): member is RawMemberItem => member !== null)
    .reduce((membersList: gp2Model.Member<T>[], rawMember) => {
      const member = rawMember as MemberItem;
      const { user } = member;
      if (!user?.onboarded) {
        return membersList;
      }
      const inactiveSinceDate =
        'inactiveSinceDate' in member
          ? (member.inactiveSinceDate as string | null | undefined)
          : undefined;
      const groupMember = parseMember<T>(
        member.sys.id,
        user,
        member.role,
        inactiveSinceDate,
      );
      return [...membersList, groupMember];
    }, []) || [];

const addNextMember = async <T extends string>(
  environment: Environment,
  members: gp2Model.UpdateMember<T>[] | undefined,
  entryName: string,
): Promise<string[]> => {
  const nextMembers = members?.filter((member) => !member.id);
  if (!nextMembers?.length) {
    return [];
  }
  return Promise.all(
    nextMembers.map(async (member) => {
      const entry = await environment.createEntry(entryName, {
        fields: addLocaleToFields({
          role: member.role,
          user: getLinkEntity(member.userId),
        }),
      });
      await entry.publish();
      return entry.sys.id;
    }),
  );
};
const outUnchangedMembers =
  <T extends string>(previousMembers: gp2Model.Member<T>[] | undefined) =>
  (member: gp2Model.Member<T>) => {
    const previousMember = previousMembers?.filter(
      (previous) => previous.id === member.id,
    );
    return !(
      previousMember?.[0]?.role === member.role ||
      previousMember?.[0]?.userId === member.userId
    );
  };
type MemberWithId<T extends string> = gp2Model.Member<T> & {
  id: string;
};
const updateMembers = async <T extends string>(
  members: gp2Model.UpdateMember<T>[] | undefined,
  idsToDelete: string[],
  previousMembers: gp2Model.Member<T>[] | undefined,
  environment: Environment,
): Promise<string[]> => {
  const toUpdate = (members || []).filter(
    (member): member is MemberWithId<T> =>
      !!member.id && !idsToDelete.includes(member.id),
  );
  await Promise.all(
    toUpdate
      .filter(outUnchangedMembers(previousMembers))
      .map(async ({ id, role, userId }) => {
        const updatable = await environment.getEntry(id);
        return patchAndPublish(updatable, {
          role,
          user: getLinkEntity(userId),
        });
      }),
  );
  return toUpdate.map(({ id }) => id);
};
const getMemberFields = (nextMembers: string[]) => ({
  members: getLinkEntities(nextMembers, false),
});
export const processMembers = async <T extends string>(
  environment: Environment,
  members: gp2Model.UpdateMember<T>[] | undefined,
  previousMembers: gp2Model.Member<T>[] | undefined,
  entryName: string,
) => {
  const nextMembers = await addNextMember(environment, members, entryName);

  const idsToDelete = getIdsToDelete(previousMembers, members);
  const updatedIds = await updateMembers(
    members,
    idsToDelete,
    previousMembers,
    environment,
  );

  const fields = getMemberFields([...nextMembers, ...updatedIds]);
  return { fields, idsToDelete };
};
