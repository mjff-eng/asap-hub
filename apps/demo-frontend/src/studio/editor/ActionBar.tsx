/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FC, memo } from 'react';
import EditorButton from './EditorButton';
import { editorTheme } from './editorTheme';
import { pickHint, redoHint, undoHint } from './shortcuts';
import {
  DuplicateIcon,
  MinusIcon,
  MuteIcon,
  PlusIcon,
  SoundIcon,
  SplitIcon,
  TrashIcon,
} from './icons';

const barStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  padding: '10px 14px',
  backgroundColor: editorTheme.panel,
  borderTop: `1px solid ${editorTheme.line}`,
  color: editorTheme.text,
});

const hintStyles = css({
  color: editorTheme.muted,
  fontSize: 12,
  marginLeft: 'auto',
});

const groupStyles = css({ display: 'flex', alignItems: 'center', gap: 6 });

// A title card is a clip of its own, so it can only go between clips; the rest
// sit on their own lane and land exactly where the playhead is. Saying which is
// which on the button itself is the only way to know before clicking.
const atThePlayhead = 'Goes at the playhead';
const afterTheClip = 'Goes in after the clip under the playhead';

// Each of these is enabled by what it actually acts on: Split works on the clip
// under the playhead whether or not anything is selected, Duplicate needs a
// selected clip, and Mute only means anything on footage that carries sound.
type Props = {
  readonly canSplit: boolean;
  readonly canDuplicate: boolean;
  readonly canMute: boolean;
  readonly canRemove: boolean;
  readonly canAddEffect: boolean;
  readonly onAddTitleCard: () => void;
  readonly onAddBanner: () => void;
  readonly onAddZoom: () => void;
  readonly onAddCursorClick: () => void;
  readonly selectionMuted: boolean;
  readonly readOnly: boolean;
  readonly onSplit: () => void;
  readonly onDuplicate: () => void;
  readonly onToggleMute: () => void;
  readonly onRemove: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomFit: () => void;
};

const ActionBar: FC<Props> = ({
  canSplit,
  canDuplicate,
  canMute,
  canRemove,
  canAddEffect,
  onAddTitleCard,
  onAddBanner,
  onAddZoom,
  onAddCursorClick,
  selectionMuted,
  readOnly,
  onSplit,
  onDuplicate,
  onToggleMute,
  onRemove,
  onZoomIn,
  onZoomOut,
  onZoomFit,
}) => (
  <div css={barStyles}>
    <EditorButton
      icon={<PlusIcon size={15} />}
      title={afterTheClip}
      aria-label={`Title card, ${afterTheClip.toLowerCase()}`}
      disabled={readOnly}
      onClick={onAddTitleCard}
    >
      Title card
    </EditorButton>
    <EditorButton
      icon={<PlusIcon size={15} />}
      title={atThePlayhead}
      aria-label={`Banner, ${atThePlayhead.toLowerCase()}`}
      disabled={readOnly}
      onClick={onAddBanner}
    >
      Banner
    </EditorButton>
    <EditorButton
      icon={<PlusIcon size={15} />}
      title={atThePlayhead}
      aria-label={`Zoom, ${atThePlayhead.toLowerCase()}`}
      disabled={readOnly || !canAddEffect}
      onClick={onAddZoom}
    >
      Zoom
    </EditorButton>
    <EditorButton
      icon={<PlusIcon size={15} />}
      title={atThePlayhead}
      aria-label={`Mouse click, ${atThePlayhead.toLowerCase()}`}
      disabled={readOnly || !canAddEffect}
      onClick={onAddCursorClick}
    >
      Mouse click
    </EditorButton>
    <EditorButton
      icon={<SplitIcon size={15} />}
      disabled={readOnly || !canSplit}
      onClick={onSplit}
    >
      Split
    </EditorButton>
    <EditorButton
      icon={<DuplicateIcon size={15} />}
      disabled={readOnly || !canDuplicate}
      onClick={onDuplicate}
    >
      Duplicate
    </EditorButton>
    <EditorButton
      icon={selectionMuted ? <MuteIcon size={15} /> : <SoundIcon size={15} />}
      disabled={readOnly || !canMute}
      onClick={onToggleMute}
    >
      {selectionMuted ? 'Unmute' : 'Mute'}
    </EditorButton>
    <EditorButton
      icon={<TrashIcon size={15} />}
      disabled={readOnly || !canRemove}
      onClick={onRemove}
    >
      Remove
    </EditorButton>

    <span css={hintStyles}>
      Drag anything along its lane to move it, or drag either edge to change how
      long it lasts. S splits, D duplicates, M mutes, Delete removes, {undoHint}{' '}
      undoes and {redoHint} redoes. {pickHint} picks clips to download as one
      video.
    </span>

    <div css={groupStyles}>
      <EditorButton onClick={onZoomFit}>Fit</EditorButton>
      <EditorButton
        aria-label="Zoom the timeline out"
        icon={<MinusIcon size={15} />}
        onClick={onZoomOut}
      />
      <EditorButton
        aria-label="Zoom the timeline in"
        icon={<PlusIcon size={15} />}
        onClick={onZoomIn}
      />
    </div>
  </div>
);

// the playhead re-renders the editor on every frame; these panels only ever
// change when the document or the selection does
export default memo(ActionBar);
