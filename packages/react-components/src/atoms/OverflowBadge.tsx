import { css } from '@emotion/react';
import { neutral900, colour } from '../colors';
import { rem } from '../pixels';

const badgeStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '24px',
  height: '24px',
  borderRadius: '50%',
  border: `1px solid ${colour.border.tertiary}`,
  backgroundColor: 'transparent',
  fontFamily: 'Roboto, sans-serif',
  fontSize: rem(14),
  fontWeight: 700,
  lineHeight: rem(16),
  letterSpacing: 0,
  color: neutral900.rgb,
  boxSizing: 'border-box',
  verticalAlign: 'middle',
  margin: `0 ${rem(8)}`,
});

type OverflowBadgeProps = {
  readonly count: number;
};

const OverflowBadge: React.FC<OverflowBadgeProps> = ({ count }) => (
  <span css={badgeStyles}>+{count}</span>
);

export default OverflowBadge;
