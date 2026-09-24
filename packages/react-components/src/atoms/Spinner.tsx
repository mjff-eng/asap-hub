import { css, keyframes } from '@emotion/react';
import { colour } from '../colors';
import { rem } from '../pixels';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export type SpinnerProps = {
  readonly size?: number;
  readonly thickness?: number;
  readonly color?: string;
  readonly trackColor?: string;
  readonly arc?: boolean;
  readonly speed?: string;
  readonly ariaLabel?: string;
  readonly ariaBusy?: boolean;
  readonly testId?: string;
  readonly className?: string;
};

const Spinner: React.FC<SpinnerProps> = ({
  size = 24,
  thickness = 3,
  color = colour.neutral[700],
  trackColor = 'transparent',
  arc = false,
  speed = '1s',
  ariaLabel = 'loading',
  ariaBusy,
  testId,
  className,
}) => (
  <div
    role="progressbar"
    aria-label={ariaLabel}
    aria-busy={ariaBusy}
    data-testid={testId}
    className={className}
    css={css({
      boxSizing: 'border-box',
      width: rem(size),
      height: rem(size),
      border: `${rem(thickness)} solid ${trackColor}`,
      borderTopColor: color,
      ...(arc && { borderRightColor: color }),
      borderRadius: '50%',
      animation: `${spin} ${speed} linear infinite`,
    })}
  />
);

export default Spinner;
