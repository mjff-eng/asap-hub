import { layoutClips, Timeline as TimelineDoc } from '@asap-hub/demo-timeline';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ProjectAsset } from '../../../api/types';
import Timeline from '../Timeline';

const asset = (assetId: string, label: string): ProjectAsset => ({
  assetId,
  kind: 'video',
  state: 'ready',
  mimeType: 'video/mp4',
  label,
  durationMs: 20000,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
});

const clips: TimelineDoc['clips'] = [
  {
    kind: 'source',
    id: 'clip-a',
    assetId: 'asset-a',
    inMs: 0,
    outMs: 4000,
    volume: 1,
  },
  {
    kind: 'source',
    id: 'clip-b',
    assetId: 'asset-b',
    inMs: 0,
    outMs: 6000,
    volume: 1,
  },
];

const banner: TimelineDoc['banners'][number] = {
  id: 'banner-a',
  startMs: 2000,
  durationMs: 2000,
  preset: 'lowerThird',
  text: 'Hello',
  position: 'bottom',
  animation: 'fade',
};

const zoom: TimelineDoc['zooms'][number] = {
  id: 'zoom-a',
  clipId: 'clip-b',
  startMs: 1000,
  rampInMs: 400,
  holdMs: 1200,
  rampOutMs: 400,
  focus: { x: 0.5, y: 0.5 },
  scale: 2,
  easing: 'easeInOut',
};

const narration: TimelineDoc['narration'][number] = {
  id: 'take-a',
  assetId: 'asset-a',
  startMs: 1000,
  inMs: 0,
  outMs: 3000,
  volume: 1,
};

const cursorLayer: TimelineDoc['cursor'][number] = {
  clipId: 'clip-b',
  offsetMs: 0,
  path: [],
  effects: [
    {
      id: 'effect-a',
      tMs: 1000,
      type: 'ripple',
      point: { x: 0.5, y: 0.5 },
      origin: 'manual',
    },
  ],
};

const pixelsPerSecond = 100;

const renderTimeline = (overrides: Record<string, unknown> = {}) => {
  const onMove = jest.fn();
  const onOverlap = jest.fn();
  const onTrim = jest.fn();
  const onSeek = jest.fn();
  const onSelect = jest.fn();
  const onSpanChange = jest.fn();
  const onToggleMute = jest.fn();
  const onTogglePick = jest.fn();
  const onGestureStart = jest.fn();
  const onGestureEnd = jest.fn();
  const placements = layoutClips(clips);

  const view = render(
    <Timeline
      placements={placements}
      durationMs={10000}
      pixelsPerSecond={pixelsPerSecond}
      pickedIds={[]}
      canPick
      onTogglePick={onTogglePick}
      readOnly={false}
      banners={[]}
      narration={[]}
      zooms={[]}
      cursorLayers={[]}
      assets={{
        'asset-a': asset('asset-a', 'A'),
        'asset-b': asset('asset-b', 'B'),
      }}
      onSelect={onSelect}
      onSeek={onSeek}
      onMove={onMove}
      onOverlap={onOverlap}
      onTrim={onTrim}
      onSpanChange={onSpanChange}
      onToggleMute={onToggleMute}
      onGestureStart={onGestureStart}
      onGestureEnd={onGestureEnd}
      {...overrides}
    />,
  );

  return {
    container: view.container,
    onMove,
    onOverlap,
    onTrim,
    onSeek,
    onSelect,
    onSpanChange,
    onToggleMute,
    onTogglePick,
    onGestureStart,
    onGestureEnd,
  };
};

// the move handler ignores a pointer with nothing held, so every drag frame in
// these tests has to say a button is down
const pointerMove = (
  element: Element,
  init: { pointerId: number; clientX: number },
) => fireEvent.pointerMove(element, { ...init, buttons: 1 });

// the lane is positioned by the browser; jsdom reports zeroes unless told
const stubLaneGeometry = () => {
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 1000,
    bottom: 100,
    width: 1000,
    height: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
};

// jsdom implements neither PointerEvent nor pointer capture, so without these
// the drag handlers never see a coordinate
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 1;
  }
}

beforeAll(() => {
  window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn(() => true);
});

// the auto scroll runs on animation frames, so the test holds the clock and
// steps it one frame at a time
const scheduled = new Map<number, FrameRequestCallback>();

