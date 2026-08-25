import { css } from '@emotion/react';

import AttendanceProgressBar from '../atoms/AttendanceProgressBar';
import { neutral200, neutral1000, neutral500 } from '../colors';
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
  // A ratio, not `rem`: line-height in `em` resolves against the element's own
  // font size, so `rem(40)` here would render 40/17 x 30px.
  lineHeight: 40 / 30,
  color: neutral1000.rgb,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    fontFamily: 'inherit',
    fontSize: rem(21),
    lineHeight: 32 / 21,
  },
});

const dividerStyles = css({
  width: rem(1),
  height: rem(24),
  flexShrink: 0,
  backgroundColor: neutral500.rgb,
});

const captionStyles = css({
  margin: 0,
  fontSize: rem(14),
  lineHeight: 16 / 14,
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
