import {
  assetKey,
  assetPrefix,
  assetProxyKey,
  mediaPrefix,
  projectPrefix,
  rawKey,
  rawPrefix,
  timelineKey,
} from '../src/storage';

describe('key helpers', () => {
  it('builds the raw and media keys from the video id', () => {
    expect(rawKey('video-1')).toBe('raw/video-1/original.mp4');
    expect(rawPrefix('video-1')).toBe('raw/video-1/');
    expect(mediaPrefix('video-1')).toBe('media/video-1/');
  });

  it('builds the project keys from the video id', () => {
    expect(projectPrefix('video-1')).toBe('projects/video-1/');
    expect(assetPrefix('video-1', 'asset-1')).toBe(
      'projects/video-1/assets/asset-1/',
    );
    expect(assetKey('video-1', 'asset-1', 'webm')).toBe(
      'projects/video-1/assets/asset-1/original.webm',
    );
    expect(assetProxyKey('video-1', 'asset-1')).toBe(
      'projects/video-1/assets/asset-1/proxy.mp4',
    );
    expect(timelineKey('video-1', 7)).toMatch(
      /^projects\/video-1\/timeline\/7-[0-9a-f-]{36}\.json$/,
    );
  });

  // the pointer and the bytes it names have to be inseparable, or a lost CAS
  // between two tabs leaves the winner's pointer on the loser's object
  it('gives every timeline write its own key', () => {
    expect(timelineKey('video-1', 7)).not.toBe(timelineKey('video-1', 7));
  });

  // the EventBridge encoder rule fires on every object created under raw/, so a
  // studio key landing there would start one Fargate encode per recorded segment
  it('keeps every studio key out of the raw prefix', () => {
    const studioKeys = [
      projectPrefix('video-1'),
      assetPrefix('video-1', 'asset-1'),
      assetKey('video-1', 'asset-1', 'webm'),
      assetProxyKey('video-1', 'asset-1'),
      timelineKey('video-1', 1),
    ];

    studioKeys.forEach((key) => {
      expect(key.startsWith('raw/')).toBe(false);
      expect(key.startsWith('projects/')).toBe(true);
    });
  });
});
