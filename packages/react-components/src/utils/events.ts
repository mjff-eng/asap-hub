import {
  EVENT_CONSIDERED_IN_PROGRESS_MINUTES_BEFORE_EVENT,
  EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT,
} from '@asap-hub/model';
import { parseISO, addHours, subMinutes } from 'date-fns';

import { formatDateToTimezone, useDateHasPassed } from '../date';

export function considerEndedAfter(endDate: string): Date {
  return addHours(parseISO(endDate), EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT);
}

export const useEventLiveStatus = (
  startDate: string,
  endDate: string,
  enabled = true,
): { hasStarted: boolean; hasFinished: boolean } => {
  const considerStartedAfter = subMinutes(
    parseISO(startDate),
    EVENT_CONSIDERED_IN_PROGRESS_MINUTES_BEFORE_EVENT,
  );

  const hasStarted = useDateHasPassed(considerStartedAfter, enabled);
  const hasFinished = useDateHasPassed(considerEndedAfter(endDate), enabled);

  return { hasStarted, hasFinished };
};

export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

export const getEventDurationMs = (
  startDate: string,
  endDate: string,
): number => new Date(endDate).getTime() - new Date(startDate).getTime();

// Rounded up, eg: a 26-hour event reads as 2 days".
export const getMultiDayCount = (startDate: string, endDate: string): number =>
  Math.ceil(getEventDurationMs(startDate, endDate) / ONE_DAY_IN_MS);

// An end time of exactly midnight is treated as still belonging to the start
// day (e.g. "10:00 PM - 12:00 AM" reads fine without a date range); anything
// past midnight counts as crossing into a new day.
export const eventCrossesCalendarDay = (
  startDate: string,
  endDate: string,
): boolean => {
  const endsExactlyAtMidnight =
    formatDateToTimezone(endDate, 'HH:mm') === '00:00';
  const comparisonEndDate = endsExactlyAtMidnight
    ? new Date(new Date(endDate).getTime() - 1).toISOString()
    : endDate;

  return (
    formatDateToTimezone(startDate, 'yyyy-MM-dd') !==
    formatDateToTimezone(comparisonEndDate, 'yyyy-MM-dd')
  );
};

export const getMultiDayDateRange = (
  startDate: string,
  endDate: string,
): string => {
  const startYear = formatDateToTimezone(startDate, 'yyyy');
  const endYear = formatDateToTimezone(endDate, 'yyyy');
  const startMonth = formatDateToTimezone(startDate, 'MMMM');
  const endMonth = formatDateToTimezone(endDate, 'MMMM');

  const startFormat =
    startYear !== endYear
      ? 'EEEE d MMMM yyyy'
      : startMonth !== endMonth
        ? 'EEEE d MMMM'
        : 'EEEE d';

  return `${formatDateToTimezone(
    startDate,
    startFormat,
  )} – ${formatDateToTimezone(endDate, 'EEEE d MMMM yyyy')}`;
};

export const pluralize = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

export const pluralizeTeams = (count: number, capitalized = false): string =>
  pluralize(count, capitalized ? 'Team' : 'team');
