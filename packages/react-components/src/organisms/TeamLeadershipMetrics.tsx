import MetricsCard, { BooleanStatus, Metric } from './MetricsCard';

export type TeamLeadershipMetricsProps = {
  workingGroupLead: boolean;
  interestGroupLead: boolean;
};

const TeamLeadershipMetrics: React.FC<TeamLeadershipMetricsProps> = ({
  workingGroupLead,
  interestGroupLead,
}) => {
  const metrics: Metric[] = [
    {
      id: 'workingGroup',
      name: 'Working Group(s) Lead',
      status: <BooleanStatus value={workingGroupLead} />,
      philosophy:
        'ASAP believes in ensuring that credit is given to contributors.',
      definition:
        'The Working Group Leadership Metric recognizes the team for their current and/or prior leadership as a chair of a CRN working group.',
    },
    {
      id: 'interestGroup',
      name: 'Interest Group(s) Lead',
      status: <BooleanStatus value={interestGroupLead} />,
      philosophy:
        'ASAP believes in ensuring that credit is given to contributors.',
      definition:
        'The Interest Group Leadership Metric recognizes the team for their current and/or prior leadership as a chair of a CRN interest group.',
    },
  ];

  return <MetricsCard metrics={metrics} />;
};

export default TeamLeadershipMetrics;
