import {
  FetchAnalyticsTeamLeadershipQuery,
  FetchAnalyticsTeamLeadershipQueryVariables,
  FetchAttendanceQuery,
  FetchAttendanceQueryVariables,
  FetchEngagementQuery,
  FetchEngagementQueryVariables,
  FetchOsChampionQuery,
  FetchOsChampionQueryVariables,
  FetchPreliminaryDataSharingByTeamQuery,
  FetchPreliminaryDataSharingByTeamQueryVariables,
  FetchPreliminaryDataSharingQuery,
  FetchPreliminaryDataSharingQueryVariables,
  FetchTeamCollaborationQuery,
  FetchTeamCollaborationQueryVariables,
  FetchTeamProductivityQuery,
  FetchTeamProductivityQueryVariables,
  FetchUserProductivityQuery,
  FetchUserProductivityQueryVariables,
  FetchUserResearchOutputsQuery,
  FetchUserResearchOutputsQueryVariables,
  FetchUserTotalResearchOutputsQuery,
  FetchUserTotalResearchOutputsQueryVariables,
  FETCH_ANALYTICS_TEAM_LEADERSHIP,
  FETCH_ATTENDANCE,
  FETCH_ENGAGEMENT,
  FETCH_OS_CHAMPION,
  FETCH_PRELIMINARY_DATA_SHARING,
  FETCH_PRELIMINARY_DATA_SHARING_BY_TEAM,
  FETCH_TEAM_COLLABORATION,
  FETCH_TEAM_PRODUCTIVITY,
  FETCH_USER_PRODUCTIVITY,
  FETCH_USER_RESEARCH_OUTPUTS,
  FETCH_USER_TOTAL_RESEARCH_OUTPUTS,
  GraphQLClient,
} from '@asap-hub/contentful';
import {
  FetchAnalyticsOptions,
  FetchPaginationOptions,
  FilterAnalyticsOptions,
  ListAnalyticsTeamLeadershipDataObject,
  ListEngagementDataObject,
  ListTeamCollaborationDataObject,
  ListTeamProductivityDataObject,
  ListUserProductivityDataObject,
  MeetingRepAttendanceDataObject,
  OSChampionDataObject,
  OutputTypeOption,
  PreliminaryDataSharingDataObject,
  TeamProductivityDataObject,
  TeamRole,
  TimeRangeOption,
  UserProductivityDataObject,
  UserProductivityTeam,
} from '@asap-hub/model';
import { cleanArray, parseUserDisplayName } from '@asap-hub/server-common';
import { mapLimit } from 'async';
import {
  getTeamCollaborationItems,
  getUserCollaborationItems,
  getUserDataById,
} from '../../utils/analytics/collaboration';
import {
  getFilterOutputByDocumentCategory,
  getFilterOutputByRange,
  getFilterOutputBySharingStatus,
  getRangeFilterParams,
  isAsapFundedResearchOutput,
  isTeamOutputDocumentType,
} from '../../utils/analytics/common';
import { getEngagementItems } from '../../utils/analytics/engagement';
import { getTeamLeadershipItems } from '../../utils/analytics/leadership';
import { AnalyticsDataProvider } from '../types/analytics.data-provider.types';

const PRELIMINARY_DATA_SHARING_SPEAKERS_PAGE_SIZE = 1000;
const PRELIMINARY_DATA_SHARING_MAX_SPEAKER_PAGES = 20;
const PRELIMINARY_DATA_SHARING_MAX_CONCURRENT_REQUESTS = 5;

type UserTotalResearchOutputsItems = NonNullable<
  FetchUserTotalResearchOutputsQuery['usersCollection']
>['items'];

export class AnalyticsContentfulDataProvider implements AnalyticsDataProvider {
  constructor(private contentfulClient: GraphQLClient) {}

