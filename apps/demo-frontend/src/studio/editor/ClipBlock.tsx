/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { ClipPlacement } from '@asap-hub/demo-timeline';
import { FC, PointerEvent as ReactPointerEvent } from 'react';
import { ProjectAsset } from '../../api/types';
import { DragKind } from './dragging';
import { editorTheme } from './editorTheme';
import { formatTimecode } from './geometry';
import { isPickModifier } from './shortcuts';
import { MuteIcon, SoundIcon } from './icons';

const blockStyles = css({
  position: 'absolute',
  top: 6,
  bottom: 6,
  borderRadius: 6,
  border: '1px solid transparent',
  backgroundColor: editorTheme.clip,
  color: editorTheme.clipText,
  padding: '6px 8px',
  overflow: 'hidden',
  cursor: 'grab',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  textAlign: 'left',
  font: 'inherit',
  fontSize: 12,
  touchAction: 'none',
  userSelect: 'none',
});

// The title purple is a mid tone: at 12px nothing reaches 4.5:1 on it, not even
// white, which stops at 4.2. So it becomes an accent down the edge and the words
// sit on the same ground the panels use, where they read at better than 13:1.
const titleBlockStyles = css({
  backgroundColor: editorTheme.raised,
  color: editorTheme.text,
  paddingLeft: 14,
  '::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: editorTheme.title,
  },
});

const selectedStyles = css({
  borderColor: editorTheme.selected,
  boxShadow: `0 0 0 1px ${editorTheme.selected}`,
});

const mutedStyles = css({ opacity: 0.65 });

// picked reads differently from selected: a dashed edge and a tick, because a
// clip can be picked for the download while another one is being edited
const pickedStyles = css({
  outline: `2px dashed ${editorTheme.playhead}`,
  outlineOffset: -2,
});

const pickBadgeStyles = css({
  position: 'absolute',
  top: 3,
  right: 12,
  width: 15,
  height: 15,
  lineHeight: '15px',
  textAlign: 'center',
  fontSize: 10,
  borderRadius: '50%',
  backgroundColor: editorTheme.playhead,
  color: editorTheme.onAccent,
  pointerEvents: 'none',
});

