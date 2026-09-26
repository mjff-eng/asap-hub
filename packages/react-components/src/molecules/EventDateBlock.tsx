import { css } from '@emotion/react';

import { formatDateToTimezone } from '../date';
import { colour } from '../colors';
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

  backgroundColor: colour.background.primary,
  borderStyle: 'solid',
  borderWidth: 1,
  borderColor: colour.border.tertiary,
  borderRadius: rem(8),
});

const monthStyles = css({
  display: 'block',
  padding: `${rem(8)} 0`,

  backgroundColor: colour.background.brand,
  color: colour.foreground.primary,

  fontSize: rem(17),
  fontWeight: 'bold',
  lineHeight: rem(24),
  letterSpacing: rem(0.1),
});

const dayStyles = css({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  color: colour.foreground.primary,

  fontSize: rem(30),
  fontWeight: 'bold',
  lineHeight: 1,
});

type EventDateBlockProps = {
  startDate: string;
};

const EventDateBlock: React.FC<EventDateBlockProps> = ({ startDate }) => (
  <div css={containerStyles}>
    <span css={monthStyles}>
      {formatDateToTimezone(startDate, 'MMM').toUpperCase()}
    </span>
    <span css={dayStyles}>{formatDateToTimezone(startDate, 'd')}</span>
  </div>
);

export default EventDateBlock;
