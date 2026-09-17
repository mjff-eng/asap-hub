import { MoodBands } from '../utils';
import MetricsCard, { Metric, MoodStatus } from './MetricsCard';

export type TeamCollaborationMetricsProps = {
  withinTeamCoProduction: number | null;
};

// 81, not 80: the helper compares with >=, so this is what reads exactly 80 as
// Adequate. Correct only while the percentage reaches it already rounded.
const withinTeamCoProductionBands: MoodBands = {
  outstandingMin: 81,
  adequateMin: 50,
};

const TeamCollaborationMetrics: React.FC<TeamCollaborationMetricsProps> = ({
  withinTeamCoProduction,
}) => {
  const metrics: Metric[] = [
    {
      id: 'withinTeamCoProduction',
      name: 'Within Team Co-Production of Research Outputs',
      status: (
        <MoodStatus
          percentage={withinTeamCoProduction}
          bands={withinTeamCoProductionBands}
        />
      ),
      philosophy:
        'ASAP is built upon the principle that facilitation of collaboration will accelerate discovery. ASAP is changing the way that science is done, in part, by funding team-based projects that bring together a diverse range of expertise.',
      definition:
        'The Within Team Co-Production Metric assesses whether teams are working together to produce shared research outputs.',
    },
  ];

  return <MetricsCard metrics={metrics} />;
};

export default TeamCollaborationMetrics;
