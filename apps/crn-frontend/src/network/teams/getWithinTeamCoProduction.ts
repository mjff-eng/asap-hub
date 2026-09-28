import { TeamCoProduction } from '../../analytics/collaboration/api';

// Absence must not collapse to zero: reporting a team that has no figure yet as
// 0% would tell it to improve on data that simply is not there.
export const getWithinTeamCoProduction = ({
  coProducedArticles,
  totalArticles,
}: TeamCoProduction): number | null => {
  if (coProducedArticles === undefined || totalArticles === undefined) {
    return null;
  }

  if (totalArticles === 0 || coProducedArticles > totalArticles) {
    return null;
  }

  return Math.round((coProducedArticles / totalArticles) * 100);
};
