import MetricsCard, { Metric, MoodStatus } from './MetricsCard';

export type TeamCollaborationMetricsProps = {
  withinTeamCoProduction: number | null;
};

const TeamCollaborationMetrics: React.FC<TeamCollaborationMetricsProps> = ({
  withinTeamCoProduction,
}) => {
  const metrics: Metric[] = [
    {
      id: 'withinTeamCoProduction',
      name: 'Within Team Co-Production of Research Outputs',
      status: <MoodStatus percentage={withinTeamCoProduction} />,
      philosophy:
        'ASAP is built upon the principle that facilitation of collaboration will accelerate discovery. ASAP is changing the way that science is done, in part, by funding team-based projects that bring together a diverse range of expertise.',
      definition:
        'The Within Team Co-Production Metric assesses whether teams are working together to produce shared research outputs.',
    },
  ];

  return <MetricsCard metrics={metrics} />;
};

export default TeamCollaborationMetrics;
