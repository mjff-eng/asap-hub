/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, FormEvent, useCallback, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { useApi } from '../api/ApiProvider';
import { useFolders } from '../api/hooks';
import type { CreatedUpload, UploadedPart } from '../api/types';
import { useIsCreator } from '../auth/MeContext';
import { Button, Card, Headline } from '../ui/components';
import {
  charcoal,
  ember,
  fern,
  lead,
  paper,
  rem,
  silver,
  steel,
} from '../ui/theme';
import { planParts, uploadParts } from '../studio/upload';
import { buildTree, flattenTree } from '../library/tree';

const cardStyles = css({ padding: rem(24), display: 'grid', gap: rem(20) });

const fieldStyles = css({ display: 'grid', gap: rem(4) });

const labelStyles = css({
  fontSize: rem(13),
  fontWeight: 'bold',
  color: lead.rgb,
});

const controlStyles = css({
  fontFamily: 'inherit',
  fontSize: rem(15),
  color: charcoal.rgb,
  padding: `${rem(10)} ${rem(12)}`,
  border: `1px solid ${steel.rgb}`,
  borderRadius: rem(4),
  backgroundColor: paper.rgb,
});

const rowStyles = css({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: rem(16),
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
});

const hintStyles = css({ fontSize: rem(14), color: lead.rgb, margin: 0 });

const errorStyles = css({ color: ember.rgb, fontSize: rem(14), margin: 0 });

const trackStyles = css({
  height: rem(8),
  borderRadius: rem(4),
  backgroundColor: silver.rgb,
  overflow: 'hidden',
});

const barStyles = css({ height: '100%', backgroundColor: fern.rgb });

const actionsStyles = css({
  display: 'flex',
  gap: rem(12),
  alignItems: 'center',
});

const ROOT_FOLDER = 'ROOT';

const toMegabytes = (bytes: number): string => (bytes / 1024 / 1024).toFixed(1);

const today = (): string => new Date().toISOString().slice(0, 10);

const titleFromFilename = (name: string): string =>
  name.replace(/\.[^.]+$/, '') || name;

type Phase = 'idle' | 'uploading' | 'error' | 'done';