  async fetchTeamLeadership(
    options: FetchPaginationOptions,
  ): Promise<ListAnalyticsTeamLeadershipDataObject> {
    const { take = 10, skip = 0 } = options;
    const { teamsCollection } = await this.contentfulClient.request<
      FetchAnalyticsTeamLeadershipQuery,
      FetchAnalyticsTeamLeadershipQueryVariables
    >(FETCH_ANALYTICS_TEAM_LEADERSHIP, { limit: take, skip });

    return {
      total: teamsCollection?.total || 0,
      items: getTeamLeadershipItems(teamsCollection) || [],
    };
  }

  async fetchUserProductivity(
    options: FetchAnalyticsOptions,
  ): Promise<ListUserProductivityDataObject> {
    const { take = 10, skip = 0, filter } = options;

    const { usersCollection } = await this.contentfulClient.request<
      FetchUserProductivityQuery,
      FetchUserProductivityQueryVariables
    >(FETCH_USER_PRODUCTIVITY, { limit: take, skip });

    return {
      total: usersCollection?.total || 0,
      items: getUserProductivityItems(usersCollection, filter),
    };
  }

  async fetchTeamProductivity(
    options: FetchAnalyticsOptions,
  ): Promise<ListTeamProductivityDataObject> {
    const { take = 10, skip = 0, filter } = options;
    const { teamsCollection } = await this.contentfulClient.request<
      FetchTeamProductivityQuery,
      FetchTeamProductivityQueryVariables
    >(FETCH_TEAM_PRODUCTIVITY, { limit: take, skip });

    return {
      total: teamsCollection?.total || 0,
      items: getTeamProductivityItems(
        teamsCollection,
        filter?.timeRange,
        filter?.outputType,
      ),
    };
  }

  async fetchOSChampion(options: FetchAnalyticsOptions) {
    const { take = 10, skip = 0, filter } = options;
    const dateFilter = getRangeFilterParams(filter?.timeRange);
    const { teamsCollection } = await this.contentfulClient.request<
      FetchOsChampionQuery,
      FetchOsChampionQueryVariables
    >(FETCH_OS_CHAMPION, { limit: take, skip, dateFilter });

    return {
      total: teamsCollection?.total || 0,
      items: getOsChampionItems(teamsCollection, filter?.timeRange),
    };
  }

  private async completeEventSpeakersCollections(
    teamsCollection: FetchPreliminaryDataSharingQuery['teamsCollection'],
  ): Promise<Map<string, PreliminaryDataSharingSpeakerItems>> {
    const itemsByTeam = new Map<string, PreliminaryDataSharingSpeakerItems>();

    const overflowingTeams = (teamsCollection?.items ?? []).flatMap((team) => {
      const speakers = team?.linkedFrom?.eventSpeakersCollection;
      if (!team || !speakers) {
        return [];
      }

      const total = speakers.total ?? 0;
      return total > speakers.items.length
        ? [{ teamId: team.sys.id, total }]
        : [];
    });

    if (overflowingTeams.length === 0) {
      return itemsByTeam;
    }

    const requests = overflowingTeams.flatMap(({ teamId, total }) =>
      Array.from(
        {
          length: Math.min(
            Math.ceil(total / PRELIMINARY_DATA_SHARING_SPEAKERS_PAGE_SIZE),
            PRELIMINARY_DATA_SHARING_MAX_SPEAKER_PAGES,
          ),
        },
        (_, page) => ({ teamId, page }),
      ),
    );

    const responses = await mapLimit(
      requests,
      PRELIMINARY_DATA_SHARING_MAX_CONCURRENT_REQUESTS,
      async ({ teamId, page }: { teamId: string; page: number }) => {
        const { eventSpeakersCollection } = await this.contentfulClient.request<
          FetchPreliminaryDataSharingByTeamQuery,
          FetchPreliminaryDataSharingByTeamQueryVariables
        >(FETCH_PRELIMINARY_DATA_SHARING_BY_TEAM, {
          teamId,
          limit: PRELIMINARY_DATA_SHARING_SPEAKERS_PAGE_SIZE,
          skip: page * PRELIMINARY_DATA_SHARING_SPEAKERS_PAGE_SIZE,
        });

        return { teamId, items: eventSpeakersCollection?.items ?? [] };
      },
    );

    responses.forEach((response) => {
      itemsByTeam.set(response.teamId, [
        ...(itemsByTeam.get(response.teamId) ?? []),
        ...response.items,
      ]);
    });

    return itemsByTeam;
  }

