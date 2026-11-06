import { assetHasAudio, assetIndex, assetPath } from '../assets';
import { RenderAsset } from '../types';

const asset = (overrides: Partial<RenderAsset> = {}): RenderAsset => ({
  assetId: 'asset-1',
  path: '/media/asset-1.mp4',
  durationMs: 60000,
  ...overrides,
});

describe('assetIndex', () => {
  it('looks assets up by id', () => {
    expect(assetIndex([asset()]).get('asset-1')).toEqual(asset());
  });
});

describe('assetPath', () => {
  it('resolves the path', () => {
    expect(assetPath(assetIndex([asset()]), 'asset-1', 'clip a')).toBe(
      '/media/asset-1.mp4',
    );
  });

  it('names the owner when the asset is missing', () => {
    expect(() => assetPath(assetIndex([]), 'nope', 'clip a')).toThrow(
      'clip a references unknown asset nope',
    );
  });
});

describe('assetHasAudio', () => {
  it('trusts a probed asset that has audio', () => {
    expect(
      assetHasAudio(assetIndex([asset({ hasAudio: true })]), 'asset-1'),
    ).toBe(true);
  });

  it('trusts a probed asset that has none', () => {
    expect(
      assetHasAudio(assetIndex([asset({ hasAudio: false })]), 'asset-1'),
    ).toBe(false);
  });

  // assuming audio on an unprobed asset let a stream-less clip into the join
  // and the whole export failed on ':a'
  it('treats an unprobed asset as silent until the ingest says otherwise', () => {
    expect(assetHasAudio(assetIndex([asset()]), 'asset-1')).toBe(false);
  });
});