const stubFrames = () => {
  let nextId = 0;
  scheduled.clear();
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((run) => {
    nextId += 1;
    scheduled.set(nextId, run);
    return nextId;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    scheduled.delete(id);
  });
};

const runFrame = (now: number): boolean => {
  const pending = Array.from(scheduled.entries()).pop();
  if (!pending) return false;
  scheduled.delete(pending[0]);
  act(() => pending[1](now));
  return true;
};

// jsdom has no layout, so a scroll box has to be described to it
const stubScroller = (
  element: HTMLElement,
  sizes: { clientWidth: number; scrollWidth: number },
) => {
  let scrollLeft = 0;
  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    get: () => sizes.clientWidth,
  });
  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    get: () => sizes.scrollWidth,
  });
  Object.defineProperty(element, 'scrollLeft', {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value;
    },
  });
};

const lanes = () => screen.getByRole('region', { name: 'Timeline lanes' });

beforeEach(() => {
  stubLaneGeometry();
  stubFrames();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const clipBlock = (name: string) =>
  screen.getByRole('group', { name: new RegExp(`^${name}, `) });

describe('dragging a clip', () => {
  it('reorders it when it is dropped past the next clip', () => {
    const { onMove } = renderTimeline();

    // clip A occupies 0..400px, clip B 400..1000px; dropping at 800px is past
    // the midpoint of B, so A should land after it
    fireEvent.pointerDown(clipBlock('A'), { pointerId: 1, clientX: 100 });
    pointerMove(clipBlock('A'), { pointerId: 1, clientX: 800 });
    fireEvent.pointerUp(clipBlock('A'), { pointerId: 1, clientX: 800 });

    expect(onMove).toHaveBeenCalledWith('clip-a', 1);
  });

  it('leaves the order alone when it is dropped where it started', () => {
    const { onMove, onOverlap } = renderTimeline();

    fireEvent.pointerDown(clipBlock('A'), { pointerId: 1, clientX: 100 });
    pointerMove(clipBlock('A'), { pointerId: 1, clientX: 110 });
    fireEvent.pointerUp(clipBlock('A'), { pointerId: 1, clientX: 110 });

    expect(onMove).not.toHaveBeenCalled();
    expect(onOverlap).not.toHaveBeenCalled();
  });

  it('does not reorder while the project is read only', () => {
    const { onMove } = renderTimeline({ readOnly: true });

    fireEvent.pointerDown(clipBlock('A'), { pointerId: 1, clientX: 100 });
    pointerMove(clipBlock('A'), { pointerId: 1, clientX: 800 });
    fireEvent.pointerUp(clipBlock('A'), { pointerId: 1, clientX: 800 });

    expect(onMove).not.toHaveBeenCalled();
  });
});

describe('picking clips for a download', () => {
  it('toggles the pick with a modifier click instead of selecting', () => {
    const { onTogglePick, onSelect, onMove } = renderTimeline();

    fireEvent.pointerDown(clipBlock('A'), {
      pointerId: 1,
      clientX: 100,
      ctrlKey: true,
    });

    expect(onTogglePick).toHaveBeenCalledWith('clip-a');
    expect(onSelect).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it('says which clips are picked', () => {
    renderTimeline({ pickedIds: ['clip-a'] });

    expect(
      screen.getByRole('group', { name: /^A, .*picked for download/ }),
    ).toBeVisible();
  });
});

describe('dragging a trim handle', () => {
  it('shortens the end of a clip when dragged left', () => {
    const { onTrim } = renderTimeline();

    const handle = screen.getByRole('button', { name: 'Trim the end of A' });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 400 });
    pointerMove(handle, { pointerId: 1, clientX: 300 });

    expect(onTrim).toHaveBeenCalledWith('clip-a', { outMs: 3000 });
  });

  it('extends the end of a clip again when dragged back right', () => {
    const { onTrim } = renderTimeline();

    const handle = screen.getByRole('button', { name: 'Trim the end of A' });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 400 });
    pointerMove(handle, { pointerId: 1, clientX: 600 });

    expect(onTrim).toHaveBeenCalledWith('clip-a', { outMs: 6000 });
  });

  it('moves the start of a clip', () => {
    const { onTrim } = renderTimeline();

    const handle = screen.getByRole('button', { name: 'Trim the start of A' });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0 });
    pointerMove(handle, { pointerId: 1, clientX: 100 });

    expect(onTrim).toHaveBeenCalledWith('clip-a', { inMs: 1000 });
  });

  // the handle used to be measured against the block's own edge, which moves as
  // the trim lands, so every frame added the offset again and the clip could
  // only ever shrink
  it('follows the pointer back and forth within one drag', () => {
    const { onTrim } = renderTimeline();

    const handle = screen.getByRole('button', { name: 'Trim the end of A' });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 400 });
    pointerMove(handle, { pointerId: 1, clientX: 300 });
    pointerMove(handle, { pointerId: 1, clientX: 700 });
    pointerMove(handle, { pointerId: 1, clientX: 400 });

    expect(onTrim).toHaveBeenLastCalledWith('clip-a', { outMs: 4000 });
  });
});

