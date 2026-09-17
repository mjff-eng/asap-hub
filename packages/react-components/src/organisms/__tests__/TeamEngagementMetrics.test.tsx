import { render, screen } from '@testing-library/react';

import TeamEngagementMetrics from '../TeamEngagementMetrics';
import { getPerformanceMoodIcon, getPerformanceMoodLabel } from '../../utils';

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  getPerformanceMoodIcon: jest.fn(() => 'mood-icon'),
  getPerformanceMoodLabel: jest.fn(() => 'mood-label'),
}));

describe('TeamEngagementMetrics', () => {
  it('derives the mood icon and label from each metric percentage', () => {
    render(
      <TeamEngagementMetrics
        speakerDiversity={95}
        traineePresentations={84}
        meetingRepAttendance={{ percentage: null, limitedData: true }}
      />,
    );

    expect(screen.getByText('Speaker Diversity')).toBeInTheDocument();
    expect(screen.getByText('Trainee Presentations')).toBeInTheDocument();
    expect(screen.getByText('Meeting Rep Attendance')).toBeInTheDocument();

    expect(getPerformanceMoodIcon).toHaveBeenNthCalledWith(
      1,
      95,
      false,
      undefined,
    );
    expect(getPerformanceMoodIcon).toHaveBeenNthCalledWith(
      2,
      84,
      false,
      undefined,
    );
    expect(getPerformanceMoodIcon).toHaveBeenNthCalledWith(
      3,
      null,
      true,
      undefined,
    );

    expect(getPerformanceMoodLabel).toHaveBeenNthCalledWith(
      1,
      95,
      false,
      undefined,
    );
    expect(getPerformanceMoodLabel).toHaveBeenNthCalledWith(
      2,
      84,
      false,
      undefined,
    );
    expect(getPerformanceMoodLabel).toHaveBeenNthCalledWith(
      3,
      null,
      true,
      undefined,
    );
  });

  it('handles limited data values', () => {
    render(
      <TeamEngagementMetrics
        speakerDiversity={95}
        traineePresentations={84}
        meetingRepAttendance={{ percentage: null, limitedData: true }}
      />,
    );

    expect(getPerformanceMoodIcon).toHaveBeenLastCalledWith(
      null,
      true,
      undefined,
    );
    expect(getPerformanceMoodLabel).toHaveBeenLastCalledWith(
      null,
      true,
      undefined,
    );
  });
});
