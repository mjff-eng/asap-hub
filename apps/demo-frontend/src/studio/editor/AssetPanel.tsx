/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { limits } from '@asap-hub/demo-timeline';
import { FC, ReactNode, memo, useEffect, useRef, useState } from 'react';
import { ProjectAsset } from '../../api/types';
import { useCaptureHolder } from '../recording/captureLock';
import { Modal } from '../../ui/components';
import EditorButton from './EditorButton';
import { editorTheme } from './editorTheme';
import { scrollingStyles } from './fields';
import { formatDuration } from './geometry';
import { AudioIcon, PlusIcon, TrashIcon } from './icons';

const panelStyles = css(scrollingStyles, {
  gridColumn: 1,
  gridRow: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  borderRight: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.panel,
  width: 280,
  flexShrink: 0,
  '@media (max-width: 1100px)': {
    width: 'auto',
    borderRight: 0,
    gridColumn: 1,
  },
});

const headingStyles = css({
  margin: 0,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: editorTheme.muted,
});

const listStyles = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

const itemStyles = css({
  backgroundColor: editorTheme.raised,
  border: `1px solid ${editorTheme.line}`,
  borderRadius: 8,
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

// The label reads as plain text until it is focused, so the list stays quiet,
// but a heading that happens to be a text box is a heading as far as anyone can
// tell: the dashed rule underneath it is what says it can be typed into. The
// ellipsis is for the recording names, which are longer than the column.
const labelStyles = css({
  fontSize: 13,
  fontWeight: 600,
  width: '100%',
  boxSizing: 'border-box',
  color: editorTheme.text,
  backgroundColor: 'transparent',
  border: '1px solid transparent',
  borderBottomColor: editorTheme.line,
  borderBottomStyle: 'dashed',
  borderRadius: 4,
  padding: '2px 4px',
  margin: '-2px -4px',
  font: 'inherit',
  cursor: 'text',
  textOverflow: 'ellipsis',
  ':hover:not(:disabled)': { borderColor: editorTheme.muted },
  ':focus': {
    borderColor: editorTheme.selected,
    borderBottomStyle: 'solid',
    outline: 'none',
    backgroundColor: editorTheme.surface,
  },
});

const metaStyles = css({
  fontSize: 12,
  color: editorTheme.muted,
  fontVariantNumeric: 'tabular-nums',
});

const emptyStyles = css({
  fontSize: 13,
  color: editorTheme.muted,
  margin: 0,
  lineHeight: 1.5,
});

const errorStyles = css({ fontSize: 12, color: editorTheme.record });

const rowStyles = css({ display: 'flex', gap: 6 });

const hiddenInputStyles = css({ display: 'none' });

const stateLabel: Record<ProjectAsset['state'], string> = {
  uploading: 'Uploading',
  preparing: 'Preparing',
  ready: 'Ready',
  failed: 'Failed',
};

// A recording puts itself on the timeline as soon as it is saved, and the card
// went on offering to add it, so clicking again quietly made a second copy.
// Adding another is still allowed; it just says that is what it would be.
const addLabel = (asset: ProjectAsset, used: boolean): string => {
  if (asset.kind === 'audio') {
    return used ? 'Add another voice over' : 'Add as voice over';
  }
  return used ? 'Add another copy' : 'Add to timeline';
};

// a rename only reaches the server when it has actually changed and is not
// empty, so a stray focus costs nothing and a cleared field falls back
const AssetLabel: FC<{
  readonly asset: ProjectAsset;
  readonly readOnly: boolean;
  readonly onRename: (asset: ProjectAsset, label: string) => void;
}> = ({ asset, readOnly, onRename }) => {
  const [draft, setDraft] = useState(asset.label);
  useEffect(() => setDraft(asset.label), [asset.label]);

  return (
    <input
      css={labelStyles}
      value={draft}
      disabled={readOnly}
      aria-label={`Name of ${asset.label}`}
      title={`Rename ${asset.label}`}
      maxLength={limits.textLength}
      autoComplete="off"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next && next !== asset.label) {
          onRename(asset, next);
        } else {
          setDraft(asset.label);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(asset.label);
          event.currentTarget.blur();
        }
      }}
    />
  );
};

type Props = {
  readonly assets: ProjectAsset[];
  // the assets the timeline already uses, so a card can say so
  readonly used: ReadonlySet<string>;
  readonly recorder?: ReactNode;
  readonly chapters?: ReactNode;
  readonly busy: boolean;
  readonly error?: string;
  readonly progress?: number;
  readonly readOnly: boolean;
  readonly onImport: (file: File) => void;
  readonly onImportAudio: (file: File) => void;
  readonly onRename: (asset: ProjectAsset, label: string) => void;
  readonly onAdd: (asset: ProjectAsset) => void;
  readonly onDelete: (asset: ProjectAsset) => void;
};