// the handles were focusable buttons that answered to nothing but a pointer
// press, so trimming could not be done from a keyboard at all
describe('trimming from the keyboard', () => {
  it('takes the end of a clip in with the left arrow', () => {
    const { onTrim } = renderTimeline();

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Trim the end of A' }),
      {
        key: 'ArrowLeft',
      },
    );

    expect(onTrim).toHaveBeenCalledWith('clip-a', { outMs: 3900 });
  });

  it('takes a bigger step when Shift is held', () => {
    const { onTrim } = renderTimeline();

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Trim the end of A' }),
      {
        key: 'ArrowRight',
        shiftKey: true,
      },
    );

    expect(onTrim).toHaveBeenCalledWith('clip-a', { outMs: 5000 });
  });

  it('moves the start of a clip with the right arrow', () => {
    const { onTrim } = renderTimeline();

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Trim the start of A' }),
      { key: 'ArrowRight' },
    );

    expect(onTrim).toHaveBeenCalledWith('clip-a', { inMs: 100 });
  });

  it('changes where a banner ends from its handle', () => {
    const { onSpanChange } = renderTimeline({ banners: [banner] });

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Change where Banner Hello ends' }),
      { key: 'ArrowRight' },
    );

    expect(onSpanChange).toHaveBeenCalledWith(
      'banner',
      'banner-a',
      { startMs: 2000, durationMs: 2100 },
      'trimEnd',
    );
  });

  it('keeps a zoom off its own ramps from the keyboard too', () => {
    const { onSpanChange } = renderTimeline({ zooms: [zoom] });

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Change where Zoom 2x starts' }),
      { key: 'ArrowRight', shiftKey: true },
    );

    const [, , span] = onSpanChange.mock.calls.at(-1) ?? [];
    expect(span).toEqual({ startMs: 6000, durationMs: 1000 });
  });
});

describe('reordering from the keyboard', () => {
  // dragging was the only way to change the order on the lane itself
  it('moves a clip along with Alt and an arrow', () => {
    const { onMove } = renderTimeline();

    fireEvent.keyDown(clipBlock('A'), { key: 'ArrowRight', altKey: true });

    expect(onMove).toHaveBeenCalledWith('clip-a', 1);
  });

  it('will not move the first clip any earlier', () => {
    const { onMove } = renderTimeline();

    fireEvent.keyDown(clipBlock('A'), { key: 'ArrowLeft', altKey: true });

    expect(onMove).not.toHaveBeenCalled();
  });

  it('leaves a plain arrow to the page', () => {
    const { onMove } = renderTimeline();

    fireEvent.keyDown(clipBlock('A'), { key: 'ArrowRight' });

    expect(onMove).not.toHaveBeenCalled();
  });
});

