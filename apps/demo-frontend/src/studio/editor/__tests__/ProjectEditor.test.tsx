import { createEmptyTimeline, Timeline } from '@asap-hub/demo-timeline';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import { ProjectAsset } from '../../../api/types';
import { screenCapture, useHoldCapture } from '../../recording/captureLock';
import { CaptureApply } from '../../recording/cursorPlacement';
import { TimelineAction, timelineReducer } from '../../project/timelineReducer';
import { ProjectEditor as Editor } from '../../project/useProjectEditor';
import ProjectEditor from '../ProjectEditor';

// jsdom implements neither PointerEvent nor pointer capture, so without these
// the lane never sees a coordinate
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props);
    this.pointerId = props.pointerId ?? 1;
  }
}

beforeAll(() => {
  HTMLMediaElement.prototype.pause = jest.fn();
  HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn(() => true);
});

const asset = (overrides: Partial<ProjectAsset> = {}): ProjectAsset => ({
  assetId: 'asset-a',
  kind: 'video',
  state: 'ready',
  mimeType: 'video/mp4',
  label: 'Sprint demo',
  durationMs: 8000,
  width: 1920,
  height: 1080,
  fps: 30,
  url: 'blob:a',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
  ...overrides,
});

// every call the editor makes on the document, in the order it made them, so a
// gesture that should collapse into one undo step can be seen doing it
type Call = { name: string; action?: TimelineAction };

const renderEditor = ({
  timeline = createEmptyTimeline(),
  assets = [asset()],
  readOnly = false,
  recorder,
  onDownloadClips,
}: {
  timeline?: Timeline;
  assets?: ProjectAsset[];
  readOnly?: boolean;
  recorder?: (
    addAsset: (added: ProjectAsset) => void,
    applyCursorCapture: (apply: CaptureApply) => boolean,
  ) => ReactNode;
  onDownloadClips?: (clipIds: string[]) => void;
} = {}) => {
  const calls: Call[] = [];
  const editor: Editor = {
    timeline,
    saveState: 'idle',
    dirty: false,
    canUndo: false,
    canRedo: false,
    version: 1,
    dispatch: (action) => calls.push({ name: 'dispatch', action }),
    beginGesture: () => calls.push({ name: 'beginGesture' }),
    endGesture: () => calls.push({ name: 'endGesture' }),
    undo: () => calls.push({ name: 'undo' }),
    redo: () => calls.push({ name: 'redo' }),
    rebase: () => calls.push({ name: 'rebase' }),
    flush: () => calls.push({ name: 'flush' }),
    discard: () => calls.push({ name: 'discard' }),
  };

  const view = render(
    <ProjectEditor
      editor={editor}
      assets={assets}
      readOnly={readOnly}
      assetUrl={(item) => item.url}
      onImport={jest.fn()}
      onImportAudio={jest.fn()}
      onRenameAsset={jest.fn()}
      onDeleteAsset={jest.fn()}
      uploading={false}
      recorder={recorder}
      onDownloadClips={onDownloadClips}
      canDownload
    />,
  );

  return { ...view, calls };
};

// the same editor, but with the real reducer behind it, for the cases that turn
// on what the document became rather than on what was asked of it
const Live: FC<{
  readonly assets: ProjectAsset[];
  readonly initial: Timeline;
}> = ({ assets, initial }) => {
  const [timeline, setTimeline] = useState(initial);
  const dispatch = useCallback(
    (action: TimelineAction) =>
      setTimeline((current) => timelineReducer(current, action)),
    [],
  );
  const editor: Editor = useMemo(
    () => ({
      timeline,
      saveState: 'idle',
      dirty: false,
      canUndo: false,
      canRedo: false,
      version: 1,
      dispatch,
      beginGesture: () => undefined,
      endGesture: () => undefined,
      undo: () => undefined,
      redo: () => undefined,
      rebase: () => undefined,
      flush: () => undefined,
      discard: () => undefined,
    }),
    [dispatch, timeline],
  );

  return (
    <ProjectEditor
      editor={editor}
      assets={assets}
      readOnly={false}
      assetUrl={(item) => item.url}
      onImport={jest.fn()}
      onImportAudio={jest.fn()}
      onRenameAsset={jest.fn()}
      onDeleteAsset={jest.fn()}
      uploading={false}
    />
  );
};