const StudioUpload: FC = () => {
  const isCreator = useIsCreator();
  const api = useApi();
  const navigate = useNavigate();
  const folders = useFolders();

  const [file, setFile] = useState<File>();
  const [title, setTitle] = useState('');
  // the studio card names its demo itself: the button used to create a project
  // on the first click, so every stray one left an "Untitled demo" behind
  const [studioTitle, setStudioTitle] = useState('');
  const [folderId, setFolderId] = useState(ROOT_FOLDER);
  const [recordedAt, setRecordedAt] = useState(today);

  const [phase, setPhase] = useState<Phase>('idle');
  const [transferred, setTransferred] = useState(0);
  const [error, setError] = useState<string>();

  const abortRef = useRef<AbortController>();
  const uploadRef = useRef<CreatedUpload>();
  const partsRef = useRef<UploadedPart[]>([]);

  const run = useCallback(
    async (chosen: File) => {
      setPhase('uploading');
      setError(undefined);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const created =
          uploadRef.current ??
          (await api.createUpload({
            title: title.trim() || titleFromFilename(chosen.name),
            folderId: folderId === ROOT_FOLDER ? undefined : folderId,
            recordedAt: recordedAt || undefined,
          }));
        uploadRef.current = created;

        const allPlans = planParts(chosen.size, created.partSize);
        const uploaded = new Set(
          partsRef.current.map(({ partNumber }) => partNumber),
        );
        const remaining = allPlans.filter(
          ({ partNumber }) => !uploaded.has(partNumber),
        );

        if (remaining.length > 0) {
          const urls = await api.createPartUrls(
            created.videoId,
            created.uploadId,
            remaining.map(({ partNumber }) => partNumber),
          );

          await uploadParts({
            file: chosen,
            plans: remaining,
            urls,
            signal: controller.signal,
            onPartDone: (part, bytes) => {
              partsRef.current = [...partsRef.current, part];
              setTransferred((current) => current + bytes);
            },
          });
        }

        const ordered = [...partsRef.current].sort(
          (a, b) => a.partNumber - b.partNumber,
        );
        await api.completeUpload(created.videoId, created.uploadId, ordered);

        setPhase('done');
        void navigate(`/studio/videos/${created.videoId}`);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setPhase('error');
        setError(
          caught instanceof Error
            ? caught.message
            : 'The upload did not finish.',
        );
      }
    },
    [api, folderId, navigate, recordedAt, title],
  );

  if (!isCreator) return <Navigate to="/" replace />;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    void run(file);
  };

  const onCancel = () => {
    abortRef.current?.abort();
    const created = uploadRef.current;
    if (created) {
      void api
        .abortUpload(created.videoId, created.uploadId)
        .catch(() => undefined);
    }
    uploadRef.current = undefined;
    partsRef.current = [];
    setTransferred(0);
    setPhase('idle');
    setError(undefined);
  };

  const busy = phase === 'uploading' || phase === 'done';
  const percent = file && file.size > 0 ? (transferred / file.size) * 100 : 0;

  const startProject = async () => {
    const named = studioTitle.trim();
    if (!named) return;
    setError(undefined);
    try {
      const created = await api.createProject({
        title: named,
        folderId,
        recordedAt: new Date(recordedAt).toISOString(),
      });
      void navigate(`/studio/projects/${created.video.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not start the demo',
      );
    }
  };

  return (
    <>
      <Headline level={2}>Create a demo</Headline>
      <div css={{ height: rem(16) }} />

      <Card overrideStyles={cardStyles}>
        <div css={{ display: 'grid', gap: rem(12) }}>
          <Headline level={3}>Build one in the studio</Headline>
          <p css={{ margin: 0 }}>
            Name it, then bring in as many clips as you need and edit them on a
            timeline. The demo appears in the library as soon as you open the
            studio.
          </p>
          <label css={fieldStyles}>
            <span css={labelStyles}>Name</span>
            <input
              css={controlStyles}
              type="text"
              placeholder="Sprint 42 demo"
              disabled={busy}
              value={studioTitle}
              onChange={(event) => setStudioTitle(event.currentTarget.value)}
            />
          </label>
          <div>
            <Button
              primary
              disabled={busy || !studioTitle.trim()}
              onClick={startProject}
            >
              Open the studio
            </Button>
          </div>
        </div>
      </Card>

      <div css={{ height: rem(16) }} />
      <Headline level={3}>Or upload a finished video</Headline>
      <div css={{ height: rem(8) }} />

      <Card overrideStyles={cardStyles}>
        <form css={{ display: 'grid', gap: rem(20) }} onSubmit={onSubmit}>
          <label css={fieldStyles}>
            <span css={labelStyles}>Recording</span>
            <input
              css={controlStyles}
              type="file"
              accept="video/*"
              required
              disabled={busy}
              onChange={(event) => {
                const chosen = event.currentTarget.files?.[0];
                setFile(chosen);
                if (chosen && !title) setTitle(titleFromFilename(chosen.name));
              }}
            />
          </label>

          {file && (
            <p css={hintStyles} data-testid="file-summary">
              {file.name} &middot; {toMegabytes(file.size)} MB
            </p>
          )}

          <label css={fieldStyles}>
            <span css={labelStyles}>Title</span>
            <input
              css={controlStyles}
              type="text"
              required
              disabled={busy}
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
          </label>

          <div css={rowStyles}>
            <label css={fieldStyles}>
              <span css={labelStyles}>Folder</span>
              <select
                css={controlStyles}
                disabled={busy}
                value={folderId}
                onChange={(event) => setFolderId(event.currentTarget.value)}
              >
                <option value={ROOT_FOLDER}>Home</option>
                {flattenTree(buildTree(folders.data ?? [])).map(
                  ({ folder, depth }) => (
                    <option key={folder.id} value={folder.id}>
                      {`${'    '.repeat(depth)}${folder.name}`}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label css={fieldStyles}>
              <span css={labelStyles}>Recorded on</span>
              <input
                css={controlStyles}
                type="date"
                disabled={busy}
                value={recordedAt}
                onChange={(event) => setRecordedAt(event.currentTarget.value)}
              />
            </label>
          </div>

          {phase === 'uploading' && (
            <div css={{ display: 'grid', gap: rem(8) }}>
              <div
                css={trackStyles}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                aria-label="Upload progress"
              >
                <div css={[barStyles, { width: `${percent}%` }]} />
              </div>
              <p css={hintStyles}>
                {toMegabytes(transferred)} MB of {toMegabytes(file?.size ?? 0)}{' '}
                MB transferred
              </p>
            </div>
          )}

          {phase === 'error' && (
            <p css={errorStyles} role="alert">
              {error ?? 'The upload did not finish.'} Your finished parts were
              kept, so retrying resumes where it stopped.
            </p>
          )}

          <div css={actionsStyles}>
            {phase === 'error' ? (
              <Button
                primary
                onClick={() => {
                  if (file) void run(file);
                }}
              >
                Retry upload
              </Button>
            ) : (
              <Button primary type="submit" disabled={busy || !file}>
                {busy ? 'Uploading' : 'Start upload'}
              </Button>
            )}
            {(phase === 'uploading' || phase === 'error') && (
              <Button onClick={onCancel}>Cancel</Button>
            )}
          </div>
        </form>
      </Card>
    </>
  );
};

export default StudioUpload;
