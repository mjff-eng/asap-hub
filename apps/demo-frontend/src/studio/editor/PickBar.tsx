/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC } from 'react';
import EditorButton from './EditorButton';
import { editorTheme } from './editorTheme';

const barStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 12px',
  borderRadius: 6,
  backgroundColor: editorTheme.raised,
  border: `1px solid ${editorTheme.line}`,
});

const countStyles = css({
  fontSize: 13,
  color: editorTheme.text,
  fontWeight: 600,
});

const hintStyles = css({
  fontSize: 12,
  color: editorTheme.muted,
  marginLeft: 'auto',
});

// the server refuses a bigger pick, and nothing that long is a "section"
export const maxPickedClips = 100;

type Props = {
  readonly count: number;
  // the same settled-document gate the export has; the reason feeds the title
  readonly canDownload: boolean;
  readonly busy: boolean;
  readonly onDownload: () => void;
  readonly onClear: () => void;
};

// The picked clips render as a cut of their own, with the zooms, clicks,
// banners and voice over they carry, and come back as a file to save. The bar
// only exists while something is picked, so it never crowds the editor.
const PickBar: FC<Props> = ({
  count,
  canDownload,
  busy,
  onDownload,
  onClear,
}) => (
  <div css={barStyles} role="region" aria-label="Picked clips">
    {/* a status region, so a keyboard pick is announced as it lands */}
    <span css={countStyles} role="status">
      {count === 1 ? '1 clip picked' : `${count} clips picked`}
    </span>
    <EditorButton
      primary
      disabled={!canDownload || busy || count > maxPickedClips}
      title={
        busy
          ? 'An export is already running'
          : count > maxPickedClips
            ? `Pick at most ${maxPickedClips} clips`
            : !canDownload
              ? 'Waiting for the last edits to save'
              : undefined
      }
      onClick={onDownload}
    >
      Download these clips
    </EditorButton>
    <EditorButton onClick={onClear}>Clear</EditorButton>
    <span css={hintStyles}>
      The picked clips become one video, with their effects and voice over.
    </span>
  </div>
);

export default PickBar;
