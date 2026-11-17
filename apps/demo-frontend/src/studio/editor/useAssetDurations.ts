import { useEffect, useRef, useState } from 'react';
import { ProjectAsset } from '../../api/types';

const probe = (url: string): Promise<number | undefined> =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const done = (value?: number) => {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.src = '';
      resolve(value);
    };
    video.onloadedmetadata = () =>
      done(
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.round(video.duration * 1000)
          : undefined,
      );
    video.onerror = () => done(undefined);
    video.src = url;
  });

// The ingest job writes the real duration onto the asset, but that takes a
// moment and a clip is editable immediately, so the browser reads it from the
// file itself in the meantime. Without a real duration the trim bounds collapse
// to the clip's own out point and it can only ever be shortened.
export const useAssetDurations = (
  assets: ProjectAsset[],
  assetUrl: (asset: ProjectAsset) => string | undefined,
): Record<string, number> => {
  const [durations, setDurations] = useState<Record<string, number>>({});
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    assets
      .filter(
        (asset) =>
          asset.durationMs === undefined &&
          !attempted.current.has(asset.assetId),
      )
      .forEach((asset) => {
        const url = assetUrl(asset);
        if (!url) {
          return;
        }
        attempted.current.add(asset.assetId);
        void probe(url).then((durationMs) => {
          if (durationMs !== undefined) {
            setDurations((current) => ({
              ...current,
              [asset.assetId]: durationMs,
            }));
          }
        });
      });
  }, [assets, assetUrl]);

  return durations;
};
