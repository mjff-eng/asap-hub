import {
  TeamCollaborationDataObject,
  TeamCollaborationPerformance,
  UserCollaborationDataObject,
  UserCollaborationPerformance,
  PreliminaryDataSharingResponse,
} from '@asap-hub/model';
import {
  userCollaborationToCSV,
  teamCollaborationAcrossTeamToCSV,
  teamCollaborationWithinTeamToCSV,
  preliminaryDataSharingToCSV,
} from '../export';

const performanceMetric = {
  belowAverageMin: 1,
  belowAverageMax: 2,
  averageMin: 3,
  averageMax: 4,
  aboveAverageMin: 5,
  aboveAverageMax: 6,
};

describe('userCollaborationToCSV', () => {
  const data: UserCollaborationDataObject = {
    id: '1',
    name: 'Jane Doe',
    teams: [
      {
        id: 'test-1',
        team: 'Test 1',
        outputsCoAuthoredAcrossTeams: 0,
        outputsCoAuthoredWithinTeam: 1,
        role: 'Key Personnel',
        teamInactiveSince: undefined,
        teamMembershipInactiveSince: '2024-02-06T00:00:00.000-03:00',
      },
      {
        id: 'de-camilli',
        team: 'De Camilli',
        outputsCoAuthoredAcrossTeams: 1,
        outputsCoAuthoredWithinTeam: 2,
        role: 'Project Manager',
        teamInactiveSince: '2024-02-15T00:00:00.000Z',
        teamMembershipInactiveSince: undefined,
      },
    ],
    totalUniqueOutputsCoAuthoredAcrossTeams: 1,
    totalUniqueOutputsCoAuthoredWithinTeam: 3,
  };
  const performance: UserCollaborationPerformance = {
    withinTeam: performanceMetric,
    acrossTeam: performanceMetric,
  };

  it.each`
    documentCategory    | prefix
    ${'all'}            | ${'Outputs'}
    ${'article'}        | ${'Article Outputs'}
    ${'bioinformatics'} | ${'Bioinformatic Outputs'}
    ${'dataset'}        | ${'Dataset Outputs'}
    ${'lab-material'}   | ${'Lab Material Outputs'}
    ${'protocol'}       | ${'Protocol Outputs'}
    ${'not-valid'}      | ${'Outputs'}
  `(
    `exports within-team data when document category is $documentCategory`,
    ({ documentCategory, prefix }) => {
      expect(
        userCollaborationToCSV(
          'within-team',
          performance,
          documentCategory,
        )(data),
      ).toEqual({
        User: 'Jane Doe',
        'User Status': 'Active',
        'Alumni Since': '',

        'Team A': 'Test 1',
        'Team Status A': 'Active',
        'Team Inactive Since A': '',
        'Role A': 'Key Personnel',
        'User Team Status A': 'Inactive',
        'User Team Inactive Since A': '2024-02-06T00:00:00.000-03:00',
        [`${prefix} Co-Authored: Value A`]: 1,
        [`${prefix} Co-Authored: Average A`]: 'Below',

        'Team B': 'De Camilli',
        'Team Status B': 'Inactive',
        'Team Inactive Since B': '2024-02-15T00:00:00.000Z',
        'Role B': 'Project Manager',
        'User Team Status B': 'Inactive',
        'User Team Inactive Since B': '',
        [`${prefix} Co-Authored: Value B`]: 2,
        [`${prefix} Co-Authored: Average B`]: 'Below',

        'Team C': '',
        'Team Status C': '',
        'Team Inactive Since C': '',
        'Role C': '',
        'User Team Status C': '',
        'User Team Inactive Since C': '',
        [`${prefix} Co-Authored: Value C`]: '',
        [`${prefix} Co-Authored: Average C`]: '',
      });
    },
  );

  it.each`
    documentCategory    | prefix
    ${'all'}            | ${'Outputs'}
    ${'article'}        | ${'Article Outputs'}
    ${'bioinformatics'} | ${'Bioinformatic Outputs'}
    ${'dataset'}        | ${'Dataset Outputs'}
    ${'lab-material'}   | ${'Lab Material Outputs'}
    ${'protocol'}       | ${'Protocol Outputs'}
    ${'not-valid'}      | ${'Outputs'}
  `(
    'exports across-teams data when document category is $documentCategory',
    ({ documentCategory, prefix }) => {
      expect(
        userCollaborationToCSV(
          'across-teams',
          performance,
          documentCategory,
        )(data),
      ).toEqual({
        User: 'Jane Doe',
        'User Status': 'Active',
        'Alumni Since': '',

        'Team A': 'Test 1',
        'Team Status A': 'Active',
        'Team Inactive Since A': '',
        'Role A': 'Key Personnel',
        'User Team Status A': 'Inactive',
        'User Team Inactive Since A': '2024-02-06T00:00:00.000-03:00',
        [`${prefix} Co-Authored: Value A`]: 0,
        [`${prefix} Co-Authored: Average A`]: 'Below',

        'Team B': 'De Camilli',
        'Team Status B': 'Inactive',
        'Team Inactive Since B': '2024-02-15T00:00:00.000Z',
        'Role B': 'Project Manager',
        'User Team Status B': 'Inactive',
        'User Team Inactive Since B': '',
        [`${prefix} Co-Authored: Value B`]: 1,
        [`${prefix} Co-Authored: Average B`]: 'Below',

        'Team C': '',
        'Team Status C': '',
        'Team Inactive Since C': '',
        'Role C': '',
        'User Team Status C': '',
        'User Team Inactive Since C': '',
        [`${prefix} Co-Authored: Value C`]: '',
        [`${prefix} Co-Authored: Average C`]: '',
      });
    },
  );
});

