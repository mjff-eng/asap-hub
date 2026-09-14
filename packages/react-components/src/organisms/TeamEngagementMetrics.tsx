import MetricsCard, { Metric, MoodStatus } from './MetricsCard';

export type TeamEngagementMetricsProps = {
  speakerDiversity: number | null;
  traineePresentations: number | null;
  meetingRepAttendance: {
    percentage: number | null;
    limitedData: boolean;
  };
};

const TeamEngagementMetrics: React.FC<TeamEngagementMetricsProps> = ({
  speakerDiversity,
  traineePresentations,
  meetingRepAttendance,
}) => {
  const metrics: Metric[] = [
    {
      id: 'speakerDiversity',
      name: 'Speaker Diversity',
      status: <MoodStatus percentage={speakerDiversity} />,
      philosophy:
        'At ASAP, we want to ensure that diverse perspectives are being encouraged and that the entire team is engaged in the work.',
      definition:
        'The Speaker Diversity Metric calculates how many times different speakers from a team have presented for events hosted on the Hub.',
    },
    {
      id: 'traineePresentations',
      name: 'Trainee Presentations',
      status: <MoodStatus percentage={traineePresentations} />,
      philosophy:
        'At ASAP, we believe in supporting the next generation of scientists. This includes giving trainees the opportunity to showcase their work in the research setting.',
      definition:
        'The Trainee Engagement Metric assesses whether trainees that are part of a CRN team are presenting their work when given the opportunity. Opportunities to present include virtual Hub meetings, COSA, and in-person meetings.',
    },
    {
      id: 'meetingRepAttendance',
      name: 'Meeting Rep Attendance',
      status: (
        <MoodStatus
          percentage={meetingRepAttendance.percentage}
          limitedData={meetingRepAttendance.limitedData}
        />
      ),
      philosophy:
        'ASAP believes in fostering an environment where teams can share their work with others in the network. This sharing enables potential collaboration and can spark new ideas.',
      definition:
        'All teams that are members of an interest group are required to send at least 1 representative to the interest group meeting. The Interest Group Meeting attendance metric gives a snapshot of whether a team is sending a representative to the groups that they are a part of.',
    },
  ];

  return <MetricsCard metrics={metrics} />;
};

export default TeamEngagementMetrics;