describe('the overlay lanes', () => {
  it('moves a banner along its lane', () => {
    const { onSpanChange } = renderTimeline({ banners: [banner] });

    const block = screen.getByRole('group', { name: 'Banner Hello' });
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 250 });
    pointerMove(block, { pointerId: 1, clientX: 450 });

    expect(onSpanChange).toHaveBeenCalledWith(
      'banner',
      'banner-a',
      { startMs: 4000, durationMs: 2000 },
      'move',
    );
  });

  it('lengthens a banner from its end', () => {
    const { onSpanChange } = renderTimeline({ banners: [banner] });

    const handle = screen.getByRole('button', {
      name: 'Change where Banner Hello ends',
    });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 400 });
    pointerMove(handle, { pointerId: 1, clientX: 700 });

    expect(onSpanChange).toHaveBeenCalledWith(
      'banner',
      'banner-a',
      { startMs: 2000, durationMs: 5000 },
      'trimEnd',
    );
  });

  it('resizes a zoom in programme time, past the clip it belongs to', () => {
    const { onSpanChange } = renderTimeline({ zooms: [zoom] });

    // clip B starts at 4000ms, so the zoom sits at 5000ms and runs for 2000ms
    const handle = screen.getByRole('button', {
      name: 'Change where Zoom 2x ends',
    });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 700 });
    pointerMove(handle, { pointerId: 1, clientX: 900 });

    expect(onSpanChange).toHaveBeenCalledWith(
      'zoom',
      'zoom-a',
      { startMs: 5000, durationMs: 4000 },
      'trimEnd',
    );
  });

  // dragging the left edge right used to push the zoom's end later, because the
  // lane stopped at the shortest block rather than at the zoom's own ramps
  it('never lets a zoom end later than it did when its start is trimmed', () => {
    const { onSpanChange } = renderTimeline({ zooms: [zoom] });

    const handle = screen.getByRole('button', {
      name: 'Change where Zoom 2x starts',
    });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 500 });
    pointerMove(handle, { pointerId: 1, clientX: 700 });

    // the zoom runs 5000..7000; its ramps are 800 together, so its start can
    // only reach 6200 and its end has to stay where it was
    const [, , span] = onSpanChange.mock.calls.at(-1) ?? [];
    expect(span).toEqual({ startMs: 6200, durationMs: 800 });
  });

  it('moves a voice over take', () => {
    const { onSpanChange } = renderTimeline({ narration: [narration] });

    const block = screen.getByRole('group', { name: 'Voice over A' });
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 150 });
    pointerMove(block, { pointerId: 1, clientX: 550 });

    expect(onSpanChange).toHaveBeenCalledWith(
      'narration',
      'take-a',
      { startMs: 5000, durationMs: 3000 },
      'move',
    );
  });

  it('selects a voice over take so it can be removed', () => {
    const { onSelect } = renderTimeline({ narration: [narration] });

    fireEvent.pointerDown(screen.getByRole('group', { name: 'Voice over A' }), {
      pointerId: 1,
      clientX: 150,
    });

    expect(onSelect).toHaveBeenCalledWith('narration', 'take-a');
  });
});

describe('a title card', () => {
  const titled: TimelineDoc['clips'] = [
    {
      kind: 'title',
      id: 'title-a',
      durationMs: 3000,
      preset: 'centered',
      text: 'Intro',
    },
    ...clips,
  ];

  it('changes how long it stays on screen when its edge is dragged', () => {
    const { onSpanChange } = renderTimeline({
      placements: layoutClips(titled),
    });

    const handle = screen.getByRole('button', {
      name: 'Trim the end of Intro',
    });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 300 });
    pointerMove(handle, { pointerId: 1, clientX: 500 });

    expect(onSpanChange).toHaveBeenCalledWith(
      'title',
      'title-a',
      { startMs: 0, durationMs: 5000 },
      'trimEnd',
    );
  });
});

describe('a clip block', () => {
  // it used to print the source trim range rounded to whole seconds, under a
  // ruler showing programme time, so the two disagreed on every trimmed clip
  it('reads in the same time the ruler does', () => {
    renderTimeline({
      placements: layoutClips([
        { ...clips[0], inMs: 2500, outMs: 6000 } as (typeof clips)[number],
      ]),
    });

    expect(screen.getByRole('group', { name: /^A, / })).toHaveTextContent(
      '0:00.00–0:03.50',
    );
  });

  it('gives a clip shorter than a second a span with a width', () => {
    renderTimeline({
      placements: layoutClips([
        { ...clips[0], inMs: 6000, outMs: 6400 } as (typeof clips)[number],
      ]),
    });

    expect(screen.getByRole('group', { name: /^A, / })).toHaveTextContent(
      '0:00.00–0:00.40',
    );
  });

  // a 14px crossed speaker was the only sign a clip had been silenced
  it('says in words that a clip has been muted', () => {
    renderTimeline({
      placements: layoutClips([
        { ...clips[0], volume: 0 } as (typeof clips)[number],
      ]),
    });

    expect(
      screen.getByRole('group', { name: /^A, .*muted$/ }),
    ).toHaveTextContent('muted');
  });

  it('still says which part of the source it uses', () => {
    renderTimeline({
      placements: layoutClips([
        { ...clips[0], inMs: 2500, outMs: 6000 } as (typeof clips)[number],
      ]),
    });

    expect(screen.getByRole('group', { name: /^A, / })).toHaveAttribute(
      'title',
      'Uses 0:02.50 to 0:06.00 of A',
    );
  });
});

