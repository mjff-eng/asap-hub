/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC } from 'react';

import { charcoal, paper, rem, steel } from '../ui/theme';
import { formatDuration } from '../utils/time';
import { cueAt, ThumbnailCue } from '../utils/vtt';

const wrapperStyles = css({
  position: 'absolute',
  pointerEvents: 'none',
  backgroundColor: paper.rgb,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(4),
  padding: rem(4),
  boxShadow: `0px 2px 8px ${steel.rgb}`,
  zIndex: 2,
});

const captionStyles = css({
  textAlign: 'center' as const,
  fontSize: rem(12),
  fontVariantNumeric: 'tabular-nums',
  color: charcoal.rgb,
  paddingTop: rem(4),
});

const anchors = {
  'bottom-center': { bottom: rem(20), transform: 'translateX(-50%)' },
  'top-left': { bottom: '100%', marginBottom: rem(8) },
} as const;

const SpritePreview: FC<{
  readonly spriteUrl: string;
  readonly cues: ThumbnailCue[];
  readonly seconds: number;
  readonly left: number;
  readonly anchor?: keyof typeof anchors;
}> = ({ spriteUrl, cues, seconds, left, anchor = 'bottom-center' }) => {
  const cue = cueAt(cues, seconds);

  return (
    <div
      css={[wrapperStyles, anchors[anchor]]}
      style={{ left }}
      data-testid="sprite-preview"
    >
      {cue && (
        <div
          style={{
            width: cue.width,
            height: cue.height,
            backgroundImage: `url(${spriteUrl})`,
            backgroundPosition: `-${cue.x}px -${cue.y}px`,
          }}
        />
      )}
      <div css={captionStyles}>{formatDuration(seconds * 1000)}</div>
    </div>
  );
};

export default SpritePreview;
