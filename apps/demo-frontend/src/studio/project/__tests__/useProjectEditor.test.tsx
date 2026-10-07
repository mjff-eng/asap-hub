import { createEmptyTimeline } from '@asap-hub/demo-timeline';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

import { TestApiProvider } from '../../../api/ApiProvider';
import { ApiError } from '../../../api/client';
import type { SavedTimeline } from '../../../api/types';
import type { Api } from '../../../api/client';
import { AuthContext, AuthState } from '../../../auth/AuthProvider';
import { authenticatedState, makeVideo } from '../../../test-utils';
import { autosaveMs, useProjectEditor } from '../useProjectEditor';

const project = makeVideo({ id: 'project-1', kind: 'studio', version: 3 });

const addClip = (assetId: string, clipId: string) => ({
  type: 'addClip' as const,
  assetId,
  clipId,
  durationMs: 5000,
});

const renderEditor = (api: Partial<Api>, onLeaseLost = jest.fn()) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={authenticatedState as AuthState}>
      <TestApiProvider api={api}>{children}</TestApiProvider>
    </AuthContext.Provider>
  );
  const view = renderHook(
    ({ version }: { version: number }) =>
      useProjectEditor({
        id: 'project-1',
        timeline: createEmptyTimeline(),
        timelineVersion: 4,
        version,
        readOnly: false,
        onLeaseLost,
      }),
    { wrapper, initialProps: { version: 3 } },
  );
  return { view, onLeaseLost };
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, autosaveMs + 150);
    });
  });
};

describe('saving', () => {
  it('sends the versions it was given', async () => {
    const saveTimeline = jest.fn().mockResolvedValue({
      video: { ...project, version: 4 },
      timelineVersion: 5,
    });
    const { view } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();

    expect(saveTimeline).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ timelineVersion: 4, version: 3 }),
    );
  });

  // A save queued behind another one runs inside the first one's `finally`,
  // before React has re-rendered, so reading the versions from state sent the
  // one the server had already moved past and everything after it was a 409.
  it('carries the versions the last save returned into the next one', async () => {
    const saveTimeline = jest
      .fn()
      .mockResolvedValueOnce({
        video: { ...project, version: 4 },
        timelineVersion: 5,
      })
      .mockResolvedValueOnce({
        video: { ...project, version: 5 },
        timelineVersion: 6,
      });
    const { view } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();
    act(() => view.result.current.dispatch(addClip('asset-2', 'clip-2')));
    await settle();

    await waitFor(() => expect(saveTimeline).toHaveBeenCalledTimes(2));
    expect(saveTimeline).toHaveBeenLastCalledWith(
      'project-1',
      expect.objectContaining({ timelineVersion: 5, version: 4 }),
    );
  });

  it('takes both versions from the server after a conflict', async () => {
    const saveTimeline = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(409, 'conflict', 'conflict'))
      .mockResolvedValue({
        video: { ...project, version: 9 },
        timelineVersion: 25,
      });
    const getVideo = jest.fn().mockResolvedValue({
      ...project,
      version: 8,
      timeline: {
        key: 'k',
        timelineVersion: 24,
        schemaVersion: 1,
        updatedAt: '2026-08-28T00:00:00.000Z',
      },
    });
    const { view } = renderEditor({ saveTimeline, getVideo });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();

    await waitFor(() => expect(saveTimeline).toHaveBeenCalledTimes(2));
    // rebasing only the row version left the timeline version stale, so the
    // retry conflicted exactly as the first attempt had
    expect(saveTimeline).toHaveBeenLastCalledWith(
      'project-1',
      expect.objectContaining({ timelineVersion: 24, version: 8 }),
    );
  });

  it('does not retry on a conflict that leaves the versions where they were', async () => {
    const saveTimeline = jest
      .fn()
      .mockRejectedValue(new ApiError(409, 'conflict', 'conflict'));
    const getVideo = jest.fn().mockResolvedValue({
      ...project,
      timeline: {
        key: 'k',
        timelineVersion: 4,
        schemaVersion: 1,
        updatedAt: '2026-08-28T00:00:00.000Z',
      },
    });
    const { view } = renderEditor({ saveTimeline, getVideo });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();

    expect(saveTimeline).toHaveBeenCalledTimes(1);
    expect(view.result.current.saveState).toBe('error');
  });

  it('reports a lost lease rather than rebasing', async () => {
    const saveTimeline = jest
      .fn()
      .mockRejectedValue(new ApiError(409, 'locked', 'locked', 'Bo'));
    const { view, onLeaseLost } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();

    await waitFor(() => expect(onLeaseLost).toHaveBeenCalledWith('Bo'));
  });
});

