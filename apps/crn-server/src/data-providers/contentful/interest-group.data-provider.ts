import {
  FetchInterestGroupOptions,
  InterestGroupDataObject,
  InterestGroupTools,
  InterestGroupRole,
  InterestGroupLeader as GroupLeader,
  ListInterestGroupDataObject,
  getLatestUserAward,
} from '@asap-hub/model';
import {
  GraphQLClient,
  FETCH_INTEREST_GROUPS,
  FETCH_INTEREST_GROUP_BY_ID,
  FETCH_INTEREST_GROUPS_BY_USER_ID,
  FetchInterestGroupByIdQuery,
  FetchInterestGroupByIdQueryVariables,
  FetchInterestGroupsQuery,
  FetchInterestGroupsQueryVariables,
  FetchInterestGroupsByUserIdQuery,
  FetchInterestGroupsByUserIdQueryVariables,
  InterestGroupsOrder,
  InterestGroupsFilter,
  FETCH_INTEREST_GROUPS_BY_TEAM_ID,
  FetchInterestGroupsByTeamIdQuery,
  FetchInterestGroupsByTeamIdQueryVariables,
  FETCH_INTEREST_GROUP_ID_BY_INTEREST_GROUP_TEAM_ID,
  FetchInterestGroupIdByInterestGroupTeamIdQuery,
  FetchInterestGroupIdByInterestGroupTeamIdQueryVariables,
  FETCH_INTEREST_GROUP_CALENDAR,
  FetchInterestGroupCalendarQuery,
  FetchInterestGroupCalendarQueryVariables,
} from '@asap-hub/contentful';
import { cleanArray } from '@asap-hub/server-common';

import { InterestGroupDataProvider } from '../types';
import {
  parseAwardsCollection,
  parseContentfulGraphqlCalendarToResponse,
  parseInterestGroupLeader,
} from '../transformers';
import { parseContentfulGraphQlUsers } from './user.data-provider';
import { parseResearchTags } from './research-tag.data-provider';

type InterestGroupItem = NonNullable<
  NonNullable<
    FetchInterestGroupsQuery['interestGroupsCollection']
  >['items'][number]
>;

type InterestGroupTeams = NonNullable<
  NonNullable<
    NonNullable<
      FetchInterestGroupsQuery['interestGroupsCollection']
    >['items'][number]
  >['teamsCollection']
>['items'][number];

type InterestGroupLeader = NonNullable<
  NonNullable<
    FetchInterestGroupsByUserIdQuery['interestGroupLeadersCollection']
  >['items'][number]
>;

type InterestGroupsQueryResult =
  FetchInterestGroupsQuery['interestGroupsCollection'];

export class InterestGroupContentfulDataProvider
  implements InterestGroupDataProvider
{
  constructor(private contentfulClient: GraphQLClient) {}

  async fetchById(id: string): Promise<InterestGroupDataObject | null> {
    const { interestGroups } = await this.contentfulClient.request<
      FetchInterestGroupByIdQuery,
      FetchInterestGroupByIdQueryVariables
    >(FETCH_INTEREST_GROUP_BY_ID, { id });

    if (!interestGroups) {
      return null;
    }

    return parseGraphQLInterestGroup(interestGroups);
  }

  async fetchByTeamId(teamId: string): Promise<ListInterestGroupDataObject> {
    const { interestGroupsTeamsCollection } =
      await this.contentfulClient.request<
        FetchInterestGroupsByTeamIdQuery,
        FetchInterestGroupsByTeamIdQueryVariables
      >(FETCH_INTEREST_GROUPS_BY_TEAM_ID, {
        id: teamId,
      });

    const items = interestGroupsTeamsCollection?.items
      .filter(
        (item) =>
          !!(
            item &&
            item.linkedFrom &&
            item.linkedFrom.interestGroupsCollection &&
            item.linkedFrom.interestGroupsCollection.items[0]
          ),
      )
      .map((item) => {
        const interestGroup =
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          item!.linkedFrom!.interestGroupsCollection!.items[0]!;

        return parseGraphQLInterestGroup(interestGroup);
      })
      .filter((x): x is InterestGroupDataObject => !!x);

    return {
      total: items?.length || 0,
      items: items || [],
    };
  }

  private async fetchByUserId(
    userId: string,
    options: FetchInterestGroupOptions,
  ): Promise<ListInterestGroupDataObject> {
    const { take = 20, skip = 0 } = options;
    const { interestGroupLeadersCollection } =
      await this.contentfulClient.request<
        FetchInterestGroupsByUserIdQuery,
        FetchInterestGroupsByUserIdQueryVariables
      >(FETCH_INTEREST_GROUPS_BY_USER_ID, {
        limit: take,
        skip,
        id: userId,
      });

    const items: InterestGroupItem[] =
      interestGroupLeadersCollection?.items
        ?.filter((x): x is InterestGroupLeader => x !== null)
        .map(
          (item: InterestGroupLeader) =>
            item?.linkedFrom?.interestGroupsCollection?.items[0],
        )
        .filter((x): x is InterestGroupItem => !!x) || [];

    return this.parseCollection({ total: items?.length || 0, items });
  }

  private parseCollection(
    collection: InterestGroupsQueryResult,
  ): ListInterestGroupDataObject {
    if (!collection || !collection.total) {
      return {
        total: 0,
        items: [],
      };
    }

    return {
      total: collection.total,
      items: collection.items
        .filter((x): x is InterestGroupItem => x !== null)
        .map(parseGraphQLInterestGroup),
    };
  }

  async fetch(
    options: FetchInterestGroupOptions,
  ): Promise<ListInterestGroupDataObject> {
    const { filter, search, take = 20, skip = 0 } = options;

    if (filter && filter.userId) {
      return this.fetchByUserId(filter.userId, options);
    }

    if (filter && filter.teamId) {
      return this.fetchByTeamId(filter.teamId);
    }

    const where: InterestGroupsFilter = {};

    const words = (search || '').split(' ').filter(Boolean); // removes whitespaces

    if (words.length) {
      const filters: InterestGroupsFilter[] = words.reduce(
        (acc: InterestGroupsFilter[], word: string) =>
          acc.concat([
            {
              OR: [
                { name_contains: word },
                { description_contains: word },
                {
                  researchTags: {
                    name_contains: word,
                  },
                },
              ],
            },
          ]),
        [],
      );
      where.AND = filters;
    }

    if (filter && filter.active !== undefined) {
      where.AND = [...(where.AND || []), { active: filter.active }];
    }

    const { interestGroupsCollection } = await this.contentfulClient.request<
      FetchInterestGroupsQuery,
      FetchInterestGroupsQueryVariables
    >(FETCH_INTEREST_GROUPS, {
      limit: take,
      skip,
      where,
      order: [InterestGroupsOrder.NameAsc],
    });

    return this.parseCollection(interestGroupsCollection);
  }

  async fetchCalendarId(id: string): Promise<string | null> {
    const { interestGroups } = await this.contentfulClient.request<
      FetchInterestGroupCalendarQuery,
      FetchInterestGroupCalendarQueryVariables
    >(FETCH_INTEREST_GROUP_CALENDAR, { id });

    return interestGroups?.calendar?.sys.id ?? null;
  }

  async fetchIdByInterestGroupTeamId(
    interestGroupTeamId: string,
  ): Promise<string | null> {
    const { interestGroupsTeams } = await this.contentfulClient.request<
      FetchInterestGroupIdByInterestGroupTeamIdQuery,
      FetchInterestGroupIdByInterestGroupTeamIdQueryVariables
    >(FETCH_INTEREST_GROUP_ID_BY_INTEREST_GROUP_TEAM_ID, {
      id: interestGroupTeamId,
    });

    return (
      interestGroupsTeams?.linkedFrom?.interestGroupsCollection?.items[0]?.sys
        .id ?? null
    );
  }
}

