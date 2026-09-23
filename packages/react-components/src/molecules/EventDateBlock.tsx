import { css } from '@emotion/react';

import { formatDateToTimezone } from '../date';
import { charcoal, mint, paper, silver, steel } from '../colors';
import { rem } from '../pixels';

const containerStyles = css({
  flexShrink: 0,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  width: rem(96),
  height: rem(96),
  overflow: 'hidden',

  textAlign: 'center',

  backgroundColor: paper.rgb,
  borderStyle: 'solid',
  borderWidth: 1,
  borderColor: steel.rgb,
  borderRadius: rem(8),
});

const monthStyles = css({
  display: 'block',
  padding: `${rem(8)} 0`,

  backgroundColor: mint.rgb,
  color: charcoal.rgb,

  fontSize: rem(17),
  fontWeight: 'bold',
  lineHeight: rem(24),
  letterSpacing: rem(0.1),
});

const mutedMonthStyles = css({
  backgroundColor: silver.rgb,
});

const dayStyles = css({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  color: charcoal.rgb,

  fontSize: rem(30),
  fontWeight: 'bold',
  lineHeight: 1,
});

type EventDateBlockProps = {
  startDate: string;
  muted?: boolean;
};

const EventDateBlock: React.FC<EventDateBlockProps> = ({
  startDate,
  muted = false,
}) => (
  <div css={containerStyles}>
    <span css={[monthStyles, muted && mutedMonthStyles]}>
      {formatDateToTimezone(startDate, 'MMM').toUpperCase()}
    </span>
    <span css={dayStyles}>{formatDateToTimezone(startDate, 'd')}</span>
  </div>
);

export default EventDateBlock;