describe('the row version', () => {
  // a render bumps the row every few seconds, and only the poll hears about it;
  // an editor still holding the version it loaded with had every write refused
  it('follows the one the page has been handed', async () => {
    const saveTimeline = jest.fn().mockResolvedValue({
      video: { ...project, version: 13 },
      timelineVersion: 5,
    });
    const { view } = renderEditor({ saveTimeline });

    act(() => view.rerender({ version: 12 }));
    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();

    expect(saveTimeline).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ version: 12 }),
    );
  });

  it('ignores a version older than the one it holds', async () => {
    const saveTimeline = jest.fn().mockResolvedValue({
      video: { ...project, version: 13 },
      timelineVersion: 5,
    });
    const { view } = renderEditor({ saveTimeline });

    act(() => view.rerender({ version: 1 }));
    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();

    expect(saveTimeline).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({ version: 3 }),
    );
  });
});

describe('dirty', () => {
  it('is clean until something is edited', () => {
    const { view } = renderEditor({ saveTimeline: jest.fn() });

    expect(view.result.current.dirty).toBe(false);
  });

  it('reports an edit the server has not taken yet', () => {
    const { view } = renderEditor({ saveTimeline: jest.fn() });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));

    expect(view.result.current.dirty).toBe(true);
  });

  it('is clean again once the save lands', async () => {
    const saveTimeline = jest.fn().mockResolvedValue({
      video: { ...project, version: 4 },
      timelineVersion: 5,
    });
    const { view } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();

    await waitFor(() => expect(view.result.current.dirty).toBe(false));
  });
});

describe('the save state it reports', () => {
  // the debounce leaves nothing in flight and nothing saved, and holding the
  // last save's verdict there told the creator the new edit was safe
  it('stops saying saved the moment the next edit is made', async () => {
    const saveTimeline = jest.fn().mockResolvedValue({
      video: { ...project, version: 4 },
      timelineVersion: 5,
    });
    const { view } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();
    await waitFor(() => expect(view.result.current.saveState).toBe('saved'));

    act(() => view.result.current.dispatch(addClip('asset-2', 'clip-2')));

    expect(view.result.current.saveState).toBe('idle');
    expect(view.result.current.dirty).toBe(true);
  });
});

describe('discard', () => {
  // the flush on the way out would otherwise save the very edits the creator
  // just chose to abandon
  it('gives up the pending edits so nothing further is sent', async () => {
    const saveTimeline = jest.fn().mockResolvedValue({
      video: { ...project, version: 4 },
      timelineVersion: 5,
    });
    const { view } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    act(() => view.result.current.discard());

    expect(view.result.current.dirty).toBe(false);
    await settle();
    expect(saveTimeline).not.toHaveBeenCalled();
  });

  it('leaves the timeline on screen alone', () => {
    const { view } = renderEditor({ saveTimeline: jest.fn() });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    act(() => view.result.current.discard());

    expect(view.result.current.timeline.clips).toHaveLength(1);
  });
});

