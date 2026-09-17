import { TeamProductivityOpensearchDocument } from '@asap-hub/model';

import { TeamCoProduction } from '../../analytics/collaboration/api';

// Absence must not collapse to zero: the two figures come from independently
// synced indices, and reporting a lagging sync as 0% would tell a team it needs
// to improve.
export const getWithinTeamCoProduction = (
  { coProducedArticles }: TeamCoProduction,
  allOutputs?: TeamProductivityOpensearchDocument,
): number | null => {
  if (coProducedArticles === undefined || allOutputs === undefined) {
    return null;
  }

  const totalArticles = allOutputs.Article;
  if (totalArticles === 0 || coProducedArticles > totalArticles) {
    return null;
  }

  return Math.round((coProducedArticles / totalArticles) * 100);
};