  async fetchPreliminaryDataSharing(options: FetchAnalyticsOptions) {
    const { take = 10, skip = 0, filter } = options;
    const { teamsCollection } = await this.contentfulClient.request<
      FetchPreliminaryDataSharingQuery,
      FetchPreliminaryDataSharingQueryVariables
    >(FETCH_PRELIMINARY_DATA_SHARING, { limit: take, skip });

    const speakerItemsByTeam =
      await this.completeEventSpeakersCollections(teamsCollection);

    return {
      total: teamsCollection?.total || 0,
      items: getPreliminaryDataSharingItems(
        teamsCollection,
        speakerItemsByTeam,
        filter?.timeRange as Extract<TimeRangeOption, 'all' | 'last-year'>,
      ),
    };
  }

  async fetchAttendance(options: FetchAnalyticsOptions) {
    const { take = 10, skip = 0, filter } = options;
    const { teamsCollection } = await this.contentfulClient.request<
      FetchAttendanceQuery,
      FetchAttendanceQueryVariables
    >(FETCH_ATTENDANCE, { limit: take, skip });

    return {
      total: teamsCollection?.total || 0,
      items: getAttendanceItems(
        teamsCollection,
        filter?.timeRange as Extract<TimeRangeOption, 'all' | 'last-year'>,
      ),
    };
  }

  async getUserTotalResearchOutputs() {
    const { usersCollection } = await this.contentfulClient.request<
      FetchUserTotalResearchOutputsQuery,
      FetchUserTotalResearchOutputsQueryVariables
    >(FETCH_USER_TOTAL_RESEARCH_OUTPUTS, { skip: 0 });

    const totalUsers = usersCollection?.total || 0;
    const limit = 1000;
    let skip = limit;
    let userTotalResearchOutputsItems: UserTotalResearchOutputsItems =
      cleanArray(usersCollection?.items) || [];

    while (totalUsers > skip) {
      const { usersCollection: usersTotalOutputs } =
        await this.contentfulClient.request<
          FetchUserTotalResearchOutputsQuery,
          FetchUserTotalResearchOutputsQueryVariables
        >(FETCH_USER_TOTAL_RESEARCH_OUTPUTS, { skip });

      userTotalResearchOutputsItems = userTotalResearchOutputsItems.concat(
        cleanArray(usersTotalOutputs?.items) || [],
      );
      skip += limit;
    }

    return userTotalResearchOutputsItems;
  }
  async fetchUserCollaboration(options: FetchAnalyticsOptions) {
    const { take = 10, skip = 0, filter } = options;

    const userTotalResearchOutputsItems =
      await this.getUserTotalResearchOutputs();
    const userDataById = getUserDataById(userTotalResearchOutputsItems);

    let collection: FetchUserResearchOutputsQuery['usersCollection'] = {
      total: 0,
      items: [],
    };

    const batchSize = 3;
    for (let i = 0; i < take / batchSize; i += 1) {
      const { usersCollection } = await this.contentfulClient.request<
        FetchUserResearchOutputsQuery,
        FetchUserResearchOutputsQueryVariables
      >(FETCH_USER_RESEARCH_OUTPUTS, {
        limit: batchSize,
        skip: skip + batchSize * i,
      });

      if (usersCollection && usersCollection.items) {
        collection = {
          total: usersCollection.total,
          items: [...collection.items, ...usersCollection.items],
        };
      }
    }
    const userCollaborationItems = getUserCollaborationItems(
      collection,
      userDataById,
      filter?.timeRange,
      filter?.documentCategory,
    );

    return {
      total: collection?.total || 0,
      items: userCollaborationItems,
    };
  }