describe('teamCollaborationWithinTeamToCSV', () => {
  const data: TeamCollaborationDataObject = {
    id: '1',
    name: 'Team A',
    inactiveSince: undefined,
    outputsCoProducedWithin: {
      Article: 3,
      Bioinformatics: 3,
      Dataset: 3,
      'Lab Material': 3,
      Protocol: 3,
    },
    totalOutputs: {
      Article: 3,
      Bioinformatics: 3,
      Dataset: 3,
      'Lab Material': 3,
      Protocol: 3,
    },
    outputsCoProducedAcross: {
      byDocumentType: {
        Article: 5,
        Bioinformatics: 5,
        Dataset: 5,
        'Lab Material': 5,
        Protocol: 5,
      },
      byTeam: [
        {
          id: '2',
          name: 'Team B',
          isInactive: false,
          Article: 4,
          Bioinformatics: 4,
          Dataset: 4,
          'Lab Material': 4,
          Protocol: 4,
        },
        {
          id: '3',
          name: 'Team C',
          isInactive: false,
          Article: 1,
          Bioinformatics: 1,
          Dataset: 1,
          'Lab Material': 1,
          Protocol: 1,
        },
      ],
    },
  };
  const performance: TeamCollaborationPerformance = {
    withinTeam: {
      article: performanceMetric,
      bioinformatics: performanceMetric,
      dataset: performanceMetric,
      labMaterial: performanceMetric,
      protocol: performanceMetric,
    },
    acrossTeam: {
      article: performanceMetric,
      bioinformatics: performanceMetric,
      dataset: performanceMetric,
      labMaterial: performanceMetric,
      protocol: performanceMetric,
    },
  };

  it.each`
    outputType  | prefix
    ${'public'} | ${'ASAP Public'}
    ${'all'}    | ${'ASAP'}
  `(
    'handles within-team data when output type is $outputType',
    ({ outputType, prefix }) => {
      expect(
        teamCollaborationWithinTeamToCSV(performance, outputType)(data),
      ).toEqual({
        Team: 'Team A',
        'Team Status': 'Active',
        'Inactive Since': '',
        [`${prefix} Article Output: Value`]: 3,
        [`${prefix} Article Output: Average`]: 'Average',
        [`${prefix} Bioinformatic Output: Value`]: 3,
        [`${prefix} Bioinformatic Output: Average`]: 'Average',
        [`${prefix} Dataset Output: Value`]: 3,
        [`${prefix} Dataset Output: Average`]: 'Average',
        [`${prefix} Lab Material Output: Value`]: 3,
        [`${prefix} Lab Material Output: Average`]: 'Average',
        [`${prefix} Protocol Output: Value`]: 3,
        [`${prefix} Protocol Output: Average`]: 'Average',
      });
    },
  );

  it.each`
    outputType  | prefix
    ${'public'} | ${'ASAP Public'}
    ${'all'}    | ${'ASAP'}
  `(
    'handles across-teams data when output type is $outputType',
    ({ outputType, prefix }) => {
      expect(
        teamCollaborationAcrossTeamToCSV(performance, outputType)(data),
      ).toEqual({
        Team: 'Team A',
        'Team Status': 'Active',
        'Inactive Since': '',
        [`${prefix} Article Output: Value`]: 5,
        [`${prefix} Article Output: Average`]: 'Above',
        [`${prefix} Article Output: No. of teams collaborated with`]: 2,
        [`${prefix} Article Output: Name of teams collaborated with`]:
          'Team B, Team C',
        [`${prefix} Bioinformatic Output: Value`]: 5,
        [`${prefix} Bioinformatic Output: Average`]: 'Above',
        [`${prefix} Bioinformatics Output: No. of teams collaborated with`]: 2,
        [`${prefix} Bioinformatics Output: Name of teams collaborated with`]:
          'Team B, Team C',
        [`${prefix} Dataset Output: Value`]: 5,
        [`${prefix} Dataset Output: Average`]: 'Above',
        [`${prefix} Dataset Output: No. of teams collaborated with`]: 2,
        [`${prefix} Dataset Output: Name of teams collaborated with`]:
          'Team B, Team C',
        [`${prefix} Lab Material Output: Value`]: 5,
        [`${prefix} Lab Material Output: Average`]: 'Above',
        [`${prefix} Lab Material Output: No. of teams collaborated with`]: 2,
        [`${prefix} Lab Material Output: Name of teams collaborated with`]:
          'Team B, Team C',
        [`${prefix} Protocol Output: Value`]: 5,
        [`${prefix} Protocol Output: Average`]: 'Above',
        [`${prefix} Protocol Output: No. of teams collaborated with`]: 2,
        [`${prefix} Protocol Output: Name of teams collaborated with`]:
          'Team B, Team C',
      });
    },
  );
});