const confirmStyles = css({ margin: '0 0 14px', lineHeight: 1.5 });

const confirmRowStyles = css({
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
});

const AssetPanel: FC<Props> = ({
  assets,
  used,
  recorder,
  chapters,
  busy,
  error,
  progress,
  readOnly,
  onImport,
  onImportAudio,
  onRename,
  onAdd,
  onDelete,
}) => {
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  // the source asked about before its file is actually deleted
  const [doomed, setDoomed] = useState<ProjectAsset>();
  // picking a file mid take steals the screen being shared, and the upload
  // competes with the recording for the same connection
  const recording = useCaptureHolder();

  const pick =
    (handle: (file: File) => void) => (event: { target: HTMLInputElement }) => {
      const input = event.target;
      const file = input.files?.[0];
      if (file) {
        handle(file);
      }
      // let the same file be picked again straight after
      input.value = '';
    };

  return (
    <aside css={panelStyles} aria-label="Media" tabIndex={0}>
      <h2 css={headingStyles}>Media</h2>
      {error ? (
        <p css={errorStyles} role="alert">
          {error}
        </p>
      ) : null}
      {recorder}
      <input
        ref={videoRef}
        css={hiddenInputStyles}
        type="file"
        accept="video/*"
        aria-label="Import a video"
        onChange={pick(onImport)}
      />
      <input
        ref={audioRef}
        css={hiddenInputStyles}
        type="file"
        accept="audio/*"
        aria-label="Import an audio file"
        onChange={pick(onImportAudio)}
      />
      <EditorButton
        primary
        icon={<PlusIcon size={15} />}
        disabled={readOnly || busy || Boolean(recording)}
        title={recording ? `${recording} is running` : undefined}
        onClick={() => videoRef.current?.click()}
      >
        {busy
          ? `Uploading${progress === undefined ? '' : ` ${progress}%`}`
          : 'Import a video'}
      </EditorButton>
      <EditorButton
        icon={<AudioIcon size={15} />}
        disabled={readOnly || busy || Boolean(recording)}
        title={recording ? `${recording} is running` : undefined}
        onClick={() => audioRef.current?.click()}
      >
        Import audio
      </EditorButton>

      <h2 css={headingStyles}>Chapters</h2>
      {chapters}

      <h2 css={headingStyles}>Sources</h2>
      {assets.length === 0 ? (
        <p css={emptyStyles}>
          Nothing here yet. Import a video, then add it to the timeline to start
          building the demo.
        </p>
      ) : (
        <ul css={listStyles}>
          {assets.map((asset) => (
            <li key={asset.assetId} css={itemStyles}>
              <AssetLabel
                asset={asset}
                readOnly={readOnly}
                onRename={onRename}
              />
              <span css={metaStyles}>
                {asset.kind === 'audio' ? 'Audio · ' : ''}
                {stateLabel[asset.state]}
                {asset.durationMs
                  ? ` · ${formatDuration(asset.durationMs)}`
                  : ''}
                {used.has(asset.assetId) ? ' · on the timeline' : ''}
              </span>
              {asset.error ? (
                <span css={errorStyles}>{asset.error}</span>
              ) : null}
              <div css={rowStyles}>
                <EditorButton
                  disabled={readOnly || asset.state === 'failed'}
                  onClick={() => onAdd(asset)}
                >
                  {addLabel(asset, used.has(asset.assetId))}
                </EditorButton>
                <EditorButton
                  aria-label={`Remove ${asset.label}`}
                  icon={<TrashIcon size={15} />}
                  disabled={readOnly}
                  onClick={() => setDoomed(asset)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {doomed ? (
        <Modal onClose={() => setDoomed(undefined)} label="Remove this source">
          <p css={confirmStyles}>
            {used.has(doomed.assetId)
              ? `Clips on the timeline still use “${doomed.label}”. Remove those clips first, then this source can go.`
              : `Remove “${doomed.label}”? The file goes with it, and a recording cannot be taken again.`}
          </p>
          <div css={confirmRowStyles}>
            <EditorButton onClick={() => setDoomed(undefined)}>
              Keep it
            </EditorButton>
            <EditorButton
              danger
              disabled={used.has(doomed.assetId)}
              onClick={() => {
                onDelete(doomed);
                setDoomed(undefined);
              }}
            >
              Remove it
            </EditorButton>
          </div>
        </Modal>
      ) : null}
    </aside>
  );
};

// the playhead re-renders the editor on every frame; these panels only ever
// change when the document or the selection does
export default memo(AssetPanel);
