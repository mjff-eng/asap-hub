import {
  AnalyticsTeamLeadershipResponse,
  ListEngagementResponse,
  ListTeamCollaborationResponse,
  ListUserCollaborationResponse,
  PerformanceMetricByDocumentType,
  TeamCollaborationPerformance,
  TeamProductivityPerformance,
  UserCollaborationPerformance,
  UserProductivityPerformance,
  PreliminaryDataSharingDataObject,
  ListPreliminaryDataSharingResponse,
  UserProductivityResponse,
  TeamProductivityResponse,
  EngagementPerformance,
} from '@asap-hub/model';

export const teamLeadershipResponse: AnalyticsTeamLeadershipResponse = {
  id: '1',
  displayName: 'Team 1',
  workingGroupLeadershipRoleCount: 1,
  workingGroupPreviousLeadershipRoleCount: 2,
  workingGroupMemberCount: 3,
  workingGroupPreviousMemberCount: 4,
  interestGroupLeadershipRoleCount: 5,
  interestGroupPreviousLeadershipRoleCount: 6,
  interestGroupMemberCount: 7,
  interestGroupPreviousMemberCount: 8,
};

export const userCollaborationResponse: ListUserCollaborationResponse = {
  total: 1,
  items: [
    {
      id: '1',
      name: 'Test User',
      alumniSince: undefined,
      teams: [
        {
          id: '1',
          team: 'Team A',
          teamInactiveSince: undefined,
          role: 'Collaborating PI',
          outputsCoAuthoredAcrossTeams: 1,
          outputsCoAuthoredWithinTeam: 2,
        },
      ],
      totalUniqueOutputsCoAuthoredAcrossTeams: 1,
      totalUniqueOutputsCoAuthoredWithinTeam: 2,
    },
  ],
};

export const teamCollaborationResponse: ListTeamCollaborationResponse = {
  total: 1,
  items: [
    {
      id: '1',
      name: 'Team 1',
      inactiveSince: undefined,
      outputsCoProducedWithin: {
        Article: 1,
        Bioinformatics: 0,
        Dataset: 0,
        'Lab Material': 0,
        Protocol: 1,
      },
      totalOutputs: {
        Article: 2,
        Bioinformatics: 0,
        Dataset: 0,
        'Lab Material': 0,
        Protocol: 2,
      },
      outputsCoProducedAcross: {
        byDocumentType: {
          Article: 1,
          Bioinformatics: 0,
          Dataset: 0,
          'Lab Material': 0,
          Protocol: 1,
        },
        byTeam: [
          {
            id: '2',
            name: 'Team 2',
            isInactive: false,
            Article: 1,
            Bioinformatics: 0,
            Dataset: 0,
            'Lab Material': 0,
            Protocol: 1,
          },
        ],
      },
    },
  ],
};

export const teamProductivityResponse: TeamProductivityResponse = {
  id: '1',
  name: 'Test Team',
  isInactive: false,
  Article: 1,
  Bioinformatics: 2,
  Dataset: 3,
  'Lab Material': 4,
  Protocol: 5,
};

export const teamProductivityPerformance: TeamProductivityPerformance = {
  article: {
    belowAverageMin: 0,
    belowAverageMax: 2,
    averageMin: 3,
    averageMax: 19,
    aboveAverageMin: 20,
    aboveAverageMax: 20,
  },
  bioinformatics: {
    belowAverageMin: 0,
    belowAverageMax: 4,
    averageMin: 5,
    averageMax: 9,
    aboveAverageMin: 10,
    aboveAverageMax: 13,
  },
  dataset: {
    belowAverageMin: 0,
    belowAverageMax: 3,
    averageMin: 4,
    averageMax: 9,
    aboveAverageMin: 10,
    aboveAverageMax: 12,
  },
  labMaterial: {
    belowAverageMin: 0,
    belowAverageMax: 2,
    averageMin: 3,
    averageMax: 5,
    aboveAverageMin: 6,
    aboveAverageMax: 8,
  },
  protocol: {
    belowAverageMin: 0,
    belowAverageMax: 0,
    averageMin: 1,
    averageMax: 2,
    aboveAverageMin: 3,
    aboveAverageMax: 3,
  },
};

export const userProductivityResponse: UserProductivityResponse = {
  id: '1',
  name: 'Test User',
  isAlumni: false,
  teams: [
    {
      id: '1',
      team: 'Team A',
      isTeamInactive: false,
      isUserInactiveOnTeam: false,
      role: 'Collaborating PI',
    },
  ],
  asapOutput: 1,
  asapPublicOutput: 2,
  ratio: 0.5,
};

