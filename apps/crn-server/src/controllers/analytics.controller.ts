import {
  AwardTypeDataObject,
  FetchAnalyticsOptions,
  FetchAwardsOptions,
  FetchPaginationOptions,
  ListAnalyticsTeamLeadershipResponse,
  ListAwardsResponse,
  ListEngagementResponse,
  ListMeetingRepAttendanceResponse,
  ListOSChampionResponse,
  ListPreliminaryDataSharingResponse,
  ListTeamCollaborationResponse,
  ListTeamProductivityResponse,
  ListUserCollaborationResponse,
  ListUserProductivityResponse,
} from '@asap-hub/model';
import { AnalyticsDataProvider } from '../data-providers/types/analytics.data-provider.types';

export default class AnalyticsController {
  constructor(private analyticsDataProvider: AnalyticsDataProvider) {}

  async fetchTeamLeadership(
    options: FetchPaginationOptions,
  ): Promise<ListAnalyticsTeamLeadershipResponse> {
    return this.analyticsDataProvider.fetchTeamLeadership(options);
  }

  async fetchUserProductivity(
    options: FetchAnalyticsOptions,
  ): Promise<ListUserProductivityResponse> {
    return this.analyticsDataProvider.fetchUserProductivity(options);
  }

  async fetchTeamProductivity(
    options: FetchAnalyticsOptions,
  ): Promise<ListTeamProductivityResponse> {
    return this.analyticsDataProvider.fetchTeamProductivity(options);
  }

  async fetchUserCollaboration(
    options: FetchAnalyticsOptions,
  ): Promise<ListUserCollaborationResponse> {
    return this.analyticsDataProvider.fetchUserCollaboration(options);
  }

  async fetchTeamCollaboration(
    options: FetchAnalyticsOptions,
  ): Promise<ListTeamCollaborationResponse> {
    return this.analyticsDataProvider.fetchTeamCollaboration(options);
  }

  async fetchEngagement(
    options: FetchAnalyticsOptions,
  ): Promise<ListEngagementResponse> {
    return this.analyticsDataProvider.fetchEngagement(options);
  }

  async fetchOSChampion(
    options: FetchAnalyticsOptions,
  ): Promise<ListOSChampionResponse> {
    return this.analyticsDataProvider.fetchOSChampion(options);
  }

  async fetchAwardTypes(): Promise<AwardTypeDataObject[]> {
    return this.analyticsDataProvider.fetchAwardTypes();
  }

  async fetchAwards(options: FetchAwardsOptions): Promise<ListAwardsResponse> {
    return this.analyticsDataProvider.fetchAwards(options);
  }

  async fetchPreliminaryDataSharing(
    options: FetchAnalyticsOptions,
  ): Promise<ListPreliminaryDataSharingResponse> {
    return this.analyticsDataProvider.fetchPreliminaryDataSharing(options);
  }

  async fetchAttendance(
    options: FetchAnalyticsOptions,
  ): Promise<ListMeetingRepAttendanceResponse> {
    return this.analyticsDataProvider.fetchAttendance(options);
  }
}
