import {
  CaptureEvent,
  CaptureSurface,
  deriveCursorEffects,
  mergeDerivedEffects,
  parseCaptureEvents,
  sliceCaptureEvents,
} from '@asap-hub/demo-timeline';
import { useCallback, useEffect, useState } from 'react';
import { useApi } from '../../api/ApiProvider';
import { CaptureStreamError } from '../../api/captureStream';
import { ApiError } from '../../api/client';
import { RecordingSession, RecordingSessionStatus } from '../../api/types';
import {
  CaptureApplied,
  CaptureClipTarget,
  CaptureRequest,
} from './cursorPlacement';

const pollMs = 5000;

// The raw stream stays immutable in S3. This turns it into ordinary timeline
// items once, and every later edit of those items is the creator's, not ours.
// The session lives on the server for hours, but it used to live only in this
// hook's state, so a page reload stranded every event already captured: no
// session meant no status, and no status disabled the button that applies them.
const sessionKey = (projectId: string) => `demo-hub.capture.${projectId}`;

// which session's events reached this browser has to outlive the page for the
// same reason the session does: held in state alone, every reload forgot it,
// and a reopen that cannot tell a spent session from an unread one refuses
// both, so the next take posted into a closed session the server drops
const readKey = (projectId: string) => `demo-hub.capture.${projectId}.read`;

// a session stored before the bookmark named the project carries a loader for
// that one take, and saving it again would bring the old trouble back
const reusableBookmark = (session: RecordingSession): RecordingSession =>
  session.snippetUrl?.includes('#project.')
    ? session
    : { ...session, snippetUrl: undefined };

const storedSession = (projectId: string): RecordingSession | undefined => {
  try {
    const raw = window.localStorage.getItem(sessionKey(projectId));
    return raw
      ? reusableBookmark(JSON.parse(raw) as RecordingSession)
      : undefined;
  } catch {
    return undefined;
  }
};

const rememberSession = (
  projectId: string,
  session: RecordingSession | undefined,
): void => {
  try {
    if (session) {
      window.localStorage.setItem(
        sessionKey(projectId),
        JSON.stringify(session),
      );
    } else {
      window.localStorage.removeItem(sessionKey(projectId));
      // the marker names a session nothing points at any more
      window.localStorage.removeItem(readKey(projectId));
    }
  } catch {
    // a browser refusing storage is not a reason to refuse the capture
  }
};

const storedReadSessionId = (projectId: string): string | undefined => {
  try {
    return window.localStorage.getItem(readKey(projectId)) ?? undefined;
  } catch {
    return undefined;
  }
};

const rememberRead = (projectId: string, sessionId: string): void => {
  try {
    window.localStorage.setItem(readKey(projectId), sessionId);
  } catch {
    // a browser refusing storage is not a reason to refuse the capture
  }
};

