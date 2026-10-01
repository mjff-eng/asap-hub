import { RenderAsset } from './types';

export const assetIndex = (assets: RenderAsset[]): Map<string, RenderAsset> =>
  new Map(assets.map((asset) => [asset.assetId, asset]));

// Only a probed asset with audio counts as having any. Assuming audio on an
// unprobed one mapped '0:a?' on a file with no track, and the '?' let a clip
// through with no audio stream at all, which is the mixed layout the joins
// refuse: one no-mic recording exported early killed the whole render.
export const assetHasAudio = (
  assets: Map<string, RenderAsset>,
  assetId: string,
): boolean => assets.get(assetId)?.hasAudio === true;

export const assetPath = (
  assets: Map<string, RenderAsset>,
  assetId: string,
  ownerId: string,
): string => {
  const asset = assets.get(assetId);
  if (!asset) {
    throw new Error(`${ownerId} references unknown asset ${assetId}`);
  }
  return asset.path;
};