describe('preliminaryDataSharingToCSV', () => {
  it('exports preliminary data sharing data for active team with full data', () => {
    const data: PreliminaryDataSharingResponse = {
      teamId: 'team-1',
      teamName: 'Test Team',
      isTeamInactive: false,
      percentShared: 85,
      limitedData: false,
      timeRange: 'all',
    };

    expect(preliminaryDataSharingToCSV(data)).toEqual({
      'Team Name': 'Test Team',
      'Team Status': 'Active',
      'Percent Shared': '85%',
      Ranking: 'Adequate',
    });
  });

  it('exports preliminary data sharing data for inactive team with full data', () => {
    const data: PreliminaryDataSharingResponse = {
      teamId: 'team-2',
      teamName: 'Inactive Team',
      isTeamInactive: true,
      percentShared: 95,
      limitedData: false,
      timeRange: 'all',
    };

    expect(preliminaryDataSharingToCSV(data)).toEqual({
      'Team Name': 'Inactive Team',
      'Team Status': 'Inactive',
      'Percent Shared': '95%',
      Ranking: 'Outstanding',
    });
  });

  it('exports preliminary data sharing data with limited data', () => {
    const data: PreliminaryDataSharingResponse = {
      teamId: 'team-3',
      teamName: 'Limited Data Team',
      isTeamInactive: false,
      percentShared: null,
      limitedData: true,
      timeRange: 'all',
    };

    expect(preliminaryDataSharingToCSV(data)).toEqual({
      'Team Name': 'Limited Data Team',
      'Team Status': 'Active',
      'Percent Shared': 'N/A',
      Ranking: 'Limited Data',
    });
  });

  it('exports preliminary data sharing data with null percentage', () => {
    const data: PreliminaryDataSharingResponse = {
      teamId: 'team-4',
      teamName: 'Null Percentage Team',
      isTeamInactive: false,
      percentShared: null,
      limitedData: false,
      timeRange: 'all',
    };

    expect(preliminaryDataSharingToCSV(data)).toEqual({
      'Team Name': 'Null Percentage Team',
      'Team Status': 'Active',
      'Percent Shared': 'N/A',
      Ranking: 'Limited Data',
    });
  });

  it.each`
    percentShared | expectedRanking
    ${100}        | ${'Outstanding'}
    ${95}         | ${'Outstanding'}
    ${90}         | ${'Outstanding'}
    ${89}         | ${'Adequate'}
    ${85}         | ${'Adequate'}
    ${80}         | ${'Adequate'}
    ${79}         | ${'Needs Improvement'}
    ${50}         | ${'Needs Improvement'}
    ${0}          | ${'Needs Improvement'}
  `(
    'exports correct ranking for $percentShared% shared data',
    ({ percentShared, expectedRanking }) => {
      const data: PreliminaryDataSharingResponse = {
        teamId: 'team-5',
        teamName: 'Test Team',
        isTeamInactive: false,
        percentShared,
        limitedData: false,
        timeRange: 'all',
      };

      expect(preliminaryDataSharingToCSV(data)).toEqual({
        'Team Name': 'Test Team',
        'Team Status': 'Active',
        'Percent Shared': `${percentShared}%`,
        Ranking: expectedRanking,
      });
    },
  );
});
