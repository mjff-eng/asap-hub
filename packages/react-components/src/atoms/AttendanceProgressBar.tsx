/** @jsxImportSource @emotion/react */
import { fern, info500, iris, steel } from '../colors';
import { rem } from '../pixels';
import { clampPercentage } from '../utils';

// Self-contained so the attendance surface can be removed by deleting its own
// files: the ramp, unlike findingsGradient, maps onto the filled portion, so the
// bar runs purple → blue → green at every value.
const attendanceGradient = `linear-gradient(90deg, ${iris.hex} 0%, ${info500.hex} 48.44%, ${fern.hex} 100%)`;

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
        backgroundColor: steel.rgb,
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
          background: attendanceGradient,
        }}
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

export default AttendanceProgressBar;
