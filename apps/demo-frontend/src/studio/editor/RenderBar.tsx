/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, useRef } from 'react';
import { Link } from 'react-router';
import { RenderJob, VideoStatus } from '../../api/types';
import EditorButton from './EditorButton';
import { formatDuration } from './geometry';
import { EtaSample, etaLabel, etaMs, withSample } from './renderEta';
import { editorTheme } from './editorTheme';

const barStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginLeft: 'auto',
  flexWrap: 'wrap',
});

const statusStyles = css({ fontSize: 13, color: editorTheme.muted });

// both spans are inline by default, and an inline box ignores width: the
// fill's percentage never drew at all, so a working render read as stuck
const trackStyles = css({
  display: 'inline-block',
  width: 120,
  height: 6,
  borderRadius: 3,
  backgroundColor: editorTheme.line,
  overflow: 'hidden',
});

const fillStyles = css({
  display: 'block',
  height: '100%',
  backgroundColor: editorTheme.playhead,
  transition: 'width 400ms linear',
});

const errorStyles = css({ fontSize: 13, color: editorTheme.record });

const linkStyles = css({
  fontSize: 13,
  color: editorTheme.playhead,
  textDecoration: 'none',
  ':hover': { textDecoration: 'underline' },
});

// the container reports its own stage names, and for the per step work it
// reports the step's label, such as "clip 0 (source asset-1)"
export const stageLabel = (stage: string): string => {
  if (stage.startsWith('clip ')) {
    return 'Rendering the clips';
  }
  // stitching a tiled clip back together, and cutting and blending the pieces
  // the join copies, are all billed to the join and read as it
  if (
    ['join ', 'assemble ', 'cut clip ', 'blend clip '].some((prefix) =>
      stage.startsWith(prefix),
    )
  ) {
    return 'Joining the timeline';
  }
  return (
    {
      sources: 'Fetching the sources',
      sprite: 'Building the preview images',
      upload: 'Uploading the demo',
    }[stage] ?? 'Rendering'
  );
};

const draftStyles = css({ fontSize: 13, color: editorTheme.muted });

// how long the last render ran, from the row's own timestamps; absent when
// either end is missing or unreadable, so the bar never shows nonsense
export const renderTookLabel = (render?: RenderJob): string | undefined => {
  if (render?.state !== 'done' || !render.requestedAt || !render.finishedAt) {
    return undefined;
  }
  const tookMs = Date.parse(render.finishedAt) - Date.parse(render.requestedAt);
  if (!Number.isFinite(tookMs) || tookMs <= 0) {
    return undefined;
  }
  const noun = render.purpose === 'download' ? 'Cut ready' : 'Exported';
  return `${noun} in ${formatDuration(tookMs)}.`;
};

// exporting and publishing are two different things and the buttons alone read
// as one, so the bar says who can see the demo as it stands
export const whoCanSeeIt = (
  hasOutput: boolean,
  status: VideoStatus,
): string => {
  if (!hasOutput) {
    return 'Draft. Exporting makes a video other creators can watch, but not members.';
  }
  return status === 'published'
    ? 'Published. Anyone signed in can watch it.'
    : 'Exported. Creators can watch it. Publish it for everyone else.';
};

// the pace is measured off the progress the container reports, so the label
// is honest about whatever machine is actually rendering
const useRenderEta = (render?: RenderJob): string | undefined => {
  const held = useRef<{ renderId?: string; samples: EtaSample[] }>({
    samples: [],
  });
  const busy = render?.state === 'queued' || render?.state === 'rendering';
  if (!busy || !render) {
    held.current = { samples: [] };
    return undefined;
  }
  if (held.current.renderId !== render.renderId) {
    held.current = { renderId: render.renderId, samples: [] };
  }
  held.current.samples = withSample(
    held.current.samples,
    render.progress ?? 0,
    Date.now(),
  );
  const remaining = etaMs(held.current.samples, Date.now());
  return remaining === undefined ? undefined : etaLabel(remaining);
};

type Props = {
  readonly videoId: string;
  readonly render?: RenderJob;
  readonly status: VideoStatus;
  readonly hasOutput: boolean;
  readonly canRender: boolean;
  readonly readOnly: boolean;
  // false means the guard has taken over and the link must not navigate
  readonly onLeave: () => boolean;
  readonly onRender: () => void;
  readonly onCancel: () => void;
  // fetches the finished picked-clips cut as a file to save
  readonly onSaveDownload: () => void;
};

const RenderBar: FC<Props> = ({
  videoId,
  render,
  status,
  hasOutput,
  canRender,
  readOnly,
  onLeave,
  onRender,
  onCancel,
  onSaveDownload,
}) => {
  const busy = render?.state === 'queued' || render?.state === 'rendering';
  const download = render?.purpose === 'download';
  const eta = useRenderEta(render);

  if (busy) {
    const progress = render?.progress ?? 0;
    return (
      <div css={barStyles}>
        <span css={statusStyles}>
          {download
            ? 'Preparing the picked clips'
            : render?.stage
              ? stageLabel(render.stage)
              : 'Queued'}
          {eta ? ` · ${eta}` : ''}
        </span>
        <span
          css={trackStyles}
          role="progressbar"
          aria-valuenow={progress}
          aria-label={download ? 'Download progress' : 'Export progress'}
        >
          <span css={fillStyles} style={{ width: `${progress}%` }} />
        </span>
        <EditorButton disabled={readOnly} onClick={onCancel}>
          Cancel
        </EditorButton>
      </div>
    );
  }

  const failureWord = download ? 'Download' : 'Export';
  return (
    <div css={barStyles}>
      {render?.state === 'failed' ? (
        <span css={errorStyles}>
          {render.error
            ? `${failureWord} failed: ${render.error}`
            : `${failureWord} failed`}
        </span>
      ) : null}
      {renderTookLabel(render) ? (
        <span css={statusStyles}>{renderTookLabel(render)}</span>
      ) : null}
      {download && render?.state === 'done' && render.downloadPath ? (
        <EditorButton onClick={onSaveDownload}>
          Save the picked clips
        </EditorButton>
      ) : null}
      <span css={draftStyles}>{whoCanSeeIt(hasOutput, status)}</span>
      {hasOutput ? (
        <Link
          css={linkStyles}
          to={`/videos/${videoId}`}
          onClick={(event) => {
            if (!onLeave()) {
              event.preventDefault();
            }
          }}
        >
          {status === 'published' ? 'View the demo' : 'Preview the demo'}
        </Link>
      ) : null}
      <EditorButton
        primary
        disabled={readOnly || !canRender}
        title={
          !readOnly && !canRender
            ? 'Waiting for the last edits to save'
            : undefined
        }
        onClick={onRender}
      >
        {hasOutput ? 'Export again' : 'Export to a demo'}
      </EditorButton>
    </div>
  );
};

export default RenderBar;
