import {
  Banner,
  Clip,
  CursorLayer,
  layoutClips,
  NarrationClip,
  Zoom,
} from '@asap-hub/demo-timeline';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { ProjectAsset } from '../../../api/types';
import InspectorPanel from '../InspectorPanel';

const asset: ProjectAsset = {
  assetId: 'asset-a',
  kind: 'video',
  state: 'ready',
  mimeType: 'video/mp4',
  label: 'Sprint demo',
  durationMs: 12000,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

const source = (id: string, overrides: Partial<Clip> = {}): Clip =>
  ({
    kind: 'source',
    id,
    assetId: 'asset-a',
    inMs: 0,
    outMs: 8000,
    volume: 1,
    ...overrides,
  }) as Clip;

const [first, second] = layoutClips([
  source('clip-a'),
  source('clip-b', { transitionIn: { type: 'crossfade', durationMs: 1000 } }),
]);

const renderPanel = (
  props: Partial<ComponentProps<typeof InspectorPanel>> = {},
) => {
  const dispatch = jest.fn();
  render(
    <InspectorPanel
      selected={{}}
      assets={{ 'asset-a': asset }}
      clipCount={2}
      readOnly={false}
      assetDurationOf={() => undefined}
      dispatch={dispatch}
      onRemove={jest.fn()}
      {...props}
    />,
  );
  return { dispatch };
};

// a time field only commits once it is left, so a half typed value never lands
const typeTime = async (name: RegExp, value: string) => {
  const field = screen.getByRole('textbox', { name });
  await userEvent.clear(field);
  await userEvent.type(field, `${value}{Enter}`);
};

describe('with nothing selected', () => {
  it('asks for a clip to be selected', () => {
    renderPanel();

    expect(
      screen.getByRole('complementary', { name: 'Clip' }),
    ).toHaveTextContent('Select a clip on the timeline to edit it.');
  });
});

describe('a voice over', () => {
  const take: NarrationClip = {
    id: 'take-a',
    assetId: 'asset-a',
    startMs: 0,
    inMs: 0,
    outMs: 4000,
    volume: 1,
  };

  it('names its track and writes a new volume onto the take', () => {
    const { dispatch } = renderPanel({ selected: { narration: take } });

    expect(
      screen.getByRole('complementary', { name: 'Voice over' }),
    ).toHaveTextContent('Sprint demo');
    fireEvent.change(screen.getByRole('slider', { name: /^Volume/ }), {
      target: { value: '1.5' },
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'updateNarration',
      narrationId: 'take-a',
      change: { volume: 1.5 },
    });
  });
});

describe('a cursor effect', () => {
  const effect = {
    id: 'effect-a',
    tMs: 3000,
    type: 'ripple' as const,
    point: { x: 0.5, y: 0.5 },
    origin: 'derived' as const,
  };
  const layer: CursorLayer = {
    clipId: 'clip-a',
    offsetMs: 0,
    path: [{ tMs: 0, x: 0.2, y: 0.2 }],
    effects: [effect],
    alignXPx: 6,
    alignYPx: -4,
  };

  const renderEffect = () =>
    renderPanel({ selected: { effect }, current: first, cursorLayer: layer });

  it('changes the drawn pointer of the whole capture', async () => {
    const { dispatch } = renderEffect();

    await userEvent.click(
      screen.getByRole('button', { name: 'Pointing hand' }),
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: 'setCursorPointer',
      clipId: 'clip-a',
      pointer: 'hand',
    });
  });

  it('fine tunes one axis and keeps the other where it was', () => {
    const { dispatch } = renderEffect();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Across' }), {
      target: { value: '12' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Down' }), {
      target: { value: '-9' },
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'setCursorAlign',
      clipId: 'clip-a',
      alignXPx: 12,
      alignYPx: -4,
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'setCursorAlign',
      clipId: 'clip-a',
      alignXPx: 6,
      alignYPx: -9,
    });
  });

  // capture times are footage times, and the field speaks clip time
  it('reads and writes its moment through the trim of a trimmed clip', async () => {
    const [trimmed] = layoutClips([source('clip-a', { inMs: 2000 })]);
    const dispatch = jest.fn();
    render(
      <InspectorPanel
        selected={{ effect }}
        current={trimmed}
        cursorLayer={layer}
        assets={{ 'asset-a': asset }}
        clipCount={1}
        readOnly={false}
        assetDurationOf={() => undefined}
        dispatch={dispatch}
        onRemove={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('textbox', { name: /^At, in the clip/ }),
    ).toHaveValue('0:01.00');
    await typeTime(/^At, in the clip/, '0:02.00');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'updateCursorEffect',
      clipId: 'clip-a',
      effectId: 'effect-a',
      change: { tMs: 4000 },
    });
  });
});

