import { css } from '@emotion/react';
import { lineHeight, rem } from '../pixels';
import { colour } from '../colors';
import { noop } from '../utils';

const styles = css({
  display: 'grid',
  gridTemplateColumns: '1fr 20px 1fr',
  height: rem(54),

  minWidth: rem(240),
  borderRadius: '27px',
  backgroundColor: colour.background.tertiary,
  color: colour.foreground.disabled,
  cursor: 'pointer',
  svg: {
    stroke: colour.foreground.disabled,
  },
});

const buttonStyle = css({
  borderRadius: '27px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
});

const iconStyles = css({
  display: 'inline-block',
  width: rem(lineHeight),
  height: rem(lineHeight),
  paddingRight: rem(6),
});
const activeStyles = css({
  backgroundColor: colour.neutral[0],
  border: `1px solid ${colour.border.tertiary}`,
  color: colour.foreground.primary,
  svg: {
    stroke: colour.foreground.tertiary,
  },
});
const buttonRight = css({
  gridColumn: '2 / span 2',
  gridRow: 1,
});
const buttonLeft = css({
  gridColumn: '1 / span 2',
  gridRow: 1,
});

interface ToggleProps {
  position?: 'left' | 'right';
  leftButtonText: string;
  leftButtonIcon: React.ReactElement<SVGElement>;
  rightButtonText: string;
  rightButtonIcon: React.ReactElement<SVGElement>;
  onChange?: () => void;
}

const Toggle: React.FC<ToggleProps> = ({
  position = 'left',
  leftButtonIcon,
  leftButtonText,
  rightButtonIcon,
  rightButtonText,
  onChange = noop,
}) => (
  <div css={styles} onClick={onChange} role="radiogroup">
    <div
      css={[buttonStyle, buttonLeft, position === 'left' && activeStyles]}
      role="radio"
      aria-checked={position === 'left'}
    >
      <span css={iconStyles}>{leftButtonIcon}</span>
      {leftButtonText}
    </div>
    <div
      css={[buttonStyle, buttonRight, position === 'right' && activeStyles]}
      role="radio"
      aria-checked={position === 'right'}
    >
      <span css={iconStyles}>{rightButtonIcon}</span>
      {rightButtonText}
    </div>
  </div>
);

export default Toggle;
