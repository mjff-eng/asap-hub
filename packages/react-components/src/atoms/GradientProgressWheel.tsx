/** @jsxImportSource @emotion/react */
import { colour } from '../colors';
import { rem } from '../pixels';
import { clampPercentage } from '../utils';

import { findingsConicRamp } from './findingsGradient';

const WHEEL_SIZE = 74;
const WHEEL_STROKE = 9;
// Sub-pixel offset between paired colour stops so hard gradient edges get a
// tiny blur band and antialias instead of showing a jagged spoke/ring.
// https://codepen.io/mandymichael/pen/oNNdKzW
const EDGE_BLUR = 0.6;

const wheelRingMask = `radial-gradient(farthest-side, transparent calc(100% - ${rem(
  WHEEL_STROKE,
)}), black calc(100% - ${rem(WHEEL_STROKE)} + ${EDGE_BLUR}px))`;

const WHEEL_MID_RADIUS = (WHEEL_SIZE - WHEEL_STROKE) / 2;

// The same conic clipped to a dot at a ring fraction, so the cap colour matches.
const capStyles = (fraction: number) => {
  const angle = fraction * 2 * Math.PI;
  const x = WHEEL_SIZE / 2 + WHEEL_MID_RADIUS * Math.sin(angle);
  const y = WHEEL_SIZE / 2 - WHEEL_MID_RADIUS * Math.cos(angle);
  return {
    position: 'absolute' as const,
    inset: 0,
    background: findingsConicRamp,
    clipPath: `circle(${rem(WHEEL_STROKE / 2)} at ${rem(x)} ${rem(y)})`,
  };
};

type GradientProgressWheelProps = {
  percentage: number;
  label?: string;
};

const GradientProgressWheel: React.FC<GradientProgressWheelProps> = ({
  percentage,
  label,
}) => {
  const value = clampPercentage(percentage);
  const arcMask = `conic-gradient(from 0deg, black 0 ${value}%, transparent ${
    value + EDGE_BLUR
  }% 100%)`;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      css={{
        position: 'relative',
        width: rem(WHEEL_SIZE),
        height: rem(WHEEL_SIZE),
        // Ring shape applied once here so the grey track and the coloured arc
        // underneath are both clipped to the same band.
        WebkitMaskImage: wheelRingMask,
        maskImage: wheelRingMask,
      }}
    >
      {/* Continuous grey track so the unfilled part reads as a full round ring
          and there is no colour at all at 0%. */}
      <div
        css={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: colour.neutral[100],
        }}
      />
      {value > 0 && (
        <>
          <div
            css={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: findingsConicRamp,
              WebkitMaskImage: arcMask,
              maskImage: arcMask,
            }}
          />
          <div css={capStyles(0)} />
          <div css={capStyles(value / 100)} />
        </>
      )}
    </div>
  );
};

export default GradientProgressWheel;