const labelStyles = css({
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const rangeStyles = css({
  fontVariantNumeric: 'tabular-nums',
  opacity: 0.8,
  whiteSpace: 'nowrap',
});

const handleStyles = css({
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 10,
  cursor: 'ew-resize',
  background: 'transparent',
  border: 0,
  padding: 0,
  touchAction: 'none',
  ':hover::after, :focus-visible::after': {
    content: '""',
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 3,
    width: 4,
    borderRadius: 2,
    backgroundColor: editorTheme.clipEdge,
  },
});

const muteButtonStyles = css({
  position: 'absolute',
  right: 6,
  bottom: 6,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  borderRadius: 4,
  border: 0,
  color: 'inherit',
  backgroundColor: 'rgba(0, 0, 0, 0.18)',
  cursor: 'pointer',
});

type Props = {
  readonly placement: ClipPlacement;
  readonly asset?: ProjectAsset;
  readonly left: number;
  readonly width: number;
  readonly selected: boolean;
  // picked into the cut a download renders; toggled with Ctrl or Cmd
  readonly picked: boolean;
  // false when nothing could act on a pick, so the toggle is inert
  readonly canPick: boolean;
  readonly readOnly: boolean;
  readonly onSelect: () => void;
  readonly onTogglePick: () => void;
  readonly onDragStart: (
    kind: DragKind,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  // the same edits the pointer makes, for a keyboard: the handles were
  // focusable buttons that answered to nothing but a pointer press
  readonly onNudge: (kind: DragKind, deltaMs: number) => void;
  readonly onToggleMute: () => void;
};

const nudgeStepMs = 100;
const coarseStepMs = 1000;

const arrowDeltaMs = (event: {
  key: string;
  shiftKey: boolean;
}): number | undefined => {
  const step = event.shiftKey ? coarseStepMs : nudgeStepMs;
  if (event.key === 'ArrowLeft') return -step;
  if (event.key === 'ArrowRight') return step;
  return undefined;
};

const ClipBlock: FC<Props> = ({
  placement,
  asset,
  left,
  width,
  selected,
  picked,
  canPick,
  readOnly,
  onSelect,
  onTogglePick,
  onDragStart,
  onNudge,
  onToggleMute,
}) => {
  const { clip } = placement;
  const source = clip.kind === 'source' ? clip : undefined;
  const muted = source?.volume === 0;
  const label =
    clip.kind === 'title' ? clip.text || 'Title card' : asset?.label ?? 'Clip';

  // The block sits under a ruler of programme time, so that is what it reads
  // in. It used to print the source trim range rounded to whole seconds, which
  // matched neither the ruler above it nor the block's own edges, and a clip
  // shorter than a second collapsed into a range with no width at all.
  const span = `${formatTimecode(placement.startMs)}–${formatTimecode(
    placement.endMs,
  )}`;
  // an overlap is the only thing on the lane a screen reader cannot see, and it
  // is what says two clips are blending rather than cutting
  const blend =
    placement.overlapMs > 0 && clip.transitionIn
      ? `, ${clip.transitionIn.type} from the clip before`
      : '';
  const trim = source
    ? `Uses ${formatTimecode(source.inMs)} to ${formatTimecode(
        source.outMs,
      )} of ${asset?.label ?? 'the source'}`
    : undefined;

  return (
    <div
      // a group, not a button: the trim handles and the mute are real buttons
      // inside it, and interactive descendants inside role button are invalid
      // and unreachable for assistive tech
      role="group"
      tabIndex={0}
      aria-label={`${label}, ${span}${muted ? ', muted' : ''}${blend}${
        picked ? ', picked for download' : ''
      }`}
      title={trim}
      aria-current={selected}
      css={[
        blockStyles,
        clip.kind === 'title' && titleBlockStyles,
        selected && selectedStyles,
        picked && pickedStyles,
        muted && mutedStyles,
      ]}
      style={{ left, width: Math.max(width, 18) }}
      onPointerDown={(event) => {
        if (isPickModifier(event)) {
          event.preventDefault();
          if (canPick) {
            onTogglePick();
          }
          return;
        }
        onSelect();
        if (!readOnly) {
          onDragStart('move', event);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (isPickModifier(event)) {
            if (canPick) {
              onTogglePick();
            }
            return;
          }
          onSelect();
          return;
        }
        // Alt and an arrow reorders, which was otherwise a drag or nothing
        const delta = arrowDeltaMs(event);
        if (delta === undefined || !event.altKey || readOnly) return;
        event.preventDefault();
        onNudge('move', delta);
      }}
    >
      {picked ? (
        <span css={pickBadgeStyles} aria-hidden="true">
          &#10003;
        </span>
      ) : null}
      <span css={labelStyles}>{label}</span>
      {/* a 14px crossed speaker was the only sign a clip had been silenced */}
      <span css={rangeStyles}>{muted ? `${span} · muted` : span}</span>

      {source ? (
        <button
          type="button"
          aria-label={`${muted ? 'Unmute' : 'Mute'} ${label}`}
          css={muteButtonStyles}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onToggleMute();
          }}
        >
          {muted ? <MuteIcon size={14} /> : <SoundIcon size={14} />}
        </button>
      ) : null}

      <button
        type="button"
        aria-label={`Trim the start of ${label}`}
        css={handleStyles}
        style={{ left: 0 }}
        disabled={readOnly}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
          onDragStart('trimStart', event);
        }}
        onKeyDown={(event) => {
          const delta = arrowDeltaMs(event);
          if (delta === undefined) return;
          event.preventDefault();
          onNudge('trimStart', delta);
        }}
      />
      <button
        type="button"
        aria-label={`Trim the end of ${label}`}
        css={handleStyles}
        style={{ right: 0 }}
        disabled={readOnly}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
          onDragStart('trimEnd', event);
        }}
        onKeyDown={(event) => {
          const delta = arrowDeltaMs(event);
          if (delta === undefined) return;
          event.preventDefault();
          onNudge('trimEnd', delta);
        }}
      />
    </div>
  );
};

export default ClipBlock;