describe('a save that does not land', () => {
  // settling before the server has taken the edit hides it from every retry
  // path, and from the export button, which refuses to run while dirty
  it('stays dirty when the request fails', async () => {
    const saveTimeline = jest.fn().mockRejectedValue(new Error('offline'));
    const { view } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();

    expect(saveTimeline).toHaveBeenCalled();
    expect(view.result.current.dirty).toBe(true);
  });

  it('stays dirty when the server rejects the timeline', async () => {
    const saveTimeline = jest
      .fn()
      .mockRejectedValue(new ApiError(413, 'timeline_too_large'));
    const { view } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();

    expect(view.result.current.dirty).toBe(true);
  });

  // "retrying on the next edit" is what the header promises after a failure,
  // and a one-shot timer keyed on dirtiness never actually retried: one failed
  // save disarmed the autosave for the rest of the session
  it('keeps trying while the work is unsaved', async () => {
    const saveTimeline = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({
        video: { ...project, version: 4 },
        timelineVersion: 5,
      });
    const { view } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();
    expect(view.result.current.dirty).toBe(true);

    await settle();
    expect(saveTimeline.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(view.result.current.dirty).toBe(false);
  });

  // the render container bumps the row version every few seconds while it
  // reports progress, so a conflict that leaves the timeline version alone is
  // the common case, not an oddity
  it('carries the edit up again when only the row version moved', async () => {
    const saveTimeline = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(409, 'conflict'))
      .mockResolvedValue({
        video: { ...project, version: 9 },
        timelineVersion: 5,
      });
    const getVideo = jest.fn().mockResolvedValue({
      ...project,
      version: 8,
      timeline: { timelineVersion: 4 },
    });
    const { view } = renderEditor({ saveTimeline, getVideo });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await settle();

    await waitFor(() => expect(saveTimeline).toHaveBeenCalledTimes(2));
    expect(saveTimeline.mock.calls[1]?.[1]).toMatchObject({ version: 8 });
    await waitFor(() => expect(view.result.current.dirty).toBe(false));
  });
});

describe('discarding on the way out', () => {
  // discard dispatches, but the unmount that follows in the same click never
  // re-renders, so anything read from a render-assigned ref is still pre-discard
  it('does not save the abandoned edit when the editor unmounts', async () => {
    const saveTimeline = jest.fn().mockResolvedValue({
      video: { ...project, version: 4 },
      timelineVersion: 5,
    });
    const { view } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    act(() => {
      view.result.current.discard();
      view.unmount();
    });

    await settle();
    expect(saveTimeline).not.toHaveBeenCalled();
  });
});

describe('leaving the page', () => {
  const unload = async () => {
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload'));
    });
  };

  // awaiting the token before the fetch is an async boundary the unloading page
  // never comes back from, so the save has to be issued from a held token
  it('sends the pending edit with a token it already holds', async () => {
    const saveTimeline = jest.fn();
    const saveTimelineOnUnload = jest.fn();
    const { view } = renderEditor({ saveTimeline, saveTimelineOnUnload });
    await act(async () => {
      await Promise.resolve();
    });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    await unload();

    expect(saveTimelineOnUnload).toHaveBeenCalledWith(
      'project-1',
      'token',
      expect.objectContaining({ timelineVersion: 4, version: 3 }),
    );
    expect(saveTimeline).not.toHaveBeenCalled();
  });

  it('sends nothing when there is nothing to save', async () => {
    const saveTimelineOnUnload = jest.fn();
    renderEditor({ saveTimeline: jest.fn(), saveTimelineOnUnload });
    await act(async () => {
      await Promise.resolve();
    });

    await unload();

    expect(saveTimelineOnUnload).not.toHaveBeenCalled();
  });
});

describe('flushing twice over the same revision', () => {
  // "save and leave" flushes and then navigates, and the unmount that follows
  // flushed the identical document a second time
  it('puts the document up once', async () => {
    let land = (value: SavedTimeline) => value as unknown;
    const saveTimeline = jest.fn(
      () =>
        new Promise<SavedTimeline>((resolve) => {
          land = resolve;
        }),
    );
    const { view } = renderEditor({ saveTimeline });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    act(() => view.result.current.flush());
    act(() => view.unmount());
    await act(async () => {
      land({ video: { ...project, version: 4 }, timelineVersion: 5 });
    });

    expect(saveTimeline).toHaveBeenCalledTimes(1);
  });
});

describe('a drag', () => {
  // a pointer drag fires on every animation frame, so without a gesture each
  // sample became its own undo step and the 100 entry history was evicted by a
  // single move across the stage
  it('collapses into one undo step however many samples it takes', async () => {
    const { view } = renderEditor({ saveTimeline: jest.fn() });

    act(() => view.result.current.dispatch(addClip('asset-1', 'clip-1')));
    const before = view.result.current.timeline;

    act(() => {
      view.result.current.beginGesture();
      for (let i = 1; i <= 40; i += 1) {
        view.result.current.dispatch({
          type: 'setClipVolume',
          clipId: 'clip-1',
          volume: i / 40,
        });
      }
      view.result.current.endGesture();
    });

    expect(view.result.current.timeline.clips[0]).toMatchObject({ volume: 1 });

    act(() => view.result.current.undo());
    expect(view.result.current.timeline).toBe(before);
  });
});

