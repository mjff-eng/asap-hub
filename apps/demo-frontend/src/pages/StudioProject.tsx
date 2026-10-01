/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { timelineDurationMs } from '@asap-hub/demo-timeline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FC, useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';

import { useApi } from '../api/ApiProvider';
import { ApiError } from '../api/client';
import {
  useEditableVideo,
  usePublishVideo,
  useUnpublishVideo,
  useUpdateVideo,
} from '../api/hooks';
import type { ProjectAsset, Video } from '../api/types';
import { useIsCreator } from '../auth/MeContext';
import ProjectEditor from '../studio/editor/ProjectEditor';
import ProjectHeader from '../studio/editor/ProjectHeader';
import { AssetUpload, useAssetUpload } from '../studio/editor/useAssetUpload';
import RenderBar from '../studio/editor/RenderBar';
import CapturePanel from '../studio/recording/CapturePanel';
import RecorderPanel from '../studio/recording/RecorderPanel';
import VoiceOverPanel from '../studio/recording/VoiceOverPanel';
import { useCursorCapture } from '../studio/recording/useCursorCapture';
import {
  microphoneRecordingSupport,
  screenRecordingSupport,
} from '../studio/recording/mediaCapabilities';
import {
  TakeResult,
  useRecordingTake,
} from '../studio/recording/useRecordingTake';
import { useVoiceRecorder } from '../studio/recording/useVoiceRecorder';
import { createId } from '../studio/project/ids';
import { useLeaveGuard } from '../studio/project/useLeaveGuard';
import { useProjectEditor } from '../studio/project/useProjectEditor';
import useEditLease from '../studio/useEditLease';
import { editorTheme } from '../studio/editor/editorTheme';
import { Button, Modal } from '../ui/components';
import { ember, lead, rem } from '../ui/theme';

const layoutStyles = css({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
});

const errorStyles = css({ color: ember.rgb, margin: 0, fontSize: rem(13) });

const centredStyles = css({ padding: rem(24) });

const skeletonStyles = css({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: rem(10),
  padding: rem(10),
  minHeight: 0,
  backgroundColor: editorTheme.panel,
});

const skeletonBlockStyles = css({
  borderRadius: rem(6),
  backgroundColor: editorTheme.raised,
  border: `1px solid ${editorTheme.line}`,
});

const skeletonBarStyles = css(skeletonBlockStyles, { height: rem(48) });

const skeletonStageStyles = css(skeletonBlockStyles, { flex: 1 });

const skeletonTimelineStyles = css(skeletonBlockStyles, { height: rem(140) });

const skeletonLabelStyles = css({
  margin: 0,
  fontSize: rem(13),
  color: editorTheme.muted,
});

// the studio is a whole page of chrome and the two queries behind it can take a
// while, so its shape is on screen before the document is
const StudioSkeleton: FC = () => (
  <div css={skeletonStyles}>
    <div css={skeletonBarStyles} />
    <div css={skeletonStageStyles} />
    <div css={skeletonTimelineStyles} />
    <p css={skeletonLabelStyles} role="status">
      Loading the demo
    </p>
  </div>
);

const assetPollMs = 3000;

const dialogTitleStyles = css({ margin: 0, fontSize: rem(18) });

const dialogBodyStyles = css({ margin: 0, color: lead.rgb, fontSize: rem(14) });

const dialogActionsStyles = css({
  display: 'flex',
  gap: rem(8),
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
});

const noop = () => undefined;

// the codes the render route answers with, in the words of the thing the
// creator has to do about each one
const renderRefusals: Record<string, string> = {
  render_active: 'An export is already running for this demo.',
  asset_not_ready:
    'A recording is still being prepared. Give it a moment, then export.',
  empty_timeline: 'Add a clip before exporting.',
  locked: 'Someone else is editing this demo, so it cannot be exported.',
  conflict: 'This demo changed somewhere else. Try the export again.',
  not_found: 'This demo is no longer there.',
  render_start_failed: 'The export could not be started. Try again.',
  unknown_clip: 'A picked clip is gone from the timeline. Pick again.',
  invalid_cut:
    'This pick would split more banners and takes than a demo can hold. Pick fewer clips.',
};