// clip B starts at 4000ms, so its effect at 1000ms into the clip sits at
// 5000ms on the lane, which is 500px across
describe('a cursor effect marker', () => {
  const marker = () =>
    screen.getByRole('button', { name: 'Click highlight at 0:05.00' });

  // the dot said only what kind of effect it was, so a lane of them all read
  // the same and none of them said when it fired
  it('says on the dot when the effect happens', () => {
    renderTimeline({ cursorLayers: [cursorLayer] });

    expect(marker()).toBeInTheDocument();
  });

  it('selects the effect when it is pressed', () => {
    const { onSelect } = renderTimeline({ cursorLayers: [cursorLayer] });

    fireEvent.pointerDown(marker(), { pointerId: 1, clientX: 500 });

    expect(onSelect).toHaveBeenCalledWith('effect', 'effect-a');
  });

  it('says which dot is the selected one', () => {
    renderTimeline({
      cursorLayers: [cursorLayer],
      selection: { kind: 'effect', id: 'effect-a' },
    });

    expect(marker()).toHaveAttribute('aria-pressed', 'true');
  });

  // typing into the inspector used to be the only way to retime one
  it('moves along the lane as it is dragged', () => {
    const { onSpanChange } = renderTimeline({ cursorLayers: [cursorLayer] });

    fireEvent.pointerDown(marker(), { pointerId: 1, clientX: 500 });
    pointerMove(marker(), { pointerId: 1, clientX: 700 });

    expect(onSpanChange).toHaveBeenCalledWith(
      'effect',
      'effect-a',
      { startMs: 7000, durationMs: 0 },
      'move',
    );
  });

  // measuring each frame against where the dot now is feeds its own movement
  // back in, and the dot runs away from the pointer
  it('follows the pointer back and forth within one drag', () => {
    const { onSpanChange } = renderTimeline({ cursorLayers: [cursorLayer] });

    fireEvent.pointerDown(marker(), { pointerId: 1, clientX: 500 });
    pointerMove(marker(), { pointerId: 1, clientX: 800 });
    pointerMove(marker(), { pointerId: 1, clientX: 550 });

    const [, , span] = onSpanChange.mock.calls.at(-1) ?? [];
    expect(span).toEqual({ startMs: 5500, durationMs: 0 });
  });

  it('is never dragged to before the start of the programme', () => {
    const { onSpanChange } = renderTimeline({ cursorLayers: [cursorLayer] });

    fireEvent.pointerDown(marker(), { pointerId: 1, clientX: 500 });
    pointerMove(marker(), { pointerId: 1, clientX: -400 });

    const [, , span] = onSpanChange.mock.calls.at(-1) ?? [];
    expect(span).toEqual({ startMs: 0, durationMs: 0 });
  });

  // one entry per pointer move would fill the whole undo history with a single
  // drag
  it('is one undoable gesture however many frames it takes', () => {
    const { onGestureStart, onGestureEnd } = renderTimeline({
      cursorLayers: [cursorLayer],
    });

    fireEvent.pointerDown(marker(), { pointerId: 1, clientX: 500 });
    pointerMove(marker(), { pointerId: 1, clientX: 600 });
    pointerMove(marker(), { pointerId: 1, clientX: 700 });
    fireEvent.pointerUp(marker(), { pointerId: 1, clientX: 700 });

    expect(onGestureStart).toHaveBeenCalledTimes(1);
    expect(onGestureEnd).toHaveBeenCalledTimes(1);
  });

  it('still selects but does not move while the project is read only', () => {
    const { onSelect, onSpanChange } = renderTimeline({
      cursorLayers: [cursorLayer],
      readOnly: true,
    });

    fireEvent.pointerDown(marker(), { pointerId: 1, clientX: 500 });
    pointerMove(marker(), { pointerId: 1, clientX: 700 });

    expect(onSelect).toHaveBeenCalledWith('effect', 'effect-a');
    expect(onSpanChange).not.toHaveBeenCalled();
  });

  it('leaves an effect whose clip is gone off the lane', () => {
    renderTimeline({
      cursorLayers: [{ ...cursorLayer, clipId: 'clip-gone' }],
    });

    expect(
      screen.queryByRole('button', { name: /ripple effect/ }),
    ).not.toBeInTheDocument();
  });
});

