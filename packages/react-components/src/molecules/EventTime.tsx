import { css } from '@emotion/react';
import { EventResponse } from '@asap-hub/model';
import { differenceInCalendarDays } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

import { formatDateToTimezone } from '../date';
import { getLocalTimezone } from '../localization';
import { info100, info500, lead, silver } from '../colors';
import { rem } from '../pixels';
import { calendarIcon, clockIcon } from '../icons';

import { Info } from '.';

const listStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  margin: 0,
  padding: 0,
});

const listItemStyles = css({
  color: lead.rgb,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
});

const iconStyles = css({
  paddingRight: rem(8),
  lineHeight: 0,
  height: 'fit-content',
});

const dateStyles = css({
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
});

const tzStyles = css({
  paddingLeft: rem(8),
});

const recurringPillStyles = css({
  flexShrink: 0,
  marginLeft: rem(8),

  backgroundColor: info100.rgb,
  color: info500.rgb,
  borderRadius: rem(36),
  padding: `${rem(4)} ${rem(16)}`,
});

const dayCountPillStyles = css({
  flexShrink: 0,

  backgroundColor: silver.rgb,
  color: lead.rgb,
  fontWeight: 'bold',
  borderRadius: rem(12),
  padding: `${rem(4)} ${rem(8)}`,
});

const multiDayItemStyles = css({
  flexWrap: 'wrap',
  rowGap: rem(8),
  columnGap: rem(8),
});

const multiDayDateGroupStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  minWidth: 0,
});

const multiDayDateStyles = css({
  whiteSpace: 'normal',
});

const multiDayPillsGroupStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(8),
});

const noMarginPillStyles = css({
  marginLeft: 0,
});

type EventTimeProps = Pick<
  EventResponse,
  | 'startDate'
  | 'startDateTimeZone'
  | 'endDate'
  | 'endDateTimeZone'
  | 'recurring'
>;
const EventTime: React.FC<EventTimeProps> = ({
  startDate,
  startDateTimeZone,
  endDate,
  endDateTimeZone,
  recurring,
}) => {
  const formattedStartDay = formatDateToTimezone(
    startDate,
    'E, d MMM y',
  ).toUpperCase();
  const formattedEndDay = formatDateToTimezone(
    endDate,
    'E, d MMM y',
  ).toUpperCase();
  const multiDay = formattedStartDay !== formattedEndDay;

  const formattedStartDateTimeZone = formatDateToTimezone(
    startDate,
    ' z (zzzz)',
    startDateTimeZone,
  );
  const formattedEndDateTimeZone = formatDateToTimezone(
    endDate,
    ' z (zzzz)',
    endDateTimeZone,
  );

  if (multiDay) {
    const localTimezone = getLocalTimezone();
    const dayCount =
      differenceInCalendarDays(
        utcToZonedTime(endDate, localTimezone),
        utcToZonedTime(startDate, localTimezone),
      ) + 1;

    const startYear = formatDateToTimezone(startDate, 'yyyy');
    const endYear = formatDateToTimezone(endDate, 'yyyy');
    const startMonth = formatDateToTimezone(startDate, 'MMMM');
    const endMonth = formatDateToTimezone(endDate, 'MMMM');

    const startRangeFormat =
      startYear !== endYear
        ? 'EEEE d MMMM yyyy'
        : startMonth !== endMonth
          ? 'EEEE d MMMM'
          : 'EEEE d';

    const dateRange = `${formatDateToTimezone(
      startDate,
      startRangeFormat,
    )} - ${formatDateToTimezone(endDate, 'EEEE d MMMM yyyy')}`;

    return (
      <ul css={listStyles}>
        <li css={[listItemStyles, multiDayItemStyles]}>
          <div css={multiDayDateGroupStyles}>
            <div css={iconStyles}>{calendarIcon}</div>
            <span css={multiDayDateStyles}>{dateRange}</span>
          </div>
          <div css={multiDayPillsGroupStyles}>
            <span css={dayCountPillStyles}>{dayCount} days</span>
            {recurring && (
              <span css={[recurringPillStyles, noMarginPillStyles]}>
                Recurring
              </span>
            )}
          </div>
        </li>
      </ul>
    );
  }

  return (
    <ul css={listStyles}>
      <li css={listItemStyles}>
        <div css={iconStyles}>{calendarIcon}</div>
        <span css={dateStyles}>{formattedStartDay}</span>
        {recurring && <span css={recurringPillStyles}>Recurring</span>}
      </li>
      <li css={listItemStyles}>
        <div css={iconStyles}>{clockIcon}</div>
        {formatDateToTimezone(startDate, 'h:mm a')} -{' '}
        {formatDateToTimezone(endDate, 'h:mm a (z)').toUpperCase()}
        <div css={tzStyles}>
          <Info>
            The meeting is at{' '}
            {formatDateToTimezone(startDate, 'h:mm a', startDateTimeZone)}
            {formattedStartDateTimeZone !== formattedEndDateTimeZone &&
              formattedStartDateTimeZone}
            {' - '}
            {formatDateToTimezone(endDate, 'h:mm a', endDateTimeZone)}
            {formattedEndDateTimeZone}. It is converted to your time zone for
            your convenience.
          </Info>
        </div>
      </li>
    </ul>
  );
};

export default EventTime;
