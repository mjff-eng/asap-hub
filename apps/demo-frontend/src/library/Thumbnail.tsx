/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, useState } from 'react';

import { onDark, rem } from '../ui/theme';
import { thumbnailUrl } from './state';

const frameStyles = css({
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#12141A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const fallbackStyles = css({
  padding: `0 ${rem(12)}`,
  color: '#E7E9EE',
  fontSize: rem(14),
  fontWeight: 'bold',
  textAlign: 'center',
  lineHeight: 1.3,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
});

const imageStyles = css({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const badgeStyles = css({
  position: 'absolute',
  right: rem(6),
  bottom: rem(6),
  padding: `${rem(2)} ${rem(6)}`,
  borderRadius: rem(4),
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  color: onDark.rgb,
  fontSize: rem(12),
  fontVariantNumeric: 'tabular-nums',
});

/**
 * The listing has no signed media cookies, so the <img> is only revealed once it
 * actually decodes; until then (and forever, if it 403s) the dark creator card shows.
 */
export const Thumbnail: FC<{
  readonly videoId: string;
  readonly mediaPath?: string;
  readonly creatorName: string;
  readonly duration: string;
  // a video with no encoded output has no poster to ask for, and asking anyway
  // fills the console with 404s for every draft in the library
  readonly hasPoster?: boolean;
  readonly radius?: number;
  readonly aspectRatio?: string;
  readonly width?: number;
}> = ({
  videoId,
  mediaPath,
  creatorName,
  duration,
  hasPoster = true,
  radius = 8,
  aspectRatio = '16 / 9',
  width,
}) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      css={[
        frameStyles,
        {
          aspectRatio,
          borderRadius: rem(radius),
          ...(width === undefined ? {} : { width: rem(width), flexShrink: 0 }),
        },
      ]}
    >
      {!loaded && <span css={fallbackStyles}>{creatorName}</span>}
      {hasPoster && (
        <img
          src={thumbnailUrl(videoId, mediaPath)}
          alt=""
          draggable={false}
          css={[imageStyles, { opacity: loaded ? 1 : 0 }]}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      )}
      {duration ? <span css={badgeStyles}>{duration}</span> : null}
    </div>
  );
};
