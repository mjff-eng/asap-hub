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
