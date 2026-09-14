import { css } from '@emotion/react';

import AttendanceProgressBar from '../atoms/AttendanceProgressBar';
import { neutral200, neutral1000, steel } from '../colors';
import { mobileScreen, rem } from '../pixels';

const containerStyles = css({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: rem(12),
  width: '100%',
  maxWidth: rem(380),
  padding: rem(24),
  backgroundColor: neutral200.rgb,
  borderRadius: rem(8),
});

const headlineRowStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(12),
});

const valueStyles = css({
  margin: 0,
  fontFamily: 'Roboto Slab',
  fontWeight: 'bold',
  fontSize: rem(30),
  lineHeight: rem(40),
  color: neutral1000.rgb,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    fontFamily: 'inherit',
    fontSize: rem(21),
    lineHeight: rem(32),
  },
});

const dividerStyles = css({
  width: rem(1),
  height: rem(24),
  flexShrink: 0,
  backgroundColor: steel.rgb,
});

const captionStyles = css({
  margin: 0,
  fontSize: rem(14),
  lineHeight: rem(16),
  color: neutral1000.rgb,
});

const captionCountStyles = css([captionStyles, { fontWeight: 'bold' }]);

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
