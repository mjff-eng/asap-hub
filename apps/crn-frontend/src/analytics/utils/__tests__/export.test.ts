import {
  engagementPerformance,
  listEngagementResponse,
  performanceByDocumentType,
  teamCollaborationPerformance,
  teamCollaborationResponse,
  teamLeadershipResponse,
  teamProductivityResponse,
  userCollaborationPerformance,
  userCollaborationResponse,
  userProductivityPerformance,
  userProductivityResponse,
} from '@asap-hub/fixtures';
import { MetricExportKeys } from '@asap-hub/model';
import * as XLSX from 'xlsx';

import {
  downloadAnalyticsXLSX,
  getAllData,
  getPerformanceRanking,
  formatPercentage,
} from '../export';
import { OpensearchMetricsFacade } from '../../../hooks/opensearch';

jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn().mockReturnValue('workbook'),
    json_to_sheet: jest.fn().mockReturnValue('worksheet'),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

describe('getAllData', () => {
  const mockTransform = jest.fn((result) => ({ id: result.id }));

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch data from multiple pages and apply the transform function', async () => {
    const mockGetResults = jest
      .fn()
      .mockResolvedValueOnce({
        total: 600,
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      })
      .mockResolvedValueOnce({
        total: 600,
        items: [{ id: 4 }, { id: 5 }, { id: 6 }],
      })
      .mockResolvedValueOnce(undefined);

    const result = await getAllData(mockGetResults, mockTransform);

    expect(mockGetResults).toHaveBeenCalledTimes(3);
    expect(mockTransform).toHaveBeenCalledTimes(6);
    expect(result).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
      { id: 6 },
    ]);
  });

  it('should stop fetching when no data is returned', async () => {
    const mockGetResults = jest.fn().mockResolvedValue(undefined);

    const result = await getAllData(mockGetResults, mockTransform);

    expect(mockGetResults).toHaveBeenCalledTimes(1);
    expect(mockTransform).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

describe('downloadAnalyticsXLSX', () => {
  const mockOpensearchMetrics: jest.Mocked<OpensearchMetricsFacade> = {
    getUserProductivity: jest.fn(),
    getUserProductivityTagSuggestions: jest.fn(),
    getUserProductivityPerformance: jest.fn(),
    getTeamProductivity: jest.fn(),
    getTeamProductivityTagSuggestions: jest.fn(),
    getTeamProductivityPerformance: jest.fn(),
    getPublicationCompliance: jest.fn(),
    getPreprintCompliance: jest.fn(),
    getAnalyticsOSChampion: jest.fn(),
    getMeetingRepAttendance: jest.fn(),
    getMeetingRepAttendanceTagSuggestions: jest.fn(),
    getPreliminaryDataSharing: jest.fn(),
    getUserCollaboration: jest.fn(),
    getUserCollaborationTagSuggestions: jest.fn(),
    getUserCollaborationPerformance: jest.fn(),
    getTeamCollaboration: jest.fn(),
    getTeamCollaborationTagSuggestions: jest.fn(),
    getTeamCollaborationPerformance: jest.fn(),
    getAnalyticsWorkingGroupLeadership: jest.fn(),
    getAnalyticsWorkingGroupLeadershipTagSuggestions: jest.fn(),
    getAnalyticsInterestGroupLeadership: jest.fn(),
    getAnalyticsInterestGroupLeadershipTagSuggestions: jest.fn(),
    getPresenterRepresentation: jest.fn(),
    getPresenterRepresentationPerformance: jest.fn(),
    getPresenterRepresentationTagSuggestions: jest.fn(),
  };

  beforeEach(() => {
    // Reset all OpenSearch metric mocks
    Object.values(mockOpensearchMetrics).forEach((mock) => mock.mockReset());
    // Reset XLSX mocks
    jest.clearAllMocks();

    // Set up OpenSearch metric mocks (used by downloadAnalyticsXLSX)
    mockOpensearchMetrics.getUserProductivity.mockResolvedValue({
      items: [userProductivityResponse],
      total: 1,
    });
    mockOpensearchMetrics.getUserProductivityPerformance.mockResolvedValue(
      userProductivityPerformance,
    );
    mockOpensearchMetrics.getTeamProductivity.mockResolvedValue({
      items: [teamProductivityResponse],
      total: 1,
    });
    mockOpensearchMetrics.getTeamProductivityPerformance.mockResolvedValue(
      performanceByDocumentType,
    );
    mockOpensearchMetrics.getUserCollaboration.mockResolvedValue(
      userCollaborationResponse,
    );
    mockOpensearchMetrics.getUserCollaborationPerformance.mockResolvedValue(
      userCollaborationPerformance,
    );
    mockOpensearchMetrics.getTeamCollaboration.mockResolvedValue(
      teamCollaborationResponse,
    );
    mockOpensearchMetrics.getTeamCollaborationPerformance.mockResolvedValue(
      teamCollaborationPerformance,
    );
    mockOpensearchMetrics.getAnalyticsInterestGroupLeadership.mockResolvedValue(
      {
        items: [teamLeadershipResponse],
        total: 1,
      },
    );
    mockOpensearchMetrics.getAnalyticsWorkingGroupLeadership.mockResolvedValue({
      items: [teamLeadershipResponse],
      total: 1,
    });
    mockOpensearchMetrics.getPresenterRepresentation.mockResolvedValue(
      listEngagementResponse,
    );
    mockOpensearchMetrics.getPresenterRepresentationPerformance.mockResolvedValue(
      engagementPerformance,
    );
  });

  it('should create a new workbook and process the selected metrics', async () => {
    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })(
      'current-year',
      new Set([
        'user-productivity',
        'team-productivity',
        'user-collaboration-within',
        'user-collaboration-across',
        'team-collaboration-within',
        'team-collaboration-across',
        'ig-leadership',
        'wg-leadership',
        'engagement',
      ]) as Set<MetricExportKeys>,
    );

    expect(XLSX.utils.book_new).toHaveBeenCalled();

    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(1, [
      {
        user: 'Test User',
        status: 'Active',
        teamA: 'Team A',
        roleA: 'Collaborating PI',
        teamB: '',
        roleB: '',
        ASAPOutputAverage: 'Below',
        ASAPOutputValue: 1,
        ASAPPublicOutputAverage: 'Average',
        ASAPPublicOutputValue: 2,
        ratio: 0.5,
      },
    ]);
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      1,
      'workbook',
      'worksheet',
      'User Productivity',
    );

    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(2, [
      {
        team: 'Test Team',
        status: 'Active',
        ASAPArticleOutputValue: 1,
        ASAPArticleOutputAverage: 'Below',
        ASAPBioinformaticOutputValue: 2,
        ASAPBioinformaticOutputAverage: 'Below',
        ASAPDatasetOutputValue: 3,
        ASAPDatasetOutputAverage: 'Below',
        ASAPALabMaterialValue: 4,
        ASAPALabMaterialAverage: 'Average',
        ASAPProtocolValue: 5,
        ASAPProtocolAverage: 'Above',
      },
    ]);
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      2,
      'workbook',
      'worksheet',
      'Team Productivity',
    );

    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(3, [
      {
        User: 'Test User',
        'User Status': 'Active',
        'Alumni Since': '',
        'Team A': 'Team A',
        'Role A': 'Collaborating PI',
        'Team Status A': 'Active',
        'Team Inactive Since A': '',
        'User Team Inactive Since A': '',
        'User Team Status A': 'Active',
        'Outputs Co-Authored: Average A': 'Below',
        'Outputs Co-Authored: Value A': 2,
        'Team B': '',
        'Role B': '',
        'Team Status B': '',
        'User Team Inactive Since B': '',
        'Team Inactive Since B': '',
        'User Team Status B': '',
        'Outputs Co-Authored: Average B': '',
        'Outputs Co-Authored: Value B': '',
        'Team C': '',
        'Role C': '',
        'Team Status C': '',
        'User Team Inactive Since C': '',
        'Team Inactive Since C': '',
        'User Team Status C': '',
        'Outputs Co-Authored: Average C': '',
        'Outputs Co-Authored: Value C': '',
      },
    ]);
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      3,
      'workbook',
      'worksheet',
      'User Co-Prod Within Team',
    );

    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(4, [
      {
        User: 'Test User',
        'User Status': 'Active',
        'Alumni Since': '',
        'Team A': 'Team A',
        'Role A': 'Collaborating PI',
        'Team Status A': 'Active',
        'Team Inactive Since A': '',
        'User Team Inactive Since A': '',
        'User Team Status A': 'Active',
        'Outputs Co-Authored: Average A': 'Average',
        'Outputs Co-Authored: Value A': 1,
        'Team B': '',
        'Role B': '',
        'Team Status B': '',
        'User Team Inactive Since B': '',
        'Team Inactive Since B': '',
        'User Team Status B': '',
        'Outputs Co-Authored: Average B': '',
        'Outputs Co-Authored: Value B': '',
        'Team C': '',
        'Role C': '',
        'Team Status C': '',
        'User Team Inactive Since C': '',
        'Team Inactive Since C': '',
        'User Team Status C': '',
        'Outputs Co-Authored: Average C': '',
        'Outputs Co-Authored: Value C': '',
      },
    ]);
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      4,
      'workbook',
      'worksheet',
      'User Co-Prod Across Teams',
    );

    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(5, [
      {
        Team: 'Team 1',
        'Team Status': 'Active',
        'Inactive Since': '',
        'ASAP Article Output: Value': 1,
        'ASAP Article Output: Average': 'Below',
        'ASAP Bioinformatic Output: Value': 0,
        'ASAP Bioinformatic Output: Average': 'Below',
        'ASAP Dataset Output: Value': 0,
        'ASAP Dataset Output: Average': 'Below',
        'ASAP Lab Material Output: Value': 0,
        'ASAP Lab Material Output: Average': 'Below',
        'ASAP Protocol Output: Value': 1,
        'ASAP Protocol Output: Average': 'Average',
      },
    ]);
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      5,
      'workbook',
      'worksheet',
      'Team Co-Prod Within Team',
    );

    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(6, [
      {
        Team: 'Team 1',
        'Team Status': 'Active',
        'Inactive Since': '',
        'ASAP Article Output: Average': 'Below',
        'ASAP Article Output: Name of teams collaborated with': 'Team 2',
        'ASAP Article Output: No. of teams collaborated with': 1,
        'ASAP Article Output: Value': 1,
        'ASAP Bioinformatic Output: Average': 'Below',
        'ASAP Bioinformatic Output: Value': 0,
        'ASAP Bioinformatics Output: Name of teams collaborated with': '',
        'ASAP Bioinformatics Output: No. of teams collaborated with': 0,
        'ASAP Dataset Output: Average': 'Below',
        'ASAP Dataset Output: Name of teams collaborated with': '',
        'ASAP Dataset Output: No. of teams collaborated with': 0,
        'ASAP Dataset Output: Value': 0,
        'ASAP Lab Material Output: Average': 'Below',
        'ASAP Lab Material Output: Name of teams collaborated with': '',
        'ASAP Lab Material Output: No. of teams collaborated with': 0,
        'ASAP Lab Material Output: Value': 0,
        'ASAP Protocol Output: Average': 'Average',
        'ASAP Protocol Output: Name of teams collaborated with': 'Team 2',
        'ASAP Protocol Output: No. of teams collaborated with': 1,
        'ASAP Protocol Output: Value': 1,
      },
    ]);
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      6,
      'workbook',
      'worksheet',
      'Team Co-Prod Across Teams',
    );

    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(7, [
      {
        Team: 'Team 1',
        'Team Status': 'Active',
        'Inactive Since': '',
        'Currently in a leadership role': '5',
        'Currently a member': '7',
        'Previously in a leadership role': '6',
        'Previously a member': '8',
      },
    ]);
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      7,
      'workbook',
      'worksheet',
      'Interest Groups',
    );

    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(8, [
      {
        Team: 'Team 1',
        'Team Status': 'Active',
        'Inactive Since': '',
        'Currently a member': '3',
        'Currently in a leadership role': '1',
        'Previously a member': '4',
        'Previously in a leadership role': '2',
      },
    ]);
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      8,
      'workbook',
      'worksheet',
      'Working Groups',
    );

    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(9, [
      {
        Team: 'Test Team',
        'Team Status': 'Active',
        'Inactive Since': '',
        'Events: Value': 2,
        'Events: Average': 'Above',
        Members: 5,
        'Total Speakers: Value': 3,
        'Total Speakers: Average': 'Above',
        'Unique Speakers (All Roles): Percentage': '67%',
        'Unique Speakers (All Roles): Value': 2,
        'Unique Speakers (All Roles): Average': 'Above',
        'Unique Speakers (Key Personnel): Percentage': '33%',
        'Unique Speakers (Key Personnel): Value': 1,
        'Unique Speakers (Key Personnel): Average': 'Above',
      },
    ]);
    expect(XLSX.utils.book_append_sheet).toHaveBeenNthCalledWith(
      9,
      'workbook',
      'worksheet',
      'Speaker Diversity',
    );

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      'workbook',
      expect.stringContaining('crn-analytics-current-year'),
    );
  });

  it('should process OpenSearch metrics correctly', async () => {
    // Mock OpenSearch metric responses
    mockOpensearchMetrics.getPublicationCompliance.mockResolvedValue({
      items: [
        {
          objectID: 'pub-comp-1',
          teamId: 'team-alpha',
          teamName: 'Team Alpha',
          isTeamInactive: false,
          numberOfPublications: 10,
          overallCompliance: 85,
          ranking: 'ADEQUATE',
          numberOfOutputs: 50,
          numberOfDatasets: 20,
          datasetsPercentage: 90,
          datasetsRanking: 'OUTSTANDING',
          numberOfProtocols: 10,
          protocolsPercentage: 80,
          protocolsRanking: 'ADEQUATE',
          numberOfCode: 5,
          codePercentage: 75,
          codeRanking: 'ADEQUATE',
          numberOfLabMaterials: 15,
          labMaterialsPercentage: 95,
          labMaterialsRanking: 'OUTSTANDING',
          timeRange: 'all',
        },
      ],
      total: 1,
    });

    mockOpensearchMetrics.getPreprintCompliance.mockResolvedValue({
      items: [
        {
          objectID: 'preprint-comp-1',
          teamId: 'team-beta',
          teamName: 'Team Beta',
          isTeamInactive: false,
          numberOfPreprints: 5,
          numberOfPublications: 10,
          postedPriorPercentage: 60,
          ranking: 'NEEDS IMPROVEMENT',
          timeRange: 'all',
        },
      ],
      total: 1,
    });

    mockOpensearchMetrics.getPreliminaryDataSharing.mockResolvedValue({
      items: [
        {
          teamId: 'team-1',
          teamName: 'Team Gamma',
          isTeamInactive: false,
          limitedData: false,
          percentShared: 75,
          timeRange: 'last-year',
        },
      ],
      total: 1,
    });

    mockOpensearchMetrics.getMeetingRepAttendance.mockResolvedValue({
      items: [
        {
          teamId: 'team-2',
          teamName: 'Team Delta',
          isTeamInactive: false,
          attendancePercentage: 88,
          limitedData: false,
          timeRange: 'all',
        },
      ],
      total: 1,
    });

    mockOpensearchMetrics.getAnalyticsOSChampion.mockResolvedValue({
      items: [
        {
          objectID: 'os-champ-1',
          teamId: 'team-3',
          teamName: 'Team Epsilon',
          isTeamInactive: false,
          teamAwardsCount: 3,
          timeRange: 'all',
          users: [
            {
              id: 'user-1',
              name: 'John Doe',
              awardsCount: 2,
            },
            {
              id: 'user-2',
              name: 'Jane Smith',
              awardsCount: 1,
            },
          ],
        },
      ],
      total: 1,
    });

    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })(
      'all',
      new Set([
        'publication-compliance',
        'preprint-compliance',
        'preliminary-data-sharing',
        'attendance',
        'os-champion',
      ]) as Set<MetricExportKeys>,
    );

    expect(XLSX.utils.book_new).toHaveBeenCalled();

    // Verify each OpenSearch metric was called with correct parameters
    expect(mockOpensearchMetrics.getPublicationCompliance).toHaveBeenCalledWith(
      {
        timeRange: 'all',
        tags: [],
        currentPage: 0,
        pageSize: 200,
        sort: 'team_asc',
      },
    );

    expect(mockOpensearchMetrics.getPreprintCompliance).toHaveBeenCalledWith({
      tags: [],
      timeRange: 'all',
      currentPage: 0,
      pageSize: 200,
      sort: 'team_asc',
    });

    expect(
      mockOpensearchMetrics.getPreliminaryDataSharing,
    ).toHaveBeenCalledWith({
      tags: [],
      timeRange: 'all',
      currentPage: 0,
      pageSize: 200,
    });

    expect(mockOpensearchMetrics.getMeetingRepAttendance).toHaveBeenCalledWith({
      tags: [],
      timeRange: 'all',
      currentPage: 0,
      pageSize: 200,
      sort: 'team_asc',
    });

    expect(mockOpensearchMetrics.getAnalyticsOSChampion).toHaveBeenCalledWith({
      tags: [],
      timeRange: 'all',
      currentPage: 0,
      pageSize: 200,
      sort: 'team_asc',
    });

    // Verify that worksheets were created with correct data transformation
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        'Team Name': 'Team Alpha',
        'Team Status': 'Active',
        '# Publications': 10,
        'Publications %': '85%',
        'Publications Ranking': 'Adequate',
        '# Outputs': 50,
        '# Datasets': 20,
        'Datasets %': '90%',
        'Datasets Ranking': 'Outstanding',
        '# Protocols': 10,
        'Protocols %': '80%',
        'Protocols Ranking': 'Adequate',
        '# Code': 5,
        'Code %': '75%',
        'Code Ranking': 'Needs Improvement',
        '# Lab Materials': 15,
        'Lab Materials %': '95%',
        'Lab Materials Ranking': 'Outstanding',
      },
    ]);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        'Team Name': 'Team Beta',
        'Team Status': 'Active',
        'Number of Preprints': 5,
        'Posted Prior to Journal Submission': '60%',
        Ranking: 'Needs Improvement',
      },
    ]);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        'Team Name': 'Team Gamma',
        'Team Status': 'Active',
        'Percent Shared': '75%',
        Ranking: 'Needs Improvement',
      },
    ]);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        'Team Name': 'Team Delta',
        'Team Status': 'Active',
        Attendance: '88%',
        Ranking: 'Adequate',
      },
    ]);

    // OS Champion creates multiple rows for users
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        'Team Name': 'Team Epsilon',
        'Team Status': 'Active',
        'User Name': 'John Doe',
        'No.of Awards': '2',
      },
      {
        'Team Name': 'Team Epsilon',
        'Team Status': 'Active',
        'User Name': 'Jane Smith',
        'No.of Awards': '1',
      },
    ]);

    // Verify correct sheet names were used
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Publication Compliance',
    );
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Preprint Compliance',
    );
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Share Preliminary Findings',
    );
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Meeting Rep Attendance',
    );
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Open Science Championship',
    );

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      'workbook',
      expect.stringContaining('crn-analytics-all'),
    );
  });

  it('should handle empty OpenSearch responses gracefully', async () => {
    // Mock empty responses
    mockOpensearchMetrics.getPublicationCompliance.mockResolvedValue({
      items: [],
      total: 0,
    });

    mockOpensearchMetrics.getPreprintCompliance.mockResolvedValue({
      items: [],
      total: 0,
    });

    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })(
      'last-year',
      new Set([
        'publication-compliance',
        'preprint-compliance',
      ]) as Set<MetricExportKeys>,
    );

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([]);
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(2);
  });

  it('should handle limited time range for preliminary-data-sharing and attendance', async () => {
    mockOpensearchMetrics.getPreliminaryDataSharing.mockResolvedValue({
      items: [],
      total: 0,
    });

    mockOpensearchMetrics.getMeetingRepAttendance.mockResolvedValue({
      items: [],
      total: 0,
    });

    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })(
      'last-year',
      new Set([
        'preliminary-data-sharing',
        'attendance',
      ]) as Set<MetricExportKeys>,
    );

    // These metrics support limited time ranges
    expect(
      mockOpensearchMetrics.getPreliminaryDataSharing,
    ).toHaveBeenCalledWith({
      tags: [],
      timeRange: 'last-year',
      currentPage: 0,
      pageSize: 200,
    });

    expect(mockOpensearchMetrics.getMeetingRepAttendance).toHaveBeenCalledWith({
      tags: [],
      timeRange: 'last-year',
      currentPage: 0,
      pageSize: 200,
      sort: 'team_asc',
    });
  });

  it('should process user-productivity with OpenSearch when flag is enabled', async () => {
    // Mock OpenSearch user productivity performance response
    mockOpensearchMetrics.getUserProductivityPerformance.mockResolvedValue({
      asapOutput: {
        belowAverageMin: 0,
        belowAverageMax: 5,
        averageMin: 5,
        averageMax: 10,
        aboveAverageMin: 10,
        aboveAverageMax: 20,
      },
      asapPublicOutput: {
        belowAverageMin: 0,
        belowAverageMax: 3,
        averageMin: 3,
        averageMax: 7,
        aboveAverageMin: 7,
        aboveAverageMax: 15,
      },
      ratio: {
        belowAverageMin: 0,
        belowAverageMax: 0.5,
        averageMin: 0.5,
        averageMax: 0.75,
        aboveAverageMin: 0.75,
        aboveAverageMax: 1.0,
      },
    });

    // Mock OpenSearch user productivity data response
    mockOpensearchMetrics.getUserProductivity.mockResolvedValue({
      items: [
        {
          id: 'user-1',
          name: 'Alice Johnson',
          isAlumni: false,
          teams: [
            {
              id: 'team-1',
              team: 'Team Alpha',
              role: 'Lead PI (Core Leadership)',
              isTeamInactive: false,
              isUserInactiveOnTeam: false,
            },
          ],
          asapOutput: 12,
          asapPublicOutput: 9,
          ratio: 0.75,
        },
      ],
      total: 1,
    });

    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })('90d', new Set(['user-productivity']) as Set<MetricExportKeys>);

    // Verify getUserProductivityPerformance was called with correct parameters
    expect(
      mockOpensearchMetrics.getUserProductivityPerformance,
    ).toHaveBeenCalledWith({
      timeRange: '90d',
      documentCategory: 'all',
    });

    // Verify getUserProductivity was called with correct parameters
    expect(mockOpensearchMetrics.getUserProductivity).toHaveBeenCalledWith({
      timeRange: '90d',
      documentCategory: 'all',
      sort: 'team_asc',
      tags: [],
      currentPage: 0,
      pageSize: 200,
    });

    // Verify worksheet was created with transformed data
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        user: 'Alice Johnson',
        status: 'Active',
        teamA: 'Team Alpha',
        roleA: 'Lead PI (Core Leadership)',
        teamB: '',
        roleB: '',
        ASAPOutputAverage: 'Above',
        ASAPOutputValue: 12,
        ASAPPublicOutputAverage: 'Above',
        ASAPPublicOutputValue: 9,
        ratio: 0.75,
      },
    ]);

    // Verify worksheet was appended with correct sheet name
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'User Productivity',
    );

    // Verify workbook was written
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      'workbook',
      expect.stringContaining('crn-analytics-90d'),
    );
  });

  it('should process team-productivity with OpenSearch when flag is enabled', async () => {
    // Mock OpenSearch team productivity performance response
    // Note: Performance object uses camelCase property names
    mockOpensearchMetrics.getTeamProductivityPerformance.mockResolvedValue({
      article: {
        belowAverageMin: 0,
        belowAverageMax: 2,
        averageMin: 2,
        averageMax: 5,
        aboveAverageMin: 5,
        aboveAverageMax: 10,
      },
      bioinformatics: {
        belowAverageMin: 0,
        belowAverageMax: 1,
        averageMin: 1,
        averageMax: 3,
        aboveAverageMin: 3,
        aboveAverageMax: 8,
      },
      dataset: {
        belowAverageMin: 0,
        belowAverageMax: 1,
        averageMin: 1,
        averageMax: 3,
        aboveAverageMin: 3,
        aboveAverageMax: 6,
      },
      labMaterial: {
        belowAverageMin: 0,
        belowAverageMax: 1,
        averageMin: 1,
        averageMax: 2,
        aboveAverageMin: 2,
        aboveAverageMax: 5,
      },
      protocol: {
        belowAverageMin: 0,
        belowAverageMax: 2,
        averageMin: 2,
        averageMax: 4,
        aboveAverageMin: 4,
        aboveAverageMax: 8,
      },
    });

    // Mock OpenSearch team productivity data response
    mockOpensearchMetrics.getTeamProductivity.mockResolvedValue({
      items: [
        {
          id: 'team-1',
          name: 'Team Alpha',
          isInactive: false,
          Article: 6,
          Bioinformatics: 4,
          Dataset: 2,
          'Lab Material': 3,
          Protocol: 5,
        },
      ],
      total: 1,
    });

    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })('30d', new Set(['team-productivity']) as Set<MetricExportKeys>);

    // Verify getTeamProductivityPerformance was called with correct parameters
    expect(
      mockOpensearchMetrics.getTeamProductivityPerformance,
    ).toHaveBeenCalledWith({
      timeRange: '30d',
      outputType: 'all',
    });

    // Verify getTeamProductivity was called with correct parameters
    expect(mockOpensearchMetrics.getTeamProductivity).toHaveBeenCalledWith({
      timeRange: '30d',
      outputType: 'all',
      sort: 'team_asc',
      tags: [],
      currentPage: 0,
      pageSize: 200,
    });

    // Verify worksheet was created with transformed data
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        team: 'Team Alpha',
        status: 'Active',
        ASAPArticleOutputValue: 6,
        ASAPArticleOutputAverage: 'Above',
        ASAPBioinformaticOutputValue: 4,
        ASAPBioinformaticOutputAverage: 'Above',
        ASAPDatasetOutputValue: 2,
        ASAPDatasetOutputAverage: 'Average',
        ASAPALabMaterialValue: 3,
        ASAPALabMaterialAverage: 'Above',
        ASAPProtocolValue: 5,
        ASAPProtocolAverage: 'Above',
      },
    ]);

    // Verify worksheet was appended with correct sheet name
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Team Productivity',
    );

    // Verify workbook was written
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      'workbook',
      expect.stringContaining('crn-analytics-30d'),
    );
  });

  it('should process user-collaboration-within and user-collaboration-across with OpenSearch when flag is enabled', async () => {
    // Mock OpenSearch user collaboration performance response
    mockOpensearchMetrics.getUserCollaborationPerformance.mockResolvedValue({
      withinTeam: {
        belowAverageMin: 0,
        belowAverageMax: 1,
        averageMin: 1,
        averageMax: 3,
        aboveAverageMin: 3,
        aboveAverageMax: 5,
      },
      acrossTeam: {
        belowAverageMin: 0,
        belowAverageMax: 2,
        averageMin: 2,
        averageMax: 4,
        aboveAverageMin: 4,
        aboveAverageMax: 6,
      },
    });

    // Mock OpenSearch user collaboration data response
    mockOpensearchMetrics.getUserCollaboration.mockResolvedValue({
      items: [
        {
          id: 'user-1',
          name: 'John Doe',
          alumniSince: undefined,
          teams: [
            {
              id: 'team-1',
              team: 'Team Alpha',
              role: 'Collaborating PI',
              teamInactiveSince: undefined,
              teamMembershipInactiveSince: undefined,
              outputsCoAuthoredAcrossTeams: 5,
              outputsCoAuthoredWithinTeam: 4,
            },
          ],
          totalUniqueOutputsCoAuthoredAcrossTeams: 5,
          totalUniqueOutputsCoAuthoredWithinTeam: 4,
        },
      ],
      total: 1,
    });

    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })(
      'current-year',
      new Set([
        'user-collaboration-within',
        'user-collaboration-across',
      ]) as Set<MetricExportKeys>,
    );

    // Verify getUserCollaborationPerformance was called with correct parameters
    expect(
      mockOpensearchMetrics.getUserCollaborationPerformance,
    ).toHaveBeenCalledWith({
      timeRange: 'current-year',
      documentCategory: 'all',
    });

    // Verify getUserCollaboration was called with correct parameters
    expect(mockOpensearchMetrics.getUserCollaboration).toHaveBeenCalledWith({
      timeRange: 'current-year',
      documentCategory: 'all',
      sort: 'team_asc',
      tags: [],
      currentPage: 0,
      pageSize: 200,
    });

    // Verify worksheet for within was created with transformed data
    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(1, [
      {
        User: 'John Doe',
        'User Status': 'Active',
        'Alumni Since': '',
        'Team A': 'Team Alpha',
        'Role A': 'Collaborating PI',
        'Team Status A': 'Active',
        'Team Inactive Since A': '',
        'User Team Inactive Since A': '',
        'User Team Status A': 'Active',
        'Outputs Co-Authored: Average A': 'Above',
        'Outputs Co-Authored: Value A': 4,
        'Team B': '',
        'Role B': '',
        'Team Status B': '',
        'User Team Inactive Since B': '',
        'Team Inactive Since B': '',
        'User Team Status B': '',
        'Outputs Co-Authored: Average B': '',
        'Outputs Co-Authored: Value B': '',
        'Team C': '',
        'Role C': '',
        'Team Status C': '',
        'User Team Inactive Since C': '',
        'Team Inactive Since C': '',
        'User Team Status C': '',
        'Outputs Co-Authored: Average C': '',
        'Outputs Co-Authored: Value C': '',
      },
    ]);

    // Verify worksheet for across was created with transformed data
    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(2, [
      {
        User: 'John Doe',
        'User Status': 'Active',
        'Alumni Since': '',
        'Team A': 'Team Alpha',
        'Role A': 'Collaborating PI',
        'Team Status A': 'Active',
        'Team Inactive Since A': '',
        'User Team Inactive Since A': '',
        'User Team Status A': 'Active',
        'Outputs Co-Authored: Average A': 'Above',
        'Outputs Co-Authored: Value A': 5,
        'Team B': '',
        'Role B': '',
        'Team Status B': '',
        'User Team Inactive Since B': '',
        'Team Inactive Since B': '',
        'User Team Status B': '',
        'Outputs Co-Authored: Average B': '',
        'Outputs Co-Authored: Value B': '',
        'Team C': '',
        'Role C': '',
        'Team Status C': '',
        'User Team Inactive Since C': '',
        'Team Inactive Since C': '',
        'User Team Status C': '',
        'Outputs Co-Authored: Average C': '',
        'Outputs Co-Authored: Value C': '',
      },
    ]);

    // Verify worksheet was appended with correct sheet name
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'User Co-Prod Within Team',
    );
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'User Co-Prod Across Teams',
    );
  });

  it('should process team-collaboration-within and team-collaboration-across with OpenSearch when flag is enabled', async () => {
    // Mock OpenSearch team collaboration performance response
    mockOpensearchMetrics.getTeamCollaborationPerformance.mockResolvedValue({
      withinTeam: {
        article: {
          belowAverageMin: 0,
          belowAverageMax: 1,
          averageMin: 1,
          averageMax: 2,
          aboveAverageMin: 2,
          aboveAverageMax: 5,
        },
        bioinformatics: {
          belowAverageMin: 0,
          belowAverageMax: 0,
          averageMin: 0,
          averageMax: 1,
          aboveAverageMin: 1,
          aboveAverageMax: 3,
        },
        dataset: {
          belowAverageMin: 0,
          belowAverageMax: 0,
          averageMin: 0,
          averageMax: 1,
          aboveAverageMin: 1,
          aboveAverageMax: 2,
        },
        labMaterial: {
          belowAverageMin: 0,
          belowAverageMax: 0,
          averageMin: 0,
          averageMax: 1,
          aboveAverageMin: 1,
          aboveAverageMax: 2,
        },
        protocol: {
          belowAverageMin: 0,
          belowAverageMax: 1,
          averageMin: 1,
          averageMax: 2,
          aboveAverageMin: 2,
          aboveAverageMax: 4,
        },
      },
      acrossTeam: {
        article: {
          belowAverageMin: 0,
          belowAverageMax: 1,
          averageMin: 1,
          averageMax: 3,
          aboveAverageMin: 3,
          aboveAverageMax: 6,
        },
        bioinformatics: {
          belowAverageMin: 0,
          belowAverageMax: 0,
          averageMin: 0,
          averageMax: 1,
          aboveAverageMin: 1,
          aboveAverageMax: 3,
        },
        dataset: {
          belowAverageMin: 0,
          belowAverageMax: 0,
          averageMin: 0,
          averageMax: 1,
          aboveAverageMin: 1,
          aboveAverageMax: 3,
        },
        labMaterial: {
          belowAverageMin: 0,
          belowAverageMax: 0,
          averageMin: 0,
          averageMax: 1,
          aboveAverageMin: 1,
          aboveAverageMax: 2,
        },
        protocol: {
          belowAverageMin: 0,
          belowAverageMax: 1,
          averageMin: 1,
          averageMax: 2,
          aboveAverageMin: 2,
          aboveAverageMax: 5,
        },
      },
    });

    // Mock OpenSearch team collaboration data response
    mockOpensearchMetrics.getTeamCollaboration.mockResolvedValue({
      items: [
        {
          id: 'team-1',
          name: 'Team Alpha',
          inactiveSince: undefined,
          outputsCoProducedWithin: {
            Article: 3,
            Bioinformatics: 1,
            Dataset: 0,
            'Lab Material': 1,
            Protocol: 2,
          },
          totalOutputs: {
            Article: 3,
            Bioinformatics: 1,
            Dataset: 0,
            'Lab Material': 1,
            Protocol: 2,
          },
          outputsCoProducedAcross: {
            byDocumentType: {
              Article: 4,
              Bioinformatics: 2,
              Dataset: 1,
              'Lab Material': 0,
              Protocol: 3,
            },
            byTeam: [
              {
                id: 'team-2',
                name: 'Team Beta',
                isInactive: false,
                Article: 2,
                Bioinformatics: 1,
                Dataset: 1,
                'Lab Material': 0,
                Protocol: 2,
              },
              {
                id: 'team-3',
                name: 'Team Gamma',
                isInactive: false,
                Article: 2,
                Bioinformatics: 1,
                Dataset: 0,
                'Lab Material': 0,
                Protocol: 1,
              },
            ],
          },
        },
      ],
      total: 1,
    });

    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })(
      'current-year',
      new Set([
        'team-collaboration-within',
        'team-collaboration-across',
      ]) as Set<MetricExportKeys>,
    );

    // Verify getTeamCollaborationPerformance was called with correct parameters
    expect(
      mockOpensearchMetrics.getTeamCollaborationPerformance,
    ).toHaveBeenCalledWith({
      timeRange: 'current-year',
      outputType: 'all',
    });

    // Verify getTeamCollaboration was called with correct parameters
    expect(mockOpensearchMetrics.getTeamCollaboration).toHaveBeenCalledWith({
      timeRange: 'current-year',
      outputType: 'all',
      sort: 'team_asc',
      tags: [],
      currentPage: 0,
      pageSize: 200,
    });

    // Verify worksheet for within was created with transformed data
    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(1, [
      {
        Team: 'Team Alpha',
        'Team Status': 'Active',
        'Inactive Since': '',
        'ASAP Article Output: Value': 3,
        'ASAP Article Output: Average': 'Above',
        'ASAP Bioinformatic Output: Value': 1,
        'ASAP Bioinformatic Output: Average': 'Average',
        'ASAP Dataset Output: Value': 0,
        'ASAP Dataset Output: Average': 'Below',
        'ASAP Lab Material Output: Value': 1,
        'ASAP Lab Material Output: Average': 'Average',
        'ASAP Protocol Output: Value': 2,
        'ASAP Protocol Output: Average': 'Average',
      },
    ]);

    // Verify worksheet for across was created with transformed data
    expect(XLSX.utils.json_to_sheet).toHaveBeenNthCalledWith(2, [
      {
        Team: 'Team Alpha',
        'Team Status': 'Active',
        'Inactive Since': '',
        'ASAP Article Output: Average': 'Above',
        'ASAP Article Output: Name of teams collaborated with':
          'Team Beta, Team Gamma',
        'ASAP Article Output: No. of teams collaborated with': 2,
        'ASAP Article Output: Value': 4,
        'ASAP Bioinformatic Output: Average': 'Above',
        'ASAP Bioinformatic Output: Value': 2,
        'ASAP Bioinformatics Output: Name of teams collaborated with':
          'Team Beta, Team Gamma',
        'ASAP Bioinformatics Output: No. of teams collaborated with': 2,
        'ASAP Dataset Output: Average': 'Average',
        'ASAP Dataset Output: Name of teams collaborated with': 'Team Beta',
        'ASAP Dataset Output: No. of teams collaborated with': 1,
        'ASAP Dataset Output: Value': 1,
        'ASAP Lab Material Output: Average': 'Below',
        'ASAP Lab Material Output: Name of teams collaborated with': '',
        'ASAP Lab Material Output: No. of teams collaborated with': 0,
        'ASAP Lab Material Output: Value': 0,
        'ASAP Protocol Output: Average': 'Above',
        'ASAP Protocol Output: Name of teams collaborated with':
          'Team Beta, Team Gamma',
        'ASAP Protocol Output: No. of teams collaborated with': 2,
        'ASAP Protocol Output: Value': 3,
      },
    ]);

    // Verify worksheet was appended with correct sheet name
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Team Co-Prod Within Team',
    );
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Team Co-Prod Across Teams',
    );
  });

  it('should process wg-leadership with OpenSearch when flag is enabled', async () => {
    // Mock OpenSearch leadership response
    mockOpensearchMetrics.getAnalyticsWorkingGroupLeadership.mockResolvedValue({
      items: [
        {
          ...teamLeadershipResponse,
          id: 'team-leadership-1',
        },
      ],
      total: 1,
    });

    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })('current-year', new Set(['wg-leadership']) as Set<MetricExportKeys>);

    // Verify getAnalyticsWorkingGroupLeadership was called with correct parameters
    expect(
      mockOpensearchMetrics.getAnalyticsWorkingGroupLeadership,
    ).toHaveBeenCalledWith({
      tags: [],
      currentPage: 0,
      pageSize: 200,
    });

    // Verify worksheet was created with transformed data
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        Team: 'Team 1',
        'Team Status': 'Active',
        'Inactive Since': '',
        'Currently a member': '3',
        'Currently in a leadership role': '1',
        'Previously a member': '4',
        'Previously in a leadership role': '2',
      },
    ]);

    // Verify worksheet was appended with correct sheet name
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Working Groups',
    );

    // Verify workbook was written
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      'workbook',
      expect.stringContaining('crn-analytics-current-year'),
    );
  });

  it('should process ig-leadership with OpenSearch when flag is enabled', async () => {
    // Mock OpenSearch leadership response
    mockOpensearchMetrics.getAnalyticsInterestGroupLeadership.mockResolvedValue(
      {
        items: [
          {
            ...teamLeadershipResponse,
            id: 'team-leadership-1',
          },
        ],
        total: 1,
      },
    );

    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })('current-year', new Set(['ig-leadership']) as Set<MetricExportKeys>);

    // Verify getAnalyticsInterestGroupLeadership was called with correct parameters
    expect(
      mockOpensearchMetrics.getAnalyticsInterestGroupLeadership,
    ).toHaveBeenCalledWith({
      tags: [],
      currentPage: 0,
      pageSize: 200,
    });

    // Verify worksheet was created with transformed data
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        Team: 'Team 1',
        'Team Status': 'Active',
        'Inactive Since': '',
        'Currently in a leadership role': '5',
        'Currently a member': '7',
        'Previously in a leadership role': '6',
        'Previously a member': '8',
      },
    ]);

    // Verify worksheet was appended with correct sheet name
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Interest Groups',
    );

    // Verify workbook was written
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      'workbook',
      expect.stringContaining('crn-analytics-current-year'),
    );
  });

  it('should process engagement with OpenSearch when flag is enabled', async () => {
    mockOpensearchMetrics.getPresenterRepresentationPerformance.mockResolvedValue(
      {
        events: {
          belowAverageMin: 0,
          belowAverageMax: 2,
          averageMin: 2,
          averageMax: 5,
          aboveAverageMin: 5,
          aboveAverageMax: 10,
        },
        totalSpeakers: {
          belowAverageMin: 0,
          belowAverageMax: 1,
          averageMin: 1,
          averageMax: 3,
          aboveAverageMin: 3,
          aboveAverageMax: 8,
        },
        uniqueAllRoles: {
          belowAverageMin: 0,
          belowAverageMax: 10,
          averageMin: 11,
          averageMax: 80,
          aboveAverageMin: 81,
          aboveAverageMax: 100,
        },
        uniqueKeyPersonnel: {
          belowAverageMin: 0,
          belowAverageMax: 10,
          averageMin: 11,
          averageMax: 80,
          aboveAverageMin: 81,
          aboveAverageMax: 100,
        },
      },
    );

    mockOpensearchMetrics.getPresenterRepresentation.mockResolvedValue({
      items: [
        {
          id: 'team-1',
          name: 'Team Alpha',
          inactiveSince: null,
          memberCount: 1,
          eventCount: 4,
          totalSpeakerCount: 3,
          uniqueAllRolesCount: 3,
          uniqueAllRolesCountPercentage: 100,
          uniqueKeyPersonnelCount: 2,
          uniqueKeyPersonnelCountPercentage: 67,
        },
      ],
      total: 1,
    });

    await downloadAnalyticsXLSX({
      opensearchMetrics: mockOpensearchMetrics,
    })('30d', new Set(['engagement']) as Set<MetricExportKeys>);

    expect(
      mockOpensearchMetrics.getPresenterRepresentationPerformance,
    ).toHaveBeenCalledWith({
      timeRange: '30d',
    });

    expect(
      mockOpensearchMetrics.getPresenterRepresentation,
    ).toHaveBeenCalledWith({
      timeRange: '30d',
      sort: 'team_asc',
      tags: [],
      currentPage: 0,
      pageSize: 200,
    });

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        Team: 'Team Alpha',
        'Team Status': 'Active',
        'Inactive Since': '',
        Members: 1,
        'Events: Value': 4,
        'Events: Average': 'Average',
        'Total Speakers: Value': 3,
        'Total Speakers: Average': 'Average',
        'Unique Speakers (All Roles): Value': 3,
        'Unique Speakers (All Roles): Percentage': '100%',
        'Unique Speakers (All Roles): Average': 'Above',
        'Unique Speakers (Key Personnel): Value': 2,
        'Unique Speakers (Key Personnel): Percentage': '67%',
        'Unique Speakers (Key Personnel): Average': 'Average',
      },
    ]);

    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      'workbook',
      'worksheet',
      'Speaker Diversity',
    );

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      'workbook',
      expect.stringContaining('crn-analytics-30d'),
    );
  });
});

describe('getPerformanceRanking', () => {
  it.each`
    percentage | isLimitedData | expected
    ${null}    | ${false}      | ${'Limited Data'}
    ${null}    | ${true}       | ${'Limited Data'}
    ${85}      | ${true}       | ${'Limited Data'}
    ${95}      | ${true}       | ${'Limited Data'}
    ${95}      | ${false}      | ${'Outstanding'}
    ${90}      | ${false}      | ${'Outstanding'}
    ${89}      | ${false}      | ${'Adequate'}
    ${80}      | ${false}      | ${'Adequate'}
    ${79}      | ${false}      | ${'Needs Improvement'}
    ${0}       | ${false}      | ${'Needs Improvement'}
  `(
    'returns $expected when percentage is $percentage and isLimitedData is $isLimitedData',
    ({ percentage, isLimitedData, expected }) => {
      expect(getPerformanceRanking(percentage, isLimitedData)).toBe(expected);
    },
  );
});

describe('formatPercentage', () => {
  it.each`
    percentage | result
    ${null}    | ${'N/A'}
    ${95}      | ${'95%'}
  `('exports correct format for $percentage%', ({ percentage, result }) => {
    expect(formatPercentage(percentage)).toEqual(result);
  });
});
