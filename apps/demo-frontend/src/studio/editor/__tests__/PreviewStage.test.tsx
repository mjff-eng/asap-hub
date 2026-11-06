import {
  CursorEffect,
  layoutClips,
  Timeline as TimelineDoc,
  Zoom,
} from '@asap-hub/demo-timeline';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FC, ReactNode } from 'react';
import { ProjectAsset } from '../../../api/types';
import PreviewStage from '../PreviewStage';
import { Playback, PlaybackProvider, usePlayback } from '../usePlayback';

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

// jsdom implements neither PointerEvent nor pointer capture, so without these
// the stage never sees a coordinate
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 1;
  }
}

// jsdom has no media playback, and the stage pauses the element on mount
beforeAll(() => {
  HTMLMediaElement.prototype.pause = jest.fn();
  HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn(() => true);
});

let playback: Playback;

// the editor's clock, so a test can move the playhead the way playback does
const Clock: FC<{ children: ReactNode }> = ({ children }) => {
  const clock = usePlayback({ durationMs: 20000 });
  playback = clock;
  return <PlaybackProvider value={clock}>{children}</PlaybackProvider>;
};

const seekTo = (ms: number) => act(() => playback.seek(ms));

// play and pause are shared stubs, so a call is counted against the element
// it was made on
const callsOn = (method: 'play' | 'pause', element: HTMLMediaElement): number =>
  jest
    .mocked(HTMLMediaElement.prototype[method])
    .mock.contexts.filter((context) => context === element).length;

// a media element reads as paused in jsdom whatever it was told to do
const markPlaying = (element: HTMLMediaElement) =>
  Object.defineProperty(element, 'paused', {
    configurable: true,
    get: () => false,
  });

const stageOf = (container: HTMLElement): HTMLElement => {
  const stage = container.firstElementChild;
  if (!(stage instanceof HTMLElement)) {
    throw new Error('expected the stage to render');
  }
  // the stage is laid out by the browser; jsdom reports zeroes unless told
  stage.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 800, height: 450 }) as DOMRect;
  return stage;
};

const videoOf = (container: HTMLElement): HTMLVideoElement => {
  const video = container.querySelector<HTMLVideoElement>(
    'video:not([data-testid])',
  );
  if (!video) {
    throw new Error('expected the stage to render a video element');
  }
  return video;
};

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

describe('crossfading as the playhead moves', () => {
  // the outgoing clip runs 0s to 10s and the incoming one blends in over its
  // last second, starting 2s into its own footage
  const [outgoing, incoming] = layoutClips([
    clip(1),
    {
      kind: 'source',
      id: 'clip-b',
      assetId: 'asset-a',
      inMs: 2000,
      outMs: 8000,
      volume: 1,
      transitionIn: { type: 'crossfade', durationMs: 1000 },
    },
  ]);

  const renderBlend = (playing: boolean) => {
    const view = render(
      <Clock>
        <PreviewStage
          box={{ width: 320, height: 180 }}
          placement={outgoing}
          next={incoming}
          banners={[]}
          zooms={[]}
          cursorEffects={[]}
          playing={playing}
          volume={1}
          assets={{ 'asset-a': asset }}
          assetUrl={(item) => item.url}
        />
      </Clock>,
    );
    const next = view.container.querySelector<HTMLVideoElement>(
      '[data-testid="incoming-video"]',
    );
    if (!next) {
      throw new Error('expected the incoming clip to be mounted');
    }
    return { main: videoOf(view.container), next };
  };

  it('leaves the incoming clip alone until just before its entrance', () => {
    const { next } = renderBlend(false);

    seekTo(7000);

    expect(next.currentTime).toBe(0);
    expect(next).not.toBeVisible();
  });

  // seeked ahead so the first blended frame is already decoded
  it('cues the incoming clip a moment before it is seen', () => {
    const { next } = renderBlend(false);

    seekTo(8000);

    expect(next.currentTime).toBe(1);
    expect(next).not.toBeVisible();
  });

  it('blends picture and sound halfway through the overlap', () => {
    const { main, next } = renderBlend(false);

    seekTo(9500);

    expect(next).toBeVisible();
    expect(next.currentTime).toBe(2.5);
    expect(next.volume).toBeCloseTo(0.5);
    expect(main.volume).toBeCloseTo(0.5);
  });

  it('plays the incoming clip once the playhead is inside the overlap', () => {
    const { next } = renderBlend(true);

    seekTo(8000);
    expect(callsOn('play', next)).toBe(0);

    seekTo(9500);
    expect(callsOn('play', next)).toBe(1);
  });

  it('stops the incoming clip when the playhead backs out of the overlap', () => {
    const { next } = renderBlend(true);
    seekTo(9500);
    markPlaying(next);

    seekTo(8000);

    expect(callsOn('pause', next)).toBe(1);
  });
});

