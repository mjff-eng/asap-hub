import { css } from '@emotion/react';

import {
  fern,
  info500,
  iris,
  neutral200,
  neutral900,
  neutral1000,
  steel,
} from '../colors';
import { mobileScreen, rem } from '../pixels';

// Mirrors EventAttendanceMetric so the two metric tiles stay visually identical;
// only the labels and the block under the headline differ. Once ASAP-1675 lands,
// the tiles can collapse onto that molecule and AttendanceProgressBar.
export const tileStyles = css({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  // The grid stretches both tiles to the taller one.
  justifyContent: 'center',
  gap: rem(12),
  width: '100%',
  padding: rem(24),
  backgroundColor: neutral200.rgb,
  borderRadius: rem(8),
});

export const tileHeaderStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: rem(12),
});

export const tileValueStyles = css({
  margin: 0,
  fontFamily: 'Roboto Slab',
  fontWeight: 'bold',
  fontSize: rem(30),
  // A ratio, not `rem`: line-height in `em` resolves against the element's own
  // font size.
  lineHeight: 40 / 30,
  color: neutral1000.rgb,
  [`@media (max-width: ${mobileScreen.max}px)`]: {
    fontFamily: 'inherit',
    fontSize: rem(21),
    lineHeight: 32 / 21,
  },
});

export const tileRuleStyles = css({
  width: rem(1),
  height: rem(24),
  flexShrink: 0,
  backgroundColor: steel.rgb,
});

export const tileCaptionStyles = css({
  margin: 0,
  fontSize: rem(14),
  lineHeight: 16 / 14,
  color: neutral1000.rgb,
});

export const tileCaptionCountStyles = css([
  tileCaptionStyles,
  { fontWeight: 'bold' },
]);

export const tileDividerStyles = css({
  alignSelf: 'stretch',
  height: rem(1),
  border: 0,
  margin: 0,
  backgroundColor: steel.rgb,
});

// Alternating in DOM order keeps each number announced with its own label.
export const tileBreakdownStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  columnGap: rem(8),
  rowGap: 0,
  color: neutral900.rgb,
  '> p': { margin: 0, fontSize: rem(14), lineHeight: 16 / 14 },
});

export const tileBreakdownValueStyles = css({ textAlign: 'right' });

export const tileBarTrackStyles = css({
  width: '100%',
  height: rem(24),
  borderRadius: rem(999),
  backgroundColor: steel.rgb,
  overflow: 'hidden',
});

export const tileBarFillStyles = css({
  height: '100%',
  borderRadius: rem(999),
  background: `linear-gradient(90deg, ${iris.hex} 0%, ${info500.hex} 48.44%, ${fern.hex} 100%)`,
});
