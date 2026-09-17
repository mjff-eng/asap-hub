import { PerformanceMetrics } from '@asap-hub/model';
import {
  happyFaceIcon,
  neutralFaceIcon,
  sadFaceIcon,
  informationInverseIcon,
} from '../../icons';
import {
  getPerformanceText,
  getPerformanceMoodIcon,
  getPerformanceMoodLabel,
} from '../analytics';

describe('getPerformanceText', () => {
  const performanceMetrics: PerformanceMetrics = {
    belowAverageMin: 0,
    belowAverageMax: 4,
    averageMin: 5,
    averageMax: 10,
    aboveAverageMin: 11,
    aboveAverageMax: 20,
  };
  it('returns "Below" when value is below average', () => {
    expect(getPerformanceText(3, performanceMetrics)).toBe('Below');
  });
  it('returns "Average" when value is within average', () => {
    expect(getPerformanceText(6, performanceMetrics)).toBe('Average');
  });
  it('returns "Above" when value is above average', () => {
    expect(getPerformanceText(15, performanceMetrics)).toBe('Above');
  });

  it('getPerformanceIcon returns correct icons for different percentages', () => {
    expect(getPerformanceMoodIcon(95, false)).toBe(happyFaceIcon);
    expect(getPerformanceMoodIcon(90, false)).toBe(happyFaceIcon);
    expect(getPerformanceMoodIcon(85, false)).toBe(neutralFaceIcon);
    expect(getPerformanceMoodIcon(80, false)).toBe(neutralFaceIcon);
    expect(getPerformanceMoodIcon(50, false)).toBe(sadFaceIcon);
    expect(getPerformanceMoodIcon(1, false)).toBe(sadFaceIcon);
    expect(getPerformanceMoodIcon(0, false)).toBe(sadFaceIcon);
    expect(getPerformanceMoodIcon(0, true)).toBe(informationInverseIcon);
    expect(getPerformanceMoodIcon(null, true)).toBe(informationInverseIcon);
    expect(getPerformanceMoodIcon(null, false)).toBe(informationInverseIcon);
  });

  it('getPerformanceMoodIcon defaults isLimitedData to false', () => {
    expect(getPerformanceMoodIcon(95)).toBe(happyFaceIcon);
    expect(getPerformanceMoodIcon(null)).toBe(informationInverseIcon);
  });
});

describe('getPerformanceMoodLabel', () => {
  it('returns limited data message when isLimitedData is true', () => {
    expect(getPerformanceMoodLabel(95, true)).toBe(
      'There is limited available data to calculate this metric at this time.',
    );
  });

  it('returns limited data message when percentage is null', () => {
    expect(getPerformanceMoodLabel(null, false)).toBe(
      'There is limited available data to calculate this metric at this time.',
    );
    expect(getPerformanceMoodLabel(null, true)).toBe(
      'There is limited available data to calculate this metric at this time.',
    );
  });

  it('returns outstanding message when percentage is 90 or above', () => {
    expect(getPerformanceMoodLabel(95, false)).toBe(
      'Your team is doing an outstanding job! Keep up the good work!',
    );
    expect(getPerformanceMoodLabel(90, false)).toBe(
      'Your team is doing an outstanding job! Keep up the good work!',
    );
  });

  it('returns adequate message when percentage is between 80 and 89', () => {
    expect(getPerformanceMoodLabel(85, false)).toBe(
      'Your team is doing an adequate job for this metric.',
    );
    expect(getPerformanceMoodLabel(80, false)).toBe(
      'Your team is doing an adequate job for this metric.',
    );
  });

  it('returns improvement message when percentage is below 80', () => {
    expect(getPerformanceMoodLabel(50, false)).toBe(
      'We encourage your team to work to improve.',
    );
    expect(getPerformanceMoodLabel(1, false)).toBe(
      'We encourage your team to work to improve.',
    );
    expect(getPerformanceMoodLabel(0, false)).toBe(
      'We encourage your team to work to improve.',
    );
  });

  it('defaults isLimitedData to false', () => {
    expect(getPerformanceMoodLabel(95)).toBe(
      'Your team is doing an outstanding job! Keep up the good work!',
    );
    expect(getPerformanceMoodLabel(null)).toBe(
      'There is limited available data to calculate this metric at this time.',
    );
  });
});

describe('caller-supplied mood bands', () => {
  const ticketBands = { outstandingMin: 81, adequateMin: 50 };

  it('puts exactly 80 in the middle band, not the top one', () => {
    expect(getPerformanceMoodIcon(80, false, ticketBands)).toBe(
      neutralFaceIcon,
    );
  });

  it('puts exactly 50 in the middle band, not the bottom one', () => {
    expect(getPerformanceMoodIcon(50, false, ticketBands)).toBe(
      neutralFaceIcon,
    );
  });

  it('puts 81 in the top band and 49 in the bottom band', () => {
    expect(getPerformanceMoodIcon(81, false, ticketBands)).toBe(happyFaceIcon);
    expect(getPerformanceMoodIcon(49, false, ticketBands)).toBe(sadFaceIcon);
  });

  it('moves the label across the same boundaries as the icon', () => {
    // The two helpers duplicate their comparisons, so a change to one can
    // desync the tooltip from the face it sits next to.
    expect(getPerformanceMoodLabel(80, false, ticketBands)).toBe(
      'Your team is doing an adequate job for this metric.',
    );
    expect(getPerformanceMoodLabel(81, false, ticketBands)).toBe(
      'Your team is doing an outstanding job! Keep up the good work!',
    );
    expect(getPerformanceMoodLabel(50, false, ticketBands)).toBe(
      'Your team is doing an adequate job for this metric.',
    );
    expect(getPerformanceMoodLabel(49, false, ticketBands)).toBe(
      'We encourage your team to work to improve.',
    );
  });

  it('agrees between icon and label at 85 under the ticket bands', () => {
    expect(getPerformanceMoodIcon(85, false, ticketBands)).toBe(happyFaceIcon);
    expect(getPerformanceMoodLabel(85, false, ticketBands)).toBe(
      'Your team is doing an outstanding job! Keep up the good work!',
    );
  });

  it('leaves the default cutoffs untouched at their exact boundaries', () => {
    // 90 and 80 are the current cutoffs — an operator change would move these
    // while every interior value still passed.
    expect(getPerformanceMoodIcon(95)).toBe(happyFaceIcon);
    expect(getPerformanceMoodIcon(90)).toBe(happyFaceIcon);
    expect(getPerformanceMoodIcon(85)).toBe(neutralFaceIcon);
    expect(getPerformanceMoodIcon(80)).toBe(neutralFaceIcon);
    expect(getPerformanceMoodIcon(50)).toBe(sadFaceIcon);

    expect(getPerformanceMoodLabel(90)).toBe(
      'Your team is doing an outstanding job! Keep up the good work!',
    );
    expect(getPerformanceMoodLabel(80)).toBe(
      'Your team is doing an adequate job for this metric.',
    );
  });
});
