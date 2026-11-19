import { FieldAppSDK } from '@contentful/app-sdk';
import { EntryProps } from 'contentful-management';

export type EntryLink = {
  sys: { type: 'Link'; linkType: 'Entry'; id: string };
};

const QUERY_LIMIT = 1000;

export const toLink = (id: string): EntryLink => ({
  sys: { type: 'Link', linkType: 'Entry', id },
});

const isNotArchived = (entry: EntryProps) => !entry.sys.archivedVersion;

export const mergeOrder = (
  current: EntryLink[] | undefined,
  ids: string[],
): EntryLink[] => {
  const available = new Set(ids);
  const kept = (current ?? []).filter((link) => available.has(link.sys.id));
  const keptIds = new Set(kept.map((link) => link.sys.id));
  const added = ids.filter((id) => !keptIds.has(id)).map(toLink);
  return [...kept, ...added];
};

export const isSameOrder = (
  current: EntryLink[] | undefined,
  next: EntryLink[],
) =>
  (current ?? []).length === next.length &&
  next.every((link, index) => current?.[index]?.sys.id === link.sys.id);

// Users with an active membership matching the query. Uses the same rules as
// the Teams page (team.data-provider.ts) so member counts match: the membership
// has a role and no Inactive Since date, and the user is published, onboarded
// and not alumni.
const getActiveMemberIds = async (
  sdk: FieldAppSDK,
  membershipQuery: Record<string, string>,
): Promise<string[]> => {
  const memberships = await sdk.cma.entry.getMany({
    query: {
      content_type: 'teamMembership',
      ...membershipQuery,
      'fields.role[exists]': true,
      'fields.inactiveSinceDate[exists]': false,
      limit: QUERY_LIMIT,
    },
  });
  const membershipIds = memberships.items
    .filter(isNotArchived)
    .map((membership) => membership.sys.id);

  if (!membershipIds.length) {
    return [];
  }

  const users = await sdk.cma.entry.getMany({
    query: {
      content_type: 'users',
      'fields.teams.sys.id[in]': membershipIds.join(','),
      'fields.onboarded': true,
      'fields.alumniSinceDate[exists]': false,
      'sys.publishedVersion[exists]': true,
      order: 'fields.firstName,fields.lastName',
      limit: QUERY_LIMIT,
    },
  });

  return users.items.filter(isNotArchived).map((user) => user.sys.id);
};

export const getAsapAreaMemberIds = (sdk: FieldAppSDK): Promise<string[]> =>
  getActiveMemberIds(sdk, {
    'fields.asapAreas.sys.id': sdk.entry.getSys().id,
  });

export const getTeamAsapMemberIds = (
  sdk: FieldAppSDK,
  teamAsapId: string,
): Promise<string[]> =>
  getActiveMemberIds(sdk, { 'fields.team.sys.id': teamAsapId });

export const getAsapAreaIds = async (sdk: FieldAppSDK): Promise<string[]> => {
  const areas = await sdk.cma.entry.getMany({
    query: {
      content_type: 'asapAreas',
      order: 'fields.name',
      limit: QUERY_LIMIT,
    },
  });

  return areas.items.filter(isNotArchived).map((area) => area.sys.id);
};

export const getTeamAsapId = async (
  sdk: FieldAppSDK,
): Promise<string | null> => {
  const aboutAsap = await sdk.cma.entry.getMany({
    query: { content_type: 'discover', limit: 1 },
  });

  return aboutAsap.items[0]?.fields.membersTeam?.['en-US']?.sys.id ?? null;
};