describe('narration as the playhead moves', () => {
  const voice: ProjectAsset = {
    ...asset,
    assetId: 'voice-1',
    kind: 'audio',
    url: 'blob:voice',
  };

  // a four second take from 0.5s into its file, placed at 1s
  const take: TimelineDoc['narration'][number] = {
    id: 'take-1',
    assetId: 'voice-1',
    startMs: 1000,
    inMs: 500,
    outMs: 4500,
    volume: 0.5,
  };

  const renderTake = (playing: boolean) => {
    const [placement] = layoutClips([clip(1)]);
    const view = render(
      <Clock>
        <PreviewStage
          box={{ width: 320, height: 180 }}
          placement={placement}
          banners={[]}
          zooms={[]}
          cursorEffects={[]}
          playing={playing}
          volume={1}
          narration={[take]}
          assets={{ 'asset-a': asset, 'voice-1': voice }}
          assetUrl={(item) => item.url}
        />
      </Clock>,
    );
    const audio = view.container.querySelector<HTMLAudioElement>(
      '[data-testid="narration-audio"]',
    );
    if (!audio) {
      throw new Error('expected the take to be mounted');
    }
    return audio;
  };

  it('cues the take to the moment of it under the playhead', () => {
    const audio = renderTake(false);

    seekTo(2000);

    expect(audio.currentTime).toBe(1.5);
    expect(audio.volume).toBeCloseTo(0.5);
  });

  it('plays the take while the demo plays inside it', () => {
    const audio = renderTake(true);

    seekTo(2000);

    expect(callsOn('play', audio)).toBe(1);
  });

  it('stops the take once the playhead leaves it', () => {
    const audio = renderTake(true);
    seekTo(2000);
    markPlaying(audio);

    seekTo(6000);

    expect(callsOn('pause', audio)).toBe(1);
  });

  it('stops the take when the demo is paused inside it', () => {
    const audio = renderTake(false);
    markPlaying(audio);

    seekTo(2000);

    expect(callsOn('pause', audio)).toBe(1);
  });
});

describe('starting playback', () => {
  it('plays the clip when the editor starts playing', () => {
    const [placement] = layoutClips([clip(1)]);
    const stage = (playing: boolean) => (
      <PreviewStage
        box={{ width: 320, height: 180 }}
        placement={placement}
        banners={[]}
        zooms={[]}
        cursorEffects={[]}
        playing={playing}
        volume={1}
        assets={{ 'asset-a': asset }}
        assetUrl={(item) => item.url}
      />
    );
    const view = render(stage(false));
    const video = videoOf(view.container);
    expect(callsOn('play', video)).toBe(0);

    view.rerender(stage(true));

    expect(callsOn('play', video)).toBe(1);
  });
});

describe('a clip with nothing to play yet', () => {
  const [placement] = layoutClips([clip(1)]);
  const renderWith = (state: ProjectAsset['state']) =>
    render(
      <PreviewStage
        box={{ width: 320, height: 180 }}
        placement={placement}
        banners={[]}
        zooms={[]}
        cursorEffects={[]}
        playing={false}
        volume={1}
        assets={{ 'asset-a': { ...asset, state } }}
        assetUrl={() => undefined}
      />,
    );

  it('says so while the upload is still being prepared', () => {
    renderWith('preparing');

    expect(
      screen.getByText('This clip is still being prepared.'),
    ).toBeInTheDocument();
  });

  it('says it has no source otherwise', () => {
    renderWith('ready');

    expect(
      screen.getByText('This clip has no playable source yet.'),
    ).toBeInTheDocument();
  });
});