describe('retiming a cursor effect from the keyboard', () => {
  const marker = () =>
    screen.getByRole('button', { name: 'Click highlight at 0:05.00' });

  it('takes a step later with the right arrow', () => {
    const { onSpanChange } = renderTimeline({ cursorLayers: [cursorLayer] });

    fireEvent.keyDown(marker(), { key: 'ArrowRight' });

    expect(onSpanChange).toHaveBeenCalledWith(
      'effect',
      'effect-a',
      { startMs: 5100, durationMs: 0 },
      'move',
    );
  });

  it('takes a bigger step when Shift is held', () => {
    const { onSpanChange } = renderTimeline({ cursorLayers: [cursorLayer] });

    fireEvent.keyDown(marker(), { key: 'ArrowLeft', shiftKey: true });

    expect(onSpanChange).toHaveBeenCalledWith(
      'effect',
      'effect-a',
      { startMs: 4000, durationMs: 0 },
      'move',
    );
  });

  it('selects the effect with Enter without moving it', () => {
    const { onSelect, onSpanChange } = renderTimeline({
      cursorLayers: [cursorLayer],
    });

    fireEvent.keyDown(marker(), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('effect', 'effect-a');
    expect(onSpanChange).not.toHaveBeenCalled();
  });

  it('does not move one while the project is read only', () => {
    const { onSpanChange } = renderTimeline({
      cursorLayers: [cursorLayer],
      readOnly: true,
    });

    fireEvent.keyDown(marker(), { key: 'ArrowRight' });

    expect(onSpanChange).not.toHaveBeenCalled();
  });
});

describe('the ruler', () => {
  it('seeks to the position that was clicked', () => {
    const { onSeek } = renderTimeline();

    fireEvent.pointerDown(screen.getByRole('presentation'), {
      pointerId: 1,
      clientX: 250,
    });

    expect(onSeek).toHaveBeenCalledWith(2500);
  });
});

describe('the track headers', () => {
  it('names every lane, in the order the lanes are drawn', () => {
    const { container } = renderTimeline();

    const headers = Array.from(
      container.querySelectorAll('[aria-hidden="true"] > div'),
    ).map((cell) => cell.textContent);

    // the first cell is the spacer beside the ruler; the rest must match the
    // lanes one for one or the tracks stop lining up with their names
    expect(headers).toEqual([
      '',
      'Clips',
      'Banners',
      'Zoom, cursor',
      'Voice over',
    ]);
  });
});

// The track is gapless and ordered, so the only way two clips can share time is
// for the later one to blend into the one before it. Dropping a clip over its
// neighbour sets that blend rather than parking it at a free position.
describe('dropping a clip over its neighbour', () => {
  const blended: TimelineDoc['clips'] = [
    clips[0] as (typeof clips)[number],
    {
      ...(clips[1] as (typeof clips)[number]),
      transitionIn: { type: 'crossfade', durationMs: 1000 },
    },
  ];

  it('crossfades into the clip after it when it is pushed right', () => {
    const { onOverlap } = renderTimeline();

    fireEvent.pointerDown(clipBlock('A'), { pointerId: 1, clientX: 100 });
    pointerMove(clipBlock('A'), { pointerId: 1, clientX: 200 });
    fireEvent.pointerUp(clipBlock('A'), { pointerId: 1, clientX: 200 });

    expect(onOverlap).toHaveBeenCalledWith('clip-b', 1000);
  });

  it('lengthens the blend when the later clip is pulled left', () => {
    const { onOverlap } = renderTimeline({ placements: layoutClips(blended) });

    const block = clipBlock('B');
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 400 });
    pointerMove(block, { pointerId: 1, clientX: 300 });
    fireEvent.pointerUp(block, { pointerId: 1, clientX: 300 });

    expect(onOverlap).toHaveBeenCalledWith('clip-b', 2000);
  });

  it('gives the blend back when the later clip is pushed right again', () => {
    const { onOverlap } = renderTimeline({ placements: layoutClips(blended) });

    const block = clipBlock('B');
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 400 });
    pointerMove(block, { pointerId: 1, clientX: 500 });
    fireEvent.pointerUp(block, { pointerId: 1, clientX: 500 });

    expect(onOverlap).toHaveBeenCalledWith('clip-b', 0);
  });

  // a transition plays over both clips, so it can never eat more than half of
  // the shorter one however far the drag is taken
  it('never blends more than half of the shorter clip', () => {
    const { onOverlap } = renderTimeline();

    fireEvent.pointerDown(clipBlock('A'), { pointerId: 1, clientX: 100 });
    pointerMove(clipBlock('A'), { pointerId: 1, clientX: 500 });
    fireEvent.pointerUp(clipBlock('A'), { pointerId: 1, clientX: 500 });

    expect(onOverlap).toHaveBeenCalledWith('clip-b', 2000);
  });

  it('reorders rather than blending when it is taken past the neighbour', () => {
    const { onMove, onOverlap } = renderTimeline();

    fireEvent.pointerDown(clipBlock('A'), { pointerId: 1, clientX: 100 });
    pointerMove(clipBlock('A'), { pointerId: 1, clientX: 800 });
    fireEvent.pointerUp(clipBlock('A'), { pointerId: 1, clientX: 800 });

    expect(onMove).toHaveBeenCalledWith('clip-a', 1);
    expect(onOverlap).not.toHaveBeenCalled();
  });

  it('does not blend while the project is read only', () => {
    const { onOverlap } = renderTimeline({ readOnly: true });

    fireEvent.pointerDown(clipBlock('A'), { pointerId: 1, clientX: 100 });
    pointerMove(clipBlock('A'), { pointerId: 1, clientX: 200 });
    fireEvent.pointerUp(clipBlock('A'), { pointerId: 1, clientX: 200 });

    expect(onOverlap).not.toHaveBeenCalled();
  });

  // the crossed lines over the shared length are the only sign on the lane, and
  // they say nothing to a screen reader
  it('says on the block that it blends into the clip before', () => {
    renderTimeline({ placements: layoutClips(blended) });

    expect(
      screen.getByRole('group', {
        name: 'B, 0:03.00–0:09.00, crossfade from the clip before',
      }),
    ).toBeInTheDocument();
  });
});

