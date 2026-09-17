import { layoutClips, Timeline as TimelineDoc } from '@asap-hub/demo-timeline';
import { render } from '@testing-library/react';
import { ProjectAsset } from '../../../api/types';
import PreviewStage from '../PreviewStage';

const asset: ProjectAsset = {
  assetId: 'asset-a',
  kind: 'video',
  state: 'ready',
  mimeType: 'video/mp4',
  label: 'A',
  durationMs: 10000,
  url: 'blob:a',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

const clip = (volume: number): TimelineDoc['clips'][number] => ({
  kind: 'source',
  id: 'clip-a',
  assetId: 'asset-a',
  inMs: 0,
  outMs: 10000,
  volume,
});

const renderStage = (clipVolume: number, previewVolume: number) => {
  const [placement] = layoutClips([clip(clipVolume)]);
  const view = render(
    <PreviewStage
      box={{ width: 320, height: 180 }}
      placement={placement}
      banners={[]}
      zooms={[]}
      cursorEffects={[]}
      playing={false}
      volume={previewVolume}
      assets={{ 'asset-a': asset }}
      assetUrl={() => asset.url}
    />,
  );
  const video = view.container.querySelector('video');
  if (!video) {
    throw new Error('expected the stage to render a video element');
  }
  return video;
};

// jsdom has no media playback, and the stage pauses the element on mount
beforeAll(() => {
  HTMLMediaElement.prototype.pause = jest.fn();
  HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
});

describe('the preview sound', () => {
  // a clip turned down sounded exactly like one at full level in the studio,
  // and only the export told the truth
  it('applies the clip level as well as the preview slider', () => {
    expect(renderStage(0.4, 1).volume).toBeCloseTo(0.4);
  });

  it('multiplies the two rather than letting either stand alone', () => {
    expect(renderStage(0.5, 0.5).volume).toBeCloseTo(0.25);
  });

  it('mutes a clip the creator has silenced', () => {
    expect(renderStage(0, 1).muted).toBe(true);
  });

  it('can only turn an element down, so a boosted clip plays at full', () => {
    expect(renderStage(1.6, 1).volume).toBeCloseTo(1);
  });
});

// the voice over lanes were silent until the export: no audio element existed
// anywhere in the studio, so the volume slider adjusted nothing hearable
describe('narration in the preview', () => {
  const voice: ProjectAsset = {
    ...asset,
    assetId: 'voice-1',
    kind: 'audio',
    url: 'blob:voice',
  };

  const stageWith = (narration: TimelineDoc['narration']) => {
    const [placement] = layoutClips([clip(1)]);
    return render(
      <PreviewStage
        box={{ width: 320, height: 180 }}
        placement={placement}
        banners={[]}
        zooms={[]}
        cursorEffects={[]}
        playing={false}
        volume={1}
        narration={narration}
        assets={{ 'asset-a': asset, 'voice-1': voice }}
        assetUrl={(item) => item.url}
      />,
    );
  };

  it('renders one audio element per take, pointed at its file', () => {
    const view = stageWith([
      {
        id: 'take-1',
        assetId: 'voice-1',
        startMs: 0,
        inMs: 0,
        outMs: 4000,
        volume: 1,
      },
      {
        id: 'take-2',
        assetId: 'voice-1',
        startMs: 5000,
        inMs: 0,
        outMs: 2000,
        volume: 0.5,
      },
    ]);

    const audio = view.container.querySelectorAll(
      '[data-testid="narration-audio"]',
    );
    expect(audio).toHaveLength(2);
    expect(audio[0]).toHaveAttribute('src', 'blob:voice');
  });

  it('renders none for a take whose asset is still uploading', () => {
    const view = stageWith([
      {
        id: 'take-1',
        assetId: 'missing',
        startMs: 0,
        inMs: 0,
        outMs: 4000,
        volume: 1,
      },
    ]);

    expect(
      view.container.querySelectorAll('[data-testid="narration-audio"]'),
    ).toHaveLength(0);
  });
});

// the preview held the outgoing clip solid through a crossfade and hard cut at
// its end, while the export blended: the two disagreed about every transition
describe('a crossfade on the stage', () => {
  const two = () =>
    layoutClips([
      clip(1),
      {
        kind: 'source',
        id: 'clip-b',
        assetId: 'asset-a',
        inMs: 0,
        outMs: 6000,
        volume: 1,
        transitionIn: { type: 'crossfade', durationMs: 1000 },
      },
    ]);

  it('mounts the incoming clip so it can blend in', () => {
    const [a, b] = two();
    const view = render(
      <PreviewStage
        box={{ width: 320, height: 180 }}
        placement={a}
        next={b}
        banners={[]}
        zooms={[]}
        cursorEffects={[]}
        playing={false}
        volume={1}
        assets={{ 'asset-a': asset }}
        assetUrl={(item) => item.url}
      />,
    );

    const incoming = view.container.querySelector(
      '[data-testid="incoming-video"]',
    );
    expect(incoming).toBeInTheDocument();
    expect(incoming).toHaveAttribute('src', 'blob:a');
  });

  it('mounts nothing extra for a plain cut', () => {
    const [a, b] = layoutClips([
      clip(1),
      {
        kind: 'source',
        id: 'clip-b',
        assetId: 'asset-a',
        inMs: 0,
        outMs: 6000,
        volume: 1,
      },
    ]);
    const view = render(
      <PreviewStage
        box={{ width: 320, height: 180 }}
        placement={a}
        next={b}
        banners={[]}
        zooms={[]}
        cursorEffects={[]}
        playing={false}
        volume={1}
        assets={{ 'asset-a': asset }}
        assetUrl={(item) => item.url}
      />,
    );

    expect(
      view.container.querySelector('[data-testid="incoming-video"]'),
    ).not.toBeInTheDocument();
  });
});