describe('a title card', () => {
  const card = (subtitle?: string) =>
    layoutClips([
      {
        kind: 'title',
        id: 'card-1',
        durationMs: 3000,
        preset: 'centered',
        text: 'Sprint 42',
        subtitle,
      },
    ])[0];

  const renderCard = (subtitle?: string) =>
    render(
      <Clock>
        <PreviewStage
          box={{ width: 320, height: 180 }}
          placement={card(subtitle)}
          banners={[
            {
              id: 'banner-1',
              startMs: 0,
              durationMs: 3000,
              preset: 'lowerThird',
              text: 'Platform team',
              position: 'bottom',
              animation: 'fade',
              fadeInMs: 0,
            },
          ]}
          zooms={[]}
          cursorEffects={[]}
          playing={false}
          volume={1}
          assets={{}}
          assetUrl={() => undefined}
        />
      </Clock>,
    );

  it('shows the card words and a banner over it', () => {
    renderCard('What we shipped');

    seekTo(1500);

    expect(screen.getByRole('heading', { name: 'Sprint 42' })).toBeVisible();
    expect(screen.getByText('What we shipped')).toBeVisible();
    expect(screen.getByText('Platform team')).toBeVisible();
  });

  it('shows the heading alone when the card has no subtitle', () => {
    const view = renderCard();

    expect(view.container.querySelector('h2')?.parentElement).toHaveTextContent(
      /^Sprint 42$/,
    );
  });

  // only the words fade; the card itself is the clip's picture
  it('fades the words in as the playhead moves into the card', () => {
    renderCard();
    expect(
      screen.getByRole('heading', { name: 'Sprint 42' }),
    ).not.toBeVisible();

    seekTo(1500);

    expect(screen.getByRole('heading', { name: 'Sprint 42' })).toBeVisible();
  });
});

describe('aiming a zoom on the stage', () => {
  const [placement] = layoutClips([clip(1)]);
  const click: CursorEffect = {
    id: 'effect-1',
    tMs: 0,
    type: 'ripple',
    point: { x: 0.5, y: 0.5 },
    origin: 'derived',
  };

  const renderAiming = () => {
    const onChange = jest.fn();
    const onGestureStart = jest.fn();
    const onGestureEnd = jest.fn();
    const view = render(
      <PreviewStage
        box={{ width: 800, height: 450 }}
        placement={placement}
        banners={[]}
        zooms={[]}
        cursorEffects={[click]}
        playing={false}
        volume={1}
        assets={{ 'asset-a': asset }}
        assetUrl={(item) => item.url}
        focus={{ point: { x: 0.5, y: 0.5 }, scale: 2, onChange }}
        onGestureStart={onGestureStart}
        onGestureEnd={onGestureEnd}
      />,
    );
    return {
      stage: stageOf(view.container),
      onChange,
      onGestureStart,
      onGestureEnd,
    };
  };

  it('shows the zoom being aimed, whatever the playhead is over', () => {
    const view = render(
      <PreviewStage
        box={{ width: 800, height: 450 }}
        placement={placement}
        banners={[]}
        zooms={[]}
        cursorEffects={[click]}
        playing={false}
        volume={1}
        assets={{ 'asset-a': asset }}
        assetUrl={(item) => item.url}
        focus={{ point: { x: 0.25, y: 0.75 }, scale: 2, onChange: jest.fn() }}
      />,
    );
    const ring = view.container.querySelector<HTMLElement>(
      '[data-testid="cursor-ripple"]',
    );

    // the click at the centre rides the picture 2x about (0.25, 0.75)
    expect(ring?.style.left).toBe('75%');
    expect(ring?.style.top).toBe('25%');
  });

  it('invites a drag until one starts', () => {
    const { stage } = renderAiming();
    expect(
      screen.getByText('Drag the picture to aim the zoom'),
    ).toBeInTheDocument();

    fireEvent.pointerDown(stage, { clientX: 400, clientY: 225 });
    expect(
      screen.queryByText('Drag the picture to aim the zoom'),
    ).not.toBeInTheDocument();

    fireEvent.pointerUp(stage);
    expect(
      screen.getByText('Drag the picture to aim the zoom'),
    ).toBeInTheDocument();
  });

  // grabbing the picture and pulling it right shows what was off to the left
  it('moves the focus against the drag, as one undo step', () => {
    const { stage, onChange, onGestureStart, onGestureEnd } = renderAiming();

    fireEvent.pointerDown(stage, { clientX: 400, clientY: 225 });
    fireEvent.pointerMove(stage, { clientX: 480, clientY: 225 });
    fireEvent.pointerUp(stage);

    expect(onChange).toHaveBeenCalledWith({ x: 0.4, y: 0.5 });
    expect(onGestureStart).toHaveBeenCalledTimes(1);
    expect(onGestureEnd).toHaveBeenCalledTimes(1);
  });

  it('ignores a pointer passing over without a press', () => {
    const { stage, onChange, onGestureEnd } = renderAiming();

    fireEvent.pointerMove(stage, { clientX: 480, clientY: 225 });
    fireEvent.pointerCancel(stage);

    expect(onChange).not.toHaveBeenCalled();
    expect(onGestureEnd).not.toHaveBeenCalled();
  });
});

