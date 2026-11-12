import {
  Banner,
  layoutClips,
  NarrationClip,
  Timeline,
  Zoom,
} from '@asap-hub/demo-timeline';
import { hasResolvedSelection, resolveSelection } from '../selection';

const banner: Banner = {
  id: 'banner-a',
  startMs: 0,
  durationMs: 2000,
  preset: 'lowerThird',
  text: 'Hello',
  position: 'bottom',
  animation: 'fade',
};

const zoom: Zoom = {
  id: 'zoom-a',
  clipId: 'clip-a',
  startMs: 0,
  rampInMs: 300,
  holdMs: 1000,
  rampOutMs: 300,
  focus: { x: 0.5, y: 0.5 },
  scale: 2,
  easing: 'easeInOut',
};

const take: NarrationClip = {
  id: 'take-a',
  assetId: 'asset-a',
  startMs: 0,
  inMs: 0,
  outMs: 3000,
  volume: 1,
};

const timeline = {
  clips: [
    {
      kind: 'source',
      id: 'clip-a',
      assetId: 'asset-a',
      inMs: 0,
      outMs: 4000,
      volume: 1,
    },
  ],
  banners: [banner],
  zooms: [zoom],
  narration: [take],
  cursor: [],
} as unknown as Timeline;

const placements = layoutClips(timeline.clips);

describe('resolveSelection', () => {
  it('finds the selected banner', () => {
    const resolved = resolveSelection(
      { kind: 'banner', id: 'banner-a' },
      timeline,
      placements,
    );

    expect(resolved).toEqual({ banner });
    expect(hasResolvedSelection(resolved)).toBe(true);
  });

  it('finds the selected zoom', () => {
    expect(
      resolveSelection({ kind: 'zoom', id: 'zoom-a' }, timeline, placements),
    ).toEqual({ zoom });
  });

  it('finds the selected voice over take', () => {
    expect(
      resolveSelection(
        { kind: 'narration', id: 'take-a' },
        timeline,
        placements,
      ),
    ).toEqual({ narration: take });
  });

  it('resolves to nothing once what was selected has gone', () => {
    const resolved = resolveSelection(
      { kind: 'banner', id: 'banner-gone' },
      timeline,
      placements,
    );

    expect(hasResolvedSelection(resolved)).toBe(false);
  });
});
