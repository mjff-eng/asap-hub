/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';

import { ApiError, isLockedOut } from '../api/client';
import { useApi } from '../api/ApiProvider';
import {
  useDeleteVideo,
  useEditableVideo,
  usePublishVideo,
  useUnpublishVideo,
  useUpdateVideo,
  useVideoAccess,
} from '../api/hooks';
import type { Video, VideoAccess } from '../api/types';
import { useIsCreator } from '../auth/MeContext';
import ChapterTable from '../studio/ChapterTable';
import ChapterProgress from '../watch/ChapterProgress';
import {
  ChapterRow,
  collidesWith,
  insertAt,
  InvalidFields,
  snapFirstToZero,
  sortRows,
  toChapters,
  toRows,
  toSavableChapters,
} from '../studio/chapters';
import useEditLease from '../studio/useEditLease';
import { Badge, Button, Card, Headline, Spinner } from '../ui/components';
import {
  charcoal,
  ember,
  lead,
  overlay,
  paper,
  pearl,
  rem,
  silver,
  steel,
} from '../ui/theme';
import { formatDuration, parseTimecode } from '../utils/time';

const AUTOSAVE_MS = 1500;
const FRAME_MS = 1000 / 30;
const ROOT_FOLDER = 'ROOT';

const layoutStyles = css({ display: 'grid', gap: rem(16) });

const playerFrameStyles = css({
  backgroundColor: charcoal.rgb,
  borderRadius: rem(8),
  overflow: 'hidden',
  border: `1px solid ${steel.rgb}`,
});

const videoStyles = css({
  display: 'block',
  width: '100%',
  maxHeight: rem(420),
  aspectRatio: '16 / 9',
  backgroundColor: charcoal.rgb,
});

const headerRowStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(12),
  alignItems: 'center',
});

const titleInputStyles = css({
  fontFamily: 'inherit',
  fontSize: rem(24),
  fontWeight: 'bold',
  color: charcoal.rgb,
  padding: `${rem(6)} ${rem(8)}`,
  border: `1px solid transparent`,
  borderRadius: rem(4),
  backgroundColor: 'transparent',
  flexGrow: 1,
  minWidth: rem(240),
  ':hover:enabled, :focus': {
    borderColor: steel.rgb,
    backgroundColor: paper.rgb,
  },
});

const hintStripStyles = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: rem(16),
  fontSize: rem(13),
  color: lead.rgb,
  padding: `${rem(8)} ${rem(12)}`,
  backgroundColor: silver.rgb,
  borderRadius: rem(4),
});

const insertNoticeStyles = css({
  fontSize: rem(13),
  color: ember.rgb,
  padding: `0 ${rem(12)}`,
});

const keyStyles = css({
  fontFamily: 'monospace',
  fontWeight: 'bold',
  color: charcoal.rgb,
});

const footerStyles = css({
  position: 'sticky',
  bottom: 0,
  zIndex: 5,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: rem(12),
  padding: `${rem(12)} ${rem(16)}`,
  marginTop: rem(8),
  backgroundColor: paper.rgb,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(8),
});

const bannerStyles = css({
  padding: `${rem(12)} ${rem(16)}`,
  borderRadius: rem(8),
  backgroundColor: pearl.rgb,
  border: `1px solid ${steel.rgb}`,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: rem(12),
  fontSize: rem(14),
  color: charcoal.rgb,
});

const dialogStyles = css({
  position: 'fixed',
  inset: 0,
  zIndex: 20,
  display: 'grid',
  placeItems: 'center',
  backgroundColor: overlay.rgb,
  padding: rem(24),
});

const dialogPanelStyles = css({
  backgroundColor: paper.rgb,
  borderRadius: rem(8),
  padding: rem(24),
  maxWidth: rem(440),
  display: 'grid',
  gap: rem(16),
});

const statePanelStyles = css({
  padding: rem(40),
  display: 'grid',
  gap: rem(12),
  justifyItems: 'start',
});