const renderRefusal = (cause: unknown): string =>
  (cause instanceof ApiError && cause.code
    ? renderRefusals[cause.code]
    : undefined) ?? 'Could not start the export.';

// locally the assets are served straight from MinIO through the Vite proxy, and
// in the deployed stack from the same CloudFront path behind a signed cookie
const assetUrlOf =
  (projectId: string) =>
  (asset: ProjectAsset): string | undefined =>
    asset.url ??
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(
      asset.assetId,
    )}/original.mp4`;

const StudioProject: FC = () => {
  const { id = '' } = useParams();
  const isCreator = useIsCreator();
  const api = useApi();
  const queryClient = useQueryClient();

  const video = useEditableVideo(id);
  const timelineQuery = useQuery({
    queryKey: ['project-timeline', id],
    queryFn: () => api.getTimeline(id),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
  const assetsQuery = useQuery({
    queryKey: ['project-assets', id],
    queryFn: () => api.listAssets(id),
    enabled: Boolean(id),
    // The ingest runs in a container and writes the probed duration back onto
    // the asset, so the editor keeps asking until nothing is in flight. It also
    // keeps asking while the timeline names a source this list has never seen:
    // a recording puts its clip up before the list has caught up, and polling
    // only on what is already listed left that clip unplayable until a reload.
    refetchInterval: (query) => {
      const listed = query.state.data;
      const inFlight = listed?.some(
        (asset) => asset.state === 'uploading' || asset.state === 'preparing',
      );
      const known = new Set((listed ?? []).map((asset) => asset.assetId));
      const missing = (timelineQuery.data?.timeline.clips ?? []).some(
        (clip) => clip.kind === 'source' && !known.has(clip.assetId),
      );
      return inFlight || missing ? assetPollMs : false;
    },
  });

  const { lease, retry, markLost } = useEditLease(id, Boolean(id));
  const readOnly = lease.status !== 'held';

  const upload = useAssetUpload(id);
  const [assetError, setAssetError] = useState<string>();

  const refreshAssets = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['project-assets', id] }),
    [id, queryClient],
  );

  const refreshVideo = useCallback(
    (fresh: Video) => queryClient.setQueryData(['video', id], fresh),
    [id, queryClient],
  );

  const onImport = useCallback(
    (file: File) => {
      void upload.importFile(file).then(() => refreshAssets());
    },
    [refreshAssets, upload],
  );

  const onImportAudio = useCallback(
    (file: File) => {
      void upload.importFile(file, 'audio').then(() => refreshAssets());
    },
    [refreshAssets, upload],
  );

  // a rejected rename leaves the typed name on screen looking saved, so the
  // panel is refreshed either way and the reason is shown
  const onRenameAsset = useCallback(
    (asset: ProjectAsset, label: string) => {
      setAssetError(undefined);
      void api
        .renameAsset(id, asset.assetId, label)
        .catch((cause: unknown) =>
          setAssetError(
            cause instanceof ApiError && cause.code === 'locked'
              ? 'Someone else is editing this demo, so the sources cannot be renamed.'
              : 'Could not rename that source.',
          ),
        )
        .finally(refreshAssets);
    },
    [api, id, refreshAssets],
  );

  const onDeleteAsset = useCallback(
    (asset: ProjectAsset) => {
      setAssetError(undefined);
      void api
        .deleteAsset(id, asset.assetId)
        .catch((cause: unknown) =>
          setAssetError(
            cause instanceof ApiError && cause.code === 'asset_in_use'
              ? 'That source is still used on the timeline. Remove its clips first.'
              : 'Could not remove that source.',
          ),
        )
        .finally(refreshAssets);
    },
    [api, id, refreshAssets],
  );

  if (!isCreator) {
    return <Navigate to="/" replace />;
  }

  if (video.isLoading || timelineQuery.isLoading) {
    return <StudioSkeleton />;
  }

  if (!video.data || !timelineQuery.data) {
    return (
      <p css={[errorStyles, centredStyles]}>This demo could not be loaded.</p>
    );
  }

  if (video.data.kind !== 'studio') {
    return <Navigate to={`/studio/videos/${id}`} replace />;
  }

  return (
    <Editor
      id={id}
      video={video.data}
      timeline={timelineQuery.data.timeline}
      timelineVersion={timelineQuery.data.timelineVersion}
      assets={assetsQuery.data ?? []}
      readOnly={readOnly}
      leasePending={lease.status === 'pending'}
      leaseHolder={
        lease.status === 'denied' || lease.status === 'lost'
          ? lease.holderName
          : undefined
      }
      markLost={markLost}
      retryLease={retry}
      onImport={onImport}
      onImportAudio={onImportAudio}
      assetError={assetError}
      onRenameAsset={onRenameAsset}
      onDeleteAsset={onDeleteAsset}
      upload={upload}
      onAssetsChanged={refreshAssets}
      onVideoChanged={refreshVideo}
      assetUrl={assetUrlOf(id)}
    />
  );
};

type EditorProps = {
  readonly id: string;
  readonly video: NonNullable<ReturnType<typeof useEditableVideo>['data']>;
  readonly timeline: Parameters<typeof useProjectEditor>[0]['timeline'];
  readonly timelineVersion: number;
  readonly assets: ProjectAsset[];
  readonly readOnly: boolean;
  readonly leasePending?: boolean;
  readonly leaseHolder?: string;
  readonly markLost: (holderName?: string) => void;
  readonly retryLease: () => void;
  readonly onImport: (file: File) => void;
  readonly onImportAudio: (file: File) => void;
  readonly assetError?: string;
  readonly onRenameAsset: (asset: ProjectAsset, label: string) => void;
  readonly onDeleteAsset: (asset: ProjectAsset) => void;
  readonly upload: AssetUpload;
  readonly onAssetsChanged: () => void;
  readonly onVideoChanged: (video: Video) => void;
  readonly assetUrl: (asset: ProjectAsset) => string | undefined;
};

// the editor only mounts once the document is in hand, so its reducer can be
// seeded with the real timeline instead of an empty one it has to replace
const Editor: FC<EditorProps> = ({
  id,
  video,
  timeline,
  timelineVersion,
  assets,
  readOnly,
  leasePending,
  leaseHolder,
  markLost,
  retryLease,
  onImport,
  onImportAudio,
  assetError,
  onRenameAsset,
  onDeleteAsset,
  upload,
  onAssetsChanged,
  onVideoChanged,
  assetUrl,
}) => {
  const api = useApi();
  const editor = useProjectEditor({
    id,
    timeline,
    timelineVersion,
    version: video.version,
    readOnly,
    onLeaseLost: markLost,
  });

  // a finished take lands as a clip at the end, with its microphone track
  // starting at the same point on the voice over lane
  const onTake = useCallback(
    ({
      video: recorded,
      durationMs,
      startedAtEpochMs,
      pauses,
      surface,
      narration,
    }: TakeResult) => {
      const clipId = createId('clip');
      const startMs = timelineDurationMs(editor.timeline.clips);
      // the clip and its voice over arrived together, so one Ctrl+Z takes
      // both back rather than leaving an orphan narration on the lane
      editor.beginGesture();
      editor.dispatch({
        type: 'addClip',
        assetId: recorded.assetId,
        durationMs: recorded.durationMs ?? durationMs,
        clipId,
        recordedAtEpochMs: startedAtEpochMs,
        recordedDurationMs: durationMs,
        recordedPauses: pauses,
        surface,
      });
      if (narration) {
        editor.dispatch({
          type: 'addNarration',
          narration: {
            id: createId('narration'),
            assetId: narration.assetId,
            startMs,
            inMs: 0,
            outMs: narration.durationMs ?? durationMs,
            volume: 1,
          },
        });
      }
      editor.endGesture();
      onAssetsChanged();
    },
    [editor, onAssetsChanged],
  );

  const take = useRecordingTake(upload, onTake);

  // the voice over has a grace of its own, because narrating needs a breath
  // where a screen take needs time to reach the tab being demoed
  const [voiceCountdownMs, setVoiceCountdownMs] = useState(3000);
  const voice = useVoiceRecorder({ countdownMs: voiceCountdownMs });
  const [savingVoice, setSavingVoice] = useState(false);

  // the finished take becomes an asset first, then the editor drops it on the
  // voice over lane at the playhead
  const saveVoice = useCallback(
    async (addAsset: (asset: ProjectAsset) => void) => {
      const recorded = await voice.stop();
      if (!recorded) {
        return;
      }
      setSavingVoice(true);
      try {
        const asset = await upload.uploadBlob({
          blob: recorded.blob,
          label: `Voice over ${new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          extension: recorded.extension,
          mimeType: recorded.mimeType,
          kind: 'audio',
        });
        if (asset) {
          onAssetsChanged();
          addAsset({
            ...asset,
            durationMs: asset.durationMs ?? recorded.durationMs,
          });
        }
      } finally {
        setSavingVoice(false);
      }
    },
    [onAssetsChanged, upload, voice],
  );

  // the recorder knows what the picker was pointed at, and the capture in the
  // page being demoed cannot: it is the same take, read from the two ends
  const capture = useCursorCapture(id, take.displaySurface);
  // the apply button used to do nothing at all on an empty timeline
  const [applyRefusal, setApplyRefusal] = useState<string>();

  // A project that tracks the cursor keeps a session open while the studio is,
  // so the tab being demoed shows up as connected before a recording starts
  // rather than after: the demo tab's reporter keeps sending, and only an open
  // session counts it. A project that never tracked the cursor is left alone.
  const { ensureOpen } = capture;
  useEffect(() => {
    if (!readOnly) {
      ensureOpen();
    }
  }, [ensureOpen, readOnly]);

  // the autosave debounce means a departure can outrun the last edit, so the
  // studio asks rather than losing it quietly. A read only editor is asked too:
  // nothing flushes those edits on the way out, so leaving is the end of them
  const navigate = useNavigate();
  const leaving = useLeaveGuard(editor.dirty);

  const [renderError, setRenderError] = useState<string>();
  const [confirmingExport, setConfirmingExport] = useState(false);
  // the one click that changes who can see the demo gets a beat of thought
  const [confirmingPublish, setConfirmingPublish] = useState(false);

  // the export writes to the same row the autosave does, so it takes the
  // version the editor holds and hands the one it gets back straight to it
  const applyWrite = useCallback(
    (fresh: Video) => {
      onVideoChanged(fresh);
      editor.rebase(fresh.version);
    },
    [editor, onVideoChanged],
  );

  // every refusal has a reason the creator can act on, and a page that has not
  // heard about the render or the version behind it can only be put right by
  // reading the row again
  const startRender = useCallback(() => {
    setConfirmingExport(false);
    setRenderError(undefined);
    setPublishError(undefined);
    // no flush here: the button is only live once the document is settled, and
    // a save from this point would move the version the render is about to send
    api
      .startRender(id, editor.version)
      .then(applyWrite)
      .catch((cause: unknown) => {
        setRenderError(renderRefusal(cause));
        void api.getVideo(id).then(applyWrite).catch(noop);
      });
  }, [api, applyWrite, editor.version, id]);

  const exported = video.processingState === 'ready';

  // the picked clips render like any export, into a directory of their own,
  // and the row's render map is what carries the progress back
  const [downloadStarting, setDownloadStarting] = useState(false);
  const startDownload = useCallback(
    (clipIds: string[]) => {
      // a double click must not race itself for the row version
      if (downloadStarting) {
        return;
      }
      setDownloadStarting(true);
      setRenderError(undefined);
      setPublishError(undefined);
      api
        .startRender(id, editor.version, clipIds)
        .then(applyWrite)
        .catch((cause: unknown) => {
          setRenderError(renderRefusal(cause));
          void api.getVideo(id).then(applyWrite).catch(noop);
        })
        .finally(() => setDownloadStarting(false));
    },
    [api, applyWrite, downloadStarting, editor.version, id],
  );

  // the access call plants the signed media cookies first, because the file
  // lives behind the same door the demo itself does
  const saveDownload = useCallback(() => {
    const path = video.render?.downloadPath;
    if (!path) {
      return;
    }
    const url = `/media/${id}/${path}/stream.mp4`;
    setRenderError(undefined);
    api
      .requestAccess(id)
      // the cut ages out of storage on its own, so the file is asked about
      // before the save: a plain anchor would save the 404 page as an .mp4
      .then(() => fetch(url, { method: 'HEAD', credentials: 'include' }))
      .then((response) => {
        if (!response.ok) {
          setRenderError(
            'That cut has expired. Pick the clips again to make a fresh one.',
          );
          return;
        }
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${video.title || 'clips'}.mp4`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      })
      .catch(() => setRenderError('Could not fetch the clips file.'));
  }, [api, id, video.render?.downloadPath, video.title]);

  // a second export replaces the demo that is already out there, and for a
  // published one that is what people are watching right now
  const requestRender = useCallback(() => {
    if (exported) {
      setConfirmingExport(true);
      return;
    }
    startRender();
  }, [exported, startRender]);

  const cancelRender = useCallback(() => {
    api
      .cancelRender(id, editor.version)
      .then(applyWrite)
      .catch((cause: unknown) => {
        setRenderError(
          cause instanceof ApiError && cause.code === 'render_inactive'
            ? 'That export has already finished.'
            : 'Could not cancel the export.',
        );
        void api.getVideo(id).then(applyWrite).catch(noop);
      });
  }, [api, applyWrite, editor.version, id]);

  const updateVideo = useUpdateVideo(id);
  const publishVideo = usePublishVideo(id);
  const unpublishVideo = useUnpublishVideo(id);
  const [publishError, setPublishError] = useState<string>();

  // these write to the same guarded row the timeline does, so they take the
  // editor's version and hand the one that comes back straight back to it
  const write = useCallback(
    (run: (version: number) => Promise<Video>, failure: string): void => {
      setPublishError(undefined);
      run(editor.version)
        .then((fresh) => editor.rebase(fresh.version))
        .catch(() => setPublishError(failure));
    },
    [editor],
  );

  const rename = useCallback(
    (title: string) =>
      write(
        (version) => updateVideo.mutateAsync({ title, version }),
        'Could not rename this demo.',
      ),
    [updateVideo, write],
  );

  const publish = useCallback(
    () =>
      write(
        (version) => publishVideo.mutateAsync(version),
        'Could not publish this demo.',
      ),
    [publishVideo, write],
  );

  const unpublish = useCallback(
    () =>
      write(
        (version) => unpublishVideo.mutateAsync(version),
        'Could not unpublish this demo.',
      ),
    [unpublishVideo, write],
  );
  const recorderApi =
    typeof MediaRecorder === 'undefined' ? undefined : MediaRecorder;
  const support = screenRecordingSupport(navigator.mediaDevices, recorderApi);
  const micSupport = microphoneRecordingSupport(
    navigator.mediaDevices,
    recorderApi,
  );

  return (
    <div css={layoutStyles}>
      <ProjectHeader
        video={video}
        readOnly={readOnly}
        leasePending={leasePending}
        leaseHolder={leaseHolder}
        dirty={editor.dirty}
        notice={renderError ?? publishError ?? upload.error}
        onLeave={() => leaving.request(() => navigate('/'))}
        onRetryLease={retryLease}
        onRename={rename}
        onPublish={() => setConfirmingPublish(true)}
        onUnpublish={unpublish}
      >
        <RenderBar
          videoId={id}
          render={video.render}
          status={video.status}
          hasOutput={exported}
          // an export started while a save is in flight would race it for the
          // row version and lose, so it waits for the timeline to settle
          canRender={
            editor.timeline.clips.length > 0 &&
            !editor.dirty &&
            editor.saveState !== 'saving'
          }
          readOnly={readOnly}
          onLeave={() => leaving.request(() => navigate(`/videos/${id}`))}
          onRender={requestRender}
          onCancel={cancelRender}
          onSaveDownload={saveDownload}
        />
      </ProjectHeader>
      <ProjectEditor
        editor={editor}
        onDownloadClips={readOnly ? undefined : startDownload}
        canDownload={!editor.dirty && editor.saveState !== 'saving'}
        downloadBusy={
          downloadStarting ||
          video.render?.state === 'queued' ||
          video.render?.state === 'rendering'
        }
        recorder={(addAsset, applyCursorCapture) => (
          <>
            <RecorderPanel
              status={take.status}
              elapsedMs={take.elapsedMs}
              countdownMsLeft={take.countdownMsLeft}
              countdownMs={take.countdownMs}
              error={take.error}
              withMicrophone={take.withMicrophone}
              readOnly={readOnly}
              unsupportedReason={support.supported ? undefined : support.reason}
              onCountdownChange={take.setCountdownMs}
              onMicrophoneChange={take.setWithMicrophone}
              onStart={() => {
                // a capture spent by an earlier apply is replaced on the spot,
                // so stopping and recording again keeps the bookmark working
                // without the creator thinking about sessions
                capture.ensureOpen();
                take.start().catch(() => undefined);
              }}
              onStartNow={take.startNow}
              onCancel={take.cancel}
              onPause={take.pause}
              onResume={take.resume}
              onStop={() => {
                take.stop().catch(() => undefined);
              }}
            />
            <VoiceOverPanel
              status={voice.status}
              elapsedMs={voice.elapsedMs}
              countdownMs={voiceCountdownMs}
              countdownMsLeft={voice.countdownMsLeft}
              onCountdownChange={setVoiceCountdownMs}
              error={voice.error}
              saving={savingVoice}
              readOnly={readOnly}
              unsupportedReason={
                micSupport.supported ? undefined : micSupport.reason
              }
              onStart={() => {
                voice.start().catch(() => undefined);
              }}
              onStartNow={voice.startNow}
              onCancel={voice.cancel}
              onStop={() => {
                saveVoice(addAsset).catch(() => undefined);
              }}
            />
            <CapturePanel
              session={capture.session}
              status={capture.status}
              readOnly={readOnly}
              unreadEvents={capture.unreadEvents}
              applying={capture.applying}
              error={capture.error ?? applyRefusal}
              onStart={capture.start}
              onNewBookmark={capture.newBookmark}
              onApply={() =>
                setApplyRefusal(
                  applyCursorCapture(capture.apply)
                    ? undefined
                    : 'Add a clip to the timeline first, then add the cursor effects to it.',
                )
              }
            />
          </>
        )}
        assets={assets}
        readOnly={readOnly}
        assetUrl={assetUrl}
        onImport={onImport}
        onImportAudio={onImportAudio}
        assetError={assetError}
        onRenameAsset={onRenameAsset}
        onDeleteAsset={onDeleteAsset}
        uploading={upload.busy}
        uploadProgress={upload.progress}
      />

      {leaving.asking && (
        <Modal onClose={leaving.stay} label="Unsaved changes">
          <h2 css={dialogTitleStyles}>You have unsaved changes</h2>
          <p css={dialogBodyStyles}>
            {readOnly
              ? 'These edits were made after the editing lock was lost, so they cannot be saved. Leaving loses them.'
              : 'The last few edits have not reached the server yet. Save them, or leave them behind and go back to the demos.'}
          </p>
          <div css={dialogActionsStyles}>
            <Button small onClick={leaving.stay}>
              Stay here
            </Button>
            <Button
              small
              onClick={() => {
                editor.discard();
                leaving.discard();
              }}
            >
              Discard and leave
            </Button>
            {readOnly ? null : (
              <Button
                small
                primary
                onClick={() => {
                  editor.flush();
                  leaving.discard();
                }}
              >
                Save and leave
              </Button>
            )}
          </div>
        </Modal>
      )}

      {confirmingPublish && (
        <Modal
          onClose={() => setConfirmingPublish(false)}
          label="Publish this demo"
        >
          <h2 css={dialogTitleStyles}>Publish this demo?</h2>
          <p css={dialogBodyStyles}>
            Anyone signed in will be able to watch it, download it whole, and
            download each chapter on its own.
          </p>
          <div css={dialogActionsStyles}>
            <Button small onClick={() => setConfirmingPublish(false)}>
              Not yet
            </Button>
            <Button
              small
              primary
              onClick={() => {
                setConfirmingPublish(false);
                publish();
              }}
            >
              Publish
            </Button>
          </div>
        </Modal>
      )}
      {confirmingExport && (
        <Modal
          onClose={() => setConfirmingExport(false)}
          label="Export this demo again"
        >
          <h2 css={dialogTitleStyles}>Export this demo again?</h2>
          <p css={dialogBodyStyles}>
            {video.status === 'published'
              ? 'The new export replaces the demo members are watching now, as soon as it lands.'
              : 'The new export replaces the one you exported before, as soon as it lands.'}
          </p>
          <div css={dialogActionsStyles}>
            <Button small onClick={() => setConfirmingExport(false)}>
              Keep the current one
            </Button>
            <Button small primary onClick={startRender}>
              Export again
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudioProject;
