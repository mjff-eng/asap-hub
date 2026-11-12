import { Clip, ClipPlacement, layoutClips } from '@asap-hub/demo-timeline';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { ProjectAsset } from '../../../api/types';
import ClipInspector from '../ClipInspector';

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
]) as [ClipPlacement, ClipPlacement];

const renderInspector = (
  props: Partial<ComponentProps<typeof ClipInspector>> = {},
) => {
  const handlers = {
    onTrim: jest.fn(),
    onVolume: jest.fn(),
    onMove: jest.fn(),
    onRemove: jest.fn(),
    onTransition: jest.fn(),
  };
  render(
    <ClipInspector
      placement={first}
      asset={asset}
      readOnly={false}
      index={0}
      clipCount={2}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

const typeTime = async (name: RegExp, value: string) => {
  const field = screen.getByRole('textbox', { name });
  await userEvent.clear(field);
  await userEvent.type(field, `${value}{Enter}`);
};

const transitionSelect = () =>
  screen.getByRole('combobox', { name: 'Transition from the clip before' });

describe('trimming a clip', () => {
  it('moves where the clip starts in its source', async () => {
    const { onTrim } = renderInspector();

    await typeTime(/Trim start/, '0:01.50');

    expect(onTrim).toHaveBeenCalledWith({ inMs: 1500 });
  });

  it('moves where the clip ends in its source', async () => {
    const { onTrim } = renderInspector();

    await typeTime(/Trim end/, '0:10.00');

    expect(onTrim).toHaveBeenCalledWith({ outMs: 10000 });
  });

  it('offers no trim or volume for a title card', () => {
    const [title] = layoutClips([
      {
        kind: 'title',
        id: 'title-a',
        durationMs: 3000,
        preset: 'centered',
        text: '',
      },
    ]);
    renderInspector({ placement: title, asset: undefined });

    expect(
      screen.getByRole('complementary', { name: 'Clip' }),
    ).toHaveTextContent('Title card');
    expect(
      screen.queryByRole('textbox', { name: /Trim start/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Volume/)).not.toBeInTheDocument();
  });
});

describe('the transition from the clip before', () => {
  it('is not offered on the first clip, which has nothing before it', () => {
    renderInspector();

    expect(
      screen.queryByRole('combobox', {
        name: 'Transition from the clip before',
      }),
    ).not.toBeInTheDocument();
  });

  it('reads as a cut when the clip has none', () => {
    renderInspector({
      placement: { ...second, clip: source('clip-b') },
      index: 1,
      previousPlacement: first,
    });

    expect(transitionSelect()).toHaveValue('cut');
  });

  it('starts a new blend at half a second', async () => {
    const { onTransition } = renderInspector({
      placement: { ...second, clip: source('clip-b') },
      index: 1,
      previousPlacement: first,
    });

    await userEvent.selectOptions(transitionSelect(), 'Crossfade');

    expect(onTransition).toHaveBeenCalledWith({
      type: 'crossfade',
      durationMs: 500,
    });
  });

  it('keeps the length of the blend when its kind changes', async () => {
    const { onTransition } = renderInspector({
      placement: second,
      index: 1,
      previousPlacement: first,
    });
    expect(transitionSelect()).toHaveValue('crossfade');

    await userEvent.selectOptions(transitionSelect(), 'Slide');

    expect(onTransition).toHaveBeenCalledWith({
      type: 'slide',
      durationMs: 1000,
    });
  });

  it('takes the blend away when it is set back to a cut', async () => {
    const { onTransition } = renderInspector({
      placement: second,
      index: 1,
      previousPlacement: first,
    });

    await userEvent.selectOptions(transitionSelect(), 'Cut');

    expect(onTransition).toHaveBeenCalledWith(undefined);
  });
});

describe('the length of the transition', () => {
  it('changes how long the blend lasts', async () => {
    const { onTransition } = renderInspector({
      placement: second,
      index: 1,
      previousPlacement: first,
    });

    await typeTime(/Transition length/, '0:01.50');

    expect(onTransition).toHaveBeenCalledWith({
      type: 'crossfade',
      durationMs: 1500,
    });
  });

  it('is not offered for a cut', () => {
    renderInspector({
      placement: {
        ...second,
        clip: source('clip-b', {
          transitionIn: { type: 'cut', durationMs: 0 },
        }),
      },
      index: 1,
      previousPlacement: first,
    });

    expect(
      screen.queryByRole('textbox', { name: /Transition length/ }),
    ).not.toBeInTheDocument();
  });

  it('is not offered when the clip before is too short to blend with', () => {
    const [shortFirst, blended] = layoutClips([
      source('clip-a', { outMs: 150 }),
      source('clip-b', { transitionIn: { type: 'crossfade', durationMs: 50 } }),
    ]);
    renderInspector({
      placement: blended,
      index: 1,
      previousPlacement: shortFirst,
    });

    expect(transitionSelect()).toHaveValue('crossfade');
    expect(
      screen.queryByRole('textbox', { name: /Transition length/ }),
    ).not.toBeInTheDocument();
  });
});

describe('reordering', () => {
  it('moves a clip later', async () => {
    const { onMove } = renderInspector({ index: 0, clipCount: 3 });

    await userEvent.click(screen.getByRole('button', { name: 'Move later' }));

    expect(onMove).toHaveBeenCalledWith(1);
  });

  it('moves a clip earlier', async () => {
    const { onMove } = renderInspector({
      placement: second,
      index: 1,
      clipCount: 2,
      previousPlacement: first,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Move earlier' }));

    expect(onMove).toHaveBeenCalledWith(0);
  });

  it('cannot move the last clip any later', () => {
    renderInspector({
      placement: second,
      index: 1,
      clipCount: 2,
      previousPlacement: first,
    });

    expect(screen.getByRole('button', { name: 'Move later' })).toBeDisabled();
  });
});
