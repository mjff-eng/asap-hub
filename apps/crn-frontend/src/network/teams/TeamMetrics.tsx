import { TeamAward, TeamMetricsPage } from '@asap-hub/react-components';
import { FC } from 'react';

import { useTeamCoProduction } from '../../analytics/collaboration/state';
import { useTeamLeadershipMetrics } from '../../analytics/leadership/state';
import { useTeamHubResearchOutputs } from '../../analytics/productivity/state';
import { getHubResearchOutputRows } from './getHubResearchOutputRows';
import { getWithinTeamCoProduction } from './getWithinTeamCoProduction';
import { useTeamAwardMetrics } from './state';

type TeamMetricsProps = {
  teamId: string;
};

const TeamMetrics: FC<TeamMetricsProps> = ({ teamId }) => {
  const { all, public: publicOutputs } = useTeamHubResearchOutputs({ teamId });
  const leadershipMetrics = useTeamLeadershipMetrics({ teamId });
  const { items: awardMetrics } = useTeamAwardMetrics(teamId);
  const teamCoProduction = useTeamCoProduction({ teamId });

  const hubResearchOutputRows = getHubResearchOutputRows(all, publicOutputs);
  const withinTeamCoProduction = getWithinTeamCoProduction(
    teamCoProduction,
    all,
  );
  const awards: TeamAward[] = awardMetrics.map(
    ({ id, name, asapPhilosophy, metricDefinition, received }) => ({
      id,
      name,
      status: received,
      philosophy: asapPhilosophy,
      metricDefinition,
    }),
  );

  return (
    <TeamMetricsPage
      hubResearchOutputRows={hubResearchOutputRows}
      leadershipMetrics={leadershipMetrics}
      awards={awards}
      collaborationMetrics={{ withinTeamCoProduction }}
    />
  );
};

export default TeamMetrics;