const parseGraphQLInterestGroup = (
  interestGroup: InterestGroupItem,
): InterestGroupDataObject => {
  const teams = (interestGroup.teamsCollection?.items || [])
    .filter((x): x is InterestGroupTeams => x !== null)
    .map((t) => {
      const project =
        t?.team?.linkedFrom?.projectMembershipCollection?.items[0]?.linkedFrom
          ?.projectsCollection?.items[0];
      return {
        id: t?.team?.sys.id ?? '',
        inactiveSince: t?.team?.inactiveSince ?? undefined,
        endDate: t?.endDate,
        displayName: t?.team?.displayName ?? '',
        projectTitle: project?.title ?? '',
        tags: parseResearchTags(project?.researchTagsCollection?.items || []),
      };
    });

  const calendars = interestGroup.calendar
    ? [parseContentfulGraphqlCalendarToResponse(interestGroup.calendar)]
    : [];

  let tools: InterestGroupTools = {
    slack: interestGroup.slack ?? undefined,
    googleDrive: interestGroup.googleDrive ?? undefined,
  };

  if (interestGroup.calendar) {
    const url = new URL('https://calendar.google.com/calendar/r');
    url.searchParams.set('cid', interestGroup.calendar.sys.id || '');
    tools = { ...tools, googleCalendar: url.toString() };
  }

  const leaders: GroupLeader[] = (
    interestGroup.leadersCollection?.items || []
  ).reduce((acc: GroupLeader[], leader) => {
    if (!leader || !leader.user) {
      return acc;
    }
    const leaderAwards = cleanArray(leader.user.teamsCollection?.items).map(
      (teamMembership) => ({ awards: parseAwardsCollection(teamMembership) }),
    );
    return [
      ...acc,
      {
        user: parseInterestGroupLeader(
          parseContentfulGraphQlUsers(leader.user),
          getLatestUserAward(leaderAwards),
        ),
        role: leader.role as InterestGroupRole,
        inactiveSinceDate: leader.inactiveSinceDate ?? undefined,
      },
    ];
  }, []);

  const contactEmails = leaders
    .filter(
      ({ role, inactiveSinceDate, user: { alumniSinceDate } }) =>
        role === 'Project Manager' && !alumniSinceDate && !inactiveSinceDate,
    )
    .map(({ user }) => user.email);

  return {
    id: interestGroup.sys.id,
    active: !!interestGroup.active,
    createdDate: interestGroup.sys.firstPublishedAt,
    lastModifiedDate: interestGroup.lastUpdated,
    name: interestGroup.name || '',
    description: interestGroup.description || '',
    tags: parseResearchTags(interestGroup.researchTagsCollection?.items || []),
    tools,
    thumbnail: interestGroup.thumbnail?.url ?? undefined,
    contactEmails,
    leaders,
    teams,
    calendars,
  };
};
