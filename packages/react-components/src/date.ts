import { useState } from 'react';
import { parseISO } from 'date-fns';
import { format, utcToZonedTime } from 'date-fns-tz';

import { getLocalTimezone } from './localization';
import { useInterval } from './hooks';

export const formatDate = (date: Date): string => format(date, 'do MMMM yyyy');
export const formatDateAndWeekday = (date: Date): string =>
  format(date, 'EEE, do MMMM yyyy');

export const formatDateAndTime = (date: Date): string =>
  format(date, "d/M/y 'at' HH:mm");

export const formatDateToTimezone = (
  date: string,
  form: string,
  tz = getLocalTimezone(),
): string => {
  const zonedDate = utcToZonedTime(date, tz);
  return format(zonedDate, form, { timeZone: tz });
};

// Format date string to MMM YYYY format for project dates
export const formatProjectDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString.slice(0, 10)), 'MMM yyyy');
  } catch {
    return dateString; // Return original if parsing fails
  }
};

const UPDATE_INTERVAL_SECONDS = 10;
export const useDateHasPassed = (date: string | Date): boolean => {
  const [hasPassed, setPassed] = useState(new Date() > new Date(date));

  useInterval(() => {
    setPassed(new Date() > new Date(date));
  }, UPDATE_INTERVAL_SECONDS * 1000);

  return hasPassed;
};