const megabytes = (bytes: number | undefined): string =>
  bytes === undefined ? 'too large' : `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

const closeFailure = (cause: unknown): string =>
  cause instanceof ApiError
    ? `Could not close the capture (${cause.status}). Nothing is lost, try Add cursor effects again.`
    : 'Could not close the capture. Nothing is lost, try Add cursor effects again.';

// Asking for the stream and downloading it are two requests that fail for quite
// different reasons, and they used to end in one message that sent the creator
// back to a button which could never work. Each half names itself and carries
// its status, because through the CDN an object that was never written and a
// cookie that was refused both answer 403.
const readFailure = (cause: unknown): string => {
  if (cause instanceof ApiError) {
    if (cause.code === 'not_finalised') {
      return 'That capture is still being saved. Wait a few seconds and press Add cursor effects again.';
    }
    if (cause.code === 'stream_missing') {
      return 'That capture closed without writing its events, so there is nothing to add. Record the take again.';
    }
    return `Could not ask for the captured events (${cause.status}). Nothing is lost, try Add cursor effects again.`;
  }
  if (cause instanceof CaptureStreamError) {
    if (cause.reason === 'too_large') {
      return `That capture is ${megabytes(
        cause.bytes,
      )} of events, more than the studio can download here. It is safe on the server, but pressing again will not reach it: ask an engineer for the stream.`;
    }
    if (cause.reason === 'missing') {
      return 'That capture closed without writing its events, so there is nothing to add. Record the take again.';
    }
    return `Could not download the captured events (storage ${
      cause.cdnStatus ?? 'unreachable'
    }, api ${
      cause.inlineStatus ?? 'unreachable'
    }). Nothing is lost, try Add cursor effects again.`;
  }
  return 'Could not read the captured events. Nothing is lost, try Add cursor effects again.';
};

// `recorded` is what the browser said the last take was a recording of. The
// capture snippet cannot know it: it runs in the page being demoed and has no
// idea whether the creator handed over that tab, this window or the whole
// screen, and each of those puts the page somewhere different in the frame.
export const useCursorCapture = (
  projectId: string,
  recorded?: CaptureSurface,
) => {
  const api = useApi();
  const [session, setSession] = useState<RecordingSession | undefined>(() =>
    storedSession(projectId),
  );
  const [status, setStatus] = useState<RecordingSessionStatus>();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string>();
  // the session whose events reached this browser, so a closed one that never
  // did is not mistaken for a spent one
  const [readSessionId, setReadSessionId] = useState<string | undefined>(() =>
    storedReadSessionId(projectId),
  );

  const start = useCallback(() => {
    setError(undefined);
    api
      .startCapture(projectId)
      .then((started) => {
        rememberSession(projectId, started);
        setSession(started);
        // the fresh session's own poll answers for it; the old one's closed
        // state must not linger on it
        setStatus(undefined);
      })
      .catch(() => setError('Could not start the cursor capture.'));
  }, [api, projectId]);

  // the bookmark is handed out the once it is minted, so a creator who lost
  // theirs asks for another; it is kept on the session the panel is showing,
  // which is what survives a reload
  const newBookmark = useCallback(() => {
    setError(undefined);
    api
      .newCaptureBookmark(projectId)
      .then(({ snippetUrl }) => {
        setSession((current) => {
          if (!current) {
            return current;
          }
          const next = { ...current, snippetUrl, bookmarkReady: true };
          rememberSession(projectId, next);
          return next;
        });
      })
      .catch(() => setError('Could not make a new capture bookmark.'));
  }, [api, projectId]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }
    // a poll for the old session can land after the session changed, and its
    // stale closed state on a fresh session set off another needless reopen
    let cancelled = false;
    const poll = () => {
      api
        .captureStatus(projectId, session.sessionId)
        .then((next) => {
          if (cancelled) {
            return;
          }
          setStatus(next);
          // a restored session the server has since let go would leave a dead
          // panel, so it is dropped and the creator can start another
          if (next.state === 'expired') {
            rememberSession(projectId, undefined);
          }
        })
        .catch((cause) => {
          if (cancelled) {
            return;
          }
          // only a session the server no longer knows is really gone; a
          // network blip or a 500 must not throw away a live capture
          const gone =
            cause instanceof ApiError &&
            (cause.status === 404 || cause.status === 410);
          if (!gone) {
            return;
          }
          rememberSession(projectId, undefined);
          setSession(undefined);
          setStatus(undefined);
        });
    };
    poll();
    const handle = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [api, projectId, session]);

  // one session collects every take made before the creator applies, so the
  // stream is cut per clip: each target with a take start and a length gets
  // exactly the events its footage was filming, and an event that fell between
  // takes lands on no clip at all
  const deriveTarget = useCallback(
    (
      target: CaptureClipTarget,
      events: CaptureEvent[],
      frame: CaptureRequest['frame'],
    ): CaptureApplied | undefined => {
      if (events.length === 0) {
        return undefined;
      }
      // the clip's own take is what its events were filming, and one session
      // spans several takes, so `recorded` only answers for a clip that kept no
      // surface of its own
      const surface = target.surface ?? recorded;
      const derived = deriveCursorEffects(events, {
        frame,
        surface,
        ...(target.startedAtEpochMs
          ? { startedAtEpochMs: target.startedAtEpochMs }
          : {}),
        ...(target.pauses?.length ? { pauses: target.pauses } : {}),
        ...(target.source ? { source: target.source } : {}),
      });
      const merged = mergeDerivedEffects(target.existing, derived.effects);
      return {
        clipId: target.clipId,
        path: derived.path,
        effects: merged.effects,
        ...(surface ? { surface } : {}),
      };
    },
    [recorded],
  );

  const apply = useCallback(
    async (request: CaptureRequest): Promise<CaptureApplied[] | undefined> => {
      if (!session || request.targets.length === 0) {
        return undefined;
      }
      setApplying(true);
      setError(undefined);
      try {
        const takeStarts = request.targets.flatMap((target) =>
          target.startedAtEpochMs ? [target.startedAtEpochMs] : [],
        );
        try {
          await api.finaliseCapture(projectId, session.sessionId, {
            ...(takeStarts.length
              ? { startedAtEpochMs: Math.min(...takeStarts) }
              : {}),
            stoppedAtEpochMs: request.stoppedAtEpochMs,
          });
        } catch (cause) {
          // an earlier apply already closed it, which is fine; anything else
          // leaves the session open on the server with every event intact, so
          // it must NOT be marked closed here: that would let the auto reopen
          // replace it and strand the whole take
          const closedBefore =
            cause instanceof ApiError && cause.code === 'already_finalised';
          if (!closedBefore) {
            setError(closeFailure(cause));
            return undefined;
          }
        }
        // saying the session is spent is what lets the next recording open a
        // fresh one without waiting on the poll
        const spend = () => {
          rememberRead(projectId, session.sessionId);
          setReadSessionId(session.sessionId);
          setStatus((current) =>
            current
              ? { ...current, state: 'closed' }
              : { state: 'closed', eventCount: 0, clientCount: 0 },
          );
        };

        let ndjson: string;
        try {
          ndjson = await api.captureEvents(projectId, session.sessionId);
        } catch (cause) {
          // the finalise landed, so every event is safe on the server; what the
          // creator can do about it depends on which half gave way, and the
          // client logs the statuses on its way out of here
          //
          // the guard that holds an unread session back is there because the
          // take is safe on the server, and a stream the server itself says was
          // never written is the one case where that is untrue: holding on to
          // it would wedge the studio for a session with nothing behind it
          if (
            (cause instanceof ApiError && cause.code === 'stream_missing') ||
            (cause instanceof CaptureStreamError && cause.reason === 'missing')
          ) {
            spend();
          }
          setError(readFailure(cause));
          return undefined;
        }
        // the events are in hand, which is what spends the session, and a
        // session read is a session safe to replace
        spend();

        const events = parseCaptureEvents(ndjson);
        if (events.length === 0) {
          setError('That capture recorded nothing to add.');
          return undefined;
        }

        const windows = request.targets.flatMap((target) =>
          target.startedAtEpochMs && target.durationMs !== undefined
            ? [
                {
                  clipId: target.clipId,
                  recordedAtEpochMs: target.startedAtEpochMs,
                  durationMs: target.durationMs,
                  ...(target.pauses?.length ? { pauses: target.pauses } : {}),
                },
              ]
            : [],
        );
        const sliced = sliceCaptureEvents(events, windows);

        const applied = request.targets.flatMap((target) => {
          const own = windows.some((window) => window.clipId === target.clipId)
            ? sliced.get(target.clipId) ?? []
            : events;
          const result = deriveTarget(target, own, request.frame);
          return result ? [result] : [];
        });

        if (applied.length === 0) {
          setError('That capture has no events during any recorded take.');
          return undefined;
        }
        return applied;
      } catch {
        setError('Could not turn the capture into cursor effects.');
        return undefined;
      } finally {
        setApplying(false);
      }
    },
    [api, deriveTarget, projectId, session],
  );

  // a closed session whose events were never read still holds the whole take,
  // and a fresh one would overwrite the only id that still reaches it
  const unreadEvents = Boolean(
    session &&
      status?.state === 'closed' &&
      readSessionId !== session.sessionId,
  );

  // a new recording needs a session that is still taking events; a session
  // spent by an earlier apply is replaced without the creator doing anything,
  // and a project that never tracked the cursor is left alone
  const ensureOpen = useCallback(() => {
    if (!session || !status || status.state === 'open' || unreadEvents) {
      return;
    }
    start();
  }, [session, start, status, unreadEvents]);

  return {
    session,
    status,
    applying,
    error,
    unreadEvents,
    start,
    newBookmark,
    apply,
    ensureOpen,
  };
};