describe('the drag shadow', () => {
  const ghost = () => screen.getByTestId('drag-ghost');

  it('is not shown until something is dragged', () => {
    renderTimeline({ banners: [banner] });

    expect(ghost()).not.toBeVisible();
  });

  it('follows a banner along its lane and says where it will land', () => {
    renderTimeline({ banners: [banner] });

    const block = screen.getByRole('group', { name: 'Banner Hello' });
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 250 });
    pointerMove(block, { pointerId: 1, clientX: 450 });

    expect(ghost()).toBeVisible();
    expect(ghost()).toHaveTextContent('Banner Hello · 0:04.00');
  });

  it('says what dropping a clip where it is would do', () => {
    renderTimeline();

    fireEvent.pointerDown(clipBlock('A'), { pointerId: 1, clientX: 100 });
    pointerMove(clipBlock('A'), { pointerId: 1, clientX: 200 });

    expect(ghost()).toHaveTextContent('Crossfade 1.0s');
  });

  it('says when a clip would be reordered instead', () => {
    renderTimeline();

    fireEvent.pointerDown(clipBlock('A'), { pointerId: 1, clientX: 100 });
    pointerMove(clipBlock('A'), { pointerId: 1, clientX: 800 });

    expect(ghost()).toHaveTextContent('Move here');
  });

  it('follows a voice over take and a cursor effect too', () => {
    renderTimeline({ narration: [narration], cursorLayers: [cursorLayer] });

    const take = screen.getByRole('group', { name: 'Voice over A' });
    fireEvent.pointerDown(take, { pointerId: 1, clientX: 150 });
    pointerMove(take, { pointerId: 1, clientX: 550 });
    expect(ghost()).toHaveTextContent('Voice over A · 0:05.00');
    fireEvent.pointerUp(take, { pointerId: 1, clientX: 550 });

    const marker = screen.getByRole('button', {
      name: 'Click highlight at 0:05.00',
    });
    fireEvent.pointerDown(marker, { pointerId: 1, clientX: 500 });
    pointerMove(marker, { pointerId: 1, clientX: 700 });
    expect(ghost()).toHaveTextContent('Click highlight at 0:05.00 · 0:07.00');
  });

  it('is taken away when the pointer is let go', () => {
    renderTimeline({ banners: [banner] });

    const block = screen.getByRole('group', { name: 'Banner Hello' });
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 250 });
    pointerMove(block, { pointerId: 1, clientX: 450 });
    fireEvent.pointerUp(block, { pointerId: 1, clientX: 450 });

    expect(ghost()).not.toBeVisible();
  });

  it('stays away for a trim, which redraws the block itself', () => {
    renderTimeline();

    const handle = screen.getByRole('button', { name: 'Trim the end of A' });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 400 });
    pointerMove(handle, { pointerId: 1, clientX: 600 });

    expect(ghost()).not.toBeVisible();
  });
});