  async fetchTeamCollaboration(
    options: FetchAnalyticsOptions,
  ): Promise<ListTeamCollaborationDataObject> {
    const { take = 10, skip = 0, filter } = options;

    let collection: FetchTeamCollaborationQuery['teamsCollection'] = {
      total: 0,
      items: [],
    };

    for (let i = 0; i < take / 5; i += 1) {
      const { teamsCollection } = await this.contentfulClient.request<
        FetchTeamCollaborationQuery,
        FetchTeamCollaborationQueryVariables
      >(FETCH_TEAM_COLLABORATION, { limit: 5, skip: skip + 5 * i });
      if (teamsCollection && teamsCollection.items.length) {
        collection = {
          total: teamsCollection.total,
          items: [...collection.items, ...teamsCollection.items],
        };
      } else {
        break;
      }
    }

    return {
      total: collection.total,
      items: getTeamCollaborationItems(
        collection,
        filter?.timeRange,
        filter?.outputType,
      ),
    };
  }

  async fetchEngagement(
    options: FetchAnalyticsOptions,
  ): Promise<ListEngagementDataObject> {
    const { take = 10, skip = 0, filter } = options;
    let collection: FetchEngagementQuery['teamsCollection'] = {
      total: 0,
      items: [],
    };

    for (let i = 0; i < take / 5; i += 1) {
      const { teamsCollection } = await this.contentfulClient.request<
        FetchEngagementQuery,
        FetchEngagementQueryVariables
      >(FETCH_ENGAGEMENT, { limit: 5, skip: skip + 5 * i });
      if (teamsCollection && teamsCollection.items) {
        collection = {
          total: teamsCollection.total,
          items: [...collection.items, ...teamsCollection.items],
        };
      }
    }

    return {
      total: collection?.total || 0,
      items: getEngagementItems(collection, filter?.timeRange),
    };
  }
}

const getUserProductivityItems = (
  usersCollection: FetchUserProductivityQuery['usersCollection'],
  filter?: FilterAnalyticsOptions,
): UserProductivityDataObject[] =>
  cleanArray(usersCollection?.items)
    .filter((user) => user.onboarded && user.role !== 'Hidden') // Only include onboarded users who are not Hidden
    .map((user) => {
      const teams =
        user.teamsCollection?.items
          .map((teamItem) => {
            if (teamItem?.role && teamItem?.team?.displayName) {
              return {
                team: teamItem.team.displayName,
                id: teamItem.team.sys.id,
                role: teamItem.role as TeamRole,
                isTeamInactive: !!teamItem.team.inactiveSince,
                isUserInactiveOnTeam: !!teamItem.inactiveSinceDate,
              };
            }

            return null;
          })
          .filter(
            (
              userProductivityItem: UserProductivityTeam | null,
            ): userProductivityItem is UserProductivityTeam =>
              userProductivityItem !== null,
          ) || [];

      const userOutputsCount = user.linkedFrom?.researchOutputsCollection?.items
        .filter(isAsapFundedResearchOutput)
        .filter(getFilterOutputByRange(filter?.timeRange))
        .filter(getFilterOutputByDocumentCategory(filter?.documentCategory))
        .reduce(
          (outputsCount, outputItem) => {
            const isAuthor = outputItem?.authorsCollection?.items.some(
              (author) =>
                author?.__typename === 'Users' && author.sys.id === user.sys.id,
            );

            if (isAuthor) {
              if (outputItem?.sharingStatus === 'Public') {
                return {
                  outputs: outputsCount.outputs + 1,
                  publicOutputs: outputsCount.publicOutputs + 1,
                };
              }

              return {
                ...outputsCount,
                outputs: outputsCount.outputs + 1,
              };
            }

            return outputsCount;
          },
          {
            outputs: 0,
            publicOutputs: 0,
          },
        ) || {
        outputs: 0,
        publicOutputs: 0,
      };

      const displayName = parseUserDisplayName(
        user.firstName ?? '',
        user.lastName ?? '',
        undefined,
        user.nickname ?? '',
      );

      return {
        id: user.sys.id,
        name: displayName,
        isAlumni: !!user.alumniSinceDate,
        teams,
        asapOutput: userOutputsCount.outputs,
        asapPublicOutput: userOutputsCount.publicOutputs,
        ratio:
          userOutputsCount.outputs > 0
            ? parseFloat(
                (
                  userOutputsCount.publicOutputs / userOutputsCount.outputs
                ).toFixed(2),
              )
            : 0,
      };
    });