const errorTextStyles = css({ color: ember.rgb, margin: 0, fontSize: rem(14) });

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type SaveExtras = { title?: string; folderId?: string };

const ConfirmDialog: FC<{
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}> = ({ title, body, confirmLabel, onConfirm, onCancel }) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel]);

  return (
    <div css={dialogStyles} role="dialog" aria-modal="true" aria-label={title}>
      <div css={dialogPanelStyles}>
        <Headline level={3}>{title}</Headline>
        <p css={{ margin: 0, color: lead.rgb }}>{body}</p>
        <div
          css={{ display: 'flex', gap: rem(12), justifyContent: 'flex-end' }}
        >
          <Button onClick={onCancel}>Cancel</Button>
          <Button ref={confirmRef} primary onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Editor: FC<{
  readonly video: Video;
  readonly access?: VideoAccess;
}> = ({ video, access }) => {
  const navigate = useNavigate();
  const api = useApi();
  const updateVideo = useUpdateVideo(video.id);
  const publishVideo = usePublishVideo(video.id);
  const unpublishVideo = useUnpublishVideo(video.id);
  const deleteVideo = useDeleteVideo(video.id);
  const { lease, retry, markLost } = useEditLease(video.id, true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const titleInputs = useRef(new Map<string, HTMLInputElement>());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const versionRef = useRef(video.version);

  const [rows, setRows] = useState<ChapterRow[]>(() => toRows(video.chapters));
  const [title, setTitle] = useState(video.title);
  const folderId = video.folderId || ROOT_FOLDER;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // what is wrong with the field, which is also what the row shows
  const [invalid, setInvalid] = useState<InvalidFields>({});
  const [endDrafts, setEndDrafts] = useState<Record<string, string>>({});
  const [endInvalid, setEndInvalid] = useState<InvalidFields>({});
  // why an insert did nothing: M and the row buttons have no field to hang an
  // inline error on, so the refusal is announced instead
  const [insertNotice, setInsertNotice] = useState<string>();
  const [focusedKey, setFocusedKey] = useState<string>();
  const [pendingFocusKey, setPendingFocusKey] = useState<string>();
  const [currentTime, setCurrentTime] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [confirming, setConfirming] = useState<
    'publish' | 'unpublish' | 'delete'
  >();

  const readOnly = lease.status !== 'held';

  useEffect(() => {
    versionRef.current = video.version;
  }, [video.version]);

  const { durationMs } = video;

  const activeKey = useMemo(() => {
    const currentMs = currentTime * 1000;
    let key: string | undefined;
    rows.forEach((row) => {
      if (row.startMs <= currentMs) key = row.key;
    });
    return key;
  }, [rows, currentTime]);

  // one save in flight at a time; an overlapping request would carry a stale
  // version and 409, and a self-conflict rebases once instead of locking out
  const inFlightRef = useRef(false);
  const pendingRef = useRef<{
    rows: ChapterRow[];
    extra: SaveExtras;
  } | null>(null);

  const doSave = useCallback(
    (payload: { rows: ChapterRow[]; extra: SaveExtras }, isRetry: boolean) => {
      const finish = () => {
        inFlightRef.current = false;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) doSave(pending, false);
      };
      inFlightRef.current = true;
      setSaveState('saving');
      updateVideo.mutate(
        {
          chapters: toSavableChapters(payload.rows),
          version: versionRef.current,
          ...payload.extra,
        },
        {
          onSuccess: (saved) => {
            versionRef.current = saved.version;
            setSaveState('saved');
            finish();
          },
          onError: (error) => {
            if (
              !isRetry &&
              error instanceof ApiError &&
              error.status === 409 &&
              error.code === 'conflict'
            ) {
              api
                .getVideo(video.id)
                .then((fresh) => {
                  versionRef.current = fresh.version;
                  doSave(payload, true);
                })
                .catch(() => {
                  setSaveState('error');
                  finish();
                });
              return;
            }
            if (isLockedOut(error)) {
              markLost(
                error instanceof ApiError ? error.holderName : undefined,
              );
              finish();
              return;
            }
            setSaveState('error');
            finish();
          },
        },
      );
    },
    [api, markLost, updateVideo, video.id],
  );

  const save = useCallback(
    (nextRows: ChapterRow[], extra: SaveExtras) => {
      const payload = { rows: nextRows, extra };
      if (inFlightRef.current) {
        pendingRef.current = payload;
        return;
      }
      doSave(payload, false);
    },
    [doSave],
  );

  const scheduleSave = useCallback(
    (nextRows: ChapterRow[], extra: SaveExtras) => {
      if (readOnly) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(nextRows, extra), AUTOSAVE_MS);
    },
    [readOnly, save],
  );

  const saveNow = useCallback(
    (nextRows: ChapterRow[]) => {
      if (readOnly) return;
      clearTimeout(saveTimer.current);
      save(nextRows, { title, folderId });
    },
    [folderId, readOnly, save, title],
  );

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useEffect(() => {
    if (!pendingFocusKey) return;
    titleInputs.current.get(pendingFocusKey)?.focus();
    setPendingFocusKey(undefined);
  }, [pendingFocusKey, rows]);

  const seekTo = useCallback((seconds: number) => {
    const element = videoRef.current;
    if (!element) return;
    const next = Math.max(0, seconds);
    element.currentTime = next;
    setCurrentTime(next);
  }, []);

  // state updaters stay pure: React may defer or replay them, so scheduling
  // saves inside one makes the debounce start at an unpredictable time
  const markChapter = useCallback(() => {
    if (readOnly) return;
    const startMs = (videoRef.current?.currentTime ?? currentTime) * 1000;
    const { rows: next, key, taken } = insertAt(rows, startMs);
    // the frame already carries a chapter, so marking it again asks for nothing
    // new: keep the one that is there and hand over its title instead
    setInsertNotice(
      taken
        ? `A chapter already starts at ${formatDuration(
            Math.max(0, Math.round(startMs)),
          )}. Its title is ready to edit.`
        : undefined,
    );
    setPendingFocusKey(key);
    if (taken) return;
    setRows(next);
    scheduleSave(next, { title, folderId });
  }, [currentTime, folderId, readOnly, rows, scheduleSave, title]);

  const nudge = useCallback((deltaMs: number) => {
    const element = videoRef.current;
    if (!element) return;
    const next = Math.max(0, element.currentTime + deltaMs / 1000);
    element.currentTime = next;
    setCurrentTime(next);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable === true;
      if (typing) return;

      // a focused control owns its own keys, and a dialog owns the whole page
      if (target?.closest('button, a[href], [role="dialog"]')) return;

      const element = videoRef.current;
      if (event.key === ' ') {
        event.preventDefault();
        if (!element) return;
        if (element.paused) void element.play()?.catch(() => undefined);
        else element.pause();
        return;
      }
      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        markChapter();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const step = event.shiftKey ? FRAME_MS : 1000;
        nudge(event.key === 'ArrowLeft' ? -step : step);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [markChapter, nudge]);

  // a start already taken is refused rather than deduped: typing 10:00 passes
  // through 1:00, and dropping whichever chapter sits there would take its title
  // with it halfway through a keystroke
  const onTimecodeChange = (key: string, value: string) => {
    setDrafts((current) => ({ ...current, [key]: value }));
    const parsed = parseTimecode(value);
    const taken = parsed !== undefined && collidesWith(rows, key, parsed);
    const message = taken
      ? 'Another chapter starts here'
      : parsed === undefined
        ? 'Use mm:ss or hh:mm:ss'
        : undefined;
    setInvalid((current) => ({ ...current, [key]: message }));
    if (parsed === undefined || message) return;
    const next = rows.map((row) =>
      row.key === key ? { ...row, startMs: parsed } : row,
    );
    setRows(next);
    scheduleSave(snapFirstToZero(next), { title, folderId });
  };

  const onTimecodeBlur = (key: string) => {
    setFocusedKey(undefined);
    setDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (invalid[key]) {
      setInvalid((current) => ({ ...current, [key]: undefined }));
      return;
    }
    const next = snapFirstToZero(rows);
    setRows(next);
    saveNow(next);
  };

  // chapters are contiguous, so editing an end time moves the next start
  const onEndChange = (key: string, value: string) => {
    setEndDrafts((current) => ({ ...current, [key]: value }));
    const parsed = parseTimecode(value);
    const index = rows.findIndex((row) => row.key === key);
    const row = rows[index];
    const nextRow = rows[index + 1];
    // this end is the next chapter's start, so it has to stay short of the
    // chapter after it or the two would share a start
    const afterNext = rows[index + 2];
    const overruns =
      parsed !== undefined &&
      afterNext !== undefined &&
      parsed >= afterNext.startMs;
    const valid =
      parsed !== undefined &&
      row !== undefined &&
      nextRow !== undefined &&
      parsed > row.startMs &&
      parsed <= durationMs &&
      !overruns;
    setEndInvalid((current) => ({
      ...current,
      [key]: valid
        ? undefined
        : overruns
          ? 'Must be before the next chapter'
          : 'Must be after the start',
    }));
    if (!valid || parsed === undefined || nextRow === undefined) return;
    const next = rows.map((r) =>
      r.key === nextRow.key ? { ...r, startMs: parsed } : r,
    );
    setRows(next);
    scheduleSave(snapFirstToZero(next), { title, folderId });
  };

  const onEndFocus = (key: string) => setFocusedKey(`end:${key}`);

  const onEndBlur = (key: string) => {
    setFocusedKey(undefined);
    setEndDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (endInvalid[key]) {
      setEndInvalid((current) => ({ ...current, [key]: undefined }));
      return;
    }
    const next = snapFirstToZero(rows);
    setRows(next);
    saveNow(next);
  };

  const onTitleChange = (key: string, value: string) => {
    const next = rows.map((row) =>
      row.key === key ? { ...row, title: value } : row,
    );
    setRows(next);
    scheduleSave(next, { title, folderId });
  };

  // new chapter lands midway between the row and its neighbouring boundary
  const insertNear = (key: string, where: 'before' | 'after') => {
    if (readOnly) return;
    const sorted = sortRows(rows);
    const index = sorted.findIndex((row) => row.key === key);
    const row = sorted[index];
    if (!row) return;
    const startMs =
      where === 'before'
        ? Math.max(
            0,
            Math.round(((sorted[index - 1]?.startMs ?? 0) + row.startMs) / 2),
          )
        : Math.round(
            (row.startMs + (sorted[index + 1]?.startMs ?? durationMs)) / 2,
          );
    const { rows: next, key: newKey, taken } = insertAt(rows, startMs);
    if (taken) {
      setInsertNotice(
        where === 'before' && index === 0
          ? 'The first chapter starts at the beginning of the video, so there is no room before it.'
          : 'The chapters either side are too close together to fit one between them.',
      );
      return;
    }
    setInsertNotice(undefined);
    setRows(next);
    setPendingFocusKey(newKey);
    scheduleSave(snapFirstToZero(next), { title, folderId });
  };

  const onDeleteRow = (key: string) => {
    const next = snapFirstToZero(rows.filter((row) => row.key !== key));
    setRows(next);
    scheduleSave(next, { title, folderId });
  };

  // Rows only reorder once the timecode field being edited loses focus.
  const displayRows = focusedKey ? rows : sortRows(rows);

  const titleRef = useCallback(
    (key: string) => (element: HTMLInputElement | null) => {
      if (element) titleInputs.current.set(key, element);
      else titleInputs.current.delete(key);
    },
    [],
  );

  const saveLabel = {
    idle: 'All changes saved',
    saving: 'Saving',
    saved: 'Saved',
    error: 'Could not save',
  }[saveState];

  return (
    <div css={layoutStyles}>
      <div css={headerRowStyles}>
        <input
          css={titleInputStyles}
          type="text"
          aria-label="Video title"
          disabled={readOnly}
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          onBlur={() => {
            if (readOnly || title === video.title) return;
            clearTimeout(saveTimer.current);
            save(rows, { title, folderId });
          }}
        />
        <Badge tone={video.status === 'published' ? 'neutral' : 'warning'}>
          {video.status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      </div>

      {lease.status === 'denied' && (
        <div css={bannerStyles} role="status">
          <span>
            Being edited by {lease.holderName ?? 'someone else'}. You can watch
            but not change anything.
          </span>
          <Button small onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {lease.status === 'lost' && (
        <div css={bannerStyles} role="alert">
          <span>
            Your edit lease was taken over
            {lease.holderName ? ` by ${lease.holderName}` : ''}. Reload to see
            the current chapters before editing again.
          </span>
          <Button small onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      )}

      {access && (
        <div css={playerFrameStyles}>
          <video
            ref={videoRef}
            css={videoStyles}
            controls
            preload="metadata"
            src={access.streamUrl}
            data-testid="studio-video"
            onTimeUpdate={(event) =>
              setCurrentTime(event.currentTarget.currentTime)
            }
          />
          {rows.length > 0 && durationMs > 0 && (
            <div css={{ padding: `${rem(6)} ${rem(10)} ${rem(10)}` }}>
              <ChapterProgress
                chapters={toChapters(sortRows(rows))}
                durationSeconds={durationMs / 1000}
                currentSeconds={currentTime}
                onSeek={seekTo}
                onPreview={() => undefined}
              />
            </div>
          )}
        </div>
      )}

      <div css={hintStripStyles}>
        <span>
          <span css={keyStyles}>Space</span> play or pause
        </span>
        <span>
          <span css={keyStyles}>M</span> mark a chapter here (when not typing in
          a field)
        </span>
        <span>
          <span css={keyStyles}>&larr; &rarr;</span> nudge 1s
        </span>
        <span>
          <span css={keyStyles}>Shift + &larr; &rarr;</span> nudge one frame
        </span>
        {!readOnly && (
          <span css={{ marginLeft: 'auto' }}>
            <Button small onClick={markChapter}>
              Add chapter at {formatDuration(Math.round(currentTime * 1000))}
            </Button>
          </span>
        )}
      </div>

      {/* always in the tree so a screen reader has the region to announce into */}
      <div role="status" css={insertNotice ? insertNoticeStyles : undefined}>
        {insertNotice}
      </div>

      <Card>
        <ChapterTable
          rows={displayRows}
          drafts={drafts}
          invalid={invalid}
          durationMs={durationMs}
          activeKey={activeKey}
          readOnly={readOnly}
          titleRef={titleRef}
          onSeek={(startMs) => seekTo(startMs / 1000)}
          onTimecodeChange={onTimecodeChange}
          onTimecodeFocus={setFocusedKey}
          onTimecodeBlur={onTimecodeBlur}
          endDrafts={endDrafts}
          endInvalid={endInvalid}
          onEndChange={onEndChange}
          onEndFocus={onEndFocus}
          onEndBlur={onEndBlur}
          onTitleChange={onTitleChange}
          onDelete={onDeleteRow}
          onInsertBefore={(key) => insertNear(key, 'before')}
          onInsertAfter={(key) => insertNear(key, 'after')}
        />
      </Card>

      <div css={footerStyles}>
        <div css={{ display: 'flex', gap: rem(12), alignItems: 'center' }}>
          <span
            css={{
              fontSize: rem(14),
              color: saveState === 'error' ? ember.rgb : lead.rgb,
            }}
            role="status"
          >
            {readOnly ? 'Read only' : saveLabel}
          </span>
          <span css={{ fontSize: rem(14), color: lead.rgb }}>
            {formatDuration(currentTime * 1000)} of {formatDuration(durationMs)}
          </span>
        </div>
        <div css={{ display: 'flex', gap: rem(12) }}>
          <Button disabled={readOnly} onClick={() => setConfirming('delete')}>
            Delete demo
          </Button>
          {video.status === 'published' && (
            <Button
              disabled={readOnly || saveState === 'saving'}
              onClick={() => setConfirming('unpublish')}
            >
              Unpublish
            </Button>
          )}
          <Button
            primary
            disabled={readOnly || saveState === 'saving'}
            onClick={() => setConfirming('publish')}
          >
            {video.status === 'published' ? 'Republish' : 'Publish'}
          </Button>
        </div>
      </div>

      {publishVideo.isError && (
        <p css={errorTextStyles} role="alert">
          We could not publish this demo. Try again.
        </p>
      )}

      {confirming === 'publish' && (
        <ConfirmDialog
          title={
            video.status === 'published' ? 'Republish demo' : 'Publish demo'
          }
          body={
            rows.length === 0
              ? `"${title}" has no chapters yet. Members will see it without any sections.`
              : `"${title}" will be visible to every member with ${
                  rows.length
                } ${rows.length === 1 ? 'chapter' : 'chapters'}.`
          }
          confirmLabel={video.status === 'published' ? 'Republish' : 'Publish'}
          onCancel={() => setConfirming(undefined)}
          onConfirm={() => {
            setConfirming(undefined);
            publishVideo.mutate(versionRef.current, {
              onSuccess: (saved) => {
                versionRef.current = saved.version;
              },
            });
          }}
        />
      )}

      {confirming === 'unpublish' && (
        <ConfirmDialog
          title="Unpublish demo"
          body={`"${title}" will go back to draft and disappear for members until it is published again.`}
          confirmLabel="Unpublish"
          onCancel={() => setConfirming(undefined)}
          onConfirm={() => {
            setConfirming(undefined);
            unpublishVideo.mutate(versionRef.current, {
              onSuccess: (saved) => {
                versionRef.current = saved.version;
              },
            });
          }}
        />
      )}

      {confirming === 'delete' && (
        <ConfirmDialog
          title="Delete demo"
          body={`"${title}" and its recording will be removed for everyone. This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirming(undefined)}
          onConfirm={() => {
            setConfirming(undefined);
            deleteVideo.mutate(undefined, {
              onSuccess: () => navigate('/'),
            });
          }}
        />
      )}
    </div>
  );
};

const StudioVideo: FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const isCreator = useIsCreator();
  const video = useEditableVideo(id);
  const ready = video.data?.processingState === 'ready';
  const access = useVideoAccess(ready ? id : '');

  if (!isCreator) return <Navigate to="/" replace />;

  if (video.isLoading) return <Spinner label="Loading demo" />;

  if (video.isError || !video.data) {
    return (
      <Card overrideStyles={statePanelStyles}>
        <Headline level={3}>We could not load this demo</Headline>
        <Button
          onClick={() => {
            void video.refetch();
          }}
        >
          Retry
        </Button>
      </Card>
    );
  }

  // a studio project belongs in the editor: it has no upload to encode, and
  // this page would otherwise show it as forever processing
  if (video.data.kind === 'studio') {
    return <Navigate to={`/studio/projects/${id}`} replace />;
  }

  const { processingState, processingError, title } = video.data;

  if (processingState === 'failed') {
    return (
      <>
        <Headline level={2}>{title}</Headline>
        <div css={{ height: rem(16) }} />
        <Card overrideStyles={statePanelStyles}>
          <Headline level={3}>This demo failed to process</Headline>
          <p css={errorTextStyles}>
            {processingError ?? 'The recording could not be encoded.'}
          </p>
        </Card>
      </>
    );
  }

  if (processingState !== 'ready') {
    return (
      <>
        <Headline level={2}>{title}</Headline>
        <div css={{ height: rem(16) }} />
        <Card overrideStyles={statePanelStyles}>
          <Headline level={3}>
            {processingState === 'uploading'
              ? 'This demo is still uploading'
              : 'This demo is still processing'}
          </Headline>
          <p css={{ color: lead.rgb, margin: 0 }}>
            Chapters can be marked as soon as encoding finishes. This page
            updates itself.
          </p>
          <Spinner label="Checking every few seconds" />
        </Card>
      </>
    );
  }

  return <Editor video={video.data} access={access.data} />;
};

export default StudioVideo;
