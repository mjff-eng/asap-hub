import { css } from '@emotion/react';

import AttendanceProgressBar from '../atoms/AttendanceProgressBar';
import { colour } from '../colors';
import { mobileScreen, rem } from '../pixels';

export const containerStyles = css({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: rem(16),
  width: '100%',
  maxWidth: rem(380),
  padding: rem(24),
  backgroundColor: colour.neutral[50],
  borderRadius: rem(8),
});

export const headlineRowStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(12),
});

export const valueStyles = css({
  margin: 0,
  fontWeight: 'bold',
  fontSize: rem(32),
  // A ratio, not `rem`: line-height in `em` resolves against the element's own
  // font size, so `rem(40)` here would render 40/16 x 32px.
  lineHeight: 40 / 32,
  color: colour.foreground.primary,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    fontSize: rem(24),
    lineHeight: 32 / 24,
  },
});

const dividerStyles = css({
  width: rem(1),
  height: rem(24),
  flexShrink: 0,
  backgroundColor: colour.neutral[100],
});

const captionStyles = css({
  margin: 0,
  fontSize: rem(20),
  fontWeight: 'bold',
  lineHeight: 28 / 20,
  color: colour.foreground.primary,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    fontSize: rem(14),
    fontWeight: 600,
    lineHeight: 16 / 14,
  },
});

export const captionCountStyles = captionStyles;

type EventAttendanceMetricProps = {
  value: number;
  caption: string;
  captionDetail: string;
  label?: string;
};

const EventAttendanceMetric: React.FC<EventAttendanceMetricProps> = ({
  value,
  caption,
  captionDetail,
  label,
}) => (
  <div css={containerStyles}>
    <div css={headlineRowStyles}>
      <p css={valueStyles}>{value}%</p>
      <span css={dividerStyles} />
      <div>
        <p css={captionCountStyles}>{caption}</p>
        <p css={captionStyles}>{captionDetail}</p>
      </div>
    </div>
    <AttendanceProgressBar percentage={value} label={label} />
  </div>
);

export default EventAttendanceMetric;
