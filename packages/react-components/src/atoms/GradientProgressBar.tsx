/** @jsxImportSource @emotion/react */
import { neutral500 } from '../colors';
import { rem } from '../pixels';
import { clampPercentage } from '../utils';

import { findingsGradient } from './findingsGradient';

type GradientProgressBarProps = {
  percentage: number;
  label?: string;
};

const GradientProgressBar: React.FC<GradientProgressBarProps> = ({
  percentage,
  label,
}) => {
  const value = clampPercentage(percentage);
  return (
    <div
      css={{
        width: '100%',
        height: rem(8),
        borderRadius: rem(4),
        backgroundColor: neutral500.rgb,
        overflow: 'hidden',
      }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        css={{
          height: '100%',
          borderRadius: rem(4),
          background: findingsGradient,
          // Reveal only the 0→value slice so the tip colour tracks the value.
          backgroundSize: `${value > 0 ? 10000 / value : 100}% 100%`,
          backgroundRepeat: 'no-repeat',
        }}
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

export default GradientProgressBar;
