import { EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT } from '@asap-hub/model';
import { parseISO, addHours, differenceInCalendarDays } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

import { formatDateToTimezone } from '../date';

export function considerEndedAfter(endDate: string): Date {
  return addHours(parseISO(endDate), EVENT_CONSIDERED_PAST_HOURS_AFTER_EVENT);
}

export const getMultiDayCount = (
  startDate: string,
  endDate: string,
  timezone: string,
): number =>
  differenceInCalendarDays(
    utcToZonedTime(endDate, timezone),
    utcToZonedTime(startDate, timezone),
  ) + 1;

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
  )} - ${formatDateToTimezone(endDate, 'EEEE d MMMM yyyy')}`;
};

export const pluralize = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

export const pluralizeTeams = (count: number, capitalized = false): string =>
  pluralize(count, capitalized ? 'Team' : 'team');