const getTeamProductivityItems = (
  teamsCollection: FetchTeamProductivityQuery['teamsCollection'],
  rangeKey?: TimeRangeOption,
  outputType?: OutputTypeOption,
): TeamProductivityDataObject[] =>
  cleanArray(teamsCollection?.items).map((teamItem) => {
    const initialDocumentTypesCount = {
      Article: 0,
      Bioinformatics: 0,
      Dataset: 0,
      'Lab Material': 0,
      Protocol: 0,
    };

    const documentTypesCount =
      teamItem.linkedFrom?.researchOutputsCollection?.items
        .filter(isAsapFundedResearchOutput)
        .filter(getFilterOutputByRange(rangeKey))
        .filter(getFilterOutputBySharingStatus(outputType))
        .reduce((count, researchOutput) => {
          if (
            researchOutput?.documentType &&
            isTeamOutputDocumentType(researchOutput.documentType)
          ) {
            return {
              ...count,
              [researchOutput.documentType]:
                count[researchOutput.documentType] + 1,
            };
          }
          return count;
        }, initialDocumentTypesCount) || initialDocumentTypesCount;

    return {
      id: teamItem.sys.id,
      name: teamItem.displayName || '',
      isInactive: !!teamItem.inactiveSince,
      Article: documentTypesCount.Article,
      Bioinformatics: documentTypesCount.Bioinformatics,
      Dataset: documentTypesCount.Dataset,
      'Lab Material': documentTypesCount['Lab Material'],
      Protocol: documentTypesCount.Protocol,
    };
  });

const getOsChampionItems = (
  teamsCollection: FetchOsChampionQuery['teamsCollection'],
  rangeKey?: TimeRangeOption,
): OSChampionDataObject[] =>
  cleanArray(teamsCollection?.items).map((teamItem) => {
    let awardsCount = 0;
    if (teamItem.linkedFrom?.teamMembershipCollection?.items.length) {
      const teamMembershipItems =
        teamItem.linkedFrom?.teamMembershipCollection?.items;

      const userAwardsCount = teamMembershipItems.reduce(
        (
          usersWithAwards: OSChampionDataObject['users'],
          teamMembershipItem,
        ) => {
          const user =
            teamMembershipItem?.linkedFrom?.usersCollection?.items[0];

          if (
            teamMembershipItem?.awardsCollection?.total &&
            teamMembershipItem.awardsCollection.total > 0 &&
            user
          ) {
            usersWithAwards.push({
              id: user.sys.id,
              name: parseUserDisplayName(
                user.firstName ?? '',
                user.lastName ?? '',
                user.middleName ?? '',
                user.nickname ?? '',
              ),
              awardsCount: teamMembershipItem.awardsCollection.total,
            });
            awardsCount += teamMembershipItem.awardsCollection.total;
          }

          return usersWithAwards;
        },
        [],
      );

      return {
        teamId: teamItem.sys.id,
        teamName: teamItem.displayName || '',
        isTeamInactive: !!teamItem.inactiveSince,
        teamAwardsCount: awardsCount,
        timeRange: rangeKey ?? 'all',
        users: userAwardsCount,
      };
    }

    return {
      teamId: teamItem.sys.id,
      teamName: teamItem.displayName || '',
      isTeamInactive: !!teamItem.inactiveSince,
      teamAwardsCount: 0,
      timeRange: rangeKey ?? 'all',
      users: [],
    };
  });

type PreliminaryDataSharingSpeakerItems = NonNullable<
  FetchPreliminaryDataSharingByTeamQuery['eventSpeakersCollection']
>['items'];

