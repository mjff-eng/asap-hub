/** @jsxImportSource @emotion/react */
import { colour } from '../colors';
import { rem } from '../pixels';
import { clampPercentage } from '../utils';

import { findingsGradient } from './findingsGradient';

type AttendanceProgressBarProps = {
  percentage: number;
  label?: string;
};

const AttendanceProgressBar: React.FC<AttendanceProgressBarProps> = ({
  percentage,
  label,
}) => {
  const value = clampPercentage(percentage);
  return (
    <div
      css={{
        width: '100%',
        height: rem(24),
        borderRadius: rem(999),
        backgroundColor: colour.neutral[100],
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
          borderRadius: rem(999),
          background: findingsGradient,
          // The ramp spans the whole track and the fill reveals only the
          // 0→value slice, so the tip colour tracks attendance: purple low,
          // blue mid, green once most of the group turned up.
          backgroundSize: `${value > 0 ? 10000 / value : 100}% 100%`,
          backgroundRepeat: 'no-repeat',
        }}
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

export default AttendanceProgressBar;
