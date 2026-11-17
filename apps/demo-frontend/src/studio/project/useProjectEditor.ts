import { Timeline } from '@asap-hub/demo-timeline';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useApi } from '../../api/ApiProvider';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { TimelineAction, timelineReducer } from './timelineReducer';
import {
  canRedo,
  canUndo,
  History,
  initialHistory,
  record,
  redo,
  replace,
  undo,
} from './undo';

export const autosaveMs = 1500;
const maxConflictRetries = 5;

// 'rejected' is terminal: the server said this document can never be saved as
// it stands, so retrying on a clock would only hammer the API with the same
// refusal every 1.5 seconds forever
export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'rejected';

type EditorState = {
  history: History<Timeline>;
  // the revision the server is believed to hold; anything else is unsaved
  settled: Timeline;
  timelineVersion: number;
  version: number;
  saveState: SaveState;
  // a gesture is one continuous thing the creator is doing, such as a drag;
  // every frame after the first replaces the last rather than stacking up
  gesture: boolean;
  gestureRecorded: boolean;
  // what the timeline looked like when the gesture opened: a drag restates the
  // whole edit on every pointer move, so each frame is read against this rather
  // than against the frame before it
  gestureOrigin?: Timeline;
};

type EditorEvent =
  | { type: 'edit'; action: TimelineAction }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'beginGesture' }
  | { type: 'endGesture' }
  | { type: 'settle'; timeline: Timeline }
  | { type: 'saving' }
  | { type: 'saved'; timelineVersion: number; version: number }
  | { type: 'saveFailed' }
  | { type: 'saveRejected' }
  | { type: 'rebase'; version: number; timelineVersion?: number };

const editorReducer = (state: EditorState, event: EditorEvent): EditorState => {
  switch (event.type) {
    case 'edit': {
      const next = timelineReducer(
        state.history.present,
        event.action,
        state.gestureOrigin,
      );
      if (next === state.history.present) {
        return state;
      }
      const continuing = state.gesture && state.gestureRecorded;
      return {
        ...state,
        // a fresh edit changes the document, so a terminal refusal gets one
        // more chance with whatever the creator just did about it
        saveState: state.saveState === 'rejected' ? 'idle' : state.saveState,
        gestureRecorded: state.gesture,
        history: continuing
          ? replace(state.history, next)
          : record(state.history, next),
      };
    }

    case 'settle':
      return { ...state, settled: event.timeline };

    case 'beginGesture':
      return {
        ...state,
        gesture: true,
        gestureRecorded: false,
        gestureOrigin: state.history.present,
      };

    case 'endGesture':
      return {
        ...state,
        gesture: false,
        gestureRecorded: false,
        gestureOrigin: undefined,
      };

    case 'undo':
      return canUndo(state.history)
        ? { ...state, history: undo(state.history) }
        : state;

    case 'redo':
      return canRedo(state.history)
        ? { ...state, history: redo(state.history) }
        : state;

    case 'saving':
      return { ...state, saveState: 'saving' };

    case 'saved':
      return {
        ...state,
        saveState: 'saved',
        timelineVersion: event.timelineVersion,
        version: event.version,
      };

    case 'saveRejected':
      return { ...state, saveState: 'rejected' };

    case 'saveFailed':
      return { ...state, saveState: 'error' };

    case 'rebase':
      return {
        ...state,
        version: event.version,
        timelineVersion: event.timelineVersion ?? state.timelineVersion,
      };

    default:
      return state;
  }
};

type Options = {
  id: string;
  timeline: Timeline;
  timelineVersion: number;
  version: number;
  readOnly: boolean;
  onLeaseLost: (holderName?: string) => void;
};

export type ProjectEditor = {
  timeline: Timeline;
  saveState: SaveState;
  // edits the server has not taken yet, which is not the same as 'saving':
  // for the length of the debounce there is nothing in flight and nothing saved
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  // every autosave moves the row on, so anything else that writes to the video
  // has to condition on this rather than on the version the page loaded with
  version: number;
  dispatch: (action: TimelineAction) => void;
  beginGesture: () => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;
  rebase: (version: number) => void;
  flush: () => void;
  // give up on the edits the server has not taken; the last saved revision
  // stands and nothing further is sent, not even by the flush on the way out
  discard: () => void;
};

