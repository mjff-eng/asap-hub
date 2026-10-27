import { createTestQueryClient } from '@asap-hub/frontend-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode, Suspense } from 'react';

import { Auth0Provider, WhenReady } from '../../auth/test-utils';
import { OpensearchClient } from '../../analytics/utils/opensearch';
import { useOpensearchMetrics } from '../opensearch';
import * as openScienceApi from '../../analytics/open-science/api';
import * as leadershipApi from '../../analytics/leadership/api';
import * as engagementApi from '../../analytics/engagement/api';
import * as collaborationApi from '../../analytics/collaboration/api';
import * as productivityApi from '../../analytics/productivity/api';

jest.mock('../../analytics/utils/opensearch');
jest.mock('../../analytics/open-science/api');
jest.mock('../../analytics/leadership/api');
jest.mock('../../analytics/engagement/api');
jest.mock('../../analytics/collaboration/api');
jest.mock('../../analytics/productivity/api');

const mockOpensearchClient = OpensearchClient as jest.MockedClass<
  typeof OpensearchClient
>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <Suspense fallback="loading">
      <Auth0Provider user={{ id: 'user-id' }}>
        <WhenReady>{children}</WhenReady>
      </Auth0Provider>
    </Suspense>
  </QueryClientProvider>
);

describe('useOpensearchMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpensearchClient.mockReset();
  });

  it('passes clients an authorization accessor that rejects when Auth0 is not ready', async () => {
    const noAuthWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={createTestQueryClient()}>
        {children}
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useOpensearchMetrics(), {
      wrapper: noAuthWrapper,
    });

    await result.current.getPublicationCompliance({
      tags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      sort: 'team_asc',
    });

    const getAuthorization = mockOpensearchClient.mock
      .calls[0]?.[1] as () => Promise<string>;
    await expect(getAuthorization()).rejects.toThrow(
      'Auth0 is not ready; cannot get an authorization token yet',
    );
  });

  it('passes clients an authorization accessor that resolves the current token per call', async () => {
    const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

    await waitFor(() => expect(result.current).toBeTruthy());
    await result.current.getPublicationCompliance({
      tags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      sort: 'team_asc',
    });

    const getAuthorization = mockOpensearchClient.mock
      .calls[0]?.[1] as () => Promise<string>;
    await expect(getAuthorization()).resolves.toMatch(/^Bearer /);
    await expect(getAuthorization()).resolves.toMatch(/^Bearer /);
  });

  it('returns all metric functions', async () => {
    const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current).toHaveProperty('getPublicationCompliance');
      expect(result.current).toHaveProperty('getPreprintCompliance');
      expect(result.current).toHaveProperty('getAnalyticsOSChampion');
      expect(result.current).toHaveProperty('getMeetingRepAttendance');
      expect(result.current).toHaveProperty(
        'getMeetingRepAttendanceTagSuggestions',
      );
      expect(result.current).toHaveProperty('getPreliminaryDataSharing');
      expect(result.current).toHaveProperty('getUserProductivity');
      expect(result.current).toHaveProperty(
        'getUserProductivityTagSuggestions',
      );
      expect(result.current).toHaveProperty('getUserProductivityPerformance');
      expect(result.current).toHaveProperty('getTeamProductivity');
      expect(result.current).toHaveProperty(
        'getTeamProductivityTagSuggestions',
      );
      expect(result.current).toHaveProperty('getTeamProductivityPerformance');
      expect(result.current).toHaveProperty('getUserCollaboration');
      expect(result.current).toHaveProperty(
        'getUserCollaborationTagSuggestions',
      );
      expect(result.current).toHaveProperty('getUserCollaborationPerformance');
      expect(result.current).toHaveProperty('getTeamCollaboration');
      expect(result.current).toHaveProperty(
        'getTeamCollaborationTagSuggestions',
      );
      expect(result.current).toHaveProperty('getTeamCollaborationPerformance');
      expect(result.current).toHaveProperty('getPresenterRepresentation');
      expect(result.current).toHaveProperty(
        'getPresenterRepresentationTagSuggestions',
      );
      expect(result.current).toHaveProperty(
        'getPresenterRepresentationPerformance',
      );
    });
  });

  describe('getPublicationCompliance', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetPublicationCompliance = jest
        .spyOn(openScienceApi, 'getPublicationCompliance')
        .mockResolvedValue({
          items: [],
          total: 0,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: ['Team A'],
        currentPage: 0,
        pageSize: 10,
        timeRange: 'all' as const,
        sort: 'team_asc' as const,
      };

      await result.current.getPublicationCompliance(paginationParams);

      // Verify OpensearchClient was created with correct index
      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'publication-compliance',
        expect.any(Function), // authorization accessor
      );

      // Verify the API method was called with client and params
      expect(mockGetPublicationCompliance).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getPreprintCompliance', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetPreprintCompliance = jest
        .spyOn(openScienceApi, 'getPreprintCompliance')
        .mockResolvedValue({
          items: [],
          total: 0,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: [],
        currentPage: 1,
        pageSize: 20,
        timeRange: 'last-year' as const,
        sort: 'team_desc' as const,
      };

      await result.current.getPreprintCompliance(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'preprint-compliance',
        expect.any(Function),
      );

      expect(mockGetPreprintCompliance).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getAnalyticsOSChampion', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetAnalyticsOSChampion = jest
        .spyOn(leadershipApi, 'getAnalyticsOSChampion')
        .mockResolvedValue({
          items: [
            {
              objectID: 'test',
              teamId: 'team-1',
              teamName: 'Team One',
              isTeamInactive: false,
              teamAwardsCount: 5,
              timeRange: 'all',
              users: [],
            },
          ],
          total: 1,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: ['Team One'],
        currentPage: 0,
        pageSize: 15,
        timeRange: '30d' as const,
        sort: 'awards_desc' as const,
      };

      await result.current.getAnalyticsOSChampion(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'os-champion',
        expect.any(Function),
      );

      expect(mockGetAnalyticsOSChampion).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getMeetingRepAttendance', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetMeetingRepAttendance = jest
        .spyOn(engagementApi, 'getMeetingRepAttendance')
        .mockResolvedValue({
          items: [
            {
              teamId: 'team-1',
              teamName: 'Team Alpha',
              isTeamInactive: false,
              attendancePercentage: 75,
              limitedData: false,
              timeRange: 'all',
            },
          ],
          total: 1,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: [],
        currentPage: 2,
        pageSize: 5,
        timeRange: 'last-year' as const,
        sort: 'attendance_percentage_desc' as const,
      };

      await result.current.getMeetingRepAttendance(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'attendance',
        expect.any(Function),
      );

      expect(mockGetMeetingRepAttendance).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getMeetingRepAttendanceTagSuggestions', () => {
    afterEach(() => {
      mockOpensearchClient.mockReset();
    });

    it('creates OpensearchClient with correct index and calls getTagSuggestions', async () => {
      const mockGetTagSuggestions = jest.fn().mockResolvedValue(['Team Beta']);
      mockOpensearchClient.mockImplementation(
        () =>
          ({
            getTagSuggestions: mockGetTagSuggestions,
          }) as unknown as OpensearchClient<unknown>,
      );

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const tagQuery = 'Team';

      const suggestions =
        await result.current.getMeetingRepAttendanceTagSuggestions(tagQuery);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'attendance',
        expect.any(Function),
      );

      expect(mockGetTagSuggestions).toHaveBeenCalledWith(tagQuery, 'flat');
      expect(suggestions).toEqual(['Team Beta']);
    });
  });

  describe('getPreliminaryDataSharing', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetPreliminaryDataSharing = jest
        .spyOn(collaborationApi, 'getPreliminaryDataSharing')
        .mockResolvedValue({
          items: [
            {
              teamId: 'team-2',
              teamName: 'Team Beta',
              isTeamInactive: true,
              limitedData: false,
              percentShared: 82,
              timeRange: 'last-year',
            },
          ],
          total: 1,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: ['Team Beta', 'Team Gamma'],
        currentPage: 0,
        pageSize: 50,
        timeRange: 'all' as const,
      };

      await result.current.getPreliminaryDataSharing(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'preliminary-data-sharing',
        expect.any(Function),
      );

      expect(mockGetPreliminaryDataSharing).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getUserProductivity', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetUserProductivity = jest
        .spyOn(productivityApi, 'getUserProductivity')
        .mockResolvedValue({
          items: [
            {
              id: 'user-1',
              name: 'John Doe',
              isAlumni: false,
              teams: [
                {
                  id: 'team-1',
                  team: 'Team Alpha',
                  role: 'Collaborating PI',
                  isTeamInactive: false,
                  isUserInactiveOnTeam: false,
                },
              ],
              asapOutput: 10,
              asapPublicOutput: 8,
              ratio: 0.8,
            },
          ],
          total: 1,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: ['Team Alpha'],
        currentPage: 0,
        pageSize: 10,
        timeRange: '30d' as const,
        documentCategory: 'all' as const,
        sort: 'user_asc' as const,
      };

      await result.current.getUserProductivity(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'user-productivity',
        expect.any(Function),
      );

      expect(mockGetUserProductivity).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getUserProductivityTagSuggestions', () => {
    it('creates OpensearchClient with correct index and calls getTagSuggestions', async () => {
      const mockGetTagSuggestions = jest.fn().mockResolvedValue(['Team Alpha']);
      mockOpensearchClient.mockImplementation(
        () =>
          ({
            getTagSuggestions: mockGetTagSuggestions,
          }) as unknown as OpensearchClient<unknown>,
      );

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const tagQuery = 'Team';

      const suggestions =
        await result.current.getUserProductivityTagSuggestions(tagQuery);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'user-productivity',
        expect.any(Function),
      );

      expect(mockGetTagSuggestions).toHaveBeenCalledWith(tagQuery, 'extended');
      expect(suggestions).toEqual(['Team Alpha']);
    });
  });

  describe('getUserProductivityPerformance', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetUserProductivityPerformance = jest
        .spyOn(productivityApi, 'getUserProductivityPerformance')
        .mockResolvedValue({
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

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        timeRange: '90d' as const,
        documentCategory: 'article' as const,
      };

      await result.current.getUserProductivityPerformance(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'user-productivity-performance',
        expect.any(Function),
      );

      expect(mockGetUserProductivityPerformance).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getTeamProductivity', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetTeamProductivity = jest
        .spyOn(productivityApi, 'getTeamProductivity')
        .mockResolvedValue({
          items: [
            {
              id: 'team-1',
              name: 'Team Alpha',
              isInactive: false,
              Article: 5,
              Bioinformatics: 3,
              Dataset: 2,
              'Lab Material': 1,
              Protocol: 4,
            },
          ],
          total: 1,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: ['Team Alpha'],
        currentPage: 0,
        pageSize: 10,
        timeRange: '30d' as const,
        outputType: 'all' as const,
        sort: 'team_asc' as const,
      };

      await result.current.getTeamProductivity(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'team-productivity',
        expect.any(Function),
      );

      expect(mockGetTeamProductivity).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getTeamProductivityTagSuggestions', () => {
    afterEach(() => {
      mockOpensearchClient.mockReset();
    });

    it('creates OpensearchClient with correct index and calls getTagSuggestions', async () => {
      const mockGetTagSuggestions = jest.fn().mockResolvedValue(['Team Beta']);
      mockOpensearchClient.mockImplementation(
        () =>
          ({
            getTagSuggestions: mockGetTagSuggestions,
          }) as unknown as OpensearchClient<unknown>,
      );

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const tagQuery = 'Team';

      const suggestions =
        await result.current.getTeamProductivityTagSuggestions(tagQuery);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'team-productivity',
        expect.any(Function),
      );

      expect(mockGetTagSuggestions).toHaveBeenCalledWith(tagQuery, 'flat');
      expect(suggestions).toEqual(['Team Beta']);
    });
  });

  describe('getTeamProductivityPerformance', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetTeamProductivityPerformance = jest
        .spyOn(productivityApi, 'getTeamProductivityPerformance')
        .mockResolvedValue({
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

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        timeRange: '90d' as const,
        outputType: 'public' as const,
      };

      await result.current.getTeamProductivityPerformance(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'team-productivity-performance',
        expect.any(Function),
      );

      expect(mockGetTeamProductivityPerformance).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getUserCollaboration', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetUserCollaboration = jest
        .spyOn(collaborationApi, 'getUserCollaboration')
        .mockResolvedValue({
          items: [],
          total: 0,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: [],
        currentPage: 0,
        pageSize: 10,
        timeRange: 'all' as const,
        documentCategory: 'all' as const,
        sort: 'user_asc' as const,
      };

      await result.current.getUserCollaboration(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'user-collaboration',
        expect.any(Function),
      );

      expect(mockGetUserCollaboration).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getUserCollaborationTagSuggestions', () => {
    it('creates OpensearchClient with correct index and calls getTagSuggestions', async () => {
      const mockGetTagSuggestions = jest.fn().mockResolvedValue(['Tag 1']);
      mockOpensearchClient.mockImplementation(
        () =>
          ({
            getTagSuggestions: mockGetTagSuggestions,
          }) as unknown as OpensearchClient<unknown>,
      );

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const tagQuery = 'Tag';

      const suggestions =
        await result.current.getUserCollaborationTagSuggestions(tagQuery);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'user-collaboration',
        expect.any(Function),
      );

      expect(mockGetTagSuggestions).toHaveBeenCalledWith(tagQuery, 'extended');
      expect(suggestions).toEqual(['Tag 1']);
    });
  });

  describe('getUserCollaborationPerformance', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetUserCollaborationPerformance = jest
        .spyOn(collaborationApi, 'getUserCollaborationPerformance')
        .mockResolvedValue(undefined);

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        timeRange: 'all' as const,
        documentCategory: 'all' as const,
      };

      await result.current.getUserCollaborationPerformance(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'user-collaboration-performance',
        expect.any(Function),
      );

      expect(mockGetUserCollaborationPerformance).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getTeamCollaboration', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetTeamCollaboration = jest
        .spyOn(collaborationApi, 'getTeamCollaboration')
        .mockResolvedValue({
          items: [],
          total: 0,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: [],
        currentPage: 0,
        pageSize: 10,
        timeRange: 'all' as const,
        outputType: 'all' as const,
        sort: 'team_asc' as const,
      };

      await result.current.getTeamCollaboration(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'team-collaboration',
        expect.any(Function),
      );

      expect(mockGetTeamCollaboration).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getTeamCollaborationTagSuggestions', () => {
    it('creates OpensearchClient with correct index and calls getTagSuggestions', async () => {
      const mockGetTagSuggestions = jest.fn().mockResolvedValue(['Tag 1']);
      mockOpensearchClient.mockImplementation(
        () =>
          ({
            getTagSuggestions: mockGetTagSuggestions,
          }) as unknown as OpensearchClient<unknown>,
      );

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const tagQuery = 'Tag';

      const suggestions =
        await result.current.getTeamCollaborationTagSuggestions(tagQuery);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'team-collaboration',
        expect.any(Function),
      );

      expect(mockGetTagSuggestions).toHaveBeenCalledWith(tagQuery, 'flat');
      expect(suggestions).toEqual(['Tag 1']);
    });
  });

  describe('getTeamCollaborationPerformance', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetTeamCollaborationPerformance = jest
        .spyOn(collaborationApi, 'getTeamCollaborationPerformance')
        .mockResolvedValue(undefined);

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        timeRange: 'all' as const,
        outputType: 'all' as const,
      };

      await result.current.getTeamCollaborationPerformance(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'team-collaboration-performance',
        expect.any(Function),
      );

      expect(mockGetTeamCollaborationPerformance).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getPresenterRepresentation*', () => {
    it('creates OpensearchClient with presenter-representation index and calls getEngagement API method', async () => {
      const mockGetEngagement = jest
        .spyOn(engagementApi, 'getEngagement')
        .mockResolvedValue({
          items: [],
          total: 0,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: ['Team Alpha'],
        currentPage: 0,
        pageSize: 10,
        timeRange: '30d' as const,
        sort: 'team_asc' as const,
      };

      await result.current.getPresenterRepresentation(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'presenter-representation',
        expect.any(Function),
      );

      expect(mockGetEngagement).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });

    it('creates OpensearchClient with correct index and calls getTagSuggestions', async () => {
      const mockGetTagSuggestions = jest.fn().mockResolvedValue(['Team Beta']);
      mockOpensearchClient.mockImplementation(
        () =>
          ({
            getTagSuggestions: mockGetTagSuggestions,
          }) as unknown as OpensearchClient<unknown>,
      );

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const tagQuery = 'Team';

      const suggestions =
        await result.current.getPresenterRepresentationTagSuggestions(tagQuery);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'presenter-representation',
        expect.any(Function),
      );

      expect(mockGetTagSuggestions).toHaveBeenCalledWith(tagQuery, 'flat');
      expect(suggestions).toEqual(['Team Beta']);
    });

    it('creates OpensearchClient with presenter-representation-performance index and calls getEngagementPerformance API method', async () => {
      const mockGetEngagementPerformance = jest
        .spyOn(engagementApi, 'getEngagementPerformance')
        .mockResolvedValue({
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
            belowAverageMax: 1,
            averageMin: 1,
            averageMax: 3,
            aboveAverageMin: 3,
            aboveAverageMax: 6,
          },
          uniqueKeyPersonnel: {
            belowAverageMin: 0,
            belowAverageMax: 1,
            averageMin: 1,
            averageMax: 2,
            aboveAverageMin: 2,
            aboveAverageMax: 5,
          },
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        timeRange: '90d' as const,
      };

      await result.current.getPresenterRepresentationPerformance(
        paginationParams,
      );

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'presenter-representation-performance',
        expect.any(Function),
      );

      expect(mockGetEngagementPerformance).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  it('uses the same authorization for all OpenSearch clients', async () => {
    const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeTruthy();
    });

    // Call multiple methods
    await result.current.getPublicationCompliance({
      tags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      sort: 'team_asc',
    });

    await result.current.getPreprintCompliance({
      tags: [],
      currentPage: 0,
      pageSize: 10,
      timeRange: 'all',
      sort: 'team_asc',
    });

    // Verify that all clients were created with the same authorization
    const authorizationCalls = mockOpensearchClient.mock.calls.map(
      (call) => call[1],
    );
    expect(authorizationCalls[0]).toBe(authorizationCalls[1]);
    expect(authorizationCalls).toHaveLength(2);
  });

  describe('getAnalyticsWorkingGroupLeadership', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetAnalyticsLeadership = jest
        .spyOn(leadershipApi, 'getAnalyticsLeadership')
        .mockResolvedValue({
          items: [],
          total: 0,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: [],
        currentPage: 0,
        pageSize: 10,
        metric: 'working-group' as const,
      };

      await result.current.getAnalyticsWorkingGroupLeadership(paginationParams);

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'wg-leadership',
        expect.any(Function),
      );

      expect(mockGetAnalyticsLeadership).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getAnalyticsWorkingGroupLeadershipTagSuggestions', () => {
    it('creates OpensearchClient with correct index and calls getTagSuggestions', async () => {
      const mockGetTagSuggestions = jest.fn().mockResolvedValue(['Tag 1']);
      mockOpensearchClient.mockImplementation(
        () =>
          ({
            getTagSuggestions: mockGetTagSuggestions,
          }) as unknown as OpensearchClient<unknown>,
      );

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const tagQuery = 'Tag';

      const suggestions =
        await result.current.getAnalyticsWorkingGroupLeadershipTagSuggestions(
          tagQuery,
        );

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'wg-leadership',
        expect.any(Function),
      );

      expect(mockGetTagSuggestions).toHaveBeenCalledWith(tagQuery, 'flat');
      expect(suggestions).toEqual(['Tag 1']);
    });
  });

  describe('getAnalyticsInterestGroupLeadership', () => {
    it('creates OpensearchClient with correct index and calls API method', async () => {
      const mockGetAnalyticsLeadership = jest
        .spyOn(leadershipApi, 'getAnalyticsLeadership')
        .mockResolvedValue({
          items: [],
          total: 0,
        });

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const paginationParams = {
        tags: [],
        currentPage: 0,
        pageSize: 10,
        metric: 'interest-group' as const,
      };

      await result.current.getAnalyticsInterestGroupLeadership(
        paginationParams,
      );

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'ig-leadership',
        expect.any(Function),
      );

      expect(mockGetAnalyticsLeadership).toHaveBeenCalledWith(
        expect.any(OpensearchClient),
        paginationParams,
      );
    });
  });

  describe('getAnalyticsInterestGroupLeadershipTagSuggestions', () => {
    it('creates OpensearchClient with correct index and calls getTagSuggestions', async () => {
      const mockGetTagSuggestions = jest.fn().mockResolvedValue(['Tag 1']);
      mockOpensearchClient.mockImplementation(
        () =>
          ({
            getTagSuggestions: mockGetTagSuggestions,
          }) as unknown as OpensearchClient<unknown>,
      );

      const { result } = renderHook(() => useOpensearchMetrics(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const tagQuery = 'Tag';

      const suggestions =
        await result.current.getAnalyticsInterestGroupLeadershipTagSuggestions(
          tagQuery,
        );

      expect(mockOpensearchClient).toHaveBeenCalledWith(
        'ig-leadership',
        expect.any(Function),
      );

      expect(mockGetTagSuggestions).toHaveBeenCalledWith(tagQuery, 'flat');
      expect(suggestions).toEqual(['Tag 1']);
    });
  });
});