const getPreliminaryDataSharingItems = (
  teamsCollection: FetchPreliminaryDataSharingQuery['teamsCollection'],
  speakerItemsByTeam: Map<string, PreliminaryDataSharingSpeakerItems>,
  rangeKey?: Extract<TimeRangeOption, 'all' | 'last-year'>,
): PreliminaryDataSharingDataObject[] => {
  const filter = getRangeFilterParams(rangeKey);

  return cleanArray(teamsCollection?.items).map((teamItem) => {
    let preliminaryDataSharedTotalCount = 0;
    let preliminaryDataSharedYesCount = 0;

    const eventSpeakersItems =
      speakerItemsByTeam.get(teamItem.sys.id) ??
      teamItem.linkedFrom?.eventSpeakersCollection?.items;

    if (eventSpeakersItems?.length) {
      const byEvent = new Map<
        string,
        { anyShared: boolean; startDate?: string }
      >();

      eventSpeakersItems.forEach((speaker) => {
        if (!speaker || speaker.preliminaryDataShared === null) {
          return;
        }
        const event = speaker.linkedFrom?.eventsCollection?.items[0];
        const eventId = event?.sys.id;
        if (!eventId) {
          return;
        }

        const prev = byEvent.get(eventId);
        byEvent.set(eventId, {
          anyShared:
            (prev?.anyShared ?? false) ||
            speaker.preliminaryDataShared === true,
          startDate: event?.startDate ?? prev?.startDate,
        });
      });

      Array.from(byEvent.values()).forEach(({ anyShared, startDate }) => {
        if (rangeKey === 'last-year' && filter) {
          if (!startDate || startDate <= filter) return;
        }

        preliminaryDataSharedTotalCount += 1;
        if (anyShared) preliminaryDataSharedYesCount += 1;
      });

      return {
        timeRange: rangeKey ?? 'all',
        teamId: teamItem.sys.id,
        teamName: teamItem.displayName || '',
        isTeamInactive: !!teamItem.inactiveSince,
        percentShared:
          preliminaryDataSharedTotalCount === 0
            ? 0
            : Math.round(
                (preliminaryDataSharedYesCount /
                  preliminaryDataSharedTotalCount) *
                  100,
              ),
        limitedData: preliminaryDataSharedTotalCount === 0,
      };
    }

    return {
      timeRange: rangeKey ?? 'all',
      teamId: teamItem.sys.id,
      teamName: teamItem.displayName || '',
      isTeamInactive: !!teamItem.inactiveSince,
      percentShared: 0,
      limitedData: true,
    };
  });
};

const getAttendanceItems = (
  teamsCollection: FetchAttendanceQuery['teamsCollection'],
  rangeKey?: Extract<TimeRangeOption, 'all' | 'last-year'>,
): MeetingRepAttendanceDataObject[] => {
  const filter = getRangeFilterParams(rangeKey);

  return cleanArray(teamsCollection?.items).map((teamItem) => {
    let attendanceTotalCount = 0;
    let attendanceYesCount = 0;

    if (teamItem.linkedFrom?.attendanceCollection?.items.length) {
      const attendanceItems = teamItem.linkedFrom?.attendanceCollection?.items;

      attendanceItems.forEach((item) => {
        const eventStartDate =
          item?.linkedFrom?.eventsCollection?.items[0]?.startDate;

        if (
          rangeKey === 'last-year' &&
          eventStartDate &&
          filter &&
          eventStartDate <= filter
        ) {
          return;
        }

        if (item?.attended === true) {
          attendanceYesCount += 1;
        }
        attendanceTotalCount += 1;
      });

      return {
        timeRange: rangeKey ?? 'all',
        teamId: teamItem.sys.id,
        teamName: teamItem.displayName || '',
        isTeamInactive: !!teamItem.inactiveSince,
        attendancePercentage: Math.round(
          (attendanceYesCount / attendanceTotalCount) * 100,
        ),
        limitedData: attendanceTotalCount === 0,
      };
    }

    return {
      timeRange: rangeKey ?? 'all',
      teamId: teamItem.sys.id,
      teamName: teamItem.displayName || '',
      isTeamInactive: !!teamItem.inactiveSince,
      attendancePercentage: 0,
      limitedData: true,
    };
  });
};
