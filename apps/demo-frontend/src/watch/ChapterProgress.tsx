/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, MouseEvent, useRef } from 'react';

import type { Chapter } from '../api/types';
import { fern, paper, rem, steel } from '../ui/theme';

const barStyles = css({
  position: 'relative',
  display: 'flex',
  gap: rem(2),
  height: rem(8),
  marginTop: rem(8),
  cursor: 'pointer',
});

const segmentStyles = css({
  position: 'relative',
  height: '100%',
  backgroundColor: steel.rgb,
  borderRadius: rem(4),
  overflow: 'hidden',
});

const fillStyles = css({
  position: 'absolute',
  inset: 0,
  transformOrigin: 'left',
  backgroundColor: fern.rgb,
});

const markerStyles = css({
  position: 'absolute',
  top: rem(-2),
  width: rem(2),
  height: rem(12),
  backgroundColor: paper.rgb,
});

type Segment = { start: number; end: number };

export const toSegments = (
  chapters: Chapter[],
  durationSeconds: number,
): Segment[] => {
  if (durationSeconds <= 0) return [{ start: 0, end: 1 }];
  const boundaries = [
    0,
    ...chapters
      .map(({ startMs }) => startMs / 1000)
      .filter((start) => start > 0 && start < durationSeconds),
  ].sort((a, b) => a - b);

  return boundaries.map((start, index) => ({
    start,
    end: boundaries[index + 1] ?? durationSeconds,
  }));
};

const ChapterProgress: FC<{
  readonly chapters: Chapter[];
  readonly durationSeconds: number;
  readonly currentSeconds: number;
  readonly onSeek: (seconds: number) => void;
  readonly onPreview: (
    preview: { seconds: number; left: number } | null,
  ) => void;
}> = ({ chapters, durationSeconds, currentSeconds, onSeek, onPreview }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const segments = toSegments(chapters, durationSeconds);

  const secondsAt = (event: MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar || durationSeconds <= 0) return null;
    const bounds = bar.getBoundingClientRect();
    if (bounds.width === 0) return null;
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width),
    );
    return { seconds: ratio * durationSeconds, left: ratio * bounds.width };
  };

  return (
    <div
      ref={barRef}
      css={barStyles}
      role="presentation"
      onMouseMove={(event) => onPreview(secondsAt(event))}
      onMouseLeave={() => onPreview(null)}
      onClick={(event) => {
        const position = secondsAt(event);
        if (position) onSeek(position.seconds);
      }}
    >
      {segments.map((segment, index) => {
        const span = segment.end - segment.start;
        const progress =
          span <= 0
            ? 0
            : Math.min(1, Math.max(0, (currentSeconds - segment.start) / span));
        return (
          <div
            key={`${index}-${segment.start}`}
            css={segmentStyles}
            style={{ flexGrow: span }}
          >
            <div
              css={fillStyles}
              style={{ transform: `scaleX(${progress})` }}
            />
            {index > 0 && <div css={markerStyles} style={{ left: 0 }} />}
          </div>
        );
      })}
    </div>
  );
};

export default ChapterProgress;
