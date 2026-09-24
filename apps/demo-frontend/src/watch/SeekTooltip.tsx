/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC } from 'react';

import type { Chapter } from '../api/types';
import { onDark, rem } from '../ui/theme';
import { formatDuration } from '../utils/time';
import { cueAt, ThumbnailCue } from '../utils/vtt';
import { chapterAt, clampTooltip } from './playback';

const wrapperStyles = css({
  position: 'absolute',
  bottom: '100%',
  marginBottom: rem(8),
  transform: 'translateX(-50%)',
  pointerEvents: 'none',
  display: 'grid',
  justifyItems: 'center',
  gap: rem(2),
  zIndex: 3,
});

const frameStyles = css({
  borderRadius: rem(4),
  border: `1px solid rgba(255, 255, 255, 0.25)`,
  overflow: 'hidden',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
});

// the caption is drawn over whatever frame happens to be behind it, so it needs
// a surface of its own rather than a shadow that a bright frame swallows
const captionBackdrop = {
  maxWidth: '100%',
  padding: `${rem(2)} ${rem(8)}`,
  borderRadius: rem(4),
  backgroundColor: 'rgba(0, 0, 0, 0.82)',
} as const;

const titleStyles = css({
  ...captionBackdrop,
  maxWidth: rem(240),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: rem(14),
  fontWeight: 'bold',
  color: onDark.rgb,
});

const timeStyles = css({
  ...captionBackdrop,
  fontSize: rem(13),
  fontVariantNumeric: 'tabular-nums',
  color: onDark.rgb,
});

const TOOLTIP_WIDTH = 168;

const SeekTooltip: FC<{
  readonly spriteUrl: string;
  readonly cues: ThumbnailCue[];
  readonly chapters: Chapter[];
  readonly seconds: number;
  readonly left: number;
  readonly playerWidth: number;
}> = ({ spriteUrl, cues, chapters, seconds, left, playerWidth }) => {
  const cue = cueAt(cues, seconds);
  const chapter =
    chapters.length > 0 ? chapterAt(chapters, seconds) : undefined;
  const width = cue?.width ?? TOOLTIP_WIDTH;

  return (
    <div
      css={wrapperStyles}
      style={{ left: clampTooltip(left, width, playerWidth) }}
      data-testid="seek-tooltip"
    >
      {cue && (
        <div css={frameStyles}>
          <div
            style={{
              width: cue.width,
              height: cue.height,
              backgroundImage: `url(${spriteUrl})`,
              backgroundPosition: `-${cue.x}px -${cue.y}px`,
            }}
          />
        </div>
      )}
      {chapter && <div css={titleStyles}>{chapter.title}</div>}
      <div css={timeStyles}>{formatDuration(seconds * 1000)}</div>
    </div>
  );
};

export default SeekTooltip;
