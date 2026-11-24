import {
  AsapAreaDataObject,
  AsapAreaMember,
  DiscoverDataObject,
} from '@asap-hub/model';
import { parseUserDisplayName } from '@asap-hub/server-common';
import {
  GraphQLClient,
  FETCH_DISCOVER,
  FetchDiscoverQuery,
  parseRichText,
  RichTextFromQuery,
} from '@asap-hub/contentful';
import { DiscoverDataProvider } from '../types';
import { parseContentfulGraphQlUsers } from './user.data-provider';
import reducer from '../../utils/reducer';
import { parseUserToResponse } from '../../controllers/user.controller';

type DiscoverItem = NonNullable<
  NonNullable<FetchDiscoverQuery['discoverCollection']>['items']
>[number];

type UserItem = NonNullable<
  NonNullable<NonNullable<DiscoverItem>['membersCollection']>['items']
>[number];

type UserResult = ReturnType<typeof parseContentfulGraphQlUsers>;

type AsapAreaItem = NonNullable<
  NonNullable<NonNullable<DiscoverItem>['asapAreasCollection']>['items'][number]
>;

type AsapAreaMembership = NonNullable<
  NonNullable<
    NonNullable<AsapAreaItem['linkedFrom']>['teamMembershipCollection']
  >['items'][number]
>;

export class DiscoverContentfulDataProvider implements DiscoverDataProvider {
  constructor(private contentfulClient: GraphQLClient) {}

  async fetch(): Promise<DiscoverDataObject> {
    const { discoverCollection } =
      await this.contentfulClient.request<FetchDiscoverQuery>(FETCH_DISCOVER);
    return parseGraphQLDiscover(discoverCollection?.items[0] || null);
  }
}

const reduceUsers = reducer<UserItem, UserResult>(parseContentfulGraphQlUsers);

// Same rules as the Teams page and the ASAP Areas Fields app: the membership
// has a role and no Inactive Since date, and the user is onboarded and not
// alumni. Worked out here so changes show without an editor resaving the area.
const parseAsapAreaMember = (
  membership: AsapAreaMembership | null,
): AsapAreaMember | null => {
  const user = membership?.linkedFrom?.usersCollection?.items[0];
  if (
    !membership?.role ||
    membership.inactiveSinceDate ||
    !user?.onboarded ||
    user.alumniSinceDate
  ) {
    return null;
  }
  const firstName = user.firstName ?? '';
  const lastName = user.lastName ?? '';
  return {
    id: user.sys.id,
    firstName,
    lastName,
    displayName: parseUserDisplayName(
      firstName,
      lastName,
      undefined,
      user.nickname ?? undefined,
    ),
    avatarUrl: user.avatar?.url ?? undefined,
  };
};

const byName = (a: AsapAreaMember, b: AsapAreaMember) =>
  a.firstName.localeCompare(b.firstName) ||
  a.lastName.localeCompare(b.lastName);

// Members keep the order set in the area's Members field. Anyone not in it yet
// goes at the end, sorted by name.
const parseAsapArea = (area: AsapAreaItem): AsapAreaDataObject => {
  const activeMembers = new Map<string, AsapAreaMember>();
  area.linkedFrom?.teamMembershipCollection?.items.forEach((membership) => {
    const member = parseAsapAreaMember(membership);
    if (member) {
      activeMembers.set(member.id, member);
    }
  });

  const ordered = (area.membersCollection?.items ?? []).flatMap((item) => {
    const member = item && activeMembers.get(item.sys.id);
    if (!member) {
      return [];
    }
    activeMembers.delete(member.id);
    return [member];
  });

  return {
    id: area.sys.id,
    name: area.name ?? '',
    objective: area.objective ?? '',
    primaryEmail: area.primaryEmail ?? '',
    secondaryEmail: area.secondaryEmail ?? undefined,
    members: [...ordered, ...[...activeMembers.values()].sort(byName)],
  };
};

const parseGraphQLDiscover = (
  discover: DiscoverItem | null,
): DiscoverDataObject => ({
  aboutUs: discover?.aboutUs
    ? parseRichText(discover.aboutUs as RichTextFromQuery)
    : '',
  members:
    discover?.membersCollection?.items
      ?.reduce(reduceUsers, [])
      .map(parseUserToResponse) ?? [],
  membersTeamId: discover?.membersTeam?.sys.id,
  scientificAdvisoryBoard:
    discover?.scientificAdvisoryBoardCollection?.items
      ?.reduce(reduceUsers, [])
      .map(parseUserToResponse) ?? [],
  asapAreas:
    discover?.asapAreasCollection?.items
      .filter((area): area is AsapAreaItem => area !== null)
      .map(parseAsapArea) ?? [],
});
