import {
  AnalyticsTeamLeadershipDataObject,
  AwardsDataObject,
  EngagementDataObject,
  MeetingRepAttendanceDataObject,
  OSChampionDataObject,
  PreliminaryDataSharingDataObject,
  PreprintComplianceDataObject,
  PublicationComplianceDataObject,
  TeamCollaborationDataObject,
  TeamProductivityDataObject,
  UserCollaborationDataObject,
  UserProductivityDataObject,
} from '@asap-hub/model';
import { validMetrics } from './constants';

export type Metrics = (typeof validMetrics)[number];

export type LeadershipType = Extract<
  Metrics,
  'ig-leadership' | 'wg-leadership'
>;

type LeadershipBaseDataObject = Pick<
  AnalyticsTeamLeadershipDataObject,
  'id' | 'displayName' | 'inactiveSince'
> & {
  isInactive: boolean;
};

export type IGLeadershipDataObject = LeadershipBaseDataObject &
  Pick<
    AnalyticsTeamLeadershipDataObject,
    | 'interestGroupLeadershipRoleCount'
    | 'interestGroupPreviousLeadershipRoleCount'
    | 'interestGroupMemberCount'
    | 'interestGroupPreviousMemberCount'
  >;

export type WGLeadershipDataObject = LeadershipBaseDataObject &
  Pick<
    AnalyticsTeamLeadershipDataObject,
    | 'workingGroupLeadershipRoleCount'
    | 'workingGroupPreviousLeadershipRoleCount'
    | 'workingGroupMemberCount'
    | 'workingGroupPreviousMemberCount'
  >;

export type PresenterRepresentationDataObject = EngagementDataObject & {
  isInactive: boolean;
};

export type ProjectMilestonesDataObject = {
  id: string;
  description: string;
  /** Comma-separated aim numbers in ascending order, e.g. "1", "1,2", "2,3,4". Sorting derives from this field at query time. */
  aimNumbers: string;
  status: string;
  articleCount: number;
  /** Comma-separated list of unique related article DOIs for this milestone. */
  articlesDOI: string;
  projectId: string;
  projectName: string;
  grantType: string;
  createdDate: string | null;
  lastDate: string | null;
};

export type ProjectAimsDataObject = {
  id: string;
  description: string;
  /** 'original' if the aim belongs to originalGrantAimsCollection, 'supplement' otherwise. */
  grantType: string;
  projectId: string;
  projectName: string;
  teamName: string;
  status: string;
  articleCount: number;
  /** Comma-separated list of unique DOIs aggregated across all linked milestones. */
  articlesDOI: string;
  /** 1-based position of the aim within the project's collection (matches Contentful ordering). */
  aimOrder: number;
  createdDate: string | null;
  lastDate: string | null;
};

export type MetricToObjectMap = {
  'os-champion': OSChampionDataObject;
  awards: AwardsDataObject;
  'preliminary-data-sharing': PreliminaryDataSharingDataObject;
  attendance: MeetingRepAttendanceDataObject;
  'preprint-compliance': PreprintComplianceDataObject;
  'publication-compliance': PublicationComplianceDataObject;
  'user-productivity': UserProductivityDataObject;
  'team-productivity': TeamProductivityDataObject;
  'user-collaboration': UserCollaborationDataObject;
  'team-collaboration': TeamCollaborationDataObject;
  'ig-leadership': IGLeadershipDataObject;
  'wg-leadership': WGLeadershipDataObject;
  'presenter-representation': PresenterRepresentationDataObject;
  'project-milestones': ProjectMilestonesDataObject;
  // Aims metric (ASAP-1407 – Phase 2)
  'project-aims': ProjectAimsDataObject;
};

export type MetricObject<T extends Metrics> = MetricToObjectMap[T];