// the save model is the one already proven by the chapter editor: debounce, one
// request in flight, and rebase once on a version conflict rather than clobber
export const useProjectEditor = ({
  id,
  timeline,
  timelineVersion,
  version,
  readOnly,
  onLeaseLost,
}: Options): ProjectEditor => {
  const api = useApi();
  const { getToken } = useAuth();
  const [state, send] = useReducer(editorReducer, undefined, () => ({
    history: initialHistory(timeline),
    settled: timeline,
    timelineVersion,
    version,
    saveState: 'idle' as SaveState,
    gesture: false,
    gestureRecorded: false,
  }));

  const savingRef = useRef(false);
  const pendingRef = useRef<Timeline>();
  const inFlightRef = useRef<Timeline>();
  const stateRef = useRef(state);
  stateRef.current = state;
  const dirtyRef = useRef(false);

  // settling is what makes an edit stop counting as unsaved, so it happens only
  // once the server has taken it, and against the revision that was actually
  // sent rather than whatever is on screen by the time the reply lands
  const markSettled = useCallback((settled: Timeline) => {
    stateRef.current = { ...stateRef.current, settled };
    send({ type: 'settle', timeline: settled });
  }, []);

  // The versions a request must carry live in a ref, not in the reducer state.
  // A save queued behind another one runs inside the first one's `finally`,
  // before React has re-rendered with the result, so reading them from state
  // sent the version the server had already moved past and every save from then
  // on came back 409.
  const versionsRef = useRef({ timelineVersion, version });
  const conflictsRef = useRef(0);

  // A render reports its progress onto the same row every few seconds, so by the
  // time it is over the version the editor holds is many writes behind and every
  // write it tries next is refused. The poll is the only place that news
  // arrives; without this the creator had to reload before exporting again.
  useEffect(() => {
    if (savingRef.current || version <= versionsRef.current.version) {
      return;
    }
    versionsRef.current = { ...versionsRef.current, version };
    send({ type: 'rebase', version });
  }, [version]);

  const save = useCallback(
    async (next: Timeline): Promise<void> => {
      if (savingRef.current) {
        // "save and leave" flushes, then the unmount that follows flushes the
        // same revision again; queueing it would put the identical document up
        // to the server twice
        if (next !== inFlightRef.current) {
          pendingRef.current = next;
        }
        return;
      }
      savingRef.current = true;
      inFlightRef.current = next;
      send({ type: 'saving' });

      try {
        const saved = await api.saveTimeline(id, {
          timeline: next,
          ...versionsRef.current,
        });
        versionsRef.current = {
          timelineVersion: saved.timelineVersion,
          version: saved.video.version,
        };
        conflictsRef.current = 0;
        markSettled(next);
        send({ type: 'saved', ...versionsRef.current });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          if (error.code === 'locked') {
            onLeaseLost(error.holderName);
          } else {
            // Another writer moved the document on. Both versions have to come
            // back: rebasing only the row version left the timeline version
            // stale, so the retry conflicted exactly as the first attempt did.
            const fresh = await api.getVideo(id).catch(() => undefined);
            if (fresh) {
              const rebased = {
                timelineVersion:
                  fresh.timeline?.timelineVersion ??
                  versionsRef.current.timelineVersion,
                version: fresh.version,
              };
              // Either version moving is a real conflict worth retrying. The
              // row version alone moves constantly, because a render reports
              // its progress onto the same row every few seconds; treating that
              // as "nothing changed" threw the edit away.
              const moved =
                rebased.timelineVersion !==
                  versionsRef.current.timelineVersion ||
                rebased.version !== versionsRef.current.version;
              versionsRef.current = rebased;
              send({ type: 'rebase', ...rebased });
              conflictsRef.current += 1;
              // bounded, so a row something else is writing to in a loop cannot
              // turn one edit into an endless stream of saves
              if (moved && conflictsRef.current <= maxConflictRetries) {
                pendingRef.current = next;
              }
            }
          }
        }
        // a 413 or a 400 will refuse the identical document every time; only
        // an edit that changes it can help, so the retry clock stands down
        if (
          error instanceof ApiError &&
          (error.status === 413 || error.status === 400)
        ) {
          send({ type: 'saveRejected' });
        } else {
          send({ type: 'saveFailed' });
        }
      } finally {
        savingRef.current = false;
        const queued = pendingRef.current;
        pendingRef.current = undefined;
        if (queued) {
          void save(queued);
        }
      }
    },
    [api, id, markSettled, onLeaseLost],
  );

  const dirty = state.history.present !== state.settled;

  // An edit is unsaved the second it is made, so the last save's verdict must
  // not stand for the length of the debounce: it told the creator the work was
  // safe while the save button beside it was offering to save it. A read only
  // editor reports nothing at all, because there is no edit left to make and
  // "retrying on the next edit" is an instruction nobody can follow; the header
  // explains the lock instead.
  const reportedSaveState: SaveState =
    readOnly || (dirty && state.saveState === 'saved')
      ? 'idle'
      : state.saveState;

  const flush = useCallback(() => {
    const { history, settled } = stateRef.current;
    if (history.present === settled) {
      return;
    }
    void save(history.present);
  }, [save]);

  // the refs are written during render, and the click that discards usually
  // unmounts the editor in the same commit, so an unmount cleanup reading them
  // would still see the abandoned edit and dutifully save it
  const discard = useCallback(() => {
    markSettled(stateRef.current.history.present);
    dirtyRef.current = false;
    pendingRef.current = undefined;
  }, [markSettled]);

  // An interval rather than a one-shot timer: `dirty` can stay true across a
  // whole save, when the save fails or when edits kept coming while it was in
  // flight, and a timer keyed on `dirty` alone never rescheduled after that.
  // One failed save then silently disarmed the autosave for the whole session.
  const rejected = state.saveState === 'rejected';
  useEffect(() => {
    if (readOnly || !dirty || rejected) {
      return undefined;
    }
    const handle = setInterval(flush, autosaveMs);
    return () => clearInterval(handle);
  }, [dirty, flush, readOnly, rejected]);

  // Leaving inside the debounce window used to drop the last edit silently, and
  // the lease is handed on regardless, so the next editor would open a document
  // quietly missing it. beforeunload runs before the lease is released.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  dirtyRef.current = dirty && !readOnly;

  // the unloading page will not wait on a token promise, so one is kept here
  // ready to be spent synchronously
  const tokenRef = useRef<string>();
  const holdToken = useCallback(() => {
    void getToken()
      .then((token) => {
        tokenRef.current = token;
      })
      .catch(() => undefined);
  }, [getToken]);

  useEffect(holdToken, [holdToken]);

  useEffect(() => {
    const onLeaving = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) {
        return;
      }
      const token = tokenRef.current;
      if (token) {
        api.saveTimelineOnUnload(id, token, {
          timeline: stateRef.current.history.present,
          ...versionsRef.current,
        });
      } else {
        flushRef.current();
      }
      event.preventDefault();
      // eslint-disable-next-line no-param-reassign
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeaving);
    return () => {
      window.removeEventListener('beforeunload', onLeaving);
      // navigating within the app still has a live page, so this one lands
      if (dirtyRef.current) {
        flushRef.current();
      }
    };
  }, [api, id]);

  const dispatch = useCallback(
    (action: TimelineAction) => send({ type: 'edit', action }),
    [],
  );
  const beginGesture = useCallback(() => send({ type: 'beginGesture' }), []);
  const endGesture = useCallback(() => send({ type: 'endGesture' }), []);
  const undoEdit = useCallback(() => send({ type: 'undo' }), []);
  const redoEdit = useCallback(() => send({ type: 'redo' }), []);
  // the export and the publish write to the same row, so they hand back the
  // version they left it on
  const rebase = useCallback((nextVersion: number) => {
    versionsRef.current = {
      ...versionsRef.current,
      version: nextVersion,
    };
    send({ type: 'rebase', version: nextVersion });
  }, []);

  return useMemo(
    () => ({
      timeline: state.history.present,
      saveState: reportedSaveState,
      dirty,
      canUndo: canUndo(state.history),
      canRedo: canRedo(state.history),
      version: state.version,
      dispatch,
      beginGesture,
      endGesture,
      undo: undoEdit,
      redo: redoEdit,
      rebase,
      flush,
      discard,
    }),
    [
      beginGesture,
      dirty,
      discard,
      dispatch,
      endGesture,
      flush,
      rebase,
      redoEdit,
      reportedSaveState,
      state.history,
      state.version,
      undoEdit,
    ],
  );
};