export const userProductivityPerformance: UserProductivityPerformance = {
  asapOutput: {
    belowAverageMin: 0,
    belowAverageMax: 1,
    averageMin: 2,
    averageMax: 4,
    aboveAverageMin: 5,
    aboveAverageMax: 7,
  },
  asapPublicOutput: {
    belowAverageMin: 0,
    belowAverageMax: 0,
    averageMin: 1,
    averageMax: 2,
    aboveAverageMin: 3,
    aboveAverageMax: 4,
  },
  ratio: {
    belowAverageMin: 0,
    belowAverageMax: 0.14,
    averageMin: 0.15,
    averageMax: 0.8,
    aboveAverageMin: 0.81,
    aboveAverageMax: 1,
  },
};
export const performanceByDocumentType: PerformanceMetricByDocumentType = {
  article: {
    belowAverageMin: 0,
    belowAverageMax: 2,
    averageMin: 3,
    averageMax: 19,
    aboveAverageMin: 20,
    aboveAverageMax: 20,
  },
  bioinformatics: {
    belowAverageMin: 0,
    belowAverageMax: 4,
    averageMin: 5,
    averageMax: 9,
    aboveAverageMin: 10,
    aboveAverageMax: 13,
  },
  dataset: {
    belowAverageMin: 0,
    belowAverageMax: 3,
    averageMin: 4,
    averageMax: 9,
    aboveAverageMin: 10,
    aboveAverageMax: 12,
  },
  labMaterial: {
    belowAverageMin: 0,
    belowAverageMax: 2,
    averageMin: 3,
    averageMax: 5,
    aboveAverageMin: 6,
    aboveAverageMax: 8,
  },
  protocol: {
    belowAverageMin: 0,
    belowAverageMax: 0,
    averageMin: 1,
    averageMax: 2,
    aboveAverageMin: 3,
    aboveAverageMax: 3,
  },
};

export const teamCollaborationPerformance: TeamCollaborationPerformance = {
  withinTeam: performanceByDocumentType,
  acrossTeam: performanceByDocumentType,
};

export const userCollaborationPerformance: UserCollaborationPerformance = {
  withinTeam: {
    belowAverageMin: 0,
    belowAverageMax: 2,
    averageMin: 3,
    averageMax: 5,
    aboveAverageMin: 6,
    aboveAverageMax: 8,
  },
  acrossTeam: {
    belowAverageMin: 0,
    belowAverageMax: 0,
    averageMin: 1,
    averageMax: 2,
    aboveAverageMin: 3,
    aboveAverageMax: 3,
  },
};

export const listEngagementResponse: ListEngagementResponse = {
  total: 1,
  items: [
    {
      id: '1',
      name: 'Test Team',
      inactiveSince: null,
      memberCount: 5,
      eventCount: 2,
      totalSpeakerCount: 3,
      uniqueAllRolesCount: 2,
      uniqueAllRolesCountPercentage: 67,
      uniqueKeyPersonnelCount: 1,
      uniqueKeyPersonnelCountPercentage: 33,
    },
  ],
};

export const engagementPerformance: EngagementPerformance = {
  events: {
    aboveAverageMax: -1,
    aboveAverageMin: -1,
    averageMax: 0,
    averageMin: 0,
    belowAverageMax: -1,
    belowAverageMin: -1,
  },
  totalSpeakers: {
    aboveAverageMax: -1,
    aboveAverageMin: -1,
    averageMax: 0,
    averageMin: 0,
    belowAverageMax: -1,
    belowAverageMin: -1,
  },
  uniqueAllRoles: {
    aboveAverageMax: -1,
    aboveAverageMin: -1,
    averageMax: 0,
    averageMin: 0,
    belowAverageMax: -1,
    belowAverageMin: -1,
  },
  uniqueKeyPersonnel: {
    aboveAverageMax: -1,
    aboveAverageMin: -1,
    averageMax: 0,
    averageMin: 0,
    belowAverageMax: -1,
    belowAverageMin: -1,
  },
};

export const preliminaryDataSharingItem: PreliminaryDataSharingDataObject = {
  teamId: 'team-1',
  teamName: 'Test Team',
  isTeamInactive: false,
  limitedData: false,
  percentShared: 85,
  timeRange: 'all',
};

export const preliminaryDataSharingResponse: ListPreliminaryDataSharingResponse =
  {
    total: 1,
    items: [preliminaryDataSharingItem],
  };
