/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, memo } from 'react';
import EditorButton from './EditorButton';
import { editorTheme } from './editorTheme';
import { RedoIcon, SaveIcon, UndoIcon } from './icons';
import { redoHint, undoHint } from './shortcuts';

const barStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  backgroundColor: editorTheme.panel,
  borderBottom: `1px solid ${editorTheme.line}`,
  color: editorTheme.text,
  flexWrap: 'wrap',
});

const chipStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 32,
  padding: '0 10px',
  borderRadius: 6,
  border: `1px solid ${editorTheme.line}`,
  color: editorTheme.muted,
  fontSize: 13,
  whiteSpace: 'nowrap',
});

const selectStyles = css({
  height: 24,
  borderRadius: 4,
  border: `1px solid ${editorTheme.line}`,
  backgroundColor: editorTheme.raised,
  color: editorTheme.text,
  font: 'inherit',
  fontSize: 13,
});

const saveStyles = css({
  fontSize: 12,
  color: editorTheme.muted,
  marginLeft: 'auto',
});

type Props = {
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly readOnly: boolean;
  readonly onSave: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly saveLabel: string;
  readonly canvasHeight: number;
  readonly canvasFps: 24 | 30 | 60;
  readonly onFpsChange: (fps: 24 | 30 | 60) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
};

// the document bar: what the demo will be rendered as, and the history of the
// edits. Playing it back belongs under the picture, not up here.
const TransportBar: FC<Props> = ({
  dirty,
  saving,
  readOnly,
  onSave,
  canUndo,
  canRedo,
  saveLabel,
  canvasHeight,
  canvasFps,
  onFpsChange,
  onUndo,
  onRedo,
}) => (
  <div css={barStyles}>
    <span css={chipStyles}>
      {`${canvasHeight}p`}
      <label>
        <span css={{ marginRight: 4 }}>at</span>
        <select
          disabled={readOnly}
          css={selectStyles}
          aria-label="Frames per second"
          value={canvasFps}
          onChange={(event) =>
            onFpsChange(Number(event.target.value) as 24 | 30 | 60)
          }
        >
          <option value={24}>24fps</option>
          <option value={30}>30fps</option>
          <option value={60}>60fps</option>
        </select>
      </label>
    </span>
    <EditorButton
      aria-label={`Undo (${undoHint})`}
      title={`Undo (${undoHint})`}
      icon={<UndoIcon size={15} />}
      disabled={!canUndo}
      onClick={onUndo}
    />
    <EditorButton
      aria-label={`Redo (${redoHint})`}
      title={`Redo (${redoHint})`}
      icon={<RedoIcon size={15} />}
      disabled={!canRedo}
      onClick={onRedo}
    />

    <span css={saveStyles}>{saveLabel}</span>
    <EditorButton
      icon={<SaveIcon size={15} />}
      disabled={readOnly || saving || !dirty}
      onClick={onSave}
    >
      {saving ? 'Saving…' : 'Save'}
    </EditorButton>
  </div>
);

// the playhead re-renders the editor on every frame; these panels only ever
// change when the document or the selection does
export default memo(TransportBar);
