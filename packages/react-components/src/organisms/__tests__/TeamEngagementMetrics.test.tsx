import { render, screen, within } from '@testing-library/react';

import TeamEngagementMetrics from '../TeamEngagementMetrics';

const outstanding = /doing an outstanding job/i;
const adequate = /doing an adequate job/i;
const improve = /encourage your team to work to improve/i;
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
    ${81}      | ${outstanding}
    ${80}      | ${adequate}
    ${50}      | ${adequate}
    ${49}      | ${improve}
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
