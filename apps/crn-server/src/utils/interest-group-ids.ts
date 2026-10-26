import { InterestGroupDataProvider } from '../data-providers/types';

export const getInterestGroupIdsForEntry = async (
  interestGroupDataProvider: InterestGroupDataProvider,
  detailType: string,
  resourceId: string,
): Promise<string[]> => {
  if (detailType.startsWith('InterestGroupsTeams')) {
    const interestGroupId =
      await interestGroupDataProvider.fetchIdByInterestGroupTeamId(resourceId);
    return interestGroupId ? [interestGroupId] : [];
  }
  if (detailType.startsWith('Teams')) {
    return interestGroupDataProvider.fetchIdsByTeamId(resourceId);
  }
  return [resourceId];
};
