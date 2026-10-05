import { css } from '@emotion/react';
import { EventResponse } from '@asap-hub/model';

import { formatDateToTimezone } from '../date';
import { info100, info500, lead, silver } from '../colors';
import { rem } from '../pixels';
import { calendarIcon, clockIcon, CircleInfoIcon } from '../icons';
import { pillStyles } from '../pill';
import {
  eventCrossesCalendarDay,
  getEventDurationMs,
  getMultiDayCount,
  getMultiDayDateRange,
  ONE_DAY_IN_MS,
  pluralize,
} from '../utils';

import { Info } from '.';

const listStyles = css({
  display: 'flex',
  flexDirection: 'column',
  gap: rem(16),
  margin: 0,
  padding: 0,
});

const rowStyles = css({
  color: lead.rgb,
  overflow: 'hidden',
  lineHeight: rem(32),
});

const rowIconStyles = css({
  float: 'left',
  marginRight: rem(8),
  marginTop: rem(4),
  lineHeight: 0,
});

const gapStyles = css({
  wordSpacing: rem(8),
});

const dayAbbreviationStyles = css({
  fontWeight: 'bold',
});

const infoTriggerStyles = css({
  button: {
    verticalAlign: 'middle',
  },
});

const recurringPillStyles = css([
  pillStyles,
  {
    backgroundColor: info100.rgb,
    color: info500.rgb,
  },
]);

const dayCountPillStyles = css([
  pillStyles,
  {
    backgroundColor: silver.rgb,
    color: lead.rgb,
  },
]);

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
  const crossesDay = eventCrossesCalendarDay(startDate, endDate);
  const isMultiDay = getEventDurationMs(startDate, endDate) >= ONE_DAY_IN_MS;
  const dayCount = getMultiDayCount(startDate, endDate);

  const dateDisplay = crossesDay
    ? getMultiDayDateRange(startDate, endDate)
    : formatDateToTimezone(startDate, 'EEEE, d MMMM yyyy');

  const startTime = formatDateToTimezone(startDate, 'h:mm a');
  const endTime = formatDateToTimezone(endDate, 'h:mm a');
  const endTz = formatDateToTimezone(endDate, '(z)').toUpperCase();
  const startDayAbbreviation = formatDateToTimezone(startDate, 'EEE');
  const endDayAbbreviation = formatDateToTimezone(endDate, 'EEE');

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

  return (
    <ul css={listStyles}>
      <li css={rowStyles}>
        <div css={rowIconStyles}>{calendarIcon}</div>
        {dateDisplay}
        {isMultiDay && (
          <>
            <span css={gapStyles}> </span>
            <span css={dayCountPillStyles}>{pluralize(dayCount, 'day')}</span>
          </>
        )}
        {recurring && (
          <>
            <span css={gapStyles}> </span>
            <span css={recurringPillStyles}>Recurring</span>
          </>
        )}
      </li>
      <li css={rowStyles}>
        <div css={rowIconStyles}>{clockIcon}</div>
        {startTime}
        {crossesDay && (
          <>
            {' '}
            <span css={dayAbbreviationStyles}>{startDayAbbreviation}</span>
          </>
        )}
        {' – '}
        {endTime}
        {crossesDay && (
          <>
            {' '}
            <span css={dayAbbreviationStyles}>{endDayAbbreviation}</span>
          </>
        )}{' '}
        {endTz}
        <span css={gapStyles}> </span>
        <span css={infoTriggerStyles}>
          <Info floating icon={<CircleInfoIcon size={20} />}>
            The meeting is at{' '}
            {formatDateToTimezone(startDate, 'h:mm a', startDateTimeZone)}
            {formattedStartDateTimeZone !== formattedEndDateTimeZone &&
              formattedStartDateTimeZone}
            {' - '}
            {formatDateToTimezone(endDate, 'h:mm a', endDateTimeZone)}
            {formattedEndDateTimeZone}. It is converted to your time zone for
            your convenience.
          </Info>
        </span>
      </li>
    </ul>
  );
};

export default EventTime;