const renderLive = (initial: Timeline = createEmptyTimeline()) =>
  render(<Live assets={[asset()]} initial={initial} />);

const withClip = (): Timeline => ({
  ...createEmptyTimeline(),
  clips: [
    {
      kind: 'source',
      id: 'clip-a',
      assetId: 'asset-a',
      inMs: 0,
      outMs: 8000,
      volume: 1,
    },
  ],
});

describe('adding a source to the timeline', () => {
  // the add and the format that follows it used to be two entries, so the first
  // Ctrl+Z after the click only put the canvas back and looked like nothing
  it('is a single undoable gesture', async () => {
    const { calls } = renderEditor({
      assets: [asset({ width: 3840, height: 2160, fps: 60 })],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Add to timeline' }),
    );

    expect(calls.map((call) => call.name)).toEqual([
      'beginGesture',
      'dispatch',
      'dispatch',
      'endGesture',
    ]);
  });

  it('follows the format of the footage it was given', async () => {
    const { calls } = renderEditor({
      assets: [asset({ width: 3840, height: 2160, fps: 60 })],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Add to timeline' }),
    );

    expect(calls.map((call) => call.action).filter(Boolean)).toContainEqual({
      type: 'setCanvas',
      canvas: { width: 3840, height: 2160, fps: 60 },
    });
  });

  // a source added before the ingest had read it pinned the whole project to
  // 1080p30, and nothing ever ran again to correct it
  it('leaves the format alone while the source is still being prepared', async () => {
    const { calls } = renderEditor({
      assets: [
        asset({
          state: 'preparing',
          width: undefined,
          height: undefined,
          fps: undefined,
        }),
      ],
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Add to timeline' }),
    );

    expect(calls.some((call) => call.action?.type === 'setCanvas')).toBe(false);
  });
});

describe('the side panels', () => {
  // at 1366x768 most of both panels is below the fold, and an overlay scrollbar
  // gave no sign of it, so they are reachable from the keyboard as well
  it.each(['Media', 'Clip'])('lets the keyboard scroll %s', (name) => {
    renderEditor();

    expect(screen.getByRole('complementary', { name })).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  it('keeps the controls at the far end of the inspector reachable', async () => {
    renderLive();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add to timeline' }),
    );

    const inspector = screen.getByRole('complementary', { name: 'Clip' });
    expect(inspector).toHaveTextContent('Volume');
    expect(inspector).toHaveTextContent('Move earlier');
    expect(inspector).toHaveTextContent('Remove clip');
  });
});

describe('while something is recording', () => {
  const Live1: FC = () => {
    useHoldCapture(screenCapture, true);
    return <span>recorder</span>;
  };

  // the panel gives the lock up as it unmounts, so cleanup needs nothing here

  // it used to show as one line inside the media panel, which scrolls, so
  // scrolling past it left nothing in the studio saying a take was running
  it('the studio says so outside the panel that scrolls', () => {
    act(() => {
      renderEditor({ recorder: () => <Live1 /> });
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'A screen recording is running.',
    );
  });

  it('importing is held back until the take is over', () => {
    act(() => {
      renderEditor({ recorder: () => <Live1 /> });
    });

    expect(
      screen.getByRole('button', { name: 'Import a video' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Import audio' })).toBeDisabled();
  });

  it('says nothing at all when nothing is recording', () => {
    renderEditor();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Import a video' }),
    ).toBeEnabled();
  });
});

// An apply resolves the surface from the clip's own take, or, for a clip that
// kept none, from the newest take the recorder saw. Writing that second kind
// back onto the clip made it the clip's own for good: every later apply read it
// first, no inspector can edit it, and the pointer stayed where it was wrong.
describe('the surface an apply resolved', () => {
  const applying = (surface: string) =>
    jest.fn().mockResolvedValue([
      {
        clipId: 'clip-a',
        path: [{ tMs: 0, x: 0.5, y: 0.5 }],
        effects: [],
        surface,
      },
    ]);

  const captured = async (surface: string) => {
    const apply = applying(surface);
    const { calls } = renderEditor({
      timeline: withClip(),
      recorder: (_addAsset, applyCursorCapture) => (
        <button type="button" onClick={() => applyCursorCapture(apply)}>
          Add cursor effects
        </button>
      ),
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Add cursor effects' }),
    );
    await waitFor(() => expect(apply).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        calls.filter((call) => call.action?.type === 'applyCapture'),
      ).toHaveLength(1),
    );
    return calls.find((call) => call.action?.type === 'applyCapture')?.action;
  };

  it('never reaches the document', async () => {
    expect(await captured('monitor')).not.toHaveProperty('surface');
  });

  it('still lands the effects it derived', async () => {
    expect(await captured('monitor')).toMatchObject({
      clipId: 'clip-a',
      path: [{ tMs: 0, x: 0.5, y: 0.5 }],
    });
  });
});

describe('a source already on the timeline', () => {
  // a recording puts itself on the timeline, and the card went on saying "Add
  // to timeline", so clicking again quietly made a second copy of it
  it('says so on the card', () => {
    renderEditor({ timeline: withClip() });

    const media = screen.getByRole('complementary', { name: 'Media' });
    expect(media).toHaveTextContent('on the timeline');
    expect(
      screen.getByRole('button', { name: 'Add another copy' }),
    ).toBeInTheDocument();
  });

  it('still offers to add the first copy of one that is not', () => {
    renderEditor();

    expect(
      screen.getByRole('button', { name: 'Add to timeline' }),
    ).toBeInTheDocument();
  });

  it('says a voice over is on the timeline in its own words', () => {
    renderEditor({
      assets: [asset({ kind: 'audio' })],
      timeline: {
        ...createEmptyTimeline(),
        narration: [
          {
            id: 'take-a',
            assetId: 'asset-a',
            startMs: 0,
            inMs: 0,
            outMs: 4000,
            volume: 1,
          },
        ],
      },
    });

    expect(
      screen.getByRole('button', { name: 'Add another voice over' }),
    ).toBeInTheDocument();
  });
});

describe('the name of a source', () => {
  it('says it can be renamed rather than looking like a heading', () => {
    renderEditor();

    expect(screen.getByLabelText('Name of Sprint demo')).toHaveAttribute(
      'title',
      'Rename Sprint demo',
    );
  });
});

describe('where a new thing lands', () => {
  // a title card is a clip, so it can only go between clips, while everything
  // else drops exactly on the playhead; the buttons gave no hint which
  it('says on the button that a title card goes in after a clip', () => {
    renderEditor({ timeline: withClip() });

    expect(
      screen.getByRole('button', {
        name: 'Title card, goes in after the clip under the playhead',
      }),
    ).toBeInTheDocument();
  });

  it.each(['Banner', 'Zoom', 'Mouse click'])(
    'says on the button that %s goes at the playhead',
    (name) => {
      renderEditor({ timeline: withClip() });

      expect(
        screen.getByRole('button', { name: `${name}, goes at the playhead` }),
      ).toBeInTheDocument();
    },
  );
});

// clip A runs 0..8000ms from the start of the programme, so an effect 1000ms
// into it sits at 0:01.00 on the lane
describe('retiming a cursor effect on the lane', () => {
  const withEffect = (tMs: number): Timeline => ({
    ...withClip(),
    cursor: [
      {
        clipId: 'clip-a',
        offsetMs: 0,
        path: [],
        effects: [
          {
            id: 'effect-a',
            tMs,
            type: 'ripple',
            point: { x: 0.5, y: 0.5 },
            origin: 'manual',
          },
        ],
      },
    ],
  });

  const marker = (label: string) =>
    screen.getByRole('button', { name: `Click highlight at ${label}` });

  const moves = (calls: Call[]) =>
    calls.flatMap((call) =>
      call.action?.type === 'moveCursorEffect'
        ? [{ toClipId: call.action.toClipId, tMs: call.action.tMs }]
        : [],
    );

  it('stores the new moment against the clip the effect belongs to', () => {
    const { calls } = renderEditor({ timeline: withEffect(1000) });

    fireEvent.keyDown(marker('0:01.00'), { key: 'ArrowRight' });

    expect(calls.map((call) => call.action).filter(Boolean)).toContainEqual({
      type: 'moveCursorEffect',
      fromClipId: 'clip-a',
      toClipId: 'clip-a',
      effectId: 'effect-a',
      tMs: 1100,
    });
  });

  // it stays on the clip it lands on, and its moment stays a whole millisecond
  // inside that clip: a fraction, or a moment past the end, is a document the
  // server refuses in full, and every later save then fails
  it('holds an effect at the end of the last clip rather than past it', () => {
    const { calls } = renderEditor({ timeline: withEffect(8000) });

    fireEvent.keyDown(marker('0:08.00'), { key: 'ArrowRight', shiftKey: true });

    expect(moves(calls)).toEqual([{ toClipId: 'clip-a', tMs: 8000 }]);
  });

  it('will not pull an effect back before the timeline starts', () => {
    const { calls } = renderEditor({ timeline: withEffect(0) });

    fireEvent.keyDown(marker('0:00.00'), { key: 'ArrowLeft' });

    expect(moves(calls)).toEqual([{ toClipId: 'clip-a', tMs: 0 }]);
  });

  // one entry per pointer move would leave the whole undo history holding a
  // single drag
  it('makes one undoable gesture of a whole drag', () => {
    const { calls } = renderEditor({ timeline: withEffect(1000) });
    const dot = marker('0:01.00');
    const from = calls.length;

    fireEvent.pointerDown(dot, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(dot, { pointerId: 1, clientX: 300, buttons: 1 });
    fireEvent.pointerMove(dot, { pointerId: 1, clientX: 200, buttons: 1 });
    fireEvent.pointerUp(dot, { pointerId: 1, clientX: 200 });

    const drag = calls.slice(from);
    expect(drag.filter((call) => call.name === 'beginGesture')).toHaveLength(1);
    expect(drag.at(0)?.name).toBe('beginGesture');
    expect(drag.at(-1)?.name).toBe('endGesture');

    const moved = moves(drag).map((move) => move.tMs);
    expect(moved.length).toBeGreaterThan(0);
    expect(moved.every((tMs) => Number.isInteger(tMs))).toBe(true);
  });
});

describe('the undo shortcuts', () => {
  it('are named on the buttons that do the same thing', () => {
    renderEditor({ timeline: withClip() });

    expect(
      screen.getByRole('button', { name: /^Undo \(.*Z\)$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Redo \(.*Shift\+Z\)$/ }),
    ).toBeInTheDocument();
  });
});

describe('the action bar', () => {
  // Split acts on the clip under the playhead, so it was disabled while the S
  // key it duplicates went on working
  it('offers Split whenever a clip is under the playhead', () => {
    renderEditor({ timeline: withClip() });

    expect(screen.getByRole('button', { name: 'Split' })).toBeEnabled();
  });

  it('has nothing to split on an empty timeline', () => {
    renderEditor();

    expect(screen.getByRole('button', { name: 'Split' })).toBeDisabled();
  });

  // Duplicate and Mute returned early unless a clip was selected, so with a
  // banner selected they looked live and did nothing at all
  it('withholds Duplicate and Mute until a clip is selected', () => {
    renderEditor({ timeline: withClip() });

    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mute' })).toBeDisabled();
  });

  it('offers Duplicate and Mute once a clip is selected', async () => {
    renderLive();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add to timeline' }),
    );

    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mute' })).toBeEnabled();
  });
});

describe('adding a source', () => {
  // the inspector used to keep saying "Select a clip on the timeline to edit it"
  it('selects the clip it just made so the inspector shows it', async () => {
    renderLive();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add to timeline' }),
    );

    expect(
      screen.queryByText('Select a clip on the timeline to edit it.'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Clip')).toHaveTextContent('Sprint demo');
  });
});

describe('the format the export uses', () => {
  it('is raised once the ingest reports what the footage really is', () => {
    const { calls } = renderEditor({
      timeline: withClip(),
      assets: [asset({ width: 3840, height: 2160, fps: 60 })],
    });

    expect(calls.map((call) => call.action).filter(Boolean)).toContainEqual({
      type: 'setCanvas',
      canvas: { width: 3840, height: 2160, fps: 60 },
    });
  });

  it('is left alone when it already matches the footage', () => {
    const { calls } = renderEditor({ timeline: withClip() });

    expect(calls.some((call) => call.action?.type === 'setCanvas')).toBe(false);
  });
});

describe('the colour of a click', () => {
  const withEffect = (): Timeline => ({
    ...withClip(),
    cursor: [
      {
        clipId: 'clip-a',
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
      },
    ],
  });

  it('writes the picked colour onto the effect', async () => {
    const { calls } = renderEditor({ timeline: withEffect() });

    await userEvent.click(
      screen.getByRole('button', { name: 'Click highlight at 0:01.00' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Red' }));

    expect(
      calls.flatMap((call) =>
        call.action?.type === 'updateCursorEffect' ? [call.action.change] : [],
      ),
    ).toContainEqual(expect.objectContaining({ color: '#ff3b30' }));
  });
});

// the derived origin lines a capture up on its own, but imported footage has no
// origin to derive and any take can still drift, so the nudge is the way out
describe('lining a whole capture up by hand', () => {
  const withCapture = (offsetMs: number): Timeline => ({
    ...withClip(),
    cursor: [
      {
        clipId: 'clip-a',
        offsetMs,
        path: [{ tMs: 0, x: 0.2, y: 0.2 }],
        effects: [
          {
            id: 'effect-a',
            tMs: 1000,
            type: 'ripple',
            point: { x: 0.5, y: 0.5 },
            origin: 'derived',
          },
        ],
      },
    ],
  });

  const openInspector = async (offsetMs: number) => {
    const view = renderEditor({ timeline: withCapture(offsetMs) });
    await userEvent.click(
      screen.getByRole('button', { name: 'Click highlight at 0:01.00' }),
    );
    return view;
  };

  it('reads the nudge in seconds, and which way it goes', async () => {
    await openInspector(-4300);

    expect(
      await screen.findByRole('slider', { name: /Whole capture/ }),
    ).toHaveAccessibleName('Whole capture: 4.30s earlier');
  });

  it('says so when the capture is already in step', async () => {
    await openInspector(0);

    expect(
      await screen.findByRole('slider', { name: /Whole capture/ }),
    ).toHaveAccessibleName('Whole capture: in step with the video');
  });

  it('writes the nudge onto the layer, not onto the one click', async () => {
    const { calls } = await openInspector(0);

    fireEvent.change(
      await screen.findByRole('slider', { name: /Whole capture/ }),
      {
        target: { value: '1500' },
      },
    );

    expect(
      calls.flatMap((call) =>
        call.action?.type === 'setCursorOffset' ? [call.action] : [],
      ),
    ).toEqual([{ type: 'setCursorOffset', clipId: 'clip-a', offsetMs: 1500 }]);
  });

  it('is not offered on a clip with no capture on it', async () => {
    renderEditor({
      timeline: {
        ...withClip(),
        cursor: [
          {
            clipId: 'clip-a',
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
          },
        ],
      },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Click highlight at 0:01.00' }),
    );

    expect(
      screen.queryByRole('slider', { name: /Whole capture/ }),
    ).not.toBeInTheDocument();
  });
});

// The video track is gapless and ordered: two clips can only share time by the
// later one blending into the one before it, so an overlap dragged on the lane
// is stored as that clip's incoming transition.
describe('dropping a clip over its neighbour', () => {
  const withTwoClips = (): Timeline => ({
    ...withClip(),
    clips: [
      ...withClip().clips,
      {
        kind: 'source',
        id: 'clip-b',
        assetId: 'asset-a',
        inMs: 0,
        outMs: 8000,
        volume: 1,
      },
    ],
  });

  beforeEach(() => {
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // the lane draws at 24 pixels a second until the shell has been measured, so
  // 24 pixels of travel is a second of programme time
  const dragFirstClip = (fromX: number, toX: number) => {
    const block = screen.getAllByRole('group', {
      name: /^Sprint demo, 0:00\.00/,
    })[0] as HTMLElement;
    fireEvent.pointerDown(block, { pointerId: 1, clientX: fromX });
    fireEvent.pointerMove(block, { pointerId: 1, clientX: toX, buttons: 1 });
    fireEvent.pointerUp(block, { pointerId: 1, clientX: toX });
  };

  it('stores the overlap as a crossfade on the later clip', () => {
    const { calls } = renderEditor({ timeline: withTwoClips() });

    dragFirstClip(50, 74);

    expect(calls.map((call) => call.action).filter(Boolean)).toContainEqual({
      type: 'setTransition',
      clipId: 'clip-b',
      transition: { type: 'crossfade', durationMs: 1000 },
    });
  });

  it('is one undoable gesture however many frames the drag took', () => {
    const { calls } = renderEditor({ timeline: withTwoClips() });

    dragFirstClip(50, 74);

    expect(calls.map((call) => call.name)).toEqual([
      'beginGesture',
      'dispatch',
      'endGesture',
    ]);
  });

  it('says on the lane that the two clips now blend', () => {
    renderLive(withTwoClips());

    dragFirstClip(50, 74);

    expect(
      screen.getByRole('group', {
        name: /crossfade from the clip before$/,
      }),
    ).toBeInTheDocument();
  });
});

describe('dragging a click onto another clip', () => {
  // it used to be clamped to the clip it started on, so a click on a short
  // first clip could not be moved anywhere useful and read as stuck
  const twoClips = (): Timeline => ({
    ...createEmptyTimeline(),
    clips: [
      {
        kind: 'source',
        id: 'clip-a',
        assetId: 'asset-1',
        inMs: 0,
        outMs: 2000,
        volume: 1,
      },
      {
        kind: 'source',
        id: 'clip-b',
        assetId: 'asset-1',
        inMs: 0,
        outMs: 8000,
        volume: 1,
      },
    ],
    cursor: [
      {
        clipId: 'clip-a',
        offsetMs: 0,
        path: [],
        effects: [
          {
            id: 'effect-a',
            tMs: 1900,
            type: 'ripple',
            point: { x: 0.5, y: 0.5 },
            origin: 'manual',
          },
        ],
      },
    ],
  });

  it('re-homes it onto the clip it was dropped on', () => {
    const { calls } = renderEditor({ timeline: twoClips() });

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Click highlight at 0:01.90' }),
      { key: 'ArrowRight', shiftKey: true },
    );

    const move = calls
      .map((call) => call.action)
      .find((action) => action?.type === 'moveCursorEffect');

    expect(move).toMatchObject({
      fromClipId: 'clip-a',
      toClipId: 'clip-b',
      tMs: 900,
    });
  });
});

// capture times are footage times: a click added to a clip whose front was
// trimmed used to store the clip time instead, so it drew nowhere at all
describe('adding a mouse click to a trimmed clip', () => {
  it('stores the moment in the footage, trim included', async () => {
    const trimmed: Timeline = {
      ...withClip(),
      clips: [
        {
          kind: 'source',
          id: 'clip-a',
          assetId: 'asset-a',
          inMs: 5000,
          outMs: 8000,
          volume: 1,
        },
      ],
    };
    const { calls } = renderEditor({ timeline: trimmed });

    await userEvent.click(
      screen.getByRole('button', { name: 'Mouse click, goes at the playhead' }),
    );

    const added = calls.find(
      (call) =>
        call.name === 'dispatch' && call.action?.type === 'addCursorEffect',
    );
    expect(added?.action).toMatchObject({
      effect: expect.objectContaining({ tMs: 5000 }),
    });
  });
});

// the browser's stopgap duration reading of a fresh recording can come up
// seconds short, and using it as the trim bound clamped the take's end away
// on the first touch of a handle
describe('trimming before the ingest has probed the asset', () => {
  // footage legitimately ends early when nothing on screen changed, so the
  // take's own length is the bound and the render holds the last frame
  it('lets a clip extend to the take length past short footage', () => {
    const taken: Timeline = {
      ...withClip(),
      cursor: [
        {
          clipId: 'clip-a',
          offsetMs: 0,
          path: [],
          effects: [],
          recordedAtEpochMs: 1_700_000_000_000,
          recordedDurationMs: 11_000,
        },
      ],
    };
    const { calls } = renderEditor({ timeline: taken });

    const handle = screen.getByRole('button', {
      name: 'Trim the end of Sprint demo',
    });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 200 });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      clientX: 260,
      buttons: 1,
    });

    const trims = calls.filter(
      (call) => call.name === 'dispatch' && call.action?.type === 'trimClip',
    );
    expect(
      (trims[0]?.action as { assetDurationMs?: number }).assetDurationMs,
    ).toBe(11_000);
  });

  it('sends no hard bound when only the browser guessed a duration', () => {
    const unprobed = asset();
    delete (unprobed as { durationMs?: number }).durationMs;
    const { calls } = renderEditor({
      timeline: withClip(),
      assets: [unprobed],
    });

    const handle = screen.getByRole('button', {
      name: 'Trim the end of Sprint demo',
    });
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 200 });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      clientX: 150,
      buttons: 1,
    });

    const trims = calls.filter(
      (call) => call.name === 'dispatch' && call.action?.type === 'trimClip',
    );
    expect(trims.length).toBeGreaterThan(0);
    expect(
      (trims[0]?.action as { assetDurationMs?: number }).assetDurationMs,
    ).toBeUndefined();
  });
});

describe('picking clips for a download', () => {
  const pick = () =>
    fireEvent.pointerDown(
      screen.getByRole('group', { name: /^Sprint demo, / }),
      { pointerId: 1, ctrlKey: true },
    );

  it('offers the picked cut and hands over the clip ids', () => {
    const onDownloadClips = jest.fn();
    renderEditor({ timeline: withClip(), onDownloadClips });

    pick();
    fireEvent.click(
      screen.getByRole('button', { name: 'Download these clips' }),
    );

    expect(onDownloadClips).toHaveBeenCalledWith(['clip-a']);
  });

  it('clears the picks without starting anything', () => {
    const onDownloadClips = jest.fn();
    renderEditor({ timeline: withClip(), onDownloadClips });

    pick();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onDownloadClips).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Picked clips' })).toBeNull();
  });

  it('unpicks a clip clicked a second time', () => {
    const onDownloadClips = jest.fn();
    renderEditor({ timeline: withClip(), onDownloadClips });

    pick();
    pick();

    expect(screen.queryByRole('region', { name: 'Picked clips' })).toBeNull();
  });
});
