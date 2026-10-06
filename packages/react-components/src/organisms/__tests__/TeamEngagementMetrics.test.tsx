import { render, screen, within } from '@testing-library/react';

import TeamEngagementMetrics from '../TeamEngagementMetrics';

const outstanding = /outstanding: 90% – 100%/i;
const adequate = /adequate: 80% – 89%/i;
const improve = /needs improvement: 0% – 79%/i;
const limited = /limited available data/i;

const renderCard = (
  props: Partial<React.ComponentProps<typeof TeamEngagementMetrics>> = {},
) =>
  render(
    <TeamEngagementMetrics
      speakerDiversity={95}
      traineePresentations={84}
      meetingRepAttendance={{ percentage: 75, limitedData: false }}
      {...props}
    />,
  );

const statusOf = (metric: string) =>
  within(screen.getByText(metric).closest('article')!).getByRole('button', {
    name: (name) => name !== `Expand ${metric}`,
  });

describe('TeamEngagementMetrics', () => {
  it('renders the three engagement metrics', () => {
    renderCard();

    expect(screen.getByText('Speaker Diversity')).toBeInTheDocument();
    expect(screen.getByText('Trainee Presentations')).toBeInTheDocument();
    expect(screen.getByText('Meeting Rep Attendance')).toBeInTheDocument();
  });

  it.each`
    percentage | status
    ${95}      | ${outstanding}
    ${90}      | ${outstanding}
    ${89}      | ${adequate}
    ${80}      | ${adequate}
    ${79}      | ${improve}
    ${0}       | ${improve}
  `('grades $percentage% as $status', ({ percentage, status }) => {
    renderCard({
      speakerDiversity: percentage,
      traineePresentations: percentage,
      meetingRepAttendance: { percentage, limitedData: false },
    });

    expect(statusOf('Speaker Diversity')).toHaveAccessibleName(status);
    expect(statusOf('Trainee Presentations')).toHaveAccessibleName(status);
    expect(statusOf('Meeting Rep Attendance')).toHaveAccessibleName(status);
  });

  it('shows limited data when a speaker percentage is missing', () => {
    renderCard({ speakerDiversity: null, traineePresentations: null });

    expect(statusOf('Speaker Diversity')).toHaveAccessibleName(limited);
    expect(statusOf('Trainee Presentations')).toHaveAccessibleName(limited);
  });

  it('shows limited data when the attendance record says so', () => {
    renderCard({ meetingRepAttendance: { percentage: 90, limitedData: true } });

    expect(statusOf('Meeting Rep Attendance')).toHaveAccessibleName(limited);
  });
});