describe('a trim drag over a zoom or a chapter', () => {
  const anchored = () => {
    const { view } = renderEditor({ saveTimeline: jest.fn() });
    act(() => {
      view.result.current.dispatch(addClip('asset-1', 'clip-1'));
      view.result.current.dispatch({
        type: 'addZoom',
        zoom: {
          id: 'zoom-1',
          clipId: 'clip-1',
          startMs: 4000,
          rampInMs: 100,
          holdMs: 400,
          rampOutMs: 100,
          focus: { x: 0.5, y: 0.5 },
          scale: 2,
          easing: 'easeInOut',
        },
      });
      view.result.current.dispatch({
        type: 'addChapter',
        id: 'ch-1',
        clipId: 'clip-1',
        offsetMs: 800,
        title: 'Login',
      });
    });
    return view;
  };

  const trim = (
    view: ReturnType<typeof anchored>,
    change: { inMs?: number; outMs?: number },
  ) =>
    act(() =>
      view.result.current.dispatch({
        type: 'trimClip',
        clipId: 'clip-1',
        ...change,
        assetDurationMs: 5000,
      }),
    );

  // the handle passing an anchor used to delete it on that pointer sample, and
  // dragging back had nothing left to bring with it
  it('gives back a zoom the out handle crossed and came off again', () => {
    const view = anchored();

    act(() => view.result.current.beginGesture());
    [4500, 3500, 3000, 4000, 5000].forEach((outMs) => trim(view, { outMs }));
    act(() => view.result.current.endGesture());

    expect(view.result.current.timeline.clips[0]).toMatchObject({
      inMs: 0,
      outMs: 5000,
    });
    expect(view.result.current.timeline.zooms).toEqual([
      expect.objectContaining({ id: 'zoom-1', startMs: 4000 }),
    ]);
  });

  it('gives back a chapter the in handle crossed and came off again', () => {
    const view = anchored();

    act(() => view.result.current.beginGesture());
    [200, 500, 900, 1200, 600, 0].forEach((inMs) => trim(view, { inMs }));
    act(() => view.result.current.endGesture());

    expect(view.result.current.timeline.clips[0]).toMatchObject({
      inMs: 0,
      outMs: 5000,
    });
    expect(view.result.current.timeline.chapters).toEqual([
      expect.objectContaining({ id: 'ch-1', offsetMs: 800 }),
    ]);
  });

  // the second drag is a fresh statement of where the handle is, so it has to be
  // read against what the first one left behind and not against what it opened on
  it('reads the next drag from where the last one ended', () => {
    const view = anchored();

    act(() => view.result.current.beginGesture());
    [200, 900].forEach((inMs) => trim(view, { inMs }));
    act(() => view.result.current.endGesture());
    expect(view.result.current.timeline.chapters).toEqual([]);

    act(() => view.result.current.beginGesture());
    trim(view, { inMs: 0 });
    act(() => view.result.current.endGesture());

    expect(view.result.current.timeline.chapters).toEqual([]);
    expect(view.result.current.timeline.zooms).toEqual([
      expect.objectContaining({ id: 'zoom-1', startMs: 4000 }),
    ]);
  });

  // each arrow key press commits on its own, with no gesture around it, so the
  // trim that cut the chapter away is an edit of its own to take back
  it('leaves a keyboard nudge past a chapter and back to undo', () => {
    const view = anchored();

    trim(view, { inMs: 900 });
    trim(view, { inMs: 0 });
    expect(view.result.current.timeline.chapters).toEqual([]);

    act(() => view.result.current.undo());
    act(() => view.result.current.undo());

    expect(view.result.current.timeline.chapters).toEqual([
      expect.objectContaining({ id: 'ch-1', offsetMs: 800 }),
    ]);
  });
});