describe('placing a click on the stage', () => {
  const [placement] = layoutClips([clip(1)]);

  const renderPlacing = (zooms: Zoom[] = []) => {
    const onChange = jest.fn();
    const onGestureStart = jest.fn();
    const onGestureEnd = jest.fn();
    const view = render(
      <PreviewStage
        box={{ width: 800, height: 450 }}
        placement={placement}
        banners={[]}
        zooms={zooms}
        cursorEffects={[]}
        playing={false}
        volume={1}
        assets={{ 'asset-a': asset }}
        assetUrl={(item) => item.url}
        pin={{ point: { x: 0.5, y: 0.5 }, onChange }}
        onGestureStart={onGestureStart}
        onGestureEnd={onGestureEnd}
      />,
    );
    return {
      stage: stageOf(view.container),
      onChange,
      onGestureStart,
      onGestureEnd,
    };
  };

  it('tells the creator how to place it', () => {
    renderPlacing();

    expect(
      screen.getByText('Click or drag to place the click'),
    ).toBeInTheDocument();
  });

  it('drops the click where the stage is pressed', () => {
    const { stage, onChange, onGestureStart } = renderPlacing();

    fireEvent.pointerDown(stage, { clientX: 200, clientY: 225 });

    expect(onChange).toHaveBeenCalledWith({ x: 0.25, y: 0.5 });
    expect(onGestureStart).toHaveBeenCalledTimes(1);
  });

  it('follows a drag while the pointer is held, as one undo step', () => {
    const { stage, onChange, onGestureEnd } = renderPlacing();

    fireEvent.pointerDown(stage, { clientX: 200, clientY: 225 });
    fireEvent.pointerMove(stage, { clientX: 400, clientY: 90 });
    fireEvent.pointerUp(stage);

    expect(onChange).toHaveBeenLastCalledWith({ x: 0.5, y: 0.2 });
    expect(onGestureEnd).toHaveBeenCalledTimes(1);
  });

  it('ignores a pointer passing over without a press', () => {
    const { stage, onChange } = renderPlacing();
    stage.hasPointerCapture = () => false;

    fireEvent.pointerMove(stage, { clientX: 400, clientY: 90 });

    expect(onChange).not.toHaveBeenCalled();
  });

  // the marker is dropped on the picture the creator can see
  it('reads the press back through the zoom on screen', () => {
    const { stage, onChange } = renderPlacing([
      {
        id: 'zoom-1',
        clipId: 'clip-a',
        startMs: 0,
        rampInMs: 0,
        holdMs: 2000,
        rampOutMs: 0,
        focus: { x: 0.25, y: 0.75 },
        scale: 2,
        easing: 'linear',
      },
    ]);

    // unzoomed, this press would land at (0.25, 0.5)
    fireEvent.pointerDown(stage, { clientX: 200, clientY: 225 });

    expect(onChange).toHaveBeenCalledWith({ x: 0.25, y: 0.625 });
  });
});

describe('a plain stage', () => {
  it('treats a press as no gesture at all', () => {
    const [placement] = layoutClips([clip(1)]);
    const onGestureStart = jest.fn();
    const onGestureEnd = jest.fn();
    const view = render(
      <PreviewStage
        box={{ width: 800, height: 450 }}
        placement={placement}
        banners={[]}
        zooms={[]}
        cursorEffects={[]}
        playing={false}
        volume={1}
        assets={{ 'asset-a': asset }}
        assetUrl={(item) => item.url}
        onGestureStart={onGestureStart}
        onGestureEnd={onGestureEnd}
      />,
    );
    const stage = stageOf(view.container);

    fireEvent.pointerDown(stage, { clientX: 200, clientY: 225 });
    fireEvent.pointerUp(stage);

    expect(onGestureStart).not.toHaveBeenCalled();
    expect(onGestureEnd).not.toHaveBeenCalled();
  });
});
