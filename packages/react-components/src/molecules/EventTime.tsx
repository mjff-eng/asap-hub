import { css } from '@emotion/react';
import { EventResponse } from '@asap-hub/model';

import { formatDateToTimezone } from '../date';
import { info100, info500, neutral900 } from '../colors';
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
  color: neutral900.rgb,
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
      <li css={listItemStyles}>
        <div css={iconStyles}>{calendarIcon}</div>
        <span css={dateStyles}>{formattedStartDay}</span>
        {recurring && <span css={recurringPillStyles}>Recurring</span>}
      </li>
      <li css={listItemStyles}>
        <div css={iconStyles}>{clockIcon}</div>
        {formatDateToTimezone(startDate, 'h:mm a')} -{' '}
        {formatDateToTimezone(endDate, 'h:mm a (z)').toUpperCase()}
        {formattedEndDay !== formattedStartDay && ` - ${formattedEndDay} ∙ `}
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
