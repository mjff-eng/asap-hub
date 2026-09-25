import { css } from '@emotion/react';
import { EventResponse } from '@asap-hub/model';

import { formatDateToTimezone } from '../date';
import { getLocalTimezone } from '../localization';
import { info100, info500, lead, silver } from '../colors';
import { rem } from '../pixels';
import { calendarIcon, clockIcon } from '../icons';
import { getMultiDayCount, getMultiDayDateRange } from '../utils';

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
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  marginLeft: rem(8),
  verticalAlign: 'middle',

  backgroundColor: info100.rgb,
  color: info500.rgb,
  borderRadius: rem(36),
  padding: `${rem(4)} ${rem(16)}`,
});

const dayCountPillStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  verticalAlign: 'middle',

  backgroundColor: silver.rgb,
  color: lead.rgb,
  fontWeight: 'bold',
  borderRadius: rem(12),
  padding: `${rem(4)} ${rem(8)}`,
});

const multiDayRowStyles = css({
  color: lead.rgb,
  overflow: 'hidden',
  lineHeight: rem(32),
});

const multiDayIconStyles = css({
  float: 'left',
  marginRight: rem(8),
  marginTop: rem(4),
  lineHeight: 0,
});

const multiDayGapStyles = css({
  wordSpacing: rem(8),
});

const multiDayRecurringPillStyles = css({
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
    'EEEE, d MMMM yyyy',
  );
  const formattedEndDay = formatDateToTimezone(endDate, 'EEEE, d MMMM yyyy');
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
    const dayCount = getMultiDayCount(startDate, endDate, getLocalTimezone());
    const dateRange = getMultiDayDateRange(startDate, endDate);

    return (
      <ul css={listStyles}>
        <li css={multiDayRowStyles}>
          <div css={multiDayIconStyles}>{calendarIcon}</div>
          {dateRange}
          <span css={multiDayGapStyles}> </span>
          <span css={dayCountPillStyles}>{dayCount} days</span>
          {recurring && (
            <>
              <span css={multiDayGapStyles}> </span>
              <span css={[recurringPillStyles, multiDayRecurringPillStyles]}>
                Recurring
              </span>
            </>
          )}
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