describe('a zoom', () => {
  const zoom: Zoom = {
    id: 'zoom-a',
    clipId: 'clip-a',
    startMs: 0,
    rampInMs: 400,
    holdMs: 1500,
    rampOutMs: 400,
    focus: { x: 0.5, y: 0.5 },
    scale: 2,
    easing: 'easeInOut',
  };

  it('writes a new scale onto the zoom', async () => {
    const { dispatch } = renderPanel({ selected: { zoom }, current: first });

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Scale' }),
      '3',
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: 'updateZoom',
      zoomId: 'zoom-a',
      change: { scale: 3 },
    });
  });

  // 8s of clip less the 2.3s the ramps and the hold take
  it('keeps the start inside the clip under the playhead', async () => {
    const { dispatch } = renderPanel({ selected: { zoom }, current: first });

    await typeTime(/^Starts in the clip/, '0:07.00');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'updateZoom',
      zoomId: 'zoom-a',
      change: { startMs: 5700 },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The latest this can be is 0:05.70.',
    );
  });

  it('has no clip to bound the start once the playhead is elsewhere', async () => {
    const { dispatch } = renderPanel({ selected: { zoom } });

    await typeTime(/^Starts in the clip/, '0:07.00');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'updateZoom',
      zoomId: 'zoom-a',
      change: { startMs: 7000 },
    });
  });
});

describe('a banner', () => {
  const banner: Banner = {
    id: 'banner-a',
    startMs: 0,
    durationMs: 4000,
    preset: 'lowerThird',
    text: 'Welcome',
    position: 'bottom',
    animation: 'fade',
  };

  it('writes its heading onto the banner', () => {
    const { dispatch } = renderPanel({ selected: { banner } });

    fireEvent.change(screen.getByRole('textbox', { name: 'Heading' }), {
      target: { value: 'Attendance' },
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'updateBanner',
      bannerId: 'banner-a',
      change: { text: 'Attendance' },
    });
  });
});

describe('a title card', () => {
  const [card] = layoutClips([
    {
      kind: 'title',
      id: 'title-a',
      durationMs: 3000,
      preset: 'centered',
      text: 'Next steps',
    },
  ]);

  it('writes its heading onto the card', () => {
    const { dispatch } = renderPanel({ selected: { clip: card } });

    expect(
      screen.getByRole('complementary', { name: 'Title card' }),
    ).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'Heading' }), {
      target: { value: 'Questions' },
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'updateTitleCard',
      clipId: 'title-a',
      text: 'Questions',
    });
  });
});

describe('a source clip', () => {
  it('trims it against the bound every surface shares', async () => {
    const { dispatch } = renderPanel({
      selected: { clip: first },
      trimBoundMs: 11000,
    });

    await typeTime(/^Trim start/, '0:01.00');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'trimClip',
      clipId: 'clip-a',
      inMs: 1000,
      assetDurationMs: 11000,
    });
  });

  it('writes a new volume onto the clip', () => {
    const { dispatch } = renderPanel({ selected: { clip: first } });

    fireEvent.change(screen.getByRole('slider', { name: /^Volume/ }), {
      target: { value: '0.5' },
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'setClipVolume',
      clipId: 'clip-a',
      volume: 0.5,
    });
  });

  it('moves the clip one place along', async () => {
    const { dispatch } = renderPanel({ selected: { clip: first } });

    expect(screen.getByRole('button', { name: 'Move earlier' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move later' }));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'moveClip',
      clipId: 'clip-a',
      toIndex: 1,
    });
  });

  it('changes how a later clip comes in from the one before', async () => {
    const { dispatch } = renderPanel({
      selected: { clip: second },
      previousPlacement: first,
    });

    expect(
      screen.getByRole('textbox', { name: /^Transition length/ }),
    ).toHaveValue('0:01.00');
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Transition from the clip before' }),
      'slide',
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: 'setTransition',
      clipId: 'clip-b',
      transition: { type: 'slide', durationMs: 1000 },
    });
  });
});
