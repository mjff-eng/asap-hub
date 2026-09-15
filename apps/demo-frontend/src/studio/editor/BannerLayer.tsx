/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { Banner, fadeOpacityAt } from '@asap-hub/demo-timeline';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

const layerStyles = css({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
});

const bandStyles = css({
  position: 'absolute',
  left: 0,
  right: 0,
  padding: '4% 6%',
  background:
    'linear-gradient(to top, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.45) 60%, rgba(0, 0, 0, 0))',
  color: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4em',
});

const bottomStyles = css({ bottom: 0 });

const topStyles = css({
  top: 0,
  background:
    'linear-gradient(to bottom, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.45) 60%, rgba(0, 0, 0, 0))',
});

const headingStyles = css({
  margin: 0,
  fontSize: 'clamp(18px, 4.2cqw, 52px)',
  fontWeight: 700,
  lineHeight: 1.1,
});

const subtitleStyles = css({
  margin: 0,
  fontSize: 'clamp(12px, 2.4cqw, 30px)',
  fontWeight: 500,
  opacity: 0.92,
});

const offsetAt = (banner: Banner, opacity: number): string =>
  banner.animation === 'slide'
    ? `translateY(${(1 - opacity) * (banner.position === 'top' ? -30 : 30)}%)`
    : 'none';

const shownAt = (banners: Banner[], tMs: number): Banner[] =>
  banners.filter((banner) => fadeOpacityAt(banner, banner, tMs) > 0);

const keyOf = (shown: Banner[]): string =>
  shown.map((banner) => banner.id).join(' ');

export type BannerLayerHandle = {
  setTime: (ms: number) => void;
};

type Props = {
  readonly banners: Banner[];
  // where the layer starts; the stage drives it from there
  readonly tMs?: number;
};

// a banner fades rather than snapping on, so its own frames are written to the
// DOM; only a banner arriving or leaving is worth a render
const BannerLayer = forwardRef<BannerLayerHandle, Props>(
  ({ banners, tMs = 0 }, ref) => {
    const [timeMs, setTimeMs] = useState(tMs);
    const nodesRef = useRef(new Map<string, HTMLDivElement>());
    const shown = shownAt(banners, timeMs);
    const shownKey = keyOf(shown);
    const shownKeyRef = useRef(shownKey);

    useEffect(() => {
      shownKeyRef.current = shownKey;
    }, [shownKey]);

    useImperativeHandle(
      ref,
      () => ({
        setTime: (ms: number) => {
          const next = shownAt(banners, ms);
          const key = keyOf(next);
          if (key !== shownKeyRef.current) {
            shownKeyRef.current = key;
            setTimeMs(ms);
            return;
          }
          next.forEach((banner) => {
            const node = nodesRef.current.get(banner.id);
            if (!node) return;
            const opacity = fadeOpacityAt(banner, banner, ms);
            node.style.opacity = `${opacity}`;
            node.style.transform = offsetAt(banner, opacity);
          });
        },
      }),
      [banners],
    );

    const hold = useCallback(
      (id: string) => (node: HTMLDivElement | null) => {
        if (node) {
          nodesRef.current.set(id, node);
        } else {
          nodesRef.current.delete(id);
        }
      },
      [],
    );

    return (
      <div css={layerStyles}>
        {shown.map((banner) => {
          const opacity = fadeOpacityAt(banner, banner, timeMs);
          return (
            <div
              key={banner.id}
              ref={hold(banner.id)}
              css={[
                bandStyles,
                banner.position === 'top' ? topStyles : bottomStyles,
              ]}
              style={{ opacity, transform: offsetAt(banner, opacity) }}
            >
              <p css={headingStyles}>{banner.text}</p>
              {banner.subtitle ? (
                <p css={subtitleStyles}>{banner.subtitle}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  },
);

export default BannerLayer;
