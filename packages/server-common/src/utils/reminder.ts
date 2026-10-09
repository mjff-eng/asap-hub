import { DateTime } from 'luxon';

export const getReferenceDates = (zone: string) => {
  const lastMidnightISO = DateTime.fromObject({
    zone,
  })
    .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    .toUTC();

  const todayMidnightISO = DateTime.fromObject({
    zone,
  })
    .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    .plus({ day: 1 })
    .toUTC();

  const last24HoursISO = DateTime.fromObject({
    zone,
  })
    .minus({ hours: 24 })
    .toUTC();

  const last7DaysISO = DateTime.fromObject({
    zone,
  })
    .minus({ days: 7 })
    .toUTC();

  const now = DateTime.fromObject({
    zone,
  }).toUTC();

  return {
    lastMidnightISO,
    todayMidnightISO,
    last24HoursISO,
    last7DaysISO,
    now,
  };
};

export const convertDate = (date: string, zone: string) =>
  DateTime.fromISO(date, { zone }).toUTC();

export const inLast24Hours = (date: string, zone: string) => {
  const convertedDate = convertDate(date, zone);
  const { last24HoursISO, now } = getReferenceDates(zone);

  return convertedDate >= last24HoursISO && convertedDate <= now;
};

export const inLast7Days = (date: string, zone: string) => {
  const convertedDate = convertDate(date, zone);
  const { last7DaysISO, now } = getReferenceDates(zone);

  return convertedDate >= last7DaysISO && convertedDate <= now;
};

export const filterUndefined = (arr: (string | undefined)[]): string[] =>
  arr.filter((value) => value !== undefined) as string[];

export const getUserName = <
  T extends
    | {
        createdBy?: {
          firstName?: string | null;
          lastName?: string | null;
        } | null;
      }
    | null
    | undefined,
>(
  researchOutput: T,
) => {
  if (
    researchOutput &&
    researchOutput.createdBy &&
    researchOutput.createdBy.firstName &&
    researchOutput.createdBy.lastName
  ) {
    const { firstName, lastName } = researchOutput.createdBy;
    return `${firstName} ${lastName}`;
  }
  return null;
};

export const capitalizeFirstLetter = (str: string) =>
  str.slice(0, 1).toUpperCase() + str.slice(1);
