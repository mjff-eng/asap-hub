import {
  FetchAnalyticsOptions,
  FetchAwardsOptions,
  FetchPaginationOptions,
  ListAnalyticsTeamLeadershipResponse,
} from '@asap-hub/model';
import AnalyticsController from '../../src/controllers/analytics.controller';
import {
  getListAnalyticsTeamLeadershipDataObject,
  getListAnalyticsTeamLeadershipResponse,
  getListEngagementResponse,
  getListTeamCollaborationResponse,
  getListTeamProductivityDataObject,
  getListTeamProductivityResponse,
  getListUserCollaborationResponse,
  getListUserProductivityDataObject,
  getListUserProductivityResponse,
  getListOSChampionResponse,
  getAwardTypeDataObjects,
  getListAwardsResponse,
  getListPreliminaryDataSharingResponse,
  getListAttendanceResponse,
} from '../fixtures/analytics.fixtures';
import { analyticsDataProviderMock } from '../mocks/analytics.data-provider.mock';

describe('Analytics controller', () => {
  const analyticsController = new AnalyticsController(
    analyticsDataProviderMock,
  );

  describe('fetchTeamLeadership method', () => {
    test('Should return an empty result when the data provider returns an empty list', async () => {
      analyticsDataProviderMock.fetchTeamLeadership.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await analyticsController.fetchTeamLeadership({});

      expect(result).toEqual({
        total: 0,
        items: [],
      } satisfies ListAnalyticsTeamLeadershipResponse);
    });

    test('Should return the analytics team leadership', async () => {
      analyticsDataProviderMock.fetchTeamLeadership.mockResolvedValue(
        getListAnalyticsTeamLeadershipDataObject(),
      );

      const result = await analyticsController.fetchTeamLeadership({});

      expect(result).toEqual(getListAnalyticsTeamLeadershipResponse());
    });

    test('Should call the data provider with the correct options', async () => {
      const options: FetchPaginationOptions = {
        take: 10,
        skip: 5,
      };
      await analyticsController.fetchTeamLeadership(options);

      expect(
        analyticsDataProviderMock.fetchTeamLeadership,
      ).toHaveBeenCalledWith(options);
    });
  });

  describe('fetchUserProductivity method', () => {
    test('Should return an empty result when the data provider returns an empty list', async () => {
      analyticsDataProviderMock.fetchUserProductivity.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await analyticsController.fetchUserProductivity({});

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return the productivity data', async () => {
      analyticsDataProviderMock.fetchUserProductivity.mockResolvedValue(
        getListUserProductivityDataObject(),
      );

      const result = await analyticsController.fetchUserProductivity({});

      expect(result).toEqual(getListUserProductivityResponse());
    });

    test('Should call the data provider with the correct options', async () => {
      const options: FetchAnalyticsOptions = {
        take: 10,
        skip: 5,
        filter: {
          documentCategory: 'all',
        },
      };
      await analyticsController.fetchUserProductivity(options);

      expect(
        analyticsDataProviderMock.fetchUserProductivity,
      ).toHaveBeenCalledWith(options);
    });
  });

  describe('fetchTeamProductivity method', () => {
    test('Should return an empty result when the data provider returns an empty list', async () => {
      analyticsDataProviderMock.fetchTeamProductivity.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await analyticsController.fetchTeamProductivity({});

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return the productivity data', async () => {
      analyticsDataProviderMock.fetchTeamProductivity.mockResolvedValue(
        getListTeamProductivityDataObject(),
      );

      const result = await analyticsController.fetchTeamProductivity({});

      expect(result).toEqual(getListTeamProductivityResponse());
    });

    test('Should call the data provider with the correct options', async () => {
      const options: FetchAnalyticsOptions = {
        take: 10,
        skip: 5,
        filter: {
          timeRange: '30d',
          outputType: 'public',
        },
      };
      await analyticsController.fetchTeamProductivity(options);

      expect(
        analyticsDataProviderMock.fetchTeamProductivity,
      ).toHaveBeenCalledWith(options);
    });
  });

  describe('fetchUserCollaboration method', () => {
    test('Should return an empty result when the data provider returns an empty list', async () => {
      analyticsDataProviderMock.fetchUserCollaboration.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await analyticsController.fetchUserCollaboration({});

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return the collaboration data', async () => {
      analyticsDataProviderMock.fetchUserCollaboration.mockResolvedValue(
        getListUserCollaborationResponse(),
      );

      const result = await analyticsController.fetchUserCollaboration({});

      expect(result).toEqual(getListUserCollaborationResponse());
    });

    test('Should call the data provider with the correct options', async () => {
      const options: FetchPaginationOptions = {
        take: 10,
        skip: 5,
      };
      await analyticsController.fetchUserCollaboration(options);

      expect(
        analyticsDataProviderMock.fetchUserCollaboration,
      ).toHaveBeenCalledWith(options);
    });
  });

  describe('fetchTeamCollaboration method', () => {
    test('Should return an empty result when the data provider returns an empty list', async () => {
      analyticsDataProviderMock.fetchTeamCollaboration.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await analyticsController.fetchTeamCollaboration({});

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return the team collaboration data', async () => {
      analyticsDataProviderMock.fetchTeamCollaboration.mockResolvedValue(
        getListTeamCollaborationResponse(),
      );

      const result = await analyticsController.fetchTeamCollaboration({});

      expect(result).toEqual(getListTeamCollaborationResponse());
    });

    test('Should call the data provider with the correct options', async () => {
      const options: FetchPaginationOptions = {
        take: 10,
        skip: 5,
      };
      await analyticsController.fetchTeamCollaboration(options);

      expect(
        analyticsDataProviderMock.fetchTeamCollaboration,
      ).toHaveBeenCalledWith(options);
    });
  });

  describe('fetchEngagement method', () => {
    test('Should return an empty result when the data provider returns an empty list', async () => {
      analyticsDataProviderMock.fetchEngagement.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await analyticsController.fetchEngagement({});

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return the engagement data', async () => {
      analyticsDataProviderMock.fetchEngagement.mockResolvedValue(
        getListEngagementResponse(),
      );

      const result = await analyticsController.fetchEngagement({});

      expect(result).toEqual(getListEngagementResponse());
    });

    test('Should call the data provider with the correct options', async () => {
      const options: FetchPaginationOptions = {
        take: 10,
        skip: 5,
      };
      await analyticsController.fetchEngagement(options);

      expect(analyticsDataProviderMock.fetchEngagement).toHaveBeenCalledWith(
        options,
      );
    });
  });

  describe('fetchOSChampion method', () => {
    test('Should return an empty result when the data provider returns an empty list', async () => {
      analyticsDataProviderMock.fetchOSChampion.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await analyticsController.fetchOSChampion({});

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return the OS Champion data', async () => {
      analyticsDataProviderMock.fetchOSChampion.mockResolvedValue(
        getListOSChampionResponse(),
      );

      const result = await analyticsController.fetchOSChampion({});

      expect(result).toEqual(getListOSChampionResponse());
    });

    test('Should call the data provider with the correct options', async () => {
      const options: FetchPaginationOptions = {
        take: 10,
        skip: 5,
      };
      await analyticsController.fetchOSChampion(options);

      expect(analyticsDataProviderMock.fetchOSChampion).toHaveBeenCalledWith(
        options,
      );
    });
  });

  describe('fetchAwardTypes method', () => {
    test('Should return an empty list when the data provider returns no award types', async () => {
      analyticsDataProviderMock.fetchAwardTypes.mockResolvedValue([]);

      const result = await analyticsController.fetchAwardTypes();

      expect(result).toEqual([]);
    });

    test('Should return the award types from the data provider', async () => {
      analyticsDataProviderMock.fetchAwardTypes.mockResolvedValue(
        getAwardTypeDataObjects(),
      );

      const result = await analyticsController.fetchAwardTypes();

      expect(result).toEqual(getAwardTypeDataObjects());
      expect(analyticsDataProviderMock.fetchAwardTypes).toHaveBeenCalledWith();
    });
  });

  describe('fetchAwards method', () => {
    const osChampionAwardType = getAwardTypeDataObjects()[1]!;

    test('Should return an empty result when the data provider returns an empty list', async () => {
      analyticsDataProviderMock.fetchAwards.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await analyticsController.fetchAwards({
        filter: { awardType: osChampionAwardType },
      });

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return the awards data', async () => {
      analyticsDataProviderMock.fetchAwards.mockResolvedValue(
        getListAwardsResponse(),
      );

      const result = await analyticsController.fetchAwards({
        filter: { awardType: osChampionAwardType },
      });

      expect(result).toEqual(getListAwardsResponse());
    });

    test('Should call the data provider with the correct options', async () => {
      const options: FetchAwardsOptions = {
        take: 10,
        skip: 5,
        filter: { timeRange: '90d', awardType: osChampionAwardType },
      };
      await analyticsController.fetchAwards(options);

      expect(analyticsDataProviderMock.fetchAwards).toHaveBeenCalledWith(
        options,
      );
    });
  });

  describe('fetchPreliminaryDataSharing method', () => {
    test('Should return an empty result when the data provider returns an empty list', async () => {
      analyticsDataProviderMock.fetchPreliminaryDataSharing.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await analyticsController.fetchPreliminaryDataSharing({});

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return the preliminary data sharing data', async () => {
      analyticsDataProviderMock.fetchPreliminaryDataSharing.mockResolvedValue(
        getListPreliminaryDataSharingResponse(),
      );

      const result = await analyticsController.fetchPreliminaryDataSharing({});

      expect(result).toEqual(getListPreliminaryDataSharingResponse());
    });

    test('Should call the data provider with the correct options', async () => {
      const options: FetchPaginationOptions = {
        take: 10,
        skip: 5,
      };
      await analyticsController.fetchPreliminaryDataSharing(options);

      expect(
        analyticsDataProviderMock.fetchPreliminaryDataSharing,
      ).toHaveBeenCalledWith(options);
    });
  });

  describe('fetchAttendance method', () => {
    test('Should return an empty result when the data provider returns an empty list', async () => {
      analyticsDataProviderMock.fetchAttendance.mockResolvedValue({
        total: 0,
        items: [],
      });

      const result = await analyticsController.fetchAttendance({});

      expect(result).toEqual({ total: 0, items: [] });
    });

    test('Should return the attendance data', async () => {
      analyticsDataProviderMock.fetchAttendance.mockResolvedValue(
        getListAttendanceResponse(),
      );

      const result = await analyticsController.fetchAttendance({});

      expect(result).toEqual(getListAttendanceResponse());
    });

    test('Should call the data provider with the correct options', async () => {
      const options: FetchPaginationOptions = {
        take: 10,
        skip: 5,
      };
      await analyticsController.fetchAttendance(options);

      expect(analyticsDataProviderMock.fetchAttendance).toHaveBeenCalledWith(
        options,
      );
    });
  });
});