// the lane is wider than the window on any real demo, and a drag used to stop
// dead at the edge of what was on screen
describe('scrolling the lane from the edge of a drag', () => {
  it('scrolls on when a drag is held against the right edge', () => {
    renderTimeline({ banners: [banner] });
    stubScroller(lanes(), { clientWidth: 1000, scrollWidth: 3000 });

    const block = screen.getByRole('group', { name: 'Banner Hello' });
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 250 });
    pointerMove(block, { pointerId: 1, clientX: 990 });

    runFrame(0);
    runFrame(100);

    expect(lanes().scrollLeft).toBeGreaterThan(0);
  });

  it('scrolls back when the drag is held against the left edge', () => {
    renderTimeline({ banners: [banner] });
    stubScroller(lanes(), { clientWidth: 1000, scrollWidth: 3000 });
    lanes().scrollLeft = 800;

    const block = screen.getByRole('group', { name: 'Banner Hello' });
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 250 });
    pointerMove(block, { pointerId: 1, clientX: 10 });

    runFrame(0);
    runFrame(100);

    expect(lanes().scrollLeft).toBeLessThan(800);
  });

  it('leaves the lane alone while the drag is away from either edge', () => {
    renderTimeline({ banners: [banner] });
    stubScroller(lanes(), { clientWidth: 1000, scrollWidth: 3000 });

    const block = screen.getByRole('group', { name: 'Banner Hello' });
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 250 });
    pointerMove(block, { pointerId: 1, clientX: 500 });

    runFrame(0);
    runFrame(100);

    expect(lanes().scrollLeft).toBe(0);
  });

  it('never scrolls past the end of the lane', () => {
    renderTimeline({ banners: [banner] });
    stubScroller(lanes(), { clientWidth: 1000, scrollWidth: 1000 });

    const block = screen.getByRole('group', { name: 'Banner Hello' });
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 250 });
    pointerMove(block, { pointerId: 1, clientX: 990 });

    runFrame(0);
    runFrame(100);

    expect(lanes().scrollLeft).toBe(0);
  });

  it('carries the block being dragged along with the lane', () => {
    const { onSpanChange } = renderTimeline({ banners: [banner] });
    stubScroller(lanes(), { clientWidth: 1000, scrollWidth: 3000 });

    const block = screen.getByRole('group', { name: 'Banner Hello' });
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 250 });
    pointerMove(block, { pointerId: 1, clientX: 990 });
    const beforeScrolling = onSpanChange.mock.calls.length;

    runFrame(0);
    runFrame(100);

    expect(onSpanChange.mock.calls.length).toBeGreaterThan(beforeScrolling);
  });

  it('stops as soon as the pointer is let go', () => {
    renderTimeline({ banners: [banner] });
    stubScroller(lanes(), { clientWidth: 1000, scrollWidth: 3000 });

    const block = screen.getByRole('group', { name: 'Banner Hello' });
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 250 });
    pointerMove(block, { pointerId: 1, clientX: 990 });
    fireEvent.pointerUp(block, { pointerId: 1, clientX: 990 });

    expect(runFrame(100)).toBe(false);
    expect(lanes().scrollLeft).toBe(0);
  });
});
