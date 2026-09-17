import { PerformanceMetrics } from '@asap-hub/model';
import {
  aboveAverageIcon,
  averageIcon,
  belowAverageIcon,
  informationInverseIcon,
  happyFaceIcon,
  neutralFaceIcon,
  sadFaceIcon,
} from '../icons';

export const getPerformanceIcon = (
  value: number,
  performanceMetrics: PerformanceMetrics,
) => {
  if (value <= performanceMetrics.belowAverageMax) {
    return belowAverageIcon;
  }

  if (
    value >= performanceMetrics.averageMin &&
    value <= performanceMetrics.averageMax
  ) {
    return averageIcon;
  }

  return aboveAverageIcon;
};

export const getPerformanceText = (
  value: number,
  performanceMetrics: PerformanceMetrics,
) => {
  if (value <= performanceMetrics.belowAverageMax) {
    return 'Below';
  }

  if (
    value >= performanceMetrics.averageMin &&
    value <= performanceMetrics.averageMax
  ) {
    return 'Average';
  }

  return 'Above';
};

export type MoodBands = {
  outstandingMin: number;
  adequateMin: number;
};

export const defaultMoodBands: MoodBands = {
  outstandingMin: 90,
  adequateMin: 80,
};

export const getPerformanceMoodIcon = (
  percentage: number | null,
  isLimitedData: boolean = false,
  { outstandingMin, adequateMin }: MoodBands = defaultMoodBands,
) => {
  if (isLimitedData || percentage === null) {
    return informationInverseIcon;
  }
  if (percentage >= outstandingMin) {
    return happyFaceIcon;
  }
  if (percentage >= adequateMin) {
    return neutralFaceIcon;
  }
  return sadFaceIcon;
};

export const getPerformanceMoodLabel = (
  percentage: number | null,
  isLimitedData: boolean = false,
  { outstandingMin, adequateMin }: MoodBands = defaultMoodBands,
) => {
  if (isLimitedData || percentage === null) {
    return 'There is limited available data to calculate this metric at this time.';
  }
  if (percentage >= outstandingMin) {
    return 'Your team is doing an outstanding job! Keep up the good work!';
  }
  if (percentage >= adequateMin) {
    return 'Your team is doing an adequate job for this metric.';
  }
  return 'We encourage your team to work to improve.';
};
