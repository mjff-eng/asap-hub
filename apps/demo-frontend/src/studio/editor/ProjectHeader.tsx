/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Video } from '../../api/types';
import EditorButton from './EditorButton';
import { editorTheme } from './editorTheme';

const barStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 16px',
  borderBottom: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.panel,
  color: editorTheme.text,
  flexWrap: 'wrap',
});

const backStyles = css({
  color: editorTheme.muted,
  textDecoration: 'none',
  fontSize: 13,
  ':hover': { textDecoration: 'underline' },
});

const titleStyles = css({
  font: 'inherit',
  fontSize: 15,
  fontWeight: 600,
  color: editorTheme.text,
  backgroundColor: 'transparent',
  border: '1px solid transparent',
  borderRadius: 6,
  padding: '4px 8px',
  minWidth: 160,
  maxWidth: 420,
  flex: '0 1 auto',
  ':hover': { borderColor: editorTheme.line },
  ':focus': {
    borderColor: editorTheme.selected,
    outline: 'none',
    backgroundColor: editorTheme.raised,
  },
});

const badgeStyles = css({
  fontSize: 12,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 999,
  border: `1px solid ${editorTheme.line}`,
  color: editorTheme.muted,
});

const noticeStyles = css({ fontSize: 13, color: editorTheme.muted, margin: 0 });

const dirtyStyles = css({
  fontSize: 13,
  color: editorTheme.text,
  margin: 0,
});

const errorStyles = css({ fontSize: 13, color: editorTheme.record, margin: 0 });

const spacerStyles = css({ marginLeft: 'auto' });

type Props = {
  readonly video: Video;
  readonly readOnly: boolean;
  // still asking for the lock: not the same thing as someone else holding it
  readonly leasePending?: boolean;
  readonly leaseHolder?: string;
  // edits the server has not taken yet
  readonly dirty: boolean;
  readonly notice?: string;
  // false means the guard has taken over and the link must not navigate
  readonly onLeave: () => boolean;
  readonly onRetryLease: () => void;
  readonly onRename: (title: string) => void;
  readonly onPublish: () => void;
  readonly onUnpublish: () => void;
  readonly children?: React.ReactNode;
};

// The studio's own chrome: what the demo is called, whether members can see it,
// and the export beside it. A project never reaches the upload editor, so this
// is where publishing lives for one.
const ProjectHeader: FC<Props> = ({
  video,
  readOnly,
  leasePending,
  leaseHolder,
  dirty,
  notice,
  onLeave,
  onRetryLease,
  onRename,
  onPublish,
  onUnpublish,
  children,
}) => {
  const [title, setTitle] = useState(video.title);
  useEffect(() => setTitle(video.title), [video.title]);

  const published = video.status === 'published';
  const exported = video.processingState === 'ready';

  return (
    <div css={barStyles}>
      <Link
        css={backStyles}
        to="/"
        onClick={(event) => {
          if (!onLeave()) {
            event.preventDefault();
          }
        }}
      >
        Demos
      </Link>
      <input
        css={titleStyles}
        aria-label="Demo title"
        value={title}
        disabled={readOnly}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => {
          const trimmed = title.trim();
          if (trimmed && trimmed !== video.title) {
            onRename(trimmed);
          } else {
            setTitle(video.title);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            setTitle(video.title);
            event.currentTarget.blur();
          }
        }}
      />
      <span css={badgeStyles}>{published ? 'Published' : 'Draft'}</span>

      {readOnly && leasePending ? (
        <p css={noticeStyles}>Opening the editor…</p>
      ) : null}
      {readOnly && !leasePending ? (
        <>
          <p css={noticeStyles} role="alert">
            {leaseHolder
              ? `${leaseHolder} is editing this demo, so it is read only for now.`
              : 'Someone else holds the editing lock, so this demo is read only for now.'}
            {dirty
              ? ' The edits made before the lock went cannot be saved until it comes back.'
              : ''}
          </p>
          <EditorButton onClick={onRetryLease}>Try to edit again</EditorButton>
        </>
      ) : null}
      {!readOnly && dirty ? <p css={dirtyStyles}>Unsaved changes</p> : null}
      {notice ? (
        <p css={errorStyles} role="alert">
          {notice}
        </p>
      ) : null}

      <span css={spacerStyles} />
      {children}
      {exported ? (
        <EditorButton
          disabled={readOnly}
          onClick={published ? onUnpublish : onPublish}
        >
          {published ? 'Unpublish' : 'Publish'}
        </EditorButton>
      ) : null}
    </div>
  );
};

export default ProjectHeader;
